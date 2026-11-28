// The numbers follow the Switch game shelf, including the two existing casino tables.
// Source order: https://www.nintendo.com/ph/switch/as7t/index.html
export const catalog = [
  ["만칼라", "Mancala"],
  ["점과 상자", "Dots and Boxes"],
  ["요트 다이스", "Yacht Dice"],
  ["사목", "Four-in-a-Row"],
  ["히트 앤 블로", "Hit and Blow"],
  ["나인 멘스 모리스", "Nine Men's Morris"],
  ["헥스", "Hex"],
  ["체커", "Checkers"],
  ["토끼와 사냥개", "Hare and Hounds"],
  ["오목", "Gomoku"],
  ["도미노", "Dominoes"],
  ["차이니즈 체커", "Chinese Checkers"],
  ["루도", "Ludo"],
  ["백개먼", "Backgammon"],
  ["리버시", "Renegade"],
  ["체스", "Chess"],
  ["쇼기", "Shogi"],
  ["미니 쇼기", "Mini Shogi"],
  ["하나후다 · 코이코이", "Hanafuda"],
  ["리치 마작", "Riichi Mahjong"],
  ["라스트 카드", "Last Card"],
  ["블랙잭", "Blackjack"],
  ["포커 · 텍사스 홀덤", "Texas Hold'em"],
  ["대부호", "President"],
  ["세븐스", "Sevens"],
  ["스피드", "Speed"],
  ["짝 맞추기", "Matching"],
  ["전쟁", "War"],
  ["타코야키", "Takoyaki"],
  ["돼지 꼬리", "Pig's Tail"],
  ["골프", "Golf"],
  ["당구", "Billiards"],
  ["볼링", "Bowling"],
  ["다트", "Darts"],
  ["캐롬", "Carrom"],
  ["토이 테니스", "Toy Tennis"],
  ["토이 축구", "Toy Soccer"],
  ["토이 컬링", "Toy Curling"],
  ["토이 복싱", "Toy Boxing"],
  ["토이 야구", "Toy Baseball"],
  ["에어 하키", "Air Hockey"],
  ["슬롯 카", "Slot Cars"],
  ["낚시", "Fishing"],
  ["배틀 탱크", "Battle Tanks"],
  ["팀 탱크", "Team Tanks"],
  ["사격 갤러리", "Shooting Gallery"],
  ["6볼 퍼즐", "6-Ball Puzzle"],
  ["슬라이딩 퍼즐", "Sliding Puzzle"],
  ["마작 솔리테어", "Mahjong Solitaire"],
  ["클론다이크 솔리테어", "Klondike Solitaire"],
  ["스파이더 솔리테어", "Spider Solitaire"],
];
export function title(id) {
  return String(id).padStart(2, '0') + ' · ' + catalog[id - 1][0];
}
export function group(id) {
  return id <= 18 ? '보드' : id <= 30 ? '카드·패' : id <= 46 ? '스포츠·액션' : '퍼즐';
}
export function href(id) {
  return id === 22
    ? 'blackjack.html'
    : id === 23
      ? 'card-table.html?game=poker'
      : 'world-table.html?game=' + id;
}
