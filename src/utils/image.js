/*
 * Chuẩn hoá ảnh người dùng chọn để trình duyệt xem trước và tải lên được:
 *  - ảnh HEIC/HEIF (ảnh iPhone) được đổi sang JPG ngay trên máy
 *  - file không rõ loại thì thử mở như ảnh; mở không được thì báo lỗi
 */
const IMG_EXT = /\.(jpe?g|jfif|png|gif|webp|bmp|avif|heic|heif|tiff?)$/i;
const MIME = { png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif' };

export const looksLikeImage = (f) => (f.type || '').startsWith('image/') || IMG_EXT.test(f.name || '');

const canOpen = (blob) => new Promise((res) => {
  const u = URL.createObjectURL(blob); const im = new Image();
  im.onload = () => { URL.revokeObjectURL(u); res(true); };
  im.onerror = () => { URL.revokeObjectURL(u); res(false); };
  im.src = u;
});

/** Trả về File xem được (có thể đã đổi định dạng), hoặc ném lỗi có lời nhắn dễ hiểu. */
export async function toWebImage(file) {
  const heic = /hei[cf]/i.test(file.type || '') || /\.hei[cf]$/i.test(file.name || '');
  if (heic) {
    try {
      const { default: heic2any } = await import('heic2any');
      const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
      const blob = Array.isArray(out) ? out[0] : out;
      return new File([blob], (file.name || 'anh').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch {
      throw new Error(`Chưa mở được ảnh "${file.name}" (định dạng HEIC). Bạn thử lưu ảnh sang JPG rồi chọn lại nhé.`);
    }
  }
  let f = file;
  if (!(file.type || '').startsWith('image/')) {
    const ext = (file.name || '').split('.').pop().toLowerCase();
    f = new File([file], file.name || 'anh.jpg', { type: MIME[ext] || 'image/jpeg' });
  }
  if (!(await canOpen(f))) throw new Error(`Trình duyệt không mở được ảnh "${file.name}". Hãy chọn ảnh JPG, PNG hoặc WEBP.`);
  return f;
}
