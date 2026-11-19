// Bản đồ cho chế độ "Toàn cầu" của trang Du lịch (chạy một lần, kết quả nằm trong public/maps/).
// Nguồn (đều Public Domain): Natural Earth — https://www.naturalearthdata.com
//   1:50m Admin 0 – Countries:          .../geojson/ne_50m_admin_0_countries.geojson
//   1:10m Admin 1 – States, Provinces:  .../geojson/ne_10m_admin_1_states_provinces.geojson
//   (https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/)
// Trước tiên đơn giản hoá bằng mapshaper, GIỮ RANH GIỚI CHUNG giữa các vùng (để biên không bị hở / chồng):
//   npx mapshaper ne_50m_admin_0_countries.geojson -simplify 25% keep-shapes -o world_s.geojson
//   npx mapshaper ne_10m_admin_1_states_provinces.geojson -filter-fields adm0_a3,adm1_code,iso_3166_2,name,name_vi,name_en -simplify 6% keep-shapes -o adm1_s.geojson
// Cách dùng: node scripts/tao-ban-do-the-gioi.cjs world_s.geojson adm1_s.geojson
//   → public/maps/world.json            (thế giới, lấy châu Á – Thái Bình Dương làm trung tâm)
//   → public/maps/adm1/<ISO3>.json       (tỉnh / bang của từng nước, mỗi nước một file nhỏ, chỉ tải khi bấm vào)
// Việt Nam chi tiết (63 tỉnh thành + Hoàng Sa, Trường Sa) vẫn dùng src/data/vnmap.json.
const fs = require('fs');
const path = require('path');
const [w50, adm1] = process.argv.slice(2);
const OUT = path.join(__dirname, '../public/maps');
fs.mkdirSync(path.join(OUT, 'adm1'), { recursive: true });

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
const simplify = (pts, eps) => { const m = Math.floor(pts.length / 2); return pts.length < 8 ? pts : [...dp(pts.slice(0, m + 1), eps).slice(0, -1), ...dp(pts.slice(m), eps)]; };
const area = (pts) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
const centroid = (pts) => { let a = 0, x = 0, y = 0; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; const c = x0 * y1 - x1 * y0; a += c; x += (x0 + x1) * c; y += (y0 + y1) * c; } return a ? [x / (3 * a), y / (3 * a)] : pts[0]; };
const ringsOf = (geom) => (geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates).map((p) => p[0]);
const fmt = (n, dec) => (dec ? n.toFixed(dec) : String(Math.round(n)));
const toD = (pts, dec) => 'M' + pts.map(([x, y]) => `${fmt(x, dec)} ${fmt(y, dec)}`).join('L') + 'Z';

/* ---------- 1. thế giới ---------- */
const LON0 = 102, LAT1 = 23.6, K = 72, COS = Math.cos((16 * Math.PI) / 180);
const PW = ([lon, lat]) => [(lon - LON0) * K * COS, (LAT1 - lat) * K];
const world = JSON.parse(fs.readFileSync(w50, 'utf8'));
const countries = [];
let B = [1e9, 1e9, -1e9, -1e9];
for (const f of world.features) {
  const p = f.properties;
  const iso = p.ADM0_A3;
  if (iso === 'ATA') continue;
  let d = '', best = 0, c = [0, 0];
  for (const r0 of ringsOf(f.geometry)) {
    const r = r0.every(([lon]) => lon < -25) ? r0.map(([lon, lat]) => [lon + 360, lat]) : r0; // châu Mỹ sang phía đông
    let pts = r.map(PW);
    const a = area(pts); if (a < 30) continue; // bỏ đảo quá nhỏ ở tỉ lệ thế giới
    if (pts.length < 3) continue;
    d += toD(pts);
    if (a > best) { best = a; c = centroid(r.map(PW)); }
    for (const [x, y] of pts) { B = [Math.min(B[0], x), Math.min(B[1], y), Math.max(B[2], x), Math.max(B[3], y)]; }
  }
  if (!d) continue;
  countries.push({ id: iso, name: p.NAME_VI || p.NAME, d, cx: Math.round(c[0]), cy: Math.round(c[1]), a: Math.round(best) });
}
countries.sort((a, b) => b.a - a.a);
const pw = (lon, lat) => PW([lon, lat]).map((v) => Math.round(v));
const worldOut = {
  source: 'Natural Earth 1:50m Admin 0 Countries (Public Domain)',
  proj: { lon0: LON0, lat1: LAT1, k: K, cos: COS },
  bounds: B.map(Math.round), countries,
  // quần đảo của Việt Nam (Natural Earth 1:50m không vẽ hai quần đảo này)
  archipelagos: [
    { name: 'Quần đảo Hoàng Sa (Việt Nam)', xy: pw(111.95, 16.35), dots: [[112.33, 16.83], [111.61, 16.53], [111.2, 15.78], [112.73, 16.67], [111.7, 16.45], [112.0, 16.1]].map(([x, y]) => pw(x, y)) },
    { name: 'Quần đảo Trường Sa (Việt Nam)', xy: pw(113.3, 9.9), dots: [[111.92, 8.65], [114.33, 11.43], [114.33, 9.88], [114.36, 10.18], [114.48, 10.38], [113.4, 9.3], [112.9, 9.9], [114.0, 10.9]].map(([x, y]) => pw(x, y)) },
  ],
};
fs.writeFileSync(path.join(OUT, 'world.json'), JSON.stringify(worldOut));
console.log('world', countries.length, fs.statSync(path.join(OUT, 'world.json')).size);

/* ---------- 2. tỉnh / bang của từng nước ---------- */
const A = JSON.parse(fs.readFileSync(adm1, 'utf8'));
const byC = {};
for (const f of A.features) { const iso = f.properties.adm0_a3; if (!iso || iso === 'VNM' || !f.geometry) continue; (byC[iso] = byC[iso] || []).push(f); }
let total = 0, files = 0;
for (const [iso, feats] of Object.entries(byC)) {
  // nước vắt qua kinh tuyến 180 (Nga, Mỹ, Fiji…): đổi kinh độ âm sang dương cho liền mạch
  let hasE = false, hasW = false;
  for (const f of feats) for (const r of ringsOf(f.geometry)) for (const [lon] of r) { if (lon > 150) hasE = true; if (lon < -150) hasW = true; }
  const fixLon = hasE && hasW ? (lon) => (lon < 0 ? lon + 360 : lon) : (lon) => lon;
  let lat0 = 0, n = 0, minLon = 1e9, maxLon = -1e9, minLat = 1e9, maxLat = -1e9;
  for (const f of feats) for (const r of ringsOf(f.geometry)) for (const [lon0, lat] of r) { const lon = fixLon(lon0); lat0 += lat; n++; minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); }
  lat0 /= n; const cos = Math.cos((lat0 * Math.PI) / 180);
  const sc = 1000 / Math.max((maxLon - minLon) * cos, (maxLat - minLat), 1e-6);
  const P = ([lon, lat]) => [(fixLon(lon) - minLon) * cos * sc + 12, (maxLat - lat) * sc + 12];
  const W = Math.ceil((maxLon - minLon) * cos * sc + 24), H = Math.ceil((maxLat - minLat) * sc + 24);
  const regions = [];
  for (const f of feats) {
    const p = f.properties;
    let d = '', best = 0, c = [0, 0];
    for (const r of ringsOf(f.geometry)) {
      let pts = r.map(P); const a = area(pts);
      if (a < 0.6) continue;
      if (pts.length < 3) continue;
      d += toD(pts, 1);
      if (a > best) { best = a; c = centroid(r.map(P)); }
    }
    if (!d) continue;
    regions.push({ id: String(p.adm1_code || p.iso_3166_2 || p.name).toLowerCase(), name: p.name_vi || p.name || p.name_en || String(p.adm1_code), d, cx: +c[0].toFixed(1), cy: +c[1].toFixed(1) });
  }
  if (!regions.length) continue;
  regions.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const file = path.join(OUT, 'adm1', `${iso}.json`);
  fs.writeFileSync(file, JSON.stringify({ iso, w: W, h: H, regions }));
  total += fs.statSync(file).size; files++;
}
console.log('adm1 files', files, 'total bytes', total);
