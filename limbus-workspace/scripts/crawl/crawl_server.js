const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT     = 7477;
const SAVE_DIR = path.join(__dirname, "crawled");

function sanitizeSeg(seg) {
  return seg.replace(/[\\*?:"<>|]/g, "_").slice(0, 80).trim();
}

// namu.wiki URL → 저장 경로 세그먼트 배열
function urlToSegments(url) {
  const m = url.match(/namu\.wiki\/w\/([^?#]+)/);
  if (!m) return null;
  const segs = decodeURIComponent(m[1]).split("/").map(sanitizeSeg).filter(Boolean);
  return segs.length ? segs : null;
}

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) + h) + str.charCodeAt(i); h = h & h; }
  return (h >>> 0).toString(16);
}

function resolveFilePath(segs) {
  const filepath = path.join(SAVE_DIR, ...segs.slice(0, -1), segs[segs.length - 1] + ".md");
  // 경로 탈출 방지
  if (!filepath.startsWith(SAVE_DIR + path.sep) && filepath !== SAVE_DIR) return null;
  return filepath;
}

const LOG_FILE = path.join(__dirname, "debug.log");

if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR);

function appendLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line, "utf8");
}

http.createServer((req, res) => {
  const cors = () => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  };

  if (req.method === "OPTIONS") { cors(); res.writeHead(200); res.end(); return; }

  // 디버그 로그 수신
  if (req.method === "POST" && req.url === "/log") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try { appendLog(JSON.parse(body).msg); } catch (_) {}
      cors(); res.writeHead(200); res.end("{}");
    });
    return;
  }

  // 기존 파일 해시 확인
  if (req.method === "GET") {
    const qs  = new URL(req.url, "http://localhost").searchParams;
    const url = qs.get("url");
    if (!url) { cors(); res.writeHead(400); res.end(); return; }
    const segs = urlToSegments(url);
    if (!segs) { cors(); res.writeHead(400); res.end(); return; }
    const filepath = resolveFilePath(segs);
    if (!filepath || !fs.existsSync(filepath)) {
      cors(); res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ exists: false })); return;
    }
    const text  = fs.readFileSync(filepath, "utf8");
    const match = text.match(/^콘텐츠 해시: ([0-9a-f]+)$/m);
    cors(); res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ exists: true, hash: match ? match[1] : null }));
    return;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { url = "", content = "" } = JSON.parse(body);
        const segs = urlToSegments(url);
        if (!segs) { cors(); res.writeHead(400); res.end(); return; }
        const filepath = resolveFilePath(segs);
        if (!filepath) { cors(); res.writeHead(400); res.end(); return; }

        const dir  = path.dirname(filepath);
        fs.mkdirSync(dir, { recursive: true });

        const now         = new Date().toLocaleString("ko-KR");
        const wikiPath    = segs.join("/");
        const contentHash = djb2(content);
        fs.writeFileSync(filepath,
          `# ${wikiPath}\nURL: ${url}\n크롤링 시각: ${now}\n콘텐츠 해시: ${contentHash}\n\n---\n\n${content}`,
          "utf8");

        const relPath = path.relative(SAVE_DIR, filepath);
        console.log(`[저장] ${relPath}`);
        cors(); res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, file: relPath }));
      } catch (e) { cors(); res.writeHead(400); res.end(); }
    });
    return;
  }

  res.writeHead(404); res.end();
}).listen(PORT, "localhost", () => {
  console.log(`크롤 서버 시작 → http://localhost:${PORT}`);
  console.log(`저장 위치 → ${SAVE_DIR}`);
  console.log("Ctrl+C로 종료.\n");
});
