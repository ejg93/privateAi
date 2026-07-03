const fs = require('fs');
const api = JSON.parse(fs.readFileSync('data/egogifts-api.json', 'utf-8'));
const synthIds = api.filter(r => (r.egogift||r).synthesisYn === 'Y').map(r => r.id);

async function fetchRecipe(id) {
  try {
    const res = await fetch(`https://limbus.haneuk.info/api/user/egogift/${id}/recipe`);
    if (!res.ok) return null;
    const data = await res.json();
    return { id, recipes: data.recipes };
  } catch { return null; }
}

async function crawl() {
  const results = [];
  for (let i = 0; i < synthIds.length; i += 10) {
    const batch = synthIds.slice(i, i+10);
    const res = await Promise.all(batch.map(fetchRecipe));
    res.filter(Boolean).forEach(r => results.push(r));
    console.log(`${i+batch.length}/${synthIds.length}`);
  }
  fs.writeFileSync('data/egogift-recipes.json', JSON.stringify(results, null, 2));
  console.log(`완료: ${results.length}개 레시피 저장`);
}
crawl();
