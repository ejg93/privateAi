const fs = require('fs');
const path = require('path');

const EGO_GIFT_HTML_DIR = path.join(__dirname, '..', '..', 'ego-gift-html');
const HTML_PATH = path.join(EGO_GIFT_HTML_DIR, 'ego-universal-gifts.html');

let html = fs.readFileSync(HTML_PATH, 'utf-8');

const iconsDir = path.join(EGO_GIFT_HTML_DIR, 'icons');
const files = fs.readdirSync(iconsDir);

for (const file of files) {
  const filePath = path.join(iconsDir, file);
  const data = fs.readFileSync(filePath);
  const b64 = data.toString('base64');
  const mime = 'image/webp';
  const dataUrl = `data:${mime};base64,${b64}`;
  // ./icons/Burn.webp → data:image/webp;base64,...
  html = html.replaceAll(`./icons/${file}`, dataUrl);
}

const outPath = path.join(EGO_GIFT_HTML_DIR, 'ego-universal-gifts-embedded.html');
fs.writeFileSync(outPath, html, 'utf-8');
console.log(`저장됨: ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
