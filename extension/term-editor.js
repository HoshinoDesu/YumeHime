(() => {
  const icon = globalThis.YumeHimeIcons.svg;
  const styles = ".term-editor{display:grid;gap:12px}.editor-toolbar{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.editor-tabs{display:inline-flex;padding:3px;gap:2px;background:var(--field,var(--page));border:1px solid var(--border);border-radius:9px}.editor-tabs button{padding:6px 10px;background:transparent;color:var(--muted);border:0;box-shadow:none}.editor-tabs button[aria-selected=true]{background:rgb(var(--surface-rgb,255 255 255));color:var(--text);box-shadow:0 1px 4px #00000010}.term-add{display:inline-flex;align-items:center;gap:5px}.term-cards{display:grid;gap:12px}.term-card{padding:14px;border:1px solid var(--border);border-radius:10px;background:var(--field,transparent)}.term-main{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 28px;gap:10px;align-items:start}.term-main label{min-width:0}.term-main input{width:100%;min-width:0}.term-remove{margin-top:24px;padding:5px;display:grid;place-items:center;width:28px;height:30px}.term-advanced{margin-top:12px}.term-advanced summary{font-size:12px;color:var(--muted);cursor:pointer}.term-advanced label{margin-top:14px;font-size:12px}.term-advanced textarea{min-height:70px;resize:vertical;font:inherit}.field-help{display:block;font-size:12px;line-height:1.6;color:var(--muted);margin:0;font-weight:400}.term-json{width:100%;min-height:260px;resize:vertical;font:12px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace}.term-json-panel .field-help{margin-bottom:10px}.editor-error{font-size:12px;line-height:1.6;color:var(--text)}.editor-error:empty{display:none}[hidden]{display:none!important}@media(prefers-color-scheme:dark){.term-editor{--surface-rgb:36 36 39}}@media(max-width:450px){.term-main{gap:7px;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 26px}.term-card{padding:11px}.term-main label{font-size:12px}}\n";
  let sequence = 0;
  class TermEditor {
    constructor(root) {
      this.root = root;
      this.terms = [];
      this.mode = "cards";
      const id = `terms-${++sequence}`;
      root.classList.add("term-editor");
      root.innerHTML = `<div class="editor-toolbar"><div class="editor-tabs" role="tablist" aria-label="词库编辑方式"><button type="button" role="tab" class="tab-cards" id="${id}-cards-tab" aria-controls="${id}-cards" aria-selected="true">词条卡片</button><button type="button" role="tab" class="tab-json" id="${id}-json-tab" aria-controls="${id}-json" aria-selected="false">JSON</button></div><button type="button" class="term-add secondary">${icon("plus")}<span>添加词条</span></button></div><div class="term-cards" id="${id}-cards" role="tabpanel" aria-labelledby="${id}-cards-tab"></div><div class="term-json-panel" id="${id}-json" role="tabpanel" aria-labelledby="${id}-json-tab" hidden><p class="field-help">JSON 使用词条数组，修改后切换到卡片或点击保存。</p><textarea class="term-json" spellcheck="false" aria-label="词条 JSON">[]</textarea></div><div class="editor-error" role="status"></div>`;
      const style = document.createElement("style"); style.textContent = styles; root.prepend(style);
      this.cards = root.querySelector(".term-cards");
      this.json = root.querySelector(".term-json");
      this.jsonPanel = root.querySelector(".term-json-panel");
      this.error = root.querySelector(".editor-error");
      root.querySelector(".tab-cards").onclick = () => this.switchMode("cards");
      root.querySelector(".tab-json").onclick = () => this.switchMode("json");
      const tabs = [...root.querySelectorAll('[role="tab"]')];
      tabs.forEach((tab, index) => tab.onkeydown = event => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        const next = tabs[1-index]; next.click(); next.focus();
      });
      root.querySelector(".term-add").onclick = () => {
        if (!this.switchMode("cards")) return;
        this.terms.push({source:"",target:"",aliases:[],variants:[],note:""});
        this.render(); this.cards.lastElementChild.querySelector("input").focus();
      };
    }
    get(validate = false) {
      return this.normalize(this.mode === "json" ? JSON.parse(this.json.value) : this.terms, validate);
    }
    normalize(terms, validate = false) {
      if (!Array.isArray(terms)) throw new Error("词条需要使用 JSON 数组，例如 [{\"source\":\"推し\",\"target\":\"推\"}]。");
      for (const term of terms) {
        if (!term || typeof term !== "object" || Array.isArray(term) ||
            (term.source !== undefined && typeof term.source !== "string") ||
            (term.target !== undefined && typeof term.target !== "string")) throw new Error("每条词条的日语词语和译文需要使用文字。");
        for (const key of ["aliases", "variants"]) if (term[key] !== undefined &&
            (!Array.isArray(term[key]) || term[key].some(value => typeof value !== "string"))) throw new Error("aliases 和 variants 需要使用文字数组。");
        if (validate && (!term.source?.trim() || !term.target?.trim())) throw new Error("请补全每条词条的日语词语和译文。");
      }
      return terms.map(term => ({...term, source:(term.source||"").trim(), target:(term.target||"").trim(), aliases:term.aliases||[], variants:term.variants||[], note:term.note||""}));
    }
    set(terms) {
      terms = this.normalize(terms);
      this.terms = structuredClone(terms);
      this.json.value = JSON.stringify(terms, null, 2);
      this.error.textContent = "";
      this.render();
    }
    switchMode(mode) {
      try {
        this.terms = this.get();
        if (mode === "cards") this.render();
        else this.json.value = JSON.stringify(this.terms, null, 2);
        this.mode = mode;
        this.cards.hidden = mode !== "cards";
        this.jsonPanel.hidden = mode !== "json";
        for (const input of this.cards.querySelectorAll("input,textarea")) input.disabled = mode !== "cards";
        this.root.querySelector(".tab-cards").setAttribute("aria-selected", String(mode === "cards"));
        this.root.querySelector(".tab-json").setAttribute("aria-selected", String(mode === "json"));
        this.error.textContent = "";
        return true;
      } catch (error) {
        this.error.textContent = error instanceof SyntaxError ? "JSON 格式有误，请检查引号、逗号和括号后再切换。" : error.message;
        return false;
      }
    }
    render() {
      this.cards.replaceChildren();
      if (!this.terms.length) {
        const empty = document.createElement("p"); empty.className = "field-help";
        empty.textContent = "这个词库还没有词条，点击“添加词条”开始。"; this.cards.append(empty);
      }
      this.terms.forEach((term, index) => {
        const card = document.createElement("div"); card.className = "term-card";
        const fields = document.createElement("div"); fields.className = "term-main";
        const field = (key, title, hint, multiline=false) => {
          const label=document.createElement("label"),text=document.createElement("span");text.textContent=title;label.append(text);
          const input=document.createElement(multiline?"textarea":"input");input.className=key;input.setAttribute("aria-label",title);
          input.required=["source","target"].includes(key);input.maxLength=input.required?100:500;
          input.value=["aliases","variants"].includes(key)?(term[key]||[]).join(" | "):(term[key]||"");
          input.disabled=this.mode==="json";
          input.oninput=()=>{term[key]=["aliases","variants"].includes(key)?input.value.split("|").map(value=>value.trim()).filter(Boolean):input.value;};
          label.append(input);
          if(hint){const help=document.createElement("small");help.className="field-help";help.textContent=hint;label.append(help);}
          return label;
        };
        fields.append(field("source","日语词语"),field("target","希望使用的译文"));
        const remove=document.createElement("button");remove.type="button";remove.className="term-remove secondary";
        remove.innerHTML=icon("trash");remove.title="删除这条词条";remove.setAttribute("aria-label",remove.title);
        remove.onclick=()=>{this.terms.splice(index,1);this.render();};fields.append(remove);card.append(fields);
        const details=document.createElement("details"),summary=document.createElement("summary");details.className="term-advanced";
        summary.textContent="读音、语境与识别纠错（可选）";details.append(summary);
        details.append(field("variants","参考读音与写法","只帮助翻译理解，不修改日文原文。多个写法用 | 分隔。"),field("note","语境提示","说明什么时候使用哪种译法，例如婉拒时把“大丈夫”译为“不用了”。",true),field("aliases","需要直接改正的识别错字","识别出这些写法时，直接替换成上面的日语词语。多个写法用 | 分隔。"));
        card.append(details);this.cards.append(card);
      });
    }
  }
  globalThis.YumeHimeTermEditor = TermEditor;
})();
