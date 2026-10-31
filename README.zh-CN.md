<p align="center">
  <img src="assets/YumeHime.png" alt="YumeHime" width="640" />
</p>

<p align="center">
  <a href="README.md">English</a> · <strong>简体中文</strong> · <a href="README.zh-TW.md">繁體中文</a>
</p>

# YumeHime

一个专为日语直播设计的实时双语字幕工具。

**浏览器插件**负责抓取直播音频并渲染字幕，**服务端** 负责语音识别（ASR），最后调用 **Gemini / OpenAI 兼容接口**完成流式翻译。

## 核心特性

- **边说边译**：无需等主播整句说完，识别出稳定前缀即刻开始流式翻译，停顿后自动补全并修正语境。
- **专属词库**：内置 VTuber、二次元、游戏等 360+ 常用词条。支持在悬浮窗内随时增删词条、修正语音识别错字（Aliases），保存即生效。
- **无感悬浮窗**：支持自由拖拽、缩放和锁定，调节字号、描边与背景透明度；鼠标移开后自动隐藏控制栏，全屏观看时自动跟随播放器。
- **密钥安全**：大模型 API Key 与词库均保存在服务端，浏览器端仅通过独立 Token 通信，默认不留存任何音频与完整字幕记录。

---

## 快速开始

### 1. 部署服务端

环境要求：Python 3.11+（推荐 Ubuntu 24.04 ARM64）。

```bash
# 1. 安装依赖与下载默认语音模型 (ReazonSpeech)
python3 -m venv .venv
.venv/bin/pip install -e .
.venv/bin/livesub prepare --engines reazon

# 2. 配置环境变量
cp .env.example .env

```

编辑 `.env` 文件，填入你的翻译接口地址（`LIVESUB_API_BASE`，支持 OpenAI `/chat/completions` 格式）、API Key 和模型名称（默认推荐 `gemini-3.5-flash-lite`）。

接着生成客户端配置并启动服务：

```bash
# 生成浏览器连接配置 client.local.json（请下载到本地，勿提交至 Git）
.venv/bin/python scripts/configure-server.py

# 启动服务
.venv/bin/uvicorn livesub.server:app --host 127.0.0.1 --port 8765 --ws-max-size 65536 --no-access-log

```

**使用 Docker 部署（可选）：**
模型下载完成后，也可以直接用 Docker Compose 启动（容器会自动挂载本地已下载的 `models` 和词库数据）：

```bash
docker compose up -d --build

```

### 语音识别模型配置

默认语音识别模型为 **ReazonSpeech k2-v2**，使用 INT8 Encoder、FP32 Decoder 和 INT8 Joiner，由服务端 CPU 运行。首次启动前先下载模型和 Silero VAD：

```bash
.venv/bin/livesub prepare --engines reazon --models models
```

在服务端 `.env` 中设置：

```dotenv
LIVESUB_ENGINE=reazon
LIVESUB_THREADS=3
LIVESUB_MODELS=models
```

| 配置项 | 作用 | 默认值 |
| --- | --- | --- |
| `LIVESUB_ENGINE` | 选择语音识别引擎 | `reazon` |
| `LIVESUB_THREADS` | 模型推理线程数；4 核 ARM 可先使用 3 | `3` |
| `LIVESUB_MODELS` | 模型所在目录，相对路径以启动服务时的工作目录为准 | `models` |

下载后的默认目录为：

```text
models/
├── silero_vad.onnx
└── reazon/
    ├── encoder-epoch-99-avg-1.int8.onnx
    ├── decoder-epoch-99-avg-1.onnx
    ├── joiner-epoch-99-avg-1.int8.onnx
    └── tokens.txt
```

模型在启动时加载。下载目录应与服务端配置的模型目录一致；更换识别引擎前需要先下载对应模型。

可选择的引擎如下：

| `LIVESUB_ENGINE` | 模型 | 说明 |
| --- | --- | --- |
| `reazon` | ReazonSpeech k2-v2 INT8 | 默认日语识别模型 |
| `parakeet` | Parakeet Japanese 0.6B INT8 | 当前使用 ONNX CTC 导出 |
| `nemotron` | Nemotron 3.5 ASR Streaming 0.6B INT8 | 当前服务每段音频新建识别流 |
| `sensevoice` | SenseVoice INT8 | 固定使用日语识别 |
| `whisper` | whisper.cpp 多语种 base | 还需安装 `whisper-cli` 并加入 `PATH`；现有 Docker 镜像未包含此程序 |

例如切换到 Parakeet：

```bash
.venv/bin/livesub prepare --engines parakeet --models models
```

然后把 `.env` 中的 `LIVESUB_ENGINE` 改为 `parakeet`，重新启动 Python 服务。使用 Docker Compose 时，执行以下命令使新环境变量生效：

```bash
docker compose up -d --force-recreate livesub
```

Compose 将宿主机的 `./models` 挂载为容器的 `/app/models`，并在容器内固定使用该路径；下载时仍把文件放在项目的 `models/` 目录。容器启动时不会自动下载缺失的模型。

`LIVESUB_ENGINE` 控制音频转文字；`LIVESUB_MODEL` 控制文字翻译。语音识别模型名称无需填入浏览器的“翻译模型”设置。

### 2. 建立网络连接

服务端默认仅监听本地回环地址（`127.0.0.1:8765`），推荐以下两种连接方式：

* **方式 A：SSH 隧道（无需域名，开箱即用）**
在本地电脑终端运行以下命令并保持连接：
```powershell
# 直连服务器
ssh -N -L 8765:127.0.0.1:8765 root@你的服务器IP

# 若需通过跳板机中继
ssh -J root@中继服务器IP -N -L 8765:127.0.0.1:8765 root@目标服务器IP

```


* **方式 B：WSS 域名连接**
如果服务器已有域名，可在 `.env` 中配置 `LIVESUB_DOMAIN` 并启用 Compose 的 `wss` profile（基于 Caddy 提供 HTTPS/WSS 接入）。浏览器扩展强制要求外部连接使用 `wss://`。

### 3. 安装浏览器扩展

1. 打开 Chrome 访问 `chrome://extensions`，开启右上角**开发者模式**。
2. 点击**加载已解压的扩展程序**，选择项目中的 `extension` 目录。
3. 打开扩展设置页，导入第一步生成的 `client.local.json` 并保存。
4. 打开任意日语直播页面，点击扩展图标呼出**悬浮窗**，点击**开始翻译**即可。

---

## 词库管理

词库存储在服务端 SQLite 中，分为全局词库（`global`，始终启用）和自定义分组（如 `streamer:arale`、`game:bandori`）。你可以在悬浮窗内直接新建、勾选或编辑词条，也可以在扩展设置页批量导入/导出 CSV 或 JSON。

* **JSON 格式示例**：
```json
[{"source": "切り抜き", "target": "切片", "aliases": []}]

```


* **CSV 格式**：包含 `source,target,aliases` 三列，多个别名用 `|` 分隔。
* **字段说明**：
* `aliases`：语音识别常见的同音错字，在送交翻译前会被直接替换为正确的 `source`。
* `variants` / `note`：用于辅助大模型理解语境的常见写法或提示。



更多预置词条与详细用法请参考 [词库说明](https://www.google.com/search?q=docs/glossary.md) 及 `examples/` 目录。

---

**服务端连通性自检：**

```bash
# 检查翻译接口是否正常
.venv/bin/python scripts/probe-translation.py

# 按真实播放速度发送 30 秒音频，端到端测试识别与翻译输出
.venv/bin/python scripts/replay-session.py audio/live.wav --seconds 30

```

---

## 目录结构

* `extension/`：Chrome MV3 浏览器扩展（音频采集、UI 与词库管理）
* `src/livesub/`：Python 服务端核心（ASR 识别、WebSocket 服务、翻译适配与词库）
* `scripts/`：服务端配置生成、Whisper 编译与连通性测试脚本
* `docs/`：设计方案、词库文档与开发记录

## 许可证

本项目代码基于 [GPL-3.0](https://www.google.com/search?q=LICENSE) 开源。服务端下载的各类语音识别模型遵循其各自的开源许可证。
