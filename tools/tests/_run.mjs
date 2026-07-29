// 테스트 러너 — 같은 프로세스 안에서 정적 서버를 띄우고(백그라운드 & 없이) 지정한 테스트들을 순차 실행.
// 사용: node tools/tests/_run.mjs album scope tts
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
const ROOT = process.cwd();
const MIME = { '.html':'text/html', '.json':'application/json', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml' };
const srv = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/') p = '/index.html';
    const fp = normalize(join(ROOT, p));
    if (!fp.startsWith(ROOT) || !existsSync(fp) || statSync(fp).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(fp)] || 'application/octet-stream' });
    res.end(readFileSync(fp));
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise((r) => srv.listen(8765, r));
const tests = process.argv.slice(2);
for (const t of tests) {
  console.log('\n##### ' + t + ' #####');
  try { await import('./' + t + '.mjs'); }
  catch (e) { console.log('ERR ' + t + ': ' + (e && e.message)); process.exitCode = 1; }
}
srv.close();
