// 우리집 네컷 로컬 서버: 이 PC(127.0.0.1)에서만 접속할 수 있는 정적 파일 서버
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".wasm": "application/wasm",
  ".woff2": "font/woff2", ".tflite": "application/octet-stream", ".txt": "text/plain; charset=utf-8",
};

const URL_ = `http://localhost:${PORT}`;
// --open: 서버가 준비되면 기본 브라우저로 열기 (Windows)
const openBrowser = () => { if (process.argv.includes("--open") && process.platform === "win32") exec(`start "" "${URL_}"`); };

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) { res.writeHead(403).end(); return; }
    if (!(await stat(file)).isFile()) throw new Error("not file");
    res.writeHead(200, { "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("없는 파일이에요");
  }
});
server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    // 이미 켜져 있으면 브라우저만 열기
    console.log(`\n  우리집 네컷이 이미 켜져 있어요:  ${URL_}\n`);
    openBrowser();
    setTimeout(() => process.exit(0), 1500);
  } else { console.error(e); }
});
server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  우리집 네컷이 열렸어요:  ${URL_}\n  이 창을 닫으면 앱도 멈춰요.\n`);
  openBrowser();
});
