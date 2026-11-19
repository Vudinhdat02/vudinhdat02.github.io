/*
 * Trang "Du lịch": bản đồ Việt Nam 63 tỉnh thành (trước khi sáp nhập năm 2025), có quần đảo Hoàng Sa, Trường Sa
 * và các đảo lớn. Tỉnh nào đã đến được tô màu (đậm dần theo số ảnh); bấm vào tỉnh để xem ảnh và ghi chú.
 *  - Bản đồ: src/data/vnmap.json, tạo bằng scripts/tao-ban-do-viet-nam.cjs từ geoBoundaries VNM ADM1 (Public Domain).
 *  - Ảnh: src/data/travel.json  [{ id, province, image, title, date, place, desc }]
 *  - Ghi chú từng tỉnh: src/data/travelnotes.json  { <mã tỉnh>: "ghi chú" }
 *  - Sửa (thêm / sửa / xoá ảnh, ghi chú): chạy npm run dev trên máy, hoặc đăng nhập #admin trên web thật.
 * Trang này không phát âm thanh.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MAP from '../../data/vnmap.json';
import travelData from '../../data/travel.json';
import notesData from '../../data/travelnotes.json';
import { asset } from '../../utils/asset';
import { looksLikeImage, toWebImage } from '../../utils/image';
import { newId, uploadImage } from '../../admin/adminApi';
import { useEditable, useEditableDoc } from '../Editor';
import { useDiary } from '../Diary';
import { reduced } from '../Fx';

gsap.registerPlugin(ScrollTrigger);
const BY_ID = Object.fromEntries(MAP.provinces.map((p) => [p.id, p]));
const level = (n) => (n >= 6 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);
const BLANK = (province) => ({ id: '', province, image: '', title: '', date: '', place: '', desc: '' });

/* ---------- bản đồ: kéo để di chuyển, nút +/− hoặc lăn chuột / chụm hai ngón để phóng to ---------- */
function useZoom(svgRef) {
  const [vb, setVb] = useState({ x: 0, y: 0, w: MAP.w, h: MAP.h });
  const clamp = (v) => {
    const w = Math.min(MAP.w, Math.max(MAP.w / 6, v.w)), h = (w / MAP.w) * MAP.h;
    return { w, h, x: Math.min(MAP.w - w * 0.3, Math.max(-w * 0.7, v.x)), y: Math.min(MAP.h - h * 0.3, Math.max(-h * 0.7, v.y)) };
  };
  const zoomAt = (k, cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2) => setVb((v) => clamp({ w: v.w / k, h: v.h / k, x: cx - (cx - v.x) / k, y: cy - (cy - v.y) / k }));
  useEffect(() => {
    const el = svgRef.current; if (!el) return undefined;
    const pts = new Map(); let start = null;
    const toMap = (e, v) => { const r = el.getBoundingClientRect(); return [v.x + ((e.clientX - r.left) / r.width) * v.w, v.y + ((e.clientY - r.top) / r.height) * v.h]; };
    const down = (e) => { pts.set(e.pointerId, e); if (pts.size === 1) start = { e, moved: false }; };
    const move = (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, e);
      setVb((v) => {
        const r = el.getBoundingClientRect(), sx = v.w / r.width, sy = v.h / r.height;
        if (pts.size === 2) {
          const [a, b] = [...pts.values()]; const d1 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          const pa = a === e ? prev : a, pb = b === e ? prev : b; const d0 = Math.hypot(pa.clientX - pb.clientX, pa.clientY - pb.clientY) || d1;
          const [cx, cy] = toMap({ clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 }, v); const k = d1 / d0;
          return clamp({ w: v.w / k, h: v.h / k, x: cx - (cx - v.x) / k, y: cy - (cy - v.y) / k });
        }
        const dx = e.clientX - prev.clientX, dy = e.clientY - prev.clientY;
        if (start && Math.hypot(e.clientX - start.e.clientX, e.clientY - start.e.clientY) > 6) start.moved = true;
        if (v.w >= MAP.w - 1) return v; // chưa phóng to thì không kéo (để cuộn trang bình thường)
        return clamp({ ...v, x: v.x - dx * sx, y: v.y - dy * sy });
      });
    };
    const up = (e) => { pts.delete(e.pointerId); if (start?.moved) el.dataset.drag = '1'; setTimeout(() => { delete el.dataset.drag; }, 0); if (!pts.size) start = null; };
    const wheel = (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); setVb((v) => { const [cx, cy] = toMap(e, v); const k = e.deltaY < 0 ? 1.2 : 1 / 1.2; return clamp({ w: v.w / k, h: v.h / k, x: cx - (cx - v.x) / k, y: cy - (cy - v.y) / k }); }); };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { vb, zoomIn: () => zoomAt(1.5), zoomOut: () => zoomAt(1 / 1.5), reset: () => setVb({ x: 0, y: 0, w: MAP.w, h: MAP.h }), focus: (p) => setVb(clamp({ w: MAP.w / 3, h: MAP.h / 3, x: p.cx - MAP.w / 6, y: p.cy - MAP.h / 6 })) };
}

/* ---------- xem ảnh lớn: ảnh dọc hay ngang đều vừa màn hình ---------- */
function Viewer({ list, at, onClose }) {
  const [i, setI] = useState(at);
  const p = list[i];
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI((x) => (x + 1) % list.length); if (e.key === 'ArrowLeft') setI((x) => (x - 1 + list.length) % list.length); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [list.length, onClose]);
  if (!p) return null;
  return createPortal(
    <div className="tv-view" role="dialog" aria-modal="true" aria-label={p.title} onClick={onClose}>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={asset(p.image)} alt={p.title} />
        <figcaption><b>{p.title}</b><small>{[p.place, p.date].filter(Boolean).join(' · ')}</small>{p.desc && <span>{p.desc}</span>}</figcaption>
      </figure>
      {list.length > 1 && <>
        <button className="tv-nav prev" onClick={(e) => { e.stopPropagation(); setI((i - 1 + list.length) % list.length); }} aria-label="Ảnh trước">‹</button>
        <button className="tv-nav next" onClick={(e) => { e.stopPropagation(); setI((i + 1) % list.length); }} aria-label="Ảnh sau">›</button>
      </>}
      <button className="tv-x" onClick={onClose} aria-label="Đóng">✕</button>
    </div>,
    document.body,
  );
}

/* ---------- khung thêm / sửa một ảnh ---------- */
function PhotoForm({ init, onCancel, onSave }) {
  const [v, setV] = useState(init);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(init.image ? asset(init.image) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, x) => setV((o) => ({ ...o, [k]: x }));
  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f || !looksLikeImage(f)) return;
    setErr(''); setBusy(true);
    try { const web = await toWebImage(f); setFile(web); setPreview(URL.createObjectURL(web)); } catch (x) { setErr(x.message || 'Không đọc được ảnh'); }
    setBusy(false);
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!v.title.trim()) { setErr('Hãy đặt tên cho ảnh'); return; }
    if (!file && !v.image) { setErr('Hãy chọn một ảnh'); return; }
    setBusy(true); setErr('');
    try { await onSave(v, file); } catch (x) { setErr(x.message || 'Chưa lưu được, thử lại nhé'); setBusy(false); }
  };
  return (
    <form className="tv-form" onSubmit={submit}>
      <label className="tv-drop">
        {preview ? <img src={preview} alt="" /> : <span>📷 Chọn ảnh (JPG, PNG, HEIC…)</span>}
        <input type="file" accept="image/*,.heic,.heif" onChange={pick} hidden />
      </label>
      <label><span>Tên ảnh</span><input value={v.title} onChange={(e) => set('title', e.target.value)} placeholder="vd: Săn mây Ba Vì" /></label>
      <div className="tv-2">
        <label><span>Ngày</span><input value={v.date} onChange={(e) => set('date', e.target.value)} placeholder="vd: 04/11/2026" /></label>
        <label><span>Địa điểm</span><input value={v.place} onChange={(e) => set('place', e.target.value)} placeholder="vd: Vườn quốc gia Ba Vì" /></label>
      </div>
      <label><span>Mô tả</span><textarea rows={3} value={v.desc} onChange={(e) => set('desc', e.target.value)} /></label>
      {err && <p className="tv-err">{err}</p>}
      <div className="tv-row"><button type="button" className="tv-btn ghost" onClick={onCancel}>Huỷ</button><button className="tv-btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu ảnh'}</button></div>
    </form>
  );
}

/* ---------- ngăn bên phải (điện thoại: tấm kéo từ dưới lên) ---------- */
function Panel({ prov, photos, note, canEdit, onClose, onView, onSavePhoto, onDelete, onSaveNote }) {
  const ref = useRef(null);
  const [form, setForm] = useState(null);
  const [editNote, setEditNote] = useState(false);
  const [noteText, setNoteText] = useState(note || '');
  const { lenis } = useDiary() || {};
  useEffect(() => { setForm(null); setEditNote(false); setNoteText(note || ''); }, [prov.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    lenis?.current?.stop();
    if (!reduced()) {
      const mob = window.innerWidth < 760;
      gsap.fromTo(ref.current.querySelector('.tv-sheet'), mob ? { yPercent: 100 } : { xPercent: 105 }, { yPercent: 0, xPercent: 0, duration: 0.5, ease: 'power3.out' });
    }
    return () => lenis?.current?.start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (reduced()) return;
    gsap.fromTo(ref.current.querySelectorAll('.tv-ph'), { y: 24, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.05, ease: 'back.out(1.6)', clearProps: 'transform,opacity' });
  }, [prov.id, photos.length]);
  return createPortal(
    <div className="tv-wrap" ref={ref}>
      <div className="tv-bg" onClick={onClose} />
      <aside className="tv-sheet" role="dialog" aria-label={prov.name}>
        <header className="tv-head">
          <div><small>{photos.length ? `Đã đến · ${photos.length} ảnh` : 'Chưa có ảnh'}</small><h2>{prov.name}</h2></div>
          <button className="tv-x2" onClick={onClose} aria-label="Đóng">✕</button>
        </header>
        <div className="tv-body" data-lenis-prevent>
          {editNote ? (
            <div className="tv-note-ed">
              <textarea rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Vài dòng về nơi này…" />
              <div className="tv-row"><button className="tv-btn ghost" onClick={() => setEditNote(false)}>Huỷ</button><button className="tv-btn" onClick={async () => { if (await onSaveNote(noteText)) setEditNote(false); }}>Lưu ghi chú</button></div>
            </div>
          ) : (note || canEdit) && (
            <p className="tv-note">{note || <i>Chưa có ghi chú cho nơi này.</i>}{canEdit && <button className="tv-link" onClick={() => setEditNote(true)}>✎ Sửa ghi chú</button>}</p>
          )}
          {form ? (
            <PhotoForm init={form} onCancel={() => setForm(null)} onSave={async (v, f) => { await onSavePhoto(v, f); setForm(null); }} />
          ) : (
            <>
              {canEdit && <button className="tv-btn add" onClick={() => setForm(BLANK(prov.id))}>＋ Thêm ảnh ở {prov.name}</button>}
              {photos.length ? (
                <div className="tv-grid">
                  {photos.map((p, k) => (
                    <figure key={p.id} className="tv-ph">
                      <button className="tv-pic" onClick={() => onView(k)} aria-label={`Xem ảnh: ${p.title}`}><img src={asset(p.image)} alt={p.title} loading="lazy" /></button>
                      <figcaption><b>{p.title}</b><small>{[p.place, p.date].filter(Boolean).join(' · ')}</small></figcaption>
                      {canEdit && <span className="tv-act"><button onClick={() => setForm(p)} aria-label="Sửa ảnh">✎</button><button onClick={() => onDelete(p)} aria-label="Xoá ảnh">🗑</button></span>}
                    </figure>
                  ))}
                </div>
              ) : <p className="tv-empty">🧭 Chưa có chuyến đi nào tới {prov.name}. Hẹn một ngày gần nhất!</p>}
            </>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export default function TravelPage() {
  const root = useRef(null);
  const svgRef = useRef(null);
  const ed = useEditable(travelData, 'travel');
  const notes = useEditableDoc(notesData, 'travelnotes');
  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [view, setView] = useState(null);
  const [q, setQ] = useState('');
  const zoom = useZoom(svgRef);
  const byProv = useMemo(() => { const m = {}; ed.items.forEach((p) => { (m[p.province] = m[p.province] || []).push(p); }); return m; }, [ed.items]);
  const visited = MAP.provinces.filter((p) => byProv[p.id]?.length);
  const photos = sel ? byProv[sel] || [] : [];
  const prov = sel ? BY_ID[sel] : null;

  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('.tv-stats > *', { y: 20, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(2)', delay: 0.15 });
      gsap.fromTo('.tv-map .pv', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5, stagger: { each: 0.012, from: 'random' }, ease: 'back.out(1.6)', delay: 0.2, clearProps: 'transform,opacity' });
      gsap.from('.tv-arch, .tv-isl', { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.6, stagger: 0.06, ease: 'back.out(2)', delay: 1 });
      gsap.from('.tv-pin', { y: -30, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'bounce.out', delay: 1.3 });
    }, root);
    return () => ctx.revert();
  }, []);

  const savePhoto = async (v, file) => {
    let image = v.image;
    if (file) image = ed.demo ? URL.createObjectURL(file) : await uploadImage(file, v.title || 'du-lich');
    const item = { ...v, image, id: v.id || newId() };
    const next = v.id ? ed.items.map((x) => (x.id === v.id ? item : x)) : [item, ...ed.items];
    if (!(await ed.save(next))) throw new Error(ed.status.error || 'Chưa lưu được, thử lại nhé');
  };
  const del = async (p) => { if (!window.confirm(`Xoá ảnh "${p.title}"?`)) return; await ed.save(ed.items.filter((x) => x.id !== p.id)); };
  const saveNote = (text) => notes.save({ ...(notes.doc || {}), [sel]: text });
  const pick = (id) => { setSel(id); };
  const list = MAP.provinces.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const tip = hover ? BY_ID[hover] : null;
  const vbStr = `${zoom.vb.x} ${zoom.vb.y} ${zoom.vb.w} ${zoom.vb.h}`;

  return (
    <div className="tv" ref={root}>
      <div className="tv-stats">
        <span className="tv-stat"><b>{visited.length}</b>/63<small>tỉnh thành đã đến</small></span>
        <span className="tv-stat"><b>{ed.items.length}</b><small>tấm ảnh</small></span>
        <span className="tv-legend" aria-hidden="true"><i className="l0" />chưa đến<i className="l1" />1–2 ảnh<i className="l2" />3–5<i className="l3" />6+</span>
      </div>

      <div className="tv-stage">
        <div className="tv-mapbox">
          <svg ref={svgRef} className="tv-map" viewBox={vbStr} style={{ touchAction: zoom.vb.w < MAP.w - 1 ? 'none' : 'pan-y' }} role="img" aria-label="Bản đồ Việt Nam 63 tỉnh thành, có quần đảo Hoàng Sa và Trường Sa">
            <defs>
              <pattern id="tv-sea" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 9 Q 4.5 5 9 9 T 18 9" fill="none" stroke="rgba(80,130,200,0.18)" strokeWidth="1.2" /></pattern>
            </defs>
            <rect x={-MAP.w} y={-MAP.h} width={MAP.w * 3} height={MAP.h * 3} fill="url(#tv-sea)" />
            {MAP.archipelagos.map((a) => (
              <g key={a.name} className="tv-arch">
                <circle cx={a.xy[0]} cy={a.xy[1]} r={a.r} />
                {a.dots.map(([x, y], k) => <circle key={k} className="dot" cx={x} cy={y} r="3.2" />)}
                <text x={a.xy[0]} y={a.xy[1] + a.r + 18} textAnchor="middle">{a.name}</text>
              </g>
            ))}
            {MAP.provinces.map((p) => {
              const n = byProv[p.id]?.length || 0;
              return (
                <path key={p.id} d={p.d} className={`pv l${level(n)} ${sel === p.id ? 'on' : ''} ${hover === p.id ? 'hov' : ''}`}
                  onPointerEnter={() => setHover(p.id)} onPointerLeave={() => setHover((h) => (h === p.id ? null : h))}
                  onClick={() => { if (svgRef.current?.dataset.drag) return; pick(p.id); }}
                  tabIndex={0} role="button" aria-label={`${p.name}${n ? `, ${n} ảnh` : ''}`} onKeyDown={(e) => e.key === 'Enter' && pick(p.id)} />
              );
            })}
            {MAP.islands.map((s) => (
              <g key={s.name} className="tv-isl"><circle cx={s.xy[0]} cy={s.xy[1]} r="2.6" /><text x={s.xy[0] + 6} y={s.xy[1] + 4}>{s.name}</text></g>
            ))}
            {visited.map((p) => <text key={p.id} className="tv-pin" x={p.cx} y={p.cy} textAnchor="middle">📍</text>)}
          </svg>
          <div className="tv-zoom">
            <button onClick={zoom.zoomIn} aria-label="Phóng to">＋</button>
            <button onClick={zoom.zoomOut} aria-label="Thu nhỏ">－</button>
            <button onClick={zoom.reset} aria-label="Xem toàn bộ">⤢</button>
          </div>
          {tip && <div className="tv-tip" aria-hidden="true"><b>{tip.name}</b><small>{byProv[tip.id]?.length ? `${byProv[tip.id].length} ảnh · bấm để xem` : 'chưa có ảnh'}</small></div>}
        </div>

        <aside className="tv-side">
          <h3>Những nơi đã đến</h3>
          {visited.length ? (
            <ul className="tv-visited">
              {visited.map((p) => <li key={p.id}><button onClick={() => { pick(p.id); zoom.focus(p); }}><b>{p.name}</b><small>{byProv[p.id].length} ảnh</small></button></li>)}
            </ul>
          ) : <p className="tv-empty">Chưa có chuyến đi nào được ghi lại.</p>}
          <h3>Tìm tỉnh thành</h3>
          <input className="tv-search" placeholder="Nhập tên tỉnh…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="tv-chips">{list.map((p) => <button key={p.id} className={byProv[p.id]?.length ? 'v' : ''} onClick={() => { pick(p.id); zoom.focus(p); }}>{p.name}</button>)}</div>
        </aside>
      </div>
      <p className="tv-hint">Bấm vào một tỉnh để xem ảnh. Phóng to bằng nút ＋ (hoặc Ctrl + lăn chuột trên máy tính), phóng to rồi kéo để di chuyển.</p>
      <p className="tv-src">Bản đồ 63 tỉnh thành trước khi sắp xếp lại năm 2025 · ranh giới: geoBoundaries (Public Domain) · Quần đảo Hoàng Sa và Trường Sa là của Việt Nam.</p>

      {prov && (
        <Panel prov={prov} photos={photos} note={(notes.doc || {})[prov.id]} canEdit={ed.canEdit}
          onClose={() => setSel(null)} onView={(k) => setView(k)} onSavePhoto={savePhoto} onDelete={del} onSaveNote={saveNote} />
      )}
      {prov && view != null && photos[view] && <Viewer list={photos} at={view} onClose={() => setView(null)} />}
    </div>
  );
}
