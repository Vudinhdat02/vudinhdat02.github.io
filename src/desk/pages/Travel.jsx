/*
 * Trang "Du lịch": bản đồ thế giới toàn màn hình, Việt Nam ở giữa với 63 tỉnh thành (trước khi sắp xếp năm 2025),
 * quần đảo Hoàng Sa, Trường Sa và các đảo lớn. Nơi đã đến (tỉnh thành hoặc quốc gia) được tô màu đậm dần theo số ảnh;
 * bấm vào để xem ảnh và ghi chú.
 *  - Bản đồ thế giới: src/data/worldmap.json, tạo bằng scripts/tao-ban-do-the-gioi.cjs từ Natural Earth 1:110m (Public Domain).
 *  - Bản đồ: src/data/vnmap.json, tạo bằng scripts/tao-ban-do-viet-nam.cjs từ geoBoundaries VNM ADM1 (Public Domain).
 *  - Ảnh: src/data/travel.json  [{ id, province, image, title, date, place, desc }]  (province = mã tỉnh, hoặc "qg:<ISO>" cho quốc gia)
 *  - Ghi chú từng tỉnh: src/data/travelnotes.json  { <mã tỉnh>: "ghi chú" }
 *  - Sửa (thêm / sửa / xoá ảnh, ghi chú): chạy npm run dev trên máy, hoặc đăng nhập #admin trên web thật.
 * Trang này không phát âm thanh.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MAP from '../../data/vnmap.json';
import WORLD from '../../data/worldmap.json';
import travelData from '../../data/travel.json';
import notesData from '../../data/travelnotes.json';
import { asset } from '../../utils/asset';
import { looksLikeImage, toWebImage } from '../../utils/image';
import { newId, uploadImage } from '../../admin/adminApi';
import { useEditable, useEditableDoc } from '../Editor';
import { useDiary } from '../Diary';
import { reduced } from '../Fx';

gsap.registerPlugin(ScrollTrigger);
const level = (n) => (n >= 6 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);
const BLANK = (province) => ({ id: '', province, image: '', title: '', date: '', place: '', desc: '' });

/* ---------- khung nhìn bản đồ: tâm (cx, cy) + tỉ lệ s (đơn vị bản đồ / 1 điểm ảnh) ----------
 *  Kéo để di chuyển, chụm hai ngón hoặc Ctrl + lăn chuột (hay chụm trên bàn di chuột) để phóng to / thu nhỏ;
 *  lăn chuột bình thường vẫn cuộn trang (không giữ trang lại). */
const VN_BOX = [0, 0, MAP.w, MAP.h];
const WB = WORLD.bounds; // [minX, minY, maxX, maxY]
function useMapView(boxRef) {
  const [size, setSize] = useState({ w: 1200, h: 700 });
  const [v, setV] = useState(null); // { cx, cy, s }
  const vRef = useRef(null); vRef.current = v;
  const fit = (b, sz = size, pad = 1.1) => ({ cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, s: Math.max((b[2] - b[0]) / sz.w, (b[3] - b[1]) / sz.h) * pad });
  const limits = (sz) => ({ min: 0.08, max: Math.max((WB[2] - WB[0]) / sz.w, (WB[3] - WB[1]) / sz.h) * 1.05 });
  const clamp = (x, sz = size) => {
    const L = limits(sz), s = Math.min(L.max, Math.max(L.min, x.s));
    return { s, cx: Math.min(WB[2], Math.max(WB[0], x.cx)), cy: Math.min(WB[3], Math.max(WB[1], x.cy)) };
  };
  useLayoutEffect(() => {
    const el = boxRef.current; if (!el) return undefined;
    const measure = () => { const r = el.getBoundingClientRect(); const sz = { w: Math.max(200, r.width), h: Math.max(200, r.height) }; setSize(sz); setV((o) => o || fit(VN_BOX, sz, window.innerWidth < 760 ? 1.02 : 1.12)); };
    measure(); const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const tween = useRef(null);
  const animateTo = (to) => {
    const from = vRef.current; if (!from) return;
    const t = clamp(to); tween.current?.kill();
    if (reduced()) { setV(t); return; }
    const o = { ...from };
    tween.current = gsap.to(o, { cx: t.cx, cy: t.cy, s: t.s, duration: 0.9, ease: 'power3.inOut', onUpdate: () => setV({ ...o }) });
  };
  useEffect(() => {
    const el = boxRef.current; if (!el) return undefined;
    const pts = new Map(); let moved = 0;
    const toMap = (clientX, clientY, cur) => { const r = el.getBoundingClientRect(); return [cur.cx + (clientX - r.left - r.width / 2) * cur.s, cur.cy + (clientY - r.top - r.height / 2) * cur.s]; };
    const zoomAround = (cur, k, clientX, clientY) => { const [px, py] = toMap(clientX, clientY, cur); const s2 = cur.s / k; return clamp({ s: s2, cx: px - (px - cur.cx) * (s2 / cur.s), cy: py - (py - cur.cy) * (s2 / cur.s) }); };
    const down = (e) => { if (e.target.closest('.tvw-ui')) return; tween.current?.kill(); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; el.classList.add('grab'); };
    const move = (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId), cur = { x: e.clientX, y: e.clientY };
      if (pts.size >= 2) {
        const others = [...pts.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p)[0];
        const d0 = Math.hypot(prev.x - others.x, prev.y - others.y), d1 = Math.hypot(cur.x - others.x, cur.y - others.y);
        if (d0 > 0) setV((o) => zoomAround(o, d1 / d0, (cur.x + others.x) / 2, (cur.y + others.y) / 2));
      } else {
        const dx = cur.x - prev.x, dy = cur.y - prev.y; moved += Math.abs(dx) + Math.abs(dy);
        setV((o) => clamp({ ...o, cx: o.cx - dx * o.s, cy: o.cy - dy * o.s }));
      }
      pts.set(e.pointerId, cur);
    };
    const up = (e) => { pts.delete(e.pointerId); if (!pts.size) el.classList.remove('grab'); if (moved > 8) { el.dataset.drag = '1'; setTimeout(() => { delete el.dataset.drag; }, 0); } };
    const wheel = (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); tween.current?.kill(); setV((o) => zoomAround(o, Math.exp(-e.deltaY * 0.004), e.clientX, e.clientY)); };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); };
  }, [size]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    v, size,
    zoom: (k) => v && animateTo({ ...v, s: v.s / k }),
    home: () => animateTo(fit(VN_BOX, size, window.innerWidth < 760 ? 1.02 : 1.12)),
    world: () => animateTo(fit(WB, size, 1.02)),
    focus: (p, kind) => animateTo({ cx: p.cx, cy: p.cy, s: kind === 'country' ? Math.max(1.2, (v?.s || 1)) : Math.min(0.45, v?.s || 1) }),
  };
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

/* nơi chốn: 63 tỉnh thành (mã tỉnh) + các nước khác (mã "qg:<ISO>") */
const PLACES = {};
MAP.provinces.forEach((p) => { PLACES[p.id] = { ...p, kind: 'province' }; });
WORLD.countries.forEach((c) => { PLACES['qg:' + c.id] = { id: 'qg:' + c.id, name: c.name, cx: c.cx, cy: c.cy, kind: 'country' }; });
const NEAR = new Set(['CHN', 'LAO', 'KHM', 'THA', 'MMR', 'PHL', 'MYS', 'IDN', 'JPN', 'KOR', 'PRK', 'IND', 'TWN', 'BRN', 'SGP', 'BGD', 'AUS', 'MNG', 'NPL']);
/* đường kinh tuyến / vĩ tuyến mỗi 15° (cùng phép chiếu với bản đồ) */
const O = MAP.origin;
const PX = (lon, lat) => [(lon - O.lon0) * O.k * O.cos + O.dx, (O.lat1 - lat) * O.k + O.dy];
const GRATICULE = (() => {
  let d = '';
  for (let lon = -30; lon <= 330; lon += 15) { const [x1, y1] = PX(lon, 80), [, y2] = PX(lon, -60); d += `M${x1.toFixed(0)} ${y1.toFixed(0)}V${y2.toFixed(0)}`; }
  for (let lat = -60; lat <= 75; lat += 15) { const [x1, y] = PX(-30, lat), [x2] = PX(330, lat); d += `M${x1.toFixed(0)} ${y.toFixed(0)}H${x2.toFixed(0)}`; }
  return d;
})();
const SEAS = [['Biển Đông', 113.5, 14.2], ['Thái Bình Dương', 160, 18], ['Ấn Độ Dương', 80, -12], ['Đại Tây Dương', 330, 20]].map(([n, lon, lat]) => ({ n, xy: PX(lon, lat) }));

export default function TravelPage() {
  const root = useRef(null);
  const boxRef = useRef(null);
  const ed = useEditable(travelData, 'travel');
  const notes = useEditableDoc(notesData, 'travelnotes');
  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null); // { id, x, y }
  const [view, setView] = useState(null);
  const [q, setQ] = useState('');
  const [listOpen, setListOpen] = useState(() => window.innerWidth >= 900);
  const map = useMapView(boxRef);
  const byPlace = useMemo(() => { const m = {}; ed.items.forEach((p) => { (m[p.province] = m[p.province] || []).push(p); }); return m; }, [ed.items]);
  const visitedProv = MAP.provinces.filter((p) => byPlace[p.id]?.length);
  const visitedCountries = WORLD.countries.filter((c) => byPlace['qg:' + c.id]?.length);
  const photos = sel ? byPlace[sel] || [] : [];
  const place = sel ? PLACES[sel] : null;
  const v = map.v;
  const s = v?.s || 1;
  const vb = v ? `${v.cx - (map.size.w * s) / 2} ${v.cy - (map.size.h * s) / 2} ${map.size.w * s} ${map.size.h * s}` : `0 0 ${MAP.w} ${MAP.h}`;
  const px = (n) => n * s; // kích thước theo điểm ảnh màn hình, đổi ra đơn vị bản đồ

  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('.tvw-ui > *', { y: 20, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(2)', delay: 0.3, clearProps: 'transform,opacity' });
      gsap.fromTo('.tvw .pv', { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: { each: 0.01, from: 'random' }, delay: 0.2, clearProps: 'opacity' });
      gsap.from('.tvw-world', { opacity: 0, duration: 1.2, ease: 'power2.out' });
    }, root);
    return () => ctx.revert();
  }, []);

  const savePhoto = async (val, file) => {
    let image = val.image;
    if (file) image = ed.demo ? URL.createObjectURL(file) : await uploadImage(file, val.title || 'du-lich');
    const item = { ...val, image, id: val.id || newId() };
    const next = val.id ? ed.items.map((x) => (x.id === val.id ? item : x)) : [item, ...ed.items];
    if (!(await ed.save(next))) throw new Error(ed.status.error || 'Chưa lưu được, thử lại nhé');
  };
  const del = async (p) => { if (!window.confirm(`Xoá ảnh "${p.title}"?`)) return; await ed.save(ed.items.filter((x) => x.id !== p.id)); };
  const saveNote = (text) => notes.save({ ...(notes.doc || {}), [sel]: text });
  const open = (id) => { if (boxRef.current?.dataset.drag) return; setSel(id); };
  const goTo = (id) => { const p = PLACES[id]; if (!p) return; map.focus(p, p.kind); setSel(id); if (window.innerWidth < 900) setListOpen(false); };
  const tipAt = (e, id) => { const r = boxRef.current.getBoundingClientRect(); setHover({ id, x: e.clientX - r.left, y: e.clientY - r.top }); };
  const tip = hover ? PLACES[hover.id] : null;
  const found = Object.values(PLACES).filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const showProvLabels = s < 0.35;
  const labelCountries = WORLD.countries.filter((c) => (NEAR.has(c.id) && s < 9) || (c.big && s > 2.5));

  return (
    <div className="tv tvw" ref={root}>
      <div className="tvw-box" ref={boxRef}>
        <svg className="tvw-map" viewBox={vb} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Bản đồ thế giới, Việt Nam ở giữa với 63 tỉnh thành và quần đảo Hoàng Sa, Trường Sa">
          <path className="tvw-grat" d={GRATICULE} />
          {SEAS.map((x) => <text key={x.n} className="tvw-sea" x={x.xy[0]} y={x.xy[1]} fontSize={px(15)} textAnchor="middle">{x.n}</text>)}
          <g className="tvw-world">
            {WORLD.countries.map((c) => {
              const id = 'qg:' + c.id, n = byPlace[id]?.length || 0;
              return <path key={c.id} d={c.d} className={`ct l${level(n)} ${sel === id ? 'on' : ''} ${hover?.id === id ? 'hov' : ''}`}
                onPointerMove={(e) => tipAt(e, id)} onPointerLeave={() => setHover(null)} onClick={() => open(id)} />;
            })}
          </g>
          <g className="tvw-vn">
            {MAP.provinces.map((p) => {
              const n = byPlace[p.id]?.length || 0;
              return <path key={p.id} d={p.d} className={`pv l${level(n)} ${sel === p.id ? 'on' : ''} ${hover?.id === p.id ? 'hov' : ''}`}
                onPointerMove={(e) => tipAt(e, p.id)} onPointerLeave={() => setHover(null)} onClick={() => open(p.id)}
                tabIndex={0} role="button" aria-label={`${p.name}${n ? `, ${n} ảnh` : ''}`} onKeyDown={(e) => e.key === 'Enter' && setSel(p.id)} />;
            })}
          </g>
          {MAP.archipelagos.map((a) => (
            <g key={a.name} className="tv-arch">
              <circle cx={a.xy[0]} cy={a.xy[1]} r={a.r} />
              {a.dots.map(([x, y], k) => <circle key={k} className="dot" cx={x} cy={y} r={px(2.8)} />)}
              {s < 4 && <text x={a.xy[0]} y={a.xy[1] + a.r + px(16)} fontSize={px(13)} textAnchor="middle">{a.name}</text>}
            </g>
          ))}
          {s < 3 && MAP.islands.map((x) => <g key={x.name} className="tv-isl"><circle cx={x.xy[0]} cy={x.xy[1]} r={px(2.4)} /><text x={x.xy[0] + px(6)} y={x.xy[1] + px(4)} fontSize={px(11)}>{x.name}</text></g>)}
          {labelCountries.map((c) => <text key={c.id} className="tvw-cl" x={c.cx} y={c.cy} fontSize={px(12)} textAnchor="middle">{c.name}</text>)}
          {showProvLabels && MAP.provinces.map((p) => <text key={p.id} className="tvw-pl" x={p.cx} y={p.cy} fontSize={px(10)} textAnchor="middle">{p.name}</text>)}
          {[...visitedProv, ...visitedCountries.map((c) => PLACES['qg:' + c.id])].map((p) => <text key={p.id} className="tv-pin" x={p.cx} y={p.cy} fontSize={px(22)} textAnchor="middle">📍</text>)}
        </svg>

        {tip && hover && <div className="tv-tip tvw-tip" style={{ left: hover.x + 14, top: hover.y + 14 }} aria-hidden="true"><b>{tip.name}</b><small>{byPlace[tip.id]?.length ? `${byPlace[tip.id].length} ảnh · bấm để xem` : tip.kind === 'country' ? 'chưa có ảnh' : 'chưa có ảnh'}</small></div>}

        <div className="tvw-ui">
          <div className="tvw-glass tvw-stats">
            <span><b>{visitedProv.length}<em>/63</em></b><small>tỉnh thành</small></span>
            <span><b>{visitedCountries.length}</b><small>quốc gia khác</small></span>
            <span><b>{ed.items.length}</b><small>tấm ảnh</small></span>
          </div>
          <div className="tvw-ctrl">
            <button onClick={() => map.zoom(1.6)} aria-label="Phóng to">＋</button>
            <button onClick={() => map.zoom(1 / 1.6)} aria-label="Thu nhỏ">－</button>
            <button onClick={map.home} aria-label="Về Việt Nam" title="Về Việt Nam" className="vn">VN</button>
            <button onClick={map.world} aria-label="Xem cả thế giới" title="Cả thế giới">🌏</button>
          </div>
          <div className={`tvw-glass tvw-list ${listOpen ? 'open' : ''}`}>
            <button className="tvw-list-t" onClick={() => setListOpen(!listOpen)} aria-expanded={listOpen}>🧭 Những nơi đã đến <b>{visitedProv.length + visitedCountries.length}</b><i>{listOpen ? '▾' : '▸'}</i></button>
            {listOpen && (
              <div className="tvw-list-b" data-lenis-prevent>
                <ul className="tv-visited">
                  {[...visitedProv, ...visitedCountries.map((c) => PLACES['qg:' + c.id])].map((p) => <li key={p.id}><button onClick={() => goTo(p.id)}><b>{p.kind === 'country' ? '🌐 ' : ''}{p.name}</b><small>{byPlace[p.id].length} ảnh</small></button></li>)}
                </ul>
                <input className="tv-search" placeholder="Tìm tỉnh thành, quốc gia…" value={q} onChange={(e) => setQ(e.target.value)} />
                {q && <div className="tv-chips">{found.slice(0, 40).map((p) => <button key={p.id} className={byPlace[p.id]?.length ? 'v' : ''} onClick={() => goTo(p.id)}>{p.kind === 'country' ? '🌐 ' : ''}{p.name}</button>)}</div>}
              </div>
            )}
          </div>
          <div className="tvw-glass tvw-legend" aria-hidden="true"><i className="l0" />chưa đến<i className="l1" />1–2 ảnh<i className="l2" />3–5<i className="l3" />6+</div>
        </div>
      </div>

      {place && (
        <Panel prov={place} photos={photos} note={(notes.doc || {})[place.id]} canEdit={ed.canEdit}
          onClose={() => setSel(null)} onView={(k) => setView(k)} onSavePhoto={savePhoto} onDelete={del} onSaveNote={saveNote} />
      )}
      {place && view != null && photos[view] && <Viewer list={photos} at={view} onClose={() => setView(null)} />}
    </div>
  );
}
