import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const pg=await b.newPage();
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }
await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(700);
// album loaded from svt-data.json (not null)
const albumKeys=await pg.evaluate(()=>album?Object.keys(album).length:0);
P(albumKeys>=61, `album loaded from svt-data.json (${albumKeys} keys, >=61)`);
P(await pg.evaluate(()=>albumOf('s14') && albumOf('s14').year===2015), 'albumOf(s14) year=2015 from data');
// hint builds year from data (buildHints는 6개 후보 중 3개를 셔플·slice하므로 여러 번 시도해 결정적으로 확인)
P(await pg.evaluate(()=>{ for(let i=0;i<40;i++){ const hs=buildHints(songById('s14')); if(JSON.stringify(hs).includes('2015')) return true; } return false; }), 'buildHints can include year from album data');
console.log('done'); await b.close();
