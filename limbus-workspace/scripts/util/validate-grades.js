const fs = require('fs');
const path = require('path');
const HTML_PATH = path.join(__dirname, '..', '..', 'ego-gift-html', 'ego-universal-gifts.html');
const api = JSON.parse(fs.readFileSync('data/egogifts-api.json', 'utf-8'));
const html = fs.readFileSync(HTML_PATH, 'utf-8');

// API에서 이름→grades 매핑
const nameToGrade = {};
api.forEach(r => {
  const gift = r.egogift || r;
  const name = gift.giftName;
  const grades = (r.grades || gift.grades || []);
  if (name) nameToGrade[name] = grades;
});

// HTML DATA에서 아이템 파싱
const itemRe = /\{\s*id:'([^']+)'([^}]*name:'([^']+)'[^}]*)\}/g;
let m;
const issues = [];

while ((m = itemRe.exec(html)) !== null) {
  const id = m[1];
  const full = m[2];
  const name = m[3];
  const hasHard = /\bhard:true\b/.test(full);
  const hasExtreme = /\bextreme:true\b/.test(full);

  const apiGrades = nameToGrade[name];
  if (!apiGrades) continue; // API에 없는 아이템 스킵

  const apiH = apiGrades.includes('H');
  const apiE = apiGrades.includes('E');
  const apiN = apiGrades.includes('N');

  if (apiH && !hasHard && !hasExtreme) {
    issues.push(`[hard 누락] id:${id} "${name}"`);
  }
  if (apiE && !hasExtreme) {
    issues.push(`[extreme 누락] id:${id} "${name}"`);
  }
  if (hasHard && !apiH && !apiE) {
    issues.push(`[hard 잘못됨] id:${id} "${name}" (API: ${apiGrades})`);
  }
  if (hasExtreme && !apiE) {
    issues.push(`[extreme 잘못됨] id:${id} "${name}" (API: ${apiGrades})`);
  }
}

if (issues.length === 0) {
  console.log('이상 없음 — 모든 hard/extreme 태그 정확');
} else {
  console.log(`이슈 ${issues.length}개:`);
  issues.forEach(i => console.log(' ', i));
}
