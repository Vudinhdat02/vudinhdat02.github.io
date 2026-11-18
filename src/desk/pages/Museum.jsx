/*
 * Trang "Thành tích": HÀNH TRÌNH CHINH PHỤC — con đường uốn lượn, mỗi thành tích là một trạm dừng theo thời gian (Road).
 *  Bức tường treo khung cũ (Wall/Piece) vẫn giữ trong file.
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
          <h1>Góc nhỏ của mình</h1>
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

/* ---------- con đường chinh phục: đường ngoằn ngoèo (zig-zag) qua nhiều trạm mỗi hàng, theo thứ tự thời gian ----------
 *  Hàng chẵn đi trái → phải, hàng lẻ đi phải → trái, cuối mỗi hàng là một khúc cua chữ U xuống hàng dưới.
 *  Dọc đường có cây, đồi, nhà, mây trôi; mỗi năm mới có một lá cờ năm; bảng tiến độ đếm số trạm và số km đã đi.
 *  Cuộn trang: đường tô vàng, người đạp xe chạy theo (tung bụi), tới trạm nào trạm đó sáng lên + bắn pháo giấy,
 *  thẻ trạm rê chuột (hoặc bấm nút ↻) để lật mặt sau xem câu chuyện, bấm để mở giấy khen. */
const perRowFor = (w) => (w >= 1100 ? 4 : w >= 700 ? 3 : 2);
const CAT = { 'Học tập': 'c-hoc', 'Hoạt động': 'c-hd', 'Cuộc thi': 'c-thi' };
const SCENE = ['🌳', '⛰️', '🏡', '🌲', '🌻', '🏔️', '🌴', '🗼', '🌾', '🏕️'];
const KM_PER_STOP = 12;
function burstAt(host, x, y, big) {
  if (!host || reduced()) return;
  const cs = ['#ffe14d', '#d33a2c', '#1f2f6e', '#7ccf8a', '#6aa9f0', '#ef7d57'];
  const n = big ? 26 : 12;
  for (let k = 0; k < n; k++) {
    const s = document.createElement('i');
    s.className = k % 3 ? 'cf' : 'cf star';
    if (k % 3) s.style.background = cs[k % cs.length]; else s.textContent = '✦';
    s.style.left = x + 'px'; s.style.top = y + 'px';
    host.appendChild(s);
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.4, d = (big ? 70 : 38) + Math.random() * (big ? 90 : 40);
    gsap.fromTo(s, { x: 0, y: 0, scale: 0.4, rotate: 0, opacity: 1 }, { x: Math.cos(a) * d, y: Math.sin(a) * d + (big ? 40 : 16), scale: 1, rotate: gsap.utils.random(-400, 400), opacity: 0, duration: big ? 1.4 : 0.9, ease: 'power3.out', onComplete: () => s.remove() });
  }
}
function Road({ items, onOpen }) {
  const root = useRef(null);
  const [tab, setTab] = useState('all');
  const [per, setPer] = useState(() => perRowFor(Math.min(window.innerWidth, 1180)));
  const [geo, setGeo] = useState({ w: 0, h: 0, d: '', s: null, e: null, deco: [] });
  const [flip, setFlip] = useState(-1);
  const cats = [...new Set(items.map((a) => a.category).filter(Boolean))];
  const shown = tab === 'all' ? items : tab === 'gold' ? items.filter((a) => a.featured) : items.filter((a) => a.category === tab);
  const rows = [];
  for (let k = 0; k < shown.length; k += per) rows.push(shown.slice(k, k + per));
  const firstOfYear = new Set(shown.filter((a, k) => k === 0 || shown[k - 1].year !== a.year).map((a) => a.n));

  /* số trạm mỗi hàng theo bề ngang */
  useLayoutEffect(() => {
    const el = root.current; if (!el) return undefined;
    const fit = () => setPer(perRowFor(el.clientWidth));
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, []);

  /* vẽ con đường đi qua tâm từng cột mốc, theo đúng thứ tự thời gian; đặt cảnh vật ở các khúc cua */
  useLayoutEffect(() => {
    const el = root.current; if (!el) return undefined;
    let raf = 0;
    const calc = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const box = el.querySelector('.rd-map'); if (!box) return;
        const br = box.getBoundingClientRect();
        const marks = [...box.querySelectorAll('.rd-mark')];
        if (!marks.length) return;
        const P = marks.map((m) => { const r = m.getBoundingClientRect(); return [r.left + r.width / 2 - br.left, r.top + r.height / 2 - br.top, +m.dataset.row]; });
        // khúc cua chữ U phải vòng ra ngoài mép thẻ: điểm xa nhất của đường cong = 3/4 độ lệch điểm điều khiển
        const cw = box.querySelector('.rd-card')?.offsetWidth || 200;
        const U = (cw / 2 + 26) / 0.75, K = Math.min(90, br.width * 0.07);
        const f = (v) => v.toFixed(1);
        const deco = [];
        const s = [Math.max(14, P[0][0] - K * 1.4), P[0][1]];
        let d = `M${f(s[0])} ${f(s[1])} L${f(P[0][0])} ${f(P[0][1])}`;
        for (let k = 1; k < P.length; k++) {
          const [x0, y0, r0] = P[k - 1], [x1, y1, r1] = P[k];
          if (r1 !== r0) { // khúc cua chữ U xuống hàng dưới
            const dir = r0 % 2 ? -1 : 1;
            const room = (dir > 0 ? br.width - 8 - Math.max(x0, x1) : Math.min(x0, x1) - 8) / 0.75; // không vòng ra ngoài khung
            const U2 = Math.max(20, Math.min(U, room));
            d += ` C${f(x0 + dir * U2)} ${f(y0)}, ${f(x1 + dir * U2)} ${f(y1)}, ${f(x1)} ${f(y1)}`;
            // cảnh vật nằm trong lòng khúc cua (giữa hai hàng, sát mép)
            const ex = x0 + dir * U2 * 0.75, ym = (y0 + y1) / 2;
            deco.push({ x: ex - dir * 34, y: ym - 26, e: SCENE[(r0 * 3) % SCENE.length], k: 'u' + r0 });
            deco.push({ x: ex - dir * 18, y: ym + 22, e: SCENE[(r0 * 3 + 1) % SCENE.length], k: 'v' + r0 });
          } else { // đoạn thẳng hơi lượn sóng
            const dx = x1 - x0, wv = (k % 2 ? 1 : -1) * 16;
            d += ` C${f(x0 + dx * 0.4)} ${f(y0 + wv)}, ${f(x1 - dx * 0.4)} ${f(y1 - wv)}, ${f(x1)} ${f(y1)}`;
          }
        }
        const last = P[P.length - 1], ld = last[2] % 2 ? -1 : 1;
        const e = [Math.min(br.width - 14, Math.max(14, last[0] + ld * K * 1.4)), last[1]];
        d += ` L${f(e[0])} ${f(e[1])}`;
        setGeo((g) => (g.d === d && g.w === br.width && g.h === br.height ? g : { w: br.width, h: br.height, d, s, e, deco }));
      });
    };
    calc();
    const ro = new ResizeObserver(calc); ro.observe(el);
    el.addEventListener('load', calc, true);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); el.removeEventListener('load', calc, true); };
  }, [tab, items, per]);

  /* mở màn: các nút lọc nảy lên */
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => { gsap.fromTo('.rd-tabs button, .rd-hud', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(2)', delay: 0.15, clearProps: 'transform,opacity' }); }, root);
    return () => ctx.revert();
  }, []);

  /* đường tự vẽ ra, các trạm bật lên theo từng hàng, xe đạp chạy theo thanh cuộn */
  useLayoutEffect(() => {
    if (!geo.d) return undefined;
    const ctx = gsap.context(() => {
      const map = root.current.querySelector('.rd-map');
      const fx = map.querySelector('.rd-fx');
      const trail = map.querySelector('.rd-trail'), walker = map.querySelector('.rd-walker');
      const base = map.querySelectorAll('.rd-edge, .rd-asphalt, .rd-mid');
      const hudN = root.current.querySelector('.rd-hud-n'), hudKm = root.current.querySelector('.rd-hud-km'), hudBar = root.current.querySelector('.rd-hud-bar i'), hudYr = root.current.querySelector('.rd-hud-yr');
      const len = trail.getTotalLength();
      // vị trí (tỉ lệ trên đường) của từng trạm, để biết người đạp xe đã tới trạm nào
      const stops = [...map.querySelectorAll('.rs')];
      const br0 = map.getBoundingClientRect();
      const samples = Array.from({ length: 300 }, (_, k) => { const pt = trail.getPointAtLength((k / 299) * len); return [pt.x, pt.y, k / 299]; });
      const pos = stops.map((st) => { const r = st.querySelector('.rd-mark').getBoundingClientRect(); return [r.left + r.width / 2 - br0.left, r.top + r.height / 2 - br0.top]; });
      const at = pos.map(([x, y]) => {
        let best = 0, bd = Infinity; samples.forEach(([sx, sy, t]) => { const dd = (sx - x) ** 2 + (sy - y) ** 2; if (dd < bd) { bd = dd; best = t; } });
        return best;
      });
      const celebrated = new Set();
      let lastX = 0, lastDust = 0, lastP = 0, done = false;
      const place = (p) => {
        const L = Math.max(0.001, p * len);
        trail.style.strokeDashoffset = String(len - L);
        const a = trail.getPointAtLength(L);
        const face = a.x < lastX - 0.3 ? 1 : a.x > lastX + 0.3 ? -1 : (walker.dataset.f ? +walker.dataset.f : -1);
        walker.dataset.f = face; lastX = a.x;
        walker.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -78%)`;
        walker.firstChild.style.transform = `scaleX(${face})`;
        // bụi bay sau bánh xe
        if (fx && !reduced() && Math.abs(L - lastDust) > 26) {
          lastDust = L;
          const puff = document.createElement('i'); puff.className = 'dust'; puff.style.left = a.x + 'px'; puff.style.top = (a.y + 6) + 'px';
          fx.appendChild(puff);
          gsap.fromTo(puff, { scale: 0.4, opacity: 0.7, x: 0 }, { scale: 1.8, opacity: 0, x: face * 18, y: -10, duration: 0.8, ease: 'power2.out', onComplete: () => puff.remove() });
        }
        let reached = 0, yr = '';
        stops.forEach((st, k) => {
          const on = p >= at[k] - 0.004;
          st.classList.toggle('reached', on);
          if (on) { reached++; yr = st.dataset.y || yr; }
          if (on && p > lastP && !celebrated.has(k)) { celebrated.add(k); burstAt(fx, pos[k][0], pos[k][1], st.classList.contains('star')); if (st.classList.contains('star')) chime(true); else thock(1.7); }
        });
        if (hudN) hudN.textContent = String(reached);
        if (hudKm) hudKm.textContent = String(Math.round(p * stops.length * KM_PER_STOP));
        if (hudBar) hudBar.style.transform = `scaleX(${p})`;
        if (hudYr) hudYr.textContent = yr || '—';
        if (p > 0.995 && !done) { done = true; map.classList.add('finished'); burstAt(fx, geo.e[0], geo.e[1], true); }
        if (p < 0.98) { done = false; map.classList.remove('finished'); }
        lastP = p;
      };
      trail.style.strokeDasharray = `${len} ${len}`;
      place(0);
      ScrollTrigger.create({ trigger: map, start: 'top 62%', end: 'bottom 62%', onUpdate: (st) => place(st.progress), onRefresh: (st) => place(st.progress) });
      if (reduced()) return;
      base.forEach((b) => { const l = b.getTotalLength(); gsap.fromTo(b, { strokeDasharray: `${l} ${l}`, strokeDashoffset: l }, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset', scrollTrigger: { trigger: map, start: 'top 85%', once: true } }); });
      gsap.from(map.querySelectorAll('.rd-flagpole'), { scale: 0, duration: 0.5, ease: 'back.out(2.5)', stagger: 1.4, scrollTrigger: { trigger: map, start: 'top 85%', once: true } });
      // cảnh vật mọc lên, mây trôi lệch tốc độ khi cuộn (thị sai)
      gsap.utils.toArray(map.querySelectorAll('.rd-deco')).forEach((dc, k) => gsap.from(dc, { scale: 0, y: 20, duration: 0.6, ease: 'back.out(2.2)', delay: (k % 2) * 0.15, scrollTrigger: { trigger: dc, start: 'top 92%', once: true } }));
      map.querySelectorAll('.rd-cloud').forEach((c, k) => gsap.to(c, { yPercent: -(60 + k * 40), ease: 'none', scrollTrigger: { trigger: map, start: 'top bottom', end: 'bottom top', scrub: 0.8 } }));
      map.querySelectorAll('.rd-row').forEach((row, r) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 88%', once: true } });
        const dirx = r % 2 ? 40 : -40;
        tl.from(row.querySelectorAll('.rd-mark'), { scale: 0, rotate: -120, duration: 0.5, ease: 'back.out(2.6)', stagger: 0.09 }, 0)
          .from(row.querySelectorAll('.rd-ybanner'), { scaleY: 0, transformOrigin: '50% 0%', duration: 0.5, ease: 'back.out(2)', stagger: 0.09 }, 0.1)
          .from(row.querySelectorAll('.rd-flipper'), { y: 40, x: dirx, opacity: 0, rotate: () => gsap.utils.random(-6, 6), duration: 0.7, ease: 'power3.out', stagger: 0.09, clearProps: 'transform' }, 0.08);
      });
    }, root);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [geo.d]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (t) => { if (t !== tab) { setTab(t); setFlip(-1); thock(1.3); } };
  return (
    <div className="rd rd2 rd3" ref={root}>
      <div className="rd-top3">
        <nav className="rd-tabs" aria-label="Lọc thành tích">
          <button className={tab === 'all' ? 'on' : ''} onClick={() => pick('all')}>Tất cả</button>
          {cats.map((c) => <button key={c} className={tab === c ? 'on' : ''} onClick={() => pick(c)}>{IC[c] || '✦'} {c}</button>)}
          <button className={tab === 'gold' ? 'on' : ''} onClick={() => pick('gold')}>★ Tiêu biểu</button>
        </nav>
        <div className="rd-hud" aria-live="off">
          <span className="rd-hud-ic" aria-hidden="true">🚴</span>
          <span><b className="rd-hud-n">0</b>/{shown.length} trạm</span>
          <span><b className="rd-hud-km">0</b> km</span>
          <span>năm <b className="rd-hud-yr">—</b></span>
          <span className="rd-hud-bar" aria-hidden="true"><i /></span>
        </div>
      </div>
      {shown.length > 0 && (
        <div className="rd-map" key={tab + '-' + per} style={{ '--per': per }}>
          <span className="rd-cloud c1" aria-hidden="true">☁️</span><span className="rd-cloud c2" aria-hidden="true">☁️</span><span className="rd-cloud c3" aria-hidden="true">☁️</span>
          <svg className="rd-svg" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w || 1} ${geo.h || 1}`} aria-hidden="true">
            <path className="rd-edge" d={geo.d} />
            <path className="rd-asphalt" d={geo.d} />
            <path className="rd-trail" d={geo.d} />
            <path className="rd-mid" d={geo.d} />
          </svg>
          {geo.deco.map((dc) => <span key={dc.k} className="rd-deco" style={{ left: dc.x, top: dc.y }} aria-hidden="true">{dc.e}</span>)}
          {geo.s && <span className="rd-flagpole start" style={{ left: geo.s[0], top: geo.s[1] }} aria-hidden="true">🚩<small>Xuất phát</small></span>}
          {geo.e && <span className="rd-flagpole end" style={{ left: geo.e[0], top: geo.e[1] }} aria-hidden="true"><em>🏆</em>🏁<small>Đi tiếp…</small></span>}
          <span className="rd-walker" aria-hidden="true"><i>🚴</i></span>
          <div className="rd-fx" aria-hidden="true" />
          {rows.map((row, r) => (
            <div key={r} className={`rd-row ${r % 2 ? 'rev' : ''}`}>
              {row.map((a) => {
                const k = shown.indexOf(a);
                const open = (e) => onOpen(a.n, e.currentTarget.closest('.rd-flipper').querySelector('.rd-pic') || e.currentTarget);
                return (
                  <div key={a.id || a.n} className={`rs ${a.featured ? 'star' : ''} ${CAT[a.category] || ''} ${flip === a.n ? 'flipped' : ''}`} data-y={a.year || ''}>
                    {firstOfYear.has(a.n) && <span className="rd-ybanner" aria-hidden="true">{a.year}</span>}
                    <span className="rd-mark" data-row={r} aria-hidden="true">{a.featured ? '★' : k + 1}</span>
                    <div className="rd-flipper">
                      <button className="rd-card rd-front" onClick={open} aria-label={`Xem chi tiết: ${a.title}`}>
                        <span className="rd-pic">{a.img ? <img src={a.img} alt="" loading="lazy" draggable="false" /> : <span className="rd-ph">{IC[a.category] || '✦'}</span>}</span>
                        <span className="rd-medal" aria-hidden="true">{IC[a.category] || '✦'}</span>
                        <span className="rd-yr">{a.year || ''}</span>
                        <b className="rd-t">{a.title}</b>
                        <small className="rd-date">{a.date}</small>
                        <span className="rd-won" aria-hidden="true">✓</span>
                      </button>
                      <button className="rd-card rd-back" onClick={open} tabIndex={-1} aria-hidden="true">
                        <span className="rd-back-cat">{IC[a.category] || '✦'} {a.category}{a.featured ? ' · ★' : ''}</span>
                        <b>{a.title}</b>
                        <span className="rd-back-desc">{a.desc || 'Một dấu mốc đáng nhớ trên hành trình.'}</span>
                        <span className="rd-back-go">Xem giấy khen →</span>
                      </button>
                      <button className="rd-turn" onClick={(e) => { e.stopPropagation(); setFlip(flip === a.n ? -1 : a.n); thock(1.5); }} aria-label={flip === a.n ? 'Lật lại mặt trước' : 'Lật xem câu chuyện'}>↻</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {shown.length === 0 && <p className="hw-empty">Chưa có thành tích nào ở mục này.</p>}
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
      <Road items={items} onOpen={open} />
      {view && items.length > 0 && <Detail items={items} at={Math.min(view.n, items.length - 1)} from={view.from} onClose={() => setView(null)} />}
      {ed.canEdit && <ListEditor ed={ed} label="thành tích" fields={ACH_FIELDS} blank={ACH_BLANK} preview={ACH_PREVIEW} />}
    </div>
  );
}
