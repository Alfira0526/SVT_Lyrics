// add-song.mjs 회귀 테스트 — (1) rev를 반드시 증가시키고 _test에 새 id 등록,
// (2) 유튜브(mv)·추천구간(time) 미입력 시 경고, 채우면 경고 없음.
// (rev 미증가 시 캐시된 ?staging=1이 신곡을 못 받아 버튼이 안 뜨는 버그 / mv·time 누락 방지)
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
function P(c,n){ console.log((c?'PASS':'FAIL')+' — '+n); if(!c) process.exitCode=1; }
function addSong(args){ return spawnSync('node', ['tools/add-song.mjs', ...args], { encoding:'utf8' }); }

const dir=mkdtempSync(join(tmpdir(),'addsong-'));
const f=join(dir,'staging.json');
const baseRev=1000;
writeFileSync(f, JSON.stringify({ rev:baseRev, songs:[], content:{}, album:{}, config:{} }, null, 2));

// 1) mv/time 없이 추가 → 경고 + rev 증가 + 등록
const r1=addSong(['--file',f,'--id','tX1','--name','테스트곡','--diff','중']);
const d1=JSON.parse(readFileSync(f,'utf8'));
P(d1.rev>baseRev, `rev 증가: ${baseRev} -> ${d1.rev}`);
P(Array.isArray(d1._test)&&d1._test.includes('tX1'), '_test에 새 id 등록');
P(d1.songs.some(s=>s.id==='tX1'), 'songs에 곡 추가');
P(!!d1._review&&!!d1._review['tX1'], '_review 검수요청 등록');
P(/경고/.test(r1.stderr)&&/가사|lyrics/.test(r1.stderr)&&/mv|유튜브/.test(r1.stderr)&&/time|추천 시작/.test(r1.stderr), '가사·mv·time 미입력 시 경고 출력');

// 2) mv/time 채워서 추가 → 경고 없음 + rev 또 증가(엄격)
const rev1=d1.rev;
const r2=addSong(['--file',f,'--id','tX2','--name','테스트곡2','--diff','상','--lyrics','가사','--time','0:30','--year','2025','--type','미니','--mv','https://youtu.be/abc12345678']);
const d2=JSON.parse(readFileSync(f,'utf8'));
P(d2.rev>rev1, `연속 추가도 rev 엄격 증가: ${rev1} -> ${d2.rev}`);
P(d2._test.length===2, '_test 누적(2곡)');
P(!/경고/.test(r2.stderr), 'mv·time 채우면 경고 없음');

rmSync(dir,{recursive:true,force:true});
console.log('done');
