const fs = require('fs');
const path = require('path');
const HTML_PATH = path.join(__dirname, '..', '..', 'ego-gift-html', 'ego-universal-gifts.html');
let html = fs.readFileSync(HTML_PATH, 'utf-8');

const original = `const CHAIN_LAYOUT = {
  fire:   [{ sources:['f11'],       targets:['f12'],               logic:'any' }],
  rupt:   [{ sources:['r12','r02'], targets:['r01'],               logic:'any' }],
  sink:   [{ sources:['s14','s16'], targets:['s06'],               logic:'any' }],
  breath: [{ sources:['br09'],      targets:['br05','br15','br13'], logic:'any' }],
  charge: [
    { sources:['c13','c11'], targets:['c01'], logic:'any' },
    { sources:['c13','c11'], targets:['c05'], logic:'all' },
  ],
};`;

// 손상된 CHAIN_LAYOUT 블록 전체를 찾아 교체
// const CHAIN_LAYOUT = { ... }; 블록을 정규식으로 찾기
const broken = html.match(/const CHAIN_LAYOUT = \{[\s\S]*?\};\r?\n\r?\nconst CHAIN_IDS/);
if (!broken) {
  console.error('CHAIN_LAYOUT 블록을 찾지 못함');
  process.exit(1);
}
html = html.replace(/const CHAIN_LAYOUT = \{[\s\S]*?\};\r?\n\r?\nconst CHAIN_IDS/, original + '\r\n\r\nconst CHAIN_IDS');
fs.writeFileSync(HTML_PATH, html, 'utf-8');
console.log('CHAIN_LAYOUT 복구 완료');
