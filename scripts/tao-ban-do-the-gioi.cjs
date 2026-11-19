// Bản đồ thế giới cho trang Du lịch, cùng hệ toạ độ với src/data/vnmap.json (để 63 tỉnh nằm khớp lên trên).
// Nguồn: Natural Earth 1:110m Admin 0 – Countries (Public Domain), https://www.naturalearthdata.com
//   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
// Cách dùng: node scripts/tao-ban-do-the-gioi.cjs <ne_110m_admin_0_countries.geojson> src/data/worldmap.json
// Việt Nam không lấy từ đây (đã có 63 tỉnh thành chi tiết + Hoàng Sa, Trường Sa trong vnmap.json).
const fs = require('fs');
const path = require('path');
const [src, out] = process.argv.slice(2);
const vn = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/vnmap.json'), 'utf8'));
const { lon0, lat1, k, cos, dx, dy } = vn.origin;
const P = ([lon, lat]) => [(lon - lon0) * k * cos + dx, (lat1 - lat) * k + dy];
const g = JSON.parse(fs.readFileSync(src, 'utf8'));

function dp(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [x1, y1] = pts[a], [x2, y2] = pts[b], ddx = x2 - x1, ddy = y2 - y1, L = Math.hypot(ddx, ddy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(ddy * pts[i][0] - ddx * pts[i][1] + x2 * y1 - y2 * x1) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const ring = (r) => {
  let pts = r.map(P);
  const m = Math.floor(pts.length / 2), eps = 6;
  pts = pts.length < 8 ? pts : [...dp(pts.slice(0, m + 1), eps).slice(0, -1), ...dp(pts.slice(m), eps)];
  if (pts.length < 3) return '';
  return 'M' + pts.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join('L') + 'Z';
};
const countries = [];
let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
for (const f of g.features) {
  const p = f.properties;
  const iso = p.ADM0_A3 === '-99' ? (p.ISO_A3_EH || p.ADM0_A3) : p.ADM0_A3;
  if (iso === 'VNM' || iso === 'ATA') continue; // Việt Nam vẽ riêng; bỏ Nam Cực cho gọn
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let d = '', best = 0, cx = 0, cy = 0;
  for (const poly0 of polys) {
    // bản đồ lấy châu Á – Thái Bình Dương làm trung tâm: châu Mỹ (kinh độ < -25°) dời sang phía đông
    const poly = poly0[0].every(([lon]) => lon < -25) ? poly0.map((r) => r.map(([lon, lat]) => [lon + 360, lat])) : poly0;
    d += ring(poly[0]);
    const pts = poly[0].map(P); let a = 0, sx = 0, sy = 0;
    for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; const c = x0 * y1 - x1 * y0; a += c; sx += (x0 + x1) * c; sy += (y0 + y1) * c; }
    if (Math.abs(a) > best) { best = Math.abs(a); cx = sx / (3 * a); cy = sy / (3 * a); }
    for (const [x, y] of pts) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  if (!d) continue;
  countries.push({ id: iso, name: p.NAME_VI || p.NAME, d, cx: Math.round(cx), cy: Math.round(cy), big: best > 4e6 });
}
countries.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
const res = { source: 'Natural Earth 1:110m Admin 0 Countries (Public Domain)', bounds: [Math.floor(minX), Math.floor(minY), Math.ceil(maxX), Math.ceil(maxY)], countries };
fs.writeFileSync(out, JSON.stringify(res));
console.log('countries', countries.length, 'size', fs.statSync(out).size, 'bounds', res.bounds);
