import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const b=await chromium.launch(); const pg=await b.newPage();
pg.on('dialog',d=>d.accept());
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }

// 픽스처를 하드코딩하지 않고, 실제로 서빙되는 svt-data.staging.json의 _test에서 기대값을 파생.
const stg=JSON.parse(readFileSync('svt-data.staging.json','utf8'));
const TEST_IDS=Array.isArray(stg._test)?stg._test:[];
const N=TEST_IDS.length;
console.log(`fixture: staging _test = ${N}곡 [${TEST_IDS.join(', ')}]`);
P(N>0, 'precondition: staging has at least one _test song (없으면 이 테스트 의미 없음)');

// PROD: no test button even if data had _test (prod never carries it)
await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(600);
P(await pg.evaluate(()=>testIds.size===0), 'prod: testIds empty');
P(await pg.evaluate(()=>getComputedStyle(document.getElementById('g-test-only')).display==='none'), 'prod: test button hidden');

// STAGING: _test loaded -> button visible + auto test-only scope
await pg.goto('http://localhost:8765/index.html?staging=1'); await pg.waitForTimeout(700);
P(await pg.evaluate((ids)=>testIds.size===ids.length && ids.every(id=>testIds.has(id)), TEST_IDS), `staging: testIds=${N} matches _test`);
P(await pg.evaluate(()=>config.scope.by==='test'), 'staging: auto-applied test scope on boot');
P(await pg.evaluate((ids)=>order.length===ids.length && order.every(id=>ids.includes(id)), TEST_IDS), `staging: quiz restricted to ${N} test songs`);
P(await pg.evaluate(()=>getComputedStyle(document.getElementById('g-test-only')).display!=='none'), 'staging: test button visible');
P(await pg.evaluate(()=>document.getElementById('g-test-only').classList.contains('active')), 'staging: test button active');
P(await pg.evaluate((n)=>new RegExp('테스트 문제 '+n+'곡').test(document.getElementById('g-scope').textContent), N), `staging: scope line shows 테스트 문제 ${N}곡`);

// switch to 전체 -> all songs, test button inactive
await pg.evaluate(()=>{ [...document.querySelectorAll('#view-game .chip[data-filter]')].find(x=>x.dataset.filter==='all').click(); });
await pg.waitForTimeout(80);
P(await pg.evaluate((n)=>config.scope.by==='all' && order.length>n, N), '전체 chip exits test scope (all songs)');
P(await pg.evaluate(()=>!document.getElementById('g-test-only').classList.contains('active')), 'test button inactive after 전체');
// back to test-only via button
await pg.evaluate(()=>document.getElementById('g-test-only').click());
await pg.waitForTimeout(80);
P(await pg.evaluate((n)=>config.scope.by==='test' && order.length===n, N), `test button re-applies test-only (${N} songs)`);
console.log('done'); await b.close();
