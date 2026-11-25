const A=require('node:assert/strict'),P=require('../dist/poker.js'),H=require('../dist/hula.js');
const id=(rank,suit)=>suit*13+rank-1;
const wheel=[1,2,3,4,5].map((v,i)=>id(v,i%4));
A.equal(P.evaluate(wheel).category,'스트레이트');
A(P.evaluate([2,3,4,5,6].map((v,i)=>id(v,i%4))).score>P.evaluate(wheel).score);
A.equal(P.evaluate([0,13,26,1,14,27,51]).category,'풀 하우스');
A.equal(P.evaluate([0,9,10,11,12,17,23]).category,'스트레이트 플러시');
// Three unequal contributions. The weakest hand gets its uncalled excess back.
const side={phase:'bet',street:3,button:2,turn:2,price:100,raises:1,board:[1,16,31,46,9],report:[],players:[
  {cards:[0,13],paid:20,bet:20,chips:0,pending:false},{cards:[12,25],paid:60,bet:60,chips:0,pending:false},{cards:[11,24],paid:90,bet:90,chips:10,pending:true}]};
A(P.play(side,'call'));A.deepEqual(side.players.map(p=>p.chips),[60,80,40]);
A(H.meld([6]));A(H.meld([12,0,11]));A(!H.meld([12,0,1]));
const t=H.start(2);t.discard=[2];t.players[0].cards=[0,1,30];A(!H.play(t,{kind:'thanks',cards:[30]}));A(H.play(t,{kind:'thanks',cards:[0,1]}));A(t.players[0].open);A(H.play(t,{kind:'discard',cards:[30]}));A.equal(t.phase,'result');
for(const count of [2,3,4])for(let i=0;i<30;i++){
  const poker=P.start(count),hula=H.start(count);
  for(let r=0;r<5;r++){
    let steps=0;
    while(poker.phase!=='result'){
      A(++steps<200);A(P.play(poker,P.ai(poker)));
    }
    A.equal(poker.players.reduce((n,p)=>n+p.chips,0),count*200);
    if(poker.players.filter(p=>p.chips).length<2)break;
    if(r<4)P.deal(poker);
  }
  for(let r=0;r<5;r++){
    let steps=0;
    while(hula.phase!=='result'){
      A(++steps<500);A(H.play(hula,H.ai(hula)));
      const all=[...hula.deck,...hula.discard,...hula.groups.flatMap(m=>m.cards),...hula.players.flatMap(p=>p.cards)];
      A.equal(all.length,52);A.equal(new Set(all).size,52);
    }
    if(r<4)H.deal(hula);
  }
}
console.log('Poker ranks, side pots, Hula melds and 2–4 seat tables OK');
