/*
 * Khung chung cho trang Thành tích và Dự án theo kiểu "bộ sưu tập thẻ bài":
 * thanh sưu tập, bài trên tay (xòe), gói bài may mắn, album thẻ (chia bài khi cuộn tới, lọc thì xáo bài).
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Card, Fan, Pack, Inspect, RARITY } from '../Cards';
import { thock } from '../sound';
import { reduced } from '../Fx';

gsap.registerPlugin(Flip, ScrollTrigger);

export default function Collection({ cards, hand, groups, groupLabel, unit, packLabel, handTitle, albumTitle }) {
  const root = useRef(null);
  const flip = useRef(null);
  const [g, setG] = useState('all');
  const [rar, setRar] = useState('all');
  const [view, setView] = useState(null);
  const list = cards.filter((c) => (g === 'all' || c.group === g) && (rar === 'all' || c.rarity === rar));
  const counts = useMemo(() => Object.fromEntries(Object.keys(RARITY).map((k) => [k, cards.filter((c) => c.rarity === k).length])), [cards]);
  const pick = (l, i, from) => setView({ list: l, i, from });

  /* thanh sưu tập: chạy từ 0 */
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo('.cl-bar i', { scaleX: 0 }, { scaleX: 1, duration: 1.6, delay: 0.8, ease: 'power3.out' });
      const n = root.current.querySelector('.cl-n'); const o = { v: 0 };
      gsap.to(o, { v: cards.length, duration: 1.6, delay: 0.8, ease: 'power3.out', onUpdate: () => { n.textContent = Math.round(o.v); } });
      gsap.from('.cl-rar', { y: 30, opacity: 0, rotate: -8, stagger: 0.1, delay: 1, duration: 0.7, ease: 'back.out(2)' });
    }, root);
    return () => ctx.revert();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* album: chia bài khi cuộn tới (bay từ góc như từ bộ bài, lật mặt lên), lọc thì xáo */
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    if (flip.current) {
      const st = flip.current; flip.current = null;
      Flip.from(st, { duration: 0.8, ease: 'power3.inOut', stagger: 0.03, absolute: true, scale: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: -200, rotate: () => gsap.utils.random(-40, 40), scale: 0.5 }, { opacity: 1, y: 0, rotate: 0, scale: 1, duration: 0.8, ease: 'back.out(1.4)' }),
        onLeave: (els) => gsap.to(els, { opacity: 0, y: 160, rotate: 25, scale: 0.6, duration: 0.4, ease: 'power2.in' }),
        onComplete: () => ScrollTrigger.refresh() });
      return undefined;
    }
    const ctx = gsap.context(() => {
      ScrollTrigger.batch('.al-slot', { start: 'top 92%', once: true,
        onEnter: (els) => {
          els.forEach((el, k) => {
            const r = el.getBoundingClientRect();
            const tc = el.querySelector('.tc');
            tc.classList.add('is-back');
            gsap.fromTo(el, { x: window.innerWidth * 0.5 - r.left - r.width / 2, y: -260, rotate: gsap.utils.random(-30, 30), opacity: 0 },
              { x: 0, y: 0, rotate: 0, opacity: 1, duration: 0.85, delay: k * 0.09, ease: 'power3.out', clearProps: 'transform',
                onStart: () => thock(1.1 + k * 0.05), onComplete: () => setTimeout(() => tc.classList.remove('is-back'), 80 + k * 40) });
          });
        } });
    }, root);
    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, [g, rar]);

  const change = (fn) => { flip.current = Flip.getState(root.current.querySelectorAll('.al-slot')); fn(); thock(1.2); };

  return (
    <div className="cl" ref={root}>
      {/* ---- thanh sưu tập ---- */}
      <div className="cl-head">
        <div className="cl-prog">
          <p>Bộ sưu tập đã mở khóa</p>
          <b><span className="cl-n">0</span> / {cards.length} {unit}</b>
          <span className="cl-bar"><i /></span>
        </div>
        <div className="cl-rars">
          {Object.entries(RARITY).map(([k, r]) => (
            <span key={k} className="cl-rar" style={{ '--rc': r.color }}><i>{'★'.repeat(r.stars)}</i><b>{counts[k]}</b><small>{r.label}</small></span>
          ))}
        </div>
      </div>

      {/* ---- bài trên tay + gói bài ---- */}
      <section className="cl-play">
        <div className="cl-hand">
          <h3 className="cl-h">{handTitle}<small>rê chuột để rút bài, bấm để xem kỹ</small></h3>
          <Fan cards={hand} onPick={(i, r) => pick(hand, i, r)} />
        </div>
        <div className="cl-pack">
          <h3 className="cl-h">Thử vận may<small>mỗi gói 3 lá, lá hiếm phát sáng</small></h3>
          <Pack pool={cards} label={packLabel} onPick={(c, r) => pick(cards, cards.indexOf(c), r)} />
        </div>
      </section>

      {/* ---- album ---- */}
      <section className="al">
        <h3 className="cl-h big">{albumTitle}</h3>
        <div className="al-filter">
          <div className="al-chips">
            <button className={g === 'all' ? 'on' : ''} onClick={() => g !== 'all' && change(() => setG('all'))}>🗂 Tất cả<small>{cards.length}</small></button>
            {groups.map((x) => (
              <button key={x} className={g === x ? 'on' : ''} onClick={() => g !== x && change(() => setG(x))}>{groupLabel(x)}<small>{cards.filter((c) => c.group === x).length}</small></button>
            ))}
          </div>
          <div className="al-chips rar">
            {[['all', 'Mọi độ hiếm', '#1f2f6e'], ...Object.entries(RARITY).map(([k, r]) => [k, r.label, r.color])].map(([k, l, col]) => (
              <button key={k} style={{ '--rc': col }} className={rar === k ? 'on' : ''} onClick={() => rar !== k && change(() => setRar(k))}>{k !== 'all' && <i>★</i>}{l}</button>
            ))}
          </div>
        </div>
        {!list.length && <p className="dy-empty">Chưa có lá bài nào ở đây ✎</p>}
        <div className="al-grid">
          {list.map((c) => (
            <div key={c.id} className="al-slot" data-flip-id={c.id}>
              <Card c={c} onClick={(e) => pick(list, list.indexOf(c), e.currentTarget.getBoundingClientRect())} />
            </div>
          ))}
        </div>
      </section>
      {view && <Inspect list={view.list} at={view.i} from={view.from} onClose={() => setView(null)} />}
    </div>
  );
}
