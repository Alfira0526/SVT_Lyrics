#!/usr/bin/env node
// README.md의 '데이터 표기'(문항 수·난이도 분포)를 svt-data.json과 자동 동기화한다.
// 산문/기능 설명은 건드리지 않고, 데이터에서 파생되는 숫자만 안전하게 치환한다(idempotent).
// 사용: node tools/sync-readme.mjs   (변경이 있으면 README.md를 갱신하고 CHANGED 출력)
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;          // 스크립트 위치 기준 → 레포 루트(실행 cwd 무관)
const data = JSON.parse(readFileSync(ROOT + 'svt-data.json', 'utf8'));
const songs = Array.isArray(data.songs) ? data.songs : [];
const total = songs.length;
const by = { '상': 0, '중': 0, '신곡': 0 };
for (const s of songs) if (s && s.diff in by) by[s.diff]++;
const hi = by['상'], mid = by['중'], neo = by['신곡'];

let md = readFileSync(ROOT + 'README.md', 'utf8');
const before = md;
md = md
  .replace(/\*\*\d+문항이 기본 내장\*\*/g, `**${total}문항이 기본 내장**`)
  .replace(/총 \*\*\d+문항\*\* \(상 \d+ \/ 중 \d+ \/ 신곡 \d+\)/g, `총 **${total}문항** (상 ${hi} / 중 ${mid} / 신곡 ${neo})`)
  .replace(/내장 \d+문항·설정으로/g, `내장 ${total}문항·설정으로`)
  .replace(/\d+곡 전곡 등록 완료/g, `${total}곡 전곡 등록 완료`);

const label = `total=${total} (상 ${hi}/중 ${mid}/신곡 ${neo})`;
if (md !== before) { writeFileSync(ROOT + 'README.md', md); console.log(`CHANGED · README 데이터 동기화 → ${label}`); }
else { console.log(`OK · README 이미 최신 → ${label}`); }
