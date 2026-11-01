/*
 * Bộ "thẻ bài sưu tầm" dùng cho trang Thành tích và Dự án:
 *  - Card: lá bài có lớp hologram óng ánh + vệt sáng chạy theo chuột, nghiêng 3D, viền theo độ hiếm
 *  - Fan: xòe bài trên tay, rê chuột thì lá bài nhô lên, bấm để rút
 *  - Pack: xé gói bài, 3 lá bay ra rồi lật từng lá
 *  - Inspect: rút một lá ra giữa màn hình, kéo để xoay 3D, bấm để lật mặt sau, ← → để đổi lá
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { thock, whoosh, chime, pop } from './sound';
import { reduced } from './Fx';

export const RARITY = {
  legend: { label: 'Huyền thoại', short: 'HT', color: '#f5b100', stars: 3 },
  rare: { label: 'Hiếm', short: 'H', color: '#a855f7', stars: 2 },
  common: { label: 'Thường', short: 'T', color: '#3b82f6', stars: 1 },
};

/* nghiêng + hologram theo con trỏ (viết thẳng vào biến CSS cho mượt) */
export function holo(e) {
  const el = e.currentTarget, r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--mx', `${x * 100}%`);
  el.style.setProperty('--my', `${y * 100}%`);
  el.style.setProperty('--rx', `${(0.5 - y) * 22}deg`);
  el.style.setProperty('--ry', `${(x - 0.5) * 26}deg`);
  el.style.setProperty('--hp', `${x * 100 + y * 50}%`);
  el.classList.add('hov');
}
export function unholo(e) {
  const el = e.currentTarget;
  el.classList.remove('hov');
  el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
}

/* ---------- một lá bài ---------- */
export function Card({ c, onClick, className = '', style, flipId, back = false, size }) {
  const R = RARITY[c.rarity] || RARITY.common;
  return (
    <button className={`tc tc-${c.rarity} ${back ? 'is-back' : ''} ${size ? 'tc-' + size : ''} ${className}`} style={{ '--rc': R.color, '--hue': c.hue ?? 210, ...style }} data-flip-id={flipId}
      onPointerMove={holo} onPointerLeave={unholo} onClick={onClick} aria-label={c.title}>
      <span className="tc-in">
        <span className="tc-face tc-front">
          <span className="tc-top"><b className="tc-name">{c.title}</b><span className="tc-cost">{c.cost}</span></span>
          <span className="tc-art">
            {c.image ? <img src={c.image} alt="" loading="lazy" draggable="false" /> : <span className="tc-gen"><i>{c.icon}</i><code>{c.code}</code></span>}
          </span>
          <span className="tc-type"><span>{c.icon} {c.type}</span><span className="tc-stars">{'★'.repeat(R.stars)}</span></span>
          <span className="tc-text">{c.flavor}</span>
          <span className="tc-foot"><span>{c.foot}</span><span className="tc-rar">{R.label}</span></span>
          <span className="tc-holo" /><span className="tc-glare" />
        </span>
        <span className="tc-face tc-back">
          <span className="tc-back-in"><b>{c.backTitle || c.title}</b>{c.backBody}</span>
          <span className="tc-logo">🍊</span>
        </span>
      </span>
    </button>
  );
}

/* ---------- xòe bài trên tay ---------- */
export function Fan({ cards, onPick }) {
  const ref = useRef(null);
  const n = cards.length;
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo('.fan-slot', { y: 340, opacity: 0 }, { y: 0, opacity: 1, clearProps: 'transform', stagger: 0.08, duration: 1, ease: 'back.out(1.4)', delay: 0.8, onStart: () => setTimeout(() => thock(0.9), 200) });
    }, ref);
    return () => ctx.revert();
  }, [n]);
  return (
    <div className="fan" ref={ref}>
      {cards.map((c, i) => {
        const k = i - (n - 1) / 2;
        return (
          <div key={c.id} className="fan-slot" style={{ '--k': k, '--a': `${k * (n > 6 ? 6 : 8)}deg`, zIndex: i }} onMouseEnter={() => thock(1.4 + i * 0.06)}>
            <Card c={c} onClick={(e) => onPick(i, e.currentTarget.getBoundingClientRect())} />
          </div>
        );
      })}
    </div>
  );
}

/* ---------- mở gói bài ---------- */
export function Pack({ pool, onPick, label = 'Mở gói bài may mắn' }) {
  const ref = useRef(null);
  const [drawn, setDrawn] = useState(null);
  const [opening, setOpening] = useState(false);
  const open = () => {
    if (opening) return;
    setOpening(true);
    const weight = (c) => (c.rarity === 'legend' ? 1 : c.rarity === 'rare' ? 2 : 4);
    const bag = pool.flatMap((c) => Array(weight(c)).fill(c));
    const pick = [];
    while (pick.length < Math.min(3, pool.length)) { const c = bag[Math.floor(Math.random() * bag.length)]; if (!pick.includes(c)) pick.push(c); }
    const q = gsap.utils.selector(ref);
    whoosh();
    gsap.timeline()
      .to(q('.pk-pack'), { keyframes: [{ rotate: -6 }, { rotate: 6 }, { rotate: -4 }, { rotate: 4 }, { rotate: 0 }], duration: 0.5 })
      .to(q('.pk-top'), { y: -80, rotate: -25, x: 40, opacity: 0, duration: 0.45, ease: 'power2.in', onStart: pop })
      .to(q('.pk-pack'), { y: 120, opacity: 0, scale: 0.8, duration: 0.45, ease: 'power2.in' }, '+=0.05')
      .add(() => setDrawn(pick));
  };
  useLayoutEffect(() => {
    if (!drawn) return;
    const q = gsap.utils.selector(ref);
    gsap.timeline()
      .fromTo(q('.pk-card'), { y: 200, scale: 0.5, rotate: 0, opacity: 0 }, { y: 0, scale: 1, rotate: (i) => (i - 1) * 6, opacity: 1, stagger: 0.12, duration: 0.6, ease: 'back.out(1.6)' })
      .add(() => {
        q('.pk-card').forEach((el, i) => setTimeout(() => {
          el.querySelector('.tc').classList.remove('is-back');
          const r = drawn[i].rarity;
          thock(1 + i * 0.2);
          if (r !== 'common') { chime(); gsap.fromTo(el.querySelector('.pk-burst'), { scale: 0.2, opacity: 1 }, { scale: 2.4, opacity: 0, duration: 1.1, ease: 'expo.out' }); }
        }, 450 + i * 600));
      });
  }, [drawn]);
  const again = () => { setDrawn(null); setOpening(false); requestAnimationFrame(() => gsap.fromTo(ref.current.querySelector('.pk-pack'), { y: 120, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' })); };
  return (
    <div className="pk" ref={ref}>
      {!drawn ? (
        <button className="pk-pack" onClick={open} data-mag="0.15" aria-label={label}>
          <span className="pk-top" />
          <span className="pk-body"><span className="pk-shine" /><b>🍊</b><span>{label}</span><small>3 lá ngẫu nhiên · có thể ra Huyền thoại</small></span>
        </button>
      ) : (
        <div className="pk-row">
          {drawn.map((c, i) => (
            <div key={c.id + i} className="pk-card">
              <span className="pk-burst" style={{ '--rc': (RARITY[c.rarity] || RARITY.common).color }} />
              <Card c={c} back onClick={(e) => onPick(c, e.currentTarget.getBoundingClientRect())} />
            </div>
          ))}
          <button className="pk-again" onClick={again}>↻ Mở gói khác</button>
        </div>
      )}
    </div>
  );
}

/* ---------- rút một lá ra xem kỹ ---------- */
export function Inspect({ list, at, from, onClose }) {
  const ref = useRef(null);
  const [i, setI] = useState(at);
  const [flipped, setFlipped] = useState(false);
  const rot = useRef({ x: 0, y: 0 });
  const c = list[i];
  useLayoutEffect(() => {
    const wrap = ref.current.querySelector('.ins-card');
    const r = wrap.getBoundingClientRect();
    gsap.fromTo(ref.current, { backgroundColor: 'rgba(10,14,30,0)' }, { backgroundColor: 'rgba(10,14,30,0.86)', duration: 0.4 });
    if (from) gsap.fromTo(wrap, { x: from.left + from.width / 2 - (r.left + r.width / 2), y: from.top + from.height / 2 - (r.top + r.height / 2), scale: from.width / r.width, rotate: -8 }, { x: 0, y: 0, scale: 1, rotate: 0, duration: 0.75, ease: 'expo.out' });
    gsap.fromTo(ref.current.querySelector('.ins-rays'), { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: 'expo.out' });
    whoosh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const spin = (deg) => { const el = ref.current.querySelector('.ins-spin'); gsap.to(el, { rotateY: deg, duration: 0.8, ease: 'back.out(1.4)' }); };
  const flip = () => { const v = !flipped; setFlipped(v); rot.current.y = v ? 180 : 0; spin(rot.current.y); thock(1.2); };
  const go = (d) => {
    const el = ref.current.querySelector('.ins-card');
    gsap.timeline().to(el, { x: -d * 260, rotate: -d * 18, opacity: 0, duration: 0.25, ease: 'power2.in' })
      .add(() => { setI((x) => (x + d + list.length) % list.length); setFlipped(false); rot.current.y = 0; gsap.set(ref.current.querySelector('.ins-spin'), { rotateY: 0, rotateX: 0 }); })
      .fromTo(el, { x: d * 260, rotate: d * 18, opacity: 0 }, { x: 0, rotate: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' });
    thock(1.3);
  };
  /* kéo để xoay */
  const drag = useRef(null);
  const down = (e) => { drag.current = { x: e.clientX, y: e.clientY, moved: false, by: rot.current.y }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.current.moved = true;
    gsap.set(ref.current.querySelector('.ins-spin'), { rotateY: drag.current.by + dx * 0.6, rotateX: -dy * 0.3 });
  };
  const up = (e) => {
    if (!drag.current) return;
    const d = drag.current; drag.current = null;
    if (!d.moved) return flip();
    const y = d.by + (e.clientX - d.x) * 0.6;
    const snap = Math.round(y / 180) * 180;
    rot.current.y = snap; setFlipped(Math.abs(snap / 180) % 2 === 1);
    gsap.to(ref.current.querySelector('.ins-spin'), { rotateY: snap, rotateX: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); if (e.key === ' ') { e.preventDefault(); flip(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  return createPortal(
    <div className="ins" ref={ref} onClick={onClose}>
      <span className="ins-rays" style={{ '--rc': (RARITY[c.rarity] || RARITY.common).color }} />
      {list.length > 1 && <button className="ins-nav l" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Lá trước">‹</button>}
      <div className="ins-card" onClick={(e) => e.stopPropagation()}>
        <div className="ins-spin" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <Card c={c} size="xl" />
        </div>
        <p className="ins-hint">Bấm để lật · kéo để xoay · ← → đổi lá · Esc để cất bài</p>
        <p className="ins-count">{i + 1} / {list.length}</p>
      </div>
      {list.length > 1 && <button className="ins-nav r" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Lá sau">›</button>}
      <button className="ins-close" onClick={onClose} aria-label="Đóng">✕</button>
    </div>,
    document.body,
  );
}
