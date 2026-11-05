/* Các ô nhập dùng chung cho những chỗ sửa nội dung trên web */
import { asset } from '../utils/asset';

export const ABOUT_FIELDS = [
  { key: 'avatar', label: 'Ảnh đại diện', type: 'image' },
  { key: 'role', label: 'Chức danh', type: 'text', required: true },
  { key: 'location', label: 'Nơi ở', type: 'text' },
  { key: 'bio', label: 'Giới thiệu bản thân', type: 'area', required: true },
  { key: 'highlights', label: 'Cụm từ được tô màu trong đoạn giới thiệu', type: 'tags' },
  { key: 'years', label: 'Số năm kinh nghiệm', type: 'number' },
  { key: 'todo', label: 'Giấy nhớ TODO trên bàn (mỗi dòng cách nhau dấu phẩy)', type: 'tags' },
];

export const ACH_FIELDS = [
  { key: 'title', label: 'Tên thành tích', type: 'text', required: true },
  { key: 'date', label: 'Thời gian (vd: 2024 - 2025 hoặc 06/2026)', type: 'text', required: true },
  { key: 'category', label: 'Loại (mỗi loại là một phòng)', type: 'text', options: ['Học tập', 'Hoạt động', 'Cuộc thi'] },
  { key: 'featured', label: 'Tiêu biểu (đeo huy chương trên tường, hiện ở mục Hành trình trang chủ)', type: 'check' },
  { key: 'desc', label: 'Mô tả ngắn', type: 'area' },
  { key: 'image', label: 'Ảnh giấy khen / huy chương', type: 'image' },
  { key: 'frame', label: 'Kiểu khung treo trên tường', type: 'frame' },
];
/* 10 kiểu khung treo cho bức tường thành tích */
export const FRAMES = [
  { key: 'gold', name: 'Vàng chạm' },
  { key: 'noir', name: 'Đen viền vàng' },
  { key: 'oak', name: 'Gỗ sồi' },
  { key: 'walnut', name: 'Gỗ óc chó' },
  { key: 'silver', name: 'Bạc' },
  { key: 'gallery', name: 'Trắng triển lãm' },
  { key: 'rose', name: 'Vàng hồng' },
  { key: 'mahogany', name: 'Gỗ gụ viền vàng' },
  { key: 'modern', name: 'Đen mảnh' },
  { key: 'velvet', name: 'Hộp nhung xanh' },
];
/* 10 kiểu trình bày thẻ dự án */
export const LOOKS = [
  { key: 'exam', name: 'Bài kiểm tra' },
  { key: 'notebook', name: 'Vở ô ly' },
  { key: 'sticky', name: 'Giấy nhớ' },
  { key: 'polaroid', name: 'Ảnh polaroid' },
  { key: 'index', name: 'Thẻ ghi chú' },
  { key: 'blueprint', name: 'Bản vẽ kỹ thuật' },
  { key: 'chalk', name: 'Bảng đen' },
  { key: 'folder', name: 'Bìa hồ sơ' },
  { key: 'library', name: 'Thẻ thư viện' },
  { key: 'terminal', name: 'Màn hình code' },
];
export const lookOf = (p, n) => (LOOKS.some((l) => l.key === p.look) ? p.look : LOOKS[(n ?? hashOf(p.id || p.title)) % LOOKS.length].key);
const hashOf = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
export const frameOf = (a) => (FRAMES.some((f) => f.key === a.frame) ? a.frame : FRAMES[hashOf(a.id || a.title) % FRAMES.length].key);
export const ACH_BLANK = () => ({ title: '', date: String(new Date().getFullYear()), category: 'Học tập', featured: false, desc: '', image: '', frame: 'gold' });
export const ACH_PREVIEW = (a) => ({ img: a.image ? asset(a.image) : null, title: a.title, sub: `${a.category} · ${a.date}${a.featured ? ' · ★' : ''}` });

export const PROJ_FIELDS = [
  { key: 'title', label: 'Tên dự án', type: 'text', required: true },
  { key: 'category', label: 'Nhóm (vd: MOBILE, IOT, WEB)', type: 'text', options: ['MOBILE', 'IOT', 'WEB'] },
  { key: 'year', label: 'Năm', type: 'number' },
  { key: 'tags', label: 'Công nghệ', type: 'tags' },
  { key: 'desc.vi', label: 'Mô tả', type: 'area' },
  { key: 'thumb', label: 'Ảnh minh hoạ nhỏ (hiện trong thẻ dự án)', type: 'image' },
  { key: 'look', label: 'Kiểu trình bày', type: 'look' },
  { key: 'repo', label: 'Link mã nguồn (GitHub)', type: 'url' },
  { key: 'demo', label: 'Link chạy thử', type: 'url' },
  { key: 'featured', label: 'Nổi bật (hiện ở mục "Bài kiểm tra" trang chủ, tối đa 3)', type: 'check' },
];
export const PROJ_BLANK = () => ({ title: '', category: 'WEB', year: new Date().getFullYear(), hue: Math.floor(Math.random() * 360), featured: false, pinned: false, desc: { vi: '', en: '' }, tags: [], repo: '', demo: '', images: [], thumb: '', look: 'exam' });
export const PROJ_PREVIEW = (p) => ({ img: p.thumb ? asset(p.thumb) : null, title: p.title, sub: `${p.category} · ${p.year}${p.featured || p.pinned ? ' · ★' : ''} · ${(p.tags || []).slice(0, 3).join(', ')}` });

export const STAT_FIELDS = [
  { key: 'value', label: 'Con số (vd: 3.83, 3+, 100%). Để trống nếu chọn tự đếm bên dưới', type: 'text' },
  { key: 'label', label: 'Dòng chữ bên dưới (vd: năm kinh nghiệm)', type: 'text', required: true },
  { key: 'auto', label: 'Tự đếm (để trống nếu tự ghi con số)', type: 'text', options: ['Số thành tích', 'Số dự án', 'Số thành tích tiêu biểu'] },
];
export const STAT_BLANK = () => ({ value: '', label: '', auto: '' });
export const STAT_PREVIEW = (x) => ({ img: null, title: `${x.auto ? `[${x.auto}]` : x.value} · ${x.label}`, sub: x.auto ? 'tự đếm' : '' });

export const SKILL_FIELDS = [
  { key: 'name', label: 'Nhóm kỹ năng (vd: Languages)', type: 'text', required: true },
  { key: 'desc', label: 'Các kỹ năng, cách nhau bằng dấu " - " hoặc dấu phẩy', type: 'area', required: true },
];
export const SKILL_BLANK = () => ({ name: '', desc: '' });
export const SKILL_PREVIEW = (s) => ({ img: null, title: s.name, sub: s.desc });
