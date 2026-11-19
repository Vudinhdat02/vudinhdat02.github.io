/*
 * Trang "Thành tích": "Phiêu lưu ký" qua Vùng đất Tri Thức, mỗi năm một vùng đất, mỗi thành tích một nhiệm vụ (AdventureBook).
 * Trang này không phát âm thanh.
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

/* ---------- "Phiêu lưu ký": hành trình qua các vùng đất, mỗi năm là một vùng ----------
 *  Trên cùng: tấm bản đồ kho báu vẽ tay (giấy da) nối các vùng đất; bảng chỉ số nhân vật (cấp, kinh nghiệm,
 *  số nhiệm vụ theo loại) dính trên đầu khi cuộn và tăng dần theo hành trình.
 *  Mỗi vùng: thẻ tên vùng lướt vào, sương mù tan dần, đường mòn tự vẽ, nhân vật đi theo thanh cuộn,
 *  lời kể gõ từng chữ như trong trò chơi; bên cạnh là các nhiệm vụ (mỗi thành tích một nhiệm vụ):
 *  cuộn giấy mở ra, rương báu bật nắp thành huy chương, cộng điểm kinh nghiệm, lên cấp khi sang vùng mới.
 *  Cuối cùng: "Hành trình tiếp tục…". Trang này không phát âm thanh. */
const CAT = { 'Học tập': 'c-hoc', 'Hoạt động': 'c-hd', 'Cuộc thi': 'c-thi' };
const REWARD = { 'Học tập': '🎖️', 'Hoạt động': '🏅', 'Cuộc thi': '🏆' };
const WORLDS = [
  { name: 'Làng Khởi Đầu', icon: '🏡', sky: 'sky-dawn', props: ['🌾', '🐓', '🌳'], hero: '🧒', story: 'Ngày ấy, cậu học trò Đạt khoác chiếc ba lô nhỏ rời làng, mang theo một ước mơ lớn: chinh phục vùng đất Tri Thức.' },
  { name: 'Thành Phố Học Viện', icon: '🏰', sky: 'sky-day', props: ['📜', '🦉', '📚'], hero: '🧑', story: 'Cổng thành Học Viện mở ra. Mỗi kỳ thi là một cánh cửa, sau cánh cửa là những cuộn giấy khen đang chờ.' },
  { name: 'Rừng Thử Thách', icon: '🌲', sky: 'sky-noon', props: ['🍄', '🦊', '🌲'], hero: '🧑‍💻', story: 'Khu rừng đầy bài kiểm tra và những đêm thức trắng bên máy tính, nhưng mỗi bước chân đều tìm thấy kho báu.' },
  { name: 'Núi Danh Dự', icon: '🏔️', sky: 'sky-sunset', props: ['🦅', '⛺', '🚩'], hero: '🧑‍🔬', story: 'Đường lên núi dốc và dài. Đạt lần lượt cắm cờ trên những đỉnh khó nhất, gom về cả một túi huy chương.' },
  { name: 'Đỉnh Sáng Tạo', icon: '🌋', sky: 'sky-night', props: ['🛰️', '✨', '🚀'], hero: '🧑‍🎓', story: 'Trên đỉnh cao nhất, những ý tưởng mới bắt đầu bay lên như vệ tinh. Cuộc phiêu lưu bước sang hồi mới.' },
];
const OPENERS = {
  'Học tập': ['Vượt qua thử thách học thuật, nhận', 'Giải xong bài toán khó nhất vùng, mở được', 'Sau nhiều đêm ôn luyện, giành lấy'],
  'Hoạt động': ['Giúp đỡ dân làng, được trao', 'Cùng đồng đội hoàn thành nhiệm vụ, nhận', 'Lan toả năng lượng tích cực, đổi lấy'],
  'Cuộc thi': ['Đánh bại các đối thủ trong giải đấu, giành', 'Bước lên sàn đấu và chiến thắng, mang về'],
};
const XP_PER = 120;
const tell = (a, k) => { const o = OPENERS[a.category] || ['Hoàn thành nhiệm vụ, nhận']; return `${o[k % o.length]} “${a.title}”.`; };
function burstAt(x, y) {
  if (reduced()) return;
  const host = document.createElement('div'); host.className = 'yb-burst'; document.body.appendChild(host);
  const cs = ['#ffe14d', '#d33a2c', '#6aa9f0', '#7ccf8a', '#ef7d57', '#b58cf0'];
  for (let k = 0; k < 18; k++) {
    const s = document.createElement('i');
    if (k % 4 === 0) { s.textContent = ['⭐', '💎', '🪙', '✨'][(k / 4) % 4]; s.className = 'emo'; } else s.style.background = cs[k % cs.length];
    s.style.left = x + 'px'; s.style.top = y + 'px'; host.appendChild(s);
    const a = (k / 18) * Math.PI * 2 + Math.random() * 0.3, d = 50 + Math.random() * 70;
    gsap.fromTo(s, { x: 0, y: 0, scale: 0.4, rotate: 0, opacity: 1 }, { x: Math.cos(a) * d, y: Math.sin(a) * d + 30, scale: 1, rotate: gsap.utils.random(-360, 360), opacity: 0, duration: 0.9, ease: 'power3.out' });
  }
  setTimeout(() => host.remove(), 1000);
}
function AdventureBook({ items, onOpen }) {
  const root = useRef(null);
  const [tab, setTab] = useState('all');
  const cats = [...new Set(items.map((a) => a.category).filter(Boolean))];
  const shown = tab === 'all' ? items : tab === 'gold' ? items.filter((a) => a.featured) : items.filter((a) => a.category === tab);
  const regions = [];
  shown.forEach((a) => { const y = a.year || 'Khác'; const g = regions[regions.length - 1]; if (g && g.y === y) g.list.push(a); else regions.push({ y, list: [a] }); });
  const world = (c) => WORLDS[Math.min(c, WORLDS.length - 1)];
  const count = (c) => items.filter((a) => a.category === c).length;
  const { lenis } = useDiary() || {};
  const goRegion = (c) => { const el = root.current?.querySelector(`[data-region="${c}"]`); if (!el) return; const y = el.getBoundingClientRect().top + window.scrollY - 150; if (lenis?.current) lenis.current.scrollTo(y, { duration: 1.2 }); else window.scrollTo({ top: y, behavior: 'smooth' }); };

  /* mở màn: bản đồ kho báu tự vẽ đường, các vùng đất hiện ra */
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo('.yb-sum > *', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(2)', delay: 0.1, clearProps: 'transform,opacity' });
      const path = root.current.querySelector('.qv-map path.route');
      if (path) { const l = path.getTotalLength(); gsap.fromTo(path, { strokeDasharray: `${l} ${l}`, strokeDashoffset: l }, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut', delay: 0.3, onComplete: () => { path.style.strokeDasharray = '10 9'; path.style.strokeDashoffset = '0'; } }); }
      gsap.from('.qv-spot', { scale: 0, y: 20, duration: 0.5, stagger: 0.25, ease: 'back.out(2.5)', delay: 0.5 });
      gsap.from('.qv-map .x', { scale: 0, rotate: -180, duration: 0.6, ease: 'back.out(3)', delay: 2.1 });
    }, root);
    return () => ctx.revert();
  }, [tab]);

  /* từng vùng đất: thẻ tên lướt vào, sương tan, đường mòn vẽ ra, lời kể gõ chữ, nhiệm vụ mở ra; chỉ số tăng dần */
  useLayoutEffect(() => {
    const el = root.current; if (!el) return undefined;
    const hud = { lv: el.querySelector('.qv-lv'), xp: el.querySelector('.qv-xp'), bar: el.querySelector('.qv-bar i'), n: el.querySelector('.qv-n') };
    const byCat = {}; el.querySelectorAll('.qv-cnt').forEach((c) => { byCat[c.dataset.c] = c; });
    const done = new Set(); let level = 0;
    const total = shown.length;
    const award = (card) => {
      if (done.has(card)) return; done.add(card);
      if (hud.n) hud.n.textContent = String(done.size);
      if (hud.xp) hud.xp.textContent = String(done.size * XP_PER);
      if (hud.bar) hud.bar.style.transform = `scaleX(${total ? done.size / total : 0})`;
      const c = byCat[card.dataset.c]; if (c) c.textContent = String(+c.textContent + 1);
      card.classList.add('open');
    };
    const levelUp = (c, name) => {
      if (c + 1 <= level) return; level = c + 1;
      if (hud.lv) hud.lv.textContent = String(level);
      const t = el.querySelector('.qv-toast'); if (!t) return;
      t.querySelector('b').textContent = `Lên cấp ${level}!`; t.querySelector('small').textContent = `Đã tới ${name}`;
      if (reduced()) return;
      gsap.killTweensOf(t);
      gsap.timeline().fromTo(t, { y: -30, scale: 0.6, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.45, ease: 'back.out(2.4)' }).to(t, { autoAlpha: 0, y: -20, duration: 0.4, delay: 1.6 });
    };
    const type = (p) => {
      const full = p.dataset.text || ''; if (reduced()) { p.textContent = full; return; }
      let i = 0; p.textContent = '';
      const id = setInterval(() => { i += 2; p.textContent = full.slice(0, i); if (i >= full.length) clearInterval(id); }, 28);
    };
    if (reduced()) {
      el.querySelectorAll('.qv-tell').forEach(type);
      el.querySelectorAll('.qv-card').forEach(award);
      el.querySelectorAll('.qv-region').forEach((r) => levelUp(+r.dataset.region, r.dataset.name));
      return undefined;
    }
    const ctx = gsap.context(() => {
      gsap.utils.toArray(el.querySelectorAll('.qv-region')).forEach((rg) => {
        const c = +rg.dataset.region;
        const tl = gsap.timeline({ scrollTrigger: { trigger: rg, start: 'top 75%', once: true, onEnter: () => levelUp(c, rg.dataset.name) } });
        tl.from(rg.querySelector('.qv-title'), { x: -80, skewX: -12, opacity: 0, duration: 0.6, ease: 'power3.out' })
          .to(rg.querySelector('.qv-fog'), { opacity: 0, scale: 1.4, duration: 1.2, ease: 'power2.out' }, 0.2)
          .from(rg.querySelector('.qv-land'), { y: 50, scale: 0.6, opacity: 0, duration: 0.7, ease: 'back.out(2)' }, 0.4)
          .from(rg.querySelectorAll('.sb-prop'), { y: -40, opacity: 0, rotate: () => gsap.utils.random(-60, 60), duration: 0.6, stagger: 0.1, ease: 'bounce.out' }, 0.6)
          .add(() => type(rg.querySelector('.qv-tell')), 0.9);
        const trail = rg.querySelector('.qv-trail path');
        if (trail) { const l = trail.getTotalLength(); gsap.fromTo(trail, { strokeDasharray: `${l} ${l}`, strokeDashoffset: l }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: rg, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 } }); }
        // nhân vật đi dọc đường mòn theo thanh cuộn (không giữ trang lại)
        gsap.fromTo(rg.querySelector('.qv-hero'), { left: '6%' }, { left: '74%', ease: 'none', scrollTrigger: { trigger: rg, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 } });
        gsap.to(rg.querySelector('.sb-cloud'), { xPercent: 80, ease: 'none', scrollTrigger: { trigger: rg, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
        rg.querySelectorAll('.qv-card').forEach((card, k) => {
          gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 86%', once: true } })
            .fromTo(card, { clipPath: 'inset(0 0 100% 0 round 14px)', y: 30 }, { clipPath: 'inset(0 0 0% 0 round 14px)', y: 0, duration: 0.7, ease: 'power3.out', delay: (k % 3) * 0.1, clearProps: 'clipPath,transform' })
            .from(card.querySelector('.qv-roll'), { scaleY: 0, transformOrigin: '50% 0%', duration: 0.3 }, 0)
            .to(card.querySelector('.qv-roll'), { y: () => card.offsetHeight, duration: 0.7, ease: 'power3.out' }, 0)
            .to(card.querySelector('.qv-roll'), { opacity: 0, duration: 0.2 })
            .fromTo(card.querySelector('.qv-chest'), { rotate: 0 }, { keyframes: [{ rotate: -14 }, { rotate: 12 }, { rotate: -8 }, { rotate: 0 }], duration: 0.4 }, 0.5)
            .add(() => award(card), 0.9)
            .fromTo(card.querySelectorAll('.qv-xpgain'), { y: 0, opacity: 0 }, { keyframes: [{ y: -16, opacity: 1, duration: 0.3 }, { y: -40, opacity: 0, duration: 0.6 }] }, 0.95)
            .fromTo(card.querySelectorAll('.sb-stamp'), { scale: 2.8, opacity: 0, rotate: -40 }, { scale: 1, opacity: 0.92, rotate: -12, duration: 0.3, ease: 'power4.in' }, 1.1);
        });
      });
      gsap.timeline({ scrollTrigger: { trigger: el.querySelector('.qv-end'), start: 'top 88%', once: true } })
        .from(el.querySelectorAll('.qv-end .sb-cap'), { y: 60, rotate: -200, opacity: 0, duration: 1, ease: 'back.out(1.6)' })
        .from(el.querySelectorAll('.qv-end b, .qv-end p'), { y: 20, opacity: 0, stagger: 0.1, duration: 0.5 }, 0.4);
      ScrollTrigger.refresh();
    }, el);
    return () => ctx.revert();
  }, [tab, items]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (t) => { if (t !== tab) setTab(t); };
  const W = 1000, H = 150;
  const spots = regions.map((_, c) => ({ x: 70 + (regions.length > 1 ? (c * (W - 140)) / (regions.length - 1) : (W - 140) / 2), y: c % 2 ? 46 : 104 }));
  const route = spots.length ? spots.reduce((d, p, k) => (k ? `${d} Q ${(spots[k - 1].x + p.x) / 2} ${k % 2 ? 6 : 144}, ${p.x} ${p.y}` : `M ${p.x - 50} ${p.y}`), '') : '';
  return (
    <div className="yb sb qv" ref={root}>
      <div className="yb-sum" role="tablist" aria-label="Lọc thành tích">
        <button role="tab" aria-selected={tab === 'all'} className={`yb-chip all ${tab === 'all' ? 'on' : ''}`} onClick={() => pick('all')}><b>{items.length}</b><span>Tất cả</span></button>
        {cats.map((c) => (
          <button key={c} role="tab" aria-selected={tab === c} className={`yb-chip ${CAT[c] || ''} ${tab === c ? 'on' : ''}`} onClick={() => pick(c)}><i aria-hidden="true">{IC[c] || '✦'}</i><b>{count(c)}</b><span>{c}</span></button>
        ))}
        <button role="tab" aria-selected={tab === 'gold'} className={`yb-chip gold ${tab === 'gold' ? 'on' : ''}`} onClick={() => pick('gold')}><i aria-hidden="true">⭐</i><b>{items.filter((a) => a.featured).length}</b><span>Tiêu biểu</span></button>
      </div>

      {/* bản đồ kho báu */}
      <header className="qv-cover">
        <div className="qv-cover-t"><span aria-hidden="true">📜</span><div><h2>Phiêu lưu ký: <em>Vùng đất Tri Thức</em></h2><p>Mỗi năm là một vùng đất, mỗi thành tích là một nhiệm vụ đã hoàn thành. Cuộn xuống để cùng Đạt lên đường!</p></div></div>
        <svg className="qv-map" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <path className="route" d={route} />
          {spots.length > 0 && <text className="x" x={spots[spots.length - 1].x + 40} y={spots[spots.length - 1].y + 8}>✖</text>}
        </svg>
        <div className="qv-spots">
          {regions.map((g, c) => (
            <button key={g.y} className="qv-spot" style={{ left: `${(spots[c].x / W) * 100}%`, top: `${(spots[c].y / H) * 100}%` }} onClick={() => goRegion(c)}>
              <i aria-hidden="true">{world(c).icon}</i><b>{world(c).name}</b><small>{g.y}</small>
            </button>
          ))}
        </div>
      </header>

      {/* bảng chỉ số nhân vật */}
      <div className="qv-hud" aria-live="off" key={'hud-' + tab}>
        <span className="qv-ava" aria-hidden="true">🧑‍🎓</span>
        <span className="qv-stat"><small>Cấp</small><b className="qv-lv">0</b></span>
        <span className="qv-stat grow"><small>Kinh nghiệm · <b className="qv-xp">0</b> XP</small><span className="qv-bar"><i /></span></span>
        <span className="qv-stat"><small>Nhiệm vụ</small><b><span className="qv-n">0</span>/{shown.length}</b></span>
        {cats.map((c) => <span key={c} className={`qv-stat mini ${CAT[c] || ''}`} title={c}><i aria-hidden="true">{IC[c] || '✦'}</i><b className="qv-cnt" data-c={c}>0</b></span>)}
      </div>
      <div className="qv-toast" aria-hidden="true"><b /><small /></div>

      {regions.map((g, c) => {
        const w = world(c);
        return (
          <section className={`sb-ch qv-region ${c % 2 ? 'alt' : ''} ${g.list.length === 1 ? 'one' : ''}`} key={tab + g.y} data-region={c} data-name={w.name}>
            <h3 className="qv-title"><small>Vùng {c + 1} · {g.y}</small>{w.icon} {w.name}</h3>
            <div className="sb-grid">
              <div className="sb-stage">
                <div className={`sb-scene ${w.sky}`} aria-hidden="true">
                  <span className="sb-sun">{w.sky === 'sky-night' ? '🌙' : '☀️'}</span>
                  <span className="sb-cloud">☁️</span>
                  <span className="qv-land"><i>{w.icon}</i></span>
                  <span className="sb-ground" />
                  <svg className="qv-trail" viewBox="0 0 300 60" preserveAspectRatio="none"><path d="M10 40 C 70 10, 120 58, 170 34 S 260 14, 292 30" /></svg>
                  {w.props.map((p, k) => <span key={k} className={`sb-prop p${k}`}>{p}</span>)}
                  <span className="qv-hero"><i>{w.hero}</i><b>🎒</b></span>
                  <span className="qv-fog" />
                </div>
                <p className="sb-bubble qv-tell" data-text={w.story} aria-label={w.story}>{w.story}</p>
              </div>
              <div className="sb-panels">
                {g.list.map((a, k) => (
                  <button key={a.id || a.n} data-c={a.category} className={`sb-panel qv-card ${CAT[a.category] || ''} ${a.featured ? 'star' : ''} ${a.ar < 0.95 ? 'tall' : 'wide'}`}
                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); burstAt(r.left + r.width / 2, r.top + 40); onOpen(a.n, e.currentTarget.querySelector('.sb-pic') || e.currentTarget); }}
                    aria-label={`Xem chi tiết: ${a.title}`}>
                    <span className="qv-head"><span>⚔️ Nhiệm vụ {k + 1}</span><span className="qv-chest" aria-hidden="true"><i className="shut">🧰</i><i className="won">{a.featured ? '👑' : REWARD[a.category] || '🏅'}</i></span></span>
                    <span className="sb-pic">{a.img ? <img src={a.img} alt="" loading="lazy" draggable="false" onLoad={(e) => { const im = e.currentTarget, tall = im.naturalHeight > im.naturalWidth * 1.05, pn = im.closest('.sb-panel'); pn?.classList.toggle('tall', tall); pn?.classList.toggle('wide', !tall); }} /> : <span className="yb-ph">{IC[a.category] || '✦'}</span>}</span>
                    <span className="sb-body">
                      <small className="yb-cat">{IC[a.category] || '✦'} {a.category} · {a.date}</small>
                      <b className="yb-t">{a.title}</b>
                      <span className="qv-line">{tell(a, k)}</span>
                    </span>
                    <span className="qv-xpgain" aria-hidden="true">+{XP_PER} XP</span>
                    {a.featured && <span className="sb-stamp" aria-hidden="true">Huyền thoại</span>}
                    <span className="qv-roll" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        );
      })}
      {shown.length > 0 && (
        <footer className="sb-end qv-end">
          <span className="sb-cap" aria-hidden="true">🗺️</span>
          <b>Hành trình tiếp tục…</b>
          <p>Bản đồ vẫn còn những vùng đất chưa đặt chân tới. Hẹn gặp ở chương sau!</p>
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
      <AdventureBook items={items} onOpen={open} />
      {view && items.length > 0 && <Detail items={items} at={Math.min(view.n, items.length - 1)} from={view.from} onClose={() => setView(null)} />}
      {ed.canEdit && <ListEditor ed={ed} label="thành tích" fields={ACH_FIELDS} blank={ACH_BLANK} preview={ACH_PREVIEW} />}
    </div>
  );
}
