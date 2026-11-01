/* chân trang dùng chung: mép giấy xé, tem mạng xã hội nhỏ, chữ ký */
import { profile } from '../data/profile';
import { ROUTES } from './routes';
import { Torn, Doodle } from './Fx';
import { thock } from './sound';
import BrandIcon from './Brand';

const vi = (v) => (typeof v === 'object' && v ? v.vi || v.en : v);

export default function Footer({ onNav }) {
  return (
    <footer className="foot">
      <Torn color="#1f2f6e" seed={7} className="foot-edge" />
      <div className="foot-in">
        <div className="foot-sign">
          <p>Cảm ơn bạn đã ghé bàn học của mình!</p>
          <Doodle kind="sig" className="sig" color="#ffd84d" width={3} />
          <small>Vũ Đình Đạt · {vi(profile.location)}</small>
        </div>
        <nav className="foot-nav">
          {ROUTES.map((r) => <button key={r.id || 'home'} data-mag="0.3" onClick={() => onNav(r.id)} onMouseEnter={() => thock(1.6)} style={{ '--c': r.color }}>{r.label}</button>)}
        </nav>
        <div className="foot-soc">
          {profile.socials.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" title={vi(s.label)} data-mag="0.4"><BrandIcon kind={s.icon} /></a>)}
        </div>
      </div>
      <p className="foot-copy">© {new Date().getFullYear()} Vũ Đình Đạt · làm bằng ☕, phím cơ và rất nhiều trang vở <Doodle kind="heart" className="foot-heart" color="#ff8fa3" /></p>
    </footer>
  );
}
