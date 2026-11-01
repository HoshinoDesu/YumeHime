<p align="center">
  <img src="assets/YumeHime.png" alt="YumeHime" width="640" />
</p>

<p align="center">
  <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a>
</p>

# YumeHime

A real-time bilingual subtitle tool designed for Japanese livestreams.

The **browser extension** captures livestream audio and displays subtitles. The **server** handles speech recognition (ASR), then uses **Gemini or an OpenAI-compatible API** for streaming translation.

## Features

- **Translate as the speaker talks:** Translation starts when recognition produces a stable prefix. Subtitles are completed and corrected as more speech becomes available.
- **Editable glossaries:** Includes 360+ terms for VTubers, anime, games, and more. Add or remove entries and correct recognition errors with aliases directly in the floating window. Changes apply when saved.
- **Floating subtitles:** Drag, resize, or lock the window, and adjust text size, outlines, and background opacity. Controls hide automatically when idle, and the window follows the player into fullscreen.
- **Server-side credentials:** The translation API key and glossaries stay on the server. The browser uses a separate access token. Audio and complete subtitle transcripts are not retained by default.

---

## Quick Start

### 1. Deploy the Server

Requirements: Python 3.11+; Ubuntu 24.04 ARM64 is recommended.

```bash
# 1. Install dependencies and download the default ASR model (ReazonSpeech)
python3 -m venv .venv
.venv/bin/pip install -e .
.venv/bin/livesub prepare --engines reazon

# 2. Set up environment variables
cp .env.example .env
```

Edit `.env` and enter your translation API base URL (`LIVESUB_API_BASE`, supporting the OpenAI `/chat/completions` format), API key, and model name. The default recommended translation model is `gemini-3.5-flash-lite`.

Next, generate the client configuration and start the server:

```bash
# Generate client.local.json for the browser; copy it to your computer and keep it out of Git
.venv/bin/python scripts/configure-server.py

# Start the server
.venv/bin/uvicorn livesub.server:app --host 127.0.0.1 --port 8765 --ws-max-size 65536 --no-access-log
```

**Docker deployment (optional):**

After downloading the models, you can also start the server with Docker Compose. The container mounts the downloaded `models` directory and persistent glossary data:

```bash
docker compose up -d --build
```

### ASR Model Configuration

The default speech recognition model is **ReazonSpeech k2-v2**, using an INT8 encoder, FP32 decoder, and INT8 joiner on the server CPU. Download the model and Silero VAD before starting the server:

```bash
.venv/bin/livesub prepare --engines reazon --models models
```

Set these variables in the server's `.env` file:

```dotenv
LIVESUB_ENGINE=reazon
LIVESUB_THREADS=3
LIVESUB_MODELS=models
```

| Variable | Purpose | Default |
| --- | --- | --- |
| `LIVESUB_ENGINE` | Selects the speech recognition engine | `reazon` |
| `LIVESUB_THREADS` | Number of inference threads; start with 3 on a 4-core ARM server | `3` |
| `LIVESUB_MODELS` | Model directory; relative paths resolve from the server's working directory | `models` |

The default downloaded directory layout is:

```text
models/
├── silero_vad.onnx
└── reazon/
    ├── encoder-epoch-99-avg-1.int8.onnx
    ├── decoder-epoch-99-avg-1.onnx
    ├── joiner-epoch-99-avg-1.int8.onnx
    └── tokens.txt
```

Models load when the server starts. The download location must match the configured model directory. Download the corresponding model before switching engines.

Available engines:

| `LIVESUB_ENGINE` | Model | Notes |
| --- | --- | --- |
| `reazon` | ReazonSpeech k2-v2 INT8 | Default Japanese ASR model |
| `parakeet` | Parakeet Japanese 0.6B INT8 | Uses the ONNX CTC export |
| `nemotron` | Nemotron 3.5 ASR Streaming 0.6B INT8 | The current server creates a new recognition stream for each audio segment |
| `sensevoice` | SenseVoice INT8 | Recognition is set to Japanese |
| `whisper` | whisper.cpp multilingual base | Requires `whisper-cli` on `PATH`; the current Docker image does not include it |

For example, to switch to Parakeet:

```bash
.venv/bin/livesub prepare --engines parakeet --models models
```

Change `LIVESUB_ENGINE` to `parakeet` in `.env`, then restart the Python server. With Docker Compose, recreate the service to apply the new environment variables:

```bash
docker compose up -d --force-recreate livesub
```

Compose mounts the host's `./models` directory at `/app/models` and uses that fixed path inside the container. Download the files into the project's `models/` directory on the host. The container does not automatically download missing models at startup.

`LIVESUB_ENGINE` controls audio transcription; `LIVESUB_MODEL` controls text translation. Do not enter the ASR model name in the browser's **Translation model** setting.

### 2. Connect to the Server

The server listens on the loopback address (`127.0.0.1:8765`) by default. Two connection options are available:

**Option A: SSH tunnel — no domain required**

Run one of these commands on your computer and keep the connection open:

```powershell
# Connect directly
ssh -N -L 8765:127.0.0.1:8765 root@your-server-ip

# Connect through a jump host
ssh -J root@jump-host-ip -N -L 8765:127.0.0.1:8765 root@target-server-ip
```

**Option B: WSS with a domain**

If your server has a domain, set `LIVESUB_DOMAIN` in `.env` and enable the Compose `wss` profile. Caddy provides HTTPS/WSS access. The browser extension requires `wss://` for external connections.

### 3. Install the Browser Extension

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Click **Load unpacked** and select the project's `extension` directory.
3. Open the extension settings, import the `client.local.json` generated in step 1, and save.
4. Open a Japanese livestream, click the extension icon to show the **subtitle window**, then click **Start translation**.

---

## Glossary Management

Entries are stored in SQLite on the server. The browser stores only the selected group names. The global glossary (`global`) is always enabled. Select, create, and edit streamer, game, and other groups under **Glossary** in the floating window.

**Built-in glossaries:**

| Group | Contents | Entries |
| --- | --- | ---: |
| `topic:VTuber` | Favorites, group fandom, singing streams, collaborations, clips, Super Chats | 64 |
| `topic:动漫与二次元` | Anime, voice actors, characters, fan works, merchandise | 61 |
| `topic:日常生活` | Sleep, cooking, shopping, weather, physical sensations | 78 |
| `topic:口语与网络用语` | Responses, exclamations, internet slang, context-dependent expressions | 85 |
| `topic:游戏` | Gacha, pity systems, abilities, rhythm games, multiplayer | 76 |

All 364 preset entries are available in the [built-in glossary file](src/livesub/presets/glossary-presets.json). These groups are created automatically on first server startup; later restarts preserve your edits. The file is organized by group. When importing JSON in settings, use the entry array for a single group. Group IDs above match their stored names.

**Usage:**

1. Open **Glossary** in the floating window and select the groups you need. Click **Edit** to change entries, then **Save to server** to apply them to the current session.
2. For bulk editing, open extension settings, enter a group name under **Edit glossary** (such as `global`, `streamer:arale`, or `game:bandori`), and click **Load**.
3. Edit the JSON or import a CSV / JSON file, then click **Save glossary**. Importing fills the editor; saving writes the entire editor contents to that group. **Export JSON** saves the current editor contents to a file.

**JSON example:**

```json
[
  {
    "source": "大丈夫",
    "target": "没事",
    "aliases": [],
    "variants": ["だいじょうぶ"],
    "note": "Can reassure someone that things are fine, or politely decline an offer; choose from context."
  }
]
```

**CSV format:** Include `source,target,aliases`. The optional `variants` and `note` columns are also supported. Separate multiple aliases or variants with `|`.

```csv
source,target,aliases,variants,note
切り抜き,切片,,きりぬき,An edited clip from a stream
大丈夫,没事,,だいじょうぶ,May reassure someone or decline an offer; choose from context
```

**Fields:**

| Field | Purpose |
| --- | --- |
| `source` | Japanese term. Required. |
| `target` | Common or preferred translation. Required. Ambiguous expressions still depend on context. |
| `aliases` | Recognition errors that should be replaced directly with `source`. A JSON array. |
| `variants` | Readings, alternative forms, or recognition variants provided only as translation context. They do not change the Japanese transcript. A JSON array. |
| `note` | Context and wording guidance; not displayed verbatim as subtitles. |

If the same `source` appears in multiple groups, built-in topic groups load first, followed by `global`, then the selected streamer, game, or other custom groups. Later entries take priority.

---

**Server connectivity checks:**

```bash
# Check the translation API
.venv/bin/python scripts/probe-translation.py

# Send 30 seconds of audio at playback speed to check recognition and translation
.venv/bin/python scripts/replay-session.py audio/live.wav --seconds 30
```

---

## Project Structure

- `extension/`: Chrome MV3 extension for audio capture, UI, and glossary management.
- `src/livesub/`: Python server for ASR, WebSocket connections, translation, and glossaries.
- `scripts/`: Server configuration, Whisper build, and connectivity check scripts.

## License

The project code is released under [GPL-3.0](https://www.google.com/search?q=LICENSE). Downloaded speech recognition models follow their respective licenses.
