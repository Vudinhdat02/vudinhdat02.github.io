/*
 * Âm thanh tổng hợp bằng Web Audio, không cần file âm thanh.
 * thock = tiếng phím cơ, thud = tiếng đóng dấu, buzz = tiếng máy in kim.
 * Trình duyệt chỉ cho phát âm thanh sau lần click / bấm phím đầu tiên.
 */
let ctx = null;
let muted = false;

export const setMuted = (m) => { muted = m; };
export const isMuted = () => muted;

function ac() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx.state === 'running' ? ctx : null;
  } catch { return null; }
}

function noise(c, dur, freq, q, gain, t) {
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination); src.start(t);
}

function tone(c, type, f0, f1, dur, gain, t) {
  const o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}

export function thock(pitch = 1) {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const p = pitch * (0.92 + Math.random() * 0.16);
  noise(c, 0.035, 2600 * p, 0.9, 0.35, t);
  tone(c, 'sine', 210 * p, 70, 0.07, 0.22, t);
}

export function thud() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  noise(c, 0.08, 500, 0.7, 0.6, t);
  tone(c, 'sine', 120, 40, 0.16, 0.4, t);
}

export function buzz() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  for (let i = 0; i < 6; i++) noise(c, 0.012, 3800, 4, 0.12, t + i * 0.018);
}

export function whoosh() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  noise(c, 0.45, 900, 0.5, 0.25, t);
}

export function pop() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  tone(c, 'sine', 500, 1300, 0.12, 0.2, t);
  tone(c, 'triangle', 900, 1800, 0.1, 0.08, t + 0.05);
}

export function shutter() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  noise(c, 0.03, 4000, 1, 0.5, t);
  noise(c, 0.05, 1800, 1, 0.4, t + 0.08);
  tone(c, 'sine', 1400, 400, 0.25, 0.05, t + 0.15);
}

export function chime(up = true) {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  (up ? [523, 659, 784, 1046] : [784, 523]).forEach((f, i) => tone(c, 'triangle', f, f * 0.999, 0.5, 0.08, t + i * 0.12));
}

/* tiếng mưa / tiếng gõ phím nền cho "Góc học bài" (bật tắt được) */
let rainNode = null;
export function rain(on) {
  try {
    if (!on) { if (rainNode) { rainNode.g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); const n = rainNode; setTimeout(() => n.src.stop(), 1500); rainNode = null; } return; }
    const c = ac(); if (!c || rainNode) return;
    const len = c.sampleRate * 3;
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2 + (Math.random() < 0.0006 ? (Math.random() - 0.5) * 0.9 : 0); }
    }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.5, c.currentTime, 0.8);
    src.connect(lp).connect(g).connect(c.destination); src.start();
    rainNode = { src, g };
  } catch { /* trình duyệt không hỗ trợ */ }
}
