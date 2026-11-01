/* Trang "Góc vui": máy tính phòng máy (Terminal), bài chính tả (thi gõ phím), đồng hồ lớp học (Pomodoro) */
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Terminal, TypeRace, Focus } from '../apps/Apps';

export default function GocVui({ onNav, onNight }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.gv', { y: 120, rotate: (i) => [-6, 5, -3][i], opacity: 0, stagger: 0.12, duration: 1, ease: 'back.out(1.4)', delay: 0.6 });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <div className="gocvui" ref={ref}>
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
  );
}
