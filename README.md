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

## 친구와 2인 대전

대국 설정에서 **친구와 2인 대전**을 누른 뒤 생성된 방의 초대 링크를 한 명에게 보내세요. 첫 번째로 입장한 친구가 후공입니다. 같은 기기와 브라우저에서 그 방 링크를 다시 열면 기존 좌석으로 복귀합니다. 모바일 메신저에서 열 때는 처음부터 계속 사용할 브라우저로 접속하세요. 이 버전은 친구끼리 하는 2인전용이며, 서버는 좌석과 행동 순서를 검사하고 양쪽 게임 엔진이 행동 기록을 재생합니다.
