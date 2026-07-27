import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const pg=await b.newPage();
pg.on('dialog',d=>d.accept());
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }

// PROD: no test button even if data had _test (prod never carries it)
await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(600);
P(await pg.evaluate(()=>testIds.size===0), 'prod: testIds empty');
P(await pg.evaluate(()=>getComputedStyle(document.getElementById('g-test-only')).display==='none'), 'prod: test button hidden');

// STAGING: _test loaded -> button visible + auto test-only scope
await pg.goto('http://localhost:8765/index.html?staging=1'); await pg.waitForTimeout(700);
P(await pg.evaluate(()=>testIds.size===3), 'staging: testIds=3 from _test');
P(await pg.evaluate(()=>config.scope.by==='test'), 'staging: auto-applied test scope on boot');
P(await pg.evaluate(()=>order.length===3 && order.every(id=>['s70','s71','s72'].includes(id))), 'staging: quiz restricted to 3 test songs');
P(await pg.evaluate(()=>getComputedStyle(document.getElementById('g-test-only')).display!=='none'), 'staging: test button visible');
P(await pg.evaluate(()=>document.getElementById('g-test-only').classList.contains('active')), 'staging: test button active');
P(await pg.evaluate(()=>/테스트 문제 3곡/.test(document.getElementById('g-scope').textContent)), 'staging: scope line shows 테스트 문제 3곡');

// switch to 전체 -> all songs, test button inactive
await pg.evaluate(()=>{ [...document.querySelectorAll('#view-game .chip[data-filter]')].find(x=>x.dataset.filter==='all').click(); });
await pg.waitForTimeout(80);
P(await pg.evaluate(()=>config.scope.by==='all' && order.length>50), '전체 chip exits test scope (all songs)');
P(await pg.evaluate(()=>!document.getElementById('g-test-only').classList.contains('active')), 'test button inactive after 전체');
// back to test-only via button
await pg.evaluate(()=>document.getElementById('g-test-only').click());
await pg.waitForTimeout(80);
P(await pg.evaluate(()=>config.scope.by==='test' && order.length===3), 'test button re-applies test-only (3 songs)');
console.log('done'); await b.close();
