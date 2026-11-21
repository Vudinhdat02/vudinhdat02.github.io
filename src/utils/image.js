/*
 * Chuẩn hoá ảnh người dùng chọn để trình duyệt xem trước và tải lên được:
 *  - ảnh HEIC/HEIF (ảnh iPhone) được đổi sang JPG ngay trên máy
 *  - ảnh RAW DNG (iPhone ProRAW, máy ảnh): lấy ảnh JPEG xem trước nằm sẵn trong file, xoay đúng chiều
 *  - file không rõ loại thì thử mở như ảnh; mở không được thì báo lỗi
 * Ảnh chuyển đổi được thu về tối đa MAX px để nhẹ và nhanh.
 */
const IMG_EXT = /\.(jpe?g|jfif|png|gif|webp|bmp|avif|heic|heif|dng|tiff?)$/i;
const MIME = { png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif' };
const MAX = 2400;

/* dùng cho thuộc tính accept của ô chọn file */
export const IMAGE_ACCEPT = 'image/*,.heic,.heif,.dng,image/heic,image/heif,image/x-adobe-dng';

export const looksLikeImage = (f) => (f.type || '').startsWith('image/') || IMG_EXT.test(f.name || '');
export const isHeic = (f) => /hei[cf]/i.test(f.type || '') || /\.hei[cf]$/i.test(f.name || '');
export const isDng = (f) => /dng/i.test(f.type || '') || /\.dng$/i.test(f.name || '');

/* không bao giờ để nút "Đang mở ảnh…" quay mãi */
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

const canOpen = (blob) => withTimeout(new Promise((res) => {
  const u = URL.createObjectURL(blob); const im = new Image();
  im.onload = () => { URL.revokeObjectURL(u); res(true); };
  im.onerror = () => { URL.revokeObjectURL(u); res(false); };
  im.src = u;
}), 15000).catch(() => false);

const baseName = (file) => (file.name || 'anh').replace(/\.\w+$/, '');

/* vẽ ảnh lên canvas (thu nhỏ + xoay theo EXIF Orientation 1..8) rồi xuất JPG */
async function drawToJpeg(blob, name, orientation = 1, stored = null) {
  const bmp = await createImageBitmap(blob);
  try {
    // trình duyệt đã tự xoay theo EXIF trong JPEG thì không xoay thêm lần nữa
    if (stored && orientation >= 5 && (bmp.width > bmp.height) !== (stored[0] > stored[1])) orientation = 1;
    const s = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
    const swap = orientation >= 5;
    const c = document.createElement('canvas');
    c.width = swap ? h : w; c.height = swap ? w : h;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    const T = { 2: [-1, 0, 0, 1, w, 0], 3: [-1, 0, 0, -1, w, h], 4: [1, 0, 0, -1, 0, h], 5: [0, 1, 1, 0, 0, 0], 6: [0, 1, -1, 0, h, 0], 7: [0, -1, -1, 0, h, w], 8: [0, -1, 1, 0, 0, w] }[orientation];
    if (T) g.setTransform(...T);
    g.drawImage(bmp, 0, 0, w, h);
    const out = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), 'image/jpeg', 0.9));
    return new File([out], name + '.jpg', { type: 'image/jpeg' });
  } finally { bmp.close?.(); }
}

/* ---------- DNG: file TIFF, tìm ảnh JPEG xem trước lớn nhất ---------- */
async function dngPreview(file) {
  const read = async (off, len) => new DataView(await file.slice(off, off + len).arrayBuffer());
  const head = await read(0, 8);
  const le = head.getUint16(0) === 0x4949;
  if (!le && head.getUint16(0) !== 0x4d4d) throw new Error('not tiff');
  const u16 = (v, o) => v.getUint16(o, le), u32 = (v, o) => v.getUint32(o, le);
  const SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 13: 4 };
  const found = []; let orientation = 1; const seen = new Set();
  const walk = async (off, depth) => {
    if (!off || depth > 3 || seen.has(off) || off >= file.size) return;
    seen.add(off);
    const n = u16(await read(off, 2), 0);
    if (!n || n > 1000) return;
    const v = await read(off + 2, n * 12 + 4);
    const tags = {};
    for (let i = 0; i < n; i++) {
      const e = i * 12, tag = u16(v, e), ty = u16(v, e + 2), cnt = u32(v, e + 4), size = (SZ[ty] || 1) * cnt;
      if (![3, 4, 13].includes(ty)) continue;
      const src = size <= 4 ? v : await read(u32(v, e + 8), Math.min(size, 4 * 64));
      const base = size <= 4 ? e + 8 : 0, vals = [];
      for (let k = 0; k < Math.min(cnt, 64); k++) vals.push(ty === 3 ? u16(src, base + k * 2) : u32(src, base + k * 4));
      tags[tag] = vals;
    }
    const t = (k) => tags[k]?.[0];
    if (depth === 0 && t(274)) orientation = t(274);
    const comp = t(259), photo = t(262);
    if (t(513) && t(514)) found.push({ off: t(513), len: t(514), px: (t(256) || 0) * (t(257) || 0), dim: [t(256), t(257)] });
    // một dải duy nhất, nén JPEG thường (6/7), ảnh màu RGB/YCbCr – không phải dữ liệu RAW (CFA/LinearRaw)
    if ((comp === 6 || comp === 7) && (photo === 2 || photo === 6) && tags[273]?.length === 1 && tags[279]?.length === 1)
      found.push({ off: t(273), len: t(279), px: (t(256) || 0) * (t(257) || 0), dim: [t(256), t(257)] });
    for (const s of tags[330] || []) await walk(s, depth + 1);
    if (depth === 0) await walk(u32(v, n * 12), 0);
  };
  await walk(u32(head, 4), 0);
  found.sort((a, b) => b.px - a.px || b.len - a.len);
  for (const f of found) {
    const blob = file.slice(f.off, f.off + f.len, 'image/jpeg');
    const sig = await read(f.off, 2);
    if (sig.getUint16(0) !== 0xffd8) continue;
    try { return await drawToJpeg(blob, baseName(file), orientation, f.dim[0] && f.dim[1] ? f.dim : null); } catch { /* thử ảnh tiếp theo */ }
  }
  throw new Error('no preview');
}

/** Trả về File xem được (có thể đã đổi định dạng), hoặc ném lỗi có lời nhắn dễ hiểu. */
export async function toWebImage(file) {
  if (isDng(file)) {
    try { return await withTimeout(dngPreview(file), 60000); } catch {
      throw new Error(`Chưa mở được ảnh RAW "${file.name}" (DNG). Bạn thử xuất ảnh sang JPG rồi chọn lại nhé.`);
    }
  }
  if (isHeic(file)) {
    // Safari (và máy có sẵn bộ giải mã HEIF) mở thẳng được
    try { return await drawToJpeg(file, baseName(file)); } catch { /* dùng thư viện bên dưới */ }
    try {
      const { heicTo } = await import('heic-to/csp');
      const blob = await withTimeout(heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 }), 90000);
      try { return await drawToJpeg(blob, baseName(file)); } catch { return new File([blob], baseName(file) + '.jpg', { type: 'image/jpeg' }); }
    } catch {
      throw new Error(`Chưa mở được ảnh "${file.name}" (định dạng HEIC). Bạn thử lưu ảnh sang JPG rồi chọn lại nhé.`);
    }
  }
  let f = file;
  if (!(file.type || '').startsWith('image/')) {
    const ext = (file.name || '').split('.').pop().toLowerCase();
    f = new File([file], file.name || 'anh.jpg', { type: MIME[ext] || 'image/jpeg' });
  }
  if (!(await canOpen(f))) throw new Error(`Trình duyệt không mở được ảnh "${file.name}". Hãy chọn ảnh JPG, PNG, WEBP, HEIC hoặc DNG.`);
  return f;
}
