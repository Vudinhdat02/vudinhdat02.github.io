/*
 * Trang "Dự án": giờ trả bài kiểm tra.
 *  - Bảng đen ghi đề, các bài được chia ra bàn như thầy phát đề (4 bài một hàng).
 *  - Rê chuột: tờ giấy nhấc lên, góc giấy quăn, bút chì gạch chân tên bài, giấy nhớ ló ra.
 *  - Bấm: tờ bài bay ra giữa, chữ hiện như đang viết, bút đỏ khoanh điểm, tích từng phần, đóng dấu "Đã chấm".
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import projects from '../../data/projects.json';
import { ListEditor, useEditable } from '../Editor';
import { useDiary, vi } from '../Diary';
import { buzz, chime, thock, thud, whoosh } from '../sound';
import { LOOKS, PROJ_BLANK, PROJ_FIELDS, PROJ_PREVIEW, lookOf } from '../fields';
import { asset } from '../../utils/asset';

gsap.registerPlugin(ScrollTrigger);

const CAT_IC = { MOBILE: '📱', IOT: '🛰', WEB: '🌐' };
const REMARKS = ['Xuất sắc!', 'Rất sáng tạo!', 'Ý tưởng hay, phát huy!', 'Trình bày rõ ràng!', 'Làm kỹ, rất tốt!', 'Tuyệt vời!'];
const TILT = [-0.8, 0.6, -0.4, 0.9, -0.6, 0.4];

const Tick = () => (
  <svg className="hs-tick" viewBox="0 0 40 30" aria-hidden="true"><path pathLength="1" d="M4 16 L14 26 L37 3" /></svg>
);

/* cây bút đỏ */
const Pen = () => (
  <svg className="hs-pen" viewBox="0 0 40 120" aria-hidden="true">
    <path d="M14 2 h12 v80 h-12z" fill="#d6453a" />
    <path d="M14 2 h4 v80 h-4z" fill="#ef6a5e" />
    <path d="M14 82 h12 v8 h-12z" fill="#c9ccd6" />
    <path d="M14 90 h12 l-6 22 z" fill="#f2d7b0" />
    <path d="M18 104 h4 l-2 8 z" fill="#b3261e" />
    <path d="M26 10 h4 v40 h-4z" fill="#9aa3b5" />
  </svg>
);

function Sheet({ p, n }) {
  const desc = vi(p.desc) || 'Đang cập nhật…';
  const tilt = (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -7}deg`);
    e.currentTarget.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 9}deg`);
    e.currentTarget.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const untilt = (e) => { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg'); };
  return (
    <article className="hs-sheet" style={{ '--tilt': `${TILT[n % TILT.length]}deg` }} onPointerMove={tilt} onPointerLeave={untilt}>
      <span className="hs-clip" aria-hidden="true" />
      <span className="hs-shine" aria-hidden="true" />
      <header className="hs-head">
        <span><small>Họ và tên:</small> <i>Vũ Đình Đạt</i></span>
        <span><small>Môn:</small> <i>{p.category || '—'}</i></span>
        <span><small>Năm:</small> <i>{p.year || '—'}</i></span>
      </header>
      <div className="hs-score" aria-label="Điểm 10">
        <svg viewBox="0 0 120 90" aria-hidden="true"><path pathLength="1" d="M60 8 C 20 6, 6 30, 12 52 C 18 78, 70 86, 98 70 C 120 56, 112 18, 72 10 C 60 8, 48 12, 40 16" /></svg>
        <b>10</b>
        <em>{REMARKS[n % REMARKS.length]}</em>
      </div>
      <h3 className="hs-q">{p.title}</h3>
      {p.thumb && <figure className="hs-img"><img src={asset(p.thumb)} alt={p.title} /></figure>}
      <p className="hs-label"><Tick />Bài làm:</p>
      <p className="hs-a">{desc.split(/(\s+)/).map((w, i) => (/\s/.test(w) ? w : <span key={i} className="hs-w">{w}</span>))}</p>
      {(p.tags || []).length > 0 && (
        <>
          <p className="hs-label"><Tick />Công cụ đã dùng:</p>
          <ul className="hs-tags">{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
        </>
      )}
      <footer className="hs-foot">
        {p.repo && <a href={p.repo} target="_blank" rel="noreferrer" onMouseEnter={() => thock(1.4)}>Xem mã nguồn →</a>}
        {p.demo && <a href={p.demo} target="_blank" rel="noreferrer" onMouseEnter={() => thock(1.4)}>Chạy thử →</a>}
        <span className="hs-stamp" aria-hidden="true">Đã chấm</span>
      </footer>
      <Pen />
    </article>
  );
}

/* vị trí (x, y) của một phần tử so với tờ giấy */
const at = (sheet, el, dx = 0, dy = 0) => {
  let x = dx, y = dy, e = el;
  while (e && e !== sheet) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
  return { x, y };
};

/* dựng cảnh chấm bài cho một tờ giấy */
function gradeTimeline(sheet) {
  const pen = sheet.querySelector('.hs-pen');
  const score = sheet.querySelector('.hs-score');
  const ring = score.querySelector('path');
  const ticks = [...sheet.querySelectorAll('.hs-tick')];
  const words = sheet.querySelectorAll('.hs-w');
  const tags = sheet.querySelectorAll('.hs-tags li');
  const stamp = sheet.querySelector('.hs-stamp');
  const sw = score.offsetWidth, sh = score.offsetHeight;
  const c = at(sheet, score, sw / 2, sh / 2);
  // ngòi bút nằm ở đáy hình (x: giữa, y: cuối) nên dời hình lên trên ngòi
  const pw = pen.getBoundingClientRect().width || 40, ph = pw * 3;
  const tip = (x, y) => ({ x: x - pw / 2, y: y - ph * 0.93 });
  const ring8 = Array.from({ length: 9 }, (_, k) => {
    const a = -Math.PI / 2 - (k / 8) * Math.PI * 2;
    return tip(c.x + Math.cos(a) * sw * 0.46, c.y + Math.sin(a) * sh * 0.44);
  });

  const tl = gsap.timeline({ paused: true });
  tl.from(words, { opacity: 0, y: 6, duration: 0.25, stagger: { each: Math.min(0.03, 1.4 / Math.max(words.length, 1)) }, ease: 'power1.out' }, 0)
    .from(tags, { scale: 0, rotate: () => gsap.utils.random(-20, 20), duration: 0.35, stagger: 0.06, ease: 'back.out(2.4)' }, 0.5);

  // bút bay vào từ góc phải, khoanh điểm
  const t0 = 0.7;
  tl.set(pen, { ...tip(sheet.offsetWidth + 60, -40), rotate: 28, opacity: 1 }, t0)
    .to(pen, { ...ring8[0], rotate: 18, duration: 0.45, ease: 'power2.out' }, t0)
    .add(() => buzz(), t0 + 0.45)
    .fromTo(ring, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: 'none' }, t0 + 0.45)
    .to(pen, { keyframes: ring8.slice(1).map((pt) => ({ ...pt, duration: 0.7 / 8, ease: 'none' })) }, t0 + 0.45)
    .from(score.querySelector('b'), { scale: 0, opacity: 0, duration: 0.3, ease: 'back.out(2.5)' }, t0 + 0.8)
    .from(score.querySelector('em'), { opacity: 0, x: -10, duration: 0.3 }, t0 + 1.05);

  // tích ✓ từng phần
  let t = t0 + 1.25;
  ticks.forEach((tk) => {
    const p0 = at(sheet, tk, 6, 18), p1 = at(sheet, tk, 34, 4);
    tl.to(pen, { ...tip(p0.x, p0.y), rotate: 8, duration: 0.3, ease: 'power2.inOut' }, t)
      .add(() => thock(1.5), t + 0.3)
      .fromTo(tk.querySelector('path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.22, ease: 'none' }, t + 0.3)
      .to(pen, { ...tip(p1.x, p1.y), duration: 0.22, ease: 'none' }, t + 0.3);
    t += 0.58;
  });

  // đóng dấu rồi bút bay đi
  tl.to(pen, { x: '+=160', y: '-=140', rotate: 50, opacity: 0, duration: 0.45, ease: 'power2.in' }, t)
    .fromTo(stamp, { scale: 3, opacity: 0, rotate: -40 }, { scale: 1, opacity: 0.85, rotate: -12, duration: 0.3, ease: 'power4.in', onComplete: thud }, t + 0.1)
    .fromTo(sheet, { x: 0 }, { keyframes: [{ x: -5 }, { x: 4 }, { x: -2 }, { x: 0 }], duration: 0.3, ease: 'none', clearProps: 'transform' }, t + 0.4);
  return tl;
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NOTES = ['Xem chi tiết!', 'Dự án này hay nè', 'Mở ra xem đi ✎', 'Bấm thử xem!'];
/* lời mời bấm vào, theo từng kiểu trình bày */
const CTA = { exam: 'Bấm để xem bài làm →', notebook: 'Lật vở xem tiếp →', sticky: 'Xem thêm →', polaroid: 'Xem dự án →', index: 'Xem chi tiết →', blueprint: 'MỞ BẢN VẼ →', chalk: 'Xem lời giải →', folder: 'Mở hồ sơ →', library: 'Mượn sách đọc →', terminal: '$ open --detail' };

/* một thẻ dự án, trình bày theo 1 trong 10 kiểu */
function Card({ p, n, onOpen }) {
  const desc = vi(p.desc) || 'Đang cập nhật…';
  const look = lookOf(p, n);
  const img = p.thumb ? asset(p.thumb) : null;
  const tags = p.tags || [];
  const tilt = (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget, r = el.getBoundingClientRect();
    el.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -10}deg`);
    el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 12}deg`);
  };
  const untilt = (e) => { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg'); };
  return (
    <div className="hp-slot" onPointerMove={tilt} onPointerLeave={untilt}>
      <button className={`hp-card hp-s-${look}`} style={{ '--tilt': `${TILT[n % TILT.length] * 2}deg` }} onClick={(e) => onOpen(n, e.currentTarget)}
        onMouseEnter={() => thock(1.6 + (n % 4) * 0.06)} aria-label={`Xem chi tiết: ${p.title}`}>
        {look === 'notebook' && <span className="hp-spiral" aria-hidden="true" />}
        {look === 'sticky' && <span className="hp-tape" aria-hidden="true" />}
        {look === 'polaroid' && <span className="hp-pin" aria-hidden="true" />}
        {look === 'folder' && <span className="hp-ftab" aria-hidden="true">{p.category || 'Dự án'}</span>}
        {look === 'terminal' && <span className="hp-bar" aria-hidden="true"><i /><i /><i /><small>~/{(p.id || p.title).toString().toLowerCase().replace(/\s+/g, '-').slice(0, 22)}</small></span>}
        <span className="hp-head"><small>{look === 'terminal' ? `# ${p.category || ''}` : `${CAT_IC[p.category] || '📁'} ${p.category || '—'}`}</small><small>{p.year || ''}</small></span>
        {look === 'exam' && (
          <span className="hp-score" aria-hidden="true">
            <svg viewBox="0 0 120 90"><path pathLength="1" d="M60 8 C 20 6, 6 30, 12 52 C 18 78, 70 86, 98 70 C 120 56, 112 18, 72 10 C 60 8, 48 12, 40 16" /></svg>
            <b>10</b>
          </span>
        )}
        {(img || look === 'polaroid') && <span className="hp-img">{img ? <img src={img} alt="" loading="lazy" draggable="false" /> : <span className="hp-ph">{CAT_IC[p.category] || '💡'}</span>}</span>}
        <span className="hp-q"><span className="hp-t">{look === 'terminal' && <em>$ cat </em>}{p.title}<svg className="hp-ul" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M2 8 C 40 2, 80 12, 120 6 S 180 4, 198 7" /></svg><span className="hp-pencil" aria-hidden="true" /></span></span>
        <span className="hp-ex">{desc}</span>
        <span className="hp-tags">{tags.slice(0, 3).map((t) => <i key={t}>{look === 'terminal' ? `--${t.toLowerCase().replace(/\s+/g, '-')}` : t}</i>)}{tags.length > 3 && <i className="more">+{tags.length - 3}</i>}</span>
        {look === 'library' && <span className="hp-due" aria-hidden="true">ĐÃ MƯỢN · {p.year || ''}</span>}
        <span className="hp-foot">{CTA[look]}</span>
        <span className="hp-ear" aria-hidden="true" />
      </button>
      <span className="hp-note" aria-hidden="true">{NOTES[n % NOTES.length]}</span>
    </div>
  );
}

/* tờ bài phóng to giữa màn hình + bút đỏ chấm bài */
function Paper({ list, at, from, onClose }) {
  const ref = useRef(null);
  const [i, setI] = useState(at);
  const busy = useRef(false);
  const first = useRef(true);
  const { lenis } = useDiary() || {};
  useEffect(() => { lenis?.current?.stop(); return () => lenis?.current?.start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const q = gsap.utils.selector(ref);
    const sheet = q('.hs-sheet')[0];
    if (reduced()) return undefined;
    sheet.classList.add('hs-wait');
    const isFirst = first.current;
    const tl = gsap.timeline();
    if (isFirst) {
      first.current = false; whoosh();
      tl.fromTo(q('.hp-bg'), { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0);
      const r = sheet.getBoundingClientRect();
      if (from) tl.from(sheet, { x: from.left + from.width / 2 - (r.left + r.width / 2), y: from.top + from.height / 2 - (r.top + r.height / 2), scale: Math.min(1, from.width / r.width), rotate: -6, duration: 0.6, ease: 'power3.inOut' }, 0);
      tl.from(q('.hp-ui > *'), { y: 20, opacity: 0, stagger: 0.05, duration: 0.35 }, 0.4);
    }
    tl.add(() => { sheet.classList.remove('hs-wait'); const g = gradeTimeline(sheet); g.eventCallback('onComplete', () => chime(true)); g.play(); }, isFirst ? 0.65 : 0.55);
    return () => { tl.kill(); };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (to) => {
    if (busy.current || list.length < 2) return;
    const n = (to + list.length) % list.length, d = to > i ? 1 : -1;
    busy.current = true; whoosh();
    const sheet = ref.current.querySelector('.hs-sheet');
    gsap.to(sheet, { x: -d * 140, rotate: -d * 10, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => {
      setI(n);
      requestAnimationFrame(() => {
        const s2 = ref.current?.querySelector('.hs-sheet'); if (!s2) return;
        gsap.fromTo(s2, { x: d * 140, rotate: d * 10, opacity: 0 }, { x: 0, rotate: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)', clearProps: 'transform,opacity', onComplete: () => { busy.current = false; } });
      });
    } });
  };
  const close = () => {
    gsap.to(ref.current.querySelector('.hp-box'), { y: 60, rotate: 4, opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to(ref.current, { opacity: 0, duration: 0.32, onComplete: onClose });
  };
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const p = list[i];
  return createPortal(
    <div className="hp-wrap" ref={ref} role="dialog" aria-modal="true" aria-label={p.title}>
      <div className="hp-bg" onClick={close} />
      <div className="hp-box" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        <div className="hs"><Sheet key={p.id || i} p={p} n={i} /></div>
      </div>
      <div className="hp-ui">
        <button className="hp-nav" onClick={() => go(i - 1)} aria-label="Bài trước">‹</button>
        <span>Bài {i + 1} / {list.length}</span>
        <button className="hp-nav" onClick={() => go(i + 1)} aria-label="Bài sau">›</button>
      </div>
      <button className="hp-x" onClick={close} aria-label="Đóng">✕</button>
    </div>,
    document.body,
  );
}

export default function ProjectsPage() {
  const ed = useEditable(projects, 'projects');
  const list = ed.items;
  const cats = useMemo(() => [...new Set(list.map((p) => p.category).filter(Boolean))], [list]);
  const [tab, setTab] = useState('all');
  const [view, setView] = useState(null);
  const shown = tab === 'all' ? list : list.filter((p) => p.category === tab);
  const root = useRef(null);
  const busy = useRef(false);
  const first = useRef(true);

  /* chia bài: các tờ bay từ chồng giấy trên bàn giáo viên xuống từng chỗ */
  const deal = (cards, desk) => {
    let d = desk.getBoundingClientRect();
    if (!d.width) d = root.current.querySelector('.hs-tabs').getBoundingClientRect();
    const tl = gsap.timeline();
    cards.forEach((c, k) => {
      const r = c.getBoundingClientRect();
      tl.fromTo(c, { x: d.left + d.width / 2 - (r.left + r.width / 2), y: d.top + d.height / 2 - (r.top + r.height / 2), rotate: gsap.utils.random(-30, 30), scale: 0.35, opacity: 0 },
        { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, duration: 0.75, ease: 'power3.out', clearProps: 'transform,opacity', onStart: () => thock(1.3 + k * 0.05) }, k * 0.12);
    });
    // rồi mỗi kiểu có một hiệu ứng riêng khi đặt xuống bàn
    cards.forEach((c, k) => {
      const t = 0.55 + k * 0.12, $ = (sel) => c.querySelector(sel);
      if ($('.hp-score')) {
        tl.fromTo($('.hp-score path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, ease: 'power1.inOut' }, t)
          .fromTo($('.hp-score b'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(3)' }, t + 0.3);
      }
      if ($('.hp-s-polaroid')) tl.fromTo($('.hp-img'), { filter: 'brightness(2.2) sepia(0.6) blur(6px)' }, { filter: 'brightness(1) sepia(0) blur(0px)', duration: 1.8, ease: 'power2.out', clearProps: 'filter' }, t);
      if ($('.hp-s-sticky')) tl.fromTo($('.hp-card'), { rotateX: 40, transformOrigin: '50% 0%' }, { rotateX: 0, duration: 1.2, ease: 'elastic.out(1, 0.35)', clearProps: 'transform' }, t);
      if ($('.hp-s-terminal')) tl.fromTo($('.hp-ex'), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'steps(8)', clearProps: 'clipPath' }, t);
      if ($('.hp-s-chalk')) tl.fromTo([$('.hp-t'), $('.hp-ex')], { opacity: 0, filter: 'blur(3px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.8, stagger: 0.2, clearProps: 'filter,opacity' }, t);
      if ($('.hp-s-blueprint')) tl.fromTo($('.hp-card'), { backgroundSize: '0px 0px, 0px 0px, 100% 100%' }, { backgroundSize: '20px 20px, 20px 20px, 100% 100%', duration: 0.9, ease: 'power2.out', clearProps: 'backgroundSize' }, t);
      if ($('.hp-due')) tl.fromTo($('.hp-due'), { scale: 2.6, opacity: 0, rotate: -30 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.3, ease: 'power4.in', onComplete: thud }, t + 0.2);
      if ($('.hp-ftab')) tl.fromTo($('.hp-ftab'), { y: 20 }, { y: 0, duration: 0.5, ease: 'back.out(3)' }, t);
      if ($('.hp-s-notebook')) tl.fromTo($('.hp-ul path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, clearProps: 'strokeDashoffset' }, t);
    });
    return tl;
  };

  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      if (first.current) {
        first.current = false;
        gsap.from(q('.hs-tabs button'), { y: 30, opacity: 0, stagger: 0.07, duration: 0.5, ease: 'back.out(2)', delay: 0.3 });
      }
      const cards = q('.hp-slot');
      gsap.set(cards, { opacity: 0 });
      ScrollTrigger.create({ trigger: q('.hp-grid')[0], start: 'top 80%', once: true, onEnter: () => deal(cards, q('.hp-stack')[0]) });
    }, root);
    return () => ctx.revert();
  }, [tab, list]);

  // đổi môn: thu bài về chồng rồi chia lại
  const pick = (t) => {
    if (t === tab || busy.current) return;
    busy.current = true; whoosh();
    let d = root.current.querySelector('.hp-stack').getBoundingClientRect();
    if (!d.width) d = root.current.querySelector('.hs-tabs').getBoundingClientRect();
    const cards = [...root.current.querySelectorAll('.hp-slot')];
    if (!cards.length || reduced()) { busy.current = false; setTab(t); return; }
    cards.forEach((c, k) => {
      const r = c.getBoundingClientRect();
      gsap.to(c, { x: d.left + d.width / 2 - (r.left + r.width / 2), y: d.top + d.height / 2 - (r.top + r.height / 2), rotate: gsap.utils.random(-20, 20), scale: 0.35, opacity: 0, duration: 0.45, delay: k * 0.04, ease: 'power2.in',
        onComplete: k === cards.length - 1 ? () => { busy.current = false; setTab(t); } : undefined });
    });
  };
  const count = (c) => list.filter((p) => p.category === c).length;
  const open = (n, el) => { const r = el.getBoundingClientRect(); setView({ n, from: { left: r.left, top: r.top, width: r.width, height: r.height } }); };

  return (
    <div className="hs hp" ref={root}>
      <div className="hs-drawer hp-drawer">
        <div className="hs-tabs" role="tablist" aria-label="Chọn môn">
          <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => pick('all')}>🗂 Tất cả <b>{list.length}</b></button>
          {cats.map((c) => (
            <button key={c} role="tab" aria-selected={tab === c} className={tab === c ? 'on' : ''} onClick={() => pick(c)}>{CAT_IC[c] || '📁'} {c} <b>{count(c)}</b></button>
          ))}
        </div>
        <span className="hp-stack" aria-hidden="true"><i /><i /><i /></span>
      </div>
      <div className="hp-grid">
        {shown.map((p) => <Card key={p.id || p.title} p={p} n={list.indexOf(p)} onOpen={open} />)}
      </div>
      {view && <Paper list={list} at={view.n} from={view.from} onClose={() => setView(null)} />}
      {ed.canEdit && <ListEditor ed={ed} label="dự án" fields={PROJ_FIELDS} blank={PROJ_BLANK} preview={PROJ_PREVIEW} />}
    </div>
  );
}
