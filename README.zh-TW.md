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

接著產生用戶端設定並啟動服務：

```bash
# 產生瀏覽器連線設定 client.local.json（請下載至本機，勿提交至 Git）
.venv/bin/python scripts/configure-server.py

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
3. 開啟擴充功能設定頁，匯入第一步產生的 `client.local.json` 並儲存。
4. 開啟任意日語直播頁面，點擊擴充功能圖示以顯示**懸浮窗**，再點擊**開始翻譯**。

---

## 詞庫管理

詞庫儲存在伺服器端 SQLite 中，分為全域詞庫（`global`，始終啟用）和自訂分組（如 `streamer:arale`、`game:bandori`）。你可以在懸浮窗內直接新增、勾選或編輯詞條，也可以在擴充功能設定頁批次匯入／匯出 CSV 或 JSON。

**JSON 格式範例：**

```json
[{"source": "切り抜き", "target": "切片", "aliases": []}]
```

**CSV 格式**：包含 `source,target,aliases` 三欄，多個別名以 `|` 分隔。

**欄位說明：**

- `aliases`：語音辨識常見的同音錯字，在送交翻譯前會直接替換為正確的 `source`。
- `variants` / `note`：用來協助大語言模型理解語境的常見寫法或提示。

更多預設詞條與詳細用法，請參考[詞庫說明](https://www.google.com/search?q=docs/glossary.md)及 `examples/` 目錄。

---

**伺服器連線檢查：**

```bash
# 檢查翻譯 API 是否正常
.venv/bin/python scripts/probe-translation.py

# 按實際播放速度傳送 30 秒音訊，檢查辨識與翻譯輸出
.venv/bin/python scripts/replay-session.py audio/live.wav --seconds 30
```

---

## 目錄結構

- `extension/`：Chrome MV3 瀏覽器擴充功能（音訊擷取、介面與詞庫管理）。
- `src/livesub/`：Python 伺服器核心（語音辨識、WebSocket 服務、翻譯轉接與詞庫）。
- `scripts/`：伺服器設定產生、Whisper 編譯與連線檢查腳本。

## 授權條款

本專案程式碼採用 [GPL-3.0](https://www.google.com/search?q=LICENSE) 授權。伺服器端下載的各類語音辨識模型依各自的開源授權條款使用。
