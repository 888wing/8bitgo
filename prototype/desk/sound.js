// 用 WebAudio 即場合成的音效：印章、翻紙、筆、對白嗶聲。全部很短，很輕。

let ctx = null;
let muted = false;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function setMuted(value) {
  muted = value;
}

export const isMuted = () => muted;

function ready() {
  return ctx && !muted && ctx.state === 'running';
}

function noise(seconds) {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

function envelope(node, peak, attack, release) {
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  node.connect(g).connect(ctx.destination);
  return g;
}

export function blip(freq = 420) {
  if (!ready()) return;
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.value = freq;
  envelope(o, 0.025, 0.003, 0.035);
  o.start();
  o.stop(ctx.currentTime + 0.05);
}

// 印章：低頻的一下悶響，加一點木頭的雜音。
export function thud() {
  if (!ready()) return;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.12);
  envelope(o, 0.6, 0.002, 0.16);
  o.start();
  o.stop(ctx.currentTime + 0.2);
  const n = noise(0.08);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 700;
  n.connect(f);
  envelope(f, 0.35, 0.001, 0.07);
  n.start();
}

export function paper() {
  if (!ready()) return;
  const n = noise(0.16);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 2400;
  f.Q.value = 0.8;
  n.connect(f);
  envelope(f, 0.12, 0.01, 0.13);
  n.start();
}

export function pen() {
  if (!ready()) return;
  const n = noise(0.04);
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 3500;
  n.connect(f);
  envelope(f, 0.05, 0.004, 0.03);
  n.start();
}

export function clack() {
  if (!ready()) return;
  const n = noise(0.05);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 900;
  n.connect(f);
  envelope(f, 0.3, 0.001, 0.05);
  n.start();
}

export function found() {
  if (!ready()) return;
  [660, 990].forEach((freq, i) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.07;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.3);
  });
}
