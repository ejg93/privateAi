const fs = require('fs');
const api = JSON.parse(fs.readFileSync('egogifts-api.json', 'utf-8'));
const html = fs.readFileSync('ego-universal-gifts.html', 'utf-8');

// HTML에서 name 전부 추출
const htmlNames = new Set();
const itemRe = /name:'([^']+)'/g;
let m;
while ((m = itemRe.exec(html)) !== null) htmlNames.add(m[1]);

// API 아이템 분류
const missing = [];   // HTML에 없는 API 아이템
const matched = [];   // 일치

api.forEach(r => {
  const g = r.egogift || r;
  const name = g.giftName;
  const tier = parseInt(g.giftTier);
  const grades = (r.grades || g.grades || []).join('/');
  const synth = g.synthesisYn === 'Y';
  const keyword = r.keyword?.keywordName || '?';

  if (!htmlNames.has(name)) {
    missing.push({ name, tier, grades, synth, keyword });
  } else {
    matched.push(name);
  }
});

console.log(`총 API 아이템: ${api.length}개`);
console.log(`HTML 매칭: ${matched.length}개`);
console.log(`HTML 누락: ${missing.length}개\n`);

// 키워드별 그룹
const byKeyword = {};
missing.forEach(i => {
  (byKeyword[i.keyword] = byKeyword[i.keyword] || []).push(i);
});

Object.entries(byKeyword).sort().forEach(([kw, items]) => {
  console.log(`[${kw}]`);
  items.forEach(i => {
    const flags = [
      `${i.tier}등급`,
      i.grades !== 'N' ? i.grades : '일반',
      i.synth ? '합성' : ''
    ].filter(Boolean).join(' ');
    console.log(`  ${i.name} (${flags})`);
  });
});

// HTML에 있는데 API에 없는 것 (이름 불일치 가능성)
const apiNames = new Set(api.map(r => (r.egogift || r).giftName));
const htmlOnly = [];
const nameRe2 = /\{\s*id:'([^']+)'[^}]*name:'([^']+)'/g;
let m2;
while ((m2 = nameRe2.exec(html)) !== null) {
  if (!apiNames.has(m2[2])) htmlOnly.push({ id: m2[1], name: m2[2] });
}
if (htmlOnly.length) {
  console.log(`\n[HTML에만 있음 — API 이름 불일치 의심]`);
  htmlOnly.forEach(i => console.log(`  id:${i.id} "${i.name}"`));
}
