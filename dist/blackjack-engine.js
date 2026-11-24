'use strict';
const Blackjack=(()=>{
  const rank=id=>id%13;
  const pip=id=>Math.min(rank(id)+1,10);
  function score(cards){
    let total=cards.reduce((n,id)=>n+pip(id),0);
    const soft=cards.some(id=>rank(id)===0)&&total+10<=21;
    return {total:total+(soft?10:0),soft};
  }
  function shuffle(){
    const cards=Array.from({length:312},(_,i)=>i%52);
    for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
    return cards;
  }
  function table(count=1){return {bots:Array.from({length:count-1},()=>({chips:500,hand:null})),phase:'bet',chips:500,stake:10,round:0,shoe:[],hands:[],dealer:[],index:0,insurance:0,net:0};}
  function deal(g){
    if(g.phase!=='bet'||!Number.isInteger(g.stake)||g.stake<2||g.stake%2||g.stake>g.chips)return false;
    if(g.shoe.length<65)g.shoe=shuffle();
    g.round++;g.before=g.chips;g.chips-=g.stake;g.index=0;g.insurance=0;
    const cards=[];g.hands=[{cards,bet:g.stake}];g.dealer=[];
    for(const bot of g.bots){
      const bet=Math.min(10,bot.chips);
      bot.hand=bet>=2?{cards:[],bet}:null;
      if(bot.hand)bot.chips-=bet;
    }
    for(let i=0;i<2;i++){
      cards.push(g.shoe.pop());for(const bot of g.bots)if(bot.hand)bot.hand.cards.push(g.shoe.pop());
      g.dealer.push(g.shoe.pop());
    }
    g.phase=rank(g.dealer[0])===0?'insurance':'play';
    if(g.phase==='play')peek(g);return true;
  }
  function peek(g){
    if(score(g.dealer).total===21)settle(g);
    else if(score(g.hands[0].cards).total===21)finishHand(g);
    else g.phase='play';
  }
  function settle(g){
    const dealer=score(g.dealer).total,natural=dealer===21&&g.dealer.length===2;
    const seats=[{hands:g.hands,owner:g},...g.bots.filter(b=>b.hand).map(b=>({hands:[b.hand],owner:b}))];
    for(const {hands,owner} of seats)for(const h of hands){
      const v=score(h.cards).total,bj=hands.length===1&&v===21&&h.cards.length===2;
      let factor=0;
      if(v>21)h.result='버스트';
      else if(natural&&!bj)h.result='딜러 블랙잭';
      else if(bj&&!natural){h.result='블랙잭';factor=2.5;}
      else if(v===dealer){h.result='무승부';factor=1;}
      else if(dealer>21||v>dealer){h.result='승리';factor=2;}
      else h.result='패배';
      owner.chips+=h.bet*factor;
    }
    if(natural)g.chips+=3*g.insurance;
    g.net=g.chips-g.before;g.phase='result';
  }
  function actions(g){
    if(g.phase==='insurance')return g.chips>=g.stake/2?['decline','insure']:['decline'];
    if(g.phase!=='play')return [];
    const h=g.hands[g.index],options=['hit','stand'];
    if(h.cards.length===2&&g.chips>=h.bet){
      options.push('double');
      if(g.hands.length<4&&pip(h.cards[0])===pip(h.cards[1]))options.push('split');
    }
    return options;
  }
  function finishHand(g){
    if(g.index+1<g.hands.length){
      g.index++;const h=g.hands[g.index];
      if(h.cards.length===1)h.cards.push(g.shoe.pop());
      if(h.splitAce||score(h.cards).total>=21)finishHand(g);
    }else {g.botIndex=0;g.phase=g.bots.length?'bots':'dealer';}
  }
  function play(g,action){
    if(!actions(g).includes(action))return false;
    const h=g.hands[g.index];
    if(g.phase==='insurance'){
      if(action==='insure'){g.insurance=g.stake/2;g.chips-=g.insurance;}
      peek(g);
    }else if(action==='split'){
      const ace=rank(h.cards[0])===0;
      g.chips-=h.bet;g.hands.splice(g.index+1,0,{cards:[h.cards.pop()],bet:h.bet,splitAce:ace});
      h.cards.push(g.shoe.pop());h.splitAce=ace;
      if(ace||score(h.cards).total===21)finishHand(g);
    }else{
      if(action==='double'){g.chips-=h.bet;h.bet*=2;}
      if(action!=='stand')h.cards.push(g.shoe.pop());
      if(action!=='hit'||score(h.cards).total>=21)finishHand(g);
    }
    return true;
  }
  function dealerStep(g){
    if(g.phase==='bots'){
      const bot=g.bots[g.botIndex],h=bot.hand;
      if(h&&score(h.cards).total<17)h.cards.push(g.shoe.pop());
      else g.botIndex++;
      if(g.botIndex===g.bots.length)g.phase='dealer';
      return;
    }
    if(g.phase!=='dealer')return;
    if([...g.hands,...g.bots.filter(b=>b.hand).map(b=>b.hand)].some(h=>score(h.cards).total<=21 && !(h.cards.length===2&&score(h.cards).total===21&&(g.hands.length===1||!g.hands.includes(h))))&&score(g.dealer).total<17)g.dealer.push(g.shoe.pop());
    else settle(g);
  }
  return {table,score,rank,pip,deal,actions,play,dealerStep};
})();
if(typeof module!=='undefined')module.exports=Blackjack;
