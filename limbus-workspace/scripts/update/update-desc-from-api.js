const fs = require('fs');
const path = require('path');

const apiData = JSON.parse(fs.readFileSync(path.join(__dirname, 'egogifts-api.json'), 'utf8'));
let html = fs.readFileSync(path.join(__dirname, 'ego-universal-gifts.html'), 'utf8');

// Strip [[keyword]] brackets → keyword
function stripBrackets(s) {
  return s.replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/[\r\n]+/g, '<br>').trim();
}

// Build name → desc1 map
const apiMap = {};
for (const entry of apiData) {
  const name = entry.egogift.giftName;
  const desc1 = entry.egogift.desc1;
  if (name && desc1) apiMap[name] = stripBrackets(desc1);
}

let updated = 0;
let notFound = [];

for (const [name, newDesc] of Object.entries(apiMap)) {
  // Escape name for regex (handle special chars)
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Escape apostrophes in desc for JS single-quoted string
  const safeDesc = newDesc.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  // Pattern: find name:'NAME' then desc:'...' in the same object block
  // Objects are { ... name:'NAME' ... desc:'OLD' ... } — on same or nearby lines
  // Use a non-greedy match that won't cross object boundaries (no { or })
  const re = new RegExp(
    `(name:\\s*'${escapedName}'[^}]*?desc:\\s*')((?:[^'\\\\]|\\\\.)*)(')`
  );

  if (re.test(html)) {
    html = html.replace(re, `$1${safeDesc}$3`);
    updated++;
  } else {
    // Try double-quoted desc
    const re2 = new RegExp(
      `(name:\\s*'${escapedName}'[^}]*?desc:\\s*")((?:[^"\\\\]|\\\\.)*)("])`
    );
    if (re2.test(html)) {
      html = html.replace(re2, `$1${newDesc.replace(/"/g, '\\"')}$3`);
      updated++;
    } else {
      notFound.push(name);
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'ego-universal-gifts.html'), html, 'utf8');

console.log(`업데이트: ${updated}개`);
console.log(`매칭 실패 (HTML에 없거나 이름 다름): ${notFound.length}개`);
if (notFound.length) {
  console.log('실패 목록:');
  notFound.forEach(n => console.log(' ', n));
}
