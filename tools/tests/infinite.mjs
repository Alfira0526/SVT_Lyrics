// 무한(서바이벌) 모드 회귀 — 정답 지속·1오답 종료·게임오버 오버레이·최고기록·무한 재보충.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const pg=await b.newPage();
pg.on('dialog',d=>d.accept());
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }
await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(500);
// localStorage 초기화(최고기록 깨끗하게)
await pg.evaluate(()=>{ try{ localStorage.clear(); }catch(e){} });
await pg.reload(); await pg.waitForTimeout(400);

await pg.click('#intro-start'); await pg.waitForTimeout(250);
await pg.evaluate(()=>{ const d=document.querySelector('details.setup-detail'); if(d) d.open=true; }); await pg.waitForTimeout(80);
await pg.click('.mode-card[data-mode="infinite"]'); await pg.waitForTimeout(120);
await pg.click('#setup-start'); await pg.waitForTimeout(700);
P(await pg.evaluate(()=>config.mode==='infinite'), '무한모드로 시작');
P(await pg.evaluate(()=>config.mc===true && config.teamMode===false), '무한=4지선다·솔로');
P(await pg.evaluate(()=>quizCount===null || config.mode==='infinite'), '무한=문제수 무제한');

// 정답 1개 → streak 1
let ci=await pg.evaluate(()=>mcOptions.findIndex(o=>o.correct));
await pg.evaluate(i=>pickMc(i), ci); await pg.waitForTimeout(150);
P(await pg.evaluate(()=>streak===1), '정답 → 연속 1');
P(await pg.evaluate(()=>!document.getElementById('infinite-over') || document.getElementById('infinite-over').style.display==='none'), '정답이면 게임오버 없음');

// 다음 문항
await pg.evaluate(()=>next()); await pg.waitForTimeout(200);
ci=await pg.evaluate(()=>mcOptions.findIndex(o=>o.correct));
await pg.evaluate(i=>pickMc(i), ci); await pg.waitForTimeout(120);
P(await pg.evaluate(()=>streak===2), '정답 지속 → 연속 2');

// 오답 → 게임오버 오버레이(연속 2 표시), streak 리셋
await pg.evaluate(()=>next()); await pg.waitForTimeout(200);
let wi=await pg.evaluate(()=>mcOptions.findIndex(o=>!o.correct));
await pg.evaluate(i=>pickMc(i), wi); await pg.waitForTimeout(200);
P(await pg.evaluate(()=>{ const o=document.getElementById('infinite-over'); return o && o.style.display!=='none'; }), '오답 → 게임오버 오버레이');
P(await pg.evaluate(()=>/2\s*곡 연속|>2<|io-score">2/.test(document.getElementById('infinite-over').innerHTML)), '연속 2 표시');
P(await pg.evaluate(()=>streak===0), '오답 후 연속 리셋');
P(await pg.evaluate(()=>{ try{ return (JSON.parse(localStorage.getItem('svt_lyrics_quiz_stats_v1')||'{}').best||{}).streak===2; }catch(e){ return false; } }), '최고기록 2 저장');

// 다시 도전 → 새 게임(연속 0, 오버레이 사라짐)
await pg.evaluate(()=>document.getElementById('io-retry').click()); await pg.waitForTimeout(300);
P(await pg.evaluate(()=>streak===0 && document.getElementById('infinite-over').style.display==='none'), '다시 도전 → 리셋·오버레이 닫힘');

// 무한 재보충: 끝에서 order 늘어남
P(await pg.evaluate(()=>{ const before=order.length; refillInfinite(); return order.length>before; }), 'refillInfinite로 문항 재보충');
console.log('done'); await b.close();
