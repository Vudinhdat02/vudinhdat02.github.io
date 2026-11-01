/*
 * Hiệu ứng dùng chung cho cả trang:
 *  - InkCursor: con trỏ bút chì, để lại vệt mực mờ dần (chỉ máy tính có chuột)
 *  - InkSplash: bấm đâu, mực bắn ra đó
 *  - Magnets: mọi thứ có data-mag tự hút nhẹ về phía con trỏ
 *  - Bounce: tiêu đề tách từng chữ, rơi xuống nảy lên khi hiện, rê chuột thì nhún
 *  - Doodle: nét vẽ tay tự vẽ khi cuộn tới
 *  - Torn: mép giấy xé giữa các mục
 *  - Tape: băng keo chữ chạy ngang, nghiêng, nhanh/chậm theo tốc độ cuộn
 *  - SpinBadge: con dấu chữ tròn quay theo cuộn
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = () => window.matchMedia('(pointer: fine)').matches;
const INKS = ['#1f2f6e', '#d33a2c', '#2f8f5b', '#3b6fd8', '#b25fd8', '#f08a24'];

/* tốc độ cuộn dùng chung (px/khung hình, có dấu) */
export const scrollVel = { v: 0 };
if (typeof window !== 'undefined') {
  let last = window.scrollY;
  gsap.ticker.add(() => {
    const y = window.scrollY;
    scrollVel.v += (y - last - scrollVel.v) * 0.2;
    last = y;
  });
}

/* ---------------- con trỏ bút chì + vệt mực ---------------- */
export function InkCursor() {
  const cv = useRef(null);
  useEffect(() => {
    if (!fine() || reduced()) return undefined;
    document.documentElement.classList.add('pen');
    const c = cv.current, ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const pts = [];
    let raf, idle = 0;
    const move = (e) => { pts.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (pts.length > 60) pts.shift(); idle = 0; if (!raf) raf = requestAnimationFrame(draw); };
    const draw = () => {
      raf = 0;
      const now = performance.now();
      while (pts.length && now - pts[0].t > 520) pts.shift();
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const night = document.documentElement.classList.contains('night');
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], k = 1 - (now - b.t) / 520;
        ctx.strokeStyle = night ? `rgba(255,214,120,${k * 0.55})` : `rgba(31,47,110,${k * 0.42})`;
        ctx.lineWidth = 0.6 + k * 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      if (pts.length && idle++ < 120) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('resize', size);
    return () => { document.documentElement.classList.remove('pen'); window.removeEventListener('pointermove', move); window.removeEventListener('resize', size); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={cv} className="ink-cv" aria-hidden="true" />;
}

/* ---------------- bấm → mực bắn ---------------- */
export function InkSplash() {
  useEffect(() => {
    if (reduced()) return undefined;
    let n = 0;
    const down = (e) => {
      if (e.button !== 0) return;
      const col = INKS[n++ % INKS.length];
      const el = document.createElement('div');
      el.className = 'splash';
      el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px';
      const drops = Array.from({ length: 7 }, () => `<i style="background:${col}"></i>`).join('');
      el.innerHTML = `<b style="border-color:${col}"></b>${drops}`;
      document.body.appendChild(el);
      gsap.fromTo(el.querySelector('b'), { scale: 0, opacity: 0.9 }, { scale: 1, opacity: 0, duration: 0.6, ease: 'expo.out' });
      el.querySelectorAll('i').forEach((d, i) => {
        const a = (i / 7) * Math.PI * 2 + Math.random() * 0.6, r = 22 + Math.random() * 26;
        gsap.fromTo(d, { x: 0, y: 0, scale: 0.4 + Math.random() }, { x: Math.cos(a) * r, y: Math.sin(a) * r + 8, scale: 0, duration: 0.55 + Math.random() * 0.25, ease: 'power3.out' });
      });
      setTimeout(() => el.remove(), 900);
    };
    window.addEventListener('pointerdown', down, { passive: true });
    return () => window.removeEventListener('pointerdown', down);
  }, []);
  return null;
}

/* ---------------- nút từ tính (data-mag) ---------------- */
export function Magnets() {
  useEffect(() => {
    if (!fine() || reduced()) return undefined;
    let cur = null;
    const move = (e) => {
      const el = e.target.closest?.('[data-mag]');
      if (cur && cur !== el) { gsap.to(cur, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.35)' }); cur = null; }
      if (!el) return;
      cur = el;
      const r = el.getBoundingClientRect(), k = +(el.dataset.mag || 0.3);
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * k, y: (e.clientY - r.top - r.height / 2) * k, duration: 0.4, ease: 'power3' });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return null;
}

/* ---------------- chữ nảy ---------------- */
export function Bounce({ text, as: Tag = 'span', className = '', delay = 0, immediate = false }) {
  const ref = useRef(null);
  const words = useMemo(() => String(text).split(' '), [text]);
  useLayoutEffect(() => {
    const el = ref.current;
    const chars = el.querySelectorAll('.bc');
    if (reduced()) return undefined;
    gsap.set(chars, { yPercent: -160, rotate: () => gsap.utils.random(-40, 40), opacity: 0 });
    const play = () => gsap.to(chars, { yPercent: 0, rotate: 0, opacity: 1, duration: 0.9, ease: 'bounce.out', stagger: { each: 0.035, from: 'start' }, delay });
    if (immediate) { play(); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { play(); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  const hop = (e) => {
    const c = e.target.closest('.bc');
    if (!c || c.dataset.hop) return;
    c.dataset.hop = 1;
    gsap.timeline({ onComplete: () => delete c.dataset.hop })
      .to(c, { y: -18, scaleY: 1.15, rotate: gsap.utils.random(-14, 14), duration: 0.18, ease: 'power2.out' })
      .to(c, { y: 0, scaleY: 0.85, rotate: 0, duration: 0.22, ease: 'power2.in' })
      .to(c, { scaleY: 1, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
  };
  return (
    <Tag ref={ref} className={`bounce ${className}`} onPointerOver={hop} aria-label={text}>
      {words.map((w, wi) => (
        <span className="bw" key={wi} aria-hidden="true">
          {[...w].map((c, i) => <span key={i} className="bc">{c}</span>)}
          {wi < words.length - 1 && <span className="bc sp">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}

/* ---------------- nét vẽ tay ---------------- */
const DOODLES = {
  star: { vb: '0 0 60 60', d: ['M30 5 L36 24 L56 24 L40 36 L46 55 L30 43 L14 55 L20 36 L4 24 L24 24 Z'] },
  arrow: { vb: '0 0 120 60', d: ['M5 40 C 30 5, 60 5, 80 30 S 110 50, 115 20', 'M115 20 l-12 2 M115 20 l-2 12'] },
  swirl: { vb: '0 0 100 100', d: ['M50 50 m0 -4 a4 4 0 1 1 -4 4 a10 10 0 1 1 10 10 a18 18 0 1 1 -18 -18 a28 28 0 1 1 28 28'] },
  circle: { vb: '0 0 220 90', d: ['M110 8 C 40 4, 6 30, 12 52 C 20 80, 150 88, 196 64 C 226 46, 200 10, 120 10 C 100 10, 80 14, 66 20'] },
  under: { vb: '0 0 300 30', d: ['M4 18 C 60 6, 120 26, 180 14 S 270 8, 296 16', 'M30 26 C 100 18, 200 24, 280 22'] },
  spark: { vb: '0 0 60 60', d: ['M30 4 V18 M30 42 V56 M4 30 H18 M42 30 H56 M12 12 L20 20 M40 40 L48 48 M48 12 L40 20 M20 40 L12 48'] },
  heart: { vb: '0 0 60 54', d: ['M30 50 C 8 34, 2 22, 8 12 C 14 2, 26 4, 30 14 C 34 4, 46 2, 52 12 C 58 22, 52 34, 30 50 Z'] },
  sig: { vb: '0 0 260 70', d: ['M8 50 C 20 10, 40 10, 34 46 C 30 62, 60 20, 70 38 C 78 52, 92 30, 100 34 C 110 40, 112 52, 124 40 C 140 22, 150 56, 168 36 C 180 22, 196 30, 208 44 C 220 56, 240 30, 252 26'] },
  zig: { vb: '0 0 140 30', d: ['M4 20 L18 8 L32 22 L46 8 L60 22 L74 8 L88 22 L102 8 L116 22 L134 10'] },
};
export function Doodle({ kind = 'star', className = '', color, width = 2.5, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (reduced()) { el.classList.add('drawn'); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => el.classList.add('drawn'), delay * 1000); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  const d = DOODLES[kind];
  return (
    <svg ref={ref} className={`doo ${className}`} viewBox={d.vb} aria-hidden="true" style={{ '--dc': color, '--dw': width }}>
      {d.d.map((p, i) => <path key={i} d={p} pathLength="1" style={{ transitionDelay: `${i * 0.25}s` }} />)}
    </svg>
  );
}

/* ---------------- mép giấy xé ---------------- */
export function Torn({ color = '#fff', flip = false, seed = 3, className = '' }) {
  const d = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    let p = 'M0 40 L0 ' + (14 + rnd() * 10);
    for (let x = 0; x <= 1440; x += 14 + rnd() * 26) p += ` L${x.toFixed(0)} ${(6 + rnd() * 22).toFixed(1)}`;
    return p + ' L1440 18 L1440 40 Z';
  }, [seed]);
  return (
    <svg className={`torn ${flip ? 'flip' : ''} ${className}`} viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill={color} />
    </svg>
  );
}

/* ---------------- băng keo chữ chạy theo tốc độ cuộn ---------------- */
export function Tape({ items, tilt = -3, color = '#ffe14d', ink = '#1f2f6e', speed = 1, reverse = false, className = '' }) {
  const row = useRef(null);
  useEffect(() => {
    const el = row.current;
    if (reduced()) return undefined;
    let x = 0, skew = gsap.quickSetter(el, 'skewX', 'deg');
    const dir = reverse ? 1 : -1;
    const tick = (t, dt) => {
      const half = el.scrollWidth / 2;
      const v = scrollVel.v;
      x += dir * (0.6 + Math.min(14, Math.abs(v)) * 0.5) * speed * (dt / 16.7) * (v < -0.5 ? -1 : 1);
      if (x <= -half) x += half; if (x > 0) x -= half;
      el.style.transform = `translate3d(${x}px,0,0)`;
      skew(gsap.utils.clamp(-10, 10, -v * 0.4));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [reverse, speed]);
  const seq = [...items, ...items];
  return (
    <div className={`tape-band ${className}`} style={{ '--tilt': `${tilt}deg`, '--tc': color, '--ti': ink }} aria-hidden="true">
      <div className="tape-row" ref={row}>
        {[...seq, ...seq].map((s, i) => <span key={i}>{s}<i>✦</i></span>)}
      </div>
    </div>
  );
}

/* ---------------- con dấu chữ tròn quay ---------------- */
export function SpinBadge({ text = 'VŨ ĐÌNH ĐẠT • KỸ SƯ PHẦN MỀM • IoT • ', center = '✎', className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (reduced()) return undefined;
    let r = 0;
    const tick = (t, dt) => { r += (0.25 + Math.abs(scrollVel.v) * 0.6) * (dt / 16.7); if (ref.current) ref.current.style.transform = `rotate(${r}deg)`; };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  const id = useMemo(() => 'sb' + Math.random().toString(36).slice(2, 7), []);
  return (
    <div className={`spin-badge ${className}`} aria-hidden="true">
      <svg ref={ref} viewBox="0 0 200 200">
        <defs><path id={id} d="M100 100 m-78 0 a78 78 0 1 1 156 0 a78 78 0 1 1 -156 0" /></defs>
        <text><textPath href={`#${id}`} textLength="486" lengthAdjust="spacing">{text}</textPath></text>
      </svg>
      <b>{center}</b>
    </div>
  );
}

/* ---------------- giấy vụn bay khi bấm logo ---------------- */
export function confetti(x, y) {
  if (reduced()) return;
  const shapes = ['🍊', '🍉', '🍓', '🍍', '🍇', '🍋', '🍒', '🥭'];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('span');
    el.className = 'confetti';
    el.textContent = shapes[i % shapes.length];
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = INKS[i % INKS.length];
    document.body.appendChild(el);
    const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 220;
    gsap.timeline({ onComplete: () => el.remove() })
      .to(el, { x: Math.cos(a) * r, y: Math.sin(a) * r - 80, rotate: gsap.utils.random(-360, 360), duration: 0.7, ease: 'power3.out' })
      .to(el, { y: '+=260', opacity: 0, rotate: '+=180', duration: 1.1, ease: 'power1.in' });
  }
}
