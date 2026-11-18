/*
 * Trang "Góc vui": máy tính phòng máy (Terminal), bài chính tả (thi gõ phím), đồng hồ lớp học (Pomodoro)
 * và sân bay drone (Toys.jsx). Tất cả chạy offline.
 */
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Terminal, TypeRace, Focus } from '../apps/Apps';
import { DroneGame } from '../apps/Toys';

gsap.registerPlugin(ScrollTrigger);

export default function GocVui({ onNav, onNight }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.gv').forEach((el, i) => {
        gsap.from(el, { y: 70, rotate: [-3, 2.5, -1.5, 2, -2.5, 1.5, -2][i % 7], opacity: 0, duration: 0.9, ease: 'back.out(1.4)', delay: i < 3 ? 0.15 + i * 0.1 : 0,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <div className="gv-page" ref={ref}>
      <div className="gocvui">
        <article className="gv gv-term">
          <span className="gv-tag">Phòng máy · bàn số 7</span>
          <div className="gv-bezel"><Terminal onOpen={onNav} onNight={onNight} /></div>
          <div className="gv-stand" />
          <p className="gv-tip">Bấm vào màn hình rồi gõ <code>help</code>. Thử <code>sudo hire-dat</code> 😉</p>
        </article>
        <article className="gv gv-type">
          <span className="gv-tag red">Thi gõ phím · 30 giây</span>
          <TypeRace />
        </article>
        <article className="gv gv-focus">
          <span className="gv-tag green">Giờ tự học</span>
          <div className="gv-clock" aria-hidden="true"><i className="h" /><i className="m" /></div>
          <Focus />
        </article>
      </div>

      <section className="gv-airport">
        <h2 className="gv-h">Sân bay drone 🚁</h2>
        <article className="gv gv-drone">
          <span className="gv-tag">Bãi thử · bàn số 8</span>
          <DroneGame />
        </article>
      </section>
    </div>
  );
}
