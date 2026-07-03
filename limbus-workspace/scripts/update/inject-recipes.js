const fs = require('fs');
const path = require('path');
const HTML_PATH = path.join(__dirname, '..', '..', 'ego-gift-html', 'ego-universal-gifts.html');
const raw = JSON.parse(fs.readFileSync('data/egogift-recipes.json', 'utf-8'));
let html = fs.readFileSync(HTML_PATH, 'utf-8');

// RECIPE_DATA 빌드: { resultName: [ [mat1, mat2, ...], [...] ] }
const RECIPE_DATA = {};
raw.forEach(({ recipes }) => {
  recipes.forEach(recipe => {
    const mats = recipe.items.filter(i => i.type === '재료').map(i => i.egogiftName);
    const result = recipe.items.find(i => i.type === '결과')?.egogiftName;
    if (!result) return;
    if (!RECIPE_DATA[result]) RECIPE_DATA[result] = [];
    RECIPE_DATA[result].push(mats);
  });
});

const recipeJs = `const RECIPE_DATA = ${JSON.stringify(RECIPE_DATA, null, 2)};\n\n`;

// DATA const 앞에 삽입
html = html.replace(/const DATA = \{/, recipeJs + 'const DATA = {');

fs.writeFileSync(HTML_PATH, html, 'utf-8');
console.log(`RECIPE_DATA 삽입 완료: ${Object.keys(RECIPE_DATA).length}개 레시피`);
