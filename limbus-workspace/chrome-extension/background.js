// service worker 재시작 시 running 리셋 → 팝업에서 Resume 버튼 표시
chrome.storage.local.get(['br'], (data) => {
  if (data.br) chrome.storage.local.set({ br: false, bct: null });
});

const EXTRACT_FUNC = () => {
  const BLOCK = new Set(['DIV','P','H1','H2','H3','H4','H5','H6','LI','TR','TD','TH','BLOCKQUOTE','PRE','BR','HR','SECTION','ARTICLE','HEADER','FOOTER','NAV','ASIDE','TABLE']);
  const SKIP  = new Set(['SCRIPT','STYLE','NOSCRIPT']);
  function extract(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';
    const tag = node.tagName;
    if (SKIP.has(tag)) return '';
    if (tag === 'BR' || tag === 'HR') return '\n';
    let text = '';
    for (const child of node.childNodes) text += extract(child);
    return BLOCK.has(tag) ? text + '\n' : text;
  }
  return { url: location.href, content: extract(document.body) };
};

// 링크 수집: 분류 박스 제외, 포함 키워드, 제외 경로 접두사 필터
const COLLECT_LINKS = (includeKws, excludePrefixes) => {
  const catSelectors = ['.wiki-category','.category-box','.namu-wiki-category','[class*="category"]','[class*="Category"]'];
  const catEls = new Set();
  catSelectors.forEach(s => document.querySelectorAll(s).forEach(el => catEls.add(el)));
  function inCat(el) { let c = el; while (c) { if (catEls.has(c)) return true; c = c.parentElement; } return false; }

  // 나무위키 특수 페이지 경로 접두사
  const SPECIAL = ['특수기능/', '분류:', 'help:', 'thread:', '휴지통/'];

  const seen = new Set();
  const links = [];
  for (const a of document.querySelectorAll('a[href]')) {
    if (inCat(a)) continue;
    let href = a.href.split('?')[0].split('#')[0]; // 쿼리·해시 제거
    if (!href.includes('namu.wiki/w/')) continue;
    if (seen.has(href)) continue;
    const decoded   = decodeURIComponent(href);
    const wikiPath  = decoded.split('/w/')[1] || '';
    if (SPECIAL.some(s => wikiPath.startsWith(s))) continue; // 특수 페이지 제외
    if (includeKws.length > 0 && !includeKws.some(k => decoded.includes(k))) continue;
    if (excludePrefixes.some(p => wikiPath.startsWith(p))) continue;
    seen.add(href);
    links.push(href);
  }
  return links;
};

async function log(msg) {
  try {
    await fetch('http://localhost:7477/log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg })
    });
  } catch (_) {}
}

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) + h) + str.charCodeAt(i); h = h & h; }
  return (h >>> 0).toString(16);
}

function showToast(tabId, msg, color) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (m, bg) => {
      const t = document.createElement('div');
      t.textContent = m;
      t.style.cssText = `position:fixed;top:20px;right:20px;z-index:99999;background:${bg};color:#fff;padding:12px 18px;border-radius:8px;font-size:14px;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.3)`;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 3000);
    },
    args: [msg, color]
  }).catch(() => {});
}

async function crawlCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: EXTRACT_FUNC });
  const { url, content } = results[0].result;
  const res  = await fetch('http://localhost:7477', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, content })
  });
  const data = await res.json();
  showToast(tab.id, '✅ 저장: ' + data.file, '#222');
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'crawl-page') return;
  crawlCurrentTab().catch(e => {
    console.error('크롤링 실패:', e.message);
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab) showToast(tab.id, '❌ 실패: ' + e.message, '#c0392b');
    });
  });
});

// --- 배치 크롤 ---

async function getBatch() {
  const d = await chrome.storage.local.get(['bq','bt','bd','br','bct','bsk','bv','brec','bkw','bex','bmax']);
  return {
    queue:      d.bq   ?? [],
    total:      d.bt   ?? 0,
    done:       d.bd   ?? 0,
    running:    d.br   ?? false,
    currentTab: d.bct  ?? null,
    skipped:    d.bsk  ?? 0,
    visited:    d.bv   ?? [],
    recursive:  d.brec ?? false,
    includeKws: d.bkw  ?? [],
    excludePfx: d.bex  ?? [],
    maxPages:   d.bmax ?? 300
  };
}

async function setBatch(patch) {
  const m = { queue:'bq',total:'bt',done:'bd',running:'br',currentTab:'bct',
               skipped:'bsk',visited:'bv',recursive:'brec',includeKws:'bkw',
               excludePfx:'bex',maxPages:'bmax' };
  const keys = {};
  for (const [k, v] of Object.entries(patch)) if (m[k]) keys[m[k]] = v;
  await chrome.storage.local.set(keys);
}

async function nextInQueue() {
  const b = await getBatch();
  if (!b.running || b.queue.length === 0) { await setBatch({ running: false, currentTab: null }); chrome.alarms.clear('batchWatchdog'); return; }
  const [url, ...rest] = b.queue;
  await setBatch({ queue: rest });
  const tab = await chrome.tabs.create({ url, active: false });
  await setBatch({ currentTab: tab.id });
}

// 30초마다 배치가 멈췄는지 확인 — currentTab이 null인데 queue 남아있으면 재개
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'batchWatchdog') return;
  const b = await getBatch();
  if (!b.running) { chrome.alarms.clear('batchWatchdog'); return; }
  if (b.currentTab === null && b.queue.length > 0) {
    await log('[Watchdog] 배치 멈춤 감지 → 재개');
    await nextInQueue();
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  const b = await getBatch();
  if (tabId !== b.currentTab) return;

  await new Promise(r => setTimeout(r, 1000));

  let saved = false, errored = false;
  try {
    await log(`[탭열림] tabId=${tabId}`);
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: EXTRACT_FUNC });
    const { url, content } = results[0].result;
    await log(`[추출완료] url=${url} contentLen=${content.length}`);
    const newHash = djb2(content);

    // 변경 여부 확인
    let changed = true;
    try {
      const check = await fetch(`http://localhost:7477?url=${encodeURIComponent(url)}`);
      const data  = await check.json();
      if (data.exists && data.hash === newHash) changed = false;
    } catch (e) { await log(`[해시확인 실패] ${e.message}`); }

    await log(`[변경여부] changed=${changed}`);

    if (content.trim().length < 1000) {
      await log(`[스킵-빈문서] ${url}`);
    } else if (changed) {
      const saveRes = await fetch('http://localhost:7477', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, content })
      });
      const saveData = await saveRes.json();
      await log(`[저장결과] status=${saveRes.status} file=${saveData.file}`);
      saved = true;
    }

    // 재귀: 이 페이지의 링크 수집 → 큐에 추가
    if (b.recursive) {
      const b2 = await getBatch();
      if (b2.total < b2.maxPages) {
        const linkResults = await chrome.scripting.executeScript({
          target: { tabId }, func: COLLECT_LINKS, args: [b2.includeKws, b2.excludePfx]
        });
        const newLinks  = linkResults[0].result;
        const visitedSet = new Set(b2.visited);
        const toAdd     = newLinks.filter(u => !visitedSet.has(u))
                                  .slice(0, b2.maxPages - b2.total);
        if (toAdd.length > 0) {
          toAdd.forEach(u => visitedSet.add(u));
          await setBatch({
            queue:   [...b2.queue, ...toAdd],
            total:   b2.total + toAdd.length,
            visited: [...visitedSet]
          });
        }
      }
    }
  } catch (e) {
    await log(`[에러] ${e.message}`);
    errored = true;
  }

  const b3 = await getBatch();
  await setBatch({
    done:       b3.done + 1,
    skipped:    (!saved && !errored) ? b3.skipped + 1 : b3.skipped,
    currentTab: null
  });

  chrome.tabs.remove(tabId).catch(() => {});
  await nextInQueue();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'startBatch') {
    const visited = [...new Set(msg.urls)];
    setBatch({
      queue: msg.urls, total: msg.urls.length, done: 0, running: true,
      currentTab: null, skipped: 0, visited,
      recursive: msg.recursive, includeKws: msg.includeKws,
      excludePfx: msg.excludePfx, maxPages: msg.maxPages
    }).then(() => {
      chrome.alarms.create('batchWatchdog', { periodInMinutes: 0.5 });
      return nextInQueue();
    }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.action === 'getProgress') {
    getBatch().then(b => sendResponse({ done: b.done, total: b.total, running: b.running, skipped: b.skipped, remaining: b.queue.length }));
    return true;
  }
  if (msg.action === 'resumeBatch') {
    getBatch().then(async b => {
      await setBatch({ running: true, currentTab: null });
      chrome.alarms.create('batchWatchdog', { periodInMinutes: 0.5 });
      await nextInQueue();
      sendResponse({ ok: true, remaining: b.queue.length });
    });
    return true;
  }
  if (msg.action === 'stopBatch') {
    getBatch().then(async b => {
      await setBatch({ queue: [], running: false });
      chrome.alarms.clear('batchWatchdog');
      if (b.currentTab) chrome.tabs.remove(b.currentTab).catch(() => {});
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.action === 'collectLinks') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id }, func: COLLECT_LINKS,
        args: [msg.includeKws, msg.excludePfx]
      }).then(r => sendResponse({ urls: r[0].result }));
    });
    return true;
  }
});
