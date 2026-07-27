// SVT_Lyrics 곡 추가 헬퍼 — 스테이징에 새 곡을 '테스트용(_test)'으로 추가.
// 사용 예:
//   node tools/add-song.mjs --id s70 --name "곡명 (Eng)" --diff 중 --year 2025 --type 미니
//   node tools/add-song.mjs --id s70 --name "곡명" --lyrics "가사 한 줄" --mv "https://youtu.be/xxxxxxxxxxx" --time 0:30
// 옵션: --part, --lyrics, --mv, --time, --year, --type, --no-review, --file <staging.json>
import { readFileSync, writeFileSync } from "node:fs";

function argMap(argv) {
  const m = {}; for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) { const k = argv[i].slice(2); const v = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true; m[k] = v; }
  } return m;
}
const a = argMap(process.argv.slice(2));
const FILE = a.file || "svt-data.staging.json";

if (!a.id || !a.name) { console.error("필수: --id <곡id> --name <곡명>"); process.exit(1); }

let data; try { data = JSON.parse(readFileSync(FILE, "utf8")); } catch (e) { console.error(`✗ ${FILE} 읽기 실패: ${e.message}`); process.exit(1); }
data.songs = data.songs || []; data.content = data.content || {}; data.album = data.album || {};

if (data.songs.some((s) => s.id === a.id)) { console.error(`✗ 이미 존재하는 id: ${a.id}`); process.exit(1); }

const diff = a.diff || "중";
if (!["상", "중", "신곡"].includes(diff)) { console.error(`✗ diff는 상/중/신곡 (입력: ${diff})`); process.exit(1); }

data.songs.push({ id: a.id, name: a.name, part: a.part || "1절 벌스", diff });
data.content[a.id] = { lyrics: a.lyrics || "", mv: a.mv || "", time: a.time || "" };
if (a.year || a.type) data.album[a.id] = { year: a.year ? parseInt(a.year, 10) : undefined, type: a.type || undefined };

// 테스트용 목록에 등록
data._test = Array.from(new Set([...(data._test || []), a.id]));

// 검수요청(기본 ON)
if (!a["no-review"]) {
  data._review = data._review || {};
  const need = [];
  if (!a.lyrics) need.push("lyrics");
  if (!a.time) need.push("time");
  if (!a.year || !a.type) need.push("album");
  data._review[a.id] = { reason: "신규 추가 곡 — 검수 필요", fields: need.length ? need : ["confirm"] };
}

// rev 증가: 캐시된 ?staging=1 브라우저에 추가분이 전파되도록(안 올리면 옛 캐시가 유지돼 신곡·_test 미반영).
// promote.mjs와 동일한 안전 증가(과거 rev·시계역전 방지 → 항상 엄격 증가).
data.rev = Math.max(data.rev || 0, Date.now()) + 1;

// 추천 가사·유튜브 영상·추천 시작구간은 기본으로 연결되어 있어야 함(퀴즈 출제·정답 재생용). 비었으면 눈에 띄게 경고.
if (!a.lyrics || !a.mv || !a.time) {
  const miss = [!a.lyrics ? "--lyrics(추천 가사)" : null, !a.mv ? "--mv(유튜브 링크)" : null, !a.time ? "--time(추천 시작구간)" : null].filter(Boolean).join(" · ");
  console.warn(`⚠️  경고: [${a.id}] ${miss} 미입력 — 곡 추가 시 추천 가사·유튜브 영상·추천 시작구간은 기본으로 연결해 주세요(가사 1~2줄 발췌 / 공식 MV·비주얼라이저·공식오디오·방송무대 우선). 채운 뒤 재실행 권장.`);
}

writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`✅ 추가: [${a.id}] ${a.name} (${diff}) → ${FILE} (rev ${data.rev})`);
console.log(`   테스트용 목록(_test) ${data._test.length}곡, 검수요청 ${Object.keys(data._review || {}).length}건`);
console.log(`   다음: ?staging=1 화면 또는 설정 편집기에서 가사/MV/시간을 채우고 → node tools/validate.mjs ${FILE}`);
