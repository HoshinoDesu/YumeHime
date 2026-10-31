import { settings, endpoint, httpBase, topicProfiles } from "./settings.js";
const form = document.querySelector("#settings"), status = document.querySelector("#status");
let config = await settings();
function populate() { for (const [key, value] of Object.entries(config)) {
  const input = form.elements.namedItem(key);
  if (!input) continue;
  if (input.type === "checkbox") input.checked = value;
  else input.value = value;
} }
populate();
const localization=globalThis.LiveSubI18n.watch(document,()=>form.elements.uiLanguage.value);
form.elements.uiLanguage.addEventListener("change",()=>localization.refresh());
const editedPosition = new Set();
for (const name of ["bottom", "positionLocked"]) form.elements[name].addEventListener("input", () => editedPosition.add(name));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.settings) return;
  const value = changes.settings.newValue;
  if(value.uiLanguage!==changes.settings.oldValue?.uiLanguage){form.elements.uiLanguage.value=value.uiLanguage||"auto";localization.refresh();}
  if (!editedPosition.has("positionLocked")) form.elements.positionLocked.checked = !!value.positionLocked;
  if (!editedPosition.has("bottom")) form.elements.bottom.value = value.bottom ?? 12;
});
const preview = document.querySelector(".subtitle-preview");
function updatePreview() {
  const values = form.elements;
  preview.style.setProperty("--size", `${values.fontSize.value}px`);
  preview.style.setProperty("--opacity", values.opacity.value);
  const outline = Number(values.outlineWidth.value);
  preview.style.setProperty("--subtitle-shadow", outline ? `0 0 ${outline}px var(--edge),0 0 ${outline}px var(--edge)` : "none");
  preview.querySelector(".ja").hidden = !values.showJapanese.checked;
}
form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);
updatePreview();
document.querySelector("#reset-position").onclick = async () => {
  const latest = await settings();
  await chrome.storage.local.set({ settings: { ...latest, subtitlePosition: null, bottom: 12, windowSize: { width: 560, height: 220 } } });
  config.subtitlePosition = null;
  config.bottom = 12;
  form.elements.bottom.value = 12;
  status.textContent = "已恢复默认位置。";
};
document.querySelector("#connection").onchange = async event => {
  try {
    const imported = JSON.parse(await event.target.files[0].text());
    endpoint(imported.url);
    for (const key of ["url", "token", "model", "profiles"]) if (key in imported) config[key] = key === "profiles" ? [...new Set([...topicProfiles,...imported[key].split(",").map(s=>s.trim()).filter(Boolean)])].join(",") : imported[key];
    populate();
    updatePreview();
    status.textContent = "连接配置已填入，请点击保存设置。";
  } catch (error) { status.textContent = error.message; }
};
form.onsubmit = async event => {
  event.preventDefault();
  try {
    endpoint(form.elements.url.value);
    const latest = await settings();
    config = { ...latest, ...Object.fromEntries(new FormData(form)) };
    config.showJapanese = form.elements.showJapanese.checked;
    config.positionLocked = form.elements.positionLocked.checked;
    for (const key of ["fontSize", "bottom", "opacity", "outlineWidth"]) config[key] = Number(config[key]);
    if (config.bottom !== latest.bottom) config.subtitlePosition = null;
    const origin = new URL(httpBase(config.url));
    if (!await chrome.permissions.request({ origins: [`${origin.protocol}//${origin.hostname}/*`] })) throw new Error("需要允许连接这个服务器。");
    await chrome.storage.local.set({ settings: config });
    editedPosition.clear();
    status.textContent = "已保存，当前悬浮窗已更新。";
  } catch (error) { status.textContent = error.message; }
};
const entries = document.querySelector("#entries"), profile = document.querySelector("#profile"), notice = document.querySelector("#glossary-status");
async function request(method, body) {
  const result = await fetch(`${httpBase(config.url)}/glossary/${encodeURIComponent(profile.value)}`, {
    method, headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!result.ok) throw new Error(`服务器返回 HTTP ${result.status}`);
  return result.json();
}
document.querySelector("#load").onclick = async () => {
  try { entries.value = JSON.stringify((await request("GET")).entries, null, 2); notice.textContent = "已读取。"; }
  catch (error) { notice.textContent = error.message; }
};
document.querySelector("#glossary").onsubmit = async event => {
  event.preventDefault();
  try { const result = await chrome.runtime.sendMessage({ to: "background", type: "glossarySave", profile: profile.value, entries: JSON.parse(entries.value) }); if (result.error) throw new Error(result.error); notice.textContent = `已保存 ${result.saved} 条，当前会话已更新。`; }
  catch (error) { notice.textContent = error.message; }
};
document.querySelector("#export").onclick = () => {
  const url = URL.createObjectURL(new Blob([entries.value], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = "livesub-glossary.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function csv(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === "," && !quoted) { row.push(cell); cell = ""; }
    else if (c === "\n" && !quoted) { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift().map(s => s.replace(/^\uFEFF/, "").trim());
  return rows.filter(row => row.some(Boolean)).map(row => {
    const values = Object.fromEntries(header.map((key, i) => [key, row[i] || ""]));
    return { source: values.source, target: values.target, aliases: (values.aliases || "").split("|").filter(Boolean), variants: (values.variants || "").split("|").filter(Boolean), note: values.note || "" };
  });
}
document.querySelector("#import").onchange = async event => {
  try {
    const file = event.target.files[0];
    const text = await file.text();
    entries.value = JSON.stringify(file.name.endsWith(".csv") ? csv(text) : JSON.parse(text), null, 2);
    notice.textContent = "已导入编辑区，检查后点击保存词库。";
  } catch (error) { notice.textContent = error.message; }
};
