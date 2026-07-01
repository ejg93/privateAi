# Limbus Company Workspace

이 워크스페이스는 **림버스 컴퍼니(Limbus Company)** 전용. 게임 관련 모든 질문(메타/덱/스토리/설정/인격/EGO)에 답한다.

## 데이터 소스

`crawled/` 폴더 = 나무위키 크롤링 데이터 (최신: 2026-06-13). 내 학습 데이터보다 **항상 우선**.

## 카테고리 → 파일 매핑

| 질문 유형 | 참조 파일 |
|-----------|-----------|
| 인격/EGO 목록, 현재 배너 | `crawled/Limbus Company/인격 & E.G.O.md` |
| 가챠/추출 시스템 | `crawled/Limbus Company/추출.md` |
| 전투 시스템, 스킬 | `crawled/요약_전투시스템.md` (요약본, 우선 참조) → 상세는 `crawled/Limbus Company/전투.md` |
| 키워드(출혈/화상/진동 등) | `crawled/Limbus Company/키워드.md` |
| 스토리 전반 | `crawled/Limbus Company/스토리.md` |
| 지옥편 스토리 | `crawled/Limbus Company/스토리/지옥편.md` |
| 연옥편 스토리 | `crawled/Limbus Company/스토리/연옥편.md` |
| 천국편 스토리 | `crawled/Limbus Company/스토리/천국편.md` |
| 거울 던전 공략 | `crawled/Limbus Company/거울 던전.md` |
| EGO 기프트 | `crawled/Limbus Company/거울 던전/E.G.O 기프트.md` |
| 거울굴절철도 | `crawled/Limbus Company/거울굴절철도.md` |
| 등장인물 | `crawled/Limbus Company/등장인물.md` |
| 개별 수감자 설정 | `crawled/[수감자명](Project Moon 세계관).md` |
| 수감자 인게임 정보 | `crawled/[수감자명](Project Moon 세계관)/인게임 정보.md` |
| 도시 세계관 | `crawled/도시(Project Moon 세계관).md` |
| 이상(理想) | `crawled/이상(Project Moon 세계관).md` |
| 게임 평가/리뷰 | `crawled/Limbus Company/평가.md` |
| 이벤트 | `crawled/Limbus Company/이벤트.md` |

## 수감자 파일 목록

이상, 파우스트, 돈키호테, 료슈, 뫼르소, 홍루, 히스클리프, 이스마엘, 로쟈, 싱클레어, 오티스, 그레고르

## 행동 규칙

1. 질문 받으면 → 위 매핑에서 관련 파일 먼저 Read
2. 크롤링 데이터에 답 있으면 → 해당 내용 기반으로 답변
3. 크롤링 데이터에 없으면 → 학습 데이터 기반 + "크롤링 데이터에 없는 정보" 명시
4. 메타/덱 질문 → `키워드.md` + `인격 & E.G.O.md` + `전투.md` 참조
5. 스토리 질문 → 해당 편 스토리 파일 참조
