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

// segmentByLang: 혼합 가사를 언어 구간으로 분할(각 구간 다른 TTS로 낭독됨)
const segCases=[
  ['내가 헛스윙해도 / You make me feel like I hit it home', ['ko','en'], '한→영 2구간'],
  ['우린 정신을 좀 차려야 해', ['ko'], '한국어 단일'],
  ['我没有时间试探 / 我没有兴趣计算', ['zh'], '중국어 단일'],
  ['You bring the beat 어제같이 다시', ['en','ko'], '영→한'],
];
for(const [txt,exp,label] of segCases){
  const r=await pg.evaluate(t=>{ const s=segmentByLang(t); return {langs:s.map(x=>x.lang), join:s.map(x=>x.text).join('')}; }, txt);
  P(JSON.stringify(r.langs)===JSON.stringify(exp), `segmentByLang ${label}: [${r.langs}]==[${exp}]`);
  P(r.join===txt, `segmentByLang ${label}: 원문 보존(손실 없음)`);
}

// 슬래시/구분자는 낭독 텍스트에서 제거(쉼표로) — "슬래시"로 읽히지 않게
const spk=await pg.evaluate(()=>{
  const a=makeUtterance('내가 헛스윙해도 / You make me feel like I hit it home').text;
  const b=makeUtterance('어제같이 / 123456 · 다시').text;
  return {a,b,fs:forSpeech('가 / 나 | 다 · 라')};
});
P(!spk.a.includes('/'), '낭독 텍스트에 슬래시 없음(구간1)');
P(!spk.b.includes('/') && !spk.b.includes('·'), '낭독 텍스트에 / · 없음');
P(spk.fs==='가, 나, 다, 라', `forSpeech 구분자→쉼표: "${spk.fs}"`);

// 실제 스테이징 데이터: s69 8DM은 lang=zh → zh-CN 로 낭독
await pg.goto('http://localhost:8765/index.html?staging=1'); await pg.waitForTimeout(700);
const s69=await pg.evaluate(()=>{ const c=getC('s69'); return c ? makeUtterance(c.lyrics, c.lang).lang : 'no-s69'; });
P(s69==='zh-CN', `s69 8DM(중국어) → ${s69}===zh-CN`);
console.log('done'); await b.close();
