// 대결(동시전) 모드 회귀 — 승리팀 연출·스코어보드·동점 서든데스·무승부.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const pg=await b.newPage();
pg.on('dialog',d=>d.accept());
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }
await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(400);
await pg.evaluate(()=>{ try{ localStorage.clear(); }catch(e){} }); await pg.reload(); await pg.waitForTimeout(300);

await pg.click('#intro-start'); await pg.waitForTimeout(200);
await pg.evaluate(()=>{ const d=document.querySelector('details.setup-detail'); if(d) d.open=true; }); await pg.waitForTimeout(80);
await pg.click('.mode-card[data-mode="battle"]'); await pg.waitForTimeout(120);
await pg.click('#setup-start'); await pg.waitForTimeout(600);
P(await pg.evaluate(()=>config.mode==='battle' && config.teamMode===true), '대결모드=팀전 ON으로 시작');

// 승리팀 연출: 점수차 → 오버레이에 승리팀
await pg.evaluate(()=>{ config.teamNames=['알파','베타']; teamScores=[3,1]; battleVictory(); });
await pg.waitForTimeout(150);
P(await pg.evaluate(()=>{ const o=document.getElementById('battle-over'); return o && o.style.display!=='none'; }), '대결 종료 → 승리 오버레이');
P(await pg.evaluate(()=>/알파 승리/.test(document.getElementById('battle-over').innerHTML)), '최고점 팀=알파 승리 표시');
P(await pg.evaluate(()=>document.querySelectorAll('#battle-over .bv-row').length===2), '스코어보드 2팀 표시');
P(await pg.evaluate(()=>!!document.querySelector('#battle-over .bv-row.win')), '1위 하이라이트');

// 다시 대결 → 오버레이 닫힘·점수 리셋
await pg.evaluate(()=>document.getElementById('bv-again').click()); await pg.waitForTimeout(250);
P(await pg.evaluate(()=>document.getElementById('battle-over').style.display==='none' && (teamScores[0]||0)===0), '다시 대결 → 리셋');

// 동점(>0) → 서든데스: 오버레이 안 뜨고 문항 진행
const sd=await pg.evaluate(()=>{ config.teamNames=['알파','베타']; teamScores=[2,2]; pos=order.length-1; const before=pos; battleVictory(); return {ovHidden: document.getElementById('battle-over').style.display==='none', advanced: pos>before}; });
P(sd.ovHidden && sd.advanced, '1위 동점(>0) → 서든데스(오버레이X·문항 진행)');

// 0-0 → 무승부 표시
await pg.evaluate(()=>{ teamScores=[0,0]; battleVictory(); }); await pg.waitForTimeout(120);
P(await pg.evaluate(()=>/무승부/.test(document.getElementById('battle-over').innerHTML)), '0-0 → 무승부 표시');
console.log('done'); await b.close();
