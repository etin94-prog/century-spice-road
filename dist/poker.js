'use strict';
const Poker=(()=>{
  const {seat,rank,suit,deck,after}=typeof module==='undefined'?CardTable:require('./card-table-engine.js');
  const names=['하이 카드','원 페어','투 페어','트리플','스트레이트','플러시','풀 하우스','포 카드','스트레이트 플러시'];
  function evaluate(cards){
    const vals=cards.map(id=>rank(id)===1?14:rank(id)).sort((a,b)=>b-a);
    const byCount=[...new Set(vals)].map(r=>[vals.filter(n=>n===r).length,r]).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
    function straight(v){const s=new Set(v);if(s.has(14))s.add(1);for(let hi=14;hi>=5;hi--)if([0,1,2,3,4].every(n=>s.has(hi-n)))return hi;return 0;}
    const flush=[0,1,2,3].map(c=>cards.filter(id=>suit(id)===c)).find(x=>x.length>=5);
    const fv=(flush||[]).map(id=>rank(id)===1?14:rank(id)).sort((a,b)=>b-a);
    const [n,r]=byCount[0],subs=byCount.slice(1),kickers=vals.filter(v=>v!==r);
    let value;
    if(straight(fv))value=[8,straight(fv)];
    else if(n===4)value=[7,r,kickers[0]];
    else if(n===3&&subs[0]?.[0]>=2)value=[6,r,subs[0][1]];
    else if(flush)value=[5,...fv.slice(0,5)];
    else if(straight(vals))value=[4,straight(vals)];
    else if(n===3)value=[3,r,...kickers.slice(0,2)];
    else if(n===2&&subs[0]?.[0]===2)value=[2,r,subs[0][1],kickers.find(v=>v!==subs[0][1])];
    else if(n===2)value=[1,r,...kickers.slice(0,3)];
    else value=[0,...vals.slice(0,5)];
    while(value.length<6)value.push(0);
    return {category:names[value[0]],score:value.reduce((s,v)=>s*15+v,0)};
  }
  const streets=['프리플롭','플롭','턴','리버'];
  // buyin is what a seat has put on the table; chips-buyin is its result. On an
  // open-ended table (limit 0) a broke AI seat buys in again instead of sitting out.
  function start(count,mine=200,limit=5){const g={players:Array.from({length:count},(_,i)=>({chips:i?200:mine,buyin:i?200:mine})),button:-1,round:0,limit};deal(g);return g;}
  function pay(p,n){n=Math.min(p.chips,n);p.chips-=n;p.bet+=n;p.paid+=n;}
  function deal(g){
    if(g.limit===0)for(const p of g.players.slice(1))if(!p.chips){p.chips=200;p.buyin+=200;}
    g.round++;g.street=0;g.phase='bet';g.board=[];g.report=[];g.deck=deck();g.price=10;g.raises=1;
    g.button=after(g,g.button,p=>p.chips>0);
    for(const p of g.players)Object.assign(p,{cards:[],fold:!p.chips,bet:0,paid:0,last:'',pending:p.chips>0});
    const seated=g.players.filter(p=>!p.fold);
    for(let k=0;k<2;k++)for(const p of seated)p.cards.push(g.deck.pop());
    const sb=seated.length===2?g.button:after(g,g.button,p=>!p.fold),bb=after(g,sb,p=>!p.fold);
    pay(g.players[sb],5);pay(g.players[bb],10);g.players[sb].last='SB';g.players[bb].last='BB';advance(g,bb);
  }
  function settle(g){
    const live=g.players.filter(p=>!p.fold),levels=[...new Set(g.players.map(p=>p.paid).filter(Boolean))].sort((a,b)=>a-b);
    let prev=0;
    for(const limit of levels){
      const contributors=g.players.filter(p=>p.paid>=limit),pot=(limit-prev)*contributors.length;prev=limit;
      let eligible=contributors.filter(p=>!p.fold);
      if(!eligible.length)eligible=contributors;
      const score=p=>live.length===1||eligible.length===1?0:evaluate([...p.cards,...g.board]).score;
      const best=Math.max(...eligible.map(score)),winners=eligible.filter(p=>score(p)===best);
      const ids=winners.map(p=>g.players.indexOf(p)).sort((a,b)=>(a-g.button-1+g.players.length)%g.players.length-(b-g.button-1+g.players.length)%g.players.length);
      ids.forEach((id,i)=>{const n=Math.floor(pot/ids.length)+(i<pot%ids.length?1:0);g.players[id].chips+=n;g.report.push({id,n});});
    }
    g.phase='result';g.showdown=live.length>1;
  }
  function advance(g,from){
    const live=g.players.filter(p=>!p.fold);
    if(live.length===1){settle(g);return;}
    const solvent=live.filter(p=>p.chips>0);
    if(solvent.length===1&&solvent[0].bet>=g.price)solvent[0].pending=false;
    g.turn=after(g,from,p=>p.pending&&!p.fold&&p.chips>0);if(g.turn!==-1)return;
    if(g.street===3){settle(g);return;}
    g.street++;g.deck.pop();for(let i=0;i<(g.street===1?3:1);i++)g.board.push(g.deck.pop());
    g.price=0;g.raises=0;
    for(const p of g.players){p.bet=0;p.pending=solvent.length>=2&&!p.fold&&p.chips>0;if(!p.fold)p.last=p.chips?'':'올인';}
    advance(g,g.button);
  }
  const unit=g=>g.street<2?10:20;
  function actions(g){
    if(g.phase!=='bet')return [];
    const p=g.players[g.turn],owe=g.price-p.bet,options=[owe?'call':'check','fold'];
    if(g.raises<4&&p.chips>=owe+unit(g)&&g.players.some(other=>other!==p&&!other.fold&&other.chips>0))options.push('raise');
    return options;
  }
  function play(g,a){
    if(!actions(g).includes(a))return false;
    const p=g.players[g.turn];p.pending=false;
    if(a==='fold'){p.fold=true;p.last='폴드';}
    else if(a==='raise'){g.price+=unit(g);pay(p,g.price-p.bet);g.raises++;for(const other of g.players)if(other!==p&&!other.fold&&other.chips)other.pending=true;p.last=p.chips?'레이즈':'올인';}
    else{pay(p,g.price-p.bet);p.last=p.chips?(a==='check'?'체크':'콜'):'올인';}
    advance(g,g.turn);return true;
  }
  function ai(g){
    const p=g.players[g.turn],options=actions(g),v=p.cards.map(id=>rank(id)===1?14:rank(id));
    const strong=g.board.length?evaluate([...p.cards,...g.board]).score>=15**5:v[0]===v[1]||Math.min(...v)>=10;
    if(options.includes('raise')&&Math.random()<(strong?.52:.07))return 'raise';
    if(options[0]==='call'&&!strong&&Math.random()<.23)return 'fold';return options[0];
  }
  return {start,deal,actions,play,ai,evaluate,streets,unit};
})();
if(typeof module!=='undefined')module.exports=Poker;
