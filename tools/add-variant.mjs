// SVT_Lyrics 변형(variants) 추가 헬퍼 — 기존 곡에 '문제(변형)'를 하나 더 붙인다(곡당 다문제).
// 사용 예:
//   node tools/add-variant.mjs --id s14 --lyrics "다른 구절" --time "0:40"
//   node tools/add-variant.mjs --id s60 --lyrics "English hook" --time "1:20" --read "잉글리시 훅" --lang en
// 옵션: --time, --mv, --read, --lang(en/zh/ja/ko), --file <staging.json>
import { readFileSync, writeFileSync } from "node:fs";

function argMap(argv) { const m = {}; for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) { const k = argv[i].slice(2); const v = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true; m[k] = v; } } return m; }
const a = argMap(process.argv.slice(2));
const FILE = a.file || "svt-data.staging.json";

if (!a.id || !a.lyrics) { console.error("필수: --id <곡id> --lyrics <가사>"); process.exit(1); }
let data; try { data = JSON.parse(readFileSync(FILE, "utf8")); } catch (e) { console.error(`✗ ${FILE} 읽기 실패: ${e.message}`); process.exit(1); }
const c = data.content && data.content[a.id];
if (!c) { console.error(`✗ 곡 없음: ${a.id} — 먼저 tools/add-song.mjs 로 곡을 추가하세요`); process.exit(1); }

c.variants = c.variants || [];
const v = { lyrics: String(a.lyrics) };
if (a.time) v.time = String(a.time);
if (a.mv) v.mv = String(a.mv);
if (a.read) v.read = String(a.read);
if (a.lang && ["ko", "en", "zh", "ja"].includes(a.lang)) v.lang = a.lang;
c.variants.push(v);
const vi = c.variants.length;

if (/[A-Za-z一-鿿぀-ヿ]/.test(v.lyrics) && !(v.read || c.read)) console.warn(`⚠️  경고: [${a.id}#${vi}] 비한국어 변형인데 한글 독음(read) 없음 — --read 권장(원어 음성 없는 기기 대비).`);
if (!v.time) console.warn(`⚠️  경고: [${a.id}#${vi}] 추천 시작구간(--time) 없음.`);

// 변형(문제)은 반드시 검수를 거치도록 '문항 키'를 _test·_review에 등록(add-song과 동일 흐름, 단 base는 그대로 라이브 유지).
const key = a.id + "#" + vi;
data._test = Array.from(new Set([...(data._test || []), key]));
if (!a["no-review"]) {
  data._review = data._review || {};
  const need = [];
  if (!v.time) need.push("time");
  if (/[A-Za-z一-鿿぀-ヿ]/.test(v.lyrics) && !(v.read || c.read)) need.push("read");
  data._review[key] = { reason: "신규 변형(문제) — 검수 필요", fields: need.length ? need : ["confirm"] };
}

data.rev = Math.max(data.rev || 0, Date.now()) + 1;   // 캐시 전파
writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`✅ 변형 추가: [${key}] "${v.lyrics.slice(0, 30)}" → ${FILE} (이 곡 총 문제 ${1 + c.variants.length}개, rev ${data.rev})`);
console.log(`   🧪 검수 대기(_test)에 등록됨 — ?staging=1 '테스트 문제만'에서 이 문제만 확인 후 promote.`);
console.log(`   확인: node tools/validate.mjs ${FILE}`);
