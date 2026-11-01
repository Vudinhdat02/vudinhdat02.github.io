/*
 * Trang "Thành tích" kiểu bảo tàng sáng màu:
 *  - Hành lang 3D: cuộn chuột là đi dọc hành lang, tranh treo hai bên tường, tới gần thì tranh xoay ra và sáng đèn;
 *    mỗi phòng một màu tường, bảng tên phòng treo trên trần.
 *  - Phòng ngắm: khung bay ra giữa, nghiêng 3D theo chuột, kính lúp soi chữ, thuyết minh bằng giọng đọc.
 *  - Lối ra: thống kê + tặng hoa.
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

gsap.registerPlugin(ScrollTrigger);

/* tỉ lệ ảnh có sẵn (ảnh mới tải lên sẽ tự đo khi tải xong) */
const AR = {
  '/uploads/tot-nghiep-trung-cap-mums91zd.jpg': 1.299, '/uploads/sinh-vien-xuat-sac-mumsbc7t.jpg': 1.394, '/uploads/sinh-vien-xuat-sac-mumsdspk.jpg': 1.437,
  '/uploads/sinh-vien-5-tot-cap-truong-2023-2024-mumsfx46.jpg': 0.769, '/uploads/sinh-vien-xuat-sac-mumshfn7.jpg': 1.415, '/uploads/sinh-vien-tieu-bieu-mumsjhua.jpg': 1.4,
  '/uploads/khen-thuong-doan-thanh-nien-mumsmvsp.jpg': 1.358, '/uploads/khen-thuong-hoi-sinh-vien-mumsohj9.jpg': 1.371, '/uploads/khen-thuong-hoi-sinh-vien-dhtn-mumspmxa.jpg': 1.333,
  '/uploads/sinh-vien-khoe-mumsqsz7.jpg': 1.281, '/uploads/sinh-vien-5-tot-cap-truong-mumsrspx.jpg': 0.746, '/uploads/sinh-vien-5-tot-cap-dhtn-mumssdu8.jpg': 0.755,
  '/uploads/do-an-he-cu-nhan-dat-diem-cao-nhat-hoi-d-mumt4bwf.jpg': 0.75, '/uploads/bai-bao-nckh-dang-tren-tap-chi-kh-cn-dht-mumt6h8q.jpg': 0.594,
  '/uploads/giai-nhi-cuoc-thi-phat-trien-phan-mem-ng-mumt7u9l.jpg': 0.75,
};
const yearOf = (d) => { const m = String(d).match(/(\d{4})/g); return m ? +m[m.length - 1] : 0; };
const ROOM_DEF = {
  'Học tập': { ic: '📚', wall: '#fbf5e8', accent: '#3b6fd8', tag: 'Những năm tháng trên giảng đường' },
  'Hoạt động': { ic: '🤝', wall: '#edf7ef', accent: '#2f8f5b', tag: 'Đoàn, Hội và những ngày xông xáo' },
  'Cuộc thi': { ic: '🏆', wall: '#fdf0ee', accent: '#d6453a', tag: 'Nơi trưng bày giải thưởng' },
};
const FRAMES = ['white', 'oak', 'rose', 'silver'];

/* dựng mô hình phòng/hiện vật từ danh sách thành tích (danh sách có thể được sửa trên web) */
function buildModel(list) {
  const ITEMS = list.map((a) => ({ ...a, year: yearOf(a.date), img: a.image ? asset(a.image) : null, ar: AR[a.image] || 1.33 }));
  const ROOMS = [...new Set([...Object.keys(ROOM_DEF), ...ITEMS.map((a) => a.category)])]
    .map((key) => ({ key, ...(ROOM_DEF[key] || { ic: '🏅', wall: '#f6f3fb', accent: '#7c4dcc', tag: 'Những dấu mốc khác' }), items: ITEMS.filter((a) => a.category === key).sort((a, b) => a.year - b.year) }))
    .filter((r) => r.items.length);
  const ORDER = ROOMS.flatMap((r) => r.items);
  ORDER.forEach((a, i) => { a.n = i; a.frame = a.featured ? 'gold' : FRAMES[i % FRAMES.length]; });
  ROOMS.forEach((r, k) => { r.no = String(k + 1).padStart(2, '0'); });
  return { ROOMS, ORDER };
}

const fmtN = (n) => String(n + 1).padStart(2, '0');

/* ---------- một khung tranh treo trên đinh ---------- */
function Hang({ a, onOpen, className = '' }) {
  const [ar, setAr] = useState(a.ar);
  return (
    <div className={`hg ${className}`} data-n={a.n} onMouseEnter={(e) => { e.currentTarget.__kick = (Math.random() < 0.5 ? -1 : 1) * 1.6; thock(1.5); }}>
      <svg className="hg-wire" viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true"><polyline points="6,46 50,1 94,46" /></svg>
      <i className="hg-nail" />
      <button className={`fr fr-${a.frame}`} onClick={(e) => onOpen(a.n, e.currentTarget)} aria-label={a.title}>
        <span className="fr-mat">
          <span className="fr-pic" style={{ '--ar': ar }}>
            {a.img ? <img src={a.img} alt={a.title} loading="lazy" draggable="false" onLoad={(e) => { const r = e.currentTarget.naturalWidth / e.currentTarget.naturalHeight; if (Math.abs(r - ar) > 0.02) { setAr(r); requestAnimationFrame(() => ScrollTrigger.refresh()); } }} />
              : <span className="fr-ph">{ROOM_DEF[a.category]?.ic || '🏅'}</span>}
          </span>
        </span>
        <span className="fr-glass" />
        {a.featured && <span className="fr-ribbon">Kiệt tác</span>}
      </button>
      <span className="plq"><b>{a.title}</b><small>{a.date} · Hiện vật {fmtN(a.n)}</small></span>
    </div>
  );
}

/* ---------- hành lang 3D: cuộn để đi dọc, tranh treo hai bên tường, tới gần thì tranh xoay ra chào ---------- */
function plan3d({ ROOMS }) {
  const small = typeof window !== 'undefined' && window.innerWidth < 760;
  const W = small ? 600 : 1040, H = small ? 860 : 780;
  let z = 420; const items = []; const signs = []; const segs = [];
  ROOMS.forEach((r, ri) => {
    const from = z; signs.push({ r, z: z + 200, ri }); z += 760;
    r.items.forEach((a, k) => { items.push({ a, z, side: k % 2 ? 1 : -1, ri }); z += a.featured ? 560 : 430; });
    z += 160; segs.push({ r, from, to: z });
  });
  const L = z + 1000;
  return { W, H, items, signs, segs, L, cam: L - 1250, small, peak: small ? 420 : 420, inX: small ? 0.16 : 0.19 };
}

function Corridor({ onOpen, m }) {
  const { ROOMS, ORDER } = m;
  const root = useRef(null);
  const world = useRef(null);
  const world2 = useRef(null);
  const hud = useRef(null);
  const prog = useRef(null);
  const P = useMemo(() => plan3d(m), [m]);

  useLayoutEffect(() => {
    const el = root.current;
    const cam = { v: 0 };
    const ctx = gsap.context(() => {
      gsap.to(cam, { v: P.cam, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: () => '+=' + Math.round(P.cam * (P.small ? 0.75 : 0.62)), pin: true, scrub: 0.9, anticipatePin: 1,
        onUpdate: (s) => { if (prog.current) prog.current.style.transform = `scaleX(${s.progress})`; el.classList.toggle('moved', s.progress > 0.02); } } });
    }, el);
    const its = [...el.querySelectorAll('.c3-it')];
    const sg = [...el.querySelectorAll('.c3-sign')];
    let on = false, room = -1, near = -1;
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; }, { threshold: 0 });
    io.observe(el);
    const tick = () => {
      if (!on) return;
      const c = cam.v;
      world.current.style.transform = world2.current.style.transform = `translateZ(${c.toFixed(1)}px)`;
      let best = -1, bf = 0;
      const t = performance.now() / 1000;
      P.items.forEach((it, k) => {
        const d = it.z - c; const e = its[k];
        if (d < 60 || d > 7000) { e.style.visibility = 'hidden'; return; }
        e.style.visibility = '';
        e.style.opacity = Math.min(1, (d - 60) / 200).toFixed(3);
        const f0 = Math.max(0, 1 - Math.abs(d - P.peak) / (d < P.peak ? 300 : 700));
        const f = f0 * f0 * (3 - 2 * f0); /* smoothstep: rời tường mượt, quay thẳng ra người xem */
        const s0 = it.side;
        const x = s0 * ((P.W / 2 - 6) * (1 - f) + P.W * P.inX * f);
        const rot = s0 * -90 * (1 - f);
        const tx = s0 < 0 ? -100 + 50 * f : -50 * f;
        const sway = Math.sin(t * 1.3 + k) * 1.4 * f;
        const lift = -40 - 26 * f + Math.sin(t * 1.7 + k) * 6 * f;
        e.style.transform = `translate3d(${x.toFixed(1)}px, ${lift.toFixed(1)}px, ${-it.z}px) rotateY(${rot.toFixed(2)}deg) translate(${tx.toFixed(1)}%, -50%) rotate(${sway.toFixed(2)}deg)`;
        e.style.setProperty('--f', f.toFixed(3));
        const lit = f > 0.86;
        if (lit !== !!it.lit) { it.lit = lit; e.classList.toggle('lit', lit); if (lit) thock(1.6); }
        if (f > bf) { bf = f; best = k; }
      });
      sg.forEach((e, k) => {
        const S = P.signs[k]; const d = S.z - c;
        const target = d > 1700 ? 84 : 0;
        S.v = ((S.v || 0) + (target - (S.a ?? 84)) * 0.07) * 0.86; S.a = (S.a ?? 84) + S.v;
        e.style.transform = `translate3d(0px, ${-P.H / 2 + 34}px, ${-S.z}px) translateX(-50%) rotateX(${S.a.toFixed(2)}deg)`;
        e.style.opacity = Math.max(0, Math.min(1, (d - 120) / 420)).toFixed(3); e.style.visibility = d < 100 ? 'hidden' : '';
      });
      const ri = P.signs.reduce((acc, s, k) => (s.z - c < 500 ? k : acc), 0);
      if (ri !== room) {
        room = ri; const R = ROOMS[ri];
        if (hud.current) { hud.current.style.setProperty('--rc', R.accent); hud.current.querySelector('b').textContent = `${R.no} · Phòng ${R.key}`; hud.current.querySelectorAll('.hud-seg').forEach((s, k) => s.classList.toggle('on', k <= ri)); }
        if (c > 50) chime(true);
      }
      if (best !== near && bf > 0.5) { near = best; const n = hud.current?.querySelector('em'); if (n) n.textContent = `Hiện vật ${fmtN(P.items[best].a.n)} / ${ORDER.length}`; }
    };
    gsap.ticker.add(tick);
    tick.call();
    return () => { gsap.ticker.remove(tick); io.disconnect(); ctx.revert(); };
  }, [P]);

  const wall = (r, side) => {
    const w = r.to - r.from;
    const t = side < 0 ? `translate3d(${-P.W / 2}px, ${-P.H / 2}px, ${-r.from}px) rotateY(90deg)` : `translate3d(${P.W / 2}px, ${-P.H / 2}px, ${-r.to}px) rotateY(-90deg)`;
    return <div key={r.r.key + side} className="c3-pl c3-wall" style={{ width: w, height: P.H, transform: t, '--wall': r.r.wall, '--ac': r.r.accent }} />;
  };
  return (
    <section className="c3" ref={root} id="mz-gallery">
      <div className="c3-view"><div className="c3-world" ref={world}>
        <div className="c3-pl c3-floor" style={{ width: P.W, height: P.L, transform: `translate3d(${-P.W / 2}px, ${P.H / 2}px, 0) rotateX(-90deg)` }} />
        <div className="c3-pl c3-ceil" style={{ width: P.W, height: P.L, transform: `translate3d(${-P.W / 2}px, ${-P.H / 2}px, 0) rotateX(-90deg)` }} />
        {P.segs.map((r) => [wall(r, -1), wall(r, 1)])}
        {P.signs.map(({ r, z }) => (
          <div key={r.key} className="c3-pl c3-sign" style={{ transform: `translate3d(0px, ${-P.H / 2 + 34}px, ${-z}px) translateX(-50%) rotateX(84deg)`, '--ac': r.accent }}>
            <small>{r.no} · {r.items.length} hiện vật</small><b>{r.ic} Phòng {r.key}</b><i>{r.tag}</i>
          </div>
        ))}
        <div className="c3-pl c3-end" style={{ width: P.W, height: P.H, transform: `translate3d(${-P.W / 2}px, ${-P.H / 2}px, ${-P.L}px)` }}>
          <span className="c3-door"><em>🚪</em><b>Lối ra</b><small>cuộn tiếp để ra ngoài</small></span>
        </div>
      </div></div>
      {/* tranh nằm ở lớp riêng phía trên để sàn/tường không che mất (cùng phối cảnh, cùng máy quay) */}
      <div className="c3-view top"><div className="c3-world" ref={world2}>
        {P.items.map(({ a }) => (
          <div key={a.id} className={`c3-pl c3-it ${a.featured ? 'big' : ''}`}><span className="c3-beam" /><Hang a={a} onOpen={onOpen} /><span className="c3-sp">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <i key={i} style={{ '--i': i }} />)}</span></div>
        ))}
      </div></div>
      <div className="gl-hud c3-hud" ref={hud}>
        <small>Bạn đang ở</small><b>01 · Phòng {ROOMS[0]?.key}</b><em>Hiện vật 01 / {ORDER.length}</em>
        <span className="hud-bar">{ROOMS.map((r) => <i key={r.key} className="hud-seg" style={{ '--sc': r.accent }} />)}</span>
      </div>
      <div className="c3-dust">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--x': `${(i * 47) % 100}%`, '--y': `${(i * 31) % 100}%`, '--d': `${(i % 7) * -1.3}s` }} />)}</div>
      <p className="c3-hint">Cuộn chuột để đi dọc hành lang · bấm vào tranh để xem kỹ</p>
      <span className="c3-prog"><i ref={prog} /></span>
    </section>
  );
}

/* ---------- phòng ngắm hiện vật ---------- */
function Viewer({ at, from, onClose, m }) {
  const { ORDER } = m;
  const ref = useRef(null);
  const [i, setI] = useState(at);
  const [loupe, setLoupe] = useState(false);
  const [talk, setTalk] = useState(false);
  const dir = useRef(0);
  const busy = useRef(false);
  const a = ORDER[i];
  const { lenis } = useDiary() || {};

  useEffect(() => { lenis?.current?.stop(); return () => { lenis?.current?.start(); window.speechSynthesis?.cancel(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const q = gsap.utils.selector(ref);
    gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.35 });
    whoosh();
    if (from && !reduced()) {
      const fr = q('.mv-hang')[0]; const r = fr.getBoundingClientRect();
      gsap.from(fr, { x: from.left + from.width / 2 - (r.left + r.width / 2), y: from.top + from.height / 2 - (r.top + r.height / 2), scale: from.width / r.width, rotate: from.rot || 0, duration: 1, ease: 'expo.out', clearProps: 'transform' });
    }
    gsap.from(q('.mv-label'), { x: 80, opacity: 0, duration: 0.8, delay: 0.25, ease: 'power3.out' });
    gsap.fromTo(q('.mv-thumbs'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, delay: 0.4, duration: 0.6, ease: 'back.out(1.8)', clearProps: 'transform,opacity' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!dir.current) return;
    const q = gsap.utils.selector(ref); const d = dir.current;
    gsap.fromTo(q('.mv-hang'), { x: d * 260, rotate: d * 28, opacity: 0 }, { x: 0, rotate: 0, opacity: 1, duration: 1.3, ease: 'elastic.out(1, 0.45)', onComplete: () => { busy.current = false; } });
    gsap.fromTo(q('.mv-label > *'), { y: 18, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.45, ease: 'power3.out' });
    q('.mv-thumbs .on')[0]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [i]);

  const go = (to) => {
    if (busy.current) return;
    const n = (to + ORDER.length) % ORDER.length; if (n === i) return;
    busy.current = true; window.speechSynthesis?.cancel(); setTalk(false);
    const d = to > i ? 1 : -1; dir.current = d; thock(1.2);
    gsap.to(ref.current.querySelector('.mv-hang'), { x: -d * 220, rotate: -d * 24, opacity: 0, duration: 0.32, ease: 'power2.in', onComplete: () => setI(n) });
  };
  const close = () => {
    gsap.to(ref.current, { opacity: 0, duration: 0.3, onComplete: onClose });
    gsap.to(ref.current.querySelector('.mv-hang'), { scale: 0.85, y: 40, duration: 0.3 });
  };
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });

  /* nghiêng 3D + kính lúp */
  const move = (e) => {
    const t = ref.current.querySelector('.mv-tilt'); if (!t) return;
    const r = t.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (!loupe) { t.style.setProperty('--ry', `${(x - 0.5) * 14}deg`); t.style.setProperty('--rx', `${(0.5 - y) * 10}deg`); }
    t.style.setProperty('--gx', `${x * 100}%`); t.style.setProperty('--gy', `${y * 100}%`);
    const pic = ref.current.querySelector('.mv-pic'), lp = ref.current.querySelector('.mv-loupe');
    if (loupe && pic && lp) {
      const p = pic.getBoundingClientRect(); const px = e.clientX - p.left, py = e.clientY - p.top; const Z = 2.6;
      const inside = px >= 0 && py >= 0 && px <= p.width && py <= p.height;
      lp.style.opacity = inside ? 1 : 0;
      lp.style.left = `${px}px`; lp.style.top = `${py}px`;
      lp.style.backgroundSize = `${p.width * Z}px ${p.height * Z}px`;
      lp.style.backgroundPosition = `${-px * Z + 90}px ${-py * Z + 90}px`;
    }
  };
  const leave = () => { const t = ref.current?.querySelector('.mv-tilt'); if (t) { t.style.setProperty('--ry', '0deg'); t.style.setProperty('--rx', '0deg'); } };
  const speak = () => {
    const s = window.speechSynthesis; if (!s) return;
    if (talk) { s.cancel(); setTalk(false); return; }
    const u = new SpeechSynthesisUtterance(`Hiện vật số ${a.n + 1}. ${a.title}. Thời gian: ${a.date}. ${a.desc || ''}`);
    u.lang = 'vi-VN'; const vi = s.getVoices().find((v) => v.lang?.toLowerCase().startsWith('vi')); if (vi) u.voice = vi;
    u.rate = 0.95; u.onend = () => setTalk(false); s.cancel(); s.speak(u); setTalk(true);
  };
  const R = ROOM_DEF[a.category] || { ic: '🏅', accent: '#7c4dcc' };

  return createPortal(
    <div className="mv-wrap" ref={ref} style={{ '--ac': R.accent }} onMouseMove={move} onMouseLeave={leave}>
      <div className="mv-bg" onClick={close} />
      <button className="mv-x" onClick={close} aria-label="Đóng">✕</button>
      <button className="mv-nav l" onClick={() => go(i - 1)} aria-label="Trước">‹</button>
      <button className="mv-nav r" onClick={() => go(i + 1)} aria-label="Sau">›</button>
      <div className="mv-stage">
        <div className="mv-hang">
          <svg className="hg-wire" viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true"><polyline points="6,46 50,1 94,46" /></svg>
          <i className="hg-nail" />
          <div className={`mv-tilt ${loupe ? 'lp' : ''}`}>
            <div className={`fr fr-${a.frame} fr-view`}>
              <span className="fr-mat">
                <span className="mv-pic" style={{ '--ar': a.ar }}>
                  {a.img ? <img src={a.img} alt={a.title} draggable="false" /> : <span className="fr-ph">{R.ic}</span>}
                  {a.img && <span className="mv-loupe" style={{ backgroundImage: `url("${a.img}")` }} />}
                </span>
              </span>
              <span className="fr-glass" />
            </div>
          </div>
        </div>
        <div className="mv-label">
          <small className="ml-no">Hiện vật {fmtN(a.n)} / {ORDER.length} · {R.ic} Phòng {a.category}</small>
          <h3>{a.title}</h3>
          <span className="ml-date">{a.date}</span>
          {a.desc && <p>{a.desc}</p>}
          {a.featured && <span className="ml-seal">★ KIỆT TÁC ★</span>}
          <div className="ml-act">
            {a.img && <button className={loupe ? 'on' : ''} onClick={() => { setLoupe(!loupe); leave(); thock(1.4); }}>🔍 {loupe ? 'Tắt kính lúp' : 'Soi kỹ bằng kính lúp'}</button>}
            {'speechSynthesis' in window && <button className={talk ? 'on' : ''} onClick={speak}>{talk ? '⏹ Dừng thuyết minh' : '🔊 Nghe thuyết minh'}</button>}
          </div>
        </div>
      </div>
      <div className="mv-thumbs">
        {ORDER.map((t) => (
          <button key={t.id} className={t.n === i ? 'on' : ''} onClick={() => go(t.n)} style={{ '--tc': (ROOM_DEF[t.category] || R).accent }} aria-label={t.title}>
            {t.img ? <img src={t.img} alt="" loading="lazy" /> : (ROOM_DEF[t.category]?.ic || '🏅')}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- lối ra ---------- */
const FLOWER_KEY = 'dat-museum-flowers';
function Exit({ m }) {
  const { ROOMS, ORDER } = m;
  const root = useRef(null);
  const [n, setN] = useState(() => { try { return +localStorage.getItem(FLOWER_KEY) || 0; } catch { return 0; } });
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      root.current.querySelectorAll('.ex-plq b').forEach((b) => {
        const o = { v: 0 }; const to = +b.dataset.v;
        gsap.to(o, { v: to, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 85%' }, onUpdate: () => { b.textContent = Math.round(o.v); } });
      });
      gsap.from('.ex-plq', { y: 60, rotate: (k) => (k % 2 ? 6 : -6), opacity: 0, stagger: 0.12, duration: 0.9, ease: 'back.out(1.8)', scrollTrigger: { trigger: root.current, start: 'top 75%' } });
    }, root);
    return () => ctx.revert();
  }, []);
  const give = (e) => {
    const nn = n + 1; setN(nn); try { localStorage.setItem(FLOWER_KEY, nn); } catch { /* bỏ qua */ }
    chime(true);
    const pile = root.current.querySelector('.ex-pile'); const p = pile.getBoundingClientRect();
    const f = document.createElement('span'); f.className = 'ex-fl'; f.textContent = ['🌷', '🌹', '🌻', '💐', '🌸', '🌼'][nn % 6];
    const tx = 20 + Math.random() * (p.width - 40), ty = p.height - 30 - Math.random() * 30;
    f.style.left = `${tx}px`; f.style.top = `${ty}px`; pile.appendChild(f);
    const sx = e.clientX - p.left - tx, sy = e.clientY - p.top - ty;
    gsap.timeline()
      .fromTo(f, { x: sx, y: sy, rotate: -90, scale: 1.6 }, { x: sx * 0.5, y: Math.min(sy, 0) - 160, rotate: 90, scale: 1.3, duration: 0.45, ease: 'power2.out' })
      .to(f, { x: 0, y: 0, rotate: gsap.utils.random(-30, 30), scale: 1, duration: 0.5, ease: 'bounce.out' });
    if (pile.children.length > 40) pile.firstChild.remove();
  };
  const counts = ROOMS.map((r) => [r, r.items.length]);
  return (
    <section className="ex" ref={root}>
      <p className="ex-k">LỐI RA · EXIT</p>
      <h3>Cảm ơn bạn đã ghé thăm triển lãm</h3>
      <div className="ex-plqs">
        {counts.map(([r, c]) => <div key={r.key} className="ex-plq" style={{ '--ac': r.accent }}><span>{r.ic}</span><b data-v={c}>0</b><small>Phòng {r.key}</small></div>)}
        <div className="ex-plq" style={{ '--ac': '#d4a017' }}><span>★</span><b data-v={ORDER.filter((a) => a.featured).length}>0</b><small>Kiệt tác</small></div>
      </div>
      <div className="ex-pile" />
      <button className="ex-give" onClick={give} data-mag="0.2">🌷 Tặng một bông hoa <small>{n} bông hoa đã được tặng</small></button>
    </section>
  );
}

export default function Museum() {
  const [view, setView] = useState(null);
  const ed = useEditable(data, 'achievements');
  const m = useMemo(() => buildModel(ed.items), [ed.items]);
  const layoutKey = m.ORDER.map((a) => `${a.id}:${a.category}:${a.featured ? 1 : 0}:${a.ar}`).join('|');
  const open = (n, el) => {
    const r = el.getBoundingClientRect();
    const hg = el.closest('.hg'); const rot = hg ? parseFloat(hg.style.rotate) || 0 : 0;
    setView({ n, from: { left: r.left, top: r.top, width: r.width, height: r.height, rot } });
  };
  return (
    <div className="mz">
      <Corridor key={layoutKey} onOpen={open} m={m} />
      <Exit m={m} />
      {view && <Viewer at={Math.min(view.n, m.ORDER.length - 1)} from={view.from} m={m} onClose={() => setView(null)} />}
      {ed.canEdit && <ListEditor ed={ed} label="thành tích" fields={ACH_FIELDS} blank={() => ({ title: '', date: String(new Date().getFullYear()), category: 'Học tập', featured: false, desc: '', image: '' })}
        preview={(a) => ({ img: a.image ? asset(a.image) : null, title: a.title, sub: `${a.category} · ${a.date}${a.featured ? ' · ★' : ''}` })} />}
    </div>
  );
}

const ACH_FIELDS = [
  { key: 'title', label: 'Tên thành tích', type: 'text', required: true },
  { key: 'date', label: 'Thời gian (vd: 2024 - 2025 hoặc 06/2026)', type: 'text', required: true },
  { key: 'category', label: 'Loại (mỗi loại là một phòng)', type: 'text', options: ['Học tập', 'Hoạt động', 'Cuộc thi'] },
  { key: 'featured', label: 'Kiệt tác (khung vàng, nổi bật)', type: 'check' },
  { key: 'desc', label: 'Mô tả ngắn', type: 'area' },
  { key: 'image', label: 'Ảnh giấy khen / huy chương', type: 'image' },
];
