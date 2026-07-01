const html = require('fs').readFileSync('ego-universal-gifts.html', 'utf-8');
const dataStart = html.indexOf('const DATA = {');
const dataEnd = html.indexOf('const CHAIN_LAYOUT');
const block = html.slice(dataStart, dataEnd);

const sections = ['slash','pierce','blunt'];
sections.forEach(sec => {
  // 섹션 시작 찾기
  const startIdx = block.indexOf(`\n  ${sec}: [`);
  if (startIdx === -1) { console.log(sec,'없음'); return; }
  // 다음 섹션 시작 찾기 (  word: [ 패턴)
  const nextMatch = block.slice(startIdx+1).search(/\n  \w+: \[/);
  const endIdx = nextMatch === -1 ? block.length : startIdx + 1 + nextMatch;
  const secBlock = block.slice(startIdx, endIdx);

  const itemRe = /id:'([^']+)'[^}]*?name:'([^']+)'[^}]*?desc:'([^']*?)'/g;
  let im;
  console.log(`\n=== ${sec} ===`);
  while ((im = itemRe.exec(secBlock)) !== null) {
    console.log(`  ${im[1]} | ${im[2]}`);
    console.log(`    ${im[3].slice(0,120)}`);
  }
});
