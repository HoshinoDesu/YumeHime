(() => {
  if (globalThis.YumeHimeI18n) return;
  const entries = [
    ["日文临时字幕显示", "Provisional Japanese subtitles", "日文暫時字幕顯示"],
    ["立即显示（会随识别修正）", "Show immediately (may change)", "立即顯示（隨辨識修正）"],
    ["每 1 秒刷新临时字幕", "Refresh Japanese every 1 second", "每 1 秒更新暫時字幕"],
    ["每 2 秒刷新临时字幕", "Refresh Japanese every 2 seconds", "每 2 秒更新暫時字幕"],
    ["说完后显示完整双语字幕", "Show confirmed bilingual subtitles", "說完後顯示完整雙語字幕"],
    ["前三项只调整日文临时字幕的刷新频率，译文一返回就显示；最后一项会等待原文和译文确认。", "The first three options control provisional Japanese updates; translations appear as soon as available. The last waits for confirmed Japanese and translation.", "前三項只調整日文暫時字幕的更新頻率，譯文一傳回就顯示；最後一項會等待原文與譯文確認。"],
    ["获取模型列表", "Fetch model list", "取得模型清單"],
    ["选择云端翻译模型", "Select a translation model", "選擇雲端翻譯模型"],
    ["使用服务端当前 API 提供的模型，选择后点击保存设置。", "Models come from the API configured on your server. Save settings after choosing.", "使用伺服器目前 API 提供的模型，選擇後點擊儲存設定。"],
    ["正在获取云端模型列表…", "Fetching available models…", "正在取得雲端模型清單…"],
    ["模型列表已获取，选择后点击保存设置。", "Models loaded. Choose one and save settings.", "模型清單已取得，選擇後點擊儲存設定。"],
    ["云端 API 没有返回可用模型。", "The API returned no available models.", "雲端 API 未傳回可用模型。"],
    ["服务端尚未配置翻译 API Key。", "The server has no translation API key configured.", "伺服器尚未設定翻譯 API Key。"],
    ["无法获取云端模型列表，请检查服务端 API 配置或稍后重试。", "Could not load models. Check the server API settings or try again later.", "無法取得雲端模型清單，請檢查伺服器 API 設定或稍後再試。"],
    ["选择服务器词库", "Server glossary", "選擇伺服器詞庫"],
    ["全局词库（始终启用）", "Global glossary (always enabled)", "全域詞庫（一律啟用）"],
    ["刷新词库列表", "Refresh glossary list", "重新載入詞庫清單"],
    ["这里编辑服务器保存的词条；本次翻译启用哪些词库，请在悬浮窗中勾选。", "Edit entries stored on the server here. Select which glossaries to use in the subtitle window.", "這裡編輯伺服器儲存的詞條；本次翻譯啟用哪些詞庫，請在懸浮窗中勾選。"],
    ["新建词库", "Create glossary", "新增詞庫"],
    ["已读取服务器词库。修改后点击保存词库。", "Glossary loaded. Save the glossary after editing.", "已讀取伺服器詞庫，修改後點擊儲存詞庫。"],
    ["请先填写并保存连接设置，再读取服务器词库。", "Fill in and save connection settings before loading glossaries.", "請先填寫並儲存連線設定，再讀取伺服器詞庫。"],
    ["词库编辑方式", "Glossary editor mode", "詞庫編輯方式"],
    ["词条卡片", "Entry cards", "詞條卡片"],
    ["JSON 使用词条数组，修改后切换到卡片或点击保存。", "Use a JSON array of entries. Switch to cards or save when finished.", "JSON 使用詞條陣列，修改後切換至卡片或點擊儲存。"],
    ["词条 JSON", "Glossary JSON", "詞條 JSON"],
    ["希望使用的译文", "Preferred translation", "希望使用的譯文"],
    ["删除这条词条", "Delete this entry", "刪除這條詞條"],
    ["读音、语境与识别纠错（可选）", "Readings, context and ASR corrections (optional)", "讀音、語境與辨識修正（選填）"],
    ["参考读音与写法", "Alternative readings and spellings", "參考讀音與寫法"],
    ["只帮助翻译理解，不修改日文原文。多个写法用 | 分隔。", "Translation context only; does not change Japanese subtitles. Separate forms with |.", "僅協助翻譯理解，不修改日文原文。多個寫法以 | 分隔。"],
    ["语境提示", "Context guidance", "語境提示"],
    ["说明什么时候使用哪种译法，例如婉拒时把“大丈夫”译为“不用了”。", "Explain when to use a translation; for example, 大丈夫 can politely decline an offer.", "說明何時使用哪種譯法，例如婉拒時將「大丈夫」譯為「不用了」。"],
    ["需要直接改正的识别错字", "ASR text to replace directly", "需要直接修正的辨識錯字"],
    ["识别出这些写法时，直接替换成上面的日语词语。多个写法用 | 分隔。", "Replace these recognized forms with the Japanese term above. Separate forms with |.", "辨識出這些寫法時，直接替換成上方的日語詞語。多個寫法以 | 分隔。"],
    ["这个词库还没有词条，点击“添加词条”开始。", "This glossary is empty. Click Add entry to get started.", "此詞庫尚無詞條，點擊「新增詞條」開始。"],
    ["JSON 格式有误，请检查引号、逗号和括号后再切换。", "Invalid JSON. Check quotes, commas and brackets before switching.", "JSON 格式有誤，請檢查引號、逗號與括號後再切換。"],
    ["词条需要使用 JSON 数组，例如 [{\"source\":\"推し\",\"target\":\"推\"}]。", "Use a JSON array, for example [{\"source\":\"推し\",\"target\":\"推\"}].", "詞條需要使用 JSON 陣列，例如 [{\"source\":\"推し\",\"target\":\"推\"}]。"],
    ["每条词条的日语词语和译文需要使用文字。", "Each entry must use text for its Japanese term and translation.", "每條詞條的日語詞語與譯文需要使用文字。"],
    ["aliases 和 variants 需要使用文字数组。", "aliases and variants must be arrays of strings.", "aliases 與 variants 需要使用文字陣列。"],
    ["请补全每条词条的日语词语和译文。", "Fill in the Japanese term and translation for every entry.", "請補齊每條詞條的日語詞語與譯文。"],

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
