// 모드 선택(normal/battle/infinite) 골격 회귀.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const pg=await b.newPage();
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }
await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(500);
await pg.click('#intro-start'); await pg.waitForTimeout(300);
// 모드 카드는 이제 '세부 설정' 접이식 안에 있음 → 클릭 위해 펼침
await pg.evaluate(()=>{ const d=document.querySelector('details.setup-detail'); if(d) d.open=true; }); await pg.waitForTimeout(80);

P(await pg.evaluate(()=>document.querySelectorAll('#mode-cards .mode-card').length===3), '모드 카드 3개');
P(await pg.evaluate(()=>config.mode==='normal'), '기본 모드=normal');
P(await pg.evaluate(()=>document.querySelector('.mode-card[data-mode="normal"]').classList.contains('sel')), '일반 카드 선택 표시');

// 대결 선택 → teamMode·mc ON, 카드 선택 이동
await pg.click('.mode-card[data-mode="battle"]'); await pg.waitForTimeout(150);
P(await pg.evaluate(()=>config.mode==='battle' && config.teamMode===true && config.mc===true), '대결 선택 → mode=battle·팀전ON·4지선다ON');
P(await pg.evaluate(()=>document.querySelector('.mode-card[data-mode="battle"]').classList.contains('sel') && document.getElementById('c-team').checked), '대결 카드 선택 + 팀전 체크 반영');

// 무한 선택 → teamMode OFF(솔로)
await pg.click('.mode-card[data-mode="infinite"]'); await pg.waitForTimeout(150);
P(await pg.evaluate(()=>config.mode==='infinite' && config.teamMode===false), '무한 선택 → mode=infinite·팀전OFF(솔로)');

// 일반 복귀
await pg.click('.mode-card[data-mode="normal"]'); await pg.waitForTimeout(150);
P(await pg.evaluate(()=>config.mode==='normal'), '일반 복귀');

// 텔레메트리: statsModeLabel이 모드를 반영(모드별 이용율)
const lab=await pg.evaluate(()=>({ n:statsModeLabel({mode:'normal',mc:true}), b:statsModeLabel({mode:'battle',teamMode:true,mc:true}), i:statsModeLabel({mode:'infinite',mc:true}) }));
P(lab.n.startsWith('일반') && lab.b.startsWith('대결') && lab.i.startsWith('무한'), `모드별 라벨: ${lab.n} / ${lab.b} / ${lab.i}`);
console.log('done'); await b.close();
