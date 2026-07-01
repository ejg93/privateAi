const fs = require('fs');

const BASE = 'https://limbus.haneuk.info/api/user/egogift/';
const MAX = 500;
const CONCURRENCY = 10;
const OUT = 'egogifts-api.json';

async function fetchGift(id) {
  try {
    const res = await fetch(`${BASE}${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return { id, ...data };
  } catch {
    return null;
  }
}

async function crawl() {
  const results = [];
  for (let i = 1; i <= MAX; i += CONCURRENCY) {
    const ids = [];
    for (let j = i; j < i + CONCURRENCY && j <= MAX; j++) ids.push(j);
    const batch = await Promise.all(ids.map(fetchGift));
    const valid = batch.filter(Boolean);
    results.push(...valid);
    const found = valid.length;
    console.log(`${i}-${Math.min(i+CONCURRENCY-1, MAX)}: ${found}개 발견 (누계 ${results.length})`);
  }
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n완료: ${results.length}개 저장 → ${OUT}`);

  // 등급 통계
  const gradeMap = {};
  results.forEach(r => {
    const g = (r.egogift?.grades || r.grades || []).join(',') || '?';
    gradeMap[g] = (gradeMap[g] || 0) + 1;
  });
  console.log('grades 분포:', gradeMap);
}

crawl();
