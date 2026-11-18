/*
 * Trang "Thành tích": truyện tranh hoạt hình "Hành trình của mình", mỗi năm một chương (StoryBook). Trang này không phát âm thanh.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import data from '../../data/achievements.json';
import { asset } from '../../utils/asset';
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

/* ---------- truyện tranh "Hành trình của mình": mỗi năm là một chương ----------
 *  Bên trái: một cảnh hoạt hình (bầu trời, mặt trời, mây, trường lớp đổi theo chương, nhân vật đeo cặp đi vào,
 *  bong bóng lời thoại kể chuyện). Bên phải: các khung truyện, mỗi khung là một thành tích.
 *  Cuộn tới chương nào: nhân vật đi vào, bong bóng bật lên, khung truyện trượt ra so le, ngôi sao lấp lánh,
 *  thành tích tiêu biểu có con dấu "Xuất sắc" đóng xuống. Cuối truyện là cảnh tốt nghiệp "Chương tiếp theo…".
 *  Trang này không phát âm thanh. */
const CAT = { 'Học tập': 'c-hoc', 'Hoạt động': 'c-hd', 'Cuộc thi': 'c-thi' };
const HEROES = ['🧒', '🧑', '🧑‍💻', '🧑‍🔬', '🧑‍🎓'];
const PLACES = [['🏫', 'Trường trung cấp'], ['🏛️', 'Giảng đường đại học'], ['📚', 'Thư viện'], ['🏟️', 'Hội trường'], ['🔬', 'Phòng thí nghiệm'], ['🏢', 'Nơi làm việc']];
const SKIES = ['sky-dawn', 'sky-day', 'sky-noon', 'sky-sunset', 'sky-night'];
const PROPS = [['📚', '✏️', '🎒'], ['📐', '💡', '📝'], ['🏆', '⭐', '🎉'], ['💻', '🔧', '📡'], ['🎓', '🌟', '🎈']];
const LINES = [
  (y, n) => `Năm ${y}, mình bắt đầu hành trình với ${n} cột mốc đầu tiên!`,
  (y, n) => `Sang ${y}, mình cố gắng hơn và có thêm ${n} thành tích.`,
  (y, n) => `${y} là một năm bận rộn: ${n} điều đáng nhớ!`,
  (y, n) => `Đến ${y}, mình vẫn tiếp tục chinh phục ${n} mục tiêu mới.`,
];
function burstAt(x, y) {
  if (reduced()) return;
  const host = document.createElement('div'); host.className = 'yb-burst'; document.body.appendChild(host);
  const cs = ['#ffe14d', '#d33a2c', '#6aa9f0', '#7ccf8a', '#ef7d57', '#b58cf0'];
  for (let k = 0; k < 18; k++) {
    const s = document.createElement('i');
    if (k % 4 === 0) { s.textContent = ['⭐', '✏️', '🍎', '📚'][(k / 4) % 4]; s.className = 'emo'; } else s.style.background = cs[k % cs.length];
    s.style.left = x + 'px'; s.style.top = y + 'px'; host.appendChild(s);
    const a = (k / 18) * Math.PI * 2 + Math.random() * 0.3, d = 50 + Math.random() * 70;
    gsap.fromTo(s, { x: 0, y: 0, scale: 0.4, rotate: 0, opacity: 1 }, { x: Math.cos(a) * d, y: Math.sin(a) * d + 30, scale: 1, rotate: gsap.utils.random(-360, 360), opacity: 0, duration: 0.9, ease: 'power3.out' });
  }
  setTimeout(() => host.remove(), 1000);
}
function StoryBook({ items, onOpen }) {
  const root = useRef(null);
  const [tab, setTab] = useState('all');
  const cats = [...new Set(items.map((a) => a.category).filter(Boolean))];
  const shown = tab === 'all' ? items : tab === 'gold' ? items.filter((a) => a.featured) : items.filter((a) => a.category === tab);
  const chapters = [];
  shown.forEach((a) => { const y = a.year || 'Khác'; const g = chapters[chapters.length - 1]; if (g && g.y === y) g.list.push(a); else chapters.push({ y, list: [a] }); });
  const count = (c) => items.filter((a) => a.category === c).length;

  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo('.yb-sum > *', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(2)', delay: 0.1, clearProps: 'transform,opacity' });
      gsap.from('.sb-cover > *', { y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out', delay: 0.2 });
    }, root);
    return () => ctx.revert();
  }, []);
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.sb-ch').forEach((ch) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: ch, start: 'top 78%', once: true } });
        tl.from(ch.querySelector('.sb-tab'), { x: -40, opacity: 0, duration: 0.5, ease: 'back.out(2)' })
          .from(ch.querySelector('.sb-scene'), { clipPath: 'inset(0 0 100% 0 round 22px)', duration: 0.7, ease: 'power3.inOut' }, 0.05)
          .from(ch.querySelector('.sb-sun'), { y: 60, opacity: 0, duration: 0.9, ease: 'power2.out' }, 0.4)
          .from(ch.querySelector('.sb-place'), { y: 40, scale: 0.6, opacity: 0, duration: 0.6, ease: 'back.out(2)' }, 0.5)
          .from(ch.querySelector('.sb-hero'), { x: -160, duration: 1.1, ease: 'power2.out' }, 0.55)
          .from(ch.querySelectorAll('.sb-prop'), { y: -40, opacity: 0, rotate: () => gsap.utils.random(-60, 60), duration: 0.6, stagger: 0.1, ease: 'bounce.out' }, 0.8)
          .from(ch.querySelector('.sb-bubble'), { scale: 0, transformOrigin: '20% 100%', duration: 0.5, ease: 'back.out(2.4)' }, 1.3)
          .from(ch.querySelectorAll('.sb-panel'), { y: 60, x: (k) => (k % 2 ? 40 : -40), rotate: (k) => (k % 2 ? 4 : -4), opacity: 0, duration: 0.7, stagger: 0.12, ease: 'back.out(1.5)', clearProps: 'transform,opacity' }, 0.3)
          .fromTo(ch.querySelectorAll('.sb-stamp'), { scale: 2.8, opacity: 0, rotate: -40 }, { scale: 1, opacity: 0.92, rotate: -12, duration: 0.3, ease: 'power4.in', stagger: 0.15 }, 1.1)
          .from(ch.querySelectorAll('.sb-spark'), { scale: 0, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'back.out(3)' }, 1.2);
        // nhân vật và cảnh trôi nhẹ theo thanh cuộn (thị sai), không giữ trang lại
        gsap.to(ch.querySelector('.sb-cloud'), { xPercent: 60, ease: 'none', scrollTrigger: { trigger: ch, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
        gsap.to(ch.querySelector('.sb-place'), { yPercent: -12, ease: 'none', scrollTrigger: { trigger: ch, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
      });
      gsap.timeline({ scrollTrigger: { trigger: '.sb-end', start: 'top 85%', once: true } })
        .from('.sb-end .sb-cap', { y: 60, rotate: -200, opacity: 0, duration: 1, ease: 'back.out(1.6)' })
        .from('.sb-end p, .sb-end b', { y: 20, opacity: 0, stagger: 0.1, duration: 0.5 }, 0.4);
      ScrollTrigger.refresh();
    }, root);
    return () => ctx.revert();
  }, [tab, items]);

  const pick = (t) => { if (t !== tab) setTab(t); };
  return (
    <div className="yb sb" ref={root}>
      <div className="yb-sum" role="tablist" aria-label="Lọc thành tích">
        <button role="tab" aria-selected={tab === 'all'} className={`yb-chip all ${tab === 'all' ? 'on' : ''}`} onClick={() => pick('all')}><b>{items.length}</b><span>Tất cả</span></button>
        {cats.map((c) => (
          <button key={c} role="tab" aria-selected={tab === c} className={`yb-chip ${CAT[c] || ''} ${tab === c ? 'on' : ''}`} onClick={() => pick(c)}><i aria-hidden="true">{IC[c] || '✦'}</i><b>{count(c)}</b><span>{c}</span></button>
        ))}
        <button role="tab" aria-selected={tab === 'gold'} className={`yb-chip gold ${tab === 'gold' ? 'on' : ''}`} onClick={() => pick('gold')}><i aria-hidden="true">⭐</i><b>{items.filter((a) => a.featured).length}</b><span>Tiêu biểu</span></button>
      </div>

      <header className="sb-cover">
        <span className="sb-cover-ic" aria-hidden="true">📖</span>
        <h2>Truyện tranh: <em>Hành trình của mình</em></h2>
        <p>{chapters.length} chương · {shown.length} thành tích · cuộn xuống để lật từng trang</p>
      </header>

      {chapters.map((g, c) => {
        const place = PLACES[Math.min(c, PLACES.length - 1)];
        const props = PROPS[c % PROPS.length];
        return (
          <section className={`sb-ch ${c % 2 ? 'alt' : ''} ${g.list.length === 1 ? 'one' : ''}`} key={tab + g.y}>
            <h3 className="sb-tab"><small>Chương {c + 1}</small>{g.y}</h3>
            <div className="sb-grid">
              <div className="sb-stage">
                <div className={`sb-scene ${SKIES[c % SKIES.length]}`} aria-hidden="true">
                  <span className="sb-sun">{SKIES[c % SKIES.length] === 'sky-night' ? '🌙' : '☀️'}</span>
                  <span className="sb-cloud">☁️</span>
                  <span className="sb-place"><i>{place[0]}</i><small>{place[1]}</small></span>
                  <span className="sb-ground" />
                  {props.map((p, k) => <span key={k} className={`sb-prop p${k}`}>{p}</span>)}
                  <span className="sb-hero"><i>{HEROES[Math.min(c, HEROES.length - 1)]}</i><b>🎒</b></span>
                </div>
                <p className="sb-bubble">{LINES[Math.min(c, LINES.length - 1)](g.y, g.list.length)}</p>
              </div>
              <div className="sb-panels">
                {g.list.map((a, k) => (
                  <button key={a.id || a.n} className={`sb-panel ${CAT[a.category] || ''} ${a.featured ? 'star' : ''} ${a.ar < 0.95 ? 'tall' : 'wide'}`}
                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); burstAt(r.left + r.width / 2, r.top + 40); onOpen(a.n, e.currentTarget.querySelector('.sb-pic') || e.currentTarget); }}
                    aria-label={`Xem chi tiết: ${a.title}`}>
                    <span className="sb-no" aria-hidden="true">#{k + 1}</span>
                    <span className="sb-pic">{a.img ? <img src={a.img} alt="" loading="lazy" draggable="false" onLoad={(e) => { const im = e.currentTarget, tall = im.naturalHeight > im.naturalWidth * 1.05, pn = im.closest('.sb-panel'); pn?.classList.toggle('tall', tall); pn?.classList.toggle('wide', !tall); }} /> : <span className="yb-ph">{IC[a.category] || '✦'}</span>}</span>
                    <span className="sb-body">
                      <small className="yb-cat">{IC[a.category] || '✦'} {a.category}</small>
                      <b className="yb-t">{a.title}</b>
                      <span className="yb-date">{a.date}</span>
                      {a.desc && <span className="yb-desc">{a.desc}</span>}
                    </span>
                    {a.featured && <><span className="sb-stamp" aria-hidden="true">Xuất sắc</span><i className="sb-spark s1" aria-hidden="true">✦</i><i className="sb-spark s2" aria-hidden="true">✧</i><i className="sb-spark s3" aria-hidden="true">✦</i></>}
                  </button>
                ))}
              </div>
            </div>
          </section>
        );
      })}
      {shown.length > 0 && (
        <footer className="sb-end">
          <span className="sb-cap" aria-hidden="true">🎓</span>
          <b>Chương tiếp theo…</b>
          <p>Hành trình vẫn đang được viết tiếp. Hẹn gặp ở trang sau!</p>
        </footer>
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
      <StoryBook items={items} onOpen={open} />
      {view && items.length > 0 && <Detail items={items} at={Math.min(view.n, items.length - 1)} from={view.from} onClose={() => setView(null)} />}
      {ed.canEdit && <ListEditor ed={ed} label="thành tích" fields={ACH_FIELDS} blank={ACH_BLANK} preview={ACH_PREVIEW} />}
    </div>
  );
}
