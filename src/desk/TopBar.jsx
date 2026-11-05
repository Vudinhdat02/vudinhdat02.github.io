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
import { GUEST_VIEW, IS_ADMIN, setGuestView } from '../admin/adminApi';

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
          <TextSize />
          {IS_ADMIN && <GuestEye />}
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

/* Cỡ chữ cho người xem: phóng to/thu nhỏ cả trang, nhớ lựa chọn cho lần sau. */
const SIZES = [0.9, 1, 1.1, 1.2, 1.3];
const setFs = (z) => { if (z === 1) document.documentElement.style.removeProperty('--fs'); else document.documentElement.style.setProperty('--fs', String(z)); };
const applySize = (z) => { setFs(z); requestAnimationFrame(() => ScrollTrigger.refresh()); };
export const initTextSize = () => { try { const z = +localStorage.getItem('desk.zoom'); if (SIZES.includes(z)) setFs(z); } catch { /* bỏ qua */ } };
initTextSize();

/* nút con mắt: quản trị xem lại web như khách, bấm lần nữa để quay về */
const EyeIc = ({ off }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="eye-ic">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);
function GuestEye() {
  const go = () => { thock(1.3); setGuestView(!GUEST_VIEW); };
  return GUEST_VIEW ? (
    <button className="tb-tool tb-eye on" onClick={go} title="Trở lại chế độ quản trị" aria-label="Trở lại chế độ quản trị">
      <EyeIc off /><span>Trở lại quản trị</span>
    </button>
  ) : (
    <button className="tb-tool tb-eye" onClick={go} title="Xem web như khách" aria-label="Xem web như khách"><EyeIc /></button>
  );
}

function TextSize() {
  const [z, setZ] = useState(() => { try { const v = +localStorage.getItem('desk.zoom'); return SIZES.includes(v) ? v : 1; } catch { return 1; } });
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [open]);
  const set = (v) => { thock(1.3); setZ(v); applySize(v); try { localStorage.setItem('desk.zoom', String(v)); } catch { /* bỏ qua */ } };
  const i = SIZES.indexOf(z);
  return (
    <div className="tz" ref={box}>
      <button className={`tb-tool tz-btn ${z !== 1 ? 'on' : ''}`} onClick={() => { setOpen(!open); thock(); }} title="Cỡ chữ" aria-label="Cỡ chữ" aria-expanded={open}>
        <span className="tz-a">A</span><span className="tz-b">A</span>
      </button>
      {open && (
        <div className="tz-pop" role="dialog" aria-label="Chỉnh cỡ chữ">
          <b>Cỡ chữ</b>
          <div className="tz-row">
            <button onClick={() => set(SIZES[Math.max(0, i - 1)])} disabled={i <= 0} aria-label="Chữ nhỏ hơn">A−</button>
            <span className="tz-val">{Math.round(z * 100)}%</span>
            <button onClick={() => set(SIZES[Math.min(SIZES.length - 1, i + 1)])} disabled={i >= SIZES.length - 1} aria-label="Chữ to hơn">A+</button>
          </div>
          <div className="tz-dots">{SIZES.map((v) => <button key={v} className={v === z ? 'on' : ''} onClick={() => set(v)} aria-label={`${Math.round(v * 100)}%`} />)}</div>
          {z !== 1 && <button className="tz-reset" onClick={() => set(1)}>Về mặc định</button>}
        </div>
      )}
    </div>
  );
}
