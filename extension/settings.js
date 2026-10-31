import "./i18n.js";
export const topicProfiles = ["topic:VTuber", "topic:动漫与二次元", "topic:日常生活", "topic:口语与网络用语", "topic:游戏"];
export const defaults = {
  url: "ws://127.0.0.1:8765/ws", token: "", model: "gemini-3.5-flash-lite",
  profiles: topicProfiles.join(","), fontSize: 32, bottom: 12, opacity: 0.6, showJapanese: true,
  outlineWidth: 2, subtitleSpeed: "1000", uiLanguage: "auto",
  subtitlePosition: null, positionLocked: false, windowSize: { width: 560, height: 220 }, targetLanguage: globalThis.YumeHimeI18n.detectLanguage()
};
export async function settings() {
  const saved = (await chrome.storage.local.get("settings")).settings || {};
  const result = { ...defaults, ...saved };
  if (result.glossaryVersion !== 1) {
    result.profiles = [...new Set([...topicProfiles, ...result.profiles.split(",").map(value=>value.trim()).filter(Boolean)])].join(",");
    result.glossaryVersion = 1;
    await chrome.storage.local.set({settings:result});
  }
  return result;
}
export function endpoint(url) {
  const parsed = new URL(url);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname);
  if (parsed.protocol !== "wss:" && !(parsed.protocol === "ws:" && loopback)) {
    throw new Error("服务器请使用 wss://；SSH 隧道可使用 ws://127.0.0.1。");
  }
  return parsed;
}
export function httpBase(url) {
  const parsed = endpoint(url);
  parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";
  parsed.pathname = parsed.pathname.replace(/\/ws\/?$/, "");
  parsed.search = "";
  return parsed.href.replace(/\/$/, "");
}
