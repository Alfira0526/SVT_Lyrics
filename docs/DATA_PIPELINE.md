# 🧪 노래 데이터 파이프라인 (스테이징 → 검수 → 승격)

새 곡/가사 데이터를 **바로 실서비스에 넣지 않고**, 검수용 사이트에서 확인한 뒤 승격하는 구조.

```
곡 추가/수정          검수 사이트              검증·승격            배포
svt-data.staging.json ──► ?staging=1 로 플레이 ──► tools/ 스크립트 ──► svt-data.json ──► 커밋·푸시
     (후보 데이터)          (실데이터 아님)        (오류/검수 차단)      (프로덕션)
```

## 파일 구조
| 파일 | 역할 |
|---|---|
| `svt-data.json` | **프로덕션**. GitHub Pages가 로드하는 실제 게임 데이터. |
| `svt-data.staging.json` | **검수용 후보**. 여기에 새 곡을 추가/수정한다. `?staging=1`이 이 파일을 로드. |
| `tools/validate.mjs` | 데이터 무결성·스키마 린트 + 검수요청 수집. |
| `tools/promote.mjs` | 스테이징 검증 통과 시 프로덕션으로 승격(rev 증가). |

## 데이터 스키마
```jsonc
{
  "rev": 1785077830072,            // Date.now() 계열 정수. 클수록 최신(기기 간 전파 기준)
  "songs": [ { "id": "s2", "name": "13월의 춤 (Lilili Yabbay)", "part": "브릿지 · 퍼포먼스팀", "diff": "상" } ],
  "content": { "s2": { "lyrics": "…", "mv": "https://youtu.be/…", "time": "1:12" } },
  "album":   { "s2": { "year": 2017, "type": "정규" } },   // 힌트(발매연도/앨범종류). 앱은 이 값을 우선 사용
  "config":  { /* 기본 게임 설정 */ },
  "_review": { "s63": { "reason": "확인 필요 사유", "fields": ["year","type"] } }  // 검수요청(선택). 프로덕션엔 싣지 않음
}
```
- `diff` ∈ `상 / 중 / 신곡`. `album.type` ∈ `정규 / 미니 / 싱글 / 디지털 싱글 / 스페셜 / 베스트`.
- `_review`는 **스테이징 전용** 표식(인게임 비노출). 오너 확인 전까지 승격을 막는다.

## 워크플로

### 1) 곡 추가/수정
`svt-data.staging.json`을 편집한다(직접, 또는 `?staging=1` 화면의 설정 편집기에서 편집 후 배포본 내려받아 교체).
- `songs`에 `{id,name,part,diff}` 추가(id는 기존과 겹치지 않게, 예: `s70`).
- `content[id]`에 `{lyrics,mv,time}` 추가.
- `album[id]`에 `{year,type}` 추가.
- **정확도가 불확실하면** `_review[id] = {reason, fields}`로 표시.

### 2) 검증
```bash
node tools/validate.mjs svt-data.staging.json
```
- 🔴 **오류**(중복 id·잘못된 diff·깨진 MV 등)는 반드시 수정. 🟡 **경고**(빈 가사·누락 앨범 등)는 확인 권장.
- 🔎 **검수요청**(`_review`)은 오너 확인 대상으로 출력.

### 3) 검수 사이트에서 확인
`https://alfira0526.github.io/SVT_Lyrics/?staging=1` 로 접속(상단에 🧪 배너).
- 새 곡의 **가사 낭독·MV·타임스탬프·힌트**를 실제로 플레이하며 확인.
- 저장 상태는 실서비스와 **분리된 로컬 키**를 써서 프로덕션에 영향 없음.

### 4) 검수요청 처리 (오너 확인)
`_review`에 남은 항목은 **오너에게 확인 요청** 후, 확인되면 해당 `_review[id]`를 제거(또는 데이터 수정).
> 규칙: 검수가 필요한 데이터는 **오너에게 확인을 받는다.** 확인 전에는 승격하지 않는다.

### 5) 승격
```bash
node tools/promote.mjs            # 스테이징 → svt-data.json
# (미해결 _review가 있으면 중단. 강행하려면 --force)
```
- 검증 통과 & 미해결 검수요청 없음 → `svt-data.json`에 반영(rev 자동 증가, `_review` 제거).
- 이후 `git add -A && git commit && git push` → GitHub Pages가 새 데이터를 배포.

## 참고
- 앱은 http(s)에서만 데이터 파일을 fetch한다(`file://`는 index.html 내장 기본값 사용).
- 프로덕션 rev는 `max(기존rev, 현재시각)+1`로 증가시켜 동시 커밋/시계 역전에도 순서가 꼬이지 않게 한다.
- 스크립트는 순수 Node(무의존). `node tools/validate.mjs`처럼 바로 실행.
