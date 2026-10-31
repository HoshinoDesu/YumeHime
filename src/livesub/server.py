import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
import hmac
import json
import logging
import os
from pathlib import Path
import uuid

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
import httpx
from pydantic import BaseModel, Field

from .asr import Recognizer
from .glossary import Glossary
from .stream import StreamRecognizer
from .translation import LANGUAGES
from .live_translation import LiveTranslator


load_dotenv()
logger = logging.getLogger("livesub")
MODELS = Path(os.getenv("LIVESUB_MODELS", "models"))
TOKEN = os.getenv("LIVESUB_ACCESS_TOKEN", "")
API_BASE = os.getenv("LIVESUB_API_BASE", "https://generativelanguage.googleapis.com/v1beta/openai")
API_KEY = os.getenv("LIVESUB_API_KEY", "")
MODEL = os.getenv("LIVESUB_MODEL", "gemini-3.5-flash-lite")


@asynccontextmanager
async def lifespan(app):
    if not TOKEN:
        raise RuntimeError("Set LIVESUB_ACCESS_TOKEN in the server .env")
    app.state.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="asr")
    app.state.recognizer = await asyncio.get_running_loop().run_in_executor(app.state.executor,
        lambda: Recognizer(os.getenv("LIVESUB_ENGINE", "reazon"), MODELS,
            int(os.getenv("LIVESUB_THREADS", "3")), decoding_method="modified_beam_search"))
    app.state.glossary = Glossary(Path(os.getenv("LIVESUB_DATABASE", "data/livesub.sqlite3")))
    app.state.glossary.seed_presets()
    app.state.session = asyncio.Lock()
    async with httpx.AsyncClient(timeout=httpx.Timeout(8, connect=5)) as client:
        app.state.client = client
        yield
    app.state.executor.shutdown(wait=True, cancel_futures=True)


app = FastAPI(title="LiveSub", lifespan=lifespan, docs_url=None, redoc_url=None)


def authorize(authorization: str = Header(default="")):
    if not TOKEN or not hmac.compare_digest(authorization.encode(), ("Bearer " + TOKEN).encode()):
        raise HTTPException(401)


class Term(BaseModel):
    source: str = Field(min_length=1, max_length=100)
    target: str = Field(min_length=1, max_length=100)
    aliases: list[str] = Field(default_factory=list, max_length=10)
    variants: list[str] = Field(default_factory=list, max_length=10)
    note: str = Field(default="", max_length=500)


class Entries(BaseModel):
    entries: list[Term] = Field(max_length=1000)


class Profile(BaseModel):
    profile: str = Field(min_length=1, max_length=100)


@app.get("/health")
async def health():
    return {"status": "ok", "translation_configured": bool(API_KEY), "busy": app.state.session.locked()}


@app.get("/glossary/{profile}", dependencies=[Depends(authorize)])
async def glossary_get(profile: str):
    return {"entries": app.state.glossary.get(profile)}


@app.get("/glossary", dependencies=[Depends(authorize)])
async def glossary_profiles():
    return {"profiles": app.state.glossary.profiles()}


@app.post("/glossary", dependencies=[Depends(authorize)])
async def glossary_create(body: Profile):
    if not app.state.glossary.create(body.profile):
        raise HTTPException(409, "词库已存在")
    return {"profile": body.profile, "entries": []}


@app.put("/glossary/{profile}", dependencies=[Depends(authorize)])
async def glossary_put(profile: str, body: Entries):
    app.state.glossary.put(profile, [term.model_dump() for term in body.entries])
    return {"saved": len(body.entries)}


@app.websocket("/ws")
async def websocket(ws: WebSocket):
    await ws.accept()
    try:
        hello = await asyncio.wait_for(ws.receive_json(), 10)
    except WebSocketDisconnect:
        return
    except (asyncio.TimeoutError, ValueError):
        await ws.close(4400)
        return
    if not isinstance(hello, dict) or not isinstance(hello.get("token"), str) or not hmac.compare_digest(hello["token"].encode(), TOKEN.encode()):
        await ws.close(4401)
        return
    if app.state.session.locked():
        await ws.close(4409)
        return
    async with app.state.session:
        session_id = uuid.uuid4().hex
        profiles = hello.get("profiles", [])
        if not isinstance(profiles, list) or len(profiles) > 10 or not all(isinstance(p, str) for p in profiles):
            await ws.close(4400)
            return
        model = hello.get("model") or MODEL
        title=hello.get("title","")
        if not isinstance(title,str) or len(title)>1000:
            await ws.close(4400)
            return
        target = hello.get("target", "zh-CN")
        if target not in LANGUAGES:
            await ws.close(4400)
            return
        if not isinstance(model, str) or len(model) > 100:
            await ws.close(4400)
            return
        terms = app.state.glossary.for_session(profiles)
        recognizer = StreamRecognizer(app.state.recognizer, MODELS, terms)
        pending = asyncio.Queue(maxsize=30)
        send_lock = asyncio.Lock()
        async def send(event):
            async with send_lock:
                await ws.send_json({**event, "session_id": session_id})

        translator = LiveTranslator(app.state.client, API_BASE, API_KEY, model, send, terms, target, title)

        async def publish(events):
            for event in events:
                await send(event)
                await translator.update(event)

        async def process():
            loop = asyncio.get_running_loop()
            while True:
                pcm = await pending.get()
                if pcm is None:
                    await publish(await loop.run_in_executor(app.state.executor, recognizer.finish))
                    return
                await publish(await loop.run_in_executor(app.state.executor, recognizer.feed, pcm))

        worker = asyncio.create_task(process())
        receive = None
        try:
            await send({"type": "ready", "translation_enabled": bool(API_KEY)})
            logger.info("session started: %s", session_id)
            while True:
                # Surface worker failures immediately instead of leaving capture running.
                receive = asyncio.create_task(ws.receive())
                done, _ = await asyncio.wait([receive, worker], return_when=asyncio.FIRST_COMPLETED)
                if worker in done:
                    receive.cancel()
                    await asyncio.gather(receive, return_exceptions=True)
                    await worker
                    break
                message = receive.result()
                if message["type"] == "websocket.disconnect":
                    break
                pcm = message.get("bytes")
                if pcm is not None:
                    if not pcm or len(pcm) % 2 or len(pcm) > 6400:
                        await ws.close(4400)
                        break
                    try:
                        pending.put_nowait(pcm)
                    except asyncio.QueueFull:
                        await send({"type": "status", "message": "音频处理积压，正在重新连接"})
                        await ws.close(1013)
                        break
                elif message.get("text") == "stop":
                    await pending.put(None)
                    await worker
                    await translator.finish()
                    await send({"type": "finished"})
                    await ws.close(1000)
                    break
                elif message.get("text"):
                    update = json.loads(message["text"])
                    if update.get("type") == "profiles":
                        selected = update.get("profiles", [])
                        if not isinstance(selected, list) or len(selected) > 10 or not all(isinstance(p, str) for p in selected):
                            await ws.close(4400)
                            break
                        terms[:] = app.state.glossary.for_session(selected)
                        await send({"type": "profiles_updated"})
        except WebSocketDisconnect:
            pass
        finally:
            if receive is not None:
                receive.cancel()
            worker.cancel()
            await translator.close()
            await asyncio.gather(worker, *([receive] if receive is not None else []), return_exceptions=True)
            # Native inference cannot be cancelled mid-call; wait before admitting a new session.
            await asyncio.get_running_loop().run_in_executor(app.state.executor, lambda: None)
            logger.info("session stopped: %s", session_id)
