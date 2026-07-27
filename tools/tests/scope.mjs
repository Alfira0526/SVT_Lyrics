import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const url='file:///home/user/SVT_Lyrics/index.html';
const b=await chromium.launch(); const pg=await b.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
pg.on('dialog',d=>d.accept());
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }

await pg.goto(url); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(400);
await pg.evaluate(()=>{ const i=document.getElementById("intro"); if(i) i.classList.add("hide"); });

P(await pg.evaluate(()=>config.scope.by==='all'), 'default scope = all');
P(await pg.evaluate(()=>scopeCount('unit','unit')===28 && scopeCount('unit','full')===28), 'unit 28 / full 28');
P(await pg.evaluate(()=>scopeCount('diff','상')===21), 'diff 상 count = 21');
// era axis removed
P(await pg.evaluate(()=>typeof SCOPE_DEFS.era==='undefined'), 'era axis removed from SCOPE_DEFS');
P(await pg.evaluate(()=>typeof eraBucket==='undefined'), 'eraBucket removed');

await pg.click('#intro-start'); await pg.waitForTimeout(200);
await pg.evaluate(()=>{ const i=document.getElementById("intro"); if(i) i.classList.add("hide"); });
// setup dims: only all/diff/unit
const dims=await pg.evaluate(()=>[...document.querySelectorAll('#scope-dims [data-dim]')].map(x=>x.dataset.dim));
P(JSON.stringify(dims)===JSON.stringify(['all','diff','unit']), 'scope dims = all/diff/unit (got '+JSON.stringify(dims)+')');

// pick 구성 -> 유닛곡
await pg.evaluate(()=>{ [...document.querySelectorAll('#scope-dims [data-dim]')].find(x=>x.dataset.dim==='unit').click(); });
await pg.waitForTimeout(80);
P(await pg.evaluate(()=>config.scope.by==='unit' && config.scope.val==='full'), 'clicking 구성 auto-selects first (full)');
await pg.evaluate(()=>{ [...document.querySelectorAll('#scope-vals .chip')].find(x=>/유닛곡/.test(x.textContent)).click(); });
await pg.waitForTimeout(80);
P(await pg.evaluate(()=>config.scope.val==='unit'), 'selecting 유닛곡 sets scope');

await pg.evaluate(()=>{ config.mc=true; config.teamMode=false; config.timerOn=false; quizCount=null; startNewGame(true); document.querySelector('nav.tabs button[data-view="game"]').click(); const i=document.getElementById("intro"); if(i) i.classList.add("hide"); });
await pg.waitForTimeout(150);
P(await pg.evaluate(()=>order.length===28 && order.every(id=>isUnitSong(songById(id)))), 'game order restricted to 28 unit songs');
P(await pg.evaluate(()=>/유닛곡/.test(document.getElementById('g-scope').textContent)), 'in-game scope indicator shows 유닛곡');

// in-game diff chip
await pg.evaluate(()=>{ [...document.querySelectorAll('#view-game .chip[data-filter]')].find(x=>x.dataset.filter==='상').click(); });
await pg.waitForTimeout(80);
P(await pg.evaluate(()=>config.scope.by==='diff' && order.every(id=>songById(id).diff==='상')), 'in-game 상 chip sets diff scope');
await pg.evaluate(()=>{ [...document.querySelectorAll('#view-game .chip[data-filter]')].find(x=>x.dataset.filter==='all').click(); });
await pg.waitForTimeout(60);
P(await pg.evaluate(()=>config.scope.by==='all' && order.length===56), '전체 resets to all (56)');

P(errs.length===0, 'no page errors (errs='+errs.length+')');
console.log('done');
await b.close();
