import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const pg=await b.newPage();
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }

await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(600);
P(await pg.evaluate(()=>STAGING===false), 'prod: STAGING=false');
P(await pg.evaluate(()=>STORE_KEY==='svt_lyrics_quiz_v1'), 'prod: store key = base');
P(await pg.evaluate(()=>!document.getElementById('staging-banner')), 'prod: no staging banner');

await pg.goto('http://localhost:8765/index.html?staging=1'); await pg.waitForTimeout(600);
P(await pg.evaluate(()=>STAGING===true), 'staging: STAGING=true');
P(await pg.evaluate(()=>DATA_FILE==='svt-data.staging.json'), 'staging: DATA_FILE = staging');
P(await pg.evaluate(()=>STORE_KEY==='svt_lyrics_quiz_v1__staging'), 'staging: separate store key');
P(await pg.evaluate(()=>!!document.getElementById('staging-banner')), 'staging: banner present');
P(await pg.evaluate(()=>document.body.classList.contains('staging')), 'staging: body.staging class');

// ISOLATION: fresh localStorage, load staging, edit -> only staging key written, prod key stays null
await pg.evaluate(()=>localStorage.clear());
await pg.goto('http://localhost:8765/index.html?staging=1'); await pg.waitForTimeout(600);
await pg.evaluate(()=>{ config.timerSec=99; saveState(); });
const prodKey=await pg.evaluate(()=>localStorage.getItem('svt_lyrics_quiz_v1'));
const stgKey=await pg.evaluate(()=>localStorage.getItem('svt_lyrics_quiz_v1__staging'));
P(prodKey===null, 'staging edits do NOT touch prod store key (fresh)');
P(stgKey && JSON.parse(stgKey).config.timerSec===99, 'staging edits write staging store key');

await pg.goto('http://localhost:8765/index.html?staging=0'); await pg.waitForTimeout(400);
P(await pg.evaluate(()=>STAGING===false), '?staging=0 disables staging');
console.log('done'); await b.close();
