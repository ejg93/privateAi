const fs = require('fs');
const path = require('path');

const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'ego-gift-img-map.json'), 'utf8'));
const imgDir = path.join(__dirname, 'ego-gift-images');

// Verify each file exists
const verified = {};
for (const [name, localPath] of Object.entries(map)) {
  const filename = path.basename(localPath);
  if (fs.existsSync(path.join(imgDir, filename))) {
    verified[name] = filename;
  }
}

// Output JS const
const lines = Object.entries(verified).map(([name, file]) => {
  const escaped = name.replace(/'/g, "\\'");
  return `  '${escaped}':'${file}'`;
});

const jsOut = `const GIFT_IMG_BASE = './ego-gift-images/';\nconst GIFT_IMG = {\n${lines.join(',\n')}\n};\n`;
fs.writeFileSync(path.join(__dirname, 'gift-img-const.js'), jsOut, 'utf8');
console.log(`총 ${Object.keys(verified).length}개 매핑 생성`);
console.log('gift-img-const.js 저장 완료');

// Also output just the name→uuid mapping for inspection
const nameList = Object.keys(verified).sort();
console.log('\n이름 목록 (처음 20개):');
nameList.slice(0, 20).forEach(n => console.log('  ' + n));
