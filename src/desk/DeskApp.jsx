/*
 * "BÀN HỌC CỦA KỸ SƯ" — phong cách trường học + bàn phím cơ, nền giấy trắng.
 * Thanh menu trên cùng: Trang chủ + các trang riêng (#du-an, #thanh-tich, #nhat-ky, #du-lich, #cv, #lien-he; #goc-vui cũ → #lien-he).
 * Đổi trang: vào thẳng trang mới, trang cũ mờ đi còn trang mới trượt lên, thanh màu chạy trên đỉnh màn hình.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { thock, whoosh, setMuted } from './sound';
import { DiaryProvider, CAN_WRITE, useDiary } from './Diary';
import TopBar from './TopBar';
import Home from './Home';
import { Guard } from './Guard';
import SubPage from './pages/Pages';
import { Lightbox, SignIn } from './Extras';
import { InkCursor, InkSplash, Magnets, confetti, reduced } from './Fx';
import { ROUTES, routeIndex, isRoute, ALIAS } from './routes';
import { GH_MODE } from '../admin/adminApi';
import './desk.css';
import './desk2.css';
import './desk3.css';
import './desk4.css';
import './desk5.css';
import './desk6.css';
import './desk7.css';
import './desk8.css';
import './desk9.css';
import './desk10.css';
import './desk11.css';
import './desk12.css';
import './desk13.css';
import './desk14.css';
import './desk15.css';
import './desk16.css';
import './desk17.css';
import './desk18.css';

gsap.registerPlugin(ScrollTrigger);
const vi = (v) => (typeof v === 'object' && v ? v.vi || v.en : v);
const hashRoute = () => { const h0 = window.location.hash.slice(1), h = ALIAS[h0] || h0; return isRoute(h) ? h : ''; };

export default function DeskApp() {
  const lenisRef = useRef(null);
  return <DiaryProvider lenis={lenisRef}><Desk lenisRef={lenisRef} /></DiaryProvider>;
}

function Desk({ lenisRef }) {
  const diaryApi = useDiary();
  const [route, setRoute] = useState(hashRoute);
  const routeRef = useRef(route);
  const [mute, setMute] = useState(false);
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
    /* chuyển trang thẳng tới nội dung: trang cũ mờ đi + trượt lên, trang mới trượt vào (không có màn giới thiệu) */
    const out = document.querySelector('.desk-app > main, .desk-app > .home');
    const bar = curtain.current;
    bar.style.setProperty('--c', r.color);
    whoosh();
    gsap.timeline({ onComplete: () => { busy.current = false; ScrollTrigger.refresh(); then?.(); } })
      .set(bar, { autoAlpha: 1, scaleX: 0, transformOrigin: '0% 50%' })
      .to(bar, { scaleX: 0.7, duration: 0.3, ease: 'power2.out' }, 0)
      .to(out, { opacity: 0, y: -24, filter: 'blur(4px)', duration: 0.26, ease: 'power2.in' }, 0)
      .add(swap)
      .add(() => {
        const inn = document.querySelector('.desk-app > main, .desk-app > .home');
        if (inn) gsap.fromTo(inn, { opacity: 0, y: 36, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.55, ease: 'power3.out', clearProps: 'opacity,transform,filter' });
      }, '+=0.02')
      .to(bar, { scaleX: 1, duration: 0.25, ease: 'power1.out' })
      .to(bar, { autoAlpha: 0, duration: 0.3 });
  };
  useEffect(() => {
    const onPop = () => { const h = window.location.hash.slice(1); if (h === 'admin') return setAdmin(true); navigate(hashRoute(), { push: false }); };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onPop); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (lightbox || admin) lenisRef.current?.stop(); else if (!anyModal()) lenisRef.current?.start(); }, [lightbox, admin]); // eslint-disable-line react-hooks/exhaustive-deps

  const goSection = (sid) => {
    const go = () => { const el = document.getElementById(sid); if (!el) return; thock(1.1); lenisRef.current ? lenisRef.current.scrollTo(el, { duration: 1.6 }) : el.scrollIntoView({ behavior: 'smooth' }); };
    if (routeRef.current) navigate('', { then: () => setTimeout(go, 100) }); else go();
  };

  /* ---------- cuộn mượt ---------- */
  useEffect(() => {
    if (reduced()) return undefined;
    /* khung nào có thanh cuộn riêng (cửa sổ, bảng sửa, sổ nhật ký…) thì để chuột cuộn khung đó */
    const ownScroll = (el) => {
      if (el === document.body || el === document.documentElement) return false;
      const s = getComputedStyle(el);
      return (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1)
        || (/(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1);
    };
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, prevent: ownScroll });
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
      if (e.target.closest?.('input,textarea') || anyModal()) return;
      if (e.key === 'h' || e.key === 'H') { navigate(''); return; }
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
        mute={mute} onMute={() => { setMute(!mute); setMuted(!mute); }}
        canWrite={CAN_WRITE} onWrite={diaryApi.openNew} onAdmin={() => setAdmin(true)} />

      {route === ''
        ? <Home key="home" onNav={navigate} onLightbox={setLightbox} />
        : <Guard key={route} inline><SubPage id={route} onNav={navigate} /></Guard>}

      {/* lớp nổi gắn thẳng vào body, để không vướng các đoạn bị ghim khi cuộn */}
      {createPortal(<>
        {lightbox && <Lightbox item={lightbox.item} from={lightbox.from} onClose={() => setLightbox(null)} />}
        {admin && (!CAN_WRITE || GH_MODE) && <SignIn onClose={() => { setAdmin(false); history.replaceState(null, '', route ? '#' + route : ' '); }} />}
        <div className="page-bar" ref={curtain} aria-hidden="true" />
        <InkCursor />
        <InkSplash />
        <Magnets />
      </>, document.body)}
    </div>
  );
}
