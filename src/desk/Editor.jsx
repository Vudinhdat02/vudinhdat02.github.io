/*
 * Sửa danh sách ngay trên web (Thành tích, Dự án) — dùng chung cơ chế lưu của bản cũ (admin/adminApi):
 *  - chạy trên máy (npm run dev): lưu thẳng vào src/data/*.json
 *  - trên GitHub Pages: vào #admin đăng nhập bằng mật khẩu, mỗi lần lưu là một commit
 *  - bản xem thử (VITE_DESK_DEMO=1): sửa được nhưng chỉ nằm trong trình duyệt này
 * Khách xem trang bình thường không thấy nút sửa.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { EDIT_MODE, GH_MODE, loadData, newId, saveData, uploadImage, useEditableList } from '../admin/adminApi';
import { asset } from '../utils/asset';
import { DEMO, useDiary } from './Diary';
import { thock, pop } from './sound';
import { FRAMES, frameOf } from './fields';

export function useEditable(initial, file) {
  const real = useEditableList(initial, file);
  const [local, setLocal] = useState(null);
  const demo = DEMO && !EDIT_MODE;
  const items = local || real.items;
  const save = async (next) => { if (demo) { setLocal(next); return true; } return real.commit(next); };
  return { items, save, status: real.status, canEdit: EDIT_MODE || DEMO, demo };
}

/** Một file dữ liệu dạng đối tượng (vd: phần giới thiệu) sửa được trên web. */
export function useEditableDoc(initial, file) {
  const [doc, setDoc] = useState(initial);
  const [status, setStatus] = useState({ busy: false, error: '' });
  const demo = DEMO && !EDIT_MODE;
  useEffect(() => {
    if (!GH_MODE) return undefined;
    let alive = true;
    loadData(file).then((d) => { if (alive && d && typeof d === 'object') setDoc(d); }).catch(() => {});
    return () => { alive = false; };
  }, [file]);
  const save = async (next) => {
    if (demo) { setDoc(next); return true; }
    const prev = doc; setDoc(next); setStatus({ busy: true, error: '' });
    try { await saveData(file, next); setStatus({ busy: false, error: '' }); return true; } catch (e) { setDoc(prev); setStatus({ busy: false, error: e.message }); return false; }
  };
  return { doc, save, status, canEdit: EDIT_MODE || DEMO, demo };
}

/* tải ảnh mới chọn lên, trả về giá trị đã có đường dẫn ảnh */
async function withUploads(value, files, demo, name) {
  let v = { ...value };
  for (const [k, fl] of Object.entries(files)) {
    if (!fl) continue;
    v = setK(v, k, demo ? URL.createObjectURL(fl) : await uploadImage(fl, name));
  }
  return v;
}

/* khung ngăn kéo bên phải dùng chung */
function Drawer({ title, onClose, demo, error, children }) {
  const ref = useRef(null);
  const { lenis } = useDiary() || {};
  useLayoutEffect(() => {
    lenis?.current?.stop();
    gsap.fromTo(ref.current.querySelector('.ed-panel'), { xPercent: 105 }, { xPercent: 0, duration: 0.5, ease: 'power3.out' });
    gsap.fromTo(ref.current.querySelectorAll('.ed-item, .ed-field, .ed-check'), { x: 30, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.025, duration: 0.35, delay: 0.15, ease: 'power3.out' });
    return () => lenis?.current?.start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => gsap.to(ref.current.querySelector('.ed-panel'), { xPercent: 105, duration: 0.3, ease: 'power2.in', onComplete: onClose });
  return createPortal(
    <div className="ed-wrap" ref={ref}>
      <div className="ed-bg" onClick={close} />
      <aside className="ed-panel" role="dialog" aria-label={title}>
        <header className="ed-head"><b>{title}</b><button className="ed-x" onClick={close} aria-label="Đóng">✕</button></header>
        {demo && <p className="ed-note">Bản xem thử: bạn sửa thử được, nhưng thay đổi chỉ nằm trong trình duyệt này.</p>}
        {typeof children === 'function' ? children(close) : children}
        {error && !demo && <p className="ed-err">{error}</p>}
      </aside>
    </div>,
    document.body,
  );
}

/** Sửa một đối tượng (không phải danh sách): mở ra là form luôn. */
export function DocEditor({ ed, title, fields, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Drawer title={title} onClose={onClose} demo={ed.demo} error={ed.status.error}>
      {(close) => (
        <Form fields={fields} init={ed.doc} busy={busy} onCancel={close} onSave={async (value, files) => {
          setBusy(true);
          try {
            const v = await withUploads(value, files, ed.demo, 'anh-dai-dien');
            if (!(await ed.save(v))) throw new Error(ed.status.error || 'Chưa lưu được, thử lại nhé.');
            pop(); close();
          } finally { setBusy(false); }
        }} />
      )}
    </Drawer>
  );
}

/* đọc / ghi theo đường dẫn "desc.vi" */
const getK = (o, k) => k.split('.').reduce((v, p) => (v == null ? v : typeof v === 'string' && p === 'vi' ? v : v[p]), o);
const setK = (o, k, val) => {
  const ps = k.split('.'); const out = { ...o };
  if (ps.length === 1) { out[k] = val; return out; }
  const [a, b] = ps; const cur = out[a];
  out[a] = { ...(typeof cur === 'object' && cur ? cur : { vi: cur || '' }), [b]: val };
  return out;
};

/* ô nhập danh sách cách nhau bằng dấu phẩy: giữ nguyên chữ đang gõ (kể cả dấu phẩy cuối) */
function TagsInput({ id, value, onChange }) {
  const [text, setText] = useState(() => (value || []).join(', '));
  return <input id={id} value={text} placeholder="cách nhau bằng dấu phẩy" onChange={(e) => { setText(e.target.value); onChange(e.target.value.split(',').map((x) => x.trim()).filter(Boolean)); }} />;
}

function Form({ fields, init, onCancel, onSave, busy }) {
  const [v, setV] = useState(init);
  const [files, setFiles] = useState({});
  const [err, setErr] = useState('');
  const set = (k, val) => setV((o) => setK(o, k, val));
  const submit = async (e) => {
    e.preventDefault();
    const miss = fields.find((f) => f.required && !String(getK(v, f.key) ?? '').trim());
    if (miss) { setErr(`Bạn chưa điền "${miss.label}"`); return; }
    setErr('');
    try { await onSave(v, files); } catch (x) { setErr(x.message || 'Chưa lưu được, thử lại nhé.'); }
  };
  return (
    <form className="ed-form" onSubmit={submit}>
      {fields.map((f) => {
        const val = getK(v, f.key);
        const id = `ed-${f.key}`;
        if (f.type === 'check') return <label key={f.key} className="ed-check"><input type="checkbox" checked={!!val} onChange={(e) => set(f.key, e.target.checked)} /> {f.label}</label>;
        if (f.type === 'frame') {
          const cur = val || frameOf(v);
          return (
            <div key={f.key} className="ed-field">
              <span>{f.label}: <b>{FRAMES.find((x) => x.key === cur)?.name}</b></span>
              <div className="ed-frames" role="radiogroup">
                {FRAMES.map((x) => (
                  <button type="button" key={x.key} role="radio" aria-checked={cur === x.key} title={x.name} className={`ed-fr ${cur === x.key ? 'on' : ''}`} onClick={() => set(f.key, x.key)}>
                    <span className={`hw-mould hw-f-${x.key}`}><span className="hw-mat"><i /></span></span>
                    <small>{x.name}</small>
                  </button>
                ))}
              </div>
            </div>
          );
        }
        if (f.type === 'image') {
          const pv = files[f.key] ? URL.createObjectURL(files[f.key]) : val ? asset(val) : null;
          return (
            <div key={f.key} className="ed-field">
              <span>{f.label}</span>
              <div className="ed-img">
                {pv ? <img src={pv} alt="" /> : <i>Chưa có ảnh</i>}
                <label className="ed-btn">📷 Chọn ảnh<input type="file" accept="image/*" hidden onChange={(e) => { const fl = e.target.files?.[0]; if (fl) setFiles((o) => ({ ...o, [f.key]: fl })); }} /></label>
                {pv && <button type="button" className="ed-btn ghost" onClick={() => { setFiles((o) => ({ ...o, [f.key]: null })); set(f.key, ''); }}>Bỏ ảnh</button>}
              </div>
            </div>
          );
        }
        return (
          <label key={f.key} className="ed-field" htmlFor={id}>
            <span>{f.label}</span>
            {f.type === 'area' ? <textarea id={id} rows={4} value={val || ''} onChange={(e) => set(f.key, e.target.value)} />
              : f.type === 'tags' ? <TagsInput id={id} value={val} onChange={(v) => set(f.key, v)} />
                : <input id={id} type={f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : 'text'} value={val ?? ''} list={f.options ? `${id}-o` : undefined}
                  onChange={(e) => set(f.key, f.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value)} />}
            {f.options && <datalist id={`${id}-o`}>{f.options.map((o) => <option key={o} value={o} />)}</datalist>}
          </label>
        );
      })}
      {err && <p className="ed-err">{err}</p>}
      <div className="ed-row">
        <button type="button" className="ed-btn ghost" onClick={onCancel}>Hủy</button>
        <button type="submit" className="ed-btn main" disabled={busy}>{busy ? 'Đang lưu…' : '💾 Lưu'}</button>
      </div>
    </form>
  );
}

export function ListEditor({ ed, label, fields, blank, preview, open: openP, onClose, noFab }) {
  const [openS, setOpenS] = useState(false);
  const open = openP ?? openS;
  const setOpen = (v) => { if (!v && onClose) onClose(); setOpenS(v); };
  const [form, setForm] = useState(null); // { index, value }
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const { lenis } = useDiary() || {};
  const items = ed.items;

  useLayoutEffect(() => {
    if (!open) return undefined;
    lenis?.current?.stop();
    gsap.fromTo(ref.current.querySelector('.ed-panel'), { xPercent: 105 }, { xPercent: 0, duration: 0.55, ease: 'power3.out' });
    gsap.fromTo(ref.current.querySelectorAll('.ed-item'), { x: 40, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.03, duration: 0.4, delay: 0.2, ease: 'power3.out' });
    return () => lenis?.current?.start();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => gsap.to(ref.current.querySelector('.ed-panel'), { xPercent: 105, duration: 0.35, ease: 'power2.in', onComplete: () => { setOpen(false); setForm(null); } });
  const save = async (next) => { setBusy(true); const ok = await ed.save(next); setBusy(false); if (!ok) throw new Error(ed.status.error || 'Chưa lưu được, thử lại nhé.'); pop(); return ok; };
  const onSave = async (value, files) => {
    let v = { ...value };
    for (const [k, fl] of Object.entries(files)) {
      if (!fl) continue;
      v = setK(v, k, ed.demo ? URL.createObjectURL(fl) : await uploadImage(fl, v.title || label));
    }
    if (!v.id) v.id = newId();
    const next = form.index < 0 ? [v, ...items] : items.map((x, i) => (i === form.index ? v : x));
    await save(next); setForm(null);
  };
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= items.length) return; const next = [...items]; [next[i], next[j]] = [next[j], next[i]]; thock(1.3); save(next).catch(() => {}); };
  const del = (i) => { if (!window.confirm(`Xóa "${items[i].title}"?`)) return; save(items.filter((_, j) => j !== i)).catch(() => {}); };

  return (
    <>
      {!noFab && <button className="ed-fab" onClick={() => { setOpen(true); thock(1.2); }}>✎ Sửa {label}</button>}
      {open && createPortal(
        <div className="ed-wrap" ref={ref}>
          <div className="ed-bg" onClick={close} />
          <aside className="ed-panel" role="dialog" aria-label={`Sửa ${label}`}>
            <header className="ed-head">
              <b>{form ? (form.index < 0 ? `Thêm ${label}` : `Sửa ${label}`) : `Danh sách ${label}`}</b>
              <button className="ed-x" onClick={close} aria-label="Đóng">✕</button>
            </header>
            {ed.demo && <p className="ed-note">Bản xem thử: bạn sửa thử được, nhưng thay đổi chỉ nằm trong trình duyệt này. Trên máy (npm run dev) hoặc khi đăng nhập #admin, thay đổi sẽ được lưu thật.</p>}
            {form ? (
              <Form fields={fields} init={form.value} busy={busy} onCancel={() => setForm(null)} onSave={onSave} />
            ) : (
              <>
                <button className="ed-btn main ed-add" onClick={() => setForm({ index: -1, value: blank() })}>＋ Thêm {label}</button>
                <ul className="ed-list">
                  {items.map((x, i) => {
                    const p = preview(x);
                    return (
                      <li key={x.id || i} className="ed-item">
                        <span className="ed-th">{p.img ? <img src={p.img} alt="" /> : '🏅'}</span>
                        <span className="ed-tx"><b>{p.title || '(chưa có tên)'}</b><small>{p.sub}</small></span>
                        <span className="ed-act">
                          <button onClick={() => move(i, -1)} aria-label="Lên">↑</button>
                          <button onClick={() => move(i, 1)} aria-label="Xuống">↓</button>
                          <button onClick={() => setForm({ index: i, value: x })} aria-label="Sửa">✎</button>
                          <button onClick={() => del(i)} aria-label="Xóa">🗑</button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {ed.status.error && !ed.demo && <p className="ed-err">{ed.status.error}</p>}
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
