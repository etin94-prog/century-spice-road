# 센추리 · 향신료의 길

첫 화면에서 독립판 1·2·3과 조합판 1+2·1+2+3·1+3을 선택합니다. 판마다 별도로 저장되고 초대 링크는 해당 대국으로 연결됩니다. 조합판의 종료·재현 검사는 `node qa/combinations.cjs`로 실행합니다. [Ⅱ 동방의 바다](https://etin94-prog.github.io/century-spice-road/expedition.html?edition=2)에서는 역순으로 출항 화물과 섬을 고르고, 항해·교역소 건설·납품을 진행합니다. [Ⅲ 신대륙의 개척자](https://etin94-prog.github.io/century-spice-road/expedition.html?edition=3)에서는 정착민을 배치·회수하고 요새의 승점 카드와 보너스를 모읍니다. 각 편은 별도로 기기에 저장됩니다. 초대 링크에는 판본이 포함됩니다.

2·3편 규칙은 [출판사 규칙서](https://cdn.svc.asmodee.net/production-nextmove/uploads/sites/4/2024/06/EN_Century-BB_rules_lowres.pdf), [2편 영상](https://www.youtube.com/watch?v=Dv7dp6Ir2D0), [3편 영상](https://www.youtube.com/watch?v=PbqoAnf8_rg)으로 확인했습니다. 수치 대조에는 [2편 구성품](https://steamcommunity.com/sharedfiles/filedetails/?id=2211334114)과 [3편 구성품](https://steamcommunity.com/sharedfiles/filedetails/?id=3776599714)을 사용했습니다. 지형 삽화는 이 프로젝트용으로 생성했습니다.

엔진 완주 검사는 `node qa/expeditions.cjs`, 공개 초대방 검사는 `node qa/expedition-room.cjs 2`와 `node qa/expedition-room.cjs 3`으로 실행합니다.

휴대폰에서 AI 1~3명과 플레이하는 한국어 보드게임입니다. 상대마다 Easy, Medium, Hard, Hell을 선택할 수 있습니다.

[휴대폰에서 게임 열기](https://etin94-prog.github.io/century-spice-road/)

![모바일 접속 QR 코드](mobile-qr.png)

공개 GitHub Pages에서 로그인 없이 플레이할 수 있습니다. AI 대국은 플레이한 브라우저에 저장됩니다. 친구 대국의 행동 기록은 Firebase에 저장됩니다.

## 로컬 실행

저장소 루트에서 다음 명령을 실행하고 브라우저에서 http://localhost:8000 을 엽니다. Python 3가 필요합니다.

~~~sh
python -m http.server 8000 --bind 127.0.0.1 --directory dist
~~~

## 소스 구성

- `dist/index.html`, `style.css`, `view.js`, `table.js` — 모바일 보드, 카드 조작, 대국 화면
- `dist/game.js`, `cards.js` — 게임 규칙과 카드 데이터
- `dist/strategy.js`, `ai-worker.js` — 난이도별 AI와 백그라운드 연산
- `dist/art/` — 카드 삽화

## 친구 초대 대전

대국 설정에서 **친구 초대 대전**을 누르고 방 링크를 공유하세요. 방장을 포함해 사람 2~4명이 입장할 수 있습니다. 방장은 대기실에서 전체 인원을 정하고, 남은 좌석의 AI를 각각 Easy, Medium, Hard, Hell 중에서 고른 뒤 시작합니다. 예를 들어 사람 두 명이 들어온 뒤 전체 인원을 4인으로 두면 AI 두 명이 참여합니다. 기본 난이도는 Medium입니다.

같은 기기와 브라우저에서 초대 링크를 다시 열면 원래 좌석으로 복귀합니다. 게임을 열고 있는 참가자가 AI 차례를 진행합니다. 방장이 나가도 친구가 남아 있으면 AI는 계속 두고, 사람의 연결이 끊긴 상태에서 차례가 오면 약 9초 후 방장이 대기실에서 그 사람 좌석에 지정한 AI가 대신 둡니다. 각 좌석의 대행 난이도는 기본 Medium이며 Easy·Medium·Hard·Hell 중 선택합니다. 같은 브라우저에서 방 링크를 다시 열면 원래 좌석으로 복귀합니다. 기존 2인 초대 링크도 계속 이용할 수 있습니다.

대국 중 방장은 **초대방 → 사람 좌석별 대행 AI**에서 난이도를 바꿀 수 있습니다. 선택하면 해당 좌석에 저장되며, 이미 시작된 대행 차례는 기존 난이도로 마칩니다.

초대방의 1번 좌석인 방장이 선입니다. 대국 중 상대 상단에서는 보유 향신료, 사용한 상인 카드, 손패와 달성한 주문의 장수를 확인할 수 있습니다. 손패와 모은 주문의 앞면 및 합산 점수는 대국 종료 후 확인할 수 있습니다. 이 공개 범위는 게임 화면에 적용되며, 현재 클라이언트는 행동 기록으로 전체 판을 재현합니다.

## 베타 검증 재실행

저장소 루트에서 `node qa/rules.cjs`를 실행하면 덱 구성, 핵심 규칙 및 2~4인 대국 재현을 검사합니다. Pages 배포 전에도 같은 검사가 실행됩니다. 카드 수치는 [독립 참조 덱](https://github.com/phate09/century-spice-road-env/blob/main/century_env/cards.py)과 대조했습니다. 규칙 기준은 [2024년판 공식 규칙서](https://cdn.svc.asmodee.net/production-nextmove/uploads/sites/4/2024/06/EN-Century-Spice-Road-Rules_2024_compressed.pdf)입니다.

| 명령 | 검사 범위 |
|---|---|
| `node qa/rules.cjs --tournament` | 같은 배치에서 선후공을 바꿔 네 난이도가 96판 대결합니다. 환경 변수 `QA_SEED_OFFSET=1500`으로 별도의 96판을 실행할 수 있습니다. |
| `node qa/mobile.cjs` | 로컬 게임을 열어 화면 회전, 전체화면, 속도와 음량 저장, 손패 선택과 터치 드래그를 검사합니다. |
| `node qa/room.cjs 3` 또는 `node qa/room.cjs 4` | 독립된 사람 좌석 3개와 AI 1개 또는 사람 좌석 4개로 실제 초대방을 만들고, 매 사람 턴의 판 상태와 모든 최종 결과표를 대조합니다. |
| `node qa/room.cjs 3 --recovery` | 친구 브라우저를 닫고 대행 중 난이도를 바꿔, 두 번의 대행과 복귀 후 직접 플레이를 확인합니다. |

브라우저 검사는 Node에서 불러올 수 있는 Playwright와 Edge를 사용합니다. WebKit을 설치하고 모바일 검사에서 `QA_BROWSER=webkit`을 지정하면 동일한 화면에서 터치 선택을 시험합니다. `GAME_URL`로 대상 주소를 지정할 수 있으며, 초대방 검사의 기본 대상은 공개 Pages입니다.
