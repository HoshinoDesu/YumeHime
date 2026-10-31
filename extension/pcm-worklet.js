class PCM16 extends AudioWorkletProcessor {
  constructor() {
    super();
    if (sampleRate !== 16000) throw new Error("Expected a 16 kHz audio context");
    this.buffer = new Int16Array(1600);
    this.offset = 0;
  }
  process(inputs) {
    const channels = inputs[0];
    if (!channels.length) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let sample = 0;
      for (const channel of channels) sample += channel[i];
      sample = Math.max(-1, Math.min(1, sample / channels.length));
      this.buffer[this.offset++] = Math.round(sample * (sample < 0 ? 32768 : 32767));
      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
        this.buffer = new Int16Array(1600);
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor("pcm16", PCM16);
