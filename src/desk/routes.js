/* các trang riêng, mở từ thanh menu trên cùng (địa chỉ #du-an, #thanh-tich, #du-lich…) */
export const ROUTES = [
  { id: '', label: 'Trang chủ', color: '#f5c542', icon: '⌂', sub: 'bàn học của kỹ sư' },
  { id: 'du-an', label: 'Dự án', color: '#6aa9f0', icon: '📝', sub: 'tủ hồ sơ các dự án' },
  { id: 'thanh-tich', label: 'Thành tích', color: '#ef7d57', icon: '🏅', sub: 'giấy khen, huy chương, chứng chỉ' },
  { id: 'nhat-ky', label: 'Nhật ký', color: '#ffb27a', icon: '📸', sub: 'ảnh và vài dòng mỗi ngày' },
  { id: 'du-lich', label: 'Du lịch', color: '#4fc3c7', icon: '🗺️', sub: 'bản đồ những nơi đã đến' },
  { id: 'cv', label: 'CV', color: '#b58cf0', icon: '📄', sub: 'in từ máy in kim' },
  { id: 'lien-he', label: 'Liên hệ', color: '#f08ab8', icon: '✉️', sub: 'viết thư, dán tem · vài trò chơi nhỏ' },
];
export const routeIndex = (id) => Math.max(0, ROUTES.findIndex((r) => r.id === id));
export const isRoute = (id) => ROUTES.some((r) => r.id === id && id);
/* địa chỉ cũ: Góc vui đã gộp vào trang Liên hệ (phần trò chơi ở cuối trang) */
export const ALIAS = { 'goc-vui': 'lien-he' };
