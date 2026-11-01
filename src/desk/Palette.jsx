/*
 * Tra mục lục (Ctrl+K hoặc phím /): gõ vài chữ để nhảy tới mục, dự án, thành tích hay bài nhật ký.
 * Gõ không dấu cũng tìm được ("nhat ky" → "Nhật ký").
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { thock } from './sound';

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export default function Palette({ items, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const ref = useRef(null);
  const list = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    const hit = items.filter((it) => { const hay = fold(`${it.label} ${it.hint || ''} ${it.group}`); return words.every((w) => hay.includes(w)); });
    return hit.slice(0, 40);
  }, [q, items]);
  useEffect(() => setSel(0), [q]);
  useLayoutEffect(() => {
    gsap.fromTo(ref.current.querySelector('.pl'), { y: -40, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.6)' });
  }, []);
  useEffect(() => { ref.current?.querySelector('.pl-item.on')?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  const run = (it) => { if (!it) return; onClose(); setTimeout(it.run, 60); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(list.length - 1, s + 1)); thock(1.4); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); thock(1.4); }
    else if (e.key === 'Enter') { e.preventDefault(); run(list[sel]); }
    else if (e.key === 'Escape') onClose();
  };

  let lastGroup = '';
  return (
    <div className="pl-wrap" ref={ref} role="dialog" aria-modal="true" aria-label="Tìm nhanh">
      <div className="bk-backdrop" onClick={onClose} />
      <div className="pl">
        <div className="pl-input"><span>⌕</span><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Tìm mục, dự án, thành tích, nhật ký…" /><kbd>Esc</kbd></div>
        <div className="pl-list">
          {!list.length && <p className="pl-empty">Không thấy gì cả… thử từ khác nhé ✎</p>}
          {list.map((it, i) => {
            const head = it.group !== lastGroup ? (lastGroup = it.group) : null;
            return (
              <div key={it.key}>
                {head && <p className="pl-group">{head}</p>}
                <button className={`pl-item ${i === sel ? 'on' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => run(it)}>
                  <span className="pl-ic">{it.icon}</span><span className="pl-l">{it.label}{it.hint && <small>{it.hint}</small>}</span><span className="pl-go">↵</span>
                </button>
              </div>
            );
          })}
        </div>
        <p className="pl-foot"><kbd>↑</kbd><kbd>↓</kbd> chọn · <kbd>↵</kbd> mở · gõ không dấu cũng được</p>
      </div>
    </div>
  );
}
