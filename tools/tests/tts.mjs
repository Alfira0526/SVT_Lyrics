// 다국어 TTS 회귀 테스트 — detectLang / makeUtterance 가 가사 언어에 맞는 u.lang을 고르는지.
// (8DM=중국어 → zh-CN, 향후 일본곡 → ja-JP, 한/영 기존 동작 유지, content.lang override 우선)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const pg=await b.newPage();
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }
await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(500);

// detectLang: 스크립트 기반 판별
const cases=[
  ['우린 정신을 좀 차려야 해','ko','한국어'],
  ["Let's kill the sunrise",'en','영어'],
  ['我没有时间试探 / 我没有兴趣计算','zh','중국어(8DM)'],
  ['君の名前を呼んでいる','ja','일본어(가나)'],
  ['내가 헛스윙해도 / You make me feel like I hit it home','ko','한+영 혼합→한국어'],
  ['She can\'t get out of bed when she home','en','영어 문장'],
];
for(const [txt,exp,label] of cases){
  const got=await pg.evaluate(t=>detectLang(t), txt);
  P(got===exp, `detectLang ${label}: ${got}===${exp}`);
}

// makeUtterance: u.lang(BCP-47) 매핑
const bcp=[
  ['我没有时间试探','', 'zh-CN','중국어 자동'],
  ['君の名前','', 'ja-JP','일본어 자동'],
  ['우린 정신을','', 'ko-KR','한국어 자동'],
  ['Let\'s go','', 'en-US','영어 자동'],
  ['우린 정신을','zh','zh-CN','override=zh가 한국어 텍스트보다 우선'],
];
for(const [txt,ov,exp,label] of bcp){
  const got=await pg.evaluate(([t,o])=>makeUtterance(t, o||undefined).lang, [txt,ov]);
  P(got===exp, `makeUtterance ${label}: ${got}===${exp}`);
}

// 실제 스테이징 데이터: s69 8DM은 lang=zh → zh-CN 로 낭독
await pg.goto('http://localhost:8765/index.html?staging=1'); await pg.waitForTimeout(700);
const s69=await pg.evaluate(()=>{ const c=getC('s69'); return c ? makeUtterance(c.lyrics, c.lang).lang : 'no-s69'; });
P(s69==='zh-CN', `s69 8DM(중국어) → ${s69}===zh-CN`);
console.log('done'); await b.close();
