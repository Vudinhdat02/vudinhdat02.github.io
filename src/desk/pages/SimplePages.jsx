/* Trang "CV" (máy in kim in từng dòng) và "Liên hệ" (viết thư, tem thư). */
import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { profile } from '../../data/profile';
import cvSections from '../../data/cvsections.json';
import cvInfo from '../../data/cvinfo.json';
import { asset } from '../../utils/asset';
import { buzz, thock, whoosh } from '../sound';
import { vi, useDiary } from '../Diary';
import { DocEditor, ListEditor, useEditable, useEditableDoc } from '../Editor';
import { GH_MODE, EDIT_MODE, uploadCv } from '../../admin/adminApi';

import BrandIcon, { BRAND_COLOR } from '../Brand';

const CV_FIELDS = [
  { key: 'name', label: 'Tên mục (vd: Học vấn, Kỹ năng)', type: 'text', required: true },
  { key: 'desc', label: 'Nội dung: mỗi dòng một ý. Viết "cột trái | nội dung" để chia 2 cột (vd: 2022 - 2027 | Tên trường), bắt đầu bằng "- " để gạch đầu dòng, **chữ đậm**', type: 'area' },
];
const CV_BLANK = () => ({ name: '', desc: '' });
const CV_PREVIEW = (x) => ({ title: x.name, sub: (x.desc || '').split('\n')[0].replace(/\*\*/g, '') });
const INFO_FIELDS = [
  { key: 'photo', label: 'Ảnh trong CV', type: 'image' },
  { key: 'name', label: 'Họ và tên', type: 'text', required: true },
  { key: 'role', label: 'Vị trí / chức danh', type: 'text' },
  { key: 'birth', label: 'Ngày sinh', type: 'text' },
  { key: 'gender', label: 'Giới tính', type: 'text' },
  { key: 'phone', label: 'Số điện thoại', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'address', label: 'Địa chỉ', type: 'text' },
  { key: 'website', label: 'Website', type: 'url' },
];
const INFO_ROWS = [['birth', 'Ngày sinh'], ['gender', 'Giới tính'], ['phone', 'Số điện thoại'], ['email', 'Email'], ['address', 'Địa chỉ'], ['website', 'Website']];

/* chữ đậm **…** và đường link */
const rich = (t) => String(t).split(/(\*\*[^*]+\*\*|https?:\/\/\S+)/g).map((x, k) => (
  /^\*\*/.test(x) ? <b key={k}>{x.slice(2, -2)}</b> : /^https?:\/\//.test(x) ? <a key={k} href={x} target="_blank" rel="noreferrer">{x}</a> : x));

/* một mục CV: dòng "trái | phải" thành 2 cột, "- " thành gạch đầu dòng */
function CvSection({ x, k = 0 }) {
  const lines = String(x.desc || '').split('\n').filter((l) => l.trim() !== '');
  const two = lines.some((l) => l.includes('|'));
  return (
    <section className="cvx-sec" data-sec={k}>
      <h3><span>{x.name}</span></h3>
      <div className="cvx-rows">
        {lines.map((l, k) => {
          const m = l.match(/^([^|]*)\|(.*)$/);
          const body = (m ? m[2] : l).trim();
          const li = /^[-•]\s*/.test(body);
          return (
            <div key={k} className={`cvx-row ${two ? 'two' : ''}`}>
              {two && <span className="cvx-l">{m ? m[1].trim() : ''}</span>}
              <span className={`cvx-r ${li ? 'li' : ''}`}>{rich(li ? body.replace(/^[-•]\s*/, '') : body)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CvPage() {
  const ref = useRef(null);
  const ed = useEditable(cvSections, 'cvsections');
  const info = useEditableDoc(cvInfo, 'cvinfo');
  const [panel, setPanel] = useState(false);
  const [pdf, setPdf] = useState(null);
  const [pdfMsg, setPdfMsg] = useState('');
  const [active, setActive] = useState(0);
  const [toast, setToast] = useState('');
  const toastT = useRef(0);
  const { lenis } = useDiary() || {};
  const d = info.doc || {};
  const pdfUrl = pdf || asset('/cv.pdf');
  const pickPdf = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setPdfMsg('Đang tải lên…');
    try { const url = await uploadCv(file); if (url) setPdf(url); setPdfMsg('Đã thay CV. Web cập nhật sau khoảng 2 phút.'); } catch (err) { setPdfMsg(err.message || 'Không tải lên được'); }
  };
  const say = (t) => { setToast(t); thock(1.4); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(''), 2200); };
  const copy = async (text, msg) => {
    try { await navigator.clipboard.writeText(text); say(msg); } catch { say('Không sao chép được, bạn chọn và chép tay nhé'); }
  };
  const share = async () => {
    const url = window.location.href.split('#')[0] + '#cv';
    if (navigator.share) { try { await navigator.share({ title: `CV · ${d.name || profile.name}`, url }); } catch { /* người dùng huỷ */ } return; }
    copy(url, 'Đã chép đường dẫn tới CV');
  };
  const goSec = (k) => {
    const el = ref.current?.querySelector(`[data-sec="${k}"]`); if (!el) return;
    thock(1.2);
    const y = el.getBoundingClientRect().top + window.scrollY - (window.innerWidth < 760 ? 130 : 110);
    if (lenis?.current) lenis.current.scrollTo(y, { duration: 1.1 }); else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  /* máy in kim in tờ CV ra (một lần), rồi các mục hiện dần khi cuộn tới */
  useLayoutEffect(() => {
    const q = gsap.utils.selector(ref);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { q('.cvx-sec').forEach((s) => s.classList.add('on')); return undefined; }
    const tl = gsap.timeline({ delay: 0.3 });
    tl.fromTo(q('.cv-paper'), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.6, ease: 'steps(24)', onUpdate: () => Math.random() < 0.25 && buzz(), clearProps: 'clipPath' })
      .to(q('.printhead'), { x: () => (q('.printer')[0]?.offsetWidth || 400) * 0.7, ease: 'none', duration: 1.6 / 24, repeat: 23, yoyo: true }, 0)
      .to(q('.printer-led'), { backgroundColor: '#4cff7a', duration: 0.02 }, 0)
      .from(q('.cvx-tools > *'), { x: -20, opacity: 0, stagger: 0.05, duration: 0.4, ease: 'power2.out' }, 0.4)
      .from(q('.cv-btn'), { scale: 0, rotate: -20, duration: 0.4, ease: 'back.out(2)' });
    return () => tl.kill();
  }, []);
  useLayoutEffect(() => {
    const secs = [...(ref.current?.querySelectorAll('.cvx-sec') || [])];
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('on'); setActive(+e.target.dataset.sec); }
    }), { rootMargin: '-30% 0px -55% 0px' });
    const show = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('on'); show.unobserve(e.target); } }), { threshold: 0.15 });
    secs.forEach((s) => { io.observe(s); show.observe(s); });
    const sign = ref.current?.querySelector('.cvx-sign');
    if (sign) show.observe(sign);
    return () => { io.disconnect(); show.disconnect(); };
  }, [ed.items.length]);

  return (
    <div className="cvwin cvx" ref={ref}>
      <div className="printer"><div className="printer-slot"><span className="printhead" /></div><div className="printer-face"><span>DOT-MATRIX 24</span><i className="printer-led" /></div></div>
      <div className="cvx-layout">
        <aside className="cvx-tools" aria-label="Công cụ CV">
          <nav className="cvx-toc" aria-label="Mục lục CV">
            <small>Mục lục</small>
            {ed.items.map((x, k) => <button key={x.id || x.name} className={active === k ? 'on' : ''} onClick={() => goSec(k)}><i>{String(k + 1).padStart(2, '0')}</i>{x.name}</button>)}
          </nav>
          <div className="cvx-acts">
            <button onClick={() => { thock(1.1); window.print(); }} title="In tờ CV (chỉ in phần giấy)">🖨<span>In CV</span></button>
            <a href={pdfUrl} download="CV-Vu-Dinh-Dat.pdf" onClick={() => thock(1.1)} title="Tải file PDF">⬇<span>Tải PDF</span></a>
            {d.email && <button onClick={() => copy(d.email, 'Đã chép email: ' + d.email)} title="Sao chép email">✉<span>Chép email</span></button>}
            <button onClick={share} title="Chia sẻ CV">🔗<span>Chia sẻ</span></button>
          </div>
        </aside>
        <div className="cv-feed">
          <div className="cv-paper">
            <div className="holes l" /><div className="holes r" />
            <span className="cvx-corner" aria-hidden="true" />
            <header className="cvx-head">
              {d.photo && <img className="cvx-photo" src={asset(d.photo)} alt={d.name || ''} />}
              <div className="cvx-id">
                <h2 className="cvx-name">{d.name}</h2>
                {d.role && <p className="cvx-role">{d.role}</p>}
                <dl className="cvx-info">
                  {INFO_ROWS.filter(([k]) => d[k]).map(([k, label]) => (
                    <div key={k}><dt>{label}:</dt><dd>{k === 'website' ? <a href={d[k]} target="_blank" rel="noreferrer">{d[k]}</a> : k === 'email' ? <a href={`mailto:${d[k]}`}>{d[k]}</a> : d[k]}</dd></div>
                  ))}
                </dl>
              </div>
              {info.canEdit && <button className="cvx-edit" onClick={() => { setPanel(true); thock(1.2); }}>✎ Sửa thông tin</button>}
            </header>
            {ed.items.map((x, k) => <CvSection key={x.id || x.name} x={x} k={k} />)}
            <footer className="cvx-sign">
              <span className="cvx-stamp" aria-hidden="true">ĐÃ KIỂM DUYỆT<small>{new Date().getFullYear()}</small></span>
              <div><small>Người viết CV</small><b>{d.name || profile.name}</b></div>
            </footer>
            <a className="cv-btn" href={pdfUrl} target="_blank" rel="noreferrer">Mở CV bản PDF</a>
            {EDIT_MODE && (GH_MODE || import.meta.env.DEV) && (
              <label className="cv-pdf-up">📄 Thay file CV (PDF)<input type="file" accept="application/pdf,.pdf" onChange={pickPdf} hidden />{pdfMsg && <small>{pdfMsg}</small>}</label>
            )}
          </div>
        </div>
      </div>
      {toast && <div className="cvx-toast" role="status">{toast}</div>}
      {panel && <DocEditor ed={info} title="Sửa thông tin CV" fields={INFO_FIELDS} onClose={() => setPanel(false)} />}
      {ed.canEdit && <ListEditor ed={ed} label="mục CV" fields={CV_FIELDS} blank={CV_BLANK} preview={CV_PREVIEW} />}
    </div>
  );
}

export function ContactPage() {
  const ref = useRef(null);
  const [sent, setSent] = useState(false);
  useLayoutEffect(() => {
    const q = gsap.utils.selector(ref);
    gsap.from(q('.letter'), { y: 100, rotate: 5, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.25 });
    gsap.from(q('.postage'), { y: -100, rotate: () => gsap.utils.random(-50, 50), opacity: 0, stagger: 0.07, duration: 0.8, ease: 'back.out(1.8)', delay: 0.35 });
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
