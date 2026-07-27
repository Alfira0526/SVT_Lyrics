// add-song.mjs 회귀 테스트 — rev를 반드시 증가시키고 _test에 새 id를 등록하는지 검증.
// (rev 미증가 시 캐시된 ?staging=1 브라우저가 신곡·_test를 못 받아 '테스트 문제만' 버튼이 안 뜨는 버그 방지)
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }

const dir=mkdtempSync(join(tmpdir(),'addsong-'));
const f=join(dir,'staging.json');
const baseRev=1000;
writeFileSync(f, JSON.stringify({ rev:baseRev, songs:[], content:{}, album:{}, config:{} }, null, 2));

execFileSync('node', ['tools/add-song.mjs','--file',f,'--id','tX1','--name','테스트곡','--diff','중'], { stdio:'pipe' });
const d1=JSON.parse(readFileSync(f,'utf8'));
P(d1.rev>baseRev, `rev 증가: ${baseRev} -> ${d1.rev}`);
P(Array.isArray(d1._test)&&d1._test.includes('tX1'), '_test에 새 id 등록');
P(d1.songs.some(s=>s.id==='tX1'), 'songs에 곡 추가');
P(!!d1._review&&!!d1._review['tX1'], '_review 검수요청 등록');

// 두 번째 추가도 rev를 또 올려야(엄격 증가) 캐시 전파가 매번 보장됨
const rev1=d1.rev;
execFileSync('node', ['tools/add-song.mjs','--file',f,'--id','tX2','--name','테스트곡2','--diff','상','--lyrics','가사','--time','0:30','--year','2025','--type','미니'], { stdio:'pipe' });
const d2=JSON.parse(readFileSync(f,'utf8'));
P(d2.rev>rev1, `연속 추가도 rev 엄격 증가: ${rev1} -> ${d2.rev}`);
P(d2._test.length===2, '_test 누적(2곡)');

rmSync(dir,{recursive:true,force:true});
console.log('done');
