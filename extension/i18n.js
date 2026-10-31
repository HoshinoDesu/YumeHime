(() => {
  if (globalThis.YumeHimeI18n) return;
  const entries = [
    ["设置导航","Settings navigation","設定導覽"],
    ["解锁窗口","Unlock window","解鎖視窗"],
    ["返回","Back","返回"],
    ["添加词条","Add entry","新增詞條"],
    ["YumeHime 设置","YumeHime Settings","YumeHime 設定"],
    ["悬浮窗","Subtitle window","懸浮窗"],
    ["显示悬浮窗","Show subtitle window","顯示懸浮窗"],
    ["YumeHime 悬浮窗","YumeHime subtitle window","YumeHime 懸浮窗"],
    ["连接设置","Connection settings","連線設定"],
    ["界面语言","Interface language","介面語言"],
    ["跟随系统","System language","跟隨系統"],
    ["简体中文","Simplified Chinese","簡體中文"],
    ["繁體中文","Traditional Chinese","繁體中文"],
    ["日语","Japanese","日語"],
    ["开始翻译","Start translation","開始翻譯"],
    ["暂停翻译","Pause translation","暫停翻譯"],
    ["继续翻译","Resume translation","繼續翻譯"],
    ["点击开始翻译","Click Start translation","點擊開始翻譯"],
    ["在悬浮窗中开始翻译","Start translation in the subtitle window","在懸浮窗中開始翻譯"],
    ["已关闭","Off","已關閉"],
    ["已暂停","Paused","已暫停"],
    ["已停止","Stopped","已停止"],
    ["尚未开始","Not started","尚未開始"],
    ["等待字幕","Waiting for subtitles","等待字幕"],
    ["正在连接","Connecting","正在連線"],
    ["正在连接服务器","Connecting to server","正在連線至伺服器"],
    ["翻译中","Translating","翻譯中"],
    ["显示日文原文","Show Japanese","顯示日文原文"],
    ["拖动窗口","Drag window","拖曳視窗"],
    ["拖动窗口，方向键微调","Drag window; use arrow keys to adjust","拖曳視窗，方向鍵微調"],
    ["锁定窗口","Lock window","鎖定視窗"],
    ["恢复默认位置和大小","Reset position and size","還原預設位置和大小"],
    ["关闭悬浮窗并停止翻译","Close window and stop translation","關閉懸浮窗並停止翻譯"],
    ["调整窗口大小，方向键微调","Resize window; use arrow keys to adjust","調整視窗大小，方向鍵微調"],
    ["拖动调整大小","Drag to resize","拖曳調整大小"],
    ["字幕样式","Subtitle style","字幕樣式"],
    ["字号","Text size","字級"],
    ["背景","Background","背景"],
    ["描边","Outline","描邊"],
    ["字幕更新","Subtitle updates","字幕更新"],
    ["字幕字号","Subtitle text size","字幕字級"],
    ["背景不透明度","Background opacity","背景不透明度"],
    ["描边强度","Outline strength","描邊強度"],
    ["字幕更新速度","Subtitle update speed","字幕更新速度"],
    ["无","None","無"],
    ["轻","Light","輕"],
    ["标准","Normal","標準"],
    ["明显","Strong","明顯"],
    ["强","Heavy","強"],
    ["实时","Live","即時"],
    ["稳定 · 1 秒","Stable · 1 second","穩定 · 1 秒"],
    ["稳定 · 2 秒","Stable · 2 seconds","穩定 · 2 秒"],
    ["只显示确认结果","Confirmed only","僅顯示確認結果"],
    ["目标语言","Translation language","目標語言"],
    ["词库","Glossary","詞庫"],
    ["全局词库","Global glossary","全域詞庫"],
    ["主播","Streamer","主播"],
    ["游戏","Games","遊戲"],
    ["通用","Custom","通用"],
    ["主题","Topic","主題"],
    ["动漫与二次元","Anime & fandom","動漫與二次元"],
    ["日常生活","Everyday life","日常生活"],
    ["口语与网络用语","Conversation & slang","口語與網路用語"],
    ["词库类型","Glossary type","詞庫類型"],
    ["新词库名称","New glossary name","新詞庫名稱"],
    ["新建","Create","新增"],
    ["编辑","Edit","編輯"],
    ["‹ 返回","‹ Back","‹ 返回"],
    ["＋ 添加词条","＋ Add entry","＋ 新增詞條"],
    ["保存到服务器","Save to server","儲存到伺服器"],
    ["日语词语","Japanese term","日語詞語"],
    ["中文译名","Preferred translation","中文譯名"],
    ["翻译识别写法，用 | 分隔","Translation variants, separated by |","翻譯參考寫法，以 | 分隔"],
    ["按语境翻译的提示，可选","Context guidance (optional)","依語境翻譯的提示，選填"],
    ["替换原文的别名，可选，用 | 分隔","ASR replacements (optional), separated by |","替換原文的別名，選填，以 | 分隔"],
    ["移除词条","Remove entry","移除詞條"],
    ["正在读取服务器词库…","Loading server glossaries…","正在讀取伺服器詞庫…"],
    ["正在读取…","Loading…","正在讀取…"],
    ["词库已应用。","Glossary selection applied.","詞庫已套用。"],
    ["最多同时选择 10 个词库。","Select up to 10 glossaries.","最多同時選擇 10 個詞庫。"],
    ["已保存到服务器，正在使用的词库已更新。","Saved to server and applied to this session.","已儲存到伺服器，目前的詞庫已更新。"],
    ["名称不能为空或包含 /。","Enter a name without /.","名稱不能為空或包含 /。"],
    ["导入连接配置","Import connection settings","匯入連線設定"],
    ["服务器地址","Server address","伺服器位址"],
    ["网关访问令牌","Gateway access token","閘道存取權杖"],
    ["翻译模型","Translation model","翻譯模型"],
    ["本次使用的主播或游戏词库","Selected streamer or game glossaries","本次使用的主播或遊戲詞庫"],
    ["中文字幕字号","Subtitle text size","字幕字級"],
    ["默认距底部（%）","Default bottom margin (%)","預設底部距離（%）"],
    ["字幕外观预览","Subtitle preview","字幕外觀預覽"],
    ["锁定浮层位置","Lock window position","鎖定懸浮窗位置"],
    ["恢复默认位置","Reset position","還原預設位置"],
    ["保存设置","Save settings","儲存設定"],
    ["编辑词库","Edit glossary","編輯詞庫"],
    ["词条（JSON）","Entries (JSON)","詞條（JSON）"],
    ["读取","Load","讀取"],
    ["保存词库","Save glossary","儲存詞庫"],
    ["导出 JSON","Export JSON","匯出 JSON"],
    ["导入 CSV 或 JSON","Import CSV or JSON","匯入 CSV 或 JSON"],
    ["已恢复默认位置。","Position reset.","已還原預設位置。"],
    ["连接配置已填入，请点击保存设置。","Connection settings imported. Click Save settings.","連線設定已填入，請點擊儲存設定。"],
    ["已保存，当前悬浮窗已更新。","Saved. The subtitle window is updated.","已儲存，目前的懸浮窗已更新。"],
    ["已读取。","Loaded.","已讀取。"],
    ["已导入编辑区，检查后点击保存词库。","Imported into the editor. Review and save the glossary.","已匯入編輯區，確認後點擊儲存詞庫。"],
    ["请先在连接设置中导入服务器配置。","Import server settings in Connection settings first.","請先在連線設定中匯入伺服器設定。"],
    ["请在连接设置中允许访问服务器。","Allow server access in Connection settings.","請在連線設定中允許存取伺服器。"],
    ["需要允许连接这个服务器。","Allow access to this server.","需要允許連線至此伺服器。"],
    ["网关访问令牌不正确，请检查连接设置。","Invalid gateway token. Check Connection settings.","閘道存取權杖不正確，請檢查連線設定。"],
    ["词库名称已存在。","This glossary name already exists.","詞庫名稱已存在。"],
    ["访问令牌不正确","Invalid access token","存取權杖不正確"],
    ["服务器不接受当前配置","The server rejected these settings","伺服器不接受目前的設定"],
    ["服务器已有会话，稍后重试","Server is busy; retrying shortly","伺服器已有工作階段，稍後重試"],
    ["连接中断，正在重连","Disconnected; reconnecting","連線中斷，正在重新連線"],
    ["无法连接服务器，正在重试","Cannot reach server; retrying","無法連線至伺服器，正在重試"],
    ["音频处理积压，正在重新连接","Audio processing is behind; reconnecting","音訊處理延遲，正在重新連線"],
    ["翻译暂时跟不上，已跳过本句","Translation is behind; this sentence was skipped","翻譯暫時跟不上，已跳過本句"],
    ["本句翻译超时或连接失败","Translation timed out or the connection failed","本句翻譯逾時或連線失敗"],
    ["翻译接口中断了本句输出","The translation service interrupted this sentence","翻譯服務中斷了本句輸出"],
    ["本句译文超过输出长度限制","Translation exceeded the output limit","本句譯文超過輸出長度限制"],
    ["翻译接口未返回文字","The translation service returned no text","翻譯服務未傳回文字"],
    ["翻译接口未返回有效译文，请重试或切换翻译模型","No valid translation returned. Retry or change the model.","翻譯服務未傳回有效譯文，請重試或切換翻譯模型"],
    ["服务器请使用 wss://；SSH 隧道可使用 ws://127.0.0.1。","Use wss:// for the server, or ws://127.0.0.1 for an SSH tunnel.","伺服器請使用 wss://；SSH 通道可使用 ws://127.0.0.1。"]
  ];
  const messages=new Map(entries.map(([source,en,tw])=>[source,{en,"zh-TW":tw,"zh-CN":source}]));
  function detectLanguage(language){
    const value=(language??globalThis.chrome?.i18n?.getUILanguage?.()??globalThis.navigator?.language??"en").replaceAll("_","-").toLowerCase();
    if(value.startsWith("zh")){if(value.includes("-hans"))return "zh-CN";return /(?:hant|tw|hk|mo)(?:-|$)/.test(value)?"zh-TW":"zh-CN";}
    return "en";
  }
  function resolveLanguage(value){return ["zh-CN","zh-TW","en"].includes(value)?value:detectLanguage();}
  function t(text,language){
    const locale=resolveLanguage(language),word=messages.get(text);
    if(word)return word[locale];
    const trimmed=text.trim();
    if(trimmed!==text&&messages.has(trimmed))return text.replace(trimmed,messages.get(trimmed)[locale]);
    let match=/^(\d+) 条$/.exec(text);
    if(match)return locale==="en"?`${match[1]} entries`:locale==="zh-TW"?`${match[1]} 條`:text;
    match=/^已保存 (\d+) 条，当前会话已更新。$/.exec(text);
    if(match)return locale==="en"?`Saved ${match[1]} entries and applied to this session.`:locale==="zh-TW"?`已儲存 ${match[1]} 條，目前的工作階段已更新。`:text;
    match=/^(服务器返回|翻译接口返回) HTTP (\d+)$/.exec(text);
    if(match)return locale==="en"?`Server returned HTTP ${match[2]}`:locale==="zh-TW"?`伺服器傳回 HTTP ${match[2]}`:text;
    match=/^(主播|游戏|通用|主题|词库) · (.+)$/.exec(text);
    if(match)return `${t(match[1],locale)} · ${t(match[2],locale)}`;
    return text;
  }
  function watch(root,language){
    const texts=new WeakMap(),attributes=new WeakMap();
    const ignored=el=>el?.closest("style,script,textarea,.ja,.zh");
    function text(node){
      if(ignored(node.parentElement))return;
      const previous=texts.get(node),source=previous&&node.nodeValue===previous.output?previous.source:node.nodeValue;
      const output=t(source,language());texts.set(node,{source,output});if(node.nodeValue!==output)node.nodeValue=output;
    }
    function element(el){
      if(ignored(el))return;
      let memo=attributes.get(el);if(!memo){memo={};attributes.set(el,memo);}
      for(const key of ["title","aria-label","placeholder"]){
        const raw=el.getAttribute(key);if(raw===null)continue;
        const source=memo[key]&&raw===memo[key].output?memo[key].source:raw,output=t(source,language());
        memo[key]={source,output};if(raw!==output)el.setAttribute(key,output);
      }
    }
    function walk(node){
      if(node.nodeType===3){text(node);return;}
      if(node.nodeType===1){if(ignored(node))return;element(node);}
      for(const child of node.childNodes)walk(child);
    }
    const refresh=()=>{if(root.nodeType===9)root.documentElement.lang=resolveLanguage(language());walk(root);};
    const observer=new MutationObserver(records=>{for(const record of records){if(record.type==="childList")for(const node of record.addedNodes)walk(node);else if(record.type==="characterData")text(record.target);else element(record.target);}});
    observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["title","aria-label","placeholder"]});
    refresh();return {refresh};
  }
  globalThis.YumeHimeI18n={detectLanguage,resolveLanguage,t,watch};
})();
