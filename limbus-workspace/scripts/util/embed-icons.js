const fs = require('fs');
const path = require('path');

let html = fs.readFileSync('ego-universal-gifts.html', 'utf-8');

const iconsDir = './icons';
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

const outPath = 'C:/Users/EJG/Downloads/ego-universal-gifts.html';
fs.writeFileSync(outPath, html, 'utf-8');
console.log(`저장됨: ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
