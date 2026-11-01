/*
 * Trang "Thành tích": THƯ VIỆN PHÉP THUẬT.
 *  - Mỗi thành tích là một cuốn sách trên kệ gỗ (gáy sách có tên, năm, ký hiệu công nghệ phát sáng).
 *    Nhiều thành tích vẫn gọn: sách xếp sát nhau trên nhiều tầng kệ, lọc theo từng kệ.
 *  - Rê chuột: sách nhô ra, bụi phép lấp lánh. Bấm: sách bay ra giữa, bìa mở, trang hiện ảnh giấy khen
 *    và lời kể; lật trang qua lại bằng nút, phím ← → hoặc vuốt.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import data from '../../data/achievements.json';
import { asset } from '../../utils/asset';
import { thock, whoosh, chime } from '../sound';
import { reduced } from '../Fx';
import { ListEditor, useEditable } from '../Editor';
import { useDiary } from '../Diary';
import { ACH_BLANK, ACH_FIELDS, ACH_PREVIEW } from '../fields';

/* tỉ lệ ảnh có sẵn */
const AR = {
  '/uploads/tot-nghiep-trung-cap-mums91zd.jpg': 1.299, '/uploads/sinh-vien-xuat-sac-mumsbc7t.jpg': 1.394, '/uploads/sinh-vien-xuat-sac-mumsdspk.jpg': 1.437,
  '/uploads/sinh-vien-5-tot-cap-truong-2023-2024-mumsfx46.jpg': 0.769, '/uploads/sinh-vien-xuat-sac-mumshfn7.jpg': 1.415, '/uploads/sinh-vien-tieu-bieu-mumsjhua.jpg': 1.4,
  '/uploads/khen-thuong-doan-thanh-nien-mumsmvsp.jpg': 1.358, '/uploads/khen-thuong-hoi-sinh-vien-mumsohj9.jpg': 1.371, '/uploads/khen-thuong-hoi-sinh-vien-dhtn-mumspmxa.jpg': 1.333,
  '/uploads/sinh-vien-khoe-mumsqsz7.jpg': 1.281, '/uploads/sinh-vien-5-tot-cap-truong-mumsrspx.jpg': 0.746, '/uploads/sinh-vien-5-tot-cap-dhtn-mumssdu8.jpg': 0.755,
  '/uploads/do-an-he-cu-nhan-dat-diem-cao-nhat-hoi-d-mumt4bwf.jpg': 0.75, '/uploads/bai-bao-nckh-dang-tren-tap-chi-kh-cn-dht-mumt6h8q.jpg': 0.594,
  '/uploads/giai-nhi-cuoc-thi-phat-trien-phan-mem-ng-mumt7u9l.jpg': 0.75,
};
const yearOf = (d) => { const m = String(d).match(/(\d{4})/g); return m ? +m[m.length - 1] : 0; };
const SHELF = {
  'Học tập': { ic: '📘', rune: '∑', hues: ['#2c4f8f', '#1f3a6e', '#3d64a8', '#24467d', '#4a5fa0'], name: 'Kệ Học tập', tag: 'bùa chú của giảng đường' },
  'Hoạt động': { ic: '🌿', rune: '⚡', hues: ['#2f6b4f', '#24563f', '#3f7d5c', '#1f4a37', '#4c8a63'], name: 'Kệ Hoạt động', tag: 'những chuyến phiêu lưu cùng bạn bè' },
  'Cuộc thi': { ic: '🏆', rune: '</>', hues: ['#8a2f3b', '#6e2430', '#a13d45', '#5c1f2b', '#93403a'], name: 'Kệ Cuộc thi', tag: 'chiến tích nơi đấu trường' },
};
const OTHER = { ic: '✨', rune: '◇', hues: ['#5a4a8a', '#463a70', '#6b5aa0'], name: 'Kệ khác', tag: 'những dấu mốc khác' };
const RUNES = ['∑', '⚡', '</>', 'λ', '∞', 'π', '◇', '⌘', '#', '01'];
const DECOR = ['🦉', '🔮', '🕯️', '🎓', '🤖', '🌐', '⏳', '🧪'];
const hashOf = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

function buildBooks(list) {
  const items = list.map((a) => ({ ...a, year: yearOf(a.date), img: a.image ? asset(a.image) : null, ar: AR[a.image] || 1.33 }))
    .sort((a, b) => a.year - b.year);
  return items.map((a, n) => {
    const S = SHELF[a.category] || OTHER; const h = hashOf(a.id || a.title);
    return { ...a, n, S, color: S.hues[h % S.hues.length], rune: RUNES[h % RUNES.length], hh: 78 + (h % 23), ww: 44 + ((h >> 3) % 14) };
  });
}

/* ---------- một cuốn sách trên kệ ---------- */
function Book({ b, onOpen }) {
  return (
    <button className={`tv-book ${b.featured ? 'gold' : ''}`} data-n={b.n} style={{ '--c': b.color, '--hh': b.hh + '%', '--ww': b.ww + 'px' }}
      onClick={(e) => onOpen(b.n, e.currentTarget)} onMouseEnter={() => thock(1.7 + (b.n % 5) * 0.08)} aria-label={`Mở sách: ${b.title}`}>
      <span className="tv-band t" />
      <span className="tv-rune">{b.rune}</span>
      <span className="tv-title">{b.title}</span>
      <span className="tv-year">{b.year || ''}</span>
      <span className="tv-band b" />
      {b.featured && <span className="tv-star">★</span>}
    </button>
  );
}

/* ---------- cả thư viện ---------- */
function Library({ books, onOpen }) {
  const root = useRef(null);
  const [tab, setTab] = useState('all');
  const [perRow, setPerRow] = useState(14);
  const cats = [...new Set(books.map((b) => b.category))];
  const shown = tab === 'all' ? books : tab === 'gold' ? books.filter((b) => b.featured) : books.filter((b) => b.category === tab);

  /* đo chiều rộng tủ để biết mỗi tầng chứa mấy cuốn */
  useLayoutEffect(() => {
    const el = root.current.querySelector('.tv-case');
    const fit = () => { const w = el.clientWidth - 40; setPerRow(Math.max(5, Math.floor(w / (window.innerWidth < 760 ? 38 : 62)) - 1)); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, []);
  const rows = [];
  for (let i = 0; i < shown.length; i += perRow) rows.push(shown.slice(i, i + perRow));
  while (rows.length < 3) rows.push([]);

  /* sách rơi xuống kệ mỗi lần đổi kệ */
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('.tv-book', { y: -70, rotate: () => gsap.utils.random(-25, 25), opacity: 0, duration: 0.7, ease: 'back.out(1.6)', stagger: { each: 0.035, from: 'random' }, clearProps: 'transform,opacity' });
      gsap.from('.tv-deco', { scale: 0, opacity: 0, duration: 0.6, delay: 0.4, ease: 'back.out(2)', stagger: 0.08, clearProps: 'transform,opacity' });
    }, root);
    return () => ctx.revert();
  }, [tab, perRow]);

  /* mở màn một lần: tủ sách trượt lên, đường mạch phép sáng dần */
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('.tv-case', { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out' });
      gsap.from('.tv-top > *', { y: -20, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' });
      gsap.fromTo('.tv-circuit path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut', stagger: 0.15 });
    }, root);
    return () => ctx.revert();
  }, []);

  /* bụi phép theo chuột trên tủ sách */
  const lastDust = useRef(0);
  const dust = (e) => {
    const now = performance.now(); if (now - lastDust.current < 45 || reduced()) return; lastDust.current = now;
    const host = root.current.querySelector('.tv-dust'); const r = host.getBoundingClientRect();
    const d = document.createElement('i'); d.style.left = `${e.clientX - r.left}px`; d.style.top = `${e.clientY - r.top}px`;
    d.style.setProperty('--dx', `${gsap.utils.random(-30, 30)}px`); d.style.setProperty('--dy', `${gsap.utils.random(-50, -10)}px`);
    host.appendChild(d); setTimeout(() => d.remove(), 900);
  };

  return (
    <div className="tv" ref={root}>
      <div className="tv-sky" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--y': `${(i * 53) % 60}%`, '--d': `${(i % 7) * 0.6}s` }} />)}</div>
      <svg className="tv-circuit" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength="1" d="M0 60 H180 L220 100 H420 L450 70 H640" /><path pathLength="1" d="M1200 40 H1010 L970 80 H780 L740 50 H600" />
        <path pathLength="1" d="M0 220 H120 L160 180 H300" /><path pathLength="1" d="M1200 230 H1060 L1020 190 H900" />
      </svg>
      <div className="tv-flies" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--x': `${(i * 71) % 100}%`, '--y': `${20 + ((i * 29) % 70)}%`, '--t': `${7 + (i % 5) * 1.7}s`, '--d': `-${i * 1.3}s` }} />)}</div>

      <header className="tv-top">
        <div className="tv-head">
          <span className="tv-emb">✦</span>
          <div><h1>Thư viện thành tích</h1><p>{books.length} cuốn sách phép · mỗi cuốn là một dấu mốc. Bấm vào gáy sách để mở.</p></div>
        </div>
        <nav className="tv-tabs" aria-label="Chọn kệ sách">
          <button className={tab === 'all' ? 'on' : ''} onClick={() => { setTab('all'); thock(1.3); }}>📚 Tất cả <b>{books.length}</b></button>
          {cats.map((c) => { const S = SHELF[c] || OTHER; return <button key={c} className={tab === c ? 'on' : ''} onClick={() => { setTab(c); thock(1.3); }}>{S.ic} {c} <b>{books.filter((b) => b.category === c).length}</b></button>; })}
          <button className={tab === 'gold' ? 'on' : ''} onClick={() => { setTab('gold'); thock(1.3); }}>★ Tiêu biểu <b>{books.filter((b) => b.featured).length}</b></button>
        </nav>
      </header>

      <div className="tv-case" onPointerMove={dust}>
        <span className="tv-crown" aria-hidden="true"><i>✦</i> {tab === 'all' ? 'Toàn bộ thư viện' : tab === 'gold' ? 'Những cuốn sách vàng' : (SHELF[tab] || OTHER).tag} <i>✦</i></span>
        {rows.map((row, r) => (
          <div className="tv-shelf" key={`${tab}-${r}`}>
            {row.map((b) => <Book key={b.id || b.n} b={b} onOpen={onOpen} />)}
            {row.length < perRow - 1 && <span className="tv-deco" style={{ '--r': `${(r * 7) % 9 - 4}deg` }}>{DECOR[(r + (tab.length || 0)) % DECOR.length]}</span>}
          </div>
        ))}
        <div className="tv-dust" aria-hidden="true" />
      </div>
    </div>
  );
}

/* ---------- sách mở ra ---------- */
function OpenBook({ books, at, from, onClose }) {
  const ref = useRef(null);
  const [i, setI] = useState(at);
  const [talk, setTalk] = useState(false);
  const [zoom, setZoom] = useState(false);
  const busy = useRef(false);
  const b = books[i];
  const { lenis } = useDiary() || {};

  useEffect(() => { lenis?.current?.stop(); return () => { lenis?.current?.start(); window.speechSynthesis?.cancel(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const burst = () => {
    const host = ref.current?.querySelector('.ob-burst'); if (!host || reduced()) return;
    for (let k = 0; k < 18; k++) {
      const s = document.createElement('i'); s.textContent = ['✦', '✧', '⋆', '✶'][k % 4]; host.appendChild(s);
      const a = (k / 18) * Math.PI * 2, d = 120 + Math.random() * 160;
      gsap.fromTo(s, { x: 0, y: 0, scale: 0.4, opacity: 1 }, { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 1.2, opacity: 0, rotate: 180, duration: 1.1 + Math.random() * 0.5, ease: 'power3.out', onComplete: () => s.remove() });
    }
  };

  useLayoutEffect(() => {
    const q = gsap.utils.selector(ref);
    whoosh();
    gsap.fromTo(q('.ob-bg'), { opacity: 0 }, { opacity: 1, duration: 0.4 });
    if (reduced()) return;
    const book = q('.ob-book')[0]; const r = book.getBoundingClientRect();
    const tl = gsap.timeline();
    if (from) tl.from(book, { x: from.left + from.width / 2 - (r.left + r.width / 2), y: from.top + from.height / 2 - (r.top + r.height / 2), scale: Math.max(0.08, from.height / r.height), rotateY: -70, duration: 0.75, ease: 'power3.out' });
    tl.fromTo(q('.ob-cover'), { rotateY: 0 }, { rotateY: -178, duration: 0.95, ease: 'power2.inOut', onStart: () => chime(true), onComplete: burst }, from ? '-=0.1' : 0)
      .set(q('.ob-cover'), { autoAlpha: 0 })
      .from(q('.ob-page.r > *'), { y: 16, opacity: 0, stagger: 0.06, duration: 0.45, ease: 'power3.out' }, '-=0.35')
      .from(q('.ob-ui > *'), { y: 20, opacity: 0, stagger: 0.05, duration: 0.4, ease: 'power3.out' }, '<');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* lật trang: một tờ giấy quay qua gáy, nội dung đổi ở giữa chừng */
  const go = (to) => {
    if (busy.current) return;
    const n = (to + books.length) % books.length; if (n === i) return;
    const d = to > i ? 1 : -1; busy.current = true; window.speechSynthesis?.cancel(); setTalk(false); setZoom(false); thock(1.1);
    if (reduced()) { setI(n); busy.current = false; return; }
    const leaf = ref.current.querySelector('.ob-leaf');
    gsap.timeline({ onComplete: () => { busy.current = false; } })
      .set(leaf, { autoAlpha: 1, rotateY: d > 0 ? 0 : -180, transformOrigin: '0% 50%' })
      .to(leaf, { rotateY: d > 0 ? -180 : 0, duration: 0.7, ease: 'power2.inOut' })
      .add(() => setI(n), 0.33)
      .set(leaf, { autoAlpha: 0 });
  };
  const close = () => {
    const q = gsap.utils.selector(ref);
    gsap.to(q('.ob-book'), { scale: 0.85, y: 40, opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to(ref.current, { opacity: 0, duration: 0.32, onComplete: onClose });
  };
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const touch = useRef(null);
  const speak = () => {
    const s = window.speechSynthesis; if (!s) return;
    if (talk) { s.cancel(); setTalk(false); return; }
    const u = new SpeechSynthesisUtterance(`Chương ${b.n + 1}. ${b.title}. ${b.date}. ${b.desc || ''}`);
    u.lang = 'vi-VN'; const v = s.getVoices().find((x) => x.lang?.toLowerCase().startsWith('vi')); if (v) u.voice = v;
    u.rate = 0.95; u.onend = () => setTalk(false); s.cancel(); s.speak(u); setTalk(true);
  };

  return createPortal(
    <div className="ob-wrap" ref={ref} style={{ '--c': b.color }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1)); }}>
      <div className="ob-bg" onClick={close} />
      <div className="ob-burst" aria-hidden="true" />
      <div className="ob-book">
        <div className="ob-page l">
          <div className="ob-photo" onClick={() => b.img && setZoom(!zoom)}>
            {b.img ? <img src={b.img} alt={b.title} draggable="false" /> : <span className="ob-ph">{b.S.ic}</span>}
            <span className="ob-corner tl" /><span className="ob-corner tr" /><span className="ob-corner bl" /><span className="ob-corner br" />
          </div>
          <small className="ob-pno">— {b.n * 2 + 1} —</small>
        </div>
        <div className="ob-page r">
          <span className="ob-chap">Chương {b.n + 1} · {b.S.name}</span>
          <h2>{b.title}</h2>
          <span className="ob-date">🗓 {b.date}</span>
          <p className="ob-story">{b.desc || 'Một trang ghi dấu cố gắng, được cất giữ trong thư viện này.'}</p>
          {b.featured && <span className="ob-seal">★<small>tiêu biểu</small></span>}
          <span className="ob-rune">{b.rune}</span>
          <small className="ob-pno">— {b.n * 2 + 2} —</small>
        </div>
        <div className="ob-leaf" aria-hidden="true" />
        <div className="ob-cover" aria-hidden="true"><span className="ob-cover-in"><i>✦</i><b>{b.title}</b><small>{b.year}</small></span></div>
      </div>
      <div className="ob-ui">
        <button className="ob-nav" onClick={() => go(i - 1)} aria-label="Trang trước">‹</button>
        <span className="ob-count">{i + 1} / {books.length}</span>
        {b.img && <button onClick={() => setZoom(!zoom)}>{zoom ? <>↙<span> Thu nhỏ</span></> : <>🔍<span> Xem ảnh lớn</span></>}</button>}
        {'speechSynthesis' in window && <button className={talk ? 'on' : ''} onClick={speak}>{talk ? <>⏹<span> Dừng</span></> : <>🔊<span> Kể chuyện</span></>}</button>}
        <button className="ob-nav" onClick={() => go(i + 1)} aria-label="Trang sau">›</button>
      </div>
      <button className="ob-x" onClick={close} aria-label="Đóng sách">✕</button>
      {zoom && b.img && <div className="ob-zoom" onClick={() => setZoom(false)}><img src={b.img} alt={b.title} /></div>}
    </div>,
    document.body,
  );
}

export default function Museum() {
  const [view, setView] = useState(null);
  const ed = useEditable(data, 'achievements');
  const books = useMemo(() => buildBooks(ed.items), [ed.items]);
  const open = (n, el) => { const r = el.getBoundingClientRect(); setView({ n, from: { left: r.left, top: r.top, width: r.width, height: r.height } }); };
  return (
    <div className="mz">
      <Library books={books} onOpen={open} />
      {view && books.length > 0 && <OpenBook books={books} at={Math.min(view.n, books.length - 1)} from={view.from} onClose={() => setView(null)} />}
      {ed.canEdit && <ListEditor ed={ed} label="thành tích" fields={ACH_FIELDS} blank={ACH_BLANK} preview={ACH_PREVIEW} />}
    </div>
  );
}
