'use strict';
const suits=['♠','♥','♣','♦'],ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const points=[[20,9],[80,9],[20,36],[80,36],[20,64],[80,64],[20,91],[80,91],[50,50],[50,25],[50,75],[50,9],[50,91]];
const layouts=[[8],[11,12],[11,8,12],[0,1,6,7],[0,1,8,6,7],[0,1,2,3,6,7],[0,1,2,3,6,7,9],[0,1,2,3,6,7,9,10],[0,1,2,3,4,5,6,7,8],[0,1,2,3,4,5,6,7,9,10]];
function card(id,animate=false,backLabel="뒷면 카드"){
  if(id===null)return '<span class="card back" role="img" aria-label="'+backLabel+'"></span>';
  const rank=id%13,suit=id/13|0,sign=suits[suit],face=ranks[rank],corner=face+'<small>'+sign+'</small>';
  const center=rank<10?'<span class="pips">'+layouts[rank].map(i=>'<i style="left:'+points[i][0]+'%;top:'+points[i][1]+'%">'+sign+'</i>').join('')+'</span>':'<span class="center">'+['♞','♛','♚'][rank-10]+'</span>';
  return '<span role="img" aria-label="'+['스페이드','하트','클로버','다이아'][suit]+' '+face+'" class="card '+(suit%2?'red ':'')+(animate?'dealIn':'')+'"><span aria-hidden="true"><span class="corner">'+corner+'</span>'+center+'<span class="corner end">'+corner+'</span></span></span>';
}

// Each of these tables uses one deck. Compare within each pile so moving a
// visible card from hand to table still produces a landing at the destination.
function renderCardMove(paint) {
  const piles = ['myCards', 'boardCards'].map(id => document.getElementById(id));
  const cardsIn = pile => Array.from(pile.querySelectorAll('.card[aria-label]'));
  const before = piles.map(pile => new Set(cardsIn(pile).map(face => face.getAttribute('aria-label'))));
  paint();
  piles.forEach((pile, index) => {
    for (const face of cardsIn(pile)) {
      if (!before[index].has(face.getAttribute('aria-label'))) face.classList.add('tableLanding');
    }
  });
}

function confirmCardTouch(event) {
  if (event?.isTrusted && event.pointerType === 'touch' &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navigator.vibrate?.(10);
  }
}
