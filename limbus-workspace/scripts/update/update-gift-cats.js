const fs = require('fs');
const path = require('path');
const HTML_PATH = path.join(__dirname, '..', '..', 'ego-gift-html', 'ego-universal-gifts.html');
let html = fs.readFileSync(HTML_PATH, 'utf-8');

// 참/관/타 GIFT_CATS 추가/수정 목록
const newEntries = {
  // === SLASH (참격) ===
  sljj:   ['합위력','피해량'],   // 기본위력+, 피해량+30% (기존: 합위력만)
  sl01:   ['합위력'],            // 합위력+2, 공격레벨
  api66:  ['합위력'],            // 색욕/참격 위력증가
  api237: ['합위력','피해량'],   // 공격레벨+, 참격피해량+
  api238: ['신속'],              // 참격스킬 수만큼 신속 획득
  api239: ['피해량'],            // 속도차3이상 시 참격피해량+15%
  api240: ['합위력','신속'],     // 합위력+1 + 신속1
  api241: ['합위력'],            // 참격 위력+2
  api242: ['합위력','피해량'],   // 합위력+1, 피해량+10~20%
  api243: ['피해량'],            // 방어레벨감소2 부여 (실질 피해량↑)
  api244: ['합위력'],            // 스킬1 합위력+1, 공격레벨감소 부여
  api245: ['피해량'],            // 참격피해량+10~40%
  api246: ['신속','피해량','생존'], // 신속2, 참격피해량+, 받는피해감소
  api247: ['합위력'],            // 참격위력증가1~2
  api248: ['합위력'],            // 공격레벨증가+, 참격위력증가
  api249: ['피해량'],            // 참격내성+0.3 (적 약점강화)
  api252: ['합위력','피해량'],   // 참격피해량+50%, 코인위력+1~3
  api253: ['피해량'],            // 피해량+(40/코인수)%
  api254: ['합위력','피해량','생존'], // 참격위력증가2, 참격피해량+35%, 보호막
  api255: ['합위력','피해량'],   // 참격위력증가2, 참격피해량+35%
  api256: ['합위력','피해량'],   // 참격위력증가2, 피해량+35%
  api438: ['피해량'],            // 호흡1당 참격피해량+1%
  api440: ['피해량'],            // 참격피해량증가1, 크리티컬피해량증가1
  api441: ['합위력','피해량'],   // 참격내성+0.3, 공격레벨+2, 참격피해량+
  api443: ['피해량'],            // 방어레벨감소1 부여, 피해량+3%

  // === PIERCE (관통) ===
  pcjj:   ['합위력','피해량'],   // 기본위력+2, 피해량+15%+속도차 (기존: 합위력만)
  pc03:   ['합위력','피해량'],   // 합위력+1, 탄환피해량+(40/코인수)%
  pc01:   ['합위력','피해량'],   // 합위력+1, 피해량+20% (기존: 합위력만)
  pc02:   ['합위력'],            // 합위력+2, 공격레벨증가
  api257: ['합위력','피해량'],   // 공격레벨+, 신속3이상시 피해량+
  api258: ['피해량'],            // 방어레벨감소2 부여
  api259: ['피해량'],            // 관통피해량증가1
  api260: ['합위력'],            // 관통위력+2
  api261: ['신속'],              // 속박부여+신속1
  api263: ['신속','피해량'],     // 신속1, 관통피해량증가1
  api265: ['합위력'],            // 공격레벨+2, 합위력+
  api266: ['피해량'],            // 관통내성+0.3
  api267: ['합위력','피해량'],   // 공격위력증가2, 피해량+(50/코인수)%
  api397: ['합위력','신속'],     // 신속2, 공격레벨증가4

  // === BLUNT (타격) ===
  bljj:   ['합위력','피해량'],   // 기본위력+2, 피해량+20% (기존: 합위력만)
  bl02:   ['합위력','피해량'],   // 공격레벨+1, 피해량증가1~2
  bl01:   ['합위력'],            // 합위력+2, 공격레벨증가
  // bl03, bl04 이미 정확함 → 건드리지 않음
  api270: ['신속'],              // 신속1~3
  api271: ['합위력','피해량'],   // 공격레벨+, 타격피해량+(10+버린스킬×5)%
  api272: ['피해량'],            // 정신력고정피해2, 피해량+10%
  api274: ['피해량','생존'],     // 타격피해+3 고정, 체력회복
  api275: ['합위력'],            // 타격위력+2
  api276: ['피해량'],            // 방어레벨감소2 부여
  api277: ['합위력','피해량'],   // 합위력+1, 코인위력+1, 피해량+
  api278: ['피해량'],            // 피해량+10~40%
  api279: ['합위력'],            // 공격레벨+(코인수-1~코인수)
  api280: ['합위력','피해량'],   // 공격레벨증가1, 타격피해량+5~15%
  api284: ['합위력','피해량'],   // 공격레벨증가, 타격피해량+5~15%
  api374: ['합위력'],            // 타격위력증가1
  api375: ['합위력'],            // 합위력증가1
  api424: ['피해량'],            // 타격내성+0.3
  api426: ['생존'],              // 체력회복, 정신력회복
  api429: ['합위력','피해량'],   // 공격레벨증가3, 기본위력+1, 피해량+(30/코인수)%
};

// GIFT_CATS 블록 찾기
const gcStart = html.indexOf('const GIFT_CATS = {');
const gcEnd = html.indexOf('\n};', gcStart) + 3;
const gcBlock = html.slice(gcStart, gcEnd);

// 각 항목 업데이트 또는 추가
let updatedBlock = gcBlock;

for (const [id, cats] of Object.entries(newEntries)) {
  const catStr = JSON.stringify(cats).replace(/"/g, "'");
  const pattern = new RegExp(`${id}:\\[([^\\]]+)\\]`);

  if (pattern.test(updatedBlock)) {
    // 기존 항목 업데이트
    updatedBlock = updatedBlock.replace(pattern, `${id}:${catStr}`);
  } else {
    // 새 항목 추가 — 마지막 줄 직전(};)에 추가
    updatedBlock = updatedBlock.replace('\n};', `\n  ${id}:${catStr},\n};`);
  }
}

html = html.slice(0, gcStart) + updatedBlock + html.slice(gcEnd);
fs.writeFileSync(HTML_PATH, html, 'utf-8');

// 검증
const verifyBlock = html.slice(html.indexOf('const GIFT_CATS = {'), html.indexOf('\n};', html.indexOf('const GIFT_CATS = {')) + 3);
const ids = Object.keys(newEntries);
const missing = ids.filter(id => !verifyBlock.includes(id + ':'));
console.log(`처리: ${ids.length}개`);
if (missing.length) console.log('누락:', missing);
else console.log('모두 반영됨');
