const fs   = require('fs');
const path = require('path');

const CRAWLED = path.join(__dirname, '..', '..', 'crawled');

// 제거할 패턴 (display:none 잔재)
const NOISE_LINE = /^\s*(\[스킬 \d+\] 효과|텍스트)\s*$/;

function cleanContent(text) {
  const lines = text.split('\n');
  const out = [];
  let blankCount = 0;

  for (const line of lines) {
    if (NOISE_LINE.test(line)) continue;  // 노이즈 줄 제거

    if (line.trim() === '') {
      blankCount++;
      if (blankCount <= 2) out.push('');  // 빈 줄 최대 2개
    } else {
      blankCount = 0;
      out.push(line);
    }
  }

  return out.join('\n');
}

function processDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(full);
    } else if (entry.name.endsWith('.md')) {
      const original = fs.readFileSync(full, 'utf8');
      const cleaned  = cleanContent(original);
      if (cleaned !== original) {
        const savedBytes = Buffer.byteLength(original, 'utf8') - Buffer.byteLength(cleaned, 'utf8');
        fs.writeFileSync(full, cleaned, 'utf8');
        console.log(`[정제] ${path.relative(CRAWLED, full)} (${(savedBytes/1024).toFixed(1)}KB 절약)`);
      }
    }
  }
}

console.log('크롤링 데이터 정제 시작...\n');
const before = getDirSize(CRAWLED);
processDir(CRAWLED);
const after = getDirSize(CRAWLED);
console.log(`\n완료. 총 ${((before - after) / 1024 / 1024).toFixed(2)}MB 절약`);

function getDirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += getDirSize(full);
    else total += fs.statSync(full).size;
  }
  return total;
}
