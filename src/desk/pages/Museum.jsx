/*
 * Trang "Thành tích": một phòng trưng bày sáng, nhẹ nhàng.
 *  - Máy tính: cuộn chuột là đi dọc bức tường dài (cuộn ngang), mỗi phòng một màu tường,
 *    tranh tới giữa tầm mắt thì đèn rọi bật sáng. Chỉ di chuyển MỘT lớp (transform), nên rất nhẹ.
 *  - Điện thoại: các tranh xếp dọc, hiện dần khi cuộn tới.
 *  - Bấm tranh để xem lớn: lật qua lại, kính lúp, nghe thuyết minh.
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
import { ACH_BLANK, ACH_FIELDS, ACH_PREVIEW } from '../fields';

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
  'Học tập': { ic: '📚', wall: '#f3eee4', deep: '#e4dccd', accent: '#2c4a7c', tag: 'Những năm tháng trên giảng đường' },
  'Hoạt động': { ic: '🤝', wall: '#e9ede4', deep: '#d9dfd2', accent: '#3d6b4f', tag: 'Đoàn, Hội và những ngày xông xáo' },
  'Cuộc thi': { ic: '🏆', wall: '#f2e7e1', deep: '#e3d3ca', accent: '#8a3b32', tag: 'Nơi trưng bày giải thưởng' },
};
const OTHER_ROOM = { ic: '🏅', wall: '#ece9f1', deep: '#dcd7e4', accent: '#4f4a7a', tag: 'Những dấu mốc khác' };
const FRAMES = ['walnut', 'black', 'oak', 'walnut', 'white'];

/* dựng mô hình phòng/hiện vật từ danh sách thành tích (danh sách có thể được sửa trên web) */
function buildModel(list) {
  const ITEMS = list.map((a) => ({ ...a, year: yearOf(a.date), img: a.image ? asset(a.image) : null, ar: AR[a.image] || 1.33 }));
  const ROOMS = [...new Set([...Object.keys(ROOM_DEF), ...ITEMS.map((a) => a.category)])]
    .map((key) => ({ key, ...(ROOM_DEF[key] || OTHER_ROOM), items: ITEMS.filter((a) => a.category === key).sort((a, b) => a.year - b.year) }))
    .filter((r) => r.items.length);
  const ORDER = ROOMS.flatMap((r) => r.items);
  ORDER.forEach((a, i) => { a.n = i; a.frame = a.featured ? 'gold' : FRAMES[i % FRAMES.length]; });
  ROOMS.forEach((r, k) => { r.no = ['I', 'II', 'III', 'IV', 'V', 'VI'][k] || String(k + 1); });
  return { ROOMS, ORDER };
}

const fmtN = (n) => String(n + 1).padStart(2, '0');

/* ---------- một tác phẩm: đèn rọi, khung, bìa giấy, nhãn đồng ---------- */
function Art({ a, onOpen }) {
  const [ar, setAr] = useState(a.ar);
  return (
    <figure className={`gx-art ${a.featured ? 'feat' : ''}`} style={{ '--ar': ar }}>
      <i className="gx-lamp" aria-hidden="true" />
      <button className={`gx-frame gx-${a.frame}`} onClick={(e) => onOpen(a.n, e.currentTarget)} onMouseEnter={() => thock(1.6)} aria-label={`Xem lớn: ${a.title}`}>
        <span className="gx-mat">
          <span className="gx-pic">
            {a.img ? <img src={a.img} alt={a.title} loading="lazy" decoding="async" draggable="false"
              onLoad={(e) => { const r = e.currentTarget.naturalWidth / e.currentTarget.naturalHeight; if (Math.abs(r - ar) > 0.02) { setAr(r); requestAnimationFrame(() => ScrollTrigger.refresh()); } }} />
              : <span className="gx-ph">{(ROOM_DEF[a.category] || OTHER_ROOM).ic}</span>}
          </span>
        </span>
      </button>
      <figcaption className="gx-label">
        <small>{a.featured ? '★ Tiêu biểu · ' : ''}No. {fmtN(a.n)}</small>
        <b>{a.title}</b>
        <span>{a.date}</span>
      </figcaption>
    </figure>
  );
}

/* ---------- phòng trưng bày ---------- */
function Gallery({ m, onOpen }) {
  const { ROOMS, ORDER } = m;
  const root = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const arts = [...el.querySelectorAll('.gx-art, .gx-sign')];
    if (reduced()) { arts.forEach((a) => a.classList.add('seen', 'lit')); return undefined; }
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      /* máy tính: bức tường dài trượt ngang */
      mm.add('(min-width: 900px)', () => {
        const hall = el.querySelector('.gx-hall'), track = el.querySelector('.gx-track');
        const bar = el.querySelector('.gx-prog i'), label = el.querySelector('.gx-where');
        const rooms = [...el.querySelectorAll('.gx-room')];
        let pos = [], roomPos = [], W = 0, cur = -1;
        const measure = () => {
          W = window.innerWidth;
          pos = arts.map((a) => [a.offsetLeft + a.closest('.gx-room').offsetLeft, a.offsetWidth]);
          roomPos = rooms.map((r) => r.offsetLeft);
        };
        const dist = () => track.scrollWidth - window.innerWidth;
        const paint = (x) => {
          for (let i = 0; i < arts.length; i++) {
            const left = pos[i][0] + x, mid = left + pos[i][1] / 2;
            if (left < W * 0.9) arts[i].classList.add('seen');
            arts[i].classList.toggle('lit', mid > W * 0.18 && mid < W * 0.82);
          }
          let k = 0; for (let i = 0; i < roomPos.length; i++) if (roomPos[i] + x < W * 0.5) k = i;
          if (k !== cur) { cur = k; label.textContent = `Phòng ${ROOMS[k].no} · ${ROOMS[k].key}`; label.style.setProperty('--ac', ROOMS[k].accent); }
        };
        measure();
        const tw = gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: hall, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.5, invalidateOnRefresh: true,
            onRefresh: measure,
            onUpdate: (st) => { bar.style.transform = `scaleX(${st.progress})`; },
          },
          onUpdate: () => paint(+gsap.getProperty(track, 'x')),
        });
        paint(0);
        return () => tw.scrollTrigger?.kill();
      });

      /* điện thoại: xếp dọc, hiện dần */
      mm.add('(max-width: 899px)', () => {
        const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
        const lit = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('lit', e.isIntersecting)), { rootMargin: '-30% 0px -30% 0px' });
        arts.forEach((a) => { io.observe(a); lit.observe(a); });
        return () => { io.disconnect(); lit.disconnect(); };
      });

      /* mở màn: chữ hiện lên nhẹ nhàng */
      gsap.from(el.querySelectorAll('.gx-intro .rv'), { y: 28, opacity: 0, duration: 1, stagger: 0.09, ease: 'power3.out', delay: 0.15 });
    }, el);
    return () => ctx.revert();
  }, []);

  const years = ORDER.map((a) => a.year).filter(Boolean);
  const span = years.length ? `${Math.min(...years)} — ${Math.max(...years)}` : '';
  return (
    <div className="gx" ref={root}>
      <header className="gx-intro">
        <p className="gx-eyebrow rv">Triển lãm cá nhân{span && ` · ${span}`}</p>
        <h1 className="rv">Những <em>dấu mốc</em><br />đã đi qua</h1>
        <p className="gx-lead rv">Giấy khen, chứng nhận và giải thưởng của Vũ Đình Đạt, được treo theo từng phòng. Bấm vào một tác phẩm để xem lớn.</p>
        <dl className="gx-facts rv">
          <div><dt>{ORDER.length}</dt><dd>tác phẩm</dd></div>
          <div><dt>{ROOMS.length}</dt><dd>phòng</dd></div>
          <div><dt>{ORDER.filter((a) => a.featured).length}</dt><dd>tiêu biểu</dd></div>
        </dl>
        <p className="gx-cue rv"><span>Cuộn để bắt đầu tham quan</span><i /></p>
      </header>

      <section className="gx-hall">
        <div className="gx-track">
          {ROOMS.map((r) => (
            <div className="gx-room" key={r.key} style={{ '--wall': r.wall, '--deep': r.deep, '--ac': r.accent }}>
              <div className="gx-sign">
                <small>Phòng {r.no}</small>
                <h2>{r.key}</h2>
                <p>{r.tag}</p>
                <span>{r.items.length} tác phẩm</span>
              </div>
              {r.items.map((a) => <Art key={a.id} a={a} onOpen={onOpen} />)}
            </div>
          ))}
        </div>
        <div className="gx-hud" aria-hidden="true"><span className="gx-where" /><span className="gx-prog"><i /></span></div>
      </section>
    </div>
  );
}

/* ---------- phòng ngắm ---------- */
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
      gsap.from(fr, { x: from.left + from.width / 2 - (r.left + r.width / 2), y: from.top + from.height / 2 - (r.top + r.height / 2), scale: from.width / r.width, duration: 0.9, ease: 'expo.out', clearProps: 'transform' });
    }
    gsap.from(q('.mv-label'), { x: 80, opacity: 0, duration: 0.8, delay: 0.25, ease: 'power3.out' });
    gsap.fromTo(q('.mv-thumbs'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, delay: 0.35, duration: 0.6, ease: 'power3.out', clearProps: 'transform,opacity' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!dir.current) return;
    const q = gsap.utils.selector(ref); const d = dir.current;
    gsap.fromTo(q('.mv-hang'), { x: d * 140, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out', onComplete: () => { busy.current = false; } });
    gsap.fromTo(q('.mv-label > *'), { y: 18, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.45, ease: 'power3.out' });
    q('.mv-thumbs .on')[0]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [i]);

  const go = (to) => {
    if (busy.current) return;
    const n = (to + ORDER.length) % ORDER.length; if (n === i) return;
    busy.current = true; window.speechSynthesis?.cancel(); setTalk(false);
    const d = to > i ? 1 : -1; dir.current = d; thock(1.2);
    gsap.to(ref.current.querySelector('.mv-hang'), { x: -d * 120, opacity: 0, duration: 0.28, ease: 'power2.in', onComplete: () => setI(n) });
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
    const u = new SpeechSynthesisUtterance(`Tác phẩm số ${a.n + 1}. ${a.title}. Thời gian: ${a.date}. ${a.desc || ''}`);
    u.lang = 'vi-VN'; const vi = s.getVoices().find((v) => v.lang?.toLowerCase().startsWith('vi')); if (vi) u.voice = vi;
    u.rate = 0.95; u.onend = () => setTalk(false); s.cancel(); s.speak(u); setTalk(true);
  };
  const R = ROOM_DEF[a.category] || OTHER_ROOM;

  return createPortal(
    <div className="mv-wrap" ref={ref} style={{ '--ac': R.accent }} onMouseMove={move} onMouseLeave={leave}>
      <div className="mv-bg" onClick={close} />
      <button className="mv-x" onClick={close} aria-label="Đóng">✕</button>
      <button className="mv-nav l" onClick={() => go(i - 1)} aria-label="Trước">‹</button>
      <button className="mv-nav r" onClick={() => go(i + 1)} aria-label="Sau">›</button>
      <div className="mv-stage">
        <div className="mv-hang">
          <div className={`mv-tilt ${loupe ? 'lp' : ''}`}>
            <div className={`gx-frame gx-${a.frame} mv-frame`}>
              <span className="gx-mat">
                <span className="mv-pic" style={{ '--ar': a.ar }}>
                  {a.img ? <img src={a.img} alt={a.title} draggable="false" /> : <span className="gx-ph">{R.ic}</span>}
                  {a.img && <span className="mv-loupe" style={{ backgroundImage: `url("${a.img}")` }} />}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="mv-label">
          <small className="ml-no">No. {fmtN(a.n)} / {ORDER.length} · Phòng {a.category}</small>
          <h3>{a.title}</h3>
          <span className="ml-date">{a.date}</span>
          {a.desc && <p>{a.desc}</p>}
          {a.featured && <span className="ml-seal">★ Tác phẩm tiêu biểu</span>}
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
      gsap.from('.ex-plq', { y: 60, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'back.out(1.8)', scrollTrigger: { trigger: root.current, start: 'top 75%' } });
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
      <p className="ex-k">Lối ra</p>
      <h3>Cảm ơn bạn đã ghé thăm triển lãm</h3>
      <div className="ex-plqs">
        {counts.map(([r, c]) => <div key={r.key} className="ex-plq" style={{ '--ac': r.accent }}><b data-v={c}>0</b><small>Phòng {r.key}</small></div>)}
        <div className="ex-plq" style={{ '--ac': '#a8802a' }}><b data-v={ORDER.filter((a) => a.featured).length}>0</b><small>Tiêu biểu</small></div>
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
    setView({ n, from: { left: r.left, top: r.top, width: r.width, height: r.height } });
  };
  return (
    <div className="mz">
      <Gallery key={layoutKey} onOpen={open} m={m} />
      <Exit m={m} />
      {view && <Viewer at={Math.min(view.n, m.ORDER.length - 1)} from={view.from} m={m} onClose={() => setView(null)} />}
      {ed.canEdit && <ListEditor ed={ed} label="thành tích" fields={ACH_FIELDS} blank={ACH_BLANK} preview={ACH_PREVIEW} />}
    </div>
  );
}
