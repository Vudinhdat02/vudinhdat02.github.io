/*
 * Trang "Thành tích": "Tạp chí Đạt Hoa Quả" — mỗi năm một số báo, trang nhất kiểu báo cổ (Magazine).
 * Chữ trên báo sửa được ở chế độ quản trị: src/data/magazine.json (tên báo, dòng phụ, rao vặt…),
 * còn tít / bài của từng tin sửa trong danh sách thành tích (ô "Tít trên Tạp chí", "Bài viết trên Tạp chí").
 * Trang này không phát âm thanh.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import data from '../../data/achievements.json';
import statsData from '../../data/stats.json';
import { asset } from '../../utils/asset';
import { reduced } from '../Fx';
import { DocEditor, ListEditor, useEditable, useEditableDoc } from '../Editor';
import magData from '../../data/magazine.json';
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
    .sort((a, b) => a.year - b.year || String(a.date).localeCompare(String(b.date)))
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

/* ---------- "Tạp chí Đạt Hoa Quả": mỗi năm là một số báo (trang nhất kiểu báo cổ) ----------
 *  Đầu báo chữ gô-tích, dải thông tin số báo, tin chính (thành tích tiêu biểu / mới nhất của năm) với ảnh lớn,
 *  các cột tin phụ, hộp "Bảng tin" (số liệu), hộp "Mục rao vặt" vui, nhãn tròn "TIN NÓNG".
 *  Chuyển giữa các số báo bằng nút, phím ← → hoặc vuốt: trang báo lật như giở báo.
 *  Ảnh in kiểu báo cũ (ngả màu nâu), rê chuột vào thì hiện màu thật; ảnh dọc / ngang đều hiện trọn.
 *  Bấm vào một tin để mở giấy khen. Trang này không phát âm thanh. */
const CAT = { 'Học tập': 'c-hoc', 'Hoạt động': 'c-hd', 'Cuộc thi': 'c-thi' };
const KICKER = { 'Học tập': 'Giáo dục', 'Hoạt động': 'Đời sống – Xã hội', 'Cuộc thi': 'Thể thao trí tuệ' };
const MAG_FIELDS = [
  { key: 'name', label: 'Tên tờ báo', type: 'text', required: true },
  { key: 'tagline', label: 'Dòng nhỏ trên đầu báo', type: 'text' },
  { key: 'place', label: 'Nơi phát hành', type: 'text' },
  { key: 'subtitle', label: 'Dòng giới thiệu ({span} = khoảng năm, vd 2021 – 2026)', type: 'text' },
  { key: 'price', label: 'Giá báo', type: 'text' },
  { key: 'hot', label: 'Nhãn tròn đỏ (vd: TIN NÓNG 🔥)', type: 'text' },
  { key: 'reporter', label: 'Tên phóng viên ở đầu mỗi bài', type: 'text' },
  { key: 'boardTitle', label: 'Tiêu đề hộp số liệu', type: 'text' },
  { key: 'adsTitle', label: 'Tiêu đề hộp rao vặt', type: 'text' },
  { key: 'ads', label: 'Rao vặt: mỗi dòng một tin, dạng "TIÊU ĐỀ: nội dung"', type: 'area' },
  { key: 'more', label: 'Tiêu đề phần tin khác ({year} = năm)', type: 'text' },
  { key: 'foot', label: 'Dòng nhỏ cuối báo', type: 'text' },
];
const SCHOL = /học\s*b[ổọo]ng|KKHT/i;
const leadOf = (list) => [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || String(b.date).localeCompare(String(a.date)))[0];
const headline = (a, y) => (a.headline?.trim() ? a.headline : a.featured ? `${a.title}: dấu son của năm ${y}` : `${a.title} — thêm một cột mốc năm ${y}`);
const story = (a, y, rep = 'PV Tạp chí Đạt Hoa Quả') => {
  if (a.story?.trim()) return a.story;
  const d = a.desc && !/^https?:\/\//.test(a.desc) ? a.desc.replace(/\s*https?:\/\/\S+/g, '').trim() : '';
  const base = `${rep} — Năm ${y}, Vũ Đình Đạt ghi tên mình vào danh sách “${a.title}”${a.category ? ` ở mảng ${a.category.toLowerCase()}` : ''}.`;
  return d ? `${base} ${d.endsWith('.') ? d : d + '.'}` : `${base} Một bước tiến nhỏ trên hành trình dài, nhưng là niềm vui lớn của cả “toà soạn”.`;
};
function Magazine({ items, onOpen }) {
  const root = useRef(null);
  const mag = useEditableDoc(magData, 'magazine');
  const [editMag, setEditMag] = useState(false);
  const M = { ...magData, ...(mag.doc || {}) };
  const ads = String(M.ads || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(':'); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', l]; });
  const [tab, setTab] = useState('all');
  const cats = [...new Set(items.map((a) => a.category).filter(Boolean))];
  const shown = tab === 'all' ? items : tab === 'gold' ? items.filter((a) => a.featured) : items.filter((a) => a.category === tab);
  const issues = useMemo(() => {
    const m = new Map(); shown.forEach((a) => { const y = a.year || 0; if (!m.has(y)) m.set(y, []); m.get(y).push(a); });
    return [...m.entries()].sort((a, b) => b[0] - a[0]).map(([y, list], k, arr) => ({ y, list, no: arr.length - k }));
  }, [shown]);
  const [at, setAt] = useState(0);
  const busy = useRef(false);
  const issue = issues[Math.min(at, issues.length - 1)];
  const years = items.map((a) => a.year).filter(Boolean);
  const span = years.length ? `${Math.min(...years)} – ${Math.max(...years)}` : '';
  const count = (c) => items.filter((a) => a.category === c).length;
  const gpa = (statsData.find((s) => /gpa/i.test(s.label || '')) || {}).value || '';
  useEffect(() => { setAt(0); }, [tab]);

  /* lật sang số báo khác: trang cũ gập lại, trang mới mở ra */
  const go = (to) => {
    if (busy.current || !issues.length) return;
    const n = (to + issues.length) % issues.length; if (n === at) return;
    const page = root.current.querySelector('.mg-page');
    if (reduced() || !page) { setAt(n); return; }
    busy.current = true; const d = n > at ? 1 : -1;
    gsap.to(page, { rotateY: -80 * d, opacity: 0, transformOrigin: d > 0 ? '0% 50%' : '100% 50%', duration: 0.45, ease: 'power2.in', onComplete: () => { setAt(n); requestAnimationFrame(() => {
      const p2 = root.current?.querySelector('.mg-page'); if (!p2) { busy.current = false; return; }
      gsap.fromTo(p2, { rotateY: 80 * d, opacity: 0, transformOrigin: d > 0 ? '100% 50%' : '0% 50%' }, { rotateY: 0, opacity: 1, duration: 0.6, ease: 'power3.out', clearProps: 'transform,opacity', onComplete: () => { busy.current = false; } });
    }); } });
  };
  useEffect(() => {
    const k = (e) => { if (e.target.closest?.('input,textarea') || document.querySelector('.hd-wrap')) return; if (e.key === 'ArrowRight') go(at + 1); if (e.key === 'ArrowLeft') go(at - 1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const touch = useRef(null);

  /* mở màn mỗi số báo: tờ báo xoay bay vào, chữ đầu báo rơi xuống, các cột chữ hiện dần, nhãn "TIN NÓNG" bật ra */
  useLayoutEffect(() => {
    if (reduced() || !issue) return undefined;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.mg-page', start: 'top 85%', once: true } });
      tl.from('.mg-page', { y: 80, rotate: -6, scale: 0.9, opacity: 0, duration: 0.8, ease: 'power3.out', clearProps: 'transform,opacity' })
        .from('.mg-mast .ch', { y: -50, opacity: 0, rotate: () => gsap.utils.random(-30, 30), duration: 0.5, stagger: 0.035, ease: 'back.out(2)' }, 0.3)
        .from('.mg-rule, .mg-bar > *', { scaleX: 0, opacity: 0, duration: 0.4, stagger: 0.05, transformOrigin: '0% 50%' }, 0.6)
        .from('.mg-lead h3, .mg-story h4', { clipPath: 'inset(0 100% 0 0)', duration: 0.6, stagger: 0.08, ease: 'power2.out' }, 0.8)
        .from('.mg-col p, .mg-box li', { opacity: 0, y: 8, duration: 0.35, stagger: 0.03 }, 1)
        .from('.mg-fig', { scale: 0.85, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'back.out(1.5)' }, 0.9)
        .from('.mg-hot', { scale: 0, rotate: -200, duration: 0.7, ease: 'back.out(2.6)' }, 1.3)
        .fromTo('.mg-stamp', { scale: 2.6, opacity: 0, rotate: -30 }, { scale: 1, opacity: 0.9, rotate: -10, duration: 0.3, ease: 'power4.in', stagger: 0.12 }, 1.5);
    }, root);
    return () => ctx.revert();
  }, [issue?.y, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => { gsap.fromTo('.yb-sum > *, .mg-issues > *', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: 'back.out(2)', delay: 0.1, clearProps: 'transform,opacity' }); }, root);
    return () => ctx.revert();
  }, []);

  const pick = (t) => { if (t !== tab) setTab(t); };
  const openA = (e, a) => onOpen(a.n, e.currentTarget.querySelector('.mg-fig img') || e.currentTarget);
  const Fig = ({ a, big, stamp }) => (
    <span className={`mg-fig ${big ? 'big' : ''} ${a.ar < 0.95 ? 'tall' : 'wide'}`}>
      {a.img ? <img src={a.img} alt={a.title} loading={big ? 'eager' : 'lazy'} draggable="false" onLoad={(e) => { const im = e.currentTarget, tall = im.naturalHeight > im.naturalWidth * 1.05, f = im.closest('.mg-fig'); f?.classList.toggle('tall', tall); f?.classList.toggle('wide', !tall); }} /> : <span className="yb-ph">{IC[a.category] || '✦'}</span>}
      {stamp && a.featured && <span className="mg-stamp" aria-hidden="true">Tiêu biểu</span>}
    </span>
  );
  const lead = issue ? leadOf(issue.list) : null;
  const rest = issue ? issue.list.filter((a) => a !== lead) : [];
  const mast = M.name || 'Tạp chí Đạt Hoa Quả';
  const fill = (t, y) => String(t || '').replace('{span}', span).replace('{year}', y);
  return (
    <div className="mg" ref={root}>
      {mag.canEdit && <button className="mg-edit" onClick={() => setEditMag(true)}>✎ Sửa chữ trên báo</button>}
      {editMag && <DocEditor ed={mag} title="Sửa nội dung Tạp chí" fields={MAG_FIELDS} onClose={() => setEditMag(false)} />}

      {issues.length > 0 && (
        <nav className="mg-issues" aria-label="Chọn số báo">
          <button className="mg-arrow" onClick={() => go(at - 1)} aria-label="Số mới hơn">‹</button>
          {issues.map((s, k) => <button key={s.y} className={k === at ? 'on' : ''} onClick={() => go(k)}>Số {s.y || '—'}</button>)}
          <button className="mg-arrow" onClick={() => go(at + 1)} aria-label="Số cũ hơn">›</button>
        </nav>
      )}

      {issue && (
        <div className="mg-desk" onTouchStart={(e) => { touch.current = e.touches[0].clientX; }} onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 70) go(at + (dx < 0 ? 1 : -1)); }}>
          <article className="mg-page" key={tab + issue.y}>
            <span className="mg-hot" aria-hidden="true">{M.hot}</span>
            <header className="mg-head">
              <p className="mg-top"><span>{M.tagline}</span><span>Năm {issue.y}</span></p>
              <h2 className="mg-mast" aria-label={mast}>{[...mast].map((c, k) => <span key={k} className="ch">{c === ' ' ? ' ' : c}</span>)}</h2>
              <span className="mg-rule" />
              <p className="mg-bar">
                <span>Số {issue.no} · {issue.list.length} tin</span>
                {M.place && <span>{M.place}</span>}
                {M.subtitle && <span>{fill(M.subtitle, issue.y)}</span>}
                {M.price && <span>{M.price}</span>}
              </p>
              <span className="mg-rule thin" />
            </header>

            <div className="mg-grid">
              <button className={`mg-lead ${CAT[lead.category] || ''}`} onClick={(e) => openA(e, lead)} aria-label={`Đọc tin: ${lead.title}`}>
                <small className="mg-kicker">{KICKER[lead.category] || 'Tin chính'} · {lead.date}</small>
                <h3>{headline(lead, issue.y)}</h3>
                <Fig a={lead} big stamp />
                <span className="mg-cap">Ảnh: {lead.title} ({lead.date}). Bấm để xem bản gốc.</span>
                <span className="mg-col"><p className="mg-drop">{story(lead, issue.y, M.reporter)}</p></span>
              </button>

              <aside className="mg-side">
                <section className="mg-box">
                  <h4>{M.boardTitle}</h4>
                  <ul>
                    <li><span>Tin trong số này</span><b>{issue.list.length}</b></li>
                    <li><span>Tổng số thành tích</span><b>{items.length}</b></li>
                    <li><span>Năm có học bổng KKHT</span><b>{new Set(items.filter((a) => SCHOL.test(`${a.title} ${a.desc || ''}`)).map((a) => a.date)).size}</b></li>
                    {gpa && <li><span>GPA tích luỹ</span><b>{gpa}</b></li>}
                    <li><span>Thành tích tiêu biểu</span><b>{items.filter((a) => a.featured).length}</b></li>
                  </ul>
                </section>
                <section className="mg-box ads">
                  <h4>{M.adsTitle}</h4>
                  <ul>{ads.map(([t, x], k) => <li key={k}>{t && <b>{t}:</b>} {x}</li>)}</ul>
                </section>
              </aside>
            </div>

            {rest.length > 0 && (
              <div className="mg-more">
                <h4 className="mg-sec">{fill(M.more, issue.y)}</h4>
                <div className="mg-stories">
                  {rest.map((a) => (
                    <button key={a.id || a.n} className={`mg-story ${CAT[a.category] || ''} ${a.featured ? 'star' : ''}`} onClick={(e) => openA(e, a)} aria-label={`Đọc tin: ${a.title}`}>
                      <small className="mg-kicker">{KICKER[a.category] || 'Tin vắn'} · {a.date}</small>
                      <h4>{a.title}</h4>
                      <Fig a={a} stamp />
                      <span className="mg-col"><p>{story(a, issue.y, M.reporter)}</p></span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <footer className="mg-foot"><span>{mast} · Số {issue.no}</span><span>{at + 1} / {issues.length} số báo{M.foot ? " · " + M.foot : ""}</span></footer>
          </article>
        </div>
      )}
      {issues.length === 0 && <p className="hw-empty">Chưa có thành tích nào ở mục này.</p>}
    </div>
  );
}

/* ---------- xem chi tiết một thành tích ---------- */
function Detail({ items, at, from, onClose }) {
  const ref = useRef(null);
  const [i, setI] = useState(at);
  const [zoom, setZoom] = useState(false);
  const busy = useRef(false);
  const a = items[i];
  const { lenis } = useDiary() || {};

  useEffect(() => { lenis?.current?.stop(); return () => { lenis?.current?.start(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    tl.add(() => { if (a.featured) confetti(); }, 0.6)
      .from(q('.hd-info > *'), { x: 30, opacity: 0, stagger: 0.07, duration: 0.5, ease: 'power3.out' }, 0.45)
      .from(q('.hd-ui > *'), { y: 20, opacity: 0, stagger: 0.05, duration: 0.4, ease: 'power3.out' }, 0.6);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (to) => {
    if (busy.current || items.length < 2) return;
    const n = (to + items.length) % items.length; const d = to > i ? 1 : -1;
    busy.current = true; setZoom(false);
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
      <Magazine items={items} onOpen={open} />
      {view && items.length > 0 && <Detail items={items} at={Math.min(view.n, items.length - 1)} from={view.from} onClose={() => setView(null)} />}
      {ed.canEdit && <ListEditor ed={ed} label="thành tích" fields={ACH_FIELDS} blank={ACH_BLANK} preview={ACH_PREVIEW} />}
    </div>
  );
}
