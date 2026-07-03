const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', '..', 'ego-gift-html', 'ego-gift-images');
const MAP_OUT = path.join(__dirname, '..', '..', 'data', 'ego-gift-img-map.json');
const BASE = 'https://limbus.haneuk.info';
const MAX_ID = 600;
const CONCURRENCY = 8;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode === 404) { res.resume(); return resolve(null); }
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) { res.resume(); file.close(); fs.unlink(dest, () => {}); return resolve(false); }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(true)));
    });
    req.on('error', () => { file.close(); fs.unlink(dest, () => {}); resolve(false); });
    req.setTimeout(15000, () => { req.destroy(); file.close(); fs.unlink(dest, () => {}); resolve(false); });
  });
}

async function processId(id) {
  const buf = await get(`${BASE}/api/user/egogift/${id}`);
  if (!buf) return null;
  try {
    const data = JSON.parse(buf.toString());
    const gift = data.egogift;
    const thumb = data.thumbnail;
    if (!gift || !thumb || !thumb.path) return null;
    const name = gift.giftName;
    const imgPath = thumb.path; // e.g. /uploads/EGO_GIFT/original/uuid.webp
    const filename = path.basename(imgPath);
    const dest = path.join(OUT_DIR, filename);
    let ok = true;
    if (!fs.existsSync(dest)) {
      ok = await downloadFile(BASE + imgPath, dest);
    }
    if (ok) {
      process.stdout.write(`  [${id}] ${name} → ${filename}\n`);
      return { id, name, filename, localPath: `./ego-gift-images/${filename}` };
    }
    return null;
  } catch { return null; }
}

async function runBatch(ids) {
  return Promise.all(ids.map(id => processId(id)));
}

(async () => {
  console.log(`다운로드 시작: ID 1~${MAX_ID}, 동시 ${CONCURRENCY}개`);
  const map = {}; // name → localPath
  let found = 0;

  for (let start = 1; start <= MAX_ID; start += CONCURRENCY) {
    const batch = [];
    for (let i = start; i < start + CONCURRENCY && i <= MAX_ID; i++) batch.push(i);
    const results = await runBatch(batch);
    for (const r of results) {
      if (r) { map[r.name] = r.localPath; found++; }
    }
    if (start % 50 === 1) console.log(`  진행: ${start}/${MAX_ID} (수집 ${found}개)`);
  }

  fs.writeFileSync(MAP_OUT, JSON.stringify(map, null, 2), 'utf8');
  console.log(`\n완료: ${found}개 이미지 수집`);
  console.log(`매핑 저장: ${MAP_OUT}`);
  console.log(`이미지 폴더: ${OUT_DIR}`);
})();
