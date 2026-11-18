/*
 * Sân bay drone ở "Góc vui": lái drone bay qua khe giữa các cột ăng-ten (bấm / chạm / phím cách để nâng).
 * Chạy ngay trong trình duyệt, không cần mạng, không gọi API nào.
 */
import { useEffect, useRef, useState } from 'react';
import { pop, thock, thud } from '../sound';

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
