/* các trang riêng, mở từ thanh menu trên cùng (địa chỉ #du-an, #thanh-tich…) */
export const ROUTES = [
  { id: '', label: 'Trang chủ', color: '#f5c542', icon: '⌂', sub: 'bàn học của kỹ sư' },
  { id: 'du-an', label: 'Dự án', color: '#6aa9f0', icon: '📝', sub: 'tủ hồ sơ các bài kiểm tra' },
  { id: 'thanh-tich', label: 'Thành tích', color: '#ef7d57', icon: '🏅', sub: 'giấy khen, huy chương, chứng chỉ' },
  { id: 'nhat-ky', label: 'Nhật ký', color: '#ffb27a', icon: '📸', sub: 'ảnh và vài dòng mỗi ngày' },
  { id: 'cv', label: 'CV', color: '#b58cf0', icon: '📄', sub: 'in từ máy in kim' },
  { id: 'lien-he', label: 'Liên hệ', color: '#f08ab8', icon: '✉️', sub: 'viết thư, dán tem, gửi đi' },
  { id: 'goc-vui', label: 'Góc vui', color: '#7ccf8a', icon: '🎲', sub: 'terminal, thi gõ phím, góc học bài' },
];
export const routeIndex = (id) => Math.max(0, ROUTES.findIndex((r) => r.id === id));
export const isRoute = (id) => ROUTES.some((r) => r.id === id && id);
