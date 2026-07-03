const fs = require('fs');
const path = require('path');
const HTML_PATH = path.join(__dirname, '..', '..', 'ego-gift-html', 'ego-universal-gifts.html');
const api = JSON.parse(fs.readFileSync('data/egogifts-api.json', 'utf-8'));
const html = fs.readFileSync(HTML_PATH, 'utf-8');

// API 이름→데이터 맵
const byName = {};
api.forEach(r => {
  const g = r.egogift || r;
  const grades = r.grades || g.grades || [];
  byName[g.giftName] = {
    tier: parseInt(g.giftTier),
    synth: g.synthesisYn === 'Y',
    hard: grades.includes('H'),
    extreme: grades.includes('E'),
  };
});

// HTML 아이템 파싱
const itemRe = /\{\s*id:'([^']+)'([^}]*name:'([^']+)'[^}]*)\}/g;
let m;
const issues = [];
let matched = 0;

while ((m = itemRe.exec(html)) !== null) {
  const id = m[1];
  const full = m[2];
  const name = m[3];

  const api = byName[name];
  if (!api) continue;
  matched++;

  // g 파싱
  const gMatch = full.match(/\bg:(\d)/);
  const htmlG = gMatch ? parseInt(gMatch[1]) : null;

  const htmlSynth   = /\bsynth:true\b/.test(full);
  const htmlHard    = /\bhard:true\b/.test(full);
  const htmlExtreme = /\bextreme:true\b/.test(full);

  if (htmlG !== null && htmlG !== api.tier)
    issues.push(`[등급 오류] "${name}" (id:${id}) HTML:${htmlG} API:${api.tier}`);

  if (api.synth && !htmlSynth)
    issues.push(`[synth 누락] "${name}" (id:${id})`);
  if (!api.synth && htmlSynth)
    issues.push(`[synth 잘못됨] "${name}" (id:${id}) — API는 합성 아님`);

  if (api.hard && !htmlHard && !htmlExtreme)
    issues.push(`[hard 누락] "${name}" (id:${id})`);
  if (!api.hard && !api.extreme && htmlHard)
    issues.push(`[hard 잘못됨] "${name}" (id:${id}) — API grades: N`);

  if (api.extreme && !htmlExtreme)
    issues.push(`[extreme 누락] "${name}" (id:${id})`);
  if (!api.extreme && htmlExtreme)
    issues.push(`[extreme 잘못됨] "${name}" (id:${id}) — API grades: N/H`);
}

console.log(`HTML↔API 비교 완료 (매칭된 아이템: ${matched}개)\n`);
if (issues.length === 0) {
  console.log('이상 없음');
} else {
  console.log(`이슈 ${issues.length}개:`);
  issues.forEach(i => console.log(' ', i));
}
