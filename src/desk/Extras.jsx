/* Các phần nhỏ dùng chung: xem ảnh phóng to, đèn bàn (chế độ tối), đăng nhập chủ trang. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { GH_MODE, hasPassword, setPassword, signInWithPassword, signOut } from '../admin/adminApi';
import { asset } from '../utils/asset';
import { whoosh } from './sound';

/** Ảnh phóng to: tấm ảnh bay ra từ chỗ vừa bấm */
export function Lightbox({ item, from, onClose }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const card = ref.current.querySelector('.lb-card');
    whoosh();
    const r = card.getBoundingClientRect();
    const fx = from ? from.left + from.width / 2 - (r.left + r.width / 2) : 0;
    const fy = from ? from.top + from.height / 2 - (r.top + r.height / 2) : 80;
    const sc = from ? Math.max(0.15, from.width / r.width) : 0.6;
    gsap.fromTo(ref.current.querySelector('.bk-backdrop'), { opacity: 0 }, { opacity: 1, duration: 0.3 });
    gsap.fromTo(card, { x: fx, y: fy, scale: sc, rotate: 8 }, { x: 0, y: 0, scale: 1, rotate: -1.5, duration: 0.6, ease: 'power3.out' });
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, from, onClose]);
  return (
    <div className="lb-wrap" ref={ref} role="dialog" aria-modal="true" aria-label={item.title} onClick={onClose}>
      <div className="bk-backdrop" />
      <figure className="lb-card" onClick={(e) => e.stopPropagation()}>
        <span className="pin" />
        <img src={asset(item.src)} alt={item.title} />
        <figcaption><b>{item.title}</b>{item.sub && <small>{item.sub}</small>}</figcaption>
        <button className="bk-close" onClick={onClose} aria-label="Đóng">✕</button>
      </figure>
    </div>
  );
}

/** Tắt đèn: cả trang tối lại, chỉ còn vùng sáng của đèn bàn đi theo con trỏ */
export function NightLamp({ on }) {
  const ref = useRef(null);
  useEffect(() => {
    document.documentElement.classList.toggle('night', on);
    if (!on) return undefined;
    const el = ref.current;
    let raf = 0, x = window.innerWidth / 2, y = window.innerHeight * 0.4;
    const pos = { x, y };
    const set = () => { el.style.setProperty('--mx', `${pos.x}px`); el.style.setProperty('--my', `${pos.y}px`); };
    set();
    const move = (e) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(tick); };
    const tick = () => { pos.x += (x - pos.x) * 0.2; pos.y += (y - pos.y) * 0.2; set(); raf = Math.abs(x - pos.x) + Math.abs(y - pos.y) > 0.5 ? requestAnimationFrame(tick) : 0; };
    window.addEventListener('pointermove', move);
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'steps(4)' });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [on]);
  return on ? <div ref={ref} className="night-veil" aria-hidden="true" /> : null;
}

/**
 * Đăng nhập chủ trang trên web thật (#admin).
 *  - Đã đặt mật khẩu: chỉ cần gõ mật khẩu.
 *  - Lần đầu (hoặc khi mã GitHub hết hạn): dán mã GitHub một lần + đặt mật khẩu.
 *  - Đang đăng nhập: đổi mật khẩu hoặc đăng xuất.
 */
const MSG = {
  'bad-format': 'Mã không đúng dạng (bắt đầu bằng github_pat_ hoặc ghp_).',
  'bad-token': 'Mã GitHub sai hoặc đã hết hạn.',
  'token-expired': 'Mật khẩu đúng, nhưng mã GitHub bên trong đã hết hạn. Bấm “Đặt lại mật khẩu” và dán mã mới nhé.',
  'no-repo': 'Không tìm thấy repo của trang.',
  'not-owner': 'Mã này không phải của chủ trang.',
  'no-write': 'Mã chưa có quyền ghi (Contents: Read and write).',
  'bad-password': 'Sai mật khẩu.',
  'no-key': 'Chưa đặt mật khẩu. Bấm “Đặt mật khẩu” để đặt lần đầu.',
  'short-password': 'Mật khẩu cần ít nhất 10 ký tự.',
};

export function SignIn({ onClose }) {
  const [mode, setMode] = useState(GH_MODE ? 'in' : 'wait'); // wait | login | setup | in | change | done
  const [f, setF] = useState({ pw: '', pw2: '', token: '', remember: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const to = (m) => { setErr(''); setF((o) => ({ ...o, pw: '', pw2: '' })); setMode(m); };
  useEffect(() => { if (mode === 'wait') hasPassword().then((ok) => setMode(ok ? 'login' : 'setup')); }, [mode]);
  const enter = () => { window.location.hash = ''; window.location.reload(); };
  const run = (fn) => async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await fn(); } catch (x) { setErr(MSG[x.message] || x.message); } finally { setBusy(false); }
  };
  const login = run(async () => { await signInWithPassword(f.pw, f.remember); enter(); });
  const setup = run(async () => {
    if (f.pw !== f.pw2) throw new Error('Hai lần nhập mật khẩu chưa giống nhau.');
    await setPassword(f.pw, mode === 'setup' ? f.token : undefined);
    setMode('done');
  });
  const pw = (k, label, auto) => <label className="cp-f"><span>{label}</span><input type="password" value={f[k]} onChange={set(k)} autoComplete={auto} autoFocus={k === 'pw' && mode !== 'setup'} /></label>;
  const actions = (label) => (
    <div className="cp-actions"><button type="button" onClick={onClose}>Huỷ</button><button className="cp-go" disabled={busy}>{busy ? 'Đang xử lý…' : label}</button></div>
  );

  let body;
  if (mode === 'wait') body = <p className="cp-note">Đang mở khoá…</p>;
  else if (mode === 'login') body = (
    <form onSubmit={login}>
      <p className="cp-note">Nhập mật khẩu quản trị. Sau khi vào, các nút “✎ Sửa” và “Viết nhật ký” sẽ hiện ra.</p>
      {pw('pw', 'Mật khẩu', 'current-password')}
      <label className="cp-check"><input type="checkbox" checked={f.remember} onChange={set('remember')} /> Ghi nhớ trên máy này</label>
      {err && <p className="cp-err">{err}</p>}
      {actions('Đăng nhập')}
      <button type="button" className="cp-link" onClick={() => to('setup')}>Quên mật khẩu / mã GitHub hết hạn? Đặt lại mật khẩu</button>
    </form>
  );
  else if (mode === 'setup' || mode === 'change') body = (
    <form onSubmit={setup}>
      {mode === 'setup'
        ? <p className="cp-note">Dán mã truy cập GitHub <b>một lần</b> (quyền ghi vào repo của trang), rồi đặt mật khẩu. Lần sau chỉ cần gõ mật khẩu.</p>
        : <p className="cp-note">Đặt mật khẩu mới. Mật khẩu cũ sẽ hết dùng được sau khi lưu.</p>}
      {mode === 'setup' && <label className="cp-f"><span>Mã truy cập GitHub</span><input type="password" value={f.token} onChange={set('token')} placeholder="github_pat_…" autoComplete="off" autoFocus /></label>}
      {pw('pw', 'Mật khẩu mới (ít nhất 10 ký tự)', 'new-password')}
      {pw('pw2', 'Nhập lại mật khẩu', 'new-password')}
      {err && <p className="cp-err">{err}</p>}
      {actions('Lưu mật khẩu')}
      {mode === 'setup' && <button type="button" className="cp-link" onClick={() => to('wait')}>Đã có mật khẩu? Đăng nhập</button>}
    </form>
  );
  else if (mode === 'done') body = (
    <>
      <p className="cp-note">Đã lưu mật khẩu 🎉 Từ giờ vào <b>#admin</b> chỉ cần gõ mật khẩu này.</p>
      <div className="cp-actions"><button className="cp-go" onClick={enter}>Vào trang</button></div>
    </>
  );
  else body = (
    <>
      <p className="cp-note">Bạn đang đăng nhập với quyền chủ trang.</p>
      <div className="cp-actions">
        <button type="button" onClick={() => to('change')}>Đổi mật khẩu</button>
        <button type="button" onClick={() => { signOut(); enter(); }}>Đăng xuất</button>
        <button className="cp-go" onClick={onClose}>Đóng</button>
      </div>
    </>
  );

  return (
    <div className="cp-wrap" role="dialog" aria-modal="true" aria-label="Đăng nhập">
      <div className="bk-backdrop" onClick={onClose} />
      <div className="cp small">
        <h3>{mode === 'setup' || mode === 'change' ? 'Đặt mật khẩu quản trị 🔐' : 'Đăng nhập chủ trang 🔑'}</h3>
        {body}
      </div>
    </div>
  );
}
