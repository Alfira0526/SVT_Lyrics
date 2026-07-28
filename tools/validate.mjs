// SVT_Lyrics 데이터 검증기 (순수 Node, 무의존)
// 사용: node tools/validate.mjs <파일.json>   (기본: svt-data.staging.json)
// 스키마·무결성 린트 + 검수(_review) 항목 수집. 오류가 있으면 exit 1.
import { readFileSync } from "node:fs";

const DIFFS = new Set(["상", "중", "신곡"]);
const TYPES = new Set(["정규", "미니", "싱글", "디지털 싱글", "스페셜", "베스트"]);

// 앱의 parseYouTube와 동등한 검사 — 11자 영상 id 추출(없으면 null). 빈 값은 허용.
export function parseYouTube(url) {
  if (!url) return null;
  const s = String(url).trim();
  // 앱(index.html)의 parseYouTube와 동일한 관대한 패턴
  const pats = [
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:v=)([\w-]{11})/,
    /(?:\/embed\/)([\w-]{11})/,
    /(?:\/shorts\/)([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const p of pats) { const m = s.match(p); if (m) return m[1]; }
  return null;
}
// 앱의 parseTime와 동등 — "m:ss"/"h:mm:ss"/초 → 정수초. 빈 값은 허용(null 반환).
export function parseTime(str) {
  if (str == null || String(str).trim() === "") return null;
  const s = String(str).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const parts = s.split(":").map((x) => parseInt(x, 10));
  if (parts.some((n) => Number.isNaN(n))) return NaN;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}

// data 객체를 검증해 {errors, warnings, review} 반환.
export function validateData(data) {
  const errors = [], warnings = [], review = [];
  const E = (m) => errors.push(m), W = (m) => warnings.push(m);

  if (!data || typeof data !== "object") { errors.push("최상위가 객체가 아닙니다"); return { errors, warnings, review }; }
  if (!Array.isArray(data.songs)) E("songs가 배열이 아닙니다");
  if (!data.content || typeof data.content !== "object") E("content가 객체가 아닙니다");
  if (errors.length) return { errors, warnings, review };

  const songs = data.songs, content = data.content, album = data.album || {};
  const ids = new Set();

  for (const s of songs) {
    if (!s || typeof s !== "object") { E(`songs에 객체가 아닌 항목: ${JSON.stringify(s)}`); continue; }
    if (!s.id || typeof s.id !== "string") E(`곡 id 누락/형식오류: ${JSON.stringify(s)}`);
    else if (ids.has(s.id)) E(`곡 id 중복: ${s.id}`);
    else ids.add(s.id);
    if (!s.name || !String(s.name).trim()) E(`[${s.id}] 곡명(name) 비어 있음`);
    if (!s.diff || !DIFFS.has(s.diff)) E(`[${s.id}] diff 값 오류: ${s.diff} (상/중/신곡)`);
    if (s.part == null) W(`[${s.id}] part 없음`);

    const c = content[s.id];
    if (!c) { W(`[${s.id} ${s.name}] content 없음`); }
    else {
      if (!c.lyrics || !String(c.lyrics).trim()) W(`[${s.id} ${s.name}] 가사(lyrics) 비어 있음`);
      if (c.mv && parseYouTube(c.mv) === null) E(`[${s.id} ${s.name}] MV 주소 파싱 불가: ${c.mv}`);
      if (c.time && Number.isNaN(parseTime(c.time))) W(`[${s.id} ${s.name}] 시작 시간 파싱 불가(0초부터 재생됨): ${c.time}`);
      // 비한국어(영/중/일) 가사인데 한글 독음(read)이 없으면 경고 — 원어 음성 없는 기기에서 무음 위험.
      if (c.lyrics && /[A-Za-z一-鿿぀-ヿ]/.test(c.lyrics) && !(c.read && String(c.read).trim()))
        W(`[${s.id} ${s.name}] 비한국어 가사인데 한글 독음(read) 없음 — 원어 음성 없는 기기에서 낭독 안 됨(add-song --read)`);

      // 변형(variants) — 곡당 여러 문제. 각 변형도 가사·MV·독음 검증.
      if (c.variants != null) {
        if (!Array.isArray(c.variants)) E(`[${s.id} ${s.name}] variants가 배열이 아님`);
        else c.variants.forEach((v, vi) => {
          const tag = `${s.id}#${vi + 1} ${s.name}(변형${vi + 1})`;
          if (!v || typeof v !== "object") { E(`[${tag}] 변형 항목이 객체가 아님`); return; }
          if (!v.lyrics || !String(v.lyrics).trim()) W(`[${tag}] 변형 가사(lyrics) 비어 있음`);
          if (v.mv && parseYouTube(v.mv) === null) E(`[${tag}] 변형 MV 주소 파싱 불가: ${v.mv}`);
          if (v.time && Number.isNaN(parseTime(v.time))) W(`[${tag}] 변형 시작 시간 파싱 불가: ${v.time}`);
          if (v.lyrics && /[A-Za-z一-鿿぀-ヿ]/.test(v.lyrics) && !((v.read && String(v.read).trim()) || (c.read && String(c.read).trim())))
            W(`[${tag}] 비한국어 변형인데 한글 독음(read) 없음`);
        });
      }
    }

    const a = album[s.id];
    if (!a) W(`[${s.id} ${s.name}] album(발매연도/종류) 없음 — 힌트 축소`);
    else {
      if (typeof a.year !== "number" || a.year < 2000 || a.year > 2100) W(`[${s.id} ${s.name}] album.year 값 확인 필요: ${a.year}`);
      if (!a.type || !TYPES.has(a.type)) W(`[${s.id} ${s.name}] album.type 확인 필요: ${a.type}`);
    }
  }

  // 고아 content/album 키(곡에 없는 id)
  for (const k of Object.keys(content)) if (!ids.has(k)) W(`content에 매칭되는 곡 없음(고아 키): ${k}`);
  for (const k of Object.keys(album)) if (!ids.has(k)) W(`album에 매칭되는 곡 없음(고아 키): ${k}`);

  // 검수 플래그(_review)
  const rev = data._review || {};
  for (const id of Object.keys(rev)) {
    const r = rev[id] || {};
    const nm = (songs.find((s) => s.id === id) || {}).name || "(없는 곡)";
    review.push({ id, name: nm, reason: r.reason || "확인 필요", fields: r.fields || [] });
  }

  return { errors, warnings, review };
}

// ---- CLI ----
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const file = process.argv[2] || "svt-data.staging.json";
  let data;
  try { data = JSON.parse(readFileSync(file, "utf8")); }
  catch (e) { console.error(`✗ ${file} 읽기/파싱 실패: ${e.message}`); process.exit(1); }

  const { errors, warnings, review } = validateData(data);
  console.log(`\n=== 검증: ${file} ===`);
  console.log(`곡 ${Array.isArray(data.songs) ? data.songs.length : "?"}개 · rev ${data.rev ?? "?"}` + (Array.isArray(data._test) && data._test.length ? ` · 🧪 테스트용 ${data._test.length}곡` : ""));

  if (errors.length) { console.log(`\n🔴 오류 ${errors.length}건 (승격 불가):`); errors.forEach((m) => console.log("  - " + m)); }
  if (warnings.length) { console.log(`\n🟡 경고 ${warnings.length}건 (승격 가능, 확인 권장):`); warnings.forEach((m) => console.log("  - " + m)); }
  if (review.length) {
    console.log(`\n🔎 검수 요청(_review) ${review.length}건 — 오너 확인 필요:`);
    review.forEach((r) => console.log(`  - [${r.id}] ${r.name}: ${r.reason}${r.fields.length ? " (" + r.fields.join(", ") + ")" : ""}`));
  }
  if (!errors.length && !warnings.length && !review.length) console.log("\n✅ 이상 없음.");

  // 기계 판독용 요약
  console.log(`\nSUMMARY errors=${errors.length} warnings=${warnings.length} review=${review.length}`);
  process.exit(errors.length ? 1 : 0);
}
