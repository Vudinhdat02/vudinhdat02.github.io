/*
 * TRANG CHỦ — chỉ giữ những thứ tiêu biểu: giới thiệu, hành trình (vài thành tích nổi bật),
 * kỹ năng, 3 dự án, 5 trang nhật ký mới nhất và bộ thẻ mở các trang riêng.
 * Cuộn dọc tự nhiên từ trên xuống: không ghim trang, không cuộn ngang; các mục chỉ trượt lên / hiện dần
 * khi lọt vào màn hình (GSAP ScrollTrigger, chạy một lần). Rời trang chủ thì mọi hiệu ứng được dọn sạch.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { profile } from '../data/profile';
import projectsData from '../data/projects.json';
import achievementsData from '../data/achievements.json';
import statsData from '../data/stats.json';
import skillsData from '../data/skills.json';
import introData from '../data/intro.json';
import aboutData from '../data/about.json';
import { DocEditor, ListEditor, useEditable, useEditableDoc } from './Editor';
import { STAT_BLANK, STAT_FIELDS, STAT_PREVIEW, ABOUT_FIELDS, ACH_BLANK, ACH_FIELDS, ACH_PREVIEW, PROJ_BLANK, PROJ_FIELDS, PROJ_PREVIEW, SKILL_BLANK, SKILL_FIELDS, SKILL_PREVIEW } from './fields';
import { asset } from '../utils/asset';
import { thock, thud } from './sound';
import { DiaryHome, useDiary } from './Diary';
import { ROUTES } from './routes';
import { Bounce, Doodle, Torn, Tape, SpinBadge } from './Fx';
import Footer from './Footer';


gsap.registerPlugin(ScrollTrigger);

const DISPLAY_NAME = 'VŨ ĐÌNH ĐẠT';
export const HOME_SECTIONS = [
  { id: 'muc-gioi-thieu', label: 'Giới thiệu' },
  { id: 'muc-hanh-trinh', label: 'Hành trình' },
  { id: 'muc-ky-nang', label: 'Kỹ năng' },
  { id: 'muc-du-an', label: 'Dự án tiêu biểu' },
  { id: 'muc-nhat-ky', label: 'Nhật ký mới' },
  { id: 'muc-them', label: 'Các trang khác' },
];
export const yearOf = (d) => { const m = String(d).match(/(\d{4})/g); return m ? +m[m.length - 1] * 100 + (m.length > 1 ? 1 : 0) : 0; };
const sortAch = (list) => [...list].sort((a, b) => yearOf(a.date) - yearOf(b.date));
export const ACH = sortAch(achievementsData);
// trang chủ chỉ hiện vài cái tiêu biểu; xem hết thì mở trang riêng
const achHome = (all) => {
  const pick = [...all.filter((a) => a.featured), ...[...all].reverse().filter((a) => !a.featured)].slice(0, 6);
  return all.filter((a) => pick.includes(a));
};
const projHome = (list) => { const f = list.filter((p) => p.pinned || p.featured); return (f.length ? f : list).slice(0, 3); };
const stampFor = (a) => (/xuất sắc|cao nhất|giải/i.test(a.title) ? 'XUẤT SẮC' : /5 tốt|tiêu biểu/i.test(a.title) ? 'TIÊU BIỂU' : /khen/i.test(a.title) ? 'KHEN THƯỞNG' : 'ĐÃ ĐẠT');
const vi = (v) => (typeof v === 'object' && v ? v.vi || v.en : v);
const splitSkills = (s) => s.split(/\s*[-,·]\s+|,\s*|\s+\/\s+/).map((x) => x.trim()).filter(Boolean);

const KB_ROWS = [
  ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫'],
  ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '\\'],
  ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Enter'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', 'Shift'],
  ['Ctrl', 'Alt', ' ', 'Alt', 'Fn'],
];
const keyId = (k) => ({ Esc: 'escape', '⌫': 'backspace', ' ': 'space' }[k] || k.toLowerCase());
const WIDE = { Tab: 1.5, '\\': 1.5, Caps: 1.8, Enter: 2.2, Shift: 2.4, Ctrl: 1.5, Alt: 1.3, Fn: 1.3, ' ': 6.4, '⌫': 1.6, Esc: 1.2 };

/* ---------- trang chủ: dữ liệu sửa được trên web (khi đăng nhập #admin) ---------- */
const EDITS = [
  ['about', '🙋 Giới thiệu & ảnh đại diện'],
  ['stats', '🔢 Các con số (GPA, kinh nghiệm…)'],
  ['ach', '📌 Hành trình (thành tích)'],
  ['skills', '⌨️ Kỹ năng'],
  ['proj', '🗂 Dự án tiêu biểu'],
];
export default function Home(props) {
  const about = useEditableDoc(aboutData, 'about');
  const ach = useEditable(achievementsData, 'achievements');
  const skills = useEditable(skillsData, 'skills');
  const proj = useEditable(projectsData, 'projects');
  const stats = useEditable(statsData, 'stats');
  const [panel, setPanel] = useState(null);
  const [menu, setMenu] = useState(false);
  const data = useMemo(() => ({ about: { ...aboutData, ...about.doc }, ach: ach.items, skills: skills.items, projects: proj.items, stats: stats.items }), [about.doc, ach.items, skills.items, proj.items, stats.items]);
  const key = useMemo(() => hash(JSON.stringify(data)), [data]);
  const close = () => setPanel(null);
  const canEdit = about.canEdit;
  return (
    <>
      <HomeView key={key} {...props} data={data} />
      {canEdit && (
        <div className={`ed-menu ${menu ? 'open' : ''}`}>
          {menu && <div className="ed-menu-list">{EDITS.map(([k, t]) => <button key={k} onClick={() => { setPanel(k); setMenu(false); thock(1.2); }}>{t}</button>)}</div>}
          <button className="ed-fab" onClick={() => { setMenu(!menu); thock(1.2); }}>{menu ? '✕ Đóng' : '✎ Sửa trang chủ'}</button>
        </div>
      )}
      {panel === 'about' && <DocEditor ed={about} title="Sửa phần giới thiệu" fields={ABOUT_FIELDS} onClose={close} />}
      {canEdit && <ListEditor noFab open={panel === 'ach'} onClose={close} ed={ach} label="thành tích" fields={ACH_FIELDS} blank={ACH_BLANK} preview={ACH_PREVIEW} />}
      {canEdit && <ListEditor noFab open={panel === 'stats'} onClose={close} ed={stats} label="con số" fields={STAT_FIELDS} blank={STAT_BLANK} preview={STAT_PREVIEW} />}
      {canEdit && <ListEditor noFab open={panel === 'skills'} onClose={close} ed={skills} label="kỹ năng" fields={SKILL_FIELDS} blank={SKILL_BLANK} preview={SKILL_PREVIEW} />}
      {canEdit && <ListEditor noFab open={panel === 'proj'} onClose={close} ed={proj} label="dự án" fields={PROJ_FIELDS} blank={PROJ_BLANK} preview={PROJ_PREVIEW} />}
    </>
  );
}
const hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; };

/* một con số ở mục Về mình: tự đếm, hoặc tách "3.83" / "3+" / "100%" thành số để chạy hiệu ứng đếm */
function statNum(st, achs, projects) {
  const auto = { 'Số thành tích': achs.length, 'Số dự án': projects.length, 'Số thành tích tiêu biểu': achs.filter((a) => a.featured).length }[st.auto];
  if (auto != null) return { to: auto, dec: 0, pre: '', suf: '', text: String(auto) };
  const m = String(st.value || '').match(/^(\D*?)(\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return null;
  const num = m[2].replace(',', '.');
  return { to: parseFloat(num), dec: (num.split('.')[1] || '').length, pre: m[1], suf: m[3], text: st.value };
}

function HomeView({ onNav, onLightbox, data }) {
  const root = useRef(null);
  const diary = useDiary();
  const about = data.about;
  const ACHS = sortAch(data.ach);
  const ACH_HOME = achHome(ACHS);
  const PROJ_HOME = projHome(data.projects);
  const ALL_SKILLS = data.skills.flatMap((g) => splitSkills(g.desc || ''));

  /* ---------- màn hình CRT tự gõ chữ (ghi thẳng vào DOM cho nhẹ) ---------- */
  useEffect(() => {
    const els = root.current.querySelectorAll('.crt-line .txt');
    const lines = ['C:\\> chay dat.exe', 'Xin chào, mình là', about.role];
    let li = 0, ci = 0, timer;
    const tick = () => {
      if (li >= lines.length) return;
      ci++;
      els[li].textContent = lines[li].slice(0, ci);
      if (ci >= lines[li].length) { li++; ci = 0; timer = setTimeout(tick, 380); } else timer = setTimeout(tick, 34 + Math.random() * 40);
    };
    timer = setTimeout(tick, 1300);
    return () => clearTimeout(timer);
  }, []);

  /* ---------- tất cả hiệu ứng cuộn ---------- */
  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { root.current.classList.add('reduce'); return; }

    const ctx = gsap.context((self) => {
      const q = gsap.utils.selector(root);

      /* ====== 0. MỞ MÀN: bật máy ====== */
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .from(q('.desk-item'), { y: -60, opacity: 0, rotate: () => gsap.utils.random(-25, 25), stagger: 0.07, duration: 0.9 })
        .from(q('.crt'), { y: 80, opacity: 0, duration: 1 }, 0.1)
        .from(q('.kb'), { y: 140, opacity: 0, rotateX: 40, duration: 1.1 }, 0.25)
        .fromTo(q('.crt-on'), { scaleY: 0.004, scaleX: 0 }, { scaleX: 1, duration: 0.25, ease: 'power2.in' }, 0.9)
        .to(q('.crt-on'), { scaleY: 1, duration: 0.3, ease: 'power4.out' })
        .from(q('.crt-name .ch'), { opacity: 0, y: 10, stagger: 0.04, duration: 0.3 }, '+=1.6')
        .from(q('.kc'), { y: -6, stagger: { each: 0.008, from: 'random' }, duration: 0.25, ease: 'power2.out' }, 1);

      /* rê chuột → đồ trên bàn trôi theo độ sâu */
      const items = q('[data-depth]').map((el) => ({ el, d: +el.dataset.depth, x: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3' }) }));
      const onMove = (e) => {
        const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
        items.forEach((it) => { it.x(nx * it.d * 40); it.y(ny * it.d * 40); });
      };
      window.addEventListener('mousemove', onMove);
      self.add(() => () => window.removeEventListener('mousemove', onMove));

      /* Cuộn dọc là chính: không ghim, không cuộn ngang. Mỗi mục chỉ "hiện dần" khi lọt vào màn hình. */
      const MOB = window.matchMedia('(max-width: 759px)').matches;
      const onEnter = (trigger, start = 'top 78%') => ({ trigger, start, once: true });

      /* ====== 1. HERO: "zoom vào màn hình" theo thanh cuộn — trang vẫn cuộn xuống bình thường, không ghim ======
         Màn hình CRT phóng to và trượt xuống bù lại quãng cuộn (nên trông như máy quay tiến lại gần),
         bàn phím đổ ra trước, đồ trên bàn bay ra mép, màn hình loé sáng rồi khung giấy kẻ ô hiện lên. */
      /* Tiến độ cuộn qua phần đầu trang (0 → 1) ghi vào biến CSS --z; CSS tự tính độ phóng / bay
         (dùng thuộc tính scale / translate riêng nên không giành giật với hiệu ứng mở màn và rê chuột). */
      const heroEl = q('.hero')[0];
      ScrollTrigger.create({ trigger: heroEl, start: 'top top', end: 'bottom top', onUpdate: (st) => heroEl.style.setProperty('--z', st.progress.toFixed(4)), onRefresh: (st) => heroEl.style.setProperty('--z', st.progress.toFixed(4)) });

      /* ====== 2. GIỚI THIỆU: trang vở trượt lên, chữ hiện dần ====== */
      const about = gsap.timeline({ scrollTrigger: onEnter('.about', 'top 72%') });
      about
        .from(q('.about .notebook'), { y: 70, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0)
        .fromTo(q('.about .hw-title'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'power2.out' }, 0.3)
        .from(q('.about .polaroid'), { y: 60, rotate: 14, opacity: 0, duration: 0.8, ease: 'back.out(1.5)' }, 0.35)
        .from(q('.about .tape'), { scaleX: 0, duration: 0.3 }, 0.9)
        .to(q('.about .w'), { opacity: 1, stagger: 0.008, duration: 0.3, ease: 'none' }, 0.45)
        .to(q('.about .hl'), { backgroundSize: '100% 100%', stagger: 0.12, duration: 0.4, ease: 'power1.out' }, 1)
        .fromTo(q('.about .doodle path'), { strokeDashoffset: 400 }, { strokeDashoffset: 0, stagger: 0.1, duration: 0.7, ease: 'none' }, 1)
        .from(q('.about .stat'), { y: 30, opacity: 0, stagger: 0.08, duration: 0.5, ease: 'back.out(1.6)' }, 1.1);
      q('.about .stat-n[data-to]').forEach((el) => {
        const to = parseFloat(el.dataset.to), dec = el.dataset.dec ? +el.dataset.dec : 0, obj = { v: 0 };
        about.to(obj, { v: to, duration: 1, ease: 'power2.out', onUpdate: () => { el.textContent = (el.dataset.pre || '') + obj.v.toFixed(dec) + (el.dataset.suf || ''); } }, 1.2);
      });

      /* ====== 3. HÀNH TRÌNH: đường thời gian dọc, nét kẻ chạy theo tiến độ cuộn ====== */
      gsap.fromTo(q('.hj-line i'), { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.hj-list', start: 'top 70%', end: 'bottom 70%', scrub: true } });
      q('.hj-item').forEach((it, i) => {
        const card = it.querySelector('.jr-card'), stamp = it.querySelector('.stamp'), dot = it.querySelector('.hj-dot');
        const tl = gsap.timeline({ scrollTrigger: onEnter(it, 'top 84%') });
        tl.from(dot, { scale: 0, duration: 0.4, ease: 'back.out(3)' }, 0)
          .from(card, { x: MOB ? 40 : (i % 2 ? 80 : -80), y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.05);
        if (stamp) tl.fromTo(stamp, { scale: 2.6, opacity: 0, rotate: -40 }, { scale: 1, opacity: 0.88, rotate: -14, duration: 0.3, ease: 'power4.in', onComplete: () => thud() }, 0.6);
      });
      /* trôi nhẹ so le theo thanh cuộn (máy tính) */
      if (!MOB) q('.hj-item').forEach((it, i) => gsap.fromTo(it, { y: i % 2 ? 40 : 10 }, { y: i % 2 ? -40 : -10, ease: 'none', scrollTrigger: { trigger: it, start: 'top bottom', end: 'bottom top', scrub: 0.8 } }));
      gsap.from(q('.hj-all'), { scale: 0.6, opacity: 0, duration: 0.6, ease: 'back.out(2)', scrollTrigger: onEnter('.hj-all', 'top 92%') });

      /* ====== 4. KỸ NĂNG: phím rơi xuống bảng đen ====== */
      gsap.fromTo(q('.board .chalk-title'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: 'power2.out', scrollTrigger: onEnter('.board', 'top 75%') });
      gsap.from(q('.board .sk-label'), { x: -40, opacity: 0, stagger: 0.1, duration: 0.5, scrollTrigger: onEnter('.board', 'top 65%') });
      gsap.from(q('.board .sk-cap'), {
        y: -60, rotate: () => gsap.utils.random(-25, 25), opacity: 0,
        stagger: { each: 0.02, from: 'random' }, duration: 0.7, ease: 'back.out(1.7)',
        scrollTrigger: { ...onEnter('.board', 'top 60%'), onEnter: () => { let n = 0; const id = setInterval(() => { thock(0.8 + Math.random() * 0.6); if (++n > 8) clearInterval(id); }, 90); } },
      });
      gsap.to(q('.board .eraser-swipe'), { xPercent: 900, ease: 'none', scrollTrigger: { trigger: '.board', start: 'top 80%', end: 'bottom 20%', scrub: 1 } });
      gsap.to(q('.board .smudge'), { opacity: 0, stagger: 0.1, duration: 1, scrollTrigger: onEnter('.board', 'top 60%') });

      /* ====== 5. DỰ ÁN: thẻ trượt lên, số thứ tự bật ra, thanh màu chạy, nhãn công nghệ nảy lên ====== */
      q('.hpj-grid .paper').forEach((p, i) => {
        gsap.timeline({ scrollTrigger: onEnter(p, 'top 88%') })
          .from(p, { y: 70, opacity: 0, duration: 0.8, ease: 'power3.out' }, MOB ? 0 : (i % 3) * 0.12)
          .from(p.querySelector('.pj-no'), { scale: 0.3, opacity: 0, rotate: -20, duration: 0.6, ease: 'back.out(2.2)' }, '-=0.45')
          .fromTo(p.querySelector('.pj-line'), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power2.out' }, '-=0.5')
          .from(p.querySelectorAll('.exam-tags span'), { y: 12, opacity: 0, stagger: 0.05, duration: 0.35, ease: 'back.out(2)' }, '-=0.4');
      });
      gsap.from(q('.exam-all'), { y: 20, opacity: 0, duration: 0.5, scrollTrigger: onEnter('.exam-all', 'top 95%') });

      /* ====== 6. THẺ MỤC LỤC: xoè ra như bộ bài ====== */
      gsap.from(q('.deck .rc'), { y: 120, rotate: (i) => (i - 2.5) * 10, opacity: 0, stagger: 0.07, duration: 0.9, ease: 'back.out(1.3)', clearProps: 'transform', scrollTrigger: onEnter('.deck', 'top 85%') });
      gsap.fromTo(q('.more .doo-big path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power1.inOut', scrollTrigger: onEnter('.more', 'top 80%') });

      /* tiêu đề mục: trượt lên khi tới */
      q('.sec-title').forEach((t) => gsap.from(t, { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: onEnter(t, 'top 90%') }));

      /* hai dải băng keo xoay nhẹ và trôi ngược chiều nhau khi cuộn qua */
      q('.tapes').forEach((t) => gsap.fromTo(t, { rotate: -1.2, scale: 0.97 }, { rotate: 1.2, scale: 1.02, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'bottom top', scrub: 0.6 } }));
      /* bảng đen nghiêng về phía người xem rồi đứng thẳng khi cuộn tới */
      if (!MOB) gsap.fromTo(q('.board'), { rotateX: 14, scale: 0.94 }, { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.skills', start: 'top bottom', end: 'top 30%', scrub: 0.8 } });
      /* băng keo chữ trượt vào */
      q('.tape-band').forEach((t, i) => gsap.from(t, { xPercent: i % 2 ? 20 : -20, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: onEnter(t, 'top 95%') }));

      /* ảnh, giấy nhớ trong mục giới thiệu trôi nhẹ theo cuộn (parallax, không giữ trang) */
      if (!MOB) q('[data-par]').forEach((el) => gsap.to(el, { yPercent: -+el.dataset.par, ease: 'none', scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } }));
    }, root);

    // ảnh tải xong thì đo lại kích thước cho đúng
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    document.fonts?.ready.then(refresh);
    return () => { window.removeEventListener('load', refresh); ctx.revert(); };
  }, []);

  const press = (e) => { e.currentTarget.classList.add('down'); thock(); };
  const release = (e) => e.currentTarget.classList.remove('down');

  const bioWords = renderBio(about.bio || '', (about.highlights || []).filter(Boolean));
  const counts = { 'du-an': data.projects.length, 'thanh-tich': ACHS.length, 'nhat-ky': diary.posts.length };

  return (
    <div ref={root} className="home">
      {/* ================= HERO ================= */}
      <section className="hero">
        <div className="desk-surface" />
        <div className="desk-item note-a" data-depth="1.4"><div className="sticky yellow">TODO:{(about.todo || []).map((t, i) => <span key={i}><br />{t}</span>)}</div></div>
        <div className="desk-item note-b" data-depth="1.1"><div className="sticky pink">Nhấn phím<br /><b>1 → 7</b><br />để mở từng trang ✍</div></div>
        <div className="desk-item pencil" data-depth="0.8"><i /></div>
        <div className="desk-item ruler" data-depth="0.6">{Array.from({ length: 30 }, (_, i) => <span key={i} className={i % 5 ? '' : 'big'} />)}</div>
        <div className="desk-item mug" data-depth="1.2"><span className="steam" /><span className="steam s2" /></div>
        <div className="desk-item eraser" data-depth="1"><span>ICTU</span></div>

        <div className="crt" data-depth="0.25">
          <div className="crt-zoom">
          <div className="crt-body">
            <div className="crt-screen">
              <div className="crt-on">
                <p className="crt-line"><span className="txt" /></p>
                <p className="crt-line"><span className="txt" /></p>
                <h1 className="crt-name">{[...DISPLAY_NAME].map((c, i) => <span key={i} className="ch">{c === ' ' ? '\u00a0' : c}</span>)}</h1>
                <p className="crt-line amber"><span className="txt" /><span className="caret">█</span></p>
              </div>
              <div className="crt-glare" />
            </div>
            <div className="crt-brand"><i className="crt-led" /></div>
          </div>
          <div className="crt-neck" />
          </div>
        </div>

        <div className="kb-wrap" data-depth="0.15">
          <div className="kb-fall">
          <div className="kb">
            {KB_ROWS.map((row, r) => (
              <div className="kb-row" key={r}>
                {row.map((k, c) => {
                  const nav = r === 0 && +k >= 1 && +k <= ROUTES.length ? +k - 1 : -1;
                  return (
                    <button key={c} className={`kc ${nav >= 0 ? 'nav' : ''} ${k.length > 1 || k === ' ' ? 'mod' : ''}`} data-k={keyId(k)} style={{ '--w': WIDE[k] || 1, '--c': nav >= 0 ? ROUTES[nav].color : undefined }}
                      onPointerDown={press} onPointerUp={release} onPointerLeave={release} onClick={() => nav >= 0 && onNav(ROUTES[nav].id)} tabIndex={nav >= 0 ? 0 : -1} aria-label={nav >= 0 ? ROUTES[nav].label : undefined}>
                      <span className="kc-top">{k === ' ' ? 'cuộn xuống ↓' : k}{nav >= 0 && <small>{ROUTES[nav].label}</small>}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          </div>
        </div>
        <SpinBadge className="hero-badge" center="Đ" />
        <Doodle kind="spark" className="hd hd1" color="#f08a24" />
        <Doodle kind="star" className="hd hd2" color="#3b6fd8" delay={0.4} />
        <Doodle kind="swirl" className="hd hd3" color="#d33a2c" delay={0.8} />
        <p className="hero-hint">cuộn xuống để “vào” màn hình <span>↓</span></p>
        <div className="hero-wipe" aria-hidden="true" />
      </section>

      {/* ================= GIỚI THIỆU ================= */}
      <section className="about paper-bg" id="muc-gioi-thieu">
        <div className="notebook">
          <div className="spiral">{Array.from({ length: 14 }, (_, i) => <i key={i} />)}</div>
          <div className="nb-page">
            <h2 className="hw-title">Về mình ✏️</h2>
            <p className="bio">{bioWords}</p>
            <div className="stats">
              {data.stats.map((st) => {
                const n = statNum(st, ACHS, data.projects);
                return n ? <div key={st.id || st.label} className="stat"><b className="stat-n" data-to={n.to} data-dec={n.dec} data-pre={n.pre} data-suf={n.suf}>{n.text}</b><span>{st.label}</span></div>
                  : <div key={st.id || st.label} className="stat"><b className="stat-n">{st.value}</b><span>{st.label}</span></div>;
              })}
            </div>
            <svg className="doodle d1" viewBox="0 0 120 60" aria-hidden="true"><path d="M5 40 C 30 5, 60 5, 80 30 S 110 50, 115 20" /><path d="M115 20 l-12 2 M115 20 l-2 12" /></svg>
            <svg className="doodle d2" viewBox="0 0 60 60" aria-hidden="true"><path d="M30 5 L36 24 L56 24 L40 36 L46 55 L30 43 L14 55 L20 36 L4 24 L24 24 Z" /></svg>
          </div>
          <figure className="polaroid" data-par="12"><span className="tape" /><img src={asset(about.avatar || profile.avatar)} alt={profile.name} /><figcaption>dathoaqua · {about.location}</figcaption></figure>
        </div>
        <div className="about-stickers" aria-hidden="true">
          <span className="stk s1" data-par="40">React</span><span className="stk s2" data-par="70">IoT ⚡</span><span className="stk s3" data-par="25">C# · .NET</span><span className="stk s4" data-par="55">☕ ×3</span>
        </div>
      </section>

      {/* ================= HÀNH TRÌNH ================= */}
      <section className="journey hj" id="muc-hanh-trinh">
        <h2 className="sec-title"><Bounce text="Hành trình" /> <span className="emo">📌</span></h2>
        <div className="hj-list">
          <span className="hj-line" aria-hidden="true"><i /></span>
          {ACH_HOME.map((a, i) => (
            <div key={a.id || a.title} className={`hj-item ${i % 2 ? 'r' : 'l'}`}>
              <span className="hj-dot" aria-hidden="true"><b>{String(a.date).match(/\d{4}/g)?.pop() || '★'}</b></span>
              <article className="jr-card" style={{ '--r': `${((i * 37) % 5) - 2}deg` }}
                onClick={(e) => a.image && onLightbox({ item: { src: a.image, title: a.title, sub: `${a.date}${a.desc ? ' · ' + a.desc : ''}` }, from: e.currentTarget.querySelector('img')?.getBoundingClientRect() })}>
                <span className="pin" />
                <div className="jr-photo">{a.image && <img src={asset(a.image)} alt={a.title} loading="lazy" />}</div>
                <div className="jr-txt">
                  <span className="jr-year">{a.date}</span>
                  <h3>{a.title}</h3>
                  {a.desc && <p>{a.desc}</p>}
                </div>
                <span className="stamp">{stampFor(a)}</span>
              </article>
            </div>
          ))}
        </div>
        <button className="hj-all" onClick={() => onNav('thanh-tich')} data-mag="0.2">
          <b>+{Math.max(0, ACHS.length - ACH_HOME.length)}</b><span>Đi tiếp con đường: xem cả {ACHS.length} thành tích →</span>
        </button>
      </section>

      <div className="tapes" aria-hidden="true">
        <Tape items={ALL_SKILLS.slice(0, 14)} tilt={-3} />
        <Tape items={['Học', 'Code', 'Hàn mạch', 'Viết nhật ký', 'Gõ phím cơ', 'Uống cà phê', 'Ngủ ít', 'Lặp lại']} tilt={2.5} color="#1f2f6e" ink="#fff" reverse speed={0.8} />
      </div>

      {/* ================= KỸ NĂNG ================= */}
      <section className="skills" id="muc-ky-nang">
        <Torn color="#fff" seed={4} flip className="t-top" />
        <div className="board">
          <span className="smudge s1" /><span className="smudge s2" /><span className="smudge s3" />
          <h2 className="chalk-title"><Bounce text="Kỹ năng" /><Doodle kind="under" className="marker-under" color="#d33a2c" width={4} /></h2>
          {data.skills.map((g) => (
            <div className="sk-row" key={g.name}>
              <span className="sk-label">{g.name}</span>
              <div className="sk-caps">
                {splitSkills(g.desc || '').map((s) => (
                  <button key={s} className="sk-cap" onPointerDown={press} onPointerUp={release} onPointerLeave={release}><span>{s}</span></button>
                ))}
              </div>
            </div>
          ))}
          <div className="chalk-tray"><i className="chalk" /><i className="chalk c2" /><i className="chalk c3" /><span className="eraser-swipe" /></div>
        </div>
        <Torn color="#fff" seed={9} className="t-bot" />
      </section>

      {/* ================= DỰ ÁN ================= */}
      <section className="projects hpj paper-bg" id="muc-du-an">
        <h2 className="sec-title"><Bounce text="Dự án tiêu biểu" /> <span className="emo">🗂</span></h2>
        <div className="hpj-grid">
          {PROJ_HOME.map((p, i) => (
            <article key={p.id || p.title} className="paper pj" style={{ '--pc': ['#6aa9f0', '#ef7d57', '#7ccf8a', '#b58cf0'][i % 4] }}>
              <span className="pj-no" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <header className="pj-meta">
                <span className="pj-cat">{({ MOBILE: '📱', IOT: '🛰', WEB: '🌐' })[p.category] || '📁'} {p.category}</span>
                {p.year && <span className="pj-year">{p.year}</span>}
              </header>
              <h3 className="pj-t">{p.title}</h3>
              <p className="exam-a pj-d">{vi(p.desc)}</p>
              <div className="exam-tags">{(p.tags || []).slice(0, 5).map((t) => <span key={t}>{t}</span>)}</div>
              {p.repo && <a className="exam-link" href={p.repo} target="_blank" rel="noreferrer" data-mag="0.3">Xem mã nguồn →</a>}
              <span className="pj-line" aria-hidden="true" />
            </article>
          ))}
        </div>
        <button className="exam-all" data-mag="0.25" onClick={() => onNav('du-an')}>🗂 Xem tất cả {data.projects.length} dự án →</button>
      </section>

      {/* ================= NHẬT KÝ ================= */}
      <DiaryHome limit={8} perRow={4} onOpenAll={() => onNav('nhat-ky')} />

      {/* ================= THẺ MỤC LỤC ================= */}
      <section className="more" id="muc-them">
        <svg className="doo-big" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M10 120 C 200 10, 380 150, 600 70 S 980 10, 1190 110" /></svg>
        <h2 className="sec-title"><Bounce text="Còn nhiều trang nữa" /> <span className="emo">🗂</span></h2>
        <p className="more-sub">Mỗi tấm thẻ là một trang riêng. Bấm để mở, hoặc nhấn phím số trên bàn phím.</p>
        <div className="deck">
          {ROUTES.slice(1).map((r, i) => (
            <button key={r.id} className="rc" style={{ '--c': r.color, '--i': i - 2.5, '--y': `${Math.abs(i - 2.5) * 14}px` }} onClick={() => onNav(r.id)} onMouseEnter={() => thock(1.3 + i * 0.08)}>
              <span className="rc-tab"><kbd>{i + 2}</kbd>{r.label}</span>
              <span className="rc-ic">{r.icon}</span>
              <b>{r.label}</b>
              <small>{r.sub}</small>
              {counts[r.id] != null && <span className="rc-n">{counts[r.id]}</span>}
              <span className="rc-go">mở →</span>
            </button>
          ))}
        </div>
      </section>

      <Footer onNav={onNav} />
    </div>
  );
}

/* tách đoạn giới thiệu thành từng chữ, cụm quan trọng được tô dạ quang */
function renderBio(text, highlights) {
  const parts = [];
  let rest = text, k = 0;
  while (rest.length) {
    let best = -1, hit = '';
    highlights.forEach((h) => { const i = rest.indexOf(h); if (i >= 0 && (best < 0 || i < best)) { best = i; hit = h; } });
    const plain = best < 0 ? rest : rest.slice(0, best);
    plain.split(/(\s+)/).forEach((w) => parts.push(/^\s+$/.test(w) || !w ? w : <span key={k++} className="w">{w}</span>));
    if (best < 0) break;
    parts.push(<span key={k++} className="hl"><span className="w">{hit}</span></span>);
    rest = rest.slice(best + hit.length);
  }
  return parts;
}
