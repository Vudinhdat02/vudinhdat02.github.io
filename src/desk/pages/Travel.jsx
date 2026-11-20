/*
 * Trang "Du lịch": hai chế độ bản đồ.
 *  - Việt Nam (mặc định): 63 tỉnh thành (trước khi sắp xếp năm 2025), quần đảo Hoàng Sa, Trường Sa và các đảo lớn.
 *    Dữ liệu: src/data/vnmap.json, tạo bằng scripts/tao-ban-do-viet-nam.cjs từ geoBoundaries VNM ADM1 (Public Domain).
 *  - Toàn cầu: thế giới, tô các nước đã đến; bấm vào một nước để xem bản đồ tỉnh / bang của nước đó.
 *    Dữ liệu: public/maps/world.json và public/maps/adm1/<ISO3>.json (chỉ tải khi cần),
 *    tạo bằng scripts/tao-ban-do-the-gioi.cjs từ Natural Earth (Public Domain).
 *  Bấm một tỉnh / bang để xem ảnh và ghi chú; ở chế độ quản trị (npm run dev hoặc #admin) thêm / sửa / xoá được.
 *  - Ảnh: src/data/travel.json  [{ id, province, image, title, date, place, desc }]
 *  - Ghi chú: src/data/travelnotes.json  { <mã nơi chốn>: "ghi chú" }
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
const level = (n) => (n >= 6 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);
const BLANK = (province) => ({ id: '', province, image: '', title: '', date: '', place: '', desc: '' });

/* ---------- khung nhìn bản đồ: kéo để di chuyển, nút ＋/－, chụm hai ngón hoặc Ctrl + lăn chuột để phóng to ---------- */
function useZoom(svgRef, W, H, maxZoom = 8) {
  const [vb, setVb] = useState({ x: 0, y: 0, w: W, h: H });
  useEffect(() => { setVb({ x: 0, y: 0, w: W, h: H }); }, [W, H]);
  const dims = useRef({ W, H }); dims.current = { W, H };
  const clamp = (v) => {
    const { W: w0, H: h0 } = dims.current;
    const w = Math.min(w0, Math.max(w0 / maxZoom, v.w)), h = (w / w0) * h0;
    if (w >= w0 - 0.5) return { w: w0, h: h0, x: 0, y: 0 };
    return { w, h, x: Math.min(w0 - w, Math.max(0, v.x)), y: Math.min(h0 - h, Math.max(0, v.y)) };
  };
  const tw = useRef(null);
  const animate = (to) => {
    const t = clamp(to); tw.current?.kill();
    if (reduced()) { setVb(t); return; }
    const o = { ...vb };
    tw.current = gsap.to(o, { ...t, duration: 0.7, ease: 'power3.inOut', onUpdate: () => setVb({ ...o }) });
  };
  // phóng to / thu nhỏ quanh tâm đang xem; thu nhỏ hết cỡ thì về đúng khung mặc định (không bị lệch)
  const zoomAt = (k) => {
    const { W: w0, H: h0 } = dims.current;
    const w = Math.min(w0, Math.max(w0 / maxZoom, vb.w / k)), h = (w / w0) * h0;
    if (w >= w0 - 0.5) { animate({ x: 0, y: 0, w: w0, h: h0 }); return; }
    const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
    animate({ w, h, x: cx - w / 2, y: cy - h / 2 });
  };
  useEffect(() => {
    const el = svgRef.current; if (!el) return undefined;
    const pts = new Map(); let start = null;
    const toMap = (e, v) => { const r = el.getBoundingClientRect(); return [v.x + ((e.clientX - r.left) / r.width) * v.w, v.y + ((e.clientY - r.top) / r.height) * v.h]; };
    const down = (e) => { tw.current?.kill(); pts.set(e.pointerId, e); if (pts.size === 1) start = { e, moved: false }; };
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
        if (v.w >= dims.current.W - 1) return v; // chưa phóng to thì không kéo (để cuộn trang bình thường)
        return clamp({ ...v, x: v.x - dx * sx, y: v.y - dy * sy });
      });
    };
    const up = (e) => { pts.delete(e.pointerId); if (start?.moved) el.dataset.drag = '1'; setTimeout(() => { delete el.dataset.drag; }, 0); if (!pts.size) start = null; };
    const wheel = (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); tw.current?.kill(); setVb((v) => { const [cx, cy] = toMap(e, v); const k = e.deltaY < 0 ? 1.2 : 1 / 1.2; return clamp({ w: v.w / k, h: v.h / k, x: cx - (cx - v.x) / k, y: cy - (cy - v.y) / k }); }); };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const s = vb.w / W; // tỉ lệ đang xem (1 = toàn bộ)
  return {
    vb, s, zoomed: vb.w < W - 1,
    zoomIn: () => zoomAt(1.6), zoomOut: () => zoomAt(1 / 1.6), reset: () => animate({ x: 0, y: 0, w: W, h: H }),
    focus: (p, k = 3) => animate({ w: W / k, h: H / k, x: p.cx - W / k / 2, y: p.cy - H / k / 2 }),
  };
}

/* ---------- tải bản đồ thế giới / tỉnh thành nước ngoài (chỉ tải khi cần, giữ lại để lần sau mở ngay) ---------- */
const cache = {};
function useMapFile(url) {
  const [data, setData] = useState(url ? cache[url] || null : null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!url) { setData(null); return undefined; }
    if (cache[url]) { setData(cache[url]); return undefined; }
    let alive = true; setData(null); setErr('');
    fetch(asset(url)).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((d) => { cache[url] = d; if (alive) setData(d); })
      .catch(() => alive && setErr('Không tải được bản đồ, thử lại sau nhé.'));
    return () => { alive = false; };
  }, [url]);
  return { data, err };
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

/* chú thích nổi ngay trên mũi chuột (gắn vào body để không bị khung bản đồ cắt), luôn nằm trong màn hình */
function CursorTip({ x, y, name, img, count, country }) {
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 160, h: img ? 150 : 52 });
  useLayoutEffect(() => { const r = ref.current?.getBoundingClientRect(); if (r && (Math.abs(r.width - box.w) > 1 || Math.abs(r.height - box.h) > 1)) setBox({ w: r.width, h: r.height }); });
  const vw = window.innerWidth, gap = 14;
  const left = Math.min(vw - box.w - 8, Math.max(8, x - box.w / 2));
  const above = y - box.h - gap >= 8;
  const top = above ? y - box.h - gap : y + gap + 10;
  return createPortal(
    <div ref={ref} className={`tv-ctip ${img ? 'has-img' : ''}`} style={{ left, top }} aria-hidden="true">
      {img && <img src={asset(img)} alt="" />}
      <b>{name}</b>
      <small>{count ? `${count} ảnh · bấm để xem` : country ? 'bấm để xem bản đồ chi tiết' : 'chưa có ảnh'}</small>
    </div>,
    document.body,
  );
}

/* màu đất liền các nước láng giềng: tông phấn tươi, hợp bảng màu của web, khác hẳn màu kem của các tỉnh Việt Nam */
const NB_COLORS = { CHN: '#fde2cf', LAO: '#d5f0e0', KHM: '#e7e0f8', THA: '#fdf0c2', MMR: '#d9eef7', PHL: '#fde2cf', MYS: '#e7e0f8', IDN: '#d5f0e0', BRN: '#fdf0c2', TWN: '#d5f0e0', IND: '#e7e0f8' };
const nbColor = (id) => NB_COLORS[id] || '#eef0d8';

/* biển sống động: thuyền buồm, hải âu, lấp lánh trên mặt nước (chỉ là hình trang trí, không bấm được) */
function SeaLife({ s }) {
  const route = (pts) => 'M' + pts.map(([lon, lat]) => VP(lon, lat).map((v) => v.toFixed(1)).join(' ')).join(' L');
  const boats = [
    { d: route([[109.6, 14.8], [111.2, 13.2], [112.6, 12.4], [111.0, 11.2], [109.6, 12.2], [109.6, 14.8]]), dur: '70s', ch: '⛵' },
    { d: route([[107.3, 20.2], [108.2, 19.3], [107.6, 18.4], [106.9, 19.4], [107.3, 20.2]]), dur: '48s', ch: '🚤' },
    { d: route([[104.0, 9.4], [103.2, 10.6], [102.6, 9.8], [103.4, 8.9], [104.0, 9.4]]), dur: '60s', ch: '⛵' },
  ];
  const gulls = [route([[108.9, 16.6], [110.4, 16.0], [111.6, 14.6]]), route([[106.6, 8.7], [108.0, 9.8], [109.5, 10.9]])];
  const sparks = [[110.6, 15.1], [112.8, 13.7], [108.9, 11.6], [110.0, 9.4], [113.6, 11.8], [107.9, 18.7], [103.6, 9.9], [114.5, 15.6]].map(([lon, lat]) => VP(lon, lat));
  return (
    <g className="sea-life" aria-hidden="true">
      {sparks.map(([x, y], k) => <circle key={k} className="spark" cx={x} cy={y} r={2.8 * s} style={{ animationDelay: `${k * 0.7}s` }} />)}
      {boats.map((b, k) => (
        <g key={k}><text className="boat" fontSize={24 * s} textAnchor="middle" dy={8 * s}>{b.ch}</text><animateMotion dur={b.dur} repeatCount="indefinite" path={b.d} /></g>
      ))}
      {gulls.map((d, k) => (
        <g key={'g' + k}><path className="gull" d={`M${-10 * s} 0 Q ${-5 * s} ${-6 * s} 0 0 Q ${5 * s} ${-6 * s} ${10 * s} 0`} /><animateMotion dur={`${26 + k * 9}s`} repeatCount="indefinite" path={d} begin={`${k * 4}s`} /></g>
      ))}
    </g>
  );
}

/* nhãn tên nước láng giềng và biển trên bản đồ Việt Nam (toạ độ theo bản đồ vnmap.json) */
const VP = (lon, lat) => { const o = MAP.origin; return [(lon - o.lon0) * o.k * o.cos + o.dx, (o.lat1 - lat) * o.k + o.dy]; };
const NB_LABEL = { CHN: VP(109.6, 22.9), LAO: VP(102.75, 19.85), KHM: VP(104.6, 12.9), THA: VP(102.75, 15.4) };
const SEA_LABELS = [
  { n: 'Biển Đông', xy: VP(111.3, 13.6), f: 22 },
  { n: 'Vịnh Bắc Bộ', xy: VP(107.4, 19.9), f: 13 },
  { n: 'Vịnh Thái Lan', xy: VP(102.9, 10.4), f: 13 },
];

/* mã nơi chốn trong travel.json:
 *   "<mã tỉnh VN>"          vd "ha-noi"
 *   "qg:<ISO3>"             cả một nước, vd "qg:JPN"
 *   "qg:<ISO3>:<mã vùng>"   một tỉnh / bang của nước đó, vd "qg:JPN:jpn-1860" */
const PAD = 14;
const isoOf = (key) => (key.startsWith('qg:') ? key.split(':')[1] : 'VNM');

export default function TravelPage() {
  const root = useRef(null);
  const svgRef = useRef(null);
  const ed = useEditable(travelData, 'travel');
  const notes = useEditableDoc(notesData, 'travelnotes');
  const [mode, setMode] = useState('vn'); // vn | world | country
  const [iso, setIso] = useState(null);
  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [view, setView] = useState(null);
  const [q, setQ] = useState('');
  const world = useMapFile(mode !== 'vn' ? '/maps/world.json' : null);
  const land = useMapFile(mode === 'country' && iso ? `/maps/adm1/${iso}.json` : null);
  const W0 = world.data ? world.data.bounds[2] - world.data.bounds[0] + PAD * 2 : 1000;
  const H0 = world.data ? world.data.bounds[3] - world.data.bounds[1] + PAD * 2 : 500;
  const dims = mode === 'vn' ? [MAP.w, MAP.h] : mode === 'world' ? [W0, H0] : land.data ? [land.data.w, land.data.h] : [1000, 700];
  const zoom = useZoom(svgRef, dims[0], dims[1], mode === 'world' ? 14 : 8);

  const byPlace = useMemo(() => { const m = {}; ed.items.forEach((p) => { (m[p.province] = m[p.province] || []).push(p); }); return m; }, [ed.items]);
  const countIso = useMemo(() => { const m = {}; ed.items.forEach((p) => { const k = isoOf(p.province); m[k] = (m[k] || 0) + 1; }); return m; }, [ed.items]);
  const countryName = (c) => (c === 'VNM' ? 'Việt Nam' : world.data?.countries.find((x) => x.id === c)?.name || c);
  const nameOf = (key) => {
    if (!key.startsWith('qg:')) return MAP.provinces.find((p) => p.id === key)?.name || key;
    const [, c, r] = key.split(':');
    if (!r) return countryName(c);
    const reg = land.data?.iso === c ? land.data.regions.find((x) => x.id === r) : null;
    return `${reg ? reg.name : r} · ${countryName(c)}`;
  };
  const visitedProv = MAP.provinces.filter((p) => byPlace[p.id]?.length);
  const visitedIso = Object.keys(countIso).filter((c) => c !== 'VNM');
  const photos = sel ? byPlace[sel] || [] : [];
  const place = sel ? { id: sel, name: nameOf(sel) } : null;

  /* hiệu ứng khi đổi chế độ: các vùng hiện dần */
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo('.tv-map .rg', { opacity: 0 }, { opacity: 1, duration: 0.45, stagger: { each: mode === 'world' ? 0.002 : 0.008, from: 'random' }, ease: 'power1.out', clearProps: 'opacity' });
      gsap.from('.tv-pin', { y: -20, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'bounce.out', delay: 0.4 });
    }, root);
    return () => ctx.revert();
  }, [mode, iso, !!world.data, !!land.data]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => { gsap.from('.tv-stats > *, .tv-modes > *', { y: 20, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'back.out(2)', delay: 0.15 }); }, root);
    return () => ctx.revert();
  }, []);

  /* điện thoại: mở bản đồ thế giới là phóng sẵn vào châu Á cho dễ nhìn */
  useEffect(() => {
    if (mode !== 'world' || !world.data || window.innerWidth >= 760) return;
    const vn = world.data.countries.find((c) => c.id === 'VNM');
    if (vn) setTimeout(() => zoom.focus({ cx: vn.cx + ox, cy: vn.cy + oy }, 3), 50);
  }, [mode, !!world.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const savePhoto = async (v, file) => {
    let image = v.image;
    if (file) image = ed.demo ? URL.createObjectURL(file) : await uploadImage(file, v.title || 'du-lich');
    const item = { ...v, image, id: v.id || newId() };
    const next = v.id ? ed.items.map((x) => (x.id === v.id ? item : x)) : [item, ...ed.items];
    if (!(await ed.save(next))) throw new Error(ed.status.error || 'Chưa lưu được, thử lại nhé');
  };
  const del = async (p) => { if (!window.confirm(`Xoá ảnh "${p.title}"?`)) return; await ed.save(ed.items.filter((x) => x.id !== p.id)); };
  const saveNote = (text) => notes.save({ ...(notes.doc || {}), [sel]: text });
  const pick = (key) => { if (svgRef.current?.dataset.drag) return; setSel(key); };
  const goMode = (m) => { setMode(m); setSel(null); setHover(null); setQ(''); if (m !== 'country') setIso(null); };
  const openCountry = (c) => { if (svgRef.current?.dataset.drag) return; if (c === 'VNM') { goMode('vn'); return; } setIso(c); setMode('country'); setSel(null); setHover(null); setQ(''); };
  const ox = world.data ? -world.data.bounds[0] + PAD : 0, oy = world.data ? -world.data.bounds[1] + PAD : 0;
  const vbStr = `${zoom.vb.x} ${zoom.vb.y} ${zoom.vb.w} ${zoom.vb.h}`;
  const u = zoom.vb.w / 760; // đơn vị bản đồ ứng với ~1 điểm ảnh (để chữ / ghim giữ cỡ khi phóng to)
  const tipText = hover ? (hover.kind === 'country' ? countryName(hover.id) : hover.kind === 'region' ? nameOf(hover.id) : nameOf(hover.id)) : '';
  const tipCount = hover ? (hover.kind === 'country' ? countIso[hover.id] || 0 : byPlace[hover.id]?.length || 0) : 0;

  /* chú thích đi theo con trỏ: ngay trên mũi chuột, có ảnh nhỏ đầu tiên của nơi đó (đúng tỉ lệ, không cắt) */
  const track = (e, id, kind) => { if (e.pointerType === 'touch') return; setHover({ id, kind, x: e.clientX, y: e.clientY }); };
  const thumbOf = (h) => { if (!h) return null; const list = h.kind === 'country' ? ed.items.filter((p) => isoOf(p.province) === h.id) : byPlace[h.id] || []; return list[0]?.image || null; };

  let svgBody = null, side = null, loading = '';
  if (mode === 'vn') {
    svgBody = (
      <>
        {(MAP.neighbors || []).map((c) => <path key={'f' + c.id} d={c.d} className="nb-fill" style={{ fill: nbColor(c.id), stroke: nbColor(c.id) }} />)}
        {(MAP.neighbors || []).map((c) => <path key={c.id} d={c.d} className="nb" style={{ fill: nbColor(c.id) }} />)}
        {!reduced() && <SeaLife s={Math.max(0.4, zoom.s)} />}
        {(MAP.neighbors || []).filter((c) => NB_LABEL[c.id]).map((c) => <text key={c.id} className="nb-name" x={NB_LABEL[c.id][0]} y={NB_LABEL[c.id][1]} fontSize={13 * Math.max(0.4, zoom.s)} textAnchor="middle">{c.name}</text>)}
        {SEA_LABELS.map((x) => <text key={x.n} className="sea-name" x={x.xy[0]} y={x.xy[1]} fontSize={x.f * Math.max(0.4, zoom.s)} textAnchor="middle">{x.n}</text>)}
        {MAP.provinces.map((p) => {
          const n = byPlace[p.id]?.length || 0;
          return <path key={p.id} d={p.d} className={`rg pv l${level(n)} ${sel === p.id ? 'on' : ''} ${hover?.id === p.id ? 'hov' : ''}`}
            onPointerMove={(e) => track(e, p.id, 'prov')} onPointerLeave={() => setHover(null)} onClick={() => pick(p.id)}
            tabIndex={0} role="button" aria-label={`${p.name}${n ? `, ${n} ảnh` : ''}`} onKeyDown={(e) => e.key === 'Enter' && setSel(p.id)} />;
        })}
        {MAP.archipelagos.map((a) => <text key={a.name} className="tv-arch-name" x={a.xy[0]} y={a.xy[1] + a.r * 0.55 + 12} fontSize={12 * Math.max(0.4, zoom.s)} textAnchor="middle">{a.name}</text>)}
        {MAP.islands.map((x) => <text key={x.name} className="tv-isl-name" x={x.xy[0] + 6} y={x.xy[1] + 4} fontSize={10.5 * Math.max(0.45, zoom.s)}>{x.name}</text>)}
        {visitedProv.map((p) => <text key={p.id} className="tv-pin" x={p.cx} y={p.cy} fontSize={20 * Math.max(0.35, zoom.s)} textAnchor="middle">📍</text>)}
      </>
    );
    const list = MAP.provinces.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
    side = (
      <>
        <h3>Những nơi đã đến</h3>
        {visitedProv.length ? <ul className="tv-visited">{visitedProv.map((p) => <li key={p.id}><button onClick={() => { setSel(p.id); zoom.focus(p); }}><b>{p.name}</b><small>{byPlace[p.id].length} ảnh</small></button></li>)}</ul>
          : <p className="tv-empty">Chưa có chuyến đi nào được ghi lại.</p>}
        <h3>Tìm tỉnh thành</h3>
        <input className="tv-search" placeholder="Nhập tên tỉnh…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="tv-chips">{list.map((p) => <button key={p.id} className={byPlace[p.id]?.length ? 'v' : ''} onClick={() => { setSel(p.id); zoom.focus(p); }}>{p.name}</button>)}</div>
      </>
    );
  } else if (mode === 'world') {
    if (!world.data) loading = world.err || 'Đang mở bản đồ thế giới…';
    else {
      const W = world.data;
      svgBody = (
        <g transform={`translate(${ox} ${oy})`}>
          {W.countries.map((c) => {
            const n = countIso[c.id] || 0;
            return <path key={c.id} d={c.d} className={`rg ct l${level(n)} ${c.id === 'VNM' ? 'vn' : ''} ${hover?.id === c.id ? 'hov' : ''}`}
              onPointerMove={(e) => track(e, c.id, 'country')} onPointerLeave={() => setHover(null)} onClick={() => openCountry(c.id)} />;
          })}
          {W.archipelagos.map((a) => (
            <g key={a.name} className="tv-arch w">
              {a.dots.map(([x, y], k) => <circle key={k} className="dot" cx={x} cy={y} r={2 * u} />)}
              {zoom.s < 0.35 && <text x={a.xy[0]} y={a.xy[1] + 40 * u} fontSize={11 * u} textAnchor="middle">{a.name}</text>}
            </g>
          ))}
          {['VNM', ...visitedIso].map((c) => { const k = W.countries.find((x) => x.id === c); return k ? <text key={c} className="tv-cname" x={k.cx} y={k.cy + 26 * u} fontSize={12 * u} textAnchor="middle">{k.name}</text> : null; })}
          {Object.keys(countIso).map((c) => { const k = W.countries.find((x) => x.id === c); return k ? <text key={c} className="tv-pin" x={k.cx} y={k.cy} fontSize={20 * u} textAnchor="middle">📍</text> : null; })}
        </g>
      );
      const list = W.countries.filter((c) => q && c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      side = (
        <>
          <h3>Các nước đã đến</h3>
          <ul className="tv-visited">
            <li><button onClick={() => goMode('vn')}><b><span className="vnf" aria-hidden="true">★</span> Việt Nam</b><small>{countIso.VNM || 0} ảnh</small></button></li>
            {visitedIso.map((c) => <li key={c}><button onClick={() => openCountry(c)}><b>{countryName(c)}</b><small>{countIso[c]} ảnh</small></button></li>)}
          </ul>
          {!visitedIso.length && <p className="tv-empty">Chưa có chuyến đi nước ngoài nào. Bấm vào một nước để xem bản đồ chi tiết và thêm ảnh.</p>}
          <h3>Tìm quốc gia</h3>
          <input className="tv-search" placeholder="Nhập tên nước…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="tv-chips">{list.slice(0, 40).map((c) => <button key={c.id} className={countIso[c.id] ? 'v' : ''} onClick={() => openCountry(c.id)}>{c.name}</button>)}</div>
        </>
      );
    }
  } else {
    if (!land.data) loading = land.err || 'Đang mở bản đồ tỉnh thành…';
    else {
      const L = land.data;
      const visitedR = L.regions.filter((r) => byPlace[`qg:${iso}:${r.id}`]?.length);
      svgBody = (
        <>
          {L.regions.map((r) => {
            const key = `qg:${iso}:${r.id}`, n = byPlace[key]?.length || 0;
            return <path key={r.id} d={r.d} className={`rg pv l${level(n)} ${sel === key ? 'on' : ''} ${hover?.id === key ? 'hov' : ''}`}
              onPointerMove={(e) => track(e, key, 'region')} onPointerLeave={() => setHover(null)} onClick={() => pick(key)}
              tabIndex={0} role="button" aria-label={`${r.name}${n ? `, ${n} ảnh` : ''}`} onKeyDown={(e) => e.key === 'Enter' && setSel(key)} />;
          })}
          {visitedR.map((r) => <text key={r.id} className="tv-pin" x={r.cx} y={r.cy} fontSize={20 * Math.max(0.35, zoom.s) * (L.w / 1000)} textAnchor="middle">📍</text>)}
        </>
      );
      const list = L.regions.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()));
      side = (
        <>
          <button className="tv-btn add" onClick={() => setSel(`qg:${iso}`)}>📷 Ảnh chung của {countryName(iso)} ({byPlace[`qg:${iso}`]?.length || 0})</button>
          <h3>Nơi đã đến ở {countryName(iso)}</h3>
          {visitedR.length ? <ul className="tv-visited">{visitedR.map((r) => <li key={r.id}><button onClick={() => { setSel(`qg:${iso}:${r.id}`); zoom.focus(r); }}><b>{r.name}</b><small>{byPlace[`qg:${iso}:${r.id}`].length} ảnh</small></button></li>)}</ul>
            : <p className="tv-empty">Chưa có ảnh ở tỉnh / bang nào của {countryName(iso)}.</p>}
          <h3>Tìm tỉnh / bang</h3>
          <input className="tv-search" placeholder="Nhập tên…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="tv-chips">{list.map((r) => <button key={r.id} className={byPlace[`qg:${iso}:${r.id}`]?.length ? 'v' : ''} onClick={() => { setSel(`qg:${iso}:${r.id}`); zoom.focus(r); }}>{r.name}</button>)}</div>
        </>
      );
    }
  }

  return (
    <div className={`tv tv8 m-${mode}`} ref={root}>
      <div className="tv-top">
        <div className="tv-modes" role="tablist" aria-label="Chọn bản đồ">
          <button role="tab" aria-selected={mode === 'vn'} className={mode === 'vn' ? 'on' : ''} onClick={() => goMode('vn')}><span className="vnf" aria-hidden="true">★</span> Việt Nam</button>
          <button role="tab" aria-selected={mode !== 'vn'} className={mode !== 'vn' ? 'on' : ''} onClick={() => goMode('world')}>🌏 Toàn cầu</button>
        </div>
        <div className="tv-stats">
          <span className="tv-stat"><b>{visitedProv.length}</b>/63<small>tỉnh thành</small></span>
          <span className="tv-stat"><b>{visitedIso.length}</b><small>nước ngoài</small></span>
          <span className="tv-stat"><b>{ed.items.length}</b><small>tấm ảnh</small></span>
        </div>
      </div>

      <div className="tv-stage">
        <div className="tv-mapbox" style={{ aspectRatio: `${dims[0]} / ${dims[1]}` }}>
          {mode === 'country' && (
            <div className="tv-crumb">
              <button onClick={() => goMode('world')}>← Toàn cầu</button>
              <b>{countryName(iso)}</b>
            </div>
          )}
          {loading && <p className="tv-loading">{loading}</p>}
          {(
            <svg ref={svgRef} className="tv-map" viewBox={vbStr} style={{ touchAction: zoom.zoomed ? 'none' : 'pan-y' }} role="img"
              aria-label={mode === 'vn' ? 'Bản đồ Việt Nam 63 tỉnh thành, có quần đảo Hoàng Sa và Trường Sa' : mode === 'world' ? 'Bản đồ thế giới' : `Bản đồ ${countryName(iso)}`}>
              <defs>
                <linearGradient id="tv-deep" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eef7ff" /><stop offset="1" stopColor="#d6ebfb" /></linearGradient>
                <pattern id="tv-sea" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 9 Q 4.5 5 9 9 T 18 9" fill="none" stroke="rgba(80,130,200,0.2)" strokeWidth="1.2" />
                  {!reduced() && <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="18 0" dur="7s" repeatCount="indefinite" />}</pattern>
                <pattern id="tv-sea2" width="46" height="30" patternUnits="userSpaceOnUse"><path d="M0 22 Q 11.5 16 23 22 T 46 22" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" />
                  {!reduced() && <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="-46 4" dur="11s" repeatCount="indefinite" />}</pattern>
              </defs>
              <rect x={-dims[0]} y={-dims[1]} width={dims[0] * 3} height={dims[1] * 3} fill="url(#tv-deep)" />
              <rect x={-dims[0]} y={-dims[1]} width={dims[0] * 3} height={dims[1] * 3} fill="url(#tv-sea)" />
              <rect className="tv-sea2" x={-dims[0]} y={-dims[1]} width={dims[0] * 3} height={dims[1] * 3} fill="url(#tv-sea2)" />
              {svgBody}
            </svg>
          )}
          <div className="tv-zoom">
            <button onClick={zoom.zoomIn} aria-label="Phóng to">＋</button>
            <button onClick={zoom.zoomOut} aria-label="Thu nhỏ">－</button>
            <button onClick={zoom.reset} aria-label="Xem toàn bộ">⤢</button>
          </div>
        </div>
        <aside className="tv-side">{side || <p className="tv-empty">…</p>}</aside>
      </div>

      {hover && hover.x != null && <CursorTip x={hover.x} y={hover.y} name={tipText} img={thumbOf(hover)} count={tipCount} country={hover.kind === 'country'} />}
      {place && (
        <Panel prov={place} photos={photos} note={(notes.doc || {})[place.id]} canEdit={ed.canEdit}
          onClose={() => setSel(null)} onView={(k) => setView(k)} onSavePhoto={savePhoto} onDelete={del} onSaveNote={saveNote} />
      )}
      {place && view != null && photos[view] && <Viewer list={photos} at={view} onClose={() => setView(null)} />}
    </div>
  );
}
