// variants(곡당 다문제) 엔진 회귀 — 변형 키 확장·콘텐츠 해석·하위호환.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const pg=await b.newPage();
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }
await pg.goto('http://localhost:8765/index.html?staging=1'); await pg.waitForTimeout(700);

// 헬퍼: idOf/viOf/expandKeys
const h=await pg.evaluate(()=>({
  id:idOf('s61#2'), vi:viOf('s61#2'), vi0:viOf('s61'),
  exp0:expandKeys('s61'),                    // variants 없음 → [자기]
}));
P(h.id==='s61' && h.vi===2 && h.vi0===0, `idOf/viOf: id=${h.id} vi=${h.vi} vi0=${h.vi0}`);
P(Array.isArray(h.exp0) && h.exp0.length===1 && h.exp0[0]==='s61', `variants 없으면 확장=[자기] (${h.exp0})`);

// 변형 2개 주입 후 확장·해석·하위호환 검증
const r=await pg.evaluate(()=>{
  const base=getC('s61'); base.variants=[{lyrics:'변형A 가사', time:'0:30'},{lyrics:'변형B 가사', mv:'https://youtu.be/abcdefghijk'}];
  const keys=expandKeys('s61');
  const qa=qc('s61'), q1=qc('s61#1'), q2=qc('s61#2');
  const name1=songById('s61#1').name;
  delete base.variants;
  return { keys, baseLyric:qa.lyrics, v1:q1.lyrics, v1mv:q1.mv, baseMv:qa.mv, v2mv:q2.mv, name1 };
});
P(r.keys.length===3 && r.keys[1]==='s61#1' && r.keys[2]==='s61#2', `확장: [${r.keys}]`);
P(r.v1==='변형A 가사', `변형1 가사 해석: "${r.v1}"`);
P(r.v1mv===r.baseMv, `변형1 mv 미지정 → 곡 기본 mv 폴백 (${r.v1mv===r.baseMv})`);
P(r.v2mv==='https://youtu.be/abcdefghijk', `변형2 mv override 반영`);
P(r.name1 && r.name1.includes('미아'), `변형 키의 정답=곡명 (${r.name1})`);

// buildOrder 확장: 변형 주입 후 order에 s61#1/#2가 나타나는지(전범위)
const ord=await pg.evaluate(()=>{
  const base=getC('s61'); base.variants=[{lyrics:'A'},{lyrics:'B'}];
  config.scope={by:'all',val:''}; quizCount=null; buildOrder(false);
  const has=['s61','s61#1','s61#2'].every(k=>order.includes(k));
  const len=order.length;
  delete base.variants; buildOrder(false);
  return {has, len, lenNoVar:order.length};
});
P(ord.has, 'buildOrder가 곡을 변형 키로 확장(s61#1·#2 포함)');
P(ord.len===ord.lenNoVar+2, `변형 2개면 문항 수 +2 (${ord.lenNoVar}→${ord.len})`);

// 키 단위 검수: 테스트 스코프는 _test에 든 변형 키만 출제(base는 제외)
const kv=await pg.evaluate(()=>{
  getC('s60').variants=[{lyrics:'A',time:'0:20'},{lyrics:'B',time:'0:30'}];
  testIds=new Set(['s60#1']); config.scope={by:'test',val:'1'}; quizCount=null; buildOrder(false);
  const r={order:[...order]}; delete getC('s60').variants; return r;
});
P(kv.order.length===1 && kv.order[0]==='s60#1', `테스트 스코프=변형 키만 출제(base 제외): [${kv.order}]`);
console.log('done'); await b.close();
