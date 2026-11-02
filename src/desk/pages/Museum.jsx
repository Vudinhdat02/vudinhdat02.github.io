/*
 * Trang "Thành tích": BỨC TƯỜNG VINH DANH.
 *  - Mỗi thành tích là một khung ảnh treo bằng dây trên đinh, xếp so le kiểu phòng tranh, cuộn dọc để xem tiếp.
 *  - 10 kiểu khung (chọn khi thêm/sửa thành tích). Khung đung đưa khi cuộn tới.
 *  - Rê chuột: đèn rọi sáng lên, kính loé, khung nghiêng theo chuột, kim tuyến bay, biển tên trượt ra.
 *  - Bấm: khung bay ra giữa phòng, xem ảnh lớn và câu chuyện, chuyển qua lại bằng nút, phím ← → hoặc vuốt.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import data from '../../data/achievements.json';
import { asset } from '../../utils/asset';
import { thock, whoosh, chime } from '../sound';
import { reduced } from '../Fx';
import { ListEditor, useEditable } from '../Editor';
import { useDiary } from '../Diary';
import { ACH_BLANK, ACH_FIELDS, ACH_PREVIEW, FRAMES, frameOf } from '../fields';

gsap.registerPlugin(ScrollTrigger);

/* tỉ lệ ảnh có sẵn (để giữ chỗ trước khi ảnh tải xong) */
const AR = {
  '/uploads/tot-nghiep-trung-cap-mums91zd.jpg': 1.299, '/uploads/sinh-vien-xuat-sac-mumsbc7t.jpg': 1.394, '/uploads/sinh-vien-xuat-sac-mumsdspk.jpg': 1.437,
  '/uploads/sinh-vien-5-tot-cap-truong-2023-2024-mumsfx46.jpg': 0.769, '/uploads/sinh-vien-xuat-sac-mumshfn7.jpg': 1.415, '/uploads/sinh-vien-tieu-bieu-mumsjhua.jpg': 1.4,
  '/uploads/khen-thuong-doan-thanh-nien-mumsmvsp.jpg': 1.358, '/uploads/khen-thuong-hoi-sinh-vien-mumsohj9.jpg': 1.371, '/uploads/khen-thuong-hoi-sinh-vien-dhtn-mumspmxa.jpg': 1.333,
  '/uploads/sinh-vien-khoe-mumsqsz7.jpg': 1.281, '/uploads/sinh-vien-5-tot-cap-truong-mumsrspx.jpg': 0.746, '/uploads/sinh-vien-5-tot-cap-dhtn-mumssdu8.jpg': 0.755,
  '/uploads/do-an-he-cu-nhan-dat-diem-cao-nhat-hoi-d-mumt4bwf.jpg': 0.75, '/uploads/bai-bao-nckh-dang-tren-tap-chi-kh-cn-dht-mumt6h8q.jpg': 0.594,
  '/uploads/giai-nhi-cuoc-thi-phat-trien-phan-mem-ng-mumt7u9l.jpg': 0.75,
};
const IC = { 'Học tập': '🎓', 'Hoạt động': '🤝', 'Cuộc thi': '🏆' };
const yearOf = (d) => { const m = String(d).match(/(\d{4})/g); return m ? +m[m.length - 1] : 0; };
const linkify = (t) => String(t).split(/(https?:\/\/\S+)/g).map((x, k) => (/^https?:\/\//.test(x) ? <a key={k} href={x} target="_blank" rel="noreferrer">{x}</a> : x));
const frameName = (k) => FRAMES.find((f) => f.key === k)?.name || '';

function build(list) {
  return list.map((a) => ({ ...a, year: yearOf(a.date), img: a.image ? asset(a.image) : null, ar: AR[a.image] || 1.33, fr: frameOf(a) }))
    .sort((a, b) => b.year - a.year || (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .map((a, n) => ({ ...a, n }));
}

/* phần khung + ảnh, dùng chung cho tường và khung phóng to */
function Framed({ a, big }) {
  return (
    <span className={`hw-mould hw-f-${a.fr}`}>
      <span className="hw-mat">
        {a.img ? <img src={a.img} alt={a.title} loading={big ? 'eager' : 'lazy'} draggable="false" style={{ aspectRatio: `auto ${a.ar}` }} />
          : <span className="hw-ph" style={{ aspectRatio: '4 / 3' }}>{IC[a.category] || '✦'}<small>{a.title}</small></span>}
      </span>
    </span>
  );
}

/* huy chương đeo trên khung tiêu biểu */
const Medal = () => (
  <span className="hw-medal" aria-hidden="true">
    <i className="l" /><i className="r" />
    <b>★</b>
  </span>
);

/* ---------- một khung trên tường ---------- */
function Piece({ a, onOpen }) {
  const last = useRef(0);
  const move = (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget, r = el.querySelector('.hw-frame').getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty('--ry', `${(x - 0.5) * 14}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
  };
  const enter = (e) => {
    if (e.pointerType !== 'mouse') return;
    const now = performance.now(); if (now - last.current < 500) return; last.current = now;
    thock(1.9 + (a.n % 4) * 0.07);
    if (reduced()) return;
    const el = e.currentTarget;
    gsap.fromTo(el.querySelector('.hw-hang'), { rotate: e.movementX > 0 ? 2.2 : -2.2 }, { rotate: 0, duration: 1.6, ease: 'elastic.out(1.1, 0.25)', overwrite: true });
    const host = el.querySelector('.hw-spark'); const w = host.offsetWidth, h = host.offsetHeight;
    for (let k = 0; k < 9; k++) {
      const s = document.createElement('i'); s.textContent = k % 3 ? '✦' : '✧'; host.appendChild(s);
      const side = k % 4, t = Math.random();
      const x = side === 0 ? t * w : side === 1 ? w : side === 2 ? t * w : 0;
      const y = side === 0 ? 0 : side === 1 ? t * h : side === 2 ? h : t * h;
      gsap.fromTo(s, { x, y, scale: 0, opacity: 1, rotate: 0 }, { x: x + gsap.utils.random(-26, 26), y: y - gsap.utils.random(20, 60), scale: gsap.utils.random(0.6, 1.3), rotate: 160, opacity: 0, duration: gsap.utils.random(0.8, 1.3), ease: 'power2.out', delay: k * 0.03, onComplete: () => s.remove() });
    }
  };
  const leave = (e) => { const el = e.currentTarget; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
  return (
    <div className={`hw-slot ${a.featured ? 'star' : ''}`} onPointerMove={move} onPointerEnter={enter} onPointerLeave={leave}>
      <span className="hw-beam" aria-hidden="true" />
      <div className="hw-hang">
        <svg className="hw-wire" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="M4 30 L50 3 L96 30" /></svg>
        <span className="hw-nail" aria-hidden="true" />
        <button className="hw-frame" onClick={(e) => onOpen(a.n, e.currentTarget.querySelector('.hw-mould'))} aria-label={`Xem chi tiết: ${a.title}`}>
          <Framed a={a} />
          <span className="hw-glare" aria-hidden="true" />
          {a.featured && <Medal />}
        </button>
        <div className="hw-plate">
          <b>{a.title}</b>
          <small>{a.date}</small>
          <span className="hw-more">{IC[a.category] || '✦'} {a.category} · Bấm để xem chi tiết</span>
        </div>
      </div>
      <span className="hw-spark" aria-hidden="true" />
    </div>
  );
}

/* ---------- cả bức tường ---------- */
function Wall({ items, onOpen }) {
  const root = useRef(null);
  const [tab, setTab] = useState('all');
  const [cols, setCols] = useState(4);
  const cats = [...new Set(items.map((a) => a.category).filter(Boolean))];
  const shown = tab === 'all' ? items : tab === 'gold' ? items.filter((a) => a.featured) : items.filter((a) => a.category === tab);

  useLayoutEffect(() => {
    const fit = () => { const w = root.current.clientWidth; setCols(w >= 1100 ? 4 : w >= 720 ? 3 : 2); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(root.current); return () => ro.disconnect();
  }, []);

  /* xếp so le: mỗi khung vào cột đang thấp nhất */
  const columns = useMemo(() => {
    const out = Array.from({ length: cols }, () => ({ h: 0, list: [] }));
    shown.forEach((a) => { const c = out.reduce((m, x) => (x.h < m.h ? x : m), out[0]); c.list.push(a); c.h += 1 / a.ar + 0.45; });
    return out.map((c) => c.list);
  }, [shown, cols]);

  /* mở màn một lần */
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('.hw-crest > *', { y: -24, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'back.out(1.8)' });
      gsap.fromTo('.hw-laurel path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', delay: 0.3 });
      gsap.from('.hw-tabs button', { y: 18, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'back.out(2)', delay: 0.35 });
      gsap.from('.hw-crown', { scaleX: 0, duration: 1.1, ease: 'power3.inOut' });
    }, root);
    return () => ctx.revert();
  }, []);

  /* khung treo đung đưa khi cuộn tới */
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      const hangs = gsap.utils.toArray('.hw-hang');
      gsap.set(hangs, { opacity: 0, y: -50, rotate: (k) => (k % 2 ? 9 : -9), transformOrigin: '50% 0%' });
      ScrollTrigger.batch(hangs, {
        start: 'top 94%', once: true,
        onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, rotate: 0, duration: 1.8, ease: 'elastic.out(1, 0.32)', stagger: 0.09, overwrite: true }),
      });
      ScrollTrigger.refresh();
    }, root);
    return () => ctx.revert();
  }, [tab, cols, items]);

  const pick = (t) => { if (t !== tab) { setTab(t); thock(1.3); } };
  return (
    <div className="hw" ref={root}>
      <span className="hw-crown" aria-hidden="true" />
      <header className="hw-top">
        <div className="hw-crest">
          <svg className="hw-laurel" viewBox="0 0 220 70" aria-hidden="true">
            <path pathLength="1" d="M104 64 C 60 60, 30 40, 22 8" /><path pathLength="1" d="M116 64 C 160 60, 190 40, 198 8" />
            {[0, 1, 2, 3, 4].map((k) => <g key={k}><ellipse cx={30 + k * 15} cy={18 + k * 9} rx="8" ry="3.4" transform={`rotate(${-50 + k * 9} ${30 + k * 15} ${18 + k * 9})`} /><ellipse cx={190 - k * 15} cy={18 + k * 9} rx="8" ry="3.4" transform={`rotate(${50 - k * 9} ${190 - k * 15} ${18 + k * 9})`} /></g>)}
          </svg>
          <h1>Bức tường vinh danh</h1>
          <p>Mỗi khung là một lần cố gắng được ghi nhận</p>
        </div>
        <nav className="hw-tabs" aria-label="Lọc thành tích">
          <button className={tab === 'all' ? 'on' : ''} onClick={() => pick('all')}>Tất cả <b>{items.length}</b></button>
          {cats.map((c) => <button key={c} className={tab === c ? 'on' : ''} onClick={() => pick(c)}>{IC[c] || '✦'} {c} <b>{items.filter((a) => a.category === c).length}</b></button>)}
          <button className={tab === 'gold' ? 'on' : ''} onClick={() => pick('gold')}>★ Tiêu biểu <b>{items.filter((a) => a.featured).length}</b></button>
        </nav>
      </header>
      <div className="hw-cols" key={tab} style={{ '--cols': cols }}>
        {columns.map((col, c) => (
          <div className="hw-col" key={c}>{col.map((a) => <Piece key={a.id || a.n} a={a} onOpen={onOpen} />)}</div>
        ))}
      </div>
      {shown.length === 0 && <p className="hw-empty">Chưa có thành tích nào ở mục này.</p>}
      <div className="hw-wains" aria-hidden="true"><i /><i /><i /><i /></div>
    </div>
  );
}

/* ---------- xem chi tiết một thành tích ---------- */
function Detail({ items, at, from, onClose }) {
  const ref = useRef(null);
  const [i, setI] = useState(at);
  const [zoom, setZoom] = useState(false);
  const [talk, setTalk] = useState(false);
  const busy = useRef(false);
  const a = items[i];
  const { lenis } = useDiary() || {};

  useEffect(() => { lenis?.current?.stop(); return () => { lenis?.current?.start(); window.speechSynthesis?.cancel(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const confetti = () => {
    const host = ref.current?.querySelector('.hd-burst'); if (!host || reduced()) return;
    const cs = ['#e9c766', '#fff2b8', '#d33a2c', '#1f2f6e', '#b88a2a'];
    for (let k = 0; k < 26; k++) {
      const s = document.createElement('i'); s.style.background = cs[k % cs.length]; host.appendChild(s);
      const ang = (k / 26) * Math.PI * 2, d = 140 + Math.random() * 220;
      gsap.fromTo(s, { x: 0, y: 0, rotate: 0, opacity: 1 }, { x: Math.cos(ang) * d, y: Math.sin(ang) * d + 120, rotate: gsap.utils.random(-540, 540), opacity: 0, duration: 1.4 + Math.random() * 0.6, ease: 'power3.out', onComplete: () => s.remove() });
    }
  };

  useLayoutEffect(() => {
    const q = gsap.utils.selector(ref);
    whoosh();
    gsap.fromTo(q('.hd-bg'), { opacity: 0 }, { opacity: 1, duration: 0.45 });
    if (reduced()) return;
    const big = q('.hd-art .hw-mould')[0]; const r = big.getBoundingClientRect();
    const tl = gsap.timeline();
    tl.fromTo(q('.hd-light'), { opacity: 0, scaleY: 0.3 }, { opacity: 1, scaleY: 1, duration: 0.8, ease: 'power2.out' }, 0);
    if (from) {
      tl.from(q('.hd-art'), {
        x: from.left + from.width / 2 - (r.left + r.width / 2), y: from.top + from.height / 2 - (r.top + r.height / 2),
        scale: Math.max(0.1, from.width / r.width), rotate: -4, duration: 0.75, ease: 'power3.inOut',
      }, 0);
    }
    tl.add(() => { chime(true); if (a.featured) confetti(); }, 0.6)
      .from(q('.hd-info > *'), { x: 30, opacity: 0, stagger: 0.07, duration: 0.5, ease: 'power3.out' }, 0.45)
      .from(q('.hd-ui > *'), { y: 20, opacity: 0, stagger: 0.05, duration: 0.4, ease: 'power3.out' }, 0.6);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (to) => {
    if (busy.current || items.length < 2) return;
    const n = (to + items.length) % items.length; const d = to > i ? 1 : -1;
    busy.current = true; setZoom(false); setTalk(false); window.speechSynthesis?.cancel(); thock(1.2);
    if (reduced()) { setI(n); busy.current = false; return; }
    const q = gsap.utils.selector(ref);
    gsap.timeline({ onComplete: () => { busy.current = false; } })
      .to(q('.hd-art'), { x: -120 * d, rotate: -6 * d, opacity: 0, duration: 0.3, ease: 'power2.in' })
      .to(q('.hd-info'), { opacity: 0, x: -30 * d, duration: 0.25 }, 0)
      .add(() => setI(n))
      .fromTo(q('.hd-art'), { x: 120 * d, rotate: 6 * d, opacity: 0 }, { x: 0, rotate: 0, opacity: 1, duration: 0.7, ease: 'elastic.out(1, 0.55)' }, '+=0.02')
      .fromTo(q('.hd-info'), { opacity: 0, x: 30 * d }, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }, '<0.1');
  };
  const close = () => {
    const q = gsap.utils.selector(ref);
    gsap.to(q('.hd-stage'), { scale: 0.9, y: 30, opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to(ref.current, { opacity: 0, duration: 0.34, onComplete: onClose });
  };
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') (zoom ? setZoom(false) : close()); if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const touch = useRef(null);
  const speak = () => {
    const s = window.speechSynthesis; if (!s) return;
    if (talk) { s.cancel(); setTalk(false); return; }
    const u = new SpeechSynthesisUtterance(`${a.title}. ${a.date}. ${a.desc || ''}`);
    u.lang = 'vi-VN'; const v = s.getVoices().find((x) => x.lang?.toLowerCase().startsWith('vi')); if (v) u.voice = v;
    u.rate = 0.95; u.onend = () => setTalk(false); s.cancel(); s.speak(u); setTalk(true);
  };

  return createPortal(
    <div className="hd-wrap" ref={ref} role="dialog" aria-modal="true" aria-label={a.title}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 60) go(i + (dx < 0 ? 1 : -1)); }}>
      <div className="hd-bg" onClick={close} />
      <span className="hd-light" aria-hidden="true" />
      <div className="hd-stage">
        <div className="hd-art">
          <button className="hd-frame" onClick={() => a.img && setZoom(true)} aria-label="Xem ảnh lớn">
            <Framed a={a} big />
            <span className="hw-glare on" aria-hidden="true" />
            {a.featured && <Medal />}
          </button>
        </div>
        <div className="hd-info">
          <span className="hd-cat">{IC[a.category] || '✦'} {a.category}{a.featured ? ' · ★ Tiêu biểu' : ''}</span>
          <h2>{a.title}</h2>
          <span className="hd-date">🗓 {a.date}</span>
          <p className="hd-desc">{linkify(a.desc || 'Một dấu mốc đáng nhớ trên hành trình học tập và rèn luyện.')}</p>
          <small className="hd-fr">Khung: {frameName(a.fr)}</small>
        </div>
      </div>
      <div className="hd-burst" aria-hidden="true" />
      <div className="hd-ui">
        <button className="hd-nav" onClick={() => go(i - 1)} aria-label="Thành tích trước">‹</button>
        <span className="hd-count">{i + 1} / {items.length}</span>
        {a.img && <button onClick={() => setZoom(true)}>🔍<span> Phóng to</span></button>}
        {'speechSynthesis' in window && <button className={talk ? 'on' : ''} onClick={speak}>{talk ? <>⏹<span> Dừng</span></> : <>🔊<span> Đọc to</span></>}</button>}
        <button className="hd-nav" onClick={() => go(i + 1)} aria-label="Thành tích sau">›</button>
      </div>
      <button className="hd-x" onClick={close} aria-label="Đóng">✕</button>
      {zoom && a.img && <div className="hd-zoom" onClick={() => setZoom(false)}><img src={a.img} alt={a.title} /></div>}
    </div>,
    document.body,
  );
}

export default function Museum() {
  const [view, setView] = useState(null);
  const ed = useEditable(data, 'achievements');
  const items = useMemo(() => build(ed.items), [ed.items]);
  const open = (n, el) => { const r = el.getBoundingClientRect(); setView({ n, from: { left: r.left, top: r.top, width: r.width, height: r.height } }); };
  return (
    <div className="mz">
      <Wall items={items} onOpen={open} />
      {view && items.length > 0 && <Detail items={items} at={Math.min(view.n, items.length - 1)} from={view.from} onClose={() => setView(null)} />}
      {ed.canEdit && <ListEditor ed={ed} label="thành tích" fields={ACH_FIELDS} blank={ACH_BLANK} preview={ACH_PREVIEW} />}
    </div>
  );
}
