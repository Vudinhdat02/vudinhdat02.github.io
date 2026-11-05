/*
 * NHẬT KÝ — dữ liệu dùng chung + các cách hiển thị.
 *
 *  <DiaryProvider>   giữ danh sách bài, quyển sổ đang mở, khung viết bài (dùng chung cho trang chủ và cửa sổ Nhật ký)
 *  <DiaryHome>       trang chủ: một dây phơi với vài bài mới nhất + nút mở cả cuốn
 *  <DiaryBoard>      trong cửa sổ Nhật ký: 3 kiểu xem (dây phơi / cuộn phim / bàn ảnh), đổi kiểu có hiệu ứng biến hình
 *
 * Hiệu ứng khi thao tác: ảnh "rửa" dần khi hiện ra, nghiêng 3D + vệt sáng theo chuột, thả tim bung trái tim,
 * mở sổ (bìa lật ra), lật trang sang bài trước/sau, đăng bài thì máy ảnh lấy liền in ra tấm ảnh.
 *
 * Dữ liệu: src/data/blog.json (dùng chung với web cũ). Viết bài mới:
 *   - trên máy: npm run dev → mở http://localhost:5173 → nút "Viết" trên thanh menu
 *   - trên web thật: thêm #admin vào địa chỉ, đăng nhập bằng mật khẩu quản trị
 */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import blogData from '../data/blog.json';
import { EDIT_MODE, newId, removeUpload, uploadImage, useEditableList } from '../admin/adminApi';
import { asset } from '../utils/asset';
import { looksLikeImage, toWebImage } from '../utils/image';
import { thock, whoosh, thud, pop, shutter } from './sound';

gsap.registerPlugin(Flip, ScrollTrigger);

// bản xem thử: cho thử khung viết bài, nhưng bài chỉ nằm trong trình duyệt
export const DEMO = import.meta.env.VITE_DESK_DEMO === '1';
export const CAN_WRITE = EDIT_MODE || DEMO;

export const vi = (v) => (typeof v === 'object' && v ? v.vi || v.en || '' : v || '');
const today = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
const WEEKDAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const parseDate = (s) => { const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
const longDate = (s) => { const d = parseDate(s); return d ? `${WEEKDAY[d.getDay()]}, ngày ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}` : s; };
const monthKey = (s) => { const d = parseDate(s); return d ? `Tháng ${d.getMonth() + 1} · ${d.getFullYear()}` : 'Kỷ niệm'; };
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LIKE_KEY = 'desk.likes';

/* ---------- kiểu trình bày một trang nhật ký (chọn khi viết bài) ---------- */
export const DY_LAYOUTS = [
  { key: 'polaroid', name: 'Ảnh lớn', ic: '🖼' },
  { key: 'grid', name: 'Lưới ảnh', ic: '▦' },
  { key: 'stack', name: 'Chồng ảnh', ic: '🗂' },
  { key: 'film', name: 'Cuộn phim', ic: '🎞' },
  { key: 'scrap', name: 'Sổ dán ảnh', ic: '📎' },
  { key: 'full', name: 'Tràn trang', ic: '⬛' },
];
export const DY_FONTS = [
  { key: 'hand', name: 'Viết tay', css: "'Patrick Hand', 'Comic Sans MS', cursive", fs: 1 },
  { key: 'round', name: 'Bút bi', css: "'Pangolin', 'Patrick Hand', cursive", fs: 0.95, g: 'Pangolin' },
  { key: 'script', name: 'Thư pháp', css: "'Dancing Script', cursive", fs: 1.12, g: 'Dancing+Script:wght@500;700' },
  { key: 'print', name: 'Chữ in', css: "'Be Vietnam Pro', system-ui, sans-serif", fs: 0.82 },
  { key: 'classic', name: 'Cổ điển', css: "'Playfair Display', Georgia, serif", fs: 0.88 },
  { key: 'type', name: 'Máy đánh chữ', css: "'JetBrains Mono', monospace", fs: 0.76 },
];
export const DY_COLORS = [
  { key: 'ink', name: 'Mực xanh', c: '#24306a' },
  { key: 'black', name: 'Mực đen', c: '#1f1f24' },
  { key: 'red', name: 'Mực đỏ', c: '#c0392b' },
  { key: 'green', name: 'Xanh lá', c: '#1e7a4c' },
  { key: 'purple', name: 'Tím', c: '#6b3fa0' },
  { key: 'brown', name: 'Nâu gỗ', c: '#8a5a2b' },
  { key: 'pink', name: 'Hồng', c: '#d6457a' },
];
const pick = (list, k) => list.find((x) => x.key === k) || list[0];
const loaded = new Set();
/* tải thêm phông chữ (chỉ khi có bài dùng tới) */
export function ensureFont(key) {
  const f = pick(DY_FONTS, key);
  if (!f.g || loaded.has(f.g)) return;
  loaded.add(f.g);
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${f.g}&display=swap`;
  document.head.appendChild(l);
}
/* biến CSS cho chữ của một bài */
export function lookVars(look) {
  const f = pick(DY_FONTS, look?.font), c = pick(DY_COLORS, look?.color);
  return { '--dy-font': f.css, '--dy-fs': f.fs, '--dy-color': c.c };
}

function groupByMonth(list) {
  const groups = [];
  list.forEach((it) => {
    const k = monthKey(it.p.date);
    const g = groups[groups.length - 1];
    if (g && g.key === k) g.posts.push(it); else groups.push({ key: k, posts: [it] });
  });
  return groups;
}

/* ================================================================
 *  Kho dữ liệu nhật ký
 * ================================================================ */
const Ctx = createContext(null);
export const useDiary = () => useContext(Ctx);

export function DiaryProvider({ lenis, children }) {
  const { items, commit, status } = useEditableList(blogData, 'blog');
  const [local, setLocal] = useState(null);
  const posts = local || items;
  const [book, setBook] = useState(null); // { i, k, from }
  const [form, setForm] = useState(null);
  const [likes, setLikes] = useState(() => { try { return JSON.parse(localStorage.getItem(LIKE_KEY) || '[]'); } catch { return []; } });

  useEffect(() => {
    if (!book && !form) { if (!document.querySelector('.pl-wrap, .lb-wrap')) lenis?.current?.start(); return; }
    lenis?.current?.stop();
  }, [book, form, lenis]);

  const toggleLike = useCallback((id, el) => {
    setLikes((l) => {
      const on = !l.includes(id);
      const next = on ? [...l, id] : l.filter((x) => x !== id);
      try { localStorage.setItem(LIKE_KEY, JSON.stringify(next)); } catch { /* bỏ qua */ }
      if (on && el) burst(el);
      return next;
    });
  }, []);

  const save = async (f) => {
    if (DEMO && !EDIT_MODE) {
      const images = f.images.map((im) => im.url || URL.createObjectURL(im.file));
      const entry = { id: f.id || newId(), title: f.title, date: f.date, text: f.text, images, look: f.look };
      const base = [...posts];
      if (f.index >= 0) base[f.index] = entry; else base.unshift(entry);
      setLocal(base);
      return entry;
    }
    const images = [];
    for (const im of f.images) images.push(im.file ? await uploadImage(im.file, f.title || 'nhat-ky') : im.url);
    const prev = f.index >= 0 ? posts[f.index] : null;
    const entry = { ...(prev || {}), id: prev?.id || newId(), title: f.title, date: f.date, text: f.text, images, look: f.look };
    delete entry.ratios;
    const next = prev ? posts.map((x, i) => (i === f.index ? entry : x)) : [entry, ...posts];
    if (!(await commit(next))) throw new Error(status.error || 'Chưa lưu được, thử lại nhé.');
    (prev?.images || []).filter((u) => !images.includes(u)).forEach(removeUpload);
    return entry;
  };
  const remove = async (i) => {
    const gone = posts[i];
    if (DEMO && !EDIT_MODE) { setLocal(posts.filter((_, j) => j !== i)); setBook(null); return; }
    if (await commit(posts.filter((_, j) => j !== i))) { (gone.images || []).forEach(removeUpload); setBook(null); }
  };

  const api = useMemo(() => ({
    posts, likes, toggleLike, lenis,
    openBook: (i, from) => setBook({ i, k: 0, from }),
    openPost: (id) => { const i = posts.findIndex((p) => p.id === id); if (i >= 0) setBook({ i, k: 0 }); },
    openNew: () => setForm({ index: -1, title: '', date: today(), text: '', images: [], look: { layout: 'polaroid', font: 'hand', color: 'ink' } }),
  }), [posts, likes, toggleLike]);

  const edit = () => { const p = posts[book.i]; setForm({ index: book.i, id: p.id, title: vi(p.title), date: vi(p.date), text: vi(p.text), images: (p.images || []).map((url) => ({ url })), look: { layout: 'polaroid', font: 'hand', color: 'ink', ...(p.look || {}) } }); };

  return (
    <Ctx.Provider value={api}>
      {children}
      {book && posts[book.i] && createPortal(
        <Book key="book" posts={posts} at={book} setAt={setBook} onClose={() => setBook(null)} likes={likes} toggleLike={toggleLike}
          onEdit={CAN_WRITE ? edit : null} onDelete={CAN_WRITE ? () => remove(book.i) : null} />, document.body)}
      {form && createPortal(<Composer form={form} onClose={() => setForm(null)} onSave={save} />, document.body)}
    </Ctx.Provider>
  );
}

/* trái tim bung ra từ nút thích */
function burst(el) {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  pop();
  for (let n = 0; n < 14; n++) {
    const h = document.createElement('span');
    h.className = 'heart-p';
    h.textContent = ['❤', '♥', '✿', '★'][n % 4];
    h.style.left = cx + 'px'; h.style.top = cy + 'px';
    h.style.color = ['#e8434f', '#ff7aa2', '#ffb347', '#f5c542'][n % 4];
    document.body.appendChild(h);
    const a = (n / 14) * Math.PI * 2 + Math.random() * 0.4, d = 50 + Math.random() * 60;
    gsap.fromTo(h, { x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }, {
      x: Math.cos(a) * d, y: Math.sin(a) * d - 30, scale: 1 + Math.random() * 0.6, rotate: gsap.utils.random(-90, 90), opacity: 0,
      duration: 0.9 + Math.random() * 0.4, ease: 'power3.out', onComplete: () => h.remove(),
    });
  }
  gsap.fromTo(el, { scale: 1.6 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' });
}

/* ================================================================
 *  Một tấm polaroid
 * ================================================================ */
export function Polaroid({ p, i, n = 0, peg = true, big = false }) {
  const { openBook, likes, toggleLike } = useDiary();
  const card = useRef(null);
  const liked = likes.includes(p.id);
  const tilt = (e) => {
    if (reduced() || e.pointerType === 'touch') return;
    const r = card.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    gsap.to(card.current, { '--rx': `${(0.5 - py) * 16}deg`, '--ry': `${(px - 0.5) * 18}deg`, '--px': `${px * 100}%`, '--py': `${py * 100}%`, duration: 0.3, ease: 'power2.out' });
  };
  const untilt = () => gsap.to(card.current, { '--rx': '0deg', '--ry': '0deg', duration: 0.8, ease: 'elastic.out(1, 0.4)' });
  useEffect(() => { if (p.look?.font) ensureFont(p.look.font); }, [p.look?.font]);
  return (
    <div className={`hang ${big ? 'big' : ''} ${p.look ? 'dy-styled' : ''}`} data-flip-id={p.id} style={{ '--tilt': `${((i * 53) % 9) - 4}deg`, ...(p.look ? lookVars(p.look) : {}) }}>
      {peg && <span className="peg" />}
      <div ref={card} className="pcard" role="button" tabIndex={0} onPointerMove={tilt} onPointerLeave={untilt}
        onClick={(e) => { thock(1.2); openBook(i, e.currentTarget.querySelector('.pc-photo').getBoundingClientRect()); }}
        onKeyDown={(e) => e.key === 'Enter' && openBook(i)}>
        <span className="pc-photo">
          {p.images?.length ? <img src={asset(p.images[0])} alt="" loading="lazy" /> : <span className="pc-noimg">{vi(p.text).slice(0, 90)}…</span>}
          {p.images?.length > 1 && <span className="pc-count">📷 {p.images.length}</span>}
          <span className="pc-shine" />
        </span>
        <span className="pc-cap">{vi(p.title)}</span>
        <span className="pc-foot">
          <span className="pc-date">{vi(p.date)}</span>
          <button className={`pc-like ${liked ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); toggleLike(p.id, e.currentTarget); }} aria-label={liked ? 'Bỏ thích' : 'Thích'} aria-pressed={liked}>{liked ? '❤' : '♡'}</button>
        </span>
      </div>
    </div>
  );
}

/* ảnh "rửa" dần như phim polaroid khi lần đầu lọt vào màn hình */
function useDevelop(root, deps) {
  useEffect(() => {
    const els = root.current?.querySelectorAll('.pc-photo:not(.dev)') || [];
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('dev'); io.unobserve(e.target); } }), { threshold: 0.35 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/* đung đưa theo tốc độ cuộn (trang chủ: theo trang; cửa sổ: theo khung cuộn của cửa sổ) */
function useSwing(root, scroller, deps) {
  useEffect(() => {
    if (reduced()) return undefined;
    const el = scroller ? root.current?.closest('.win-body') : window;
    if (!el) return undefined;
    let last = scroller ? el.scrollTop : window.scrollY, lt = performance.now(), settle;
    const onScroll = () => {
      const y = scroller ? el.scrollTop : window.scrollY, t = performance.now();
      const v = gsap.utils.clamp(-16, 16, ((y - last) / Math.max(8, t - lt)) * 9);
      last = y; lt = t;
      if (Math.abs(v) < 0.8) return;
      root.current?.querySelectorAll('.hang').forEach((h, n) => gsap.to(h, { rotation: v * (n % 2 ? 0.8 : 1.15), duration: 0.35, ease: 'power2.out', overwrite: 'auto' }));
      clearTimeout(settle);
      settle = setTimeout(() => root.current && gsap.to(root.current.querySelectorAll('.hang'), { rotation: 0, duration: 2.2, ease: 'elastic.out(1, 0.18)', overwrite: 'auto' }), 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(settle); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ================================================================
 *  Trang chủ: một dây phơi, vài bài mới nhất
 * ================================================================ */
export function DiaryHome({ limit = 8, perRow = 4, onOpenAll }) {
  const { posts, openNew } = useDiary();
  const root = useRef(null);
  const shown = posts.slice(0, limit);
  useDevelop(root, [shown.length]);
  useSwing(root, false, [shown.length]);
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const st = { refreshPriority: -1 };
      gsap.fromTo(q('.dy-title'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none', scrollTrigger: { trigger: q('.dy-title')[0], start: 'top 85%', end: 'top 55%', scrub: 1, ...st } });
      q('.dy-line').forEach((line) => {
        const rope = line.querySelector('.rope path');
        if (rope) { const len = rope.getTotalLength(); gsap.fromTo(rope, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: line, start: 'top 90%', end: 'top 45%', scrub: 1, ...st } }); }
        gsap.from(line.querySelectorAll('.hang'), { y: -200, opacity: 0, rotate: () => gsap.utils.random(-30, 30), duration: 1.3, ease: 'elastic.out(1, 0.4)', stagger: 0.12, scrollTrigger: { trigger: line, start: 'top 72%', toggleActions: 'play none none reverse', ...st } });
      });
      gsap.from(q('.dy-more'), { scale: 0, rotate: -20, duration: 0.6, ease: 'back.out(2)', scrollTrigger: { trigger: q('.dy-more')[0], start: 'top 90%', ...st } });
    }, root);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [shown.length]);
  return (
    <section className="diary" id="muc-nhat-ky" ref={root}>
      <header className="dy-head">
        <h2 className="dy-title">Nhật ký · Dây phơi kỷ niệm 📸</h2>
        <p className="dy-sub">Vài tấm mới nhất. Bấm vào ảnh để mở sổ, bấm ♡ để thả tim.</p>
        {CAN_WRITE && <button className="dy-write" onClick={openNew}>✍ Viết nhật ký hôm nay</button>}
      </header>
      {Array.from({ length: Math.ceil(shown.length / perRow) || 1 }, (_, r) => (
        <div className="dy-line" key={r}>
          <svg className="rope" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true"><path d={r % 2 ? 'M0 14 Q 500 62 1000 6' : 'M0 10 Q 500 70 1000 10'} /></svg>
          <div className="dy-cards">{shown.slice(r * perRow, (r + 1) * perRow).map((p, j) => <Polaroid key={p.id || r * perRow + j} p={p} i={r * perRow + j} />)}</div>
        </div>
      ))}
      <div className="dy-more-row"><button className="dy-more" onClick={(e) => onOpenAll(e.currentTarget.getBoundingClientRect())}>Mở cả cuốn nhật ký ({posts.length} trang) →</button></div>
    </section>
  );
}

/* ================================================================
 *  Cửa sổ Nhật ký: 3 kiểu xem, lọc theo tháng
 * ================================================================ */
const MODES = [{ id: 'line', label: 'Dây phơi', ic: '〰' }, { id: 'film', label: 'Cuộn phim', ic: '🎞' }, { id: 'table', label: 'Bàn ảnh', ic: '▦' }];

export function DiaryBoard() {
  const { posts, openNew } = useDiary();
  const root = useRef(null);
  const flipState = useRef(null);
  const [mode, setMode] = useState('line');
  const [month, setMonth] = useState('all');
  const [q, setQ] = useState('');
  const months = useMemo(() => [...new Set(posts.map((p) => monthKey(p.date)))], [posts]);
  const list = posts.map((p, i) => ({ p, i })).filter(({ p }) => (month === 'all' || monthKey(p.date) === month) && (!q || `${vi(p.title)} ${vi(p.text)}`.toLowerCase().includes(q.toLowerCase())));

  const change = (fn) => { flipState.current = Flip.getState(root.current.querySelectorAll('.hang')); fn(); thock(1.1); };
  useLayoutEffect(() => {
    if (!flipState.current || reduced()) return;
    Flip.from(flipState.current, {
      duration: 0.85, ease: 'power3.inOut', stagger: 0.025, absolute: true, scale: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.3, rotate: -20 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.6)' }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.3, duration: 0.4 }),
    });
    flipState.current = null;
  }, [mode, month, q]);
  useDevelop(root, [mode, month, q, posts.length]);
  useSwing(root, false, [mode, month, posts.length]);

  // cuộn phim: lăn chuột dọc → phim chạy ngang, kéo được bằng chuột
  const film = useRef(null);
  useEffect(() => {
    const el = film.current;
    if (mode !== 'film' || !el) return undefined;
    const wheel = (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); gsap.to(el, { scrollLeft: el.scrollLeft + e.deltaY * 1.4, duration: 0.5, ease: 'power3.out', overwrite: 'auto' }); } };
    let down = null;
    const pd = (e) => { if (e.target.closest('button')) return; down = { x: e.clientX, s: el.scrollLeft, moved: false }; };
    const pm = (e) => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 5) down.moved = true; el.scrollLeft = down.s - dx; };
    const pu = (e) => { if (down?.moved) { e.preventDefault(); el.addEventListener('click', (c) => c.stopPropagation(), { capture: true, once: true }); } down = null; };
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu);
    return () => { el.removeEventListener('wheel', wheel); el.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); };
  }, [mode]);

  return (
    <div className={`dboard dboard-${mode}`} ref={root}>
      <div className="bd-bar">
        <div className="seg" role="tablist">
          {MODES.map((m) => <button key={m.id} role="tab" aria-selected={mode === m.id} className={mode === m.id ? 'on' : ''} onClick={() => mode !== m.id && change(() => setMode(m.id))}><span>{m.ic}</span>{m.label}</button>)}
        </div>
        <input className="bd-search" placeholder="Tìm trong nhật ký…" value={q} onChange={(e) => change(() => setQ(e.target.value))} />
        {CAN_WRITE && <button className="dy-write sm" onClick={openNew}>✍ Viết</button>}
      </div>
      <div className="bd-months">
        <button className={month === 'all' ? 'on' : ''} onClick={() => change(() => setMonth('all'))}>Tất cả · {posts.length}</button>
        {months.map((m) => <button key={m} className={month === m ? 'on' : ''} onClick={() => change(() => setMonth(m))}>{m}</button>)}
      </div>
      {DEMO && !EDIT_MODE && <p className="dy-demo">Bản xem thử: bạn viết thử được, nhưng bài chỉ nằm trong trình duyệt này.</p>}
      {!list.length && <p className="dy-empty">Không có trang nào khớp ✎</p>}

      {mode === 'line' && groupByMonth(list).map((g) => (
        <div className="dy-line" key={g.key}>
          <svg className="rope" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10 Q 500 70 1000 10" /></svg>
          <span className="dy-month">{g.key}</span>
          <div className="dy-cards">{g.posts.map(({ p, i }, n) => <Polaroid key={p.id || i} p={p} i={i} n={n} />)}</div>
        </div>
      ))}
      {mode === 'film' && (
        <div className="film" ref={film}>
          <div className="film-strip">{list.map(({ p, i }) => <Polaroid key={p.id || i} p={p} i={i} peg={false} />)}</div>
        </div>
      )}
      {mode === 'table' && <div className="table">{list.map(({ p, i }, n) => <Polaroid key={p.id || i} p={p} i={i} n={n} peg={false} big={n % 5 === 0} />)}</div>}
    </div>
  );
}

/* ================================================================
 *  Quyển sổ: mở bìa, lật ảnh, lật trang sang bài trước / sau
 * ================================================================ */
function Book({ posts, at, setAt, onClose, likes, toggleLike, onEdit, onDelete }) {
  const ref = useRef(null);
  const [sure, setSure] = useState(false);
  const [zoom, setZoom] = useState(null);
  const post = posts[at.i];
  useEffect(() => { if (post.look?.font) ensureFont(post.look.font); }, [post.look?.font]);
  const imgs = post.images || [];
  const k = at.k;
  const liked = likes.includes(post.id);

  useLayoutEffect(() => {
    const q = gsap.utils.selector(ref);
    whoosh();
    const tl = gsap.timeline();
    const bk = q('.bk')[0].getBoundingClientRect();
    const f = at.from;
    tl.fromTo(q('.bk-backdrop'), { opacity: 0 }, { opacity: 1, duration: 0.3 });
    if (f) tl.fromTo(q('.bk'), { x: f.left + f.width / 2 - (bk.left + bk.width / 2), y: f.top + f.height / 2 - (bk.top + bk.height / 2), scale: f.width / bk.width, rotate: -8, opacity: 0.6 }, { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, duration: 0.7, ease: 'expo.out' }, 0);
    else tl.fromTo(q('.bk'), { y: 120, scale: 0.7, rotate: -6, opacity: 0 }, { y: 0, scale: 1, rotate: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.4)' }, 0);
    tl.fromTo(q('.bk-cover'), { rotateY: 0 }, { rotateY: -178, duration: 0.9, ease: 'power3.inOut' }, 0.4)
      .set(q('.bk-cover'), { display: 'none' })
      .from(q('.bk-right .ln'), { clipPath: 'inset(0 100% 0 0)', stagger: 0.06, duration: 0.35, ease: 'none' }, 0.85)
      .from(q('.bk-left > *'), { y: -40, rotate: 8, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(1.6)' }, 0.75);
    return () => tl.kill();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const el = ref.current?.querySelector('.bk-photo img, .bk-full img, .bk-sk.top img');
    if (el) gsap.fromTo(el, { opacity: 0, x: 30, rotate: 2 }, { opacity: 1, x: 0, rotate: 0, duration: 0.45, ease: 'power3.out' });
  }, [k]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { if (zoom) setZoom(null); else close(); }
      if (e.key === 'ArrowRight' && imgs.length > 1) setAt((b) => ({ ...b, k: (b.k + 1) % imgs.length }));
      if (e.key === 'ArrowLeft' && imgs.length > 1) setAt((b) => ({ ...b, k: (b.k - 1 + imgs.length) % imgs.length }));
      if (e.key === 'PageDown' || e.key === ']') turn(1);
      if (e.key === 'PageUp' || e.key === '[') turn(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // lật trang: một tờ giấy quay quanh gáy sổ, nội dung đổi ở giữa chừng
  const turn = (d) => {
    const j = at.i + d;
    if (j < 0 || j >= posts.length) { gsap.fromTo(ref.current.querySelector('.bk'), { x: -d * 8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }); return; }
    const q = gsap.utils.selector(ref);
    thock(0.7); whoosh();
    setSure(false);
    gsap.timeline()
      .set(q('.bk-turn'), { display: 'block', rotateY: d > 0 ? 0 : -180, left: '50%', transformOrigin: 'left center' })
      .to(q('.bk-turn'), { rotateY: d > 0 ? -180 : 0, duration: 0.75, ease: 'power2.inOut' })
      .add(() => setAt({ i: j, k: 0 }), 0.37)
      .from(q('.bk-right .ln'), { clipPath: 'inset(0 100% 0 0)', stagger: 0.04, duration: 0.25, ease: 'none' }, 0.5)
      .set(q('.bk-turn'), { display: 'none' });
  };

  const close = () => gsap.to(ref.current.querySelector('.bk'), { y: 80, scale: 0.85, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: onClose });
  const lines = vi(post.text).split('\n');
  const layout = pick(DY_LAYOUTS, post.look?.layout).key;
  return (
    <div className="bk-wrap" ref={ref} role="dialog" aria-modal="true" aria-label={vi(post.title)}>
      <div className="bk-backdrop" onClick={close} />
      <div className={`bk ${post.look ? 'dy-styled' : ''}`} style={post.look ? lookVars(post.look) : undefined}>
        <div className={`bk-left lay-${layout}`}>
          <PhotoPage imgs={imgs} k={k} layout={layout} title={vi(post.title)} setK={(j) => setAt((b) => ({ ...b, k: j }))} onZoom={setZoom} />
        </div>
        <div className="bk-right">
          <p className="bk-date ln">{longDate(vi(post.date))}</p>
          <h3 className="bk-title ln">{vi(post.title)}</h3>
          {lines.map((l, j) => <p key={j} className="bk-text ln">{l || ' '}</p>)}
          <p className="bk-sign ln">— Đạt ✍</p>
          <div className="bk-tools">
            <button className={`bk-like ${liked ? 'on' : ''}`} onClick={(e) => toggleLike(post.id, e.currentTarget)}>{liked ? '❤ Đã thích' : '♡ Thích'}</button>
            {onEdit && <button onClick={onEdit}>Sửa</button>}
            {onDelete && <button className="del" onClick={() => (sure ? onDelete() : setSure(true))}>{sure ? 'Chắc chắn xoá?' : 'Xoá'}</button>}
          </div>
        </div>
        <div className="bk-turn" aria-hidden="true" />
        <div className="bk-cover"><span>NHẬT KÝ</span><small>Vũ Đình Đạt</small></div>
        <div className="bk-nav">
          <button onClick={() => turn(-1)} disabled={at.i === 0}>‹ Trang mới hơn</button>
          <span>{at.i + 1} / {posts.length}</span>
          <button onClick={() => turn(1)} disabled={at.i === posts.length - 1}>Trang cũ hơn ›</button>
        </div>
        <button className="bk-close" onClick={close} aria-label="Đóng">✕</button>
        {zoom && <div className="bk-zoom" onClick={() => setZoom(null)}><img src={asset(zoom)} alt="" /></div>}
      </div>
    </div>
  );
}

/* ---------- trang ảnh bên trái của cuốn sổ, theo kiểu trình bày đã chọn ---------- */
function PhotoPage({ imgs, k, layout, title, setK, onZoom }) {
  if (!imgs.length) return <div className="bk-doodle">✿ ✎ ☺</div>;
  const thumbs = imgs.length > 1 && (
    <div className="bk-thumbs">
      <button onClick={() => setK((k - 1 + imgs.length) % imgs.length)} aria-label="Ảnh trước">‹</button>
      {imgs.map((u, j) => <button key={u} className={j === k ? 'on' : ''} onClick={() => setK(j)}><img src={asset(u)} alt="" /></button>)}
      <button onClick={() => setK((k + 1) % imgs.length)} aria-label="Ảnh sau">›</button>
    </div>
  );
  if (layout === 'grid') {
    return (
      <div className={`bk-grid n${Math.min(imgs.length, 5)}`}>
        {imgs.map((u, j) => <button key={u} className="bk-tile" onClick={() => onZoom(u)} style={{ '--d': `${j * 0.06}s` }}><img src={asset(u)} alt={j === 0 ? title : ''} /></button>)}
      </div>
    );
  }
  if (layout === 'stack') {
    const order = imgs.map((_, j) => (k + j) % imgs.length).reverse();
    return (
      <div className="bk-stack" onClick={() => { thock(1.1); setK((k + 1) % imgs.length); }} role="button" tabIndex={0} aria-label="Ảnh tiếp theo">
        {order.map((j, z) => <figure key={imgs[j]} className={`bk-sk ${j === k ? 'top' : ''}`} style={{ '--r': `${((j * 41) % 15) - 7}deg`, '--x': `${((j * 23) % 30) - 15}px`, zIndex: z }}><img src={asset(imgs[j])} alt={j === k ? title : ''} /></figure>)}
        {imgs.length > 1 && <small className="bk-hint">bấm để xem ảnh tiếp · {k + 1}/{imgs.length}</small>}
      </div>
    );
  }
  if (layout === 'film') {
    return (
      <div className="bk-film">
        {imgs.map((u, j) => <button key={u} className="bk-frame" onClick={() => onZoom(u)}><img src={asset(u)} alt={j === 0 ? title : ''} /><small>{String(j + 1).padStart(2, '0')}A</small></button>)}
      </div>
    );
  }
  if (layout === 'scrap') {
    return (
      <div className="bk-scrap">
        {imgs.map((u, j) => (
          <button key={u} className="bk-cut" onClick={() => onZoom(u)} style={{ '--r': `${((j * 37) % 13) - 6}deg` }}>
            <span className="tape" /><img src={asset(u)} alt={j === 0 ? title : ''} />
          </button>
        ))}
        <span className="bk-sticker s1" aria-hidden="true">★</span><span className="bk-sticker s2" aria-hidden="true">♥</span>
      </div>
    );
  }
  if (layout === 'full') {
    return (
      <>
        <button className="bk-full" onClick={() => onZoom(imgs[k])}><img src={asset(imgs[k])} alt={title} /></button>
        {thumbs}
      </>
    );
  }
  return (
    <>
      <div className="bk-photo"><span className="tape" /><img src={asset(imgs[k])} alt={title} /></div>
      {thumbs}
    </>
  );
}

/* ================================================================
 *  Khung viết nhật ký + máy ảnh lấy liền khi đăng
 * ================================================================ */
function Composer({ form: init, onClose, onSave }) {
  const [f, setF] = useState(init);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const [printed, setPrinted] = useState(null);
  const ref = useRef(null);
  const previews = useRef(new Map());
  const urlOf = (im) => {
    if (im.url) return asset(im.url);
    if (!previews.current.has(im.file)) previews.current.set(im.file, URL.createObjectURL(im.file));
    return previews.current.get(im.file);
  };
  useLayoutEffect(() => {
    gsap.fromTo(ref.current.querySelector('.cp'), { y: 140, rotate: 4, opacity: 0 }, { y: 0, rotate: -0.6, opacity: 1, duration: 0.6, ease: 'back.out(1.3)' });
  }, []);

  const [reading, setReading] = useState(false);
  const addFiles = useCallback(async (files) => {
    const list = [...files].filter(looksLikeImage);
    if (!list.length) { if (files.length) setErr('File bạn chọn không phải ảnh. Hãy chọn ảnh JPG, PNG, WEBP hoặc HEIC.'); return; }
    setReading(true); setErr('');
    const ok = [], bad = [];
    for (const file of list) { try { ok.push({ file: await toWebImage(file) }); } catch (x) { bad.push(x.message); } }
    setReading(false);
    if (ok.length) { setF((s) => ({ ...s, images: [...s.images, ...ok] })); thock(1.3); }
    if (bad.length) setErr(bad.join(' '));
  }, []);
  useEffect(() => { DY_FONTS.forEach((x) => ensureFont(x.key)); }, []);
  const look = f.look || { layout: 'polaroid', font: 'hand', color: 'ink' };
  const setLook = (k, v) => { thock(1.4); setF((s) => ({ ...s, look: { ...look, ...(s.look || {}), [k]: v } })); };
  useEffect(() => {
    const onPaste = (e) => { const fl = [...(e.clipboardData?.files || [])]; if (fl.length) addFiles(fl); };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  // sau khi lưu: máy ảnh hiện ra, chớp đèn, nhả tấm ảnh, ảnh rửa dần rồi bay đi
  useLayoutEffect(() => {
    if (!printed) return;
    const q = gsap.utils.selector(ref);
    shutter();
    gsap.timeline({ onComplete: () => { previews.current.forEach((u) => URL.revokeObjectURL(u)); onClose(); } })
      .to(q('.cp'), { y: 60, scale: 0.9, opacity: 0, duration: 0.3, ease: 'power2.in' })
      .fromTo(q('.cam'), { y: 200, opacity: 0, rotate: -10 }, { y: 0, opacity: 1, rotate: 0, duration: 0.5, ease: 'back.out(1.6)' })
      .fromTo(q('.cam-flash'), { opacity: 0 }, { opacity: 1, duration: 0.06, yoyo: true, repeat: 1 })
      .fromTo(q('.cam-photo'), { yPercent: -100 }, { yPercent: 0, duration: 1, ease: 'steps(14)', onStart: () => thud() })
      .fromTo(q('.cam-photo img'), { filter: 'brightness(2.6) sepia(1) blur(6px) contrast(0.4)' }, { filter: 'brightness(1) sepia(0) blur(0px) contrast(1)', duration: 1.4, ease: 'power1.out' }, '-=0.4')
      .to(q('.cam-photo'), { y: -window.innerHeight * 0.7, x: 140, rotate: 18, scale: 0.6, opacity: 0, duration: 0.7, ease: 'power3.in' }, '+=0.25')
      .to(q('.cam'), { y: 240, opacity: 0, duration: 0.4, ease: 'power2.in' }, '-=0.4');
  }, [printed, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return setErr('Đặt một tiêu đề nhỏ cho ngày hôm nay nhé.');
    if (!f.text.trim() && !f.images.length) return setErr('Thêm ít nhất một tấm ảnh hoặc vài dòng chữ.');
    setBusy(true); setErr('');
    try {
      const entry = await onSave({ ...f, title: f.title.trim(), text: f.text.trim(), date: f.date.trim() || today() });
      setPrinted({ src: f.images[0] ? urlOf(f.images[0]) : '', title: entry.title });
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  const move = (j, d) => setF((s) => { const a = [...s.images]; const t = j + d; if (t < 0 || t >= a.length) return s; [a[j], a[t]] = [a[t], a[j]]; return { ...s, images: a }; });

  return (
    <div className="cp-wrap" ref={ref} role="dialog" aria-modal="true" aria-label="Viết nhật ký">
      <div className="bk-backdrop" onClick={() => !busy && onClose()} />
      <form className={`cp ${drag ? 'drag' : ''}`} onSubmit={submit}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles([...e.dataTransfer.files]); }}>
        <h3>{f.index >= 0 ? 'Sửa trang nhật ký' : 'Trang nhật ký mới'}</h3>
        <div className="cp-row">
          <label className="cp-f grow"><span>Tiêu đề</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Hôm nay mình đã…" autoFocus /></label>
          <label className="cp-f"><span>Ngày</span><input value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} placeholder="dd/mm/yyyy" /></label>
        </div>
        <div className="cp-photos">
          {f.images.map((im, j) => (
            <figure key={im.url || j} className="cp-ph" style={{ '--r': `${((j * 37) % 9) - 4}deg` }}>
              <img src={urlOf(im)} alt="" />
              <div className="cp-ph-tools">
                <button type="button" onClick={() => move(j, -1)} aria-label="Lên trước">‹</button>
                <button type="button" onClick={() => setF({ ...f, images: f.images.filter((_, x) => x !== j) })} aria-label="Bỏ ảnh">✕</button>
                <button type="button" onClick={() => move(j, 1)} aria-label="Ra sau">›</button>
              </div>
              {j === 0 && <figcaption>ảnh bìa</figcaption>}
            </figure>
          ))}
          <label className={`cp-add ${reading ? 'busy' : ''}`}>
            <input type="file" accept="image/*,.heic,.heif" multiple onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }} hidden />
            {reading ? <><b className="cp-spin">◌</b><span>Đang mở ảnh…</span></> : <><b>＋</b><span>Thêm ảnh<br /><small>hoặc kéo thả, dán (Ctrl+V)</small></span></>}
          </label>
        </div>
        <label className="cp-f"><span>Viết gì đó…</span><textarea rows={5} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="Kể lại một chút về ngày hôm nay" style={lookVars(look)} className="dy-styled-in" /></label>
        <fieldset className="cp-look">
          <legend>Kiểu trình bày khi khách xem</legend>
          <div className="cp-lrow"><span>Bố cục ảnh</span>
            <div className="cp-chips">{DY_LAYOUTS.map((x) => <button type="button" key={x.key} className={look.layout === x.key ? 'on' : ''} onClick={() => setLook('layout', x.key)} aria-pressed={look.layout === x.key}><i>{x.ic}</i>{x.name}</button>)}</div>
          </div>
          <div className="cp-lrow"><span>Kiểu chữ</span>
            <div className="cp-chips">{DY_FONTS.map((x) => <button type="button" key={x.key} className={look.font === x.key ? 'on' : ''} onClick={() => setLook('font', x.key)} aria-pressed={look.font === x.key} style={{ fontFamily: x.css }}>{x.name}</button>)}</div>
          </div>
          <div className="cp-lrow"><span>Màu chữ</span>
            <div className="cp-chips dots">{DY_COLORS.map((x) => <button type="button" key={x.key} className={look.color === x.key ? 'on' : ''} onClick={() => setLook('color', x.key)} aria-pressed={look.color === x.key} title={x.name} aria-label={x.name} style={{ '--c': x.c }} />)}</div>
          </div>
        </fieldset>
        {err && <p className="cp-err">{err}</p>}
        <div className="cp-actions">
          <button type="button" onClick={onClose} disabled={busy}>Huỷ</button>
          <button className="cp-go" disabled={busy || reading}>{busy ? 'Đang rửa ảnh…' : 'Chụp & kẹp lên dây 📸'}</button>
        </div>
      </form>
      {printed && (
        <div className="cam" aria-hidden="true">
          <div className="cam-photo">{printed.src ? <img src={printed.src} alt="" /> : <span className="pc-noimg">✎</span>}<b>{printed.title}</b></div>
          <div className="cam-body"><span className="cam-lens" /><span className="cam-flash" /><span className="cam-stripe" /><span className="cam-slot" /></div>
        </div>
      )}
    </div>
  );
}
