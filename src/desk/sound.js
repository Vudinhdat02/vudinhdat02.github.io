/*
 * Âm thanh tổng hợp bằng Web Audio, không cần file âm thanh.
 * Tiếng đồ dùng học tập: bút chì gõ giấy, lật trang, đóng dấu, bút viết sột soạt.
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

/* mọi âm thanh đi qua một lớp lọc chung: cắt bớt tiếng chói ở dải cao, nén nhẹ cho êm */
let master = null;
function out(c) {
  if (master && master.context === c) return master;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.5;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 4;
  const g = c.createGain(); g.gain.value = 0.8;
  lp.connect(comp).connect(g).connect(c.destination);
  master = lp; return lp;
}

/* tiếng xào xạc ngắn (giấy, bút chì), có nhập và tắt mềm để không bị "tạch" */
function noise(c, dur, freq, q, gain, t, type = 'bandpass', sweepTo = 0) {
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  const atk = Math.max(1, Math.floor(n * 0.15));
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (i < atk ? i / atk : Math.pow(1 - (i - atk) / (n - atk), 2));
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = c.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(out(c)); src.start(t);
}

/* tiếng gõ gỗ / chuông nhỏ: lên tiếng mềm rồi tắt dần */
function tone(c, type, f0, f1, dur, gain, t) {
  const o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out(c)); o.start(t); o.stop(t + dur + 0.02);
}

/* rê chuột qua nhiều thứ liền nhau thì không phát dồn dập */
let lastTap = 0;

/** Chạm nhẹ: đầu bút chì gõ lên giấy. */
export function thock(pitch = 1) {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  if (t - lastTap < 0.07) return;
  lastTap = t;
  const p = Math.min(1.6, Math.max(0.7, pitch)) * (0.95 + Math.random() * 0.1);
  noise(c, 0.028, 1500 * p, 0.8, 0.07, t, 'bandpass');
  tone(c, 'sine', 520 * p, 380 * p, 0.06, 0.035, t);
}

/** Đóng dấu / gập sách: tiếng bịch êm. */
export function thud() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  noise(c, 0.09, 380, 0.7, 0.18, t, 'lowpass');
  tone(c, 'sine', 140, 60, 0.18, 0.14, t);
}

/** Bút chì viết sột soạt (thay tiếng máy in). */
export function buzz() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  for (let i = 0; i < 3; i++) noise(c, 0.05, 2400 + Math.random() * 600, 1.2, 0.035, t + i * 0.045, 'bandpass');
}

/** Lật trang giấy. */
export function whoosh() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  noise(c, 0.32, 500, 0.6, 0.11, t, 'bandpass', 2200);
  noise(c, 0.08, 1800, 0.8, 0.05, t + 0.24, 'bandpass');
}

/** Mở nắp bút / bật nút: tiếng "póc" nhỏ. */
export function pop() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  tone(c, 'sine', 380, 720, 0.09, 0.07, t);
}

/** Chụp / kẹp giấy. */
export function shutter() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  noise(c, 0.03, 2200, 1, 0.12, t);
  noise(c, 0.05, 1200, 1, 0.1, t + 0.08);
}

/** Chuông gỗ nhỏ (kiểu đàn gõ đồ chơi). */
export function chime(up = true) {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  (up ? [523, 659, 784] : [659, 523]).forEach((f, i) => { tone(c, 'sine', f, f, 0.6, 0.05, t + i * 0.11); tone(c, 'sine', f * 2, f * 2, 0.25, 0.012, t + i * 0.11); });
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
