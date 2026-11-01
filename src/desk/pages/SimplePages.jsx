/* Trang "CV" (máy in kim in từng dòng) và "Liên hệ" (viết thư, tem thư). */
import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { profile } from '../../data/profile';
import skills from '../../data/skills.json';
import intro from '../../data/intro.json';
import { asset } from '../../utils/asset';
import { buzz, thock, whoosh } from '../sound';
import { vi } from '../Diary';
import { ListEditor, useEditable } from '../Editor';
import { GH_MODE, EDIT_MODE, uploadCv } from '../../admin/adminApi';

const CV_FIELDS = [
  { key: 'name', label: 'Tên mục (vd: Học vấn, Kinh nghiệm)', type: 'text', required: true },
  { key: 'desc', label: 'Nội dung (mỗi dòng một ý, bắt đầu bằng dấu -)', type: 'area' },
];
const CV_BLANK = () => ({ name: '', desc: '- ' });
const CV_PREVIEW = (x) => ({ title: x.name, sub: (x.desc || '').split('\n')[0] });
import BrandIcon, { BRAND_COLOR } from '../Brand';

export function CvPage() {
  const ref = useRef(null);
  const ed = useEditable(intro, 'intro');
  const [pdf, setPdf] = useState(null);
  const [pdfMsg, setPdfMsg] = useState('');
  const pickPdf = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setPdfMsg('Đang tải lên…');
    try { const url = await uploadCv(file); if (url) setPdf(url); setPdfMsg('Đã thay CV. Web cập nhật sau khoảng 2 phút.'); } catch (err) { setPdfMsg(err.message || 'Không tải lên được'); }
  };
  useLayoutEffect(() => {
    const q = gsap.utils.selector(ref);
    const tl = gsap.timeline({ delay: 0.8 });
    tl.fromTo(q('.cv-paper'), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 2.4, ease: 'steps(30)', onUpdate: () => Math.random() < 0.3 && buzz() })
      .to(q('.printhead'), { x: () => (q('.printer')[0]?.offsetWidth || 400) * 0.7, ease: 'none', duration: 2.4 / 30, repeat: 29, yoyo: true }, 0)
      .to(q('.printer-led'), { backgroundColor: '#4cff7a', duration: 0.02 }, 0)
      .from(q('.cv-btn'), { scale: 0, rotate: -20, duration: 0.4, ease: 'back.out(2)' });
    return () => tl.kill();
  }, []);
  return (
    <div className="cvwin" ref={ref}>
      <div className="printer"><div className="printer-slot"><span className="printhead" /></div><div className="printer-face"><span>DOT-MATRIX 24</span><i className="printer-led" /></div></div>
      <div className="cv-feed">
        <div className="cv-paper">
          <div className="holes l" /><div className="holes r" />
          <h2>SƠ YẾU LÝ LỊCH</h2>
          <p className="cv-name">VŨ ĐÌNH ĐẠT</p>
          <p className="cv-role">{profile.role.vi} · {vi(profile.location)}</p>
          <hr />
          {ed.items.map((x) => <div key={x.id} className="cv-block"><b>{x.name.toUpperCase()}</b><pre>{x.desc}</pre></div>)}
          <div className="cv-block"><b>KỸ NĂNG</b><pre>{skills.map((s) => `- ${s.name}: ${s.desc}`).join('\n')}</pre></div>
          <div className="cv-block"><b>LIÊN HỆ</b><pre>{`- Email: ${profile.email}\n- GitHub: github.com/Vudinhdat02`}</pre></div>
          <a className="cv-btn" href={pdf || asset('/cv.pdf')} target="_blank" rel="noreferrer">Mở CV đầy đủ (PDF)</a>
          {EDIT_MODE && (GH_MODE || import.meta.env.DEV) && (
            <label className="cv-pdf-up">📄 Thay file CV (PDF)<input type="file" accept="application/pdf,.pdf" onChange={pickPdf} hidden />{pdfMsg && <small>{pdfMsg}</small>}</label>
          )}
        </div>
      </div>
      {ed.canEdit && <ListEditor ed={ed} label="mục CV" fields={CV_FIELDS} blank={CV_BLANK} preview={CV_PREVIEW} />}
    </div>
  );
}

export function ContactPage() {
  const ref = useRef(null);
  const [sent, setSent] = useState(false);
  useLayoutEffect(() => {
    const q = gsap.utils.selector(ref);
    gsap.from(q('.letter'), { y: 100, rotate: 5, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.7 });
    gsap.from(q('.postage'), { y: -100, rotate: () => gsap.utils.random(-50, 50), opacity: 0, stagger: 0.07, duration: 0.8, ease: 'back.out(1.8)', delay: 0.9 });
  }, []);
  const onSend = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = `${f.get('msg') || ''}\n\n— ${f.get('name') || ''} (${f.get('email') || ''})`;
    const q = gsap.utils.selector(ref);
    whoosh();
    gsap.timeline()
      .to(q('.letter-form'), { scaleY: 0.05, duration: 0.3, ease: 'power2.in' })
      .set(q('.letter-form'), { opacity: 0 })
      .fromTo(q('.plane'), { opacity: 1, scale: 0.4, x: 0, y: 0, rotate: 0 }, { scale: 1, duration: 0.2 })
      .to(q('.plane'), { keyframes: [{ x: 120, y: -60, rotate: -15 }, { x: 420, y: -200, rotate: -30 }, { x: 1000, y: -500, rotate: -40, opacity: 0 }], duration: 1.4, ease: 'power1.in' })
      .add(() => setSent(true));
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent('Liên hệ từ website — ' + (f.get('name') || ''))}&body=${encodeURIComponent(body)}`;
  };
  return (
    <div className="ctwin paper-bg" ref={ref}>
      <div className="letter">
        {!sent ? (
          <form className="letter-form" onSubmit={onSend}>
            <p className="dear">Gửi Đạt,</p>
            <label><span>Mình tên là</span><input name="name" required placeholder="…" /></label>
            <label><span>Email của mình</span><input name="email" type="email" required placeholder="…" /></label>
            <label className="msg"><span>Lời nhắn</span><textarea name="msg" rows={4} required placeholder="Mình muốn hợp tác về…" /></label>
            <button className="send">Gấp máy bay & gửi ✈</button>
          </form>
        ) : <p className="thanks">Ứng dụng email của bạn vừa mở, chỉ cần bấm Gửi. Cảm ơn bạn ✍<br /><small>Hoặc gửi thẳng tới {profile.email}</small></p>}
        <svg className="plane" viewBox="0 0 64 64" aria-hidden="true"><path d="M2 30 L62 4 L40 60 L30 38 Z" fill="#fff" stroke="#1f2f6e" strokeWidth="2" /><path d="M30 38 L62 4" stroke="#1f2f6e" strokeWidth="2" /></svg>
      </div>
      <div className="stamps">
        {profile.socials.map((s) => (
          <a key={s.url} className="postage" style={{ '--bc': BRAND_COLOR[s.icon] }} href={s.url} target="_blank" rel="noreferrer" onMouseEnter={() => thock(1.6)}>
            <span className="postage-in"><span className="pg-ic"><BrandIcon kind={s.icon} /></span><b>{vi(s.label)}</b><small>{s.handle}</small></span>
          </a>
        ))}
      </div>
    </div>
  );
}
