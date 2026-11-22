# 센추리 · 향신료의 길

휴대폰에서 AI 1~3명과 플레이하는 한국어 보드게임입니다. 상대마다 Easy, Medium, Hard, Hell을 선택할 수 있습니다.

[휴대폰에서 게임 열기](https://spice-road-duel-sumin.happy-spool-6962.chatgpt.site/)

![모바일 접속 QR 코드](mobile-qr.png)

비공개 배포본은 사이트 소유 계정으로 로그인해 이용합니다. 대국은 플레이한 브라우저에 자동 저장됩니다.

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
