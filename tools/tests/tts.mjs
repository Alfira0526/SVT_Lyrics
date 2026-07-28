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

// 숫자: 3자리+ 는 한 자리씩, 2자리(12월 등)는 유지
const num=await pg.evaluate(()=>({
  a:forSpeech('123456'), b:forSpeech('015B'), c:forSpeech('12월'), d:forSpeech('나는 7위')
}));
P(num.a==='1 2 3 4 5 6', `123456 → "${num.a}"`);
P(num.b==='0 1 5B', `015B → "${num.b}"`);
P(num.c==='12월', `12월 유지 → "${num.c}"`);
P(num.d==='나는 7위', `한 자리 숫자 유지 → "${num.d}"`);

// 실제 스테이징 데이터: s67 BEAT(영어+슬래시) 낭독 텍스트에 슬래시 없음(현재 빌드 확인 — 캐시 아닌 코드 검증)
await pg.goto('http://localhost:8765/index.html?staging=1'); await pg.waitForTimeout(700);
const beat=await pg.evaluate(()=>{ const c=getC('s67'); return makeUtterance(c.lyrics, c.lang).text; });
P(!beat.includes('/'), `s67 BEAT 낭독 슬래시 없음: "${beat.slice(0,40)}…"`);

// speakLyric 체인: 혼합 가사가 onend로 순차 재생되어 구간마다 다른 음성 utterance가 나오는지(런타임)
const chain=await pg.evaluate(async ()=>{
  const rec=[];
  const real=speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak=(u)=>{ rec.push({lang:u.lang,text:u.text}); setTimeout(()=>u.onend&&u.onend(),0); };  // 재생완료 흉내로 체인 구동
  const c=getC('s66'); speakLyric(c.lyrics, c.lang, 1);
  await new Promise(r=>setTimeout(r,400));
  speechSynthesis.speak=real;
  return rec;
});
P(chain.length===2, `speakLyric 체인: s66이 2개 utterance로 순차 재생(${chain.length})`);
P(chain[0]&&chain[0].lang==='ko-KR' && chain[1]&&chain[1].lang==='en-US', `체인 순서/언어: ${chain.map(r=>r&&r.lang).join(' → ')}`);
P(chain.every(r=>!r.text.includes('/')), '체인 각 구간에 슬래시 없음');

// 실제 스테이징 데이터: s69 8DM은 lang=zh → zh-CN 로 낭독
await pg.goto('http://localhost:8765/index.html?staging=1'); await pg.waitForTimeout(700);
const s69=await pg.evaluate(()=>{ const c=getC('s69'); return c ? makeUtterance(c.lyrics, c.lang).lang : 'no-s69'; });
P(s69==='zh-CN', `s69 8DM(중국어) → ${s69}===zh-CN`);

// 한글 독음 대체: 중국어 음성이 없으면 s69 낭독이 read(한글 독음)를 한국어 음성으로 재생
const fb=await pg.evaluate(async ()=>{
  pickVoice();
  const rec=[];
  speechSynthesis.getVoices=()=>[{lang:'ko-KR',name:'K'},{lang:'en-US',name:'E'}];  // 중국어 음성 없음
  pickVoice();  // zhVoice=null 로 재설정
  speechSynthesis.speak=(u)=>{ rec.push({lang:u.lang,text:u.text}); setTimeout(()=>u.onend&&u.onend(),0); };
  const c=getC('s69');   // 8DM 중국어, read=한글 독음
  speakLyric(c.lyrics, c.lang, 1, c.read);
  await new Promise(r=>setTimeout(r,300));
  return rec;
});
P(fb.length===1 && fb[0].lang==='ko-KR', `중국어 음성 없음 → 한글 독음을 ko-KR로 낭독 (${fb.map(r=>r.lang).join(',')})`);
P(fb[0] && /워 메이요우/.test(fb[0].text), `독음 텍스트로 대체됨: "${(fb[0]||{}).text||''}"`);

// 음성 준비 확인: 필요한 언어 산출 + 누락 경고(중국어 음성 없음 가정)
const vc=await pg.evaluate(()=>{
  const need=[...neededLangs()].sort();
  speechSynthesis.getVoices=()=>[{lang:'ko-KR',name:'K',default:true},{lang:'en-US',name:'E'}];  // 한/영만 있음
  renderVoiceCheck();
  return { need, html:document.getElementById('voice-check-body').innerHTML };
});
P(['ko','en','zh'].every(l=>vc.need.includes(l)), `neededLangs 스테이징: [${vc.need}] (ko·en·zh 포함)`);
P(/중국어/.test(vc.html) && /독음|괜찮/.test(vc.html), '중국어 음성 없을 때 한글 독음 대체 안내 표시');
P(/Windows/.test(vc.html), 'Windows 음성 설치 안내 포함');
// ttsPlan: 음성 유무별 낭독 계획 + 무음 방지(해외 시나리오)
const plan=await pg.evaluate(()=>{
  const out={};
  speechSynthesis.getVoices=()=>[{lang:'ko-KR',name:'K'}]; pickVoice();   // 한국어 음성만
  out.zhWithKo=ttsPlan(getC('s69'));   // 중국어곡+독음 → read
  out.koOnly=ttsPlan(getC('s61'));     // 한국어곡 → orig
  speechSynthesis.getVoices=()=>[{lang:'en-US',name:'E'}]; pickVoice();   // 한국어 음성 없음(해외)
  out.koNoVoice=ttsPlan(getC('s61'));  // 한국어곡 낭독 불가 → none(자막 대체)
  out.zhNoKo=ttsPlan(getC('s69'));     // 독음도 koVoice 필요 → none
  return out;
});
P(plan.zhWithKo==='read', `ttsPlan 중국어곡+한국어음성 → read (${plan.zhWithKo})`);
P(plan.koOnly==='orig', `ttsPlan 한국어곡 → orig (${plan.koOnly})`);
P(plan.koNoVoice==='none', `ttsPlan 한국어음성 없음(해외) → none·자막대체 (${plan.koNoVoice})`);
P(plan.zhNoKo==='none', `ttsPlan 한국어음성 없어 독음도 불가 → none (${plan.zhNoKo})`);

// s68 숫자: read에 원문 숫자 유지 → forSpeech가 한 자리씩 낭독
const s68r=await pg.evaluate(()=>makeUtterance(getC('s68').read,'ko').text);
P(/1 2 3 4 5 6/.test(s68r), `s68 독음 숫자 낭독됨: "…${s68r.slice(-22)}"`);

console.log('done'); await b.close();
