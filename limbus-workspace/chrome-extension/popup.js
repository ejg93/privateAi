const statusEl    = document.getElementById('status');
const progressEl  = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const stopBtn     = document.getElementById('stopBtn');

function parseKws(val) { return val.split(',').map(s => s.trim()).filter(Boolean); }

// 단일 페이지 저장
document.getElementById('crawlBtn').addEventListener('click', async () => {
  statusEl.textContent = '페이지 읽는 중...';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const BLOCK = new Set(['DIV','P','H1','H2','H3','H4','H5','H6','LI','TR','TD','TH','BLOCKQUOTE','PRE','BR','HR','SECTION','ARTICLE','HEADER','FOOTER','NAV','ASIDE','TABLE']);
      const SKIP  = new Set(['SCRIPT','STYLE','NOSCRIPT']);
      function extract(node) {
        if (node.nodeType === 3) return node.textContent;
        if (node.nodeType !== 1) return '';
        const tag = node.tagName;
        if (SKIP.has(tag)) return '';
        // display:none 요소 스킵 (숨겨진 플레이스홀더 "[스킬 N] 효과" 등 제거)
        const style = node.getAttribute('style') || '';
        if (/display\s*:\s*none/.test(style)) return '';
        if (tag === 'BR' || tag === 'HR') return '\n';
        // img: 코인 번호 이미지만 [코인N] 으로 변환, 나머지 무시
        if (tag === 'IMG') {
          const alt = (node.getAttribute('alt') || '').trim();
          const m = alt.match(/림버스컴퍼니 (\d+)$/);
          if (m) return `[코인${m[1]}] `;
          return '';
        }
        let text = '';
        for (const child of node.childNodes) text += extract(child);
        return BLOCK.has(tag) ? text + '\n' : text;
      }
      return { url: location.href, content: extract(document.body) };
    }
  });
  const { url, content } = results[0].result;
  try {
    const res  = await fetch('http://localhost:7477', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, content })
    });
    const data = await res.json();
    statusEl.textContent = '✅ ' + data.file;
  } catch (e) {
    statusEl.textContent = '❌ 서버 연결 실패. node crawl_server.js 실행했어?';
  }
});

// 배치 크롤링
document.getElementById('batchBtn').addEventListener('click', async () => {
  const prog = await chrome.runtime.sendMessage({ action: 'getProgress' });
  if (prog.running) { showProgress(prog); startPolling(); return; }

  statusEl.textContent = '링크 수집 중...';
  const includeKws  = parseKws(document.getElementById('includeKw').value);
  const excludePfx  = parseKws(document.getElementById('excludePfx').value);
  const recursive   = document.getElementById('recursive').checked;
  const maxPages    = parseInt(document.getElementById('maxPages').value) || 300;

  const resp = await chrome.runtime.sendMessage({ action: 'collectLinks', includeKws, excludePfx });
  const urls = resp.urls;

  if (!urls || urls.length === 0) { statusEl.textContent = '링크 없음 (키워드 확인)'; return; }

  statusEl.textContent = `${urls.length}개 발견${recursive ? ' (재귀)' : ''} → 시작...`;
  await chrome.runtime.sendMessage({ action: 'startBatch', urls, recursive, includeKws, excludePfx, maxPages });
  startPolling();
});

// 중단
stopBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'stopBatch' });
  statusEl.textContent = '⏹ 중단됨';
  stopPolling();
  stopBtn.style.display    = 'none';
  progressEl.style.display = 'none';
});

const resumeBtn = document.getElementById('resumeBtn');

// 팝업 열릴 때 상태 확인
(async () => {
  const prog = await chrome.runtime.sendMessage({ action: 'getProgress' });
  if (prog.running) {
    showProgress(prog); startPolling();
  } else if (prog.remaining > 0) {
    // 미완료 배치 존재
    resumeBtn.style.display = 'block';
    statusEl.textContent = `⏸ 중단됨 — ${prog.remaining}개 남음`;
  } else if (prog.total > 0) {
    showProgress(prog);
  }
})();

// 이어서 크롤링
resumeBtn.addEventListener('click', async () => {
  resumeBtn.style.display = 'none';
  statusEl.textContent = '재개 중...';
  await chrome.runtime.sendMessage({ action: 'resumeBatch' });
  startPolling();
});

let pollTimer = null;

function startPolling() {
  stopBtn.style.display = 'block'; progressEl.style.display = 'block';
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    const prog = await chrome.runtime.sendMessage({ action: 'getProgress' });
    showProgress(prog);
    if (!prog.running) stopPolling();
  }, 600);
}

function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

function showProgress(prog) {
  if (prog.total === 0) return;
  const pct      = Math.round((prog.done / prog.total) * 100);
  progressEl.style.display = 'block';
  progressBar.style.width  = pct + '%';
  const skip = prog.skipped > 0 ? ` (스킵 ${prog.skipped})` : '';
  if (prog.running) {
    statusEl.textContent  = `⏳ ${prog.done} / ${prog.total}${skip}`;
    stopBtn.style.display = 'block';
  } else {
    statusEl.textContent  = `✅ ${prog.done} / ${prog.total} 완료${skip}`;
    stopBtn.style.display = 'none';
  }
}
