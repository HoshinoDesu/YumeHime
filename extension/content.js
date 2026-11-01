(() => {
  if (globalThis.__liveSub) return;
  globalThis.__liveSub = true;
  const host = document.createElement("div");
  host.id = "livesub-overlay";
  host.className = "notranslate";
  host.setAttribute("translate", "no");
  host.lang = "zh-CN";
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647";
  const shadow = host.attachShadow({ mode: "open" });
  const icon = globalThis.YumeHimeIcons.svg;
  shadow.innerHTML = `<style>
    :host { all:initial;color-scheme:light dark;--font:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;--surface:255 255 255;--text:#202020;--muted:#747474;--border:#00000018;--field:#00000007;--hover:#0000000b;--action:#242424;--action-text:#fff;--edge:#fff;--size:32px;--opacity:.6;--subtitle-shadow:0 0 2px var(--edge),0 0 2px var(--edge); }
    @media (prefers-color-scheme:dark) { :host { --surface:22 22 22;--text:#f4f4f4;--muted:#a0a0a0;--border:#ffffff19;--field:#ffffff08;--hover:#ffffff12;--action:#f0f0f0;--action-text:#181818;--edge:#000; } }
    * { box-sizing:border-box; }
    [hidden] { display:none!important; }
    .window { position:absolute;left:0;top:0;pointer-events:auto;overflow:visible;border:1px solid var(--border);border-radius:16px;box-shadow:0 18px 60px #00000025;background:rgb(var(--surface) / var(--opacity));backdrop-filter:blur(12px);font:13px/1.45 var(--font);color:var(--text);transition:background 200ms ease-out,border-color 200ms ease-out,box-shadow 200ms ease-out;outline:none; }
    .chrome { position:absolute;z-index:3;left:0;width:max-content;max-width:calc(100vw - 16px);top:var(--chrome-top);max-height:calc(100vh - 16px);overflow:auto;border:1px solid var(--border);border-radius:13px;background:rgb(var(--surface) / var(--opacity));backdrop-filter:blur(12px);transition:opacity 180ms ease-out; }
    .header,.controls,.footer,.resize { transition:opacity 180ms ease-out; }
    .window.idle { background:transparent;border-color:transparent;box-shadow:none;backdrop-filter:none; }
    .idle .lyrics-viewport { background:rgb(218 218 218 / var(--opacity));border-radius:14px;backdrop-filter:blur(8px); }
    @media(prefers-color-scheme:dark){.idle .lyrics-viewport{background:rgb(60 60 60 / var(--opacity));}}
    .idle .chrome,.idle .resize,.idle .empty { opacity:0;visibility:hidden;pointer-events:none; }
    .window.moving { will-change:transform,width,height;user-select:none; }
    .header { display:flex;align-items:center;gap:6px;flex:none;height:30px;padding:0 6px;border-radius:15px 15px 0 0;background:rgb(0 0 0 / .12);cursor:grab;touch-action:none; }
    .moving .header { cursor:grabbing; }
    .brand { margin-right:auto;font-size:12px;font-weight:600;letter-spacing:-.02em; }
    button,input,select { font:inherit;color:inherit; }
    button { border:0;cursor:pointer;background:transparent;border-radius:7px;padding:7px 10px; }
    button:hover { background:var(--hover); }
    button:active { background:var(--border);transform:scale(.97); }
    button:focus-visible,input:focus-visible,select:focus-visible { outline:2px solid currentColor;outline-offset:2px; }
    button:disabled { opacity:.4;cursor:default; }
    button[aria-pressed=true] { background:var(--hover); }
    .icon { display:grid;place-items:center;width:24px;height:24px;flex:none;padding:0; }
    .grip { cursor:grab;color:var(--muted); }
    svg { display:block;flex:none;width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;pointer-events:none; }
    .controls { display:flex;flex-wrap:wrap;align-items:center;gap:4px;min-height:34px;padding:3px 6px 5px;background:rgb(0 0 0 / .12);border-bottom:1px solid var(--border); }
    .primary { display:flex;align-items:center;justify-content:center;gap:7px;background:var(--action);color:var(--action-text);padding:5px 8px;font-size:12px;font-weight:500; }
    .primary:hover { background:var(--action);opacity:.88; }
    .primary:active { opacity:.72; }
    .play-icon { display:grid;place-items:center; }
    .play-icon svg { width:14px;height:14px; }
    .style-toggle,.words-toggle,.word-back,.add-term { display:flex;align-items:center;justify-content:center;gap:5px; }
    .style-toggle { width:28px;height:27px;padding:0; }
    .words-toggle { padding:5px 6px;font-size:12px; }
    .languages > svg { width:12px;height:12px; }
    .target-wrap { position:relative; }
    .target-wrap > svg { position:absolute;right:2px;top:50%;transform:translateY(-50%);width:12px;height:12px; }
    .languages { display:flex;align-items:center;gap:3px;margin-left:4px;white-space:nowrap;font-size:11px;color:var(--muted); }
    .languages select { appearance:none;width:auto;max-width:135px;padding:3px 17px 3px 4px;border:0;background:transparent;color:var(--text); }
    .pane { width:420px;max-width:calc(100vw - 24px);max-height:min(300px,calc(100vh - 160px));overflow:auto;padding:15px 18px;background:rgb(var(--surface) / .12);border-bottom:1px solid var(--border);overscroll-behavior:contain; }
    .speed-field { grid-column:1/-1; }
    .word-editor .editor-head { justify-content:flex-start; }
    .word-editor .term-editor { margin-bottom:12px; }
    .style-grid { display:grid;grid-template-columns:1fr 1fr;gap:13px 18px; }
    label { display:grid;gap:6px; }
    input,select { width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;background:var(--field);accent-color:var(--text); }
    select option { background:rgb(var(--surface));color:var(--text); }
    input[type=range] { padding:0;border:0; }
    input[type=checkbox] { width:auto; }
    .check { display:flex;align-items:center;gap:7px; }
    .field-title { display:flex;justify-content:space-between;gap:8px; }
    .field-title output { font-variant-numeric:tabular-nums;color:var(--muted); }
    .lyrics-viewport { position:absolute;inset:0;overflow:hidden;border-radius:15px;cursor:grab;touch-action:none;user-select:none; }
    .lyrics-mask { position:absolute;inset:0;mask-image:linear-gradient(transparent,#000 7%,#000 93%,transparent); }
    .lyrics { position:absolute;inset:0; }
    .lyric-row { position:absolute;left:28px;right:28px;top:0;opacity:0;visibility:hidden;filter:blur(.3px);transform-origin:left center;transition:opacity 240ms ease-out,filter 240ms ease-out,transform 450ms cubic-bezier(.2,.8,.2,1);overflow-wrap:anywhere; }
    .lyric-row.previous { opacity:.45;visibility:visible; }
    .lyric-row.active { opacity:1;visibility:visible;filter:none; }
    .ja,.zh { margin:0;font-weight:400;font-optical-sizing:auto;line-height:1.35;text-shadow:var(--subtitle-shadow); }
    .ja { font-size:calc(var(--size) * .68 * var(--row-scale,1));color:var(--muted);margin-bottom:calc(5px * var(--row-scale,1)); }
    .zh { font-size:calc(var(--size) * var(--row-scale,1));color:var(--text); }
    .ja:empty,.zh:empty { display:none; }
    .empty { position:absolute;inset:0;display:grid;place-items:center;color:var(--muted);font-size:13px; }
    .footer { display:flex;align-items:center;gap:7px;flex:none;min-height:22px;padding:3px 8px;border-radius:0 0 15px 15px;font-size:11px;color:var(--muted); }
    .dot { width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.55; }
    .footer.live .dot { opacity:1; }
    .status { overflow:hidden;white-space:nowrap;text-overflow:ellipsis; }
    .resize { position:absolute;z-index:4;padding:0;touch-action:none; }
    .resize.e,.resize.w { top:12px;bottom:12px;width:12px;cursor:ew-resize; }.resize.e{right:-6px}.resize.w{left:-6px}
    .resize.n,.resize.s { left:12px;right:12px;height:12px;cursor:ns-resize; }.resize.n{top:-6px}.resize.s{bottom:-6px}
    .resize.ne,.resize.nw,.resize.se,.resize.sw { width:24px;height:24px; }.resize.ne{right:-6px;top:-6px;cursor:nesw-resize}.resize.nw{left:-6px;top:-6px;cursor:nwse-resize}.resize.sw{left:-6px;bottom:-6px;cursor:nesw-resize}.resize.se{right:-3px;bottom:-3px;cursor:nwse-resize;color:var(--muted)}
    .locked .resize { display:none; }.locked .header,.locked .grip,.locked .lyrics-viewport{cursor:default}
    .profile-list { display:grid;gap:5px;margin:0 0 12px; }.profile-row{display:flex;align-items:center;gap:8px;padding:6px 0}.profile-row label{flex:1}.profile-row small{color:var(--muted);font-variant-numeric:tabular-nums}.profile-row button{padding:4px 7px;font-size:12px}
    .create-profile{display:flex;gap:6px}.create-profile select{width:80px}.create-profile input{min-width:0;flex:1}.create-profile button{flex:none;border:1px solid var(--border)}
    .editor-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}.editor-title{font-weight:500}.editor-actions{display:flex;gap:7px;align-items:center;margin-top:12px}.editor-actions button{border:1px solid var(--border)}
    .term-row{display:grid;grid-template-columns:1fr 1fr 27px;gap:5px;margin:0 0 9px}.term-row input{min-width:0}.term-row .aliases,.term-row .variants,.term-row .note{grid-column:1/3;font-size:11px}.term-row .remove{grid-column:3;grid-row:1/5;padding:0;color:var(--muted)}
    .notice{color:var(--muted);font-size:12px;margin:9px 0 0}.connection{color:inherit;text-decoration:underline;text-underline-offset:3px}
    @media(prefers-reduced-motion:reduce){.lyric-row,.window,.chrome,.header,.controls,.footer,.resize{transition:none}.lyric-row{filter:none}}
  </style><section class="window" role="region" aria-label="YumeHime 悬浮窗" tabindex="0" hidden><div class="chrome">
    <div class="header"><button class="icon grip" type="button" aria-label="拖动窗口，方向键微调" title="拖动窗口">${icon("grip")}</button><span class="brand">YumeHime</span><button class="icon lock" title="锁定窗口" aria-label="锁定窗口" aria-pressed="false">${icon("lock")}</button><button class="icon reset" title="恢复默认位置和大小" aria-label="恢复默认位置和大小">${icon("reset")}</button><button class="icon options" title="连接设置" aria-label="连接设置">${icon("gear")}</button><button class="icon close" title="关闭悬浮窗并停止翻译" aria-label="关闭悬浮窗并停止翻译">${icon("close")}</button></div>
    <div class="controls"><button class="primary toggle-translation"><span class="play-icon">${icon("play")}</span><span class="play-label">开始翻译</span></button><button class="style-toggle" aria-pressed="false" title="字幕样式" aria-label="字幕样式">${icon("type")}</button><button class="words-toggle" aria-pressed="false">${icon("book")}<span>词库</span></button><div class="languages"><span>日语</span>${icon("arrow")}<div class="target-wrap"><select class="target" aria-label="目标语言"><option value="zh-CN">简体中文</option><option value="zh-TW">繁體中文</option><option value="en">English</option></select>${icon("chevron")}</div></div></div>
    <div class="pane style-pane" hidden><div class="style-grid"><label><span class="field-title">字号<output class="font-value">32</output></span><input class="font-size" type="range" min="16" max="64" step="1" aria-label="字幕字号"></label><label><span class="field-title">背景<output class="opacity-value">60%</output></span><input class="opacity" type="range" min="0" max="1" step="0.05" aria-label="背景不透明度"></label><label>描边<select class="outline" aria-label="描边强度"><option value="0">无</option><option value="1">轻</option><option value="2">标准</option><option value="3">明显</option><option value="4">强</option></select></label><label class="speed-field">日文临时字幕显示<select class="speed" aria-label="日文临时字幕显示速度"><option value="0">立即显示（会随识别修正）</option><option value="1000">每 1 秒刷新临时字幕</option><option value="2000">每 2 秒刷新临时字幕</option><option value="finalOnly">说完后显示完整双语字幕</option></select><small class="field-help">前三项只调整日文临时字幕的刷新频率，译文一返回就显示；最后一项会等待原文和译文确认。</small></label><label>界面语言<select class="ui-language" aria-label="界面语言"><option value="auto">跟随系统</option><option value="zh-CN">简体中文</option><option value="zh-TW">繁體中文</option><option value="en">English</option></select></label><label class="check"><input class="show-ja" type="checkbox">显示日文原文</label></div></div>
    <div class="pane words-pane" hidden><div class="word-selection"><div class="profile-list"></div><form class="create-profile"><select class="profile-kind" aria-label="词库类型"><option value="streamer">主播</option><option value="game">游戏</option><option value="custom">通用</option></select><input class="profile-name" required maxlength="60" placeholder="新词库名称" aria-label="新词库名称"><button type="submit">新建</button></form></div><form class="word-editor" hidden><div class="editor-head"><button class="word-back" type="button">${icon("back")}<span>返回</span></button><span class="editor-title"></span></div><div class="term-list"></div><div class="editor-actions"><button class="save-terms" type="submit">保存到服务器</button></div></form><div class="notice word-notice" role="status"></div></div>
    <div class="footer"><span class="dot"></span><span class="status" role="status">尚未开始</span></div>
    </div><div class="lyrics-viewport"><div class="empty">点击开始翻译</div><div class="lyrics-mask"><div class="lyrics"></div></div></div>
    ${["n","s","e","w","ne","nw","sw"].map(edge=>`<div class="resize ${edge}" data-resize="${edge}" aria-hidden="true"></div>`).join("")}<button class="resize se" data-resize="se" aria-label="调整窗口大小，方向键微调" title="拖动调整大小">${icon("resize")}</button>
  </section>`;
  const $ = selector => shadow.querySelector(selector), win = $(".window"), viewport = $(".lyrics-viewport"), track = $(".lyrics");
  let config = {}, capture = { running: false }, visible = false, session = null, gesture = null, gestureFrame;
  let box = { left: 0, top: 0, width: 560, height: 220 }, raw = new Map(), rows = new Map(), pages = [], activeKey = null, renderTimer,lastRender=0;
  let idleTimer;
  const localization=globalThis.YumeHimeI18n.watch(shadow,()=>config.uiLanguage);
  let profiles = [], editProfile = null, termDraft = [];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  async function rpc(type, extra = {}) { const result = await chrome.runtime.sendMessage({ to: "background", type, ...extra }); if (result?.error) throw new Error(result.error); return result; }
  function status(text) { $(".status").textContent = text; }
  function wake() {
    clearTimeout(idleTimer);win.classList.remove("idle");
    idleTimer=setTimeout(()=>{
      if(gesture||!$(".style-pane").hidden||!$(".words-pane").hidden){wake();return;}
      if(visible)win.classList.add("idle");
    },3000);
  }
  for(const event of ["pointerenter","pointermove","pointerdown","keydown","focusin","input"])win.addEventListener(event,wake,{passive:true});
  function save(patch) { config = { ...config, ...patch }; return rpc("updateStyle", { patch }); }
  function bounds(value) {
    const w = host.clientWidth, h = host.clientHeight, width = Math.max(Math.min(240, w-16), Math.min(value.width, w-16)), height = Math.max(Math.min(80, h-16), Math.min(value.height, h-16));
    return { width, height, left: Math.max(8, Math.min(value.left, w-width-8)), top: Math.max(8, Math.min(value.top, h-height-8)) };
  }
  function place() {
    if (!visible) return;
    const size = config.windowSize || { width: 560, height: 220 }, anchor = config.subtitlePosition || { x: 50, y: 100-(config.bottom ?? 12) };
    box = bounds(gesture ? gesture.box : { ...size, left: host.clientWidth*anchor.x/100-size.width/2, top: host.clientHeight*anchor.y/100-size.height });
    win.style.width = `${box.width}px`; win.style.height = `${box.height}px`; win.style.transform = `translate3d(${box.left}px,${box.top}px,0)`;
    const chromeWidth=$(".chrome").offsetWidth;$(".chrome").style.left=`${Math.max(8-box.left,Math.min(0,host.clientWidth-box.left-chromeWidth-8))}px`;
    const chromeHeight=$(".chrome").offsetHeight,desired=box.top>=chromeHeight+14?-chromeHeight-6:box.height+6;
    win.style.setProperty("--chrome-top",`${Math.max(8-box.top,Math.min(desired,host.clientHeight-box.top-chromeHeight-8))}px`);
  }
  function saveGeometry() { return save({ windowSize: { width: box.width, height: box.height }, subtitlePosition: { x: (box.left+box.width/2)/host.clientWidth*100, y: (box.top+box.height)/host.clientHeight*100 } }); }
  function finishGesture(commit) {
    if (!gesture) return;
    cancelAnimationFrame(gestureFrame); place(); const pointerId = gesture.pointerId; gesture = null; win.classList.remove("moving");
    if (win.hasPointerCapture(pointerId)) win.releasePointerCapture(pointerId);
    if (commit) saveGeometry(); else place();
    renderLyrics(true);
  }
  function attach() { finishGesture(false); (document.fullscreenElement || document.documentElement).append(host); place(); renderLyrics(true); }
  attach(); document.addEventListener("fullscreenchange", attach); window.addEventListener("resize", () => { place(); renderLyrics(true); });
  win.addEventListener("pointerdown", event => {
    const edge = event.target.closest("[data-resize]")?.dataset.resize;
    const header = event.target.closest(".header,.lyrics-viewport") && (!event.target.closest("button,select") || event.target.closest(".grip"));
    if (event.button !== 0 || config.positionLocked || (!edge && !header)) return;
    event.preventDefault(); event.stopPropagation();
    gesture = { pointerId: event.pointerId, edge, x: event.clientX, y: event.clientY, start: { ...box }, box: { ...box } }; win.setPointerCapture(event.pointerId); win.classList.add("moving");
  });
  win.addEventListener("pointermove", event => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX-gesture.x, dy = event.clientY-gesture.y, start = gesture.start, edge = gesture.edge;
    const value = { ...start };
    if (!edge) { value.left += dx; value.top += dy; }
    else {
      if (edge.includes("e")) value.width += dx;
      if (edge.includes("s")) value.height += dy;
      if (edge.includes("w")) { value.width -= dx; value.left += dx; }
      if (edge.includes("n")) { value.height -= dy; value.top += dy; }
      const minW = Math.min(240,host.clientWidth-16), minH = Math.min(80,host.clientHeight-16);
      if (edge.includes("w") && value.width < minW) value.left = start.left+start.width-minW;
      if (edge.includes("n") && value.height < minH) value.top = start.top+start.height-minH;
    }
    gesture.box = bounds(value); cancelAnimationFrame(gestureFrame); gestureFrame = requestAnimationFrame(() => { place(); renderLyrics(true); });
  });
  win.addEventListener("pointerup", () => finishGesture(true)); win.addEventListener("pointercancel", () => finishGesture(false)); win.addEventListener("lostpointercapture", () => finishGesture(false));
  win.addEventListener("click", event => event.stopPropagation());
  for (const selector of [".grip", ".resize.se"]) $(selector).addEventListener("keydown", event => {
    const delta = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] }[event.key];
    if (!delta || config.positionLocked) return; event.preventDefault(); const step = event.shiftKey ? 10 : 2;
    const value = { ...box }; if (selector === ".grip") { value.left += delta[0]*step; value.top += delta[1]*step; } else { value.width += delta[0]*step; value.height += delta[1]*step; }
    box = bounds(value); saveGeometry(); place(); renderLyrics(true);
  });
  $(".close").onclick = () => rpc("setPanel", { visible: false }).catch(error => status(error.message));
  $(".options").onclick = () => rpc("openOptions");
  $(".lock").onclick = () => save({ positionLocked: !config.positionLocked });
  $(".reset").onclick = () => save({ subtitlePosition: null, bottom: 12, windowSize: { width: 560, height: 220 } });
  function showPane(name) { for (const kind of ["style", "words"]) { const open = kind === name && $(`.${kind}-pane`).hidden; $(`.${kind}-pane`).hidden = !open; $(`.${kind}-toggle`).setAttribute("aria-pressed", String(open)); } wake();place();renderLyrics(true); }
  $(".style-toggle").onclick = () => showPane("style");
  $(".words-toggle").onclick = () => { showPane("words"); if (!$(".words-pane").hidden) loadProfiles(); };
  for (const [selector,key,convert] of [[".font-size","fontSize",Number],[".opacity","opacity",Number],[".outline","outlineWidth",Number]]) $(selector).addEventListener("input", event => { const patch = { [key]: convert(event.target.value) }; applySettings({ ...config, ...patch }); save(patch); });
  $(".show-ja").onchange = event => save({ showJapanese: event.target.checked });
  $(".ui-language").onchange=event=>save({uiLanguage:event.target.value});
  $(".target").onchange = event => save({ targetLanguage: event.target.value });
  $(".speed").onchange = event => save({ subtitleSpeed: event.target.value });
  $(".toggle-translation").onclick = async () => {
    const button = $(".toggle-translation"); button.disabled = true;
    try { await rpc(capture.running && !capture.paused ? "pause" : "start"); } catch (error) { status(error.message); } finally { button.disabled = false; }
  };
  function updateCapture(value) {
    capture = { translationEnabled: capture.translationEnabled, ...(value || { running: false }) }; $(".play-label").textContent = capture.running ? (capture.paused ? "继续翻译" : "暂停翻译") : "开始翻译";
    $(".play-icon").innerHTML = icon(capture.running && !capture.paused ? "pause" : "play"); $(".footer").classList.toggle("live", !!capture.connected);
    status(capture.message || (capture.running ? "正在连接" : "尚未开始")); $(".empty").textContent = capture.running ? (capture.paused ? "已暂停" : "等待字幕") : "点击开始翻译";
  }
  function applySettings(value) {
    config = value || {}; const size = config.fontSize ?? 32, outline = config.outlineWidth ?? 2;
    host.style.setProperty("--size", `${size}px`); host.style.setProperty("--opacity", config.opacity ?? .6); host.style.setProperty("--subtitle-shadow", outline ? `0 0 ${outline}px var(--edge),0 0 ${outline}px var(--edge)` : "none");
    $(".font-size").value = size; $(".font-value").textContent = size; $(".opacity").value = config.opacity ?? .6; $(".opacity-value").textContent = `${Math.round((config.opacity ?? .6)*100)}%`;
    $(".outline").value = outline; $(".show-ja").checked = config.showJapanese !== false; $(".target").value = config.targetLanguage || "zh-CN";
    $(".speed").value=config.subtitleSpeed??"1000";
    $(".ui-language").value=config.uiLanguage||"auto";host.lang=globalThis.YumeHimeI18n.resolveLanguage(config.uiLanguage);localization.refresh();
    win.classList.toggle("locked", !!config.positionLocked); $(".lock").setAttribute("aria-pressed", String(!!config.positionLocked)); $(".grip").disabled = !!config.positionLocked; $(".lock").innerHTML = icon(config.positionLocked ? "lock" : "unlock"); $(".lock").title = config.positionLocked ? "解锁窗口" : "锁定窗口"; $(".lock").setAttribute("aria-label", $(".lock").title);
    place(); renderLyrics(true);
  }
  function center(instant) {
    const index=pages.findIndex(page=>page.key===activeKey);if(index<0)return;
    const current=rows.get(activeKey),previous=rows.get(pages[index-1]?.key),gap=previous?8:0;
    current.style.setProperty("--row-scale",1);
    if(previous){
      previous.style.setProperty("--row-scale",1);
      const available=viewport.clientHeight-current.offsetHeight-gap-12;
      previous.style.setProperty("--row-scale",Math.min(1,Math.max(.22,available/previous.offsetHeight)));
    }
    const currentAvailable=viewport.clientHeight-(previous?previous.offsetHeight+gap:0)-12;
    for(let i=0;i<4&&current.offsetHeight>currentAvailable;i++){
      const scale=Number(current.style.getPropertyValue("--row-scale"));
      current.style.setProperty("--row-scale",Math.max(.08,scale*currentAvailable/current.offsetHeight*.97));
    }
    const height=current.offsetHeight+(previous?previous.offsetHeight+gap:0),top=Math.max(4,(viewport.clientHeight-height)/2);
    const position=(row,y,scale)=>{row.style.transition=instant?"none":"";row.style.transform=`translate3d(0,${y}px,0) scale(${scale})`;};
    if(previous)position(previous,top,1);
    position(current,top+(previous?previous.offsetHeight+gap:0),1);
  }
  function markRows(){const index=pages.findIndex(page=>page.key===activeKey);for(const [i,page]of pages.entries()){rows.get(page.key).classList.toggle("active",i===index);rows.get(page.key).classList.toggle("previous",i===index-1);}}
  function queueRender(event){
    clearTimeout(renderTimer);
    const interval=config.subtitleSpeed==="finalOnly"?0:Number(config.subtitleSpeed??1000);
    const delay=event.final||event.kind==="translation"?0:Math.max(0,interval-(performance.now()-lastRender));
    if(delay)renderTimer=setTimeout(()=>renderLyrics(),delay);else renderLyrics();
  }
  function renderLyrics(instant=false) {
    if (!visible || !viewport.clientWidth) return;
    lastRender=performance.now();
    const next = [];
    for (const [id,data] of raw) {
      if(!data.original?.text||(config.subtitleSpeed==="finalOnly"&&(!data.original.final||(capture.translationEnabled!==false&&!data.translation?.final))))continue;
      next.push({key:id,ja:config.showJapanese===false?"":data.original.text,zh:config.subtitleSpeed==="finalOnly"&&!data.translation?.final?"":data.translation?.text||""});
    }
    const keys = new Set(next.map(page=>page.key)); for (const [key,row] of rows) if (!keys.has(key)) { row.remove(); rows.delete(key); }
    for (const page of next) {
      let row = rows.get(page.key);
      if (!row) { row = document.createElement("div"); row.className = "lyric-row"; const ja=document.createElement("div"),zh=document.createElement("div");ja.className="ja";ja.lang="ja";zh.className="zh";row.append(ja,zh);rows.set(page.key,row); }
      row.children[0].textContent=page.ja;row.children[1].textContent=page.zh;row.children[1].lang=config.targetLanguage||"zh-CN";track.append(row);
    }
    pages=next;$(".empty").hidden=!!pages.length;
    if (!pages.length) { activeKey=null;return; }
    const translated=pages.filter(page=>page.zh);
    activeKey=capture.translationEnabled!==false&&translated.length?translated.at(-1).key:pages.at(-1).key;markRows();center(instant);
  }
  new ResizeObserver(() => { if (visible) renderLyrics(true); }).observe(viewport);
  new ResizeObserver(()=>{if(visible)place();}).observe($(".chrome"));
  motion.addEventListener("change",()=>center(true));
  function profileName(id) { if(id==="global")return"全局词库（始终启用）";const [kind,...name]=id.split(":");return `${({streamer:"主播",game:"游戏",custom:"通用",topic:"主题"})[kind]||"词库"} · ${name.join(":")||kind}`; }
  function wordNotice(text) { $(".word-notice").textContent=text; }
  async function loadProfiles() {
    wordNotice("正在读取服务器词库…");
    try { profiles=(await rpc("glossaryList")).profiles;renderProfiles();wordNotice(""); } catch(error){wordNotice(error.message);}
  }
  function renderProfiles() {
    const selected=new Set((config.profiles||"").split(",").filter(Boolean)),list=$(".profile-list");list.replaceChildren();
    for(const profile of profiles){const row=document.createElement("div");row.className="profile-row";const label=document.createElement("label");label.className="check";const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.checked=profile.id==="global"||selected.has(profile.id);checkbox.disabled=profile.id==="global";checkbox.setAttribute("aria-label",profileName(profile.id));label.append(checkbox,document.createTextNode(profileName(profile.id)));const count=document.createElement("small");count.textContent=`${profile.count} 条`;const edit=document.createElement("button");edit.textContent="编辑";edit.onclick=()=>openEditor(profile.id);checkbox.onchange=async()=>{if(checkbox.checked)selected.add(profile.id);else selected.delete(profile.id);if(selected.size>10){checkbox.checked=false;selected.delete(profile.id);wordNotice("最多同时选择 10 个词库。");return;}await save({profiles:[...selected].join(",")});wordNotice("词库已应用。");};row.append(label,count,edit);list.append(row);}
  }
  async function openEditor(id) { wordNotice("正在读取…");try{termDraft=(await rpc("glossaryGet",{profile:id})).entries;editProfile=id;$(".editor-title").textContent=profileName(id);$(".word-selection").hidden=true;$(".word-editor").hidden=false;renderTerms();wordNotice("");}catch(error){wordNotice(error.message);} }
  const termEditor = new globalThis.YumeHimeTermEditor($(".term-list"));
  function renderTerms(){termEditor.set(termDraft);}
  $(".word-back").onclick=()=>{$(".word-editor").hidden=true;$(".word-selection").hidden=false;loadProfiles();};
  $(".word-editor").onsubmit=async event=>{event.preventDefault();const button=$(".save-terms");button.disabled=true;try{await rpc("glossarySave",{profile:editProfile,entries:termEditor.get(true)});wordNotice("已保存到服务器，正在使用的词库已更新。");}catch(error){wordNotice(error.message);}finally{button.disabled=false;}};
  $(".create-profile").onsubmit=async event=>{event.preventDefault();const name=$(".profile-name").value.trim();if(!name||name.includes("/")){wordNotice("名称不能为空或包含 /。");return;}const id=`${$(".profile-kind").value}:${name}`;try{await rpc("glossaryCreate",{name:id});$(".profile-name").value="";await loadProfiles();await openEditor(id);}catch(error){wordNotice(error.message);}};
  function clearLyrics(){clearTimeout(renderTimer);raw.clear();pages=[];rows.clear();track.replaceChildren();activeKey=null;lastRender=0;$(".empty").hidden=false;}
  chrome.storage.local.get("settings").then(value=>applySettings(value.settings));
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local"&&changes.settings)applySettings(changes.settings.newValue);});
  chrome.runtime.onMessage.addListener(message=>{
    if(message.to!=="content")return;
    if(message.type==="settings")applySettings(message.settings);
    if(message.type==="panel"){visible=message.visible;win.hidden=!visible;updateCapture(message.state);place();renderLyrics(true);if(visible)wake();else clearTimeout(idleTimer);}
    if(message.type==="captureState"){updateCapture(message.state);}
    if(message.type==="clear"){clearLyrics();session=null;}
    if(message.type!=="event")return;const data=message.event;
    if(data.type==="ready"){clearLyrics();session=data.session_id;capture.translationEnabled=data.translation_enabled;return;}
    if(session&&data.session_id!==session)return;
    if(data.type==="translation_error"){status(data.message);return;}
    if(data.type!=="subtitle")return;session=data.session_id;
    if(data.kind==="translation"&&!raw.has(data.segment_id))return;
    const item=raw.get(data.segment_id)||{},previous=item[data.kind];if(previous&&(previous.revision>=data.revision||previous.final))return;
    item[data.kind]=data;raw.set(data.segment_id,item);while(raw.size>80)raw.delete(raw.keys().next().value);queueRender(data);
  });
})();
