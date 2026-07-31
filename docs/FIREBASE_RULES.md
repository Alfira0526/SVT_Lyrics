# Firebase 보안 규칙 (로드맵 S0)

> 현재 랭킹/방 릴레이용 Firebase Realtime DB가 **test 모드(공개 읽기·쓰기)** 로 열려 있습니다.
> 사용자가 늘기 전에 아래 규칙으로 **잠가** 랭킹 조작·스팸·요금 리스크를 막습니다.

## 무엇을 막고 무엇을 허용하나
- **기본값: 전면 차단**(`.read/.write=false`) — 규칙에 명시된 경로만 접근 가능.
- **`svtq_rank/{board}/{entry}`** (랭킹): 누구나 **읽기** 가능(공개 순위표). 쓰기는 **새 항목 생성만**(기존 기록 수정·삭제 불가), 그리고 값 검증:
  - `nick` 문자열 1~16자, `val` 숫자 0~99999, `ts` 숫자, `t`(선택) 숫자 0~99999, **그 외 필드 금지**.
  - → 남의 점수 조작/삭제, 과대값·스팸 필드 차단.
- **`svtq/{code}`** (온라인 방 릴레이): 방 코드(≤12자) 하위만 읽기·쓰기 허용(일시적 이벤트 동기화). Firebase 기반 방을 쓰지 않으면 이 블록은 삭제해도 됩니다.

> ⚠️ 완전한 남용 방지(익명 rate-limit 등)는 RTDB 규칙만으로 한계가 있어, 앱 클라이언트의 제출 쿨다운·금칙어와 **이중화**합니다(로드맵 S0 클라 항목). 더 강한 보증이 필요하면 App Check 또는 Cloud Functions 검증을 M2에서 검토.

## 배포 방법 (택1)

### A. Firebase 콘솔(가장 쉬움)
1. [Firebase 콘솔](https://console.firebase.google.com/) → 프로젝트(`svt-lyrics-quiz`) → **Realtime Database → 규칙** 탭.
2. `database.rules.json`의 **`"rules": { ... }` 내용**을 붙여넣기.
3. **게시(Publish)**.

### B. Firebase CLI
```bash
npm i -g firebase-tools
firebase login
# firebase.json 에 database.rules 를 가리키게 설정 후:
firebase deploy --only database
```
`firebase.json` 예:
```json
{ "database": { "rules": "database.rules.json" } }
```

## 배포 후 확인(회귀 체크)
- ✅ 앱에서 **랭킹 조회**가 보인다(읽기 OK).
- ✅ 게임 완주 후 **랭킹 등록**이 성공한다(검증 통과 쓰기 OK).
- ✅ 임의 경로(예: `/foo`)나 잘못된 형식 쓰기가 **거부**된다(규칙 시뮬레이터로 테스트 권장).
- ✅ (Firebase 방 사용 시) 온라인 4지선다/부저 방이 정상 동기화된다.

## 파일
- 규칙: [`../database.rules.json`](../database.rules.json)
