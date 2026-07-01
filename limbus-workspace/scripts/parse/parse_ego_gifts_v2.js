'use strict';
const fs = require('fs');

const BASE_DIR = String.raw`C:\Users\EJG\Downloads\privateAi\limbus-workspace\crawled\Limbus Company\거울 던전\E.G.O 기프트`;
const OUTPATH  = String.raw`C:\Users\EJG\Downloads\privateAi\limbus-workspace\ego-gifts-raw.json`;

const GRADE_MAP = { 'Ⅰ': 1, 'Ⅱ': 2, 'Ⅲ': 3, 'Ⅳ': 4 };
const KW_7      = new Set(['화상','출혈','진동','파열','침잠','호흡','충전']);
const KW_OTHER  = new Set(['참격','관통','타격','범용']);
const ALL_KW    = new Set([...KW_7, ...KW_OTHER]);
const ENTRY_RE  = /^([ⅠⅡⅢⅣ])\s+(.+)$/;
const OBTAIN_RE = /이벤트에서|선택지 판정|선택 시 획득|드롭|상점에서|팩에서|입수할 수 있|시작 기프트 항목/;
const PACK_RE   = /'([^']+)'/g;

function readLines(filepath) {
  return fs.readFileSync(filepath, 'utf-8').split('\n').map(l => l.replace(/\r$/, '').trim());
}

function parseDifficulty(lines) {
  for (const l of lines.slice(0, 15)) {
    if (l.includes('익스트림 난이도 한정')) return 'extreme';
    if (l.includes('하드 난이도 한정'))    return 'hard';
  }
  return 'normal';
}

function parseSynthesis(lines) {
  return lines.slice(0, 15).some(l => l.includes('합성 기프트'));
}

function parsePacks(lines) {
  const packs = new Set();
  for (const l of lines.slice(0, 15)) {
    let m;
    while ((m = PACK_RE.exec(l)) !== null) packs.add(m[1]);
  }
  return [...packs];
}

function parseEntry(grade, name, lines, defaultKeyword) {
  const gift = {
    name,
    grade,
    keyword:        defaultKeyword || null,
    difficulty:     parseDifficulty(lines),
    enhanceable:    false,
    synthesis:      parseSynthesis(lines),
    start_gift:     false,
    related_entity: null,
    effect:         null,
    obtain:         null,
    packs:          parsePacks(lines),
  };

  const n = lines.length;

  // keyword
  for (const l of lines) {
    if (ALL_KW.has(l) && !gift.keyword) { gift.keyword = l; break; }
  }

  // related_entity
  for (let i = 0; i < n; i++) {
    if (lines[i].startsWith('환상체:')) {
      const e = lines[i].slice(4).replace(/\[\d+\]/g, '').trim();
      gift.related_entity = (e && !e.includes('불명')) ? e : null;
    }
  }

  // enhanceable
  for (let i = 0; i < n; i++) {
    if (lines[i] === '강화 여부') {
      for (let j = i+1; j < Math.min(i+6, n); j++) {
        if (lines[j] === '가능') { gift.enhanceable = true;  break; }
        if (lines[j] === '불가') { gift.enhanceable = false; break; }
      }
      break;
    }
  }

  // effect
  const effIdx = lines.indexOf('효과');
  if (effIdx >= 0) {
    const slice = lines.slice(effIdx+1);
    const hasBasic = slice.slice(0, 15).includes('기본 효과');
    const effLines = [];
    if (hasBasic) {
      let in_ = false;
      for (const l of slice) {
        if (l === '기본 효과') { in_ = true; continue; }
        if (in_) {
          if (l === '+') break;
          if (l) effLines.push(l);
        }
      }
    } else {
      for (const l of slice) {
        if (l === '언어별 표기') break;
        if (l === '+') break;
        if (l) effLines.push(l);
      }
    }
    gift.effect = effLines.length ? effLines.join('\n') : null;
  }

  // obtain + start_gift
  const langIdx = lines.indexOf('언어별 표기');
  if (langIdx >= 0) {
    let skip = 0, postStart = langIdx + 1;
    for (let i = langIdx+1; i < n; i++) {
      if (lines[i]) { skip++; if (skip >= 3) { postStart = i+1; break; } }
    }
    const STOP_RE = /^\d+\.\s.+\[편집\]|^\[다크모드\]/;
    const postLines = [];
    for (let i = postStart; i < n; i++) {
      const l = lines[i];
      if (!l || l.length > 350) continue;
      if (STOP_RE.test(l)) break;
      postLines.push(l);
    }
    const obtainParts = postLines.filter(l => OBTAIN_RE.test(l));
    gift.obtain = obtainParts.length ? obtainParts.join('\n') : null;
    gift.start_gift = obtainParts.some(l => l.includes('시작 기프트 항목'));
  }

  return gift;
}

function parseFile(filepath, defaultKeyword) {
  const lines = readLines(filepath);
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    const m = ENTRY_RE.exec(lines[i]);
    if (m && GRADE_MAP[m[1]] !== undefined) {
      entries.push({ idx: i, grade: GRADE_MAP[m[1]], name: m[2].trim() });
    }
  }
  return entries.map((e, ei) => {
    const end = ei+1 < entries.length ? entries[ei+1].idx : lines.length;
    return parseEntry(e.grade, e.name, lines.slice(e.idx, end), defaultKeyword);
  });
}

// 특정 테마팩 전용 기프트 — 팩 이름을 섹션에서도 추출
function parsePackFile(filepath) {
  const lines = readLines(filepath);
  const entries = [];
  let currentPackName = null;

  // 섹션 헤더 패턴: "2.3.7. 7.5장 LCB 정기검진[편집]"
  const SECTION_RE = /^\d+\.\d+\.?\d*\.\s+(?:\d+\.?\d*장\s+)?(.+?)(?:\[편집\])?$/;

  for (let i = 0; i < lines.length; i++) {
    const sm = SECTION_RE.exec(lines[i]);
    if (sm) {
      const candidate = sm[1].trim();
      // 숫자만 있는 건 제외 (순번)
      if (candidate && !/^\d+$/.test(candidate)) currentPackName = candidate;
    }
    const m = ENTRY_RE.exec(lines[i]);
    if (m && GRADE_MAP[m[1]] !== undefined) {
      entries.push({ idx: i, grade: GRADE_MAP[m[1]], name: m[2].trim(), sectionPack: currentPackName });
    }
  }

  return entries.map((e, ei) => {
    const end = ei+1 < entries.length ? entries[ei+1].idx : lines.length;
    const gift = parseEntry(e.grade, e.name, lines.slice(e.idx, end), null);
    // 섹션에서 뽑은 팩 이름도 추가
    if (e.sectionPack && !gift.packs.includes(e.sectionPack)) {
      gift.packs.push(e.sectionPack);
    }
    return gift;
  });
}

const all = [
  ...parseFile(`${BASE_DIR}\\기본 7키워드 기프트.md`),
  ...parseFile(`${BASE_DIR}\\기본 7키워드 외 기프트.md`),
  ...parsePackFile(`${BASE_DIR}\\특정 테마팩 전용 기프트.md`),
];

// stats
const byKw   = {}, byDiff = {}, synth = all.filter(g=>g.synthesis).length;
const startG = all.filter(g=>g.start_gift).length;
const hasPack = all.filter(g=>g.packs.length).length;
for (const g of all) {
  byKw[g.keyword]   = (byKw[g.keyword]   || 0) + 1;
  byDiff[g.difficulty] = (byDiff[g.difficulty] || 0) + 1;
}
console.log(`총 ${all.length}개`);
console.log('키워드별:', byKw);
console.log('난이도별:', byDiff);
console.log(`synthesis:${synth} start_gift:${startG} packs있음:${hasPack}`);
const noKw = all.filter(g=>!g.keyword).map(g=>g.name);
if (noKw.length) console.warn('키워드 없음:', noKw.slice(0,10));

fs.writeFileSync(OUTPATH, JSON.stringify(all, null, 2), 'utf-8');
console.log('저장:', OUTPATH);
