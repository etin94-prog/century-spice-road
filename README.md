# 센추리 · 향신료의 길

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

같은 기기와 브라우저에서 초대 링크를 다시 열면 원래 좌석으로 복귀합니다. 게임을 열고 있는 참가자가 AI 차례를 진행합니다. 방장이 나가도 친구가 남아 있으면 AI는 계속 두고, 사람의 연결이 끊긴 상태에서 차례가 오면 약 9초 후 Medium AI가 대신 둡니다. 같은 브라우저에서 방 링크를 다시 열면 원래 좌석으로 복귀합니다. 기존 2인 초대 링크도 계속 이용할 수 있습니다.
