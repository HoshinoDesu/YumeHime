import { settings, endpoint, httpBase } from "./settings.js";

let captureTask = Promise.resolve();
function captureAction(action) {
  const result = captureTask.then(action);
  captureTask = result.catch(() => {});
  return result;
}
async function offscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (!contexts.length) await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["USER_MEDIA"], justification: "Capture selected tab audio and preserve its playback" });
}
async function audioMessage(message) {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length) return chrome.runtime.sendMessage({ to: "offscreen", ...message });
  return { ok: true };
}
async function toTab(tabId, message) {
  try { return await chrome.tabs.sendMessage(tabId, { to: "content", ...message }); }
  catch { /* 标签页切换或关闭时，页面脚本可能已经结束。 */ }
}
async function stateFor(tabId) {
  const saved = await chrome.storage.session.get(["tabId", "captureState", "panels"]);
  return { visible: !!saved.panels?.[tabId], ...(saved.tabId === tabId ? saved.captureState : { running: false, paused: false }) };
}
async function inject(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["i18n.js", "icons.js", "term-editor.js", "content.js"] });
  await toTab(tabId, { type: "settings", settings: await settings() });
}
async function stop() {
  const { tabId } = await chrome.storage.session.get("tabId");
  await audioMessage({ type: "stop" });
  if (tabId != null) {
    await toTab(tabId, { type: "clear" });
    await toTab(tabId, { type: "captureState", state: { running: false, paused: false, message: "已停止" } });
  }
  await chrome.storage.session.remove(["tabId", "captureState"]);
  return { ok: true };
}
async function panel(tabId, visible) {
  const saved = await chrome.storage.session.get(["panels", "tabId"]);
  if (!visible && saved.tabId === tabId) await captureAction(stop);
  await chrome.storage.session.set({ panels: { ...saved.panels, [tabId]: visible } });
  if (visible) await inject(tabId);
  await toTab(tabId, { type: "panel", visible, state: await stateFor(tabId) });
  return { ok: true };
}
async function start(tabId) {
  const config = await settings();
  config.title=(await chrome.tabs.get(tabId)).title||"";
  const url = endpoint(config.url);
  if (!config.token) throw new Error("请先在连接设置中导入服务器配置。");
  if (!await chrome.permissions.contains({ origins: [`${url.protocol === "wss:" ? "https:" : "http:"}//${url.hostname}/*`] })) throw new Error("请在连接设置中允许访问服务器。");
  const saved = await chrome.storage.session.get(["tabId", "captureState"]);
  if (saved.tabId === tabId && saved.captureState?.paused) return audioMessage({ type: "resume", settings: config });
  await stop();
  await offscreen();
  await inject(tabId);
  await chrome.storage.session.set({ tabId });
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  return chrome.runtime.sendMessage({ to: "offscreen", type: "start", streamId, settings: config });
}
async function glossaryRequest(action, message) {
  const config = await settings();
  const path = message.profile == null ? "/glossary" : `/glossary/${encodeURIComponent(message.profile)}`;
  const method = { glossaryList: "GET", glossaryGet: "GET", glossarySave: "PUT", glossaryCreate: "POST" }[action];
  const body = action === "glossarySave" ? { entries: message.entries } : action === "glossaryCreate" ? { profile: message.name } : undefined;
  const response = await fetch(httpBase(config.url) + path, { method, headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error(response.status === 401 ? "网关访问令牌不正确，请检查连接设置。" : response.status === 409 ? "词库名称已存在。" : `服务器返回 HTTP ${response.status}`);
  const result = await response.json();
  if (action === "glossarySave") await audioMessage({ type: "refreshProfiles" });
  return result;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.to !== "background") return;
  (async () => {
    const tabId = message.tabId ?? sender.tab?.id;
    if (message.type === "setPanel") return panel(tabId, message.visible);
    if (message.type === "panelStatus") return stateFor(tabId);
    if (message.type === "start") return captureAction(() => start(tabId));
    if (message.type === "pause") return captureAction(() => audioMessage({ type: "pause" }));
    if (message.type === "stop") return captureAction(stop);
    if (message.type === "openOptions") { await chrome.runtime.openOptionsPage(); return { ok: true }; }
    if (message.type.startsWith("glossary")) return glossaryRequest(message.type, message);
    if (message.type === "event") {
      const { tabId: owner } = await chrome.storage.session.get("tabId");
      if (owner != null) await toTab(owner, { type: "event", event: message.event });
      return { ok: true };
    }
    if (message.type === "state") {
      const { tabId: owner } = await chrome.storage.session.get("tabId");
      await chrome.storage.session.set({ captureState: message.state });
      if (owner != null) await toTab(owner, { type: "captureState", state: message.state });
      return { ok: true };
    }
    if (message.type === "updateStyle") {
      const config = await settings();
      await chrome.storage.local.set({ settings: { ...config, ...message.patch } });
      return { ok: true };
    }
    if (message.type === "status") return (await chrome.storage.session.get("captureState")).captureState || { running: false };
  })().then(respond).catch(error => respond({ error: error.message }));
  return true;
});
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !changes.settings) return;
  const previous = changes.settings.oldValue || {}, next = changes.settings.newValue || {};
  if (["profiles", "targetLanguage", "model", "url", "token"].some(key => previous[key] !== next[key])) await audioMessage({ type: "configure", settings: await settings() });
});
chrome.tabs.onRemoved.addListener(async tabId => {
  const saved = await chrome.storage.session.get(["tabId", "panels"]);
  if (saved.tabId === tabId) await captureAction(stop);
  if (saved.panels) { delete saved.panels[tabId]; await chrome.storage.session.set({ panels: saved.panels }); }
});
chrome.tabs.onUpdated.addListener(async (tabId, change) => {
  if (change.status !== "complete") return;
  const state = await stateFor(tabId);
  if (!state.visible && !state.running) return;
  try {
    await inject(tabId);
    await toTab(tabId, { type: "panel", visible: state.visible, state });
  } catch { /* 新网址需要再次点击插件来授权页面访问。 */ }
});
