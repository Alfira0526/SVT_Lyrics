import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const pg=await b.newPage();
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }
await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(700);
// album loaded from svt-data.json (not null)
P(await pg.evaluate(()=>album && Object.keys(album).length===56), 'album loaded from svt-data.json (56 keys)');
P(await pg.evaluate(()=>albumOf('s14') && albumOf('s14').year===2015), 'albumOf(s14) year=2015 from data');
// hint builds year from data
P(await pg.evaluate(()=>{ const hs=buildHints(songById('s14')); return JSON.stringify(hs).includes('2015'); }), 'buildHints includes year from album data');
console.log('done'); await b.close();
