import about from './about.json';

export const profile = {
  name: 'VU DINH DAT',
  avatar: about.avatar || '/dat.jpg',
  codename: 'dathoaqua',
  role: { en: 'Software R&D Engineer - IoT', vi: about.role },
  location: { en: 'Thai Nguyen Province, VN', vi: about.location },
  bio: {
    en: 'Hello! 🚀 I am a Software & IoT Engineer specializing in building comprehensive solutions—ranging from mobile app and IoT 💡 development to backend systems, APIs, and web interfaces. Focused on optimizing performance and reliability ⚡, I am ready to partner with you to turn your tech ideas into real-world solutions! 🤝.',
    vi: about.bio,
  },
  stats: [
    { label: { en: 'YEARS ACTIVE', vi: 'NĂM KINH NGHIỆM' }, value: '05+' }
  ],
  // Mạng xã hội & liên lạc — hiện ở trang Tổng quan và trang Liên hệ.
  // icon: github | facebook | instagram | tiktok | youtube | mail | call ; label = tên nền tảng ; handle = tên kênh / tài khoản
  socials: [
    { icon: 'github', label: 'GitHub', handle: 'Vudinhdat02', url: 'https://github.com/Vudinhdat02' },
    { icon: 'facebook', label: 'Facebook', handle: 'dathoaqua02', url: 'https://www.facebook.com/dathoaqua02' },
    { icon: 'youtube', label: 'YouTube', handle: 'Vũ Đình Đạt Official', url: 'https://www.youtube.com/@vudinhdat02' },
    { icon: 'tiktok', label: 'TikTok', handle: '@datuav', url: 'https://www.tiktok.com/@datuav' },
    { icon: 'instagram', label: 'Instagram', handle: '@tadhniduv', url: 'https://www.instagram.com/tadhniduv' },
    { icon: 'mail', label: 'Email', handle: 'vudinhdat02@gmail.com', url: 'mailto:vudinhdat02@gmail.com' },
    { icon: 'call', label: { en: 'Phone', vi: 'Điện thoại' }, handle: '0332 465 590', url: 'tel:+84332465590' },
  ],
  email: 'vudinhdat02@gmail.com', // dùng cho nút "Mở ứng dụng email" ở trang Liên hệ
  contactEndpoint: '',
};

/* Kỹ năng đã chuyển sang src/data/skills.json — sửa trực tiếp trên trang (khi chạy npm run dev) hoặc trong file đó. */
