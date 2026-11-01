/*
 * "BÀN HỌC CỦA KỸ SƯ" — phong cách trường học + bàn phím cơ, nền giấy trắng.
 * Thanh menu trên cùng: Trang chủ + các trang riêng (#du-an, #thanh-tich, #nhat-ky, #cv, #lien-he, #goc-vui).
 * Đổi trang có màn chuyển cảnh: các dải màu thẻ vở phủ xuống, tấm thẻ ghi tên trang bật lên, rồi kéo đi.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { profile } from '../data/profile';
import projectsData from '../data/projects.json';
import { asset } from '../utils/asset';
import { thock, whoosh, setMuted } from './sound';
import { DiaryProvider, CAN_WRITE, useDiary } from './Diary';
import TopBar from './TopBar';
import Home, { HOME_SECTIONS, ACH } from './Home';
import SubPage from './pages/Pages';
import Palette from './Palette';
import { Lightbox, NightLamp, SignIn } from './Extras';
import { InkCursor, InkSplash, Magnets, confetti, reduced } from './Fx';
import { ROUTES, routeIndex, isRoute } from './routes';
import { GH_MODE } from '../admin/adminApi';
import './desk.css';
import './desk2.css';
import './desk3.css';
import './desk4.css';
import './desk5.css';
import './desk6.css';

gsap.registerPlugin(ScrollTrigger);
const vi = (v) => (typeof v === 'object' && v ? v.vi || v.en : v);
const hashRoute = () => { const h = window.location.hash.slice(1); return isRoute(h) ? h : ''; };

export default function DeskApp() {
  const lenisRef = useRef(null);
  return <DiaryProvider lenis={lenisRef}><Desk lenisRef={lenisRef} /></DiaryProvider>;
}

function Desk({ lenisRef }) {
  const diaryApi = useDiary();
  const [route, setRoute] = useState(hashRoute);
  const routeRef = useRef(route);
  const [mute, setMute] = useState(false);
  const [night, setNight] = useState(() => { try { return localStorage.getItem('desk.night') === '1'; } catch { return false; } });
  const [palette, setPalette] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { item, from }
  const [admin, setAdmin] = useState(() => window.location.hash === '#admin');
  const anyModal = () => !!document.querySelector('.pl-wrap, .bk-wrap, .cp-wrap, .lb-wrap, .ql-wrap, .mv-wrap, .ed-wrap');

  /* ---------- đổi trang + màn chuyển cảnh ---------- */
  const curtain = useRef(null);
  const busy = useRef(false);
  const scrollTop = (smooth) => {
    if (lenisRef.current) lenisRef.current.scrollTo(0, smooth ? { duration: 1.4 } : { immediate: true, force: true });
    else window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  };
  const navigate = (id, { push = true, then } = {}) => {
    if (busy.current) return;
    if (id === routeRef.current) { scrollTop(true); then?.(); return; }
    busy.current = true;
    const r = ROUTES[routeIndex(id)];
    const swap = () => {
      routeRef.current = id;
      setRoute(id);
      if (push) history.pushState(null, '', id ? '#' + id : window.location.pathname + window.location.search);
      scrollTop(false);
    };
    if (reduced()) { swap(); busy.current = false; then?.(); return; }
    const el = curtain.current, q = gsap.utils.selector(el);
    q('.cu-title')[0].textContent = r.label;
    q('.cu-ic')[0].textContent = r.icon;
    q('.cu-sub')[0].textContent = r.sub;
    el.style.setProperty('--c', r.color);
    whoosh();
    gsap.timeline({ onComplete: () => { busy.current = false; ScrollTrigger.refresh(); then?.(); } })
      .set(el, { autoAlpha: 1 })
      .set(q('.cu-card'), { scale: 0.2, rotate: -14, y: 60, opacity: 0 })
      .set(q('.cu-title'), { clipPath: 'inset(0 100% 0 0)' })
      .fromTo(q('.cu-s'), { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: 0.42, stagger: 0.04, ease: 'power3.in' })
      .to(q('.cu-card'), { scale: 1, rotate: -3, y: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.8)' }, '-=0.15')
      .to(q('.cu-title'), { clipPath: 'inset(0 0% 0 0)', duration: 0.45, ease: 'power2.out' }, '-=0.25')
      .fromTo(q('.cu-under path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.35, ease: 'none' }, '-=0.1')
      .add(swap)
      .to({}, { duration: 0.15 })
      .to(q('.cu-card'), { y: -window.innerHeight * 0.7, rotate: 12, duration: 0.45, ease: 'power3.in' })
      .set(q('.cu-s'), { transformOrigin: '50% 100%' }, '-=0.25')
      .to(q('.cu-s'), { scaleY: 0, duration: 0.42, stagger: { each: 0.04, from: 'end' }, ease: 'power3.inOut' }, '-=0.3')
      .set(el, { autoAlpha: 0 });
  };
  useEffect(() => {
    const onPop = () => { const h = window.location.hash.slice(1); if (h === 'admin') return setAdmin(true); navigate(hashRoute(), { push: false }); };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onPop); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleNight = () => setNight((n) => {
    const v = !n; thock(v ? 0.6 : 1.4);
    try { localStorage.setItem('desk.night', v ? '1' : '0'); } catch { /* bị chặn thì thôi */ }
    return v;
  });
  useEffect(() => { if (palette || lightbox || admin) lenisRef.current?.stop(); else if (!anyModal()) lenisRef.current?.start(); }, [palette, lightbox, admin]); // eslint-disable-line react-hooks/exhaustive-deps

  const goSection = (sid) => {
    const go = () => { const el = document.getElementById(sid); if (!el) return; thock(1.1); lenisRef.current ? lenisRef.current.scrollTo(el, { duration: 1.6 }) : el.scrollIntoView({ behavior: 'smooth' }); };
    if (routeRef.current) navigate('', { then: () => setTimeout(go, 100) }); else go();
  };

  /* ---------- cuộn mượt ---------- */
  useEffect(() => {
    if (reduced()) return undefined;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(raf); lenis.destroy(); lenisRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- thanh tiến độ (bút chì dưới thanh menu) ---------- */
  useEffect(() => {
    const line = document.querySelector('.tb .progress-line');
    const set = gsap.quickSetter(line, 'scaleX');
    const tick = () => { const max = document.documentElement.scrollHeight - window.innerHeight; set(max > 0 ? Math.min(1, window.scrollY / max) : 0); };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  /* ---------- phím tắt + bàn phím trên màn hình lún xuống ---------- */
  useEffect(() => {
    const find = (e) => {
      const k = e.key === ' ' ? 'space' : e.key.toLowerCase();
      return document.querySelectorAll(`.kc[data-k="${CSS.escape(k)}"]`);
    };
    const down = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setPalette((v) => !v); thock(); return; }
      if (e.target.closest?.('input,textarea') || anyModal()) return;
      if (e.key === '/') { e.preventDefault(); setPalette(true); thock(); return; }
      if (e.key === 'h' || e.key === 'H') { navigate(''); return; }
      if (e.key === 'l' || e.key === 'L') { toggleNight(); return; }
      const els = find(e);
      if (els?.length) { els.forEach((el) => el.classList.add('down')); if (!e.repeat) thock(); }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= ROUTES.length && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); navigate(ROUTES[n - 1].id); }
    };
    const up = (e) => find(e)?.forEach((el) => el.classList.remove('down'));
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.title = route ? `${ROUTES[routeIndex(route)].label} · Vũ Đình Đạt` : 'Vũ Đình Đạt · Bàn học của kỹ sư'; }, [route]);

  const active = routeIndex(route);

  return (
    <div className={`desk-app route-${route || 'home'}`}>
      <TopBar sections={ROUTES} active={active} onGo={(i) => navigate(ROUTES[i]?.id ?? '')}
        onBrand={(e) => { confetti(e.clientX, e.clientY); navigate(''); }}
        onSearch={() => { setPalette(true); thock(); }}
        night={night} onNight={toggleNight} mute={mute} onMute={() => { setMute(!mute); setMuted(!mute); }}
        canWrite={CAN_WRITE} onWrite={diaryApi.openNew} onAdmin={() => setAdmin(true)} />

      {route === ''
        ? <Home key="home" onNav={navigate} onLightbox={setLightbox} />
        : <SubPage key={route} id={route} onNav={navigate} onNight={toggleNight} />}

      {/* lớp nổi gắn thẳng vào body, để không vướng các đoạn bị ghim khi cuộn */}
      {createPortal(<>
        {palette && <Palette items={paletteItems()} onClose={() => setPalette(false)} />}
        {lightbox && <Lightbox item={lightbox.item} from={lightbox.from} onClose={() => setLightbox(null)} />}
        {admin && (!CAN_WRITE || GH_MODE) && <SignIn onClose={() => { setAdmin(false); history.replaceState(null, '', route ? '#' + route : ' '); }} />}
        <NightLamp on={night} />
        <div className="curtain" ref={curtain} aria-hidden="true">
          {ROUTES.map((r) => <i key={r.label} className="cu-s" style={{ background: r.color }} />)}
          <div className="cu-card">
            <span className="cu-pin" />
            <span className="cu-ic" />
            <b className="cu-title" />
            <svg className="cu-under" viewBox="0 0 300 30" preserveAspectRatio="none"><path pathLength="1" d="M4 18 C 60 6, 120 26, 180 14 S 270 8, 296 16" /></svg>
            <small className="cu-sub" />
          </div>
        </div>
        <InkCursor />
        <InkSplash />
        <Magnets />
      </>, document.body)}
    </div>
  );

  function paletteItems() {
    return [
      ...ROUTES.map((pg, i) => ({ key: 'r' + pg.id, group: 'Mở trang', icon: pg.icon, label: pg.label, hint: `phím ${i + 1}`, run: () => navigate(pg.id) })),
      ...HOME_SECTIONS.map((s) => ({ key: s.id, group: 'Trang chủ', icon: '↓', label: s.label, hint: 'cuộn tới mục', run: () => goSection(s.id) })),
      ...(CAN_WRITE ? [{ key: 'write', group: 'Việc nhanh', icon: '✍', label: 'Viết nhật ký mới', run: diaryApi.openNew }] : []),
      { key: 'night', group: 'Việc nhanh', icon: '💡', label: night ? 'Bật đèn' : 'Tắt đèn (chế độ tối)', run: toggleNight },
      { key: 'cvpdf', group: 'Việc nhanh', icon: '📄', label: 'Mở CV (PDF)', run: () => window.open(asset('/cv.pdf'), '_blank') },
      { key: 'mail', group: 'Việc nhanh', icon: '✉', label: 'Gửi thư cho Đạt', hint: profile.email, run: () => navigate('lien-he') },
      ...projectsData.map((p) => ({ key: 'p' + p.id, group: 'Dự án', icon: '📝', label: p.title, hint: `${p.category} · ${p.tags.slice(0, 3).join(', ')}`, run: () => navigate('du-an') })),
      ...diaryApi.posts.map((p) => ({ key: 'b' + p.id, group: 'Nhật ký', icon: '📸', label: vi(p.title), hint: vi(p.date), run: () => diaryApi.openPost(p.id) })),
      ...ACH.map((a) => ({ key: 'a' + a.id, group: 'Thành tích', icon: '🏅', label: a.title, hint: a.date, run: () => a.image && setLightbox({ item: { src: a.image, title: a.title, sub: a.date }, from: null }) })),
    ];
  }
}
