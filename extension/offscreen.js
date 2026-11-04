let stream, audio, monitor, socket, reconnect, handshake, heartbeat, pong, config, worklet;
let running = false, paused = false, ready = false, generation = 0;
function clearConnectionTimers() {
  clearTimeout(handshake);
  clearInterval(heartbeat);
  clearTimeout(pong);
}
function state(message = "", connected = false) {
  chrome.runtime.sendMessage({ to: "background", type: "state", state: { running, paused, connected, message } }).catch(() => {});
}
function event(value) {
  chrome.runtime.sendMessage({ to: "background", type: "event", event: value }).catch(() => {});
}
function connect(current) {
  if (!running || paused || current !== generation) return;
  clearTimeout(reconnect);
  clearConnectionTimers();
  ready = false;
  state("正在连接服务器");
  const connection = new WebSocket(config.url);
  socket = connection;
  let failure = "";
  let notice = false;
  handshake = setTimeout(() => {
    failure = "连接服务器超时，正在重试";
    state(failure);
    connection.close(4002, "Server ready timeout");
  }, 10000);
  connection.onopen = () => {
    if (current !== generation || socket !== connection) return;
    connection.send(JSON.stringify({ type: "start", token: config.token,
      model: config.model, title:config.title||"", target: config.targetLanguage || "zh-CN", profiles: config.profiles.split(",").map(s => s.trim()).filter(Boolean) }));
  };
  connection.onmessage = message => {
    if (current !== generation || socket !== connection) return;
    const data = JSON.parse(message.data);
    if (data.type === "pong") { clearTimeout(pong); return; }
    if (data.type === "ready") {
      clearTimeout(handshake);
      ready = true;
      heartbeat = setInterval(() => {
        connection.send(JSON.stringify({ type: "ping" }));
        pong = setTimeout(() => {
          failure = "连接响应超时，正在重连";
          ready = false;
          state(failure);
          connection.close(4003, "Heartbeat timeout");
        }, 8000);
      }, 15000);
      state(data.translation_enabled ? "翻译中" : "显示日文原文", true);
    }
    if (data.type === "translation_error" || data.type === "status") { notice = true; state(data.message, true); }
    if (notice && data.type === "subtitle" && data.kind === "translation" && data.final) { notice = false; state("翻译中", true); }
    event(data);
  };
  connection.onclose = async close => {
    if (current !== generation || socket !== connection || !running || paused) return;
    clearConnectionTimers();
    ready = false;
    if ([4400, 4401].includes(close.code)) {
      await stop();
      state(close.code === 4401 ? "访问令牌不正确" : "服务器不接受当前配置");
      return;
    }
    console.warn("YumeHime connection closed", { code: close.code, reason: close.reason });
    state(close.code === 4409 ? "服务器已有会话，稍后重试" : failure || (close.code === 4000 ? "音频上传积压，正在重连" : "连接中断，正在重连"));
    reconnect = setTimeout(() => connect(current), close.code === 4409 ? 1000 : 2000);
  };
  connection.onerror = () => { if (current === generation && socket === connection) state("无法连接服务器，正在重试"); };
}
async function stop() {
  running = false;
  paused = false;
  ready = false;
  generation++;
  clearTimeout(reconnect);
  clearConnectionTimers();
  socket?.close();
  worklet?.disconnect();
  stream?.getTracks().forEach(track => track.stop());
  await Promise.all([audio?.close(), monitor?.close()]);
  stream = audio = monitor = socket = worklet = null;
  state();
}
async function pause() {
  paused = true;
  ready = false;
  generation++;
  clearTimeout(reconnect);
  clearConnectionTimers();
  socket?.close();
  socket = null;
  await audio?.suspend();
  state("已暂停");
  return { ok: true };
}
async function resume(message) {
  config = message.settings;
  paused = false;
  await audio.resume();
  connect(generation);
  return { ok: true };
}
function refreshProfiles() {
  if (ready && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "profiles", profiles: config.profiles.split(",").map(s => s.trim()).filter(Boolean) }));
  return { ok: true };
}
async function configure(message) {
  const previous = config;
  config = {...message.settings,title:previous?.title||""};
  if (!running || paused) return { ok: true };
  if (["url", "token", "model", "targetLanguage"].some(key => previous[key] !== config[key])) {
    generation++; ready = false; clearTimeout(reconnect); socket?.close(); connect(generation);
  } else refreshProfiles();
  return { ok: true };
}
async function start(message) {
  await stop();
  config = message.settings;
  const current = generation;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { mandatory: {
      chromeMediaSource: "tab", chromeMediaSourceId: message.streamId
    } }, video: false });
    monitor = new AudioContext();
    monitor.createMediaStreamSource(stream).connect(monitor.destination);
    audio = new AudioContext({ sampleRate: 16000 });
    await audio.audioWorklet.addModule(chrome.runtime.getURL("pcm-worklet.js"));
    worklet = new AudioWorkletNode(audio, "pcm16");
    audio.createMediaStreamSource(stream).connect(worklet);
    worklet.connect(audio.destination);
    worklet.port.onmessage = ({ data }) => {
      if (ready && socket?.readyState === WebSocket.OPEN) {
        if (socket.bufferedAmount > 64000) { ready = false; socket.close(4000, "Audio upload delayed"); }
        else socket.send(data);
      }
    };
    stream.getAudioTracks()[0].onended = () => stop();
    await Promise.all([audio.resume(), monitor.resume()]);
    running = true;
    connect(current);
    return { ok: true };
  } catch (error) {
    await stop();
    state(error.message);
    return { error: error.message };
  }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.to !== "offscreen") return;
  const actions = { start: () => start(message), stop: () => stop().then(() => ({ ok: true })), pause, resume: () => resume(message), configure: () => configure(message), refreshProfiles };
  if (!actions[message.type]) return;
  const task = Promise.resolve().then(actions[message.type]);
  task.then(respond).catch(error => respond({ error: error.message }));
  return true;
});
