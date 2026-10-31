import {settings} from "./settings.js";
let config=await settings();
const localization=globalThis.YumeHimeI18n.watch(document,()=>config.uiLanguage);
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const toggle = document.querySelector("#window-toggle"), status = document.querySelector("#status");
async function update() {
  const state = await chrome.runtime.sendMessage({ to: "background", type: "panelStatus", tabId: tab.id });
  toggle.checked = !!state.visible;
  status.textContent = state.message || (state.visible ? "在悬浮窗中开始翻译" : "已关闭");
}
toggle.onchange = async () => {
  toggle.disabled = true;
  try {
    const result = await chrome.runtime.sendMessage({ to: "background", type: "setPanel", tabId: tab.id, visible: toggle.checked });
    if (result.error) throw new Error(result.error);
    await update();
  } catch (error) { toggle.checked = false; status.textContent = error.message; }
  finally { toggle.disabled = false; }
};
document.querySelector("#options").onclick = () => chrome.runtime.openOptionsPage();
chrome.storage.onChanged.addListener((changes, area) => { if(area==="local"&&changes.settings){config=changes.settings.newValue;localization.refresh();} if (area === "session" && (changes.captureState || changes.panels)) update(); });
await update();
