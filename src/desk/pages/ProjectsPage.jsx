/*
 * Trang "Dự án": tủ hồ sơ bài kiểm tra.
 * Mỗi dự án là một tờ bài kiểm tra đã chấm điểm, kẹp ghim, xếp theo ngăn (MOBILE / IOT / WEB).
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import projects from '../../data/projects.json';
import { ListEditor, useEditable } from '../Editor';
import { vi } from '../Diary';
import { thock, whoosh } from '../sound';
import { PROJ_BLANK, PROJ_FIELDS, PROJ_PREVIEW } from '../fields';

gsap.registerPlugin(ScrollTrigger);

const CAT_IC = { MOBILE: '📱', IOT: '🛰', WEB: '🌐' };
const REMARKS = ['Xuất sắc!', 'Rất sáng tạo!', 'Ý tưởng hay, phát huy!', 'Trình bày rõ ràng!', 'Làm kỹ, rất tốt!', 'Tuyệt vời!'];
const TILT = [-0.8, 0.6, -0.4, 0.9, -0.6, 0.4];

function Sheet({ p, n }) {
  const desc = vi(p.desc);
  return (
    <article className="hs-sheet" style={{ '--tilt': `${TILT[n % TILT.length]}deg` }}>
      <span className="hs-clip" aria-hidden="true" />
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
      <p className="hs-label">Bài làm:</p>
      <p className="hs-a">{desc || 'Đang cập nhật…'}</p>
      {(p.tags || []).length > 0 && (
        <>
          <p className="hs-label">Công cụ đã dùng:</p>
          <ul className="hs-tags">{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
        </>
      )}
      <footer className="hs-foot">
        {p.repo && <a href={p.repo} target="_blank" rel="noreferrer" onMouseEnter={() => thock(1.4)}>Xem mã nguồn →</a>}
        {p.demo && <a href={p.demo} target="_blank" rel="noreferrer" onMouseEnter={() => thock(1.4)}>Chạy thử →</a>}
        <span className="hs-stamp" aria-hidden="true">Đã chấm</span>
      </footer>
    </article>
  );
}

export default function ProjectsPage() {
  const ed = useEditable(projects, 'projects');
  const list = ed.items;
  const cats = useMemo(() => [...new Set(list.map((p) => p.category).filter(Boolean))], [list]);
  const [tab, setTab] = useState('all');
  const shown = tab === 'all' ? list : list.filter((p) => p.category === tab);
  const root = useRef(null);

  // các tờ bài lần lượt trượt ra khỏi ngăn tủ, vòng điểm đỏ được khoanh khi tờ bài hiện ra
  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      if (reduce) return;
      const sheets = gsap.utils.toArray('.hs-sheet');
      gsap.from(sheets, { y: 70, opacity: 0, rotate: (i) => (i % 2 ? 4 : -4), duration: 0.7, stagger: 0.09, ease: 'back.out(1.4)', clearProps: 'transform,opacity' });
      sheets.forEach((s) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: s, start: 'top 80%' } });
        tl.fromTo(s.querySelector('.hs-score path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' })
          .from(s.querySelectorAll('.hs-score b, .hs-score em'), { scale: 1.8, opacity: 0, duration: 0.3, stagger: 0.12, ease: 'back.out(2)' }, '-=0.15')
          .from(s.querySelector('.hs-stamp'), { scale: 2.4, opacity: 0, rotate: -30, duration: 0.3, ease: 'power4.in' }, '-=0.1');
      });
    }, root);
    return () => ctx.revert();
  }, [tab, list]);

  const pick = (t) => { if (t === tab) return; whoosh(); setTab(t); };
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
