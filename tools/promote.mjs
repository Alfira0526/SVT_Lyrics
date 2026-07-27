// SVT_Lyrics 승격기 — 스테이징 데이터를 검증 후 프로덕션(svt-data.json)으로 반영.
// 사용: node tools/promote.mjs [--force] [--from <staging.json>] [--to <prod.json>]
//   - 검증 오류가 있으면 중단.
//   - 미해결 _review(검수요청)가 있으면 중단(--force로 강행 가능).
//   - 성공 시 rev를 안전하게 증가시키고 _review를 제거해 프로덕션에 기록.
import { readFileSync, writeFileSync } from "node:fs";
import { validateData } from "./validate.mjs";

const args = process.argv.slice(2);
const force = args.includes("--force");
const fromIdx = args.indexOf("--from"); const toIdx = args.indexOf("--to");
const FROM = fromIdx >= 0 ? args[fromIdx + 1] : "svt-data.staging.json";
const TO = toIdx >= 0 ? args[toIdx + 1] : "svt-data.json";

function readJson(f) { try { return JSON.parse(readFileSync(f, "utf8")); } catch (e) { console.error(`✗ ${f} 읽기/파싱 실패: ${e.message}`); process.exit(1); } }

const staging = readJson(FROM);
const { errors, warnings, review } = validateData(staging);

console.log(`\n=== 승격 검증: ${FROM} → ${TO} ===`);
console.log(`곡 ${staging.songs?.length ?? "?"}개 · 오류 ${errors.length} · 경고 ${warnings.length} · 검수요청 ${review.length}`);

if (errors.length) {
  console.error(`\n🔴 오류 ${errors.length}건 — 승격 중단. 먼저 수정하세요:`);
  errors.forEach((m) => console.error("  - " + m));
  process.exit(1);
}
if (review.length && !force) {
  console.error(`\n🔎 검수요청 ${review.length}건 미해결 — 승격 중단(오너 확인 후 _review 제거 또는 --force):`);
  review.forEach((r) => console.error(`  - [${r.id}] ${r.name}: ${r.reason}`));
  process.exit(2);
}
if (warnings.length) { console.log(`\n🟡 경고 ${warnings.length}건(무시하고 승격):`); warnings.forEach((m) => console.log("  - " + m)); }

// rev 안전 증가: 기존 프로덕션 rev와 현재시각 중 큰 값 +1 (동시 커밋 tie/시계역전 방지)
let prevRev = 0; try { prevRev = readJson(TO).rev || 0; } catch (e) {}
const newRev = Math.max(prevRev, staging.rev || 0, Date.now()) + 1;

const out = { rev: newRev, songs: staging.songs, content: staging.content };
if (staging.album) out.album = staging.album;
out.config = staging.config;
// _review는 프로덕션에 싣지 않음(승격 = 검수 완료)

writeJsonPretty(TO, out);

// 승격된 곡은 더 이상 '테스트용'이 아니므로 스테이징의 _test/_review를 비우고 rev를 맞춘다.
const clearedTest = Array.isArray(staging._test) ? staging._test.length : 0;
const clearedReview = review.length;
staging.rev = newRev;
delete staging._test;
delete staging._review;
writeJsonPretty(FROM, staging);

if (force && review.length) console.log(`\n⚠️  --force로 검수요청 ${review.length}건을 무시하고 승격했습니다.`);
console.log(`\n✅ 승격 완료 → ${TO} (rev ${prevRev} → ${newRev}, 곡 ${out.songs.length}개).`);
console.log(`   스테이징 정리: 테스트 문제 ${clearedTest}건·검수요청 ${clearedReview}건 제거 → ${FROM}`);
console.log(`   이제 두 파일을 커밋·푸시하면 배포에 반영됩니다.`);

function writeJsonPretty(file, obj) { writeFileSync(file, JSON.stringify(obj, null, 2) + "\n"); }
