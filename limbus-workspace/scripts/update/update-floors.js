const fs = require('fs');
const path = require('path');
const HTML_PATH = path.join(__dirname, '..', '..', 'ego-gift-html', 'ego-universal-gifts.html');
const raw = JSON.parse(fs.readFileSync('data/ego-gifts-raw.json', 'utf-8'));
const floorsMap = JSON.parse(fs.readFileSync('data/cardpack-floors.json', 'utf-8'));

const nameToFloor = {};
raw.forEach(item => {
  if (!item.packs || item.packs.length === 0) return;
  let minFloor = Infinity, maxFloor = -Infinity;
  const packNames = [];
  item.packs.forEach(packName => {
    const pack = floorsMap[packName];
    if (!pack) return;
    if (pack.floorMin < minFloor) minFloor = pack.floorMin;
    if (pack.floorMax > maxFloor) maxFloor = pack.floorMax;
    packNames.push(packName);
  });
  if (minFloor === Infinity) return;
  const packStr = packNames.length === 1 ? packNames[0] : packNames.join('·');
  const floorStr = minFloor === maxFloor ? `${minFloor}층` : `${minFloor}~${maxFloor}층`;
  nameToFloor[item.name] = `${packStr} ${floorStr}`;
});

let html = fs.readFileSync(HTML_PATH, 'utf-8');
let count = 0;

for (const name of Object.keys(nameToFloor)) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(name:'${escaped}',\\s*)(desc:)`, 'g');
  if (re.test(html)) {
    html = html.replace(
      new RegExp(`(name:'${escaped}',\\s*)(desc:)`, 'g'),
      `name:'${name}', floors:'${nameToFloor[name]}', $2`
    );
    count++;
    console.log('Updated:', name, '->', nameToFloor[name]);
  }
}

// Add hard:true to u66 (부화하지 않은 불씨) — no normal difficulty
html = html.replace(
  "{ id:'u66',  g:4, name:'부화하지 않은 불씨'",
  "{ id:'u66',  g:4, hard:true, name:'부화하지 않은 불씨'"
);
console.log('Added hard:true to u66');

fs.writeFileSync(HTML_PATH, html, 'utf-8');
console.log('Done, updated', count, 'items');
