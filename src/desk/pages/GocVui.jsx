/*
 * Trang "Góc vui": thi gõ phím, giờ tự học (Pomodoro), sân bay drone và phòng thí nghiệm kỹ thuật
 * (bảng mạch LED 8 bit, săn bug, máy điện báo Morse) — xem Toys.jsx. Tất cả chạy offline.
 */
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TypeRace, Focus } from '../apps/Apps';
import { DroneGame, BinaryLeds, BugSmash, Morse } from '../apps/Toys';

gsap.registerPlugin(ScrollTrigger);

export default function GocVui() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.gv').forEach((el, i) => {
        gsap.from(el, { y: 70, rotate: [-3, 2.5, -1.5, 2, -2.5, 1.5, -2][i % 7], opacity: 0, duration: 0.9, ease: 'back.out(1.4)', delay: i < 2 ? 0.15 + i * 0.1 : 0,
          scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <div className="gv-page gv3" ref={ref}>
      <div className="gv-row2">
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

      <section className="gv-airport">
        <h2 className="gv-h">Phòng thí nghiệm kỹ thuật 🔬</h2>
        <div className="gv-toys3">
          <article className="gv gv-bin">
            <span className="gv-tag green">Bảng mạch 8 bit</span>
            <BinaryLeds />
          </article>
          <article className="gv gv-bug">
            <span className="gv-tag red">Săn bug · 20 giây</span>
            <BugSmash />
          </article>
          <article className="gv gv-morse">
            <span className="gv-tag">Máy điện báo Morse</span>
            <Morse />
          </article>
        </div>
      </section>
    </div>
  );
}
