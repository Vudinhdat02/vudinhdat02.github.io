// Cách dùng: tải geoBoundaries-VNM-ADM1_simplified.geojson (https://www.geoboundaries.org, gbOpen VNM ADM1, Public Domain),
// (bản simplified của geoBoundaries đã giữ ranh giới chung giữa các tỉnh, nên dùng nguyên toạ độ, không đơn giản hoá thêm)
// rồi chạy: node scripts/tao-ban-do-viet-nam.cjs geoBoundaries-VNM-ADM1_simplified.geojson src/data/vnmap.json
// Chuyển GeoJSON 64 đơn vị (geoBoundaries VNM ADM1, Public Domain) thành đường SVG gọn cho 63 tỉnh thành
// (Côn Đảo gộp vào Bà Rịa – Vũng Tàu), kèm nhãn quần đảo Hoàng Sa, Trường Sa và các đảo lớn.
const fs = require('fs');
const [src, out] = process.argv.slice(2);
const g = JSON.parse(fs.readFileSync(src, 'utf8'));
const LON0 = 102.0, LAT1 = 23.6, K = 72, COS = Math.cos((16 * Math.PI) / 180);
const P = ([lon, lat]) => [(lon - LON0) * K * COS, (LAT1 - lat) * K];
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const NAME = { 'Ho Chi Minh': 'TP. Hồ Chí Minh', 'Hà Nội': 'Hà Nội', 'Hải Phòng': 'Hải Phòng', 'Đà Nẵng': 'Đà Nẵng', 'Cần Thơ': 'Cần Thơ' };
// Douglas–Peucker
function dp(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const ringD = (ring) => {
  let pts = ring.map(P);
  const area = Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
  // không đơn giản hoá thêm (eps = 0) để biên các tỉnh khớp nhau tuyệt đối
  const eps = 0, m = Math.floor(pts.length / 2);
  pts = pts.length < 8 ? pts : [...dp(pts.slice(0, m + 1), eps).slice(0, -1), ...dp(pts.slice(m), eps)];
  if (pts.length < 3) return '';
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
};
const provinces = {};
let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
for (const f of g.features) {
  let name = f.properties.shapeName.trim();
  name = NAME[name] || name;
  const target = name === 'Côn Đảo' ? 'Bà Rịa – Vũng Tàu' : name.replace('–', ' – ');
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let d = '', sx = 0, sy = 0, sa = 0;
  for (const poly of polys) {
    const ring = poly[0];
    d += ringD(ring);
    for (const pt of ring) { const [x, y] = P(pt); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    // tâm theo diện tích của mảnh lớn nhất (để đặt nhãn)
    const pts = ring.map(P); let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; const c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; }
    a /= 2; if (Math.abs(a) > Math.abs(sa)) { sa = a; sx = cx / (6 * a); sy = cy / (6 * a); }
  }
  const p = provinces[target] || (provinces[target] = { id: slug(target), name: target, d: '', cx: sx, cy: sy, a: 0 });
  p.d += d;
  if (Math.abs(sa) > p.a) { p.a = Math.abs(sa); p.cx = sx; p.cy = sy; }
}
const pad = 16;
const W = Math.ceil(maxX - minX + pad * 2), H = Math.ceil(maxY - minY + pad * 2);
const shift = (d) => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, x, y) => `${(+x - minX + pad).toFixed(1)} ${(+y - minY + pad).toFixed(1)}`);
const at = (lon, lat) => { const [x, y] = P([lon, lat]); return [+(x - minX + pad).toFixed(1), +(y - minY + pad).toFixed(1)]; };
const list = Object.values(provinces).map((p) => ({ id: p.id, name: p.name, d: shift(p.d), cx: +(p.cx - minX + pad).toFixed(1), cy: +(p.cy - minY + pad).toFixed(1) })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
const islands = [
  ['Phú Quốc', 103.96, 10.23], ['Côn Đảo', 106.6, 8.69], ['Lý Sơn', 109.12, 15.38], ['Cát Bà', 107.05, 20.8],
  ['Bạch Long Vĩ', 107.73, 20.13], ['Phú Quý', 108.93, 10.52], ['Cồn Cỏ', 107.34, 17.16],
].map(([name, lon, lat]) => ({ name, xy: at(lon, lat) }));
const archipelagos = [
  { name: 'Quần đảo Hoàng Sa (Việt Nam)', xy: at(111.95, 16.35), r: 58, dots: [[112.33, 16.83], [111.61, 16.53], [111.2, 15.78], [112.73, 16.67], [111.7, 16.45], [112.0, 16.1]].map(([x, y]) => at(x, y)) },
  { name: 'Quần đảo Trường Sa (Việt Nam)', xy: at(113.3, 9.9), r: 92, dots: [[111.92, 8.65], [114.33, 11.43], [114.33, 9.88], [114.36, 10.18], [114.48, 10.38], [113.4, 9.3], [112.9, 9.9], [114.0, 10.9]].map(([x, y]) => at(x, y)) },
];
/* ---------- các nước láng giềng (tuỳ chọn, tham số thứ 3): Natural Earth 1:10m Admin 0, cắt quanh Việt Nam ----------
   npx mapshaper ne_10m_admin_0_countries.geojson -filter "ADM0_A3 != 'VNM'" -clip bbox=96,2,124,28 -filter-fields ADM0_A3,NAME_VI,NAME -simplify 12% keep-shapes -o near.geojson
   Biên giới của nước láng giềng được "hút" vào đúng biên giới Việt Nam (geoBoundaries) để không hở khe hay chồng lên nhau.
   Bỏ các vùng tranh chấp ở Hoàng Sa, Trường Sa (đó là của Việt Nam, đã có trong dữ liệu tỉnh). */
const neighbors = [];
const nearFile = process.argv[4];
if (nearFile) {
  const vnSegs = new Map(), CELL = 8;
  const addSeg = (a, b) => { const x0 = Math.floor(Math.min(a[0], b[0]) / CELL), x1 = Math.floor(Math.max(a[0], b[0]) / CELL), y0 = Math.floor(Math.min(a[1], b[1]) / CELL), y1 = Math.floor(Math.max(a[1], b[1]) / CELL);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x + ',' + y; if (!vnSegs.has(k)) vnSegs.set(k, []); vnSegs.get(k).push([a, b]); } };
  for (const f of g.features) { const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; for (const poly of polys) { const pts = poly[0].map(P); for (let i = 1; i < pts.length; i++) addSeg(pts[i - 1], pts[i]); } }
  const snap = ([x, y]) => {
    const T = 4.5; let best = null, bd = T * T;
    for (let cx = Math.floor((x - T) / CELL); cx <= Math.floor((x + T) / CELL); cx++) for (let cy = Math.floor((y - T) / CELL); cy <= Math.floor((y + T) / CELL); cy++) {
      for (const [a, b] of vnSegs.get(cx + ',' + cy) || []) { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1e-9; let t = ((x - a[0]) * dx + (y - a[1]) * dy) / L; t = Math.max(0, Math.min(1, t)); const px = a[0] + t * dx, py = a[1] + t * dy, d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = [px, py]; } }
    }
    return best || [x, y];
  };
  const disputed = ([lon, lat]) => (lon > 110.3 && lon < 113.8 && lat > 15 && lat < 17.6) || (lon > 110.5 && lon < 116.8 && lat > 6.8 && lat < 12.2);
  const near = JSON.parse(fs.readFileSync(nearFile, 'utf8'));
  for (const f of near.features) {
    const iso = f.properties.ADM0_A3; if (['PGA', 'SCR', 'VNM'].includes(iso)) continue;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let d = '', best = 0, c = [0, 0];
    for (const poly of polys) {
      const ring = poly[0]; if (ring.every(disputed)) continue;
      const touchesVN = ['CHN', 'LAO', 'KHM'].includes(iso);
      const pts = ring.map((q) => { const xy = P(q); return touchesVN ? snap(xy) : xy; });
      if (pts.length < 3) continue;
      d += 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
      const ar = Math.abs(pts.reduce((sum, q, i) => { const r = pts[(i + 1) % pts.length]; return sum + q[0] * r[1] - r[0] * q[1]; }, 0) / 2);
      if (ar > best) { best = ar; let A = 0, X = 0, Y = 0; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; const cc = x0 * y1 - x1 * y0; A += cc; X += (x0 + x1) * cc; Y += (y0 + y1) * cc; } c = [X / (3 * A), Y / (3 * A)]; }
    }
    if (d) neighbors.push({ id: iso, name: f.properties.NAME_VI || f.properties.NAME, d: shift(d), cx: +(c[0] - minX + pad).toFixed(1), cy: +(c[1] - minY + pad).toFixed(1) });
  }
}
const origin = { lon0: LON0, lat1: LAT1, k: K, cos: COS, dx: +(-minX + pad).toFixed(3), dy: +(-minY + pad).toFixed(3) }; // để bản đồ thế giới khớp toạ độ
const res = { source: 'geoBoundaries VNM ADM1 (gbOpen, Public Domain) — www.geoboundaries.org', viewBox: `0 0 ${W} ${H}`, w: W, h: H, origin, provinces: list, neighbors, islands, archipelagos };
fs.writeFileSync(out, JSON.stringify(res));
console.log('provinces', list.length, 'size', fs.statSync(out).size, 'view', W, H);
