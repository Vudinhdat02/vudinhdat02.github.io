/* Trang "Dự án" theo kiểu bộ sưu tập thẻ bài: mỗi dự án là một lá bài công nghệ */
import { useMemo } from 'react';
import projects from '../../data/projects.json';
import { ListEditor, useEditable } from '../Editor';
import { vi } from '../Diary';
import Collection from './Collection';
import { PROJ_BLANK, PROJ_FIELDS, PROJ_PREVIEW } from '../fields';

const CAT_IC = { MOBILE: '📱', IOT: '🛰', WEB: '🌐' };
const rarityOf = (p) => ((p.tags || []).length >= 6 ? 'legend' : (p.tags || []).length >= 4 ? 'rare' : 'common');
const short = (t, n) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t);
const openUrl = (e, url) => { e.stopPropagation(); window.open(url, '_blank', 'noopener'); };

const toCards = (list) => list.map((p, i) => ({
  id: p.id,
  title: p.title,
  group: p.category,
  rarity: rarityOf(p),
  hue: p.hue ?? 210,
  cost: `#${i + 1}`,
  icon: CAT_IC[p.category] || '💾',
  type: `${p.category} · ${p.year}`,
  code: (p.tags || []).slice(0, 4).map((t) => `> ${t}`).join('\n'),
  flavor: short(vi(p.desc), 120),
  foot: (p.tags || []).slice(0, 3).join(' · '),
  backBody: (
    <>
      <span className="tb-desc">{vi(p.desc)}</span>
      <span className="tb-tags">{(p.tags || []).map((t) => <i key={t}>{t}</i>)}</span>
      {p.repo && <span className="tb-link" role="link" tabIndex={0} onClick={(e) => openUrl(e, p.repo)} onPointerDown={(e) => e.stopPropagation()}>Xem mã nguồn ↗</span>}
      {p.demo && <span className="tb-link" role="link" tabIndex={0} onClick={(e) => openUrl(e, p.demo)} onPointerDown={(e) => e.stopPropagation()}>Chạy thử ↗</span>}
    </>
  ),
}));

export default function ProjectsPage() {
  const ed = useEditable(projects, 'projects');
  const cards = useMemo(() => toCards(ed.items), [ed.items]);
  const key = cards.map((c) => c.id).join('|');
  return (
    <>
      <Collection key={key} cards={cards} hand={cards} groups={[...new Set(cards.map((c) => c.group))]} groupLabel={(g) => `${CAT_IC[g] || ''} ${g}`}
        unit="thẻ dự án" handTitle="Bộ bài dự án" albumTitle="Album thẻ dự án" packLabel="Mở gói dự án" />
      {ed.canEdit && <ListEditor ed={ed} label="dự án" fields={PROJ_FIELDS} blank={PROJ_BLANK} preview={PROJ_PREVIEW} />}
    </>
  );
}
