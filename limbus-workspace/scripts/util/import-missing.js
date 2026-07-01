const fs = require('fs');
const api = JSON.parse(fs.readFileSync('egogifts-api.json', 'utf-8'));
const floorsMap = JSON.parse(fs.readFileSync('cardpack-floors.json', 'utf-8'));
let html = fs.readFileSync('ego-universal-gifts.html', 'utf-8');

// HTML에 있는 이름 수집
const htmlNames = new Set();
const nameRe = /name:'([^']+)'/g;
let m;
while ((m = nameRe.exec(html)) !== null) htmlNames.add(m[1]);

// keywordId → section
const SECTION = {
  24:'fire', 25:'bleed', 26:'vibe', 27:'rupt', 28:'sink',
  29:'breath', 30:'charge', 16:'slash', 17:'blunt', 18:'pierce'
};

// desc 클린업
function cleanDesc(s) {
  if (!s) return '';
  return s
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{[^:]+:([^}]+)\}/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

// floors 계산
function getFloors(cardPackAppearances) {
  if (!cardPackAppearances || !cardPackAppearances.length) return null;
  let min = Infinity, max = -Infinity;
  const names = [];
  cardPackAppearances.forEach(p => {
    const pack = floorsMap[p.cardpackTitle];
    if (!pack) return;
    if (pack.floorMin < min) min = pack.floorMin;
    if (pack.floorMax > max) max = pack.floorMax;
    names.push(p.cardpackTitle);
  });
  if (min === Infinity) return null;
  const range = min === max ? `${min}층` : `${min}~${max}층`;
  return names.length === 1 ? `${names[0]} ${range}` : `${names.join('·')} ${range}`;
}

// 섹션별로 추가할 아이템 수집
const toAdd = { fire:[], bleed:[], vibe:[], rupt:[], sink:[], breath:[], charge:[], slash:[], pierce:[], blunt:[], univ:[] };
let added = 0;

api.forEach(r => {
  const g = r.egogift || r;
  const name = g.giftName;
  if (htmlNames.has(name)) return; // 이미 있음

  const grades = r.grades || g.grades || [];
  const tier = parseInt(g.giftTier);
  const synth = g.synthesisYn === 'Y';
  const hard = grades.includes('H');
  const extreme = grades.includes('E');
  const kid = g.keywordId;
  const section = SECTION[kid] || 'univ';
  const desc = cleanDesc(g.desc1 || g.desc3 || g.desc2 || '');
  const floors = getFloors(r.cardPackAppearances);
  const id = `api${r.id}`;

  const flags = [
    extreme ? 'extreme:true' : '',
    hard    ? 'hard:true'    : '',
    synth   ? 'synth:true'   : '',
  ].filter(Boolean);

  const flagStr = flags.length ? flags.join(', ') + ', ' : '';
  const floorsStr = floors ? `floors:'${floors}', ` : '';

  toAdd[section].push(`    { id:'${id}', g:${tier}, ${flagStr}name:'${name}', ${floorsStr}desc:'${desc.replace(/'/g, "\\'")}' },`);
  added++;
});

// 각 섹션 끝에 삽입 (],  패턴 찾아서)
const SECTION_KEYS = Object.keys(toAdd);
for (const sec of SECTION_KEYS) {
  if (!toAdd[sec].length) continue;
  const block = '\n' + toAdd[sec].join('\n');
  // `  ],` 직전의 섹션 끝부분에 삽입
  const marker = new RegExp(`(  ${sec}:\\s*\\[[\\s\\S]*?)(\\s*\\],)`, 'g');
  html = html.replace(marker, (match, body, tail) => body + block + '\n' + tail.trim() + (tail.includes('\n') ? '\n' : ''));
}

fs.writeFileSync('ego-universal-gifts.html', html, 'utf-8');
console.log(`완료: ${added}개 추가`);
SECTION_KEYS.forEach(s => { if (toAdd[s].length) console.log(`  ${s}: +${toAdd[s].length}`); });
