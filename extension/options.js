import { settings, endpoint, httpBase, topicProfiles } from "./settings.js";
const form = document.querySelector("#settings"), status = document.querySelector("#status");
let config = await settings();
let importedProfiles;
function populate() { for (const [key, value] of Object.entries(config)) {
  const input = form.elements.namedItem(key);
  if (!input) continue;
  if (input.type === "checkbox") input.checked = value;
  else input.value = value;
} }
populate();
const localization=globalThis.YumeHimeI18n.watch(document,()=>form.elements.uiLanguage.value);
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
  document.querySelector("#font-size-value").textContent = `${values.fontSize.value}px`;
  document.querySelector("#opacity-value").textContent = `${Math.round(Number(values.opacity.value) * 100)}%`;
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
    if ("profiles" in imported) importedProfiles = config.profiles;
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
    config = { ...latest, ...Object.fromEntries(new FormData(form)), ...(importedProfiles === undefined ? {} : {profiles:importedProfiles}) };
    config.showJapanese = form.elements.showJapanese.checked;
    config.positionLocked = form.elements.positionLocked.checked;
    for (const key of ["fontSize", "bottom", "opacity", "outlineWidth"]) config[key] = Number(config[key]);
    if (config.bottom !== latest.bottom) config.subtitlePosition = null;
    const origin = new URL(httpBase(config.url));
    if (!await chrome.permissions.request({ origins: [`${origin.protocol}//${origin.hostname}/*`] })) throw new Error("需要允许连接这个服务器。");
    await chrome.storage.local.set({ settings: config });
    importedProfiles = undefined;
    editedPosition.clear();
    status.textContent = "已保存，当前悬浮窗已更新。";
  } catch (error) { status.textContent = error.message; }
};
const editor = new globalThis.YumeHimeTermEditor(document.querySelector("#term-editor"));
const profile = document.querySelector("#profile"), notice = document.querySelector("#glossary-status");
editor.json.id = "entries";
editor.set([]);
const modelNotice = document.querySelector("#model-status"), modelList = document.querySelector("#model-list");
async function allowConnection(url) {
  const origin = new URL(httpBase(url));
  if (!await chrome.permissions.request({origins:[`${origin.protocol}//${origin.hostname}/*`]})) throw new Error("需要允许连接这个服务器。");
}
async function serverRequest(path, method = "GET", body, connection = config) {
  const result = await fetch(httpBase(connection.url) + path, {
    method, headers:{Authorization:`Bearer ${connection.token}`,"Content-Type":"application/json"},
    body:body ? JSON.stringify(body) : undefined
  });
  if (!result.ok) {
    if (result.status === 401) throw new Error("网关访问令牌不正确，请检查连接设置。");
    if (result.status === 409) throw new Error("词库名称已存在。");
    const error = await result.json();
    throw new Error(typeof error.detail === "string" ? error.detail : `服务器返回 HTTP ${result.status}`);
  }
  return result.json();
}
document.querySelector("#fetch-models").onclick = async event => {
  const button = event.currentTarget;
  try {
    const connection = {url:form.elements.url.value,token:form.elements.token.value};
    await allowConnection(connection.url);
    button.disabled = true; modelNotice.textContent = "正在获取云端模型列表…";
    const {models} = await serverRequest("/models", "GET", undefined, connection);
    modelList.replaceChildren(new Option("选择云端翻译模型", ""));
    for (const id of models) modelList.add(new Option(id, id));
    modelList.value = models.includes(form.elements.model.value) ? form.elements.model.value : "";
    modelList.hidden = models.length === 0;
    modelNotice.textContent = models.length ? "模型列表已获取，选择后点击保存设置。" : "云端 API 没有返回可用模型。";
  } catch(error) { modelNotice.textContent = error.message; }
  finally { button.disabled = false; }
};
modelList.onchange = () => { if(modelList.value) form.elements.model.value = modelList.value; };
function profileLabel(id) {
  const t = text => text;
  if(id === "global") return t("全局词库（始终启用）");
  const [kind,...name] = id.split(":");
  return `${t(({topic:"主题",streamer:"主播",game:"游戏",custom:"通用"})[kind]||"词库")} · ${t(name.join(":"))}`;
}
let serverProfiles = [];
function renderProfileOptions() {
  const selected = profile.value;
  profile.replaceChildren(...serverProfiles.map(item => new Option(profileLabel(item.id), item.id)));
  profile.value = serverProfiles.some(item => item.id === selected) ? selected : "global";
}
form.elements.uiLanguage.addEventListener("change", renderProfileOptions);
async function loadEntries() {
  editor.set((await serverRequest(`/glossary/${encodeURIComponent(profile.value)}`)).entries);
  notice.textContent = "已读取服务器词库。修改后点击保存词库。";
}
async function loadProfiles() {
  serverProfiles = (await serverRequest("/glossary")).profiles;
  renderProfileOptions(); await loadEntries();
}
document.querySelector("#load").onclick = async () => {
  try { await allowConnection(config.url); await loadProfiles(); }
  catch(error) { notice.textContent = error.message; }
};
profile.onchange = async () => { try { await loadEntries(); } catch(error) { notice.textContent = error.message; } };
document.querySelector("#create-profile").onclick = async () => {
  const input=document.querySelector("#profile-name"),name=input.value.trim();
  if(!name || name.includes("/")){notice.textContent="名称不能为空或包含 /。";return;}
  try {
    const id=`${document.querySelector("#profile-kind").value}:${name}`;
    await serverRequest("/glossary","POST",{profile:id});
    serverProfiles=(await serverRequest("/glossary")).profiles;renderProfileOptions();profile.value=id;
    await loadEntries();input.value="";
  } catch(error) { notice.textContent=error.message; }
};
document.querySelector("#glossary").onsubmit = async event => {
  event.preventDefault();
  try {
    const result = await chrome.runtime.sendMessage({to:"background",type:"glossarySave",profile:profile.value,entries:editor.get(true)});
    if(result.error) throw new Error(result.error);
    notice.textContent=`已保存 ${result.saved} 条，当前会话已更新。`;
  } catch(error) { notice.textContent=error instanceof SyntaxError ? "JSON 格式有误，请检查引号、逗号和括号后再切换。" : error.message; }
};
document.querySelector("#export").onclick = () => {
  try {
    const url=URL.createObjectURL(new Blob([JSON.stringify(editor.get(),null,2)],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download="yumehime-glossary.json";link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  } catch(error) { notice.textContent=error.message; }
};
if(config.token){
  const origin=new URL(httpBase(config.url));
  if(await chrome.permissions.contains({origins:[`${origin.protocol}//${origin.hostname}/*`]})){
    try{await loadProfiles();}catch(error){notice.textContent=error.message;}
  }
}else notice.textContent="请先填写并保存连接设置，再读取服务器词库。";
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
    editor.set(file.name.endsWith(".csv") ? csv(text) : JSON.parse(text));
    notice.textContent = "已导入编辑区，检查后点击保存词库。";
  } catch (error) { notice.textContent = error.message; }
};
