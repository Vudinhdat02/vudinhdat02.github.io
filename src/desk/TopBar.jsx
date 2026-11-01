/*
 * Thanh menu trên cùng: hộp bút + các phím mục lục.
 * - Cuộn xuống thì thu gọn lên, cuộn lên thì hiện lại.
 * - Vạch dạ quang chạy theo trang đang mở; bút chì bên dưới là thanh tiến độ cả trang.
 * - Điện thoại: nút ☰ mở bảng mục lục.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { thock } from './sound';

export default function TopBar({ sections, active, onGo, onBrand, onSearch, night, onNight, mute, onMute, canWrite, onWrite, onAdmin }) {
  const bar = useRef(null);
  const hl = useRef(null);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  // ẩn khi cuộn xuống, hiện khi cuộn lên
  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (s) => setHidden(s.direction === 1 && s.scroll() > 200),
    });
    return () => st.kill();
  }, []);

  // vạch dạ quang trượt tới mục đang xem
  useLayoutEffect(() => {
    const btn = bar.current?.querySelector(`.tb-item[data-i="${active}"]`);
    if (!btn || active < 0) { gsap.to(hl.current, { scaleX: 0, duration: 0.3 }); return; }
    const r = btn.getBoundingClientRect(), pr = btn.parentElement.getBoundingClientRect();
    gsap.to(hl.current, { x: r.left - pr.left + 6, width: r.width - 12, scaleX: 1, backgroundColor: sections[active].color, duration: 0.55, ease: 'elastic.out(1, 0.7)' });
  }, [active, sections]);
  useEffect(() => {
    const again = () => { const btn = bar.current?.querySelector(`.tb-item[data-i="${active}"]`); if (!btn || active < 0) return; const r = btn.getBoundingClientRect(), pr = btn.parentElement.getBoundingClientRect(); gsap.set(hl.current, { x: r.left - pr.left + 6, width: r.width - 12 }); };
    document.fonts?.ready.then(again);
    window.addEventListener('resize', again);
    return () => window.removeEventListener('resize', again);
  }, [active]);

  const go = (i) => { setOpen(false); onGo(i); };

  return (
    <header ref={bar} className={`tb ${hidden && !open ? 'tb-hide' : ''} ${open ? 'tb-open' : ''}`}>
      <div className="tb-inner">
        <button className="tb-brand" onClick={(e) => { thock(); onBrand ? onBrand(e) : onGo(-1); }} aria-label="Về trang chủ">
          <span className="tb-logo" title="Đạt hoa quả">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path className="lg-leaf" d="M25 9 C 27 2, 36 1, 40 4 C 37 9, 31 11, 25 9 Z" fill="#4caf50" stroke="#2e7d32" strokeWidth="1.2" />
              <path d="M24 12 C 24 9, 25 7, 27 5" stroke="#6d4c2f" strokeWidth="2" fill="none" strokeLinecap="round" />
              <g className="lg-fruit">
                <circle cx="24" cy="28" r="16" fill="#ff9f1c" stroke="#e07b00" strokeWidth="1.5" />
                <circle cx="24" cy="28" r="12.6" fill="#ffd166" />
                <g stroke="#fff6dc" strokeWidth="1.6" strokeLinecap="round">{[0, 45, 90, 135].map((a) => <line key={a} x1="24" y1="16.6" x2="24" y2="39.4" transform={`rotate(${a} 24 28)`} />)}</g>
                <circle cx="24" cy="28" r="2.2" fill="#fff6dc" />
                <ellipse cx="17" cy="20" rx="3.2" ry="1.6" fill="#fff" opacity=".55" transform="rotate(-35 17 20)" />
              </g>
              <circle className="lg-cherry" cx="40" cy="38" r="5" fill="#e63946" stroke="#a4161a" strokeWidth="1.2" />
              <circle cx="38.6" cy="36.4" r="1.3" fill="#fff" opacity=".7" />
            </svg>
          </span>
          <span className="tb-name">Vũ Đình Đạt<small>dathoaqua · R&D IoT</small></span>
        </button>

        <nav className="tb-nav" aria-label="Mục lục">
          <span ref={hl} className="tb-hl" aria-hidden="true" />
          {sections.map((s, i) => (
            <button key={s.id} data-i={i} className={`tb-item ${active === i ? 'on' : ''}`} onClick={() => go(i)} onMouseEnter={() => thock(1.5)}>
              <kbd>{i + 1}</kbd>{s.label}
            </button>
          ))}
        </nav>

        <div className="tb-tools">
          <button className="tb-tool tb-search" onClick={onSearch} title="Tìm nhanh (Ctrl+K)"><span>⌕</span><kbd>Ctrl K</kbd></button>
          <button className={`tb-tool lamp ${night ? 'off' : ''}`} onClick={onNight} title={night ? 'Bật đèn' : 'Tắt đèn (chế độ tối)'} aria-pressed={night}>
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 28h14M11 28l4-11 6-6" /><path className="shade" d="M17 6l9 9-3 2-8-8z" /><circle cx="15" cy="17" r="1.6" /></svg>
          </button>
          <button className="tb-tool" onClick={onMute} title={mute ? 'Bật âm thanh' : 'Tắt âm thanh'}>{mute ? '🔇' : '🔊'}</button>
          {canWrite && <button className="tb-write" onClick={onWrite}>✍ Viết nhật ký</button>}
          <button className="tb-burger" onClick={() => { setOpen(!open); thock(); }} aria-expanded={open} aria-label="Mở mục lục"><i /><i /><i /></button>
        </div>
      </div>
      <div className="tb-progress" aria-hidden="true"><div className="progress-line" /></div>

      {open && (
        <div className="tb-drawer">
          {sections.map((s, i) => (
            <button key={s.id} style={{ '--c': s.color }} className={active === i ? 'on' : ''} onClick={() => go(i)}><kbd>{i + 1}</kbd>{s.label}</button>
          ))}
          {canWrite && <button className="dw-write" onClick={() => { setOpen(false); onWrite(); }}>✍ Viết nhật ký</button>}
        </div>
      )}
    </header>
  );
}
