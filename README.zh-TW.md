<p align="center">
  <img src="assets/YumeHime.png" alt="YumeHime" width="640" />
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <strong>繁體中文</strong>
</p>

# YumeHime

一個專為日語直播設計的即時雙語字幕工具。

**瀏覽器擴充功能**負責擷取直播音訊並顯示字幕，**伺服器端**負責語音辨識（ASR），最後呼叫 **Gemini / OpenAI 相容介面**完成串流翻譯。

## 核心功能

- **邊說邊譯**：無需等主播整句說完，辨識出穩定前綴即開始串流翻譯，停頓後自動補全並依語境修正。
- **專屬詞庫**：內建 VTuber、二次元、遊戲等 360+ 常用詞條。支援在懸浮窗內隨時新增、刪除詞條及修正語音辨識錯字（Aliases），儲存後立即生效。
- **懸浮字幕窗**：支援自由拖曳、縮放和鎖定，調整字級、描邊與背景透明度；滑鼠移開後自動隱藏控制列，全螢幕觀看時會跟隨播放器。
- **金鑰安全**：大語言模型 API Key 與詞庫皆儲存在伺服器端，瀏覽器端僅透過獨立 Token 通訊，預設不留存任何音訊與完整字幕紀錄。

---

## 快速開始

### 1. 部署伺服器端

環境需求：Python 3.11+（建議使用 Ubuntu 24.04 ARM64）。

```bash
# 1. 安裝相依套件並下載預設語音模型（ReazonSpeech）
python3 -m venv .venv
.venv/bin/pip install -e .
.venv/bin/livesub prepare --engines reazon

# 2. 設定環境變數
cp .env.example .env
```

編輯 `.env` 檔案，填入你的翻譯 API 位址（`LIVESUB_API_BASE`，支援 OpenAI `/chat/completions` 格式）、API Key 和模型名稱（預設建議使用 `gemini-3.5-flash-lite`）。

同時在 `.env` 中設定 `LIVESUB_ACCESS_TOKEN`，瀏覽器連線時填入相同的權杖。接著啟動服務：

```bash
# 啟動服務
.venv/bin/uvicorn livesub.server:app --host 127.0.0.1 --port 8765 --ws-max-size 65536 --no-access-log
```

**使用 Docker 部署（選用）：**

模型下載完成後，也可以直接使用 Docker Compose 啟動。容器會自動掛載本機已下載的 `models` 和詞庫資料：

```bash
docker compose up -d --build
```

### 語音辨識模型設定

預設語音辨識模型為 **ReazonSpeech k2-v2**，使用 INT8 Encoder、FP32 Decoder 和 INT8 Joiner，由伺服器端 CPU 執行。首次啟動前，先下載模型和 Silero VAD：

```bash
.venv/bin/livesub prepare --engines reazon --models models
```

在伺服器端 `.env` 中設定：

```dotenv
LIVESUB_ENGINE=reazon
LIVESUB_THREADS=3
LIVESUB_MODELS=models
```

| 設定項目 | 用途 | 預設值 |
| --- | --- | --- |
| `LIVESUB_ENGINE` | 選擇語音辨識引擎 | `reazon` |
| `LIVESUB_THREADS` | 模型推論執行緒數；4 核心 ARM 可先使用 3 | `3` |
| `LIVESUB_MODELS` | 模型所在目錄，相對路徑以啟動服務時的工作目錄為準 | `models` |

下載後的預設目錄為：

```text
models/
├── silero_vad.onnx
└── reazon/
    ├── encoder-epoch-99-avg-1.int8.onnx
    ├── decoder-epoch-99-avg-1.onnx
    ├── joiner-epoch-99-avg-1.int8.onnx
    └── tokens.txt
```

模型會在服務啟動時載入。下載目錄應與伺服器設定的模型目錄一致；更換辨識引擎前，需先下載對應模型。

可選擇的引擎如下：

| `LIVESUB_ENGINE` | 模型 | 說明 |
| --- | --- | --- |
| `reazon` | ReazonSpeech k2-v2 INT8 | 預設日語辨識模型 |
| `parakeet` | Parakeet Japanese 0.6B INT8 | 目前使用 ONNX CTC 匯出模型 |
| `nemotron` | Nemotron 3.5 ASR Streaming 0.6B INT8 | 目前服務會為每段音訊建立新的辨識串流 |
| `sensevoice` | SenseVoice INT8 | 固定使用日語辨識 |
| `whisper` | whisper.cpp 多語言 base | 另需安裝 `whisper-cli` 並加入 `PATH`；現有 Docker 映像檔未包含此程式 |

例如切換至 Parakeet：

```bash
.venv/bin/livesub prepare --engines parakeet --models models
```

接著將 `.env` 中的 `LIVESUB_ENGINE` 改為 `parakeet`，重新啟動 Python 服務。若使用 Docker Compose，執行以下指令以套用新的環境變數：

```bash
docker compose up -d --force-recreate livesub
```

Compose 將主機的 `./models` 掛載為容器內的 `/app/models`，並在容器內固定使用此路徑；下載時仍將檔案放在專案的 `models/` 目錄。容器啟動時不會自動下載缺少的模型。

`LIVESUB_ENGINE` 控制音訊轉文字；`LIVESUB_MODEL` 控制文字翻譯。語音辨識模型名稱無需填入瀏覽器的「翻譯模型」設定。

### 2. 建立網路連線

伺服器預設僅監聽本機迴環位址（`127.0.0.1:8765`），建議使用以下兩種連線方式：

**方式 A：SSH 通道（無需網域即可使用）**

在本機電腦的終端機執行以下指令並保持連線：

```powershell
# 直接連線至伺服器
ssh -N -L 8765:127.0.0.1:8765 root@你的伺服器IP

# 若需透過跳板機中繼
ssh -J root@中繼伺服器IP -N -L 8765:127.0.0.1:8765 root@目標伺服器IP
```

**方式 B：WSS 網域連線**

若伺服器已有網域，可在 `.env` 中設定 `LIVESUB_DOMAIN`，並啟用 Compose 的 `wss` profile（由 Caddy 提供 HTTPS/WSS 連線）。瀏覽器擴充功能要求外部連線使用 `wss://`。

### 3. 安裝瀏覽器擴充功能

1. 在 Chrome 開啟 `chrome://extensions`，啟用右上角的**開發人員模式**。
2. 點擊**載入未封裝項目**，選擇專案中的 `extension` 目錄。
3. 開啟擴充功能設定頁，填入伺服器位址、閘道存取權杖（`LIVESUB_ACCESS_TOKEN`）和翻譯模型。SSH 通道使用 `ws://127.0.0.1:8765/ws`，網域連線使用 `wss://你的網域/ws`。儲存設定，並在提示時允許連線。
4. 開啟任意日語直播頁面，點擊擴充功能圖示以顯示**懸浮窗**，再點擊**開始翻譯**。

---

## 詞庫管理

詞條儲存在伺服器端 SQLite 中，瀏覽器只儲存選取的分組名稱。全域詞庫 `global` 一律啟用，主播、遊戲及其他分組可在懸浮窗的「詞庫」中勾選、新增和編輯。

**內建詞庫：**

| 分組 | 內容 | 詞條數 |
| --- | --- | ---: |
| `topic:VTuber` | 推、箱推、歌回、聯動、精華剪輯、SC 等 | 64 |
| `topic:动漫与二次元` | 動畫、聲優、角色、同人、周邊等 | 61 |
| `topic:日常生活` | 睡眠、做飯、購物、天氣、身體感受等 | 78 |
| `topic:口语与网络用语` | 回應、感嘆、網路梗及多義詞 | 85 |
| `topic:游戏` | 抽卡、保底、技能、音樂遊戲、連線遊戲等 | 76 |

完整的 364 條預設詞條見[內建詞庫檔案](src/livesub/presets/glossary-presets.json)。伺服器首次啟動時會自動建立這些分組，之後重新啟動不會覆寫已修改的詞條。檔案按分組整理，設定頁匯入 JSON 時，請使用單一分組的詞條陣列。上表中的分組 ID 使用實際儲存名稱。

**使用方式：**

1. 在懸浮窗開啟「詞庫」，勾選本次需要的分組。點擊「編輯」調整譯法，點擊「儲存到伺服器」後套用至目前的工作階段。
2. 批次編輯時，開啟擴充功能設定頁，在「編輯詞庫」填入分組名稱（例如 `global`、`streamer:arale` 或 `game:bandori`），點擊「讀取」。
3. 編輯 JSON，或匯入 CSV / JSON，再點擊「儲存詞庫」。匯入只填入編輯區；儲存時，編輯區中的整組詞條會寫入該分組。「匯出 JSON」可儲存目前編輯區的內容。

**JSON 格式範例：**

```json
[
  {
    "source": "大丈夫",
    "target": "沒事",
    "aliases": [],
    "variants": ["だいじょうぶ"],
    "note": "安慰時可譯為沒事；回應是否需要某物時可能表示不用了，請結合上下文。"
  }
]
```

**CSV 格式：** 包含 `source,target,aliases` 三欄，也支援 `variants` 和 `note`。多個別名或參考寫法以 `|` 分隔。

```csv
source,target,aliases,variants,note
切り抜き,精華剪輯,,きりぬき,主播直播片段剪輯
大丈夫,沒事,,だいじょうぶ,依語境可表示沒事或不用了
```

**欄位說明：**

| 欄位 | 用途 |
| --- | --- |
| `source` | 日語詞語，必填。 |
| `target` | 常用或指定譯法，必填。多義詞仍需結合語境。 |
| `aliases` | 明確需要修正的辨識寫法，會直接替換為 `source`；JSON 中為陣列。 |
| `variants` | 僅供翻譯參考的讀音、寫法或常見辨識形式，不改寫日文原文；JSON 中為陣列。 |
| `note` | 語境與用詞提示，不會原樣顯示為字幕。 |

相同 `source` 出現在多個分組時，會先載入內建主題詞庫，再載入 `global`，最後載入選取的主播、遊戲或其他自訂分組，後載入的詞條優先。

---

## 目錄結構

- `extension/`：Chrome MV3 瀏覽器擴充功能（音訊擷取、介面與詞庫管理）。
- `src/livesub/`：Python 伺服器核心（語音辨識、WebSocket 服務、翻譯轉接與詞庫）。

## 授權條款

本專案程式碼採用 [GPL-3.0](LICENSE) 授權。伺服器端下載的各類語音辨識模型依各自的開源授權條款使用。
