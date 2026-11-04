import asyncio
from dataclasses import dataclass
import logging
import os

from fastapi import WebSocketDisconnect
import httpx

from .translation import translate, TranslationError


logger = logging.getLogger(__name__)
QUEUE_TIMEOUT = 6
REQUEST_TIMEOUT = 8


@dataclass
class Segment:
    latest: dict
    history: list[str]
    task: asyncio.Task | None = None
    requested: tuple[str, bool] | None = None
    revision: int = 0
    last_started: float = 0
    translated_source: str = ""
    translated_text: str = ""
    final_sent: bool = False
    waiting: bool = False
    visible_text: str = ""
    visible_source: str = ""


class LiveTranslator:
    """原文稳定后先翻译；同一句继续更新，确认时再收尾。"""

    def __init__(self, client, base, key, model, send, terms, target, title):
        self.client, self.base, self.key, self.model = client, base, key, model
        self.send, self.terms, self.target, self.title = send, terms, target, title
        self.states = {}
        self.context = []
        self.utterances = {}
        self.tasks = set()
        self.slots = asyncio.Semaphore(2)
        self.closing = False

    async def update(self, event):
        segment_id = event["segment_id"]
        self.utterances[segment_id] = event.copy()
        while len(self.utterances) > 12:
            self.utterances.pop(next(iter(self.utterances)))
        state = self.states.get(segment_id)
        if state is None:
            state = Segment(event.copy(), self.context.copy())
            self.states[segment_id] = state
        else:
            state.latest = event.copy()
        if state.task and event["final"] and (state.waiting or
                (state.requested and state.requested[0] != event["text"])):
            state.task.cancel()
        else:
            await self.launch(state)
        if event["final"] and event["text"]:
            self.context.append(event["text"])
            del self.context[:-3]
        # 长时间直播只留最近的句子，正在翻译的句子继续保留。
        if len(self.states) > 64:
            for key, old in list(self.states.items()):
                if len(self.states) <= 64:
                    break
                if old.latest["final"] and old.task is None:
                    del self.states[key]

    async def emit(self, state, event, text, final):
        if not final and text == state.visible_text and event["text"] == state.visible_source:
            return
        state.visible_text = text
        state.visible_source = event["text"]
        state.revision += 1
        await self.send({**event, "kind": "translation", "revision": state.revision,
                         "source_revision": event["revision"], "source_text": event["text"],
                         "final": final, "text": text})

    @staticmethod
    def source_event(state):
        event = state.latest.copy()
        if not event["final"]:
            event["text"] = event["stable_text"]
        return event

    async def launch(self, state):
        event = self.source_event(state)
        if self.closing or not self.key or state.task or state.final_sent or not event["text"]:
            return
        if not event["final"] and not event.get("stable"):
            return
        if state.requested == (event["text"], event["final"]):
            return
        if state.translated_source == event["text"] and state.translated_text:
            if event["final"]:
                await self.emit(state, event, state.translated_text, True)
                state.final_sent = True
            return
        if len(self.tasks) >= 6:
            if event["final"]:
                state.requested = (event["text"], True)
                await self.send({"type": "translation_error", "segment_id": event["segment_id"],
                                 "message": "翻译暂时跟不上，已跳过本句"})
            return
        state.task = asyncio.create_task(self.run(state))
        self.tasks.add(state.task)

    @staticmethod
    def compatible(source, current):
        return bool(source) and current.startswith(source)

    async def run(self, state):
        event = None
        latest = ""
        acquired = False
        loop = asyncio.get_running_loop()
        queued_at = loop.time()
        request_started = None
        try:
            state.waiting = True
            if not state.latest["final"]:
                delay = .8 - (loop.time() - state.last_started)
                if delay > 0:
                    await asyncio.sleep(delay)
            async with asyncio.timeout(QUEUE_TIMEOUT):
                await self.slots.acquire()
            acquired = True
            state.waiting = False
            event = self.source_event(state)
            if not event["final"] and not event.get("stable"):
                return
            state.requested = (event["text"], event["final"])
            state.last_started = request_started = loop.time()
            utterances = list(self.utterances.values())
            index = next((i for i, item in enumerate(utterances)
                          if item["segment_id"] == event["segment_id"]), len(utterances))
            # Use the latest preceding speech, including corrections received after this item began.
            previous = ([item["text"] for item in utterances[max(0,index-3):index] if item["text"]]
                        if index < len(utterances) else state.history)
            following = [item["text"] for item in utterances[index+1:index+3] if item["text"]]
            # Waiting for a slot must not consume the cloud request's time allowance.
            async with asyncio.timeout(REQUEST_TIMEOUT):
                async for text in translate(self.client, self.base, self.key, self.model,
                                            event["text"], previous, self.terms,
                                            os.getenv("LIVESUB_REASONING_EFFORT", "minimal"),
                                            target=self.target, title=self.title,
                                            following_context=following):
                    latest = text
                    if self.compatible(event["text"], state.latest["text"]) and len(text) >= len(state.visible_text):
                        await self.emit(state, event, text, False)
            if self.compatible(event["text"], state.latest["text"]):
                state.translated_source, state.translated_text = event["text"], latest
                if state.latest["text"] == event["text"] and state.latest["final"]:
                    await self.emit(state, state.latest, latest, True)
                    state.final_sent = True
                elif latest != state.visible_text:
                    await self.emit(state, event, latest, False)
        except asyncio.CancelledError:
            if self.closing:
                raise
        except (TranslationError, httpx.HTTPError, TimeoutError, ValueError) as error:
            if request_started is None:
                event = self.source_event(state)
                state.requested = (event["text"], event["final"])
                message = "翻译请求排队超时"
            elif isinstance(error, TranslationError):
                message = str(error)
            elif isinstance(error, (TimeoutError, httpx.TimeoutException)):
                message = "云端翻译响应超时"
            elif isinstance(error, httpx.HTTPError):
                message = "云端翻译连接失败"
            else:
                message = "云端翻译响应格式异常"
            now = loop.time()
            logger.warning("Translation failed: model=%s phase=%s error=%s queued=%.2fs request=%.2fs source_chars=%d output_chars=%d",
                           self.model, "request" if request_started is not None else "queue", type(error).__name__,
                           (request_started or now) - queued_at, now - request_started if request_started is not None else 0,
                           len(event["text"]), len(latest))
            if event and state.latest["final"] and event["text"] == state.latest["text"]:
                completed = bool(state.translated_text and self.compatible(state.translated_source, state.latest["text"]))
                if completed:
                    await self.emit(state, {**event, "text": state.translated_source}, state.translated_text, False)
                await self.send({"type": "translation_error", "segment_id": event["segment_id"],
                                 "source_revision": event["revision"], "discard_partial": not completed,
                                 "message": message})
        except (WebSocketDisconnect, RuntimeError):
            self.closing = True
        finally:
            if acquired:
                self.slots.release()
            state.waiting = False
            state.task = None
            self.tasks.discard(asyncio.current_task())
            await self.launch(state)

    async def finish(self):
        while self.tasks:
            await asyncio.gather(*list(self.tasks))

    async def close(self):
        self.closing = True
        tasks = list(self.tasks)
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
