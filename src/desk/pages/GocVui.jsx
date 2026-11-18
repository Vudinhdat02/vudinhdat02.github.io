/*
 * Trang "Góc vui": máy tính phòng máy (Terminal), bài chính tả (thi gõ phím), đồng hồ lớp học (Pomodoro)
 * và mấy món đồ chơi nhỏ chủ đề IoT / drone / lập trình (Toys.jsx). Tất cả chạy offline.
 */
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Terminal, TypeRace, Focus } from '../apps/Apps';
import { DroneGame, BinaryLeds, BugSmash, Morse } from '../apps/Toys';

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
          <span className="gv-tag red">Bài kiểm tra chính tả · 30 giây</span>
          <TypeRace />
        </article>
        <article className="gv gv-focus">
          <span className="gv-tag green">Giờ tự học</span>
          <div className="gv-clock" aria-hidden="true"><i className="h" /><i className="m" /></div>
          <Focus />
        </article>
      </div>

      <h2 className="gv-h">Hộp đồ chơi của kỹ sư 🧰</h2>
      <div className="gv-toys">
        <article className="gv gv-drone">
          <span className="gv-tag">Sân bay drone</span>
          <DroneGame />
        </article>
        <article className="gv gv-bin">
          <span className="gv-tag green">Bảng mạch 8 bit</span>
          <BinaryLeds />
        </article>
        <article className="gv gv-bug">
          <span className="gv-tag red">Săn bug · 20 giây</span>
          <BugSmash />
        </article>
        <article className="gv gv-morse">
          <span className="gv-tag">Máy điện báo</span>
          <Morse />
        </article>
      </div>
    </div>
  );
}
