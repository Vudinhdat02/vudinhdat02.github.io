/*
 * TRANG CHỦ — chỉ giữ những thứ tiêu biểu: giới thiệu, hành trình (vài thành tích nổi bật),
 * kỹ năng, 3 dự án, 5 trang nhật ký mới nhất và bộ thẻ mở các trang riêng.
 * Toàn bộ chuyển động khi cuộn dùng GSAP ScrollTrigger; rời trang chủ thì mọi hiệu ứng được dọn sạch.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { profile } from '../data/profile';
import projectsData from '../data/projects.json';
import achievementsData from '../data/achievements.json';
import skillsData from '../data/skills.json';
import introData from '../data/intro.json';
import aboutData from '../data/about.json';
import { DocEditor, ListEditor, useEditable, useEditableDoc } from './Editor';
import { ABOUT_FIELDS, ACH_BLANK, ACH_FIELDS, ACH_PREVIEW, PROJ_BLANK, PROJ_FIELDS, PROJ_PREVIEW, SKILL_BLANK, SKILL_FIELDS, SKILL_PREVIEW } from './fields';
import { asset } from '../utils/asset';
import { thock, thud, whoosh } from './sound';
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
const REMARKS = ['Xuất sắc!', 'Rất sáng tạo!', 'Ý tưởng hay, phát huy!', 'Trình bày rõ ràng!', 'Làm kỹ, rất tốt!', 'Tuyệt vời!'];
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
  ['ach', '📌 Hành trình (thành tích)'],
  ['skills', '⌨️ Kỹ năng'],
  ['proj', '📝 Dự án (bài kiểm tra)'],
];
export default function Home(props) {
  const about = useEditableDoc(aboutData, 'about');
  const ach = useEditable(achievementsData, 'achievements');
  const skills = useEditable(skillsData, 'skills');
  const proj = useEditable(projectsData, 'projects');
  const [panel, setPanel] = useState(null);
  const [menu, setMenu] = useState(false);
  const data = useMemo(() => ({ about: { ...aboutData, ...about.doc }, ach: ach.items, skills: skills.items, projects: proj.items }), [about.doc, ach.items, skills.items, proj.items]);
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
      {canEdit && <ListEditor noFab open={panel === 'skills'} onClose={close} ed={skills} label="kỹ năng" fields={SKILL_FIELDS} blank={SKILL_BLANK} preview={SKILL_PREVIEW} />}
      {canEdit && <ListEditor noFab open={panel === 'proj'} onClose={close} ed={proj} label="dự án" fields={PROJ_FIELDS} blank={PROJ_BLANK} preview={PROJ_PREVIEW} />}
    </>
  );
}
const hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; };

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
      const mm = gsap.matchMedia();

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

      /* ====== 1. HERO: zoom vào màn hình CRT ====== */
      const hero = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=140%', scrub: 1, pin: true, anticipatePin: 1 } });
      hero
        .to(q('.hero-hint'), { opacity: 0, y: 30, duration: 0.15 }, 0)
        .to(q('.kb'), { yPercent: 120, rotateX: 55, opacity: 0, duration: 0.6 }, 0)
        .to(q('.note-a'), { x: '-70vw', y: '-30vh', rotate: -70, duration: 0.6 }, 0)
        .to(q('.note-b'), { x: '70vw', y: '-20vh', rotate: 80, duration: 0.6 }, 0.03)
        .to(q('.pencil'), { x: '-60vw', rotate: -200, duration: 0.6 }, 0.05)
        .to(q('.ruler'), { x: '60vw', y: '40vh', rotate: 60, duration: 0.6 }, 0.02)
        .to(q('.mug'), { x: '50vw', y: '-40vh', rotate: 30, duration: 0.6 }, 0.04)
        .to(q('.eraser'), { x: '-40vw', y: '50vh', rotate: -120, duration: 0.6 }, 0.06)
        .to(q('.crt'), { scale: 3.2, yPercent: 18, duration: 0.85, ease: 'power2.in' }, 0.1)
        .to(q('.crt-glare'), { opacity: 0.9, duration: 0.5 }, 0.45)
        .fromTo(q('.hero-wipe'), { clipPath: 'circle(0% at 50% 45%)' }, { clipPath: 'circle(150% at 50% 45%)', duration: 0.3, ease: 'power2.in' }, 0.8);

      /* ====== 2. GIỚI THIỆU: trang vở ====== */
      const about = gsap.timeline({ scrollTrigger: { trigger: '.about', start: 'top top', end: '+=140%', scrub: 1, pin: true } });
      about
        .from(q('.about .notebook'), { y: 120, rotate: -4, duration: 0.25 }, 0)
        .fromTo(q('.about .hw-title'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.2, ease: 'none' }, 0.1)
        .from(q('.about .polaroid'), { x: 200, rotate: 25, opacity: 0, duration: 0.25 }, 0.12)
        .from(q('.about .tape'), { scaleX: 0, duration: 0.08 }, 0.35)
        .to(q('.about .w'), { opacity: 1, color: '#1f2f6e', stagger: 0.012, duration: 0.05, ease: 'none' }, 0.25)
        .to(q('.about .hl'), { backgroundSize: '100% 100%', stagger: 0.08, duration: 0.12, ease: 'none' }, 0.5)
        .fromTo(q('.about .doodle path'), { strokeDashoffset: 400 }, { strokeDashoffset: 0, stagger: 0.04, duration: 0.2, ease: 'none' }, 0.55)
        .from(q('.about .stat'), { y: 40, opacity: 0, rotate: () => gsap.utils.random(-12, 12), stagger: 0.05, duration: 0.12 }, 0.7);
      q('.about .stat-n').forEach((el) => {
        const to = parseFloat(el.dataset.to), dec = el.dataset.dec ? +el.dataset.dec : 0, obj = { v: 0 };
        about.to(obj, { v: to, duration: 0.15, ease: 'none', onUpdate: () => { el.textContent = obj.v.toFixed(dec) + (el.dataset.suf || ''); } }, 0.75);
      });

      /* ====== 3. HÀNH TRÌNH: cuộn ngang, bút chì kẻ đường thời gian ====== */
      mm.add('(min-width: 760px)', () => {
        const track = q('.jr-track')[0];
        const dist = () => track.scrollWidth - window.innerWidth;
        const horiz = gsap.timeline({ scrollTrigger: { trigger: '.journey', start: 'top top', end: () => '+=' + dist(), scrub: 1, pin: true, invalidateOnRefresh: true } });
        horiz.to(track, { x: () => -dist(), ease: 'none', duration: 1 }, 0)
          .fromTo(q('.jr-line'), { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0)
          .fromTo(q('.jr-pencil'), { left: '0%' }, { left: '100%', ease: 'none', duration: 1 }, 0);
        q('.jr-card').forEach((card, i) => {
          gsap.from(card, { y: i % 2 ? 160 : -160, rotate: (i % 2 ? 1 : -1) * 18, opacity: 0, duration: 0.8, ease: 'back.out(1.5)', scrollTrigger: { trigger: card, containerAnimation: horiz, start: 'left 92%', toggleActions: 'play none none reverse' } });
          const stamp = card.querySelector('.stamp');
          gsap.fromTo(stamp, { scale: 3.2, opacity: 0, rotate: -40 }, { scale: 1, opacity: 0.88, rotate: -14, duration: 0.28, ease: 'power4.in', scrollTrigger: { trigger: card, containerAnimation: horiz, start: 'left 58%', toggleActions: 'play none none reverse', onEnter: () => setTimeout(thud, 260) },
            onComplete: () => gsap.fromTo(card, { x: -4 }, { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.3)' }) });
        });
        gsap.to(q('.jr-year'), { yPercent: -40, ease: 'none', scrollTrigger: { trigger: '.journey', start: 'top top', end: () => '+=' + dist(), scrub: true } });
      });
      mm.add('(max-width: 759px)', () => {
        q('.jr-card').forEach((card) => gsap.from(card, { x: 80, rotate: 8, opacity: 0, duration: 0.7, ease: 'back.out(1.4)', scrollTrigger: { trigger: card, start: 'top 85%' } }));
      });

      /* ====== 4. KỸ NĂNG: phím rơi xuống bảng đen ====== */
      gsap.fromTo(q('.board .chalk-title'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none', scrollTrigger: { trigger: '.board', start: 'top 75%', end: 'top 35%', scrub: 1 } });
      gsap.from(q('.board .sk-label'), { x: -60, opacity: 0, stagger: 0.12, duration: 0.6, scrollTrigger: { trigger: '.board', start: 'top 60%' } });
      gsap.from(q('.board .sk-cap'), {
        y: () => -window.innerHeight * 0.9, rotate: () => gsap.utils.random(-70, 70), opacity: 0,
        stagger: { each: 0.035, from: 'random' }, duration: 1.1, ease: 'bounce.out',
        scrollTrigger: { trigger: '.board', start: 'top 55%', toggleActions: 'play none none reverse', onEnter: () => { let n = 0; const id = setInterval(() => { thock(0.8 + Math.random() * 0.6); if (++n > 10) clearInterval(id); }, 90); } },
      });
      gsap.to(q('.board .eraser-swipe'), { xPercent: 900, ease: 'none', scrollTrigger: { trigger: '.board', start: 'top 80%', end: 'bottom 20%', scrub: 1 } });
      gsap.to(q('.board .smudge'), { opacity: 0, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: '.board', start: 'top 70%', end: 'center 40%', scrub: 1 } });
      gsap.fromTo(q('.board'), { rotateX: 18, scale: 0.92 }, { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.skills', start: 'top bottom', end: 'top 25%', scrub: 1 } });

      /* ====== 5. DỰ ÁN: chồng bài kiểm tra, mỗi bài bay đi khi cuộn ====== */
      const papers = q('.paper');
      const n = papers.length;
      papers.forEach((p, i) => gsap.set(p, { zIndex: n - i, rotate: i === 0 ? 0 : gsap.utils.random(-5, 5), scale: 1 - Math.min(i, 3) * 0.03, y: Math.min(i, 3) * 14 }));
      const proj = gsap.timeline({ scrollTrigger: { trigger: '.projects', start: 'top top', end: () => '+=' + n * 75 + '%', scrub: 1, pin: true, invalidateOnRefresh: true,
        onUpdate: (st) => { const k = Math.min(n, Math.floor(st.progress * n * 0.999) + 1); const c = q('.exam-count b')[0]; if (c && c.textContent !== String(k)) c.textContent = k; } } });
      proj.fromTo(q('.paper')[0].querySelectorAll('.score path'), { strokeDashoffset: 300 }, { strokeDashoffset: 0, duration: 0.3, ease: 'none' }, 0)
        .from(q('.paper')[0].querySelectorAll('.score-n, .remark'), { opacity: 0, scale: 1.6, duration: 0.15 }, 0.2);
      papers.forEach((p, i) => {
        if (i === n - 1) return;
        const at = i + 0.5, dir = i % 2 ? 1 : -1;
        proj.to(p, { xPercent: dir * 140, yPercent: -25, rotate: dir * 35, opacity: 0, duration: 0.9, ease: 'power2.in', onStart: whoosh }, at);
        papers.slice(i + 1).forEach((rest, j) => proj.to(rest, { y: Math.min(j, 3) * 14, scale: 1 - Math.min(j, 3) * 0.03, ...(j === 0 ? { rotate: 0 } : {}), duration: 0.6 }, at + 0.3));
        const next = papers[i + 1];
        proj.fromTo(next.querySelectorAll('.score path'), { strokeDashoffset: 300 }, { strokeDashoffset: 0, duration: 0.3, ease: 'none' }, at + 0.7)
          .from(next.querySelectorAll('.score-n, .remark'), { opacity: 0, scale: 1.6, duration: 0.15 }, at + 0.9);
      });
      proj.to({}, { duration: 0.5 });

      /* ====== 6. THẺ MỤC LỤC: xoè ra như bộ bài ====== */
      gsap.from(q('.deck .rc'), { y: 260, rotate: (i) => (i - 2.5) * 22, opacity: 0, stagger: 0.07, duration: 1, ease: 'back.out(1.3)', clearProps: 'transform', scrollTrigger: { trigger: '.deck', start: 'top 85%' } });
      gsap.fromTo(q('.more .doo-big path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.more', start: 'top 80%', end: 'top 30%', scrub: 1 } });

      /* băng keo chữ trượt vào */
      q('.tape-band').forEach((t, i) => gsap.from(t, { xPercent: i % 2 ? 30 : -30, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: t, start: 'top 95%' } }));

      /* ảnh, giấy nhớ trong mục giới thiệu trôi nhẹ theo cuộn (parallax) */
      q('[data-par]').forEach((el) => gsap.to(el, { yPercent: -+el.dataset.par, ease: 'none', scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } }));
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
  const gpa = (introData.find((x) => /education/i.test(x.name))?.desc.match(/GPA:\s*([\d.]+)/) || [])[1] || '3.83';
  const counts = { 'du-an': data.projects.length, 'thanh-tich': ACHS.length, 'nhat-ky': diary.posts.length };

  return (
    <div ref={root} className="home">
      {/* ================= HERO ================= */}
      <div className="pin-wrap"><section className="hero">
        <div className="desk-surface" />
        <div className="desk-item note-a" data-depth="1.4"><div className="sticky yellow">TODO:{(about.todo || []).map((t, i) => <span key={i}><br />{t}</span>)}</div></div>
        <div className="desk-item note-b" data-depth="1.1"><div className="sticky pink">Nhấn phím<br /><b>1 → 7</b><br />để mở từng trang ✍</div></div>
        <div className="desk-item pencil" data-depth="0.8"><i /></div>
        <div className="desk-item ruler" data-depth="0.6">{Array.from({ length: 30 }, (_, i) => <span key={i} className={i % 5 ? '' : 'big'} />)}</div>
        <div className="desk-item mug" data-depth="1.2"><span className="steam" /><span className="steam s2" /></div>
        <div className="desk-item eraser" data-depth="1"><span>ICTU</span></div>

        <div className="crt" data-depth="0.25">
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
            <div className="crt-brand"><span>ĐẠT-86</span><i className="crt-led" /></div>
          </div>
          <div className="crt-neck" />
        </div>

        <div className="kb-wrap" data-depth="0.15">
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
        <SpinBadge className="hero-badge" center="Đ" />
        <Doodle kind="spark" className="hd hd1" color="#f08a24" />
        <Doodle kind="star" className="hd hd2" color="#3b6fd8" delay={0.4} />
        <Doodle kind="swirl" className="hd hd3" color="#d33a2c" delay={0.8} />
        <p className="hero-hint">cuộn xuống để “vào” màn hình <span>↓</span></p>
        <div className="hero-wipe" />
      </section></div>

      {/* ================= GIỚI THIỆU ================= */}
      <div className="pin-wrap"><section className="about paper-bg" id="muc-gioi-thieu">
        <div className="notebook">
          <div className="spiral">{Array.from({ length: 14 }, (_, i) => <i key={i} />)}</div>
          <div className="nb-page">
            <h2 className="hw-title">Về mình ✏️</h2>
            <p className="bio">{bioWords}</p>
            <div className="stats">
              <div className="stat"><b className="stat-n" data-to={parseFloat(gpa)} data-dec="2">0</b><span>GPA / 4.0</span></div>
              <div className="stat"><b className="stat-n" data-to={+about.years || 0} data-suf="+">0</b><span>năm kinh nghiệm</span></div>
              <div className="stat"><b className="stat-n" data-to={ACHS.length}>0</b><span>giấy khen, thành tích</span></div>
              <div className="stat"><b className="stat-n" data-to={data.projects.length}>0</b><span>dự án mã nguồn mở</span></div>
            </div>
            <svg className="doodle d1" viewBox="0 0 120 60" aria-hidden="true"><path d="M5 40 C 30 5, 60 5, 80 30 S 110 50, 115 20" /><path d="M115 20 l-12 2 M115 20 l-2 12" /></svg>
            <svg className="doodle d2" viewBox="0 0 60 60" aria-hidden="true"><path d="M30 5 L36 24 L56 24 L40 36 L46 55 L30 43 L14 55 L20 36 L4 24 L24 24 Z" /></svg>
          </div>
          <figure className="polaroid" data-par="12"><span className="tape" /><img src={asset(about.avatar || profile.avatar)} alt={profile.name} /><figcaption>dathoaqua · {about.location}</figcaption></figure>
        </div>
        <div className="about-stickers" aria-hidden="true">
          <span className="stk s1" data-par="40">React</span><span className="stk s2" data-par="70">IoT ⚡</span><span className="stk s3" data-par="25">C# · .NET</span><span className="stk s4" data-par="55">☕ ×3</span>
        </div>
      </section></div>

      {/* ================= HÀNH TRÌNH ================= */}
      <div className="pin-wrap"><section className="journey cork" id="muc-hanh-trinh">
        <h2 className="sec-title on-cork"><Bounce text="Hành trình" /> <span className="emo">📌</span></h2>
        <div className="jr-track">
          <div className="jr-line"><span className="jr-pencil" /></div>
          {ACH_HOME.map((a, i) => (
            <article key={a.id || a.title} className={`jr-card ${i % 2 ? 'low' : 'high'}`} style={{ '--r': `${((i * 37) % 9) - 4}deg` }}
              onClick={(e) => a.image && onLightbox({ item: { src: a.image, title: a.title, sub: `${a.date}${a.desc ? ' · ' + a.desc : ''}` }, from: e.currentTarget.querySelector('img')?.getBoundingClientRect() })}>
              <span className="pin" />
              <div className="jr-photo">{a.image && <img src={asset(a.image)} alt={a.title} loading="lazy" />}</div>
              <span className="jr-year">{a.date}</span>
              <h3>{a.title}</h3>
              {a.desc && <p>{a.desc}</p>}
              <span className="stamp">{stampFor(a)}</span>
            </article>
          ))}
          <button className="jr-end jr-all" onClick={() => onNav('thanh-tich')} data-mag="0.2">
            <span className="pin" /><b>+{ACHS.length - ACH_HOME.length}</b><span>Xem tất cả {ACHS.length} thành tích →</span>
          </button>
        </div>
      </section></div>

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
      <div className="pin-wrap"><section className="projects paper-bg" id="muc-du-an">
        <h2 className="sec-title"><Bounce text="Bài kiểm tra · Dự án" /> <span className="emo">📝</span></h2>
        <p className="exam-count">Bài <b>1</b> / {PROJ_HOME.length}</p>
        <div className="exam-stack">
          {PROJ_HOME.map((p, i) => (
            <article key={p.id || p.title} className="paper">
              <header className="exam-head">
                <div><span>Họ và tên:</span> <i>Vũ Đình Đạt</i></div>
                <div><span>Môn:</span> <i>{p.category}</i></div>
                <div><span>Năm:</span> <i>{p.year}</i></div>
              </header>
              <div className="score">
                <svg viewBox="0 0 120 90" aria-hidden="true"><path d="M60 8 C 20 6, 6 30, 12 52 C 18 78, 70 86, 98 70 C 120 56, 112 18, 72 10 C 60 8, 48 12, 40 16" /></svg>
                <span className="score-n">10</span>
                <span className="remark">{REMARKS[i % REMARKS.length]}</span>
              </div>
              <h3 className="exam-q">Câu {i + 1}. {p.title}</h3>
              <p className="exam-a">{vi(p.desc)}</p>
              <div className="exam-tags">{(p.tags || []).map((t) => <span key={t}>{t}</span>)}</div>
              {p.repo && <a className="exam-link" href={p.repo} target="_blank" rel="noreferrer" data-mag="0.3">Xem mã nguồn →</a>}
            </article>
          ))}
        </div>
        <button className="exam-all" data-mag="0.25" onClick={() => onNav('du-an')}>🗂 Mở tủ hồ sơ: tất cả {data.projects.length} dự án →</button>
      </section></div>

      {/* ================= NHẬT KÝ ================= */}
      <DiaryHome limit={5} onOpenAll={() => onNav('nhat-ky')} />

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
