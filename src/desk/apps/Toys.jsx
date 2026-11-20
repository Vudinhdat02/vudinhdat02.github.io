/*
 * Đồ chơi nhỏ ở "Góc vui" — tất cả chạy ngay trong trình duyệt, không cần mạng, không gọi API nào.
 *  <DroneGame>   lái drone bay qua khe giữa các cột ăng-ten (bấm / chạm / phím cách để nâng)
 *  <BinaryLeds>  gạt 8 công tắc cho dãy đèn LED khớp con số đề bài (nhị phân)
 *  <BugSmash>    20 giây đập bug trong đoạn code, đừng đập nhầm cốc cà phê
 *  <Morse>       máy điện báo: gõ chữ để phát mã Morse, hoặc tự nhấn giữ phím để đánh điện
 */
import { useEffect, useRef, useState } from 'react';
import { chime, isMuted, pop, thock, thud } from '../sound';

const best = (key) => { try { return +localStorage.getItem(key) || 0; } catch { return 0; } };
const saveBest = (key, v) => { try { localStorage.setItem(key, String(v)); } catch { /* bị chặn thì thôi */ } };

/* ================================================================
 *  1. Drone bay qua khe
 * ================================================================ */
export function DroneGame() {
  const wrap = useRef(null);
  const cv = useRef(null);
  const [state, setState] = useState('ready'); // ready | play | over
  const [score, setScore] = useState(0);
  const [top, setTop] = useState(() => best('toy.drone'));
  const game = useRef(null);

  useEffect(() => {
    const canvas = cv.current, ctx = canvas.getContext('2d');
    let W = 600, H = 280, raf = 0, last = 0;
    const g = { y: H / 2, v: 0, t: 0, pillars: [], score: 0, mode: 'ready', spin: 0 };
    game.current = g;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (!wrap.current) return;
      W = wrap.current.clientWidth; H = Math.round(Math.min(320, Math.max(230, W * 0.5)));
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const ro = new ResizeObserver(size); ro.observe(wrap.current);
    const reset = () => { g.y = H / 2; g.v = 0; g.t = 0; g.pillars = []; g.score = 0; g.next = 0.6; };
    reset();
    g.reset = reset;
    const gap = () => Math.max(96, H * 0.42 - g.score * 2);
    const step = (dt) => {
      g.spin += dt * 40;
      if (g.mode !== 'play') { g.y = H / 2 + Math.sin(performance.now() / 400) * 8; return; }
      g.t += dt; g.v += 900 * dt; g.y += g.v * dt;
      const speed = 150 + Math.min(120, g.score * 6);
      g.next -= dt;
      if (g.next <= 0) { const gp = gap(); g.pillars.push({ x: W + 30, gy: 30 + Math.random() * (H - gp - 60), gp, passed: false }); g.next = 1.55 - Math.min(0.5, g.score * 0.02); }
      const dx = W * 0.25;
      g.pillars.forEach((p) => {
        p.x -= speed * dt;
        if (!p.passed && p.x + 26 < dx) { p.passed = true; g.score++; setScore(g.score); thock(1.6); }
        const hitX = dx + 22 > p.x && dx - 22 < p.x + 34;
        if (hitX && (g.y - 12 < p.gy || g.y + 12 > p.gy + p.gp)) over();
      });
      g.pillars = g.pillars.filter((p) => p.x > -60);
      if (g.y > H - 12 || g.y < 10) over();
    };
    const over = () => {
      if (g.mode !== 'play') return;
      g.mode = 'over'; setState('over'); thud();
      if (g.score > best('toy.drone')) { saveBest('toy.drone', g.score); setTop(g.score); }
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#f4f7fc'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(80,130,200,.14)'; ctx.lineWidth = 1;
      const off = (g.t * 40) % 24;
      for (let x = -off; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // cột ăng-ten
      g.pillars.forEach((p) => {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1f2f6e'; ctx.lineWidth = 3;
        ctx.fillRect(p.x, -4, 34, p.gy + 4); ctx.strokeRect(p.x, -4, 34, p.gy + 4);
        ctx.fillRect(p.x, p.gy + p.gp, 34, H); ctx.strokeRect(p.x, p.gy + p.gp, 34, H);
        ctx.strokeStyle = 'rgba(31,47,110,.35)'; ctx.lineWidth = 2;
        for (let y = p.gy + p.gp + 12; y < H; y += 16) { ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + 34, y + 8); ctx.stroke(); }
        ctx.fillStyle = '#d33a2c';
        ctx.beginPath(); ctx.arc(p.x + 17, p.gy + p.gp - 4, 4, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x + 17, p.gy + 4, 4, 0, 7); ctx.fill();
      });
      // drone
      const x = W * 0.25, y = g.y, tilt = Math.max(-0.5, Math.min(0.5, g.v / 900));
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
      ctx.strokeStyle = '#1f2f6e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-20, -4); ctx.lineTo(20, -4); ctx.stroke();
      ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-11, -9, 22, 14, 5) : ctx.rect(-11, -9, 22, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1f2f6e'; ctx.beginPath(); ctx.arc(5, -2, 2.4, 0, 7); ctx.fill();
      [-20, 20].forEach((rx) => {
        const s = Math.cos(g.spin + rx) * 10;
        ctx.beginPath(); ctx.moveTo(rx - s, -10); ctx.lineTo(rx + s, -10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx, -4); ctx.lineTo(rx, -10); ctx.stroke();
      });
      ctx.beginPath(); ctx.moveTo(-7, 5); ctx.lineTo(-10, 10); ctx.moveTo(7, 5); ctx.lineTo(10, 10); ctx.stroke();
      ctx.restore();
      // điểm
      ctx.fillStyle = '#1f2f6e'; ctx.font = '700 22px "Patrick Hand", cursive'; ctx.textAlign = 'right';
      ctx.fillText(String(g.score), W - 14, 30);
    };
    const loop = (t) => { const dt = Math.min(0.033, (t - (last || t)) / 1000); last = t; step(dt); draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const flap = (e) => {
    e?.preventDefault?.();
    const g = game.current; if (!g) return;
    if (g.mode !== 'play') { g.reset(); g.mode = 'play'; setState('play'); setScore(0); }
    g.v = -300; pop();
  };
  return (
    <div className="toy drone" ref={wrap}>
      <canvas ref={cv} tabIndex={0} aria-label="Trò chơi drone: bấm hoặc nhấn phím cách để bay lên"
        onPointerDown={flap} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'ArrowUp') flap(e); }} />
      {state !== 'play' && (
        <button className="toy-over" onClick={flap}>
          <b>{state === 'over' ? `Rơi rồi! ${score} cột` : '🚁 Bay thử drone'}</b>
          <small>{state === 'over' ? 'Bấm để bay lại' : 'Bấm / chạm / phím cách để nâng cánh'}</small>
        </button>
      )}
      <p className="toy-meta">Kỷ lục: <b>{top}</b> cột · càng bay càng nhanh</p>
    </div>
  );
}

/* ================================================================
 *  2. Bật đèn nhị phân
 * ================================================================ */
const newTarget = (prev) => { let t; do { t = 1 + Math.floor(Math.random() * 255); } while (t === prev); return t; };
export function BinaryLeds() {
  const [bits, setBits] = useState(0);
  const [target, setTarget] = useState(() => newTarget());
  const [win, setWin] = useState(0);
  const [flash, setFlash] = useState(false);
  const flip = (k) => {
    const v = bits ^ (1 << k);
    setBits(v); thock(1 + k * 0.08);
    if (v === target) {
      setFlash(true); chime(true); setWin((w) => w + 1);
      setTimeout(() => { setFlash(false); setBits(0); setTarget((t) => newTarget(t)); }, 900);
    }
  };
  return (
    <div className={`toy bin ${flash ? 'ok' : ''}`}>
      <p className="bin-q">Bật đèn sao cho ra số <b>{target}</b></p>
      <div className="bin-leds">
        {[7, 6, 5, 4, 3, 2, 1, 0].map((k) => (
          <button key={k} className={`bin-led ${bits & (1 << k) ? 'on' : ''}`} onClick={() => flip(k)} aria-pressed={!!(bits & (1 << k))} aria-label={`Bit ${k}, giá trị ${1 << k}`}>
            <i /><span className="bin-sw" /><small>{1 << k}</small>
          </button>
        ))}
      </div>
      <p className="bin-now">Đang có: <b>{bits}</b> · <code>0b{bits.toString(2).padStart(8, '0')}</code> · <code>0x{bits.toString(16).toUpperCase().padStart(2, '0')}</code></p>
      <p className="toy-meta">Đã giải: <b>{win}</b> · mẹo: cộng các giá trị của đèn đang sáng</p>
    </div>
  );
}

/* ================================================================
 *  3. Đập bug
 * ================================================================ */
const CODE = ['void loop() {', '  readSensor();', '  if (temp > 30)', '    fan.on();', '  mqtt.publish();', '  delay(1000);', '}', '// TODO: fix', 'return ok;'];
export function BugSmash() {
  const [cells, setCells] = useState(() => Array(9).fill(null));
  const [left, setLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [top, setTop] = useState(() => best('toy.bug'));
  const timers = useRef([]);
  const running = left > 0;
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clear(), []);
  useEffect(() => {
    if (!running) return undefined;
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left, running]);
  useEffect(() => {
    if (!running) { setCells(Array(9).fill(null)); return undefined; }
    const spawn = () => {
      const k = Math.floor(Math.random() * 9), kind = Math.random() < 0.18 ? 'coffee' : Math.random() < 0.12 ? 'boss' : 'bug';
      setCells((c) => { if (c[k]) return c; const n = [...c]; n[k] = { kind, id: Math.random() }; return n; });
      const life = kind === 'boss' ? 650 : 900 - Math.min(400, score * 15);
      timers.current.push(setTimeout(() => setCells((c) => { const n = [...c]; n[k] = null; return n; }), life));
    };
    const id = setInterval(spawn, Math.max(380, 700 - score * 12));
    return () => clearInterval(id);
  }, [running, score]);
  useEffect(() => {
    if (left === 0 && score > 0 && score > best('toy.bug')) { saveBest('toy.bug', score); setTop(score); }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { clear(); setScore(0); setLeft(20); thock(1.3); };
  const hit = (k) => {
    const c = cells[k]; if (!c || !running) return;
    const pts = c.kind === 'coffee' ? -2 : c.kind === 'boss' ? 3 : 1;
    setScore((s) => Math.max(0, s + pts));
    c.kind === 'coffee' ? thud() : pop();
    setCells((cs) => { const n = [...cs]; n[k] = { ...c, dead: true }; return n; });
    timers.current.push(setTimeout(() => setCells((cs) => { const n = [...cs]; if (n[k]?.id === c.id) n[k] = null; return n; }), 220));
  };
  return (
    <div className="toy bug">
      <div className="bug-hud"><span>⏱ <b>{left}</b>s</span><span>🐞 <b>{score}</b></span><span>Kỷ lục <b>{top}</b></span></div>
      <div className="bug-grid">
        {cells.map((c, k) => (
          <button key={k} className={`bug-cell ${c ? 'has' : ''} ${c?.dead ? 'dead' : ''}`} onPointerDown={() => hit(k)} aria-label={c ? (c.kind === 'coffee' ? 'Cốc cà phê, đừng đập' : 'Con bug, đập nó') : 'Dòng code'}>
            <code>{CODE[k]}</code>
            {c && <span className={`bug-it ${c.kind}`}>{c.dead ? '💥' : c.kind === 'coffee' ? '☕' : c.kind === 'boss' ? '🪲' : '🐛'}</span>}
          </button>
        ))}
      </div>
      {!running && (
        <button className="toy-btn" onClick={start}>{score ? `Được ${score} điểm · chơi lại` : '▶ Bắt đầu 20 giây'}</button>
      )}
      <p className="toy-meta">🐛 +1 · 🪲 +3 · ☕ −2 (đừng đập cà phê của dev!)</p>
    </div>
  );
}

/* ================================================================
 *  4. Máy điện báo Morse
 * ================================================================ */
const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
  N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
};
const BACK = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'D').toUpperCase();
export function Morse() {
  const [text, setText] = useState('HELLO DAT');
  const [lamp, setLamp] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tap, setTap] = useState('');
  const [decoded, setDecoded] = useState('');
  const ac = useRef(null), osc = useRef(null), stop = useRef(false), down = useRef(0), gapT = useRef(0);
  const code = plain(text).split('').map((c) => (c === ' ' ? '/' : MORSE[c] || '')).filter(Boolean).join(' ');
  const tone = (on) => {
    setLamp(on);
    if (isMuted()) return;
    try {
      if (!ac.current) ac.current = new (window.AudioContext || window.webkitAudioContext)();
      const c = ac.current; if (c.state === 'suspended') c.resume();
      if (on && !osc.current) {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.value = 680; g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.01);
        o.connect(g).connect(c.destination); o.start(); osc.current = { o, g };
      } else if (!on && osc.current) {
        const { o, g } = osc.current; g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.02); o.stop(c.currentTime + 0.03); osc.current = null;
      }
    } catch { /* không có âm thanh thì chỉ nháy đèn */ }
  };
  useEffect(() => () => { stop.current = true; tone(false); clearTimeout(gapT.current); ac.current?.close?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const play = async () => {
    if (playing) { stop.current = true; return; }
    stop.current = false; setPlaying(true);
    const u = 90;
    for (const ch of code) {
      if (stop.current) break;
      if (ch === '.') { tone(true); await wait(u); tone(false); await wait(u); }
      else if (ch === '-') { tone(true); await wait(u * 3); tone(false); await wait(u); }
      else if (ch === ' ') await wait(u * 2);
      else if (ch === '/') await wait(u * 4);
    }
    tone(false); setPlaying(false);
  };
  const press = (e) => { e.preventDefault(); if (playing) return; down.current = performance.now(); clearTimeout(gapT.current); tone(true); };
  const release = () => {
    if (!down.current) return;
    const ms = performance.now() - down.current; down.current = 0; tone(false);
    const sym = ms < 220 ? '.' : '-';
    setTap((t) => {
      const n = t + sym;
      clearTimeout(gapT.current);
      gapT.current = setTimeout(() => { setDecoded((d) => (d + (BACK[n] || '?')).slice(-18)); setTap(''); }, 650);
      return n;
    });
  };
  return (
    <div className="toy morse">
      <div className="mo-row">
        <input value={text} maxLength={24} onChange={(e) => setText(e.target.value)} aria-label="Chữ cần đánh điện" />
        <button className="toy-btn sm" onClick={play}>{playing ? '■ Dừng' : '▶ Phát'}</button>
        <span className={`mo-lamp ${lamp ? 'on' : ''}`} aria-hidden="true" />
      </div>
      <p className="mo-code" aria-label="Mã Morse">{code || '…'}</p>
      <div className="mo-key-row">
        <button className={`mo-key ${lamp && !playing ? 'down' : ''}`} onPointerDown={press} onPointerUp={release} onPointerLeave={release}
          onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) press(e); }} onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && release()}>
          Nhấn giữ để đánh điện
        </button>
        <div className="mo-out"><small>Bạn vừa gõ</small><b>{decoded || '—'}</b><code>{tap}</code></div>
      </div>
      <p className="toy-meta">Nhấn nhanh = chấm (·), giữ lâu = gạch (—). Thử “... --- ...” (SOS)</p>
    </div>
  );
}
