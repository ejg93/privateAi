# privateAi

개인용 Claude Code 워크스페이스 모음. 서로 무관한 프로젝트 2개가 한 리포에 공존함.

```
privateAi/
├── launch-workspaces.ps1     # 워크스페이스 2개를 터미널 탭으로 동시 실행
├── limbus-workspace/         # 림버스 컴퍼니(게임) 위키 데이터 + Q&A 어시스턴트
└── story-workspace/          # 개인 감상 기록(게임/영화/일상) 파트너
```

## limbus-workspace

림버스 컴퍼니 게임 질문(메타/덱/스토리/설정/인격/EGO)에 답하는 어시스턴트. 상세 규칙은 [`limbus-workspace/CLAUDE.md`](limbus-workspace/CLAUDE.md) 참조.

- `crawled/` — 나무위키 크롤링 데이터 (gitignore 대상, 로컬에만 존재)
- `chrome-extension/` — 나무위키 페이지 → 로컬 서버 저장용 크롬 익스텐션
- `scripts/{crawl,parse,gen,update,util}` — 크롤/파싱/생성/갱신 스크립트
- `data/` — 카드팩/EGO기프트 원본 데이터(`cardpacks.json`, `egogift-recipes.json` 등). 스크립트는 `limbus-workspace/`를 CWD로 실행 기준으로 `data/` 하위 경로 참조
- `ego-gift-html/` — EGO 기프트 조회용 정적 HTML + 의존 이미지/아이콘 450여 개 (분리 불가, 함께 있어야 함)

### chrome-extension — 나무위키 크롤러

- `background.js` — service worker. 페이지 DOM에서 텍스트 추출(블록 태그 기준 개행, script/style 제외), 나무위키 내부 링크 수집(분류 박스·특수페이지 제외, 키워드 include/exclude 필터), `crawl_server.js`로 저장 요청 전송.
- `popup.js` — 팝업 UI 로직. 단일 페이지 크롤(현재 탭 DOM 추출 후 서버 POST) 버튼과 진행률 표시 담당. DOM 추출 로직은 background.js와 유사하되 `display:none` 요소·코인 이미지(`[코인N]`) 처리가 추가됨.
- `popup.html` — 팝업 UI 마크업.
- `manifest.json` — MV3 익스텐션 설정. `localhost`, `namu.wiki` 권한, `Ctrl+Shift+K` 단축키.

### scripts/crawl — 원본 수집

- `crawl_server.js` — 로컬 HTTP 서버(포트 7477). 크롬 익스텐션이 보낸 나무위키 페이지 텍스트를 받아 `crawled/`에 `.md`로 저장(URL→경로 변환, djb2 해시로 중복 방지), `/log`로 익스텐션 디버그 로그 수신.
- `crawl-egogifts.js` — `limbus.haneuk.info` API에서 EGO기프트 최대 500개를 동시 요청(10개씩)으로 수집 → `data/egogifts-api.json` 저장.
- `crawl-recipes.js` — `data/egogifts-api.json`에서 합성 가능(`synthesisYn: 'Y'`) 기프트만 추려 레시피 API 호출 → `data/egogift-recipes.json` 저장.

### scripts/parse — 원본 → 구조화 데이터

- `parse_ego_gifts_v2.js` — 나무위키 크롤 md(`crawled/.../E.G.O 기프트/*.md` 3종)를 라인 단위로 파싱해 등급·키워드·난이도(하드/익스트림)·합성여부·연관 환상체·획득 경로·소속 카드팩 추출 → `data/ego-gifts-raw.json` 생성.

### scripts/gen — 산출물 생성

- `gen-gift-img-const.js` — `data/ego-gift-img-map.json`과 실제 다운로드된 이미지 존재 여부를 대조해 이름→파일명 매핑만 남기고 `data/gift-img-const.js`(JS 상수) 생성.
- `gen_html_data.js` — `data/ego-gifts-raw.json`을 기반으로 키워드별(fire/bleed/vibe/rupt/sink/breath/charge/slash/pierce/blunt/univ) `DATA` JS 객체 텍스트를 생성, 수기 작성한 효과 설명(`DESC` 맵)과 병합 → `gen_data_out.txt`로 출력 (html에 자동 삽입 아님, 수동 붙여넣기용 중간 산출물).

### scripts/update — `ego-gift-html/ego-universal-gifts.html` 갱신

- `inject-recipes.js` — 레시피 json을 `RECIPE_DATA` JS 상수로 변환해 html 상단에 삽입.
- `update-desc-from-api.js` — API `desc1` 필드로 html 내 기존 `desc:` 텍스트를 정규식 매칭으로 일괄 치환.
- `update-floors.js` — 카드팩별 등장 층수(`data/cardpack-floors.json`)를 계산해 html 아이템에 `floors:` 필드 추가. 특정 아이템(`u66`)에 `hard:true` 누락을 하드코딩으로 보정.
- `update-gift-cats.js` — 참격/관통/타격 계열 기프트 id별 효과 카테고리(`합위력`/`피해량`/`신속`/`생존` 등)를 하드코딩 목록으로 html `GIFT_CATS` 상수에 반영 — 기존 항목은 갱신, 없는 항목은 신규 추가.

### scripts/util — 검증·보조 도구

- `compare-all.js` — html의 등급/synth/hard/extreme 플래그를 API 값과 대조해 불일치 항목 리포트.
- `find-missing.js` — API에는 있는데 html `DATA`에 없는 아이템을 키워드별로 그룹핑해 출력.
- `import-missing.js` — find-missing과 동일 탐지 후, 누락 아이템을 실제로 해당 섹션 배열 끝에 자동 삽입까지 수행.
- `validate-grades.js` — html의 hard/extreme 태그가 API grades와 일치하는지 검증, 누락/오기재 리포트.
- `download-ego-images.js` — API를 순회하며 기프트 이미지를 다운로드, 존재 검증 후 이름→경로 매핑을 `data/ego-gift-img-map.json`으로 저장.
- `embed-icons.js` — `ego-gift-html/icons/*.webp`를 base64 data URI로 변환해 html 내 아이콘 참조를 인라인 치환, 결과를 `ego-gift-html/ego-universal-gifts-embedded.html`로 저장(원본 안 건드림, 배포용 단일 파일 생성).
- `fix-chain-layout.js` — html 안 손상된 `CHAIN_LAYOUT` 상수 블록을 하드코딩해둔 원본 값으로 강제 복구하는 1회성 땜빵 스크립트.
- `list-secs.js` — html `DATA`에서 slash/pierce/blunt 섹션만 뽑아 id/name/desc를 콘솔에 출력하는 조회용 디버그 스크립트.
- `cleanup_crawled.js` — `crawled/` 하위 모든 md 파일을 순회해 `display:none` 잔재 노이즈 줄 제거 + 연속 빈 줄을 2개로 축소, 절약 용량 로그 출력.

## story-workspace

게임/영화/일상 경험을 기록하는 개인 감상 공간. 상세 규칙은 [`story-workspace/CLAUDE.md`](story-workspace/CLAUDE.md) 참조.

- `AiChatHistory/chatGpt/classified/` — 과거 ChatGPT 대화 아카이브, 주제별 분류(개발-코딩/게임/과학-잡학/기타)
- `AiChatHistory/claudeCode/` — Claude Code 관련 메모 (예: `architecture.md`)
- `me.md` — 개인정보 포함이라 gitignore 대상. 원본은 집 PC에만 존재, 이 사본에는 없음

## 실행

```powershell
./launch-workspaces.ps1
```

Windows Terminal 있으면 탭 2개(limbus-workspace / story-workspace)로 각각 `claude` 실행.

## 정리 완료

- [x] **`.idea/` 커밋 해제** — IntelliJ 자동 생성 로컬 설정 5개, `git rm --cached` + `.gitignore`에 `.idea/` 추가.
- [x] **디버그/산출물 파일 커밋 해제** — `debug.log`, `gen_data_out.txt`는 실행할 때마다 재생성되는 파일, `.gitignore` 추가 후 트래킹 해제.
- [x] **limbus-workspace 루트 JSON → `data/`로 이동** — `cardpacks.json`, `cardpack-floors.json`, `egogift-recipes.json`, `ego-gifts-raw.json`, `egogifts-api.json`, `ego-gift-img-map.json`, `gift-img-const.js`, `공용_후보목록.txt` 전부 `data/`로 이동. `scripts/` 하위 파일들의 참조 경로도 함께 수정.
- [x] **스크립트 경로 불일치 전체 수정** — `scripts/{crawl,gen,parse,update,util}/`로 재구성되면서 `__dirname`/bare 상대경로가 실제 위치(`ego-gift-html/`, `crawled/`, 루트 `debug.log`)와 어긋나 있던 것 15개 파일에서 수정. 전부 `path.join(__dirname, '..', '..', ...)` 형태로 통일해 실행 위치(CWD) 상관없이 항상 올바른 대상 참조하도록 변경. `embed-icons.js`의 리포 밖(`C:/Users/EJG/Downloads/`) 하드코딩 출력 경로도 `ego-gift-html/` 안으로 이동.

## 확인 후 문제없음으로 정리

- **`ego-gift-html.zip` vs `ego-gift-html/`** — zip은 gitignore, 압축 안 푼 폴더만 커밋되는 게 의도된 상태. 이미지/아이콘을 폴더가 직접 물고 있어야 하는 HTML이라 분리 불가. zip 파일 자체도 디스크에 이미 없음 — 조치 불필요.
- **`package.json` 없음** — 원본 개발 환경(집 PC)에 있음. 이 사본에는 원래 없는 게 맞음.
- **파일명 한글/영문 혼용(`공용_후보목록.txt`)** — 사용자 개인 기록 파일, 의도적으로 그대로 둠.

> 참고: 원본 개인 데이터(`crawled/`, `me.md` 등)는 집 PC에만 존재, 이 사본은 gitignore로 걸러진 상태 — 정상.
