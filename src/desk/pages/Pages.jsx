/*
 * Khung chung cho các trang riêng: đầu trang (tiêu đề chữ nảy, nét vẽ tay, con dấu quay, băng keo),
 * thân trang, nút "trang tiếp" và chân trang.
 */
import { lazy, Suspense } from 'react';
import { ROUTES, routeIndex } from '../routes';
import { Bounce, Doodle, SpinBadge, Tape, Torn } from '../Fx';
import Footer from '../Footer';
import ProjectsPage from './ProjectsPage';
import AchievementsPage from './AchievementsPage';
import { CvPage, ContactPage } from './SimplePages';
import { DiaryBoard, useDiary } from '../Diary';
import projects from '../../data/projects.json';
import achievements from '../../data/achievements.json';
import { thock } from '../sound';

const GocVui = lazy(() => import('./GocVui'));

const TAPES = {
  'du-an': ['React Native', 'Flutter', 'ESP32', 'Node.js', 'C# .NET', 'MQTT', 'Firebase', 'Arduino'],
  'thanh-tich': ['Sinh viên 5 tốt', 'GPA 3.83', 'Giấy khen', 'Học bổng', 'B1 Cambridge', 'Nghiên cứu khoa học'],
  'nhat-ky': ['Hôm nay', 'Một tấm ảnh', 'Vài dòng', 'Kỷ niệm', 'Dây phơi', 'Thả tim'],
  cv: ['Kinh nghiệm', 'Học vấn', 'Kỹ năng', 'Chứng chỉ', 'In ngay'],
  'lien-he': ['Hợp tác', 'Tuyển dụng', 'Hỏi bài', 'Cà phê', 'Viết thư'],
  'goc-vui': ['help', 'sudo hire-dat', 'matrix', 'WPM', 'Pomodoro', 'coffee'],
};

export default function SubPage({ id, onNav, onNight }) {
  const i = routeIndex(id);
  const r = ROUTES[i];
  const next = ROUTES[i + 1] || ROUTES[1];
  const { posts } = useDiary();
  const count = { 'du-an': `${projects.length} dự án`, 'thanh-tich': `${achievements.length} thành tích`, 'nhat-ky': `${posts.length} trang nhật ký` }[id];
  return (
    <main className={`page page-${id}`} style={{ '--c': r.color }}>
      <header className="pg-head">
        <nav className="pg-crumb"><button onClick={() => onNav('')}>⌂ Trang chủ</button><span>/</span><b>{r.label}</b></nav>
        <div className="pg-title-row">
          <span className="pgh-ic">{r.icon}</span>
          <div>
            <Bounce as="h1" className="pg-title" text={r.label} immediate delay={0.6} />
            <Doodle kind="under" className="pg-under" color={r.color} width={5} delay={1} />
          </div>
        </div>
        <p className="pg-sub">{r.sub}{count && <> · <b>{count}</b></>}</p>
        <SpinBadge className="pg-badge" center={r.icon} />
        <Doodle kind="star" className="pg-d1" color="#f5c542" delay={1.2} />
        <Doodle kind="arrow" className="pg-d2" color="#d33a2c" delay={1.4} />
        <Doodle kind="zig" className="pg-d3" color={r.color} delay={1.1} />
        <span className="pg-tape t1" /><span className="pg-tape t2" />
      </header>
      <Tape items={TAPES[id] || []} tilt={-1.6} color={r.color} />
      <section className="pg-body">
        {id === 'du-an' && <ProjectsPage />}
        {id === 'thanh-tich' && <AchievementsPage />}
        {id === 'nhat-ky' && <DiaryBoard />}
        {id === 'cv' && <CvPage />}
        {id === 'lien-he' && <ContactPage />}
        {id === 'goc-vui' && <Suspense fallback={<p className="pg-wait">Đang bày đồ chơi ra bàn…</p>}><GocVui onNav={onNav} onNight={onNight} /></Suspense>}
      </section>
      <div className="pg-next-wrap">
        <Torn color="#f4f7fc" seed={i + 2} />
        <button className="pg-next" style={{ '--n': next.color }} onClick={() => onNav(next.id)} onMouseEnter={() => thock(1.2)} data-mag="0.15">
          <small>Trang tiếp theo</small>
          <b>{next.icon} {next.label}</b>
          <span>{next.sub} →</span>
        </button>
      </div>
      <Footer onNav={onNav} />
    </main>
  );
}
