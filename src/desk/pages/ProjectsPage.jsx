/*
 * Trang "Dự án": tủ hồ sơ bài kiểm tra.
 * Mỗi dự án là một tờ bài kiểm tra: ngăn tủ trượt ra, chữ hiện như đang viết,
 * cây bút đỏ bay vào khoanh điểm, tích từng phần rồi đóng dấu "Đã chấm".
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import projects from '../../data/projects.json';
import { ListEditor, useEditable } from '../Editor';
import { vi } from '../Diary';
import { buzz, thock, thud, whoosh } from '../sound';
import { PROJ_BLANK, PROJ_FIELDS, PROJ_PREVIEW } from '../fields';

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
      <h3 className="hs-q"><span>Câu {n + 1}.</span> {p.title}</h3>
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

export default function ProjectsPage() {
  const ed = useEditable(projects, 'projects');
  const list = ed.items;
  const cats = useMemo(() => [...new Set(list.map((p) => p.category).filter(Boolean))], [list]);
  const [tab, setTab] = useState('all');
  const shown = tab === 'all' ? list : list.filter((p) => p.category === tab);
  const root = useRef(null);
  const busy = useRef(false);
  const first = useRef(true);

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      if (first.current) {
        first.current = false;
        // ngăn tủ trượt ra, nhãn tủ đung đưa
        gsap.from(q('.hs-drawer'), { y: -40, opacity: 0, duration: 0.6, ease: 'back.out(1.6)' });
        gsap.from(q('.hs-tabs button'), { y: 30, opacity: 0, stagger: 0.07, duration: 0.5, ease: 'back.out(2)', delay: 0.2 });
        gsap.fromTo(q('.hs-label-card'), { rotate: 14, transformOrigin: '50% 0%' }, { rotate: 1.5, duration: 1.6, ease: 'elastic.out(1.2, 0.3)', delay: 0.35 });
      }
      // các tờ bài rút ra khỏi ngăn
      gsap.from(q('.hs-sheet'), { y: 120, rotateX: -60, opacity: 0, transformPerspective: 900, transformOrigin: '50% 0%', duration: 0.8, stagger: 0.1, ease: 'back.out(1.3)', clearProps: 'transform,opacity' });
      // tờ nào lọt vào màn hình thì được chấm
      q('.hs-sheet').forEach((s) => {
        s.classList.add('hs-wait');
        ScrollTrigger.create({ trigger: s, start: 'top 72%', once: true, onEnter: () => gsap.delayedCall(0.15, () => { s.classList.remove('hs-wait'); gradeTimeline(s).play(); }) });
      });
    }, root);
    return () => ctx.revert();
  }, [tab, list]);

  // đổi ngăn: các tờ cũ bay vào ngăn, tờ mới rút ra
  const pick = (t) => {
    if (t === tab || busy.current) return;
    busy.current = true; whoosh();
    gsap.to(root.current.querySelectorAll('.hs-sheet'), {
      y: -60, x: () => gsap.utils.random(-80, 80), rotate: () => gsap.utils.random(-25, 25), scale: 0.85, opacity: 0,
      duration: 0.35, stagger: 0.04, ease: 'power2.in',
      onComplete: () => { busy.current = false; setTab(t); },
    });
  };
  const count = (c) => list.filter((p) => p.category === c).length;

  return (
    <div className="hs" ref={root}>
      <div className="hs-drawer">
        <div className="hs-tabs" role="tablist" aria-label="Ngăn hồ sơ">
          <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => pick('all')}>🗂 Tất cả <b>{list.length}</b></button>
          {cats.map((c) => (
            <button key={c} role="tab" aria-selected={tab === c} className={tab === c ? 'on' : ''} onClick={() => pick(c)}>{CAT_IC[c] || '📁'} {c} <b>{count(c)}</b></button>
          ))}
        </div>
        <div className="hs-label-card"><span>HỒ SƠ BÀI KIỂM TRA</span><b>Vũ Đình Đạt</b><small>{shown.length} bài · đã chấm điểm</small></div>
      </div>
      <div className="hs-grid">
        {shown.map((p) => <Sheet key={p.id || p.title} p={p} n={list.indexOf(p)} />)}
      </div>
      {ed.canEdit && <ListEditor ed={ed} label="dự án" fields={PROJ_FIELDS} blank={PROJ_BLANK} preview={PROJ_PREVIEW} />}
    </div>
  );
}
