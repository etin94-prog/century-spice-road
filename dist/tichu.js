'use strict';
const Tichu=(()=>{
  const M=52,DOG=53,PH=54,DR=55,rank=c=>c===M?1:c<52?(c%13===0?14:c%13+1):0;
  const points=cards=>cards.reduce((sum,c)=>sum+(c===PH?-25:c===DR?25:[10,13].includes(rank(c))?10:rank(c)===5?5:0),0);
  const labels={one:'싱글',pair:'페어',three:'트리플',full:'풀하우스',steps:'연속 페어',run:'스트레이트',bomb:'폭탄',dog:'개'};
  const cache=new Map();
  function pool(hand){
    const key=hand.slice().sort((a,b)=>a-b).join(',');
    if(cache.has(key))return cache.get(key);
    const out=[],by=Array.from({length:15},()=>[]);
    for(const c of hand){if(rank(c))by[rank(c)].push(c);out.push({cards:[c],type:c===DOG?'dog':'one',high:c===DR?16:c===PH?1.5:rank(c)});}
    const hasP=hand.includes(PH);
    function choices(list,n){
      if(!n)return [[]];if(list.length<n)return [];
      return list.flatMap((c,i)=>choices(list.slice(i+1),n-1).map(rest=>[c,...rest]));
    }
    function sets(r,n,phoenix=true){
      return [...choices(by[r],n),...(hasP&&phoenix&&r>=2?choices(by[r],n-1).map(v=>[...v,PH]):[])];
    }
    function add(cards,type,high){out.push({cards,type,high});}
    for(let r=2;r<=14;r++){
      for(const p of sets(r,2))add(p,'pair',r);
      for(const t of sets(r,3)){
        add(t,'three',r);
        for(let k=2;k<=14;k++)if(k!==r)for(const p of sets(k,2,!t.includes(PH)))add([...t,...p],'full',r);
      }
      if(by[r].length===4)add([...by[r]],'bomb',r);
    }
    function sequence(start,r,cards,step,used){
      if(r>14)return;
      const options=step===1?[...by[r].map(c=>[c]),...(hasP&&!used&&r>=2?[[PH]]:[])]:sets(r,2,!used);
      for(const next of options){
        const row=[...cards,...next],wild=used||next.includes(PH);
        if(r-start+1>=(step===1?5:2)){
          const bomb=step===1&&!wild&&row.every(c=>c<52&&Math.floor(c/13)===Math.floor(row[0]/13));
          add(row,bomb?'bomb':step===1?'run':'steps',r);
        }
        sequence(start,r+1,row,step,wild);
      }
    }
    for(let i=1;i<=14;i++){sequence(i,i,[],1,false);if(i>=2)sequence(i,i,[],2,false);}
    if(cache.size>128)cache.clear();cache.set(key,out);return out;
  }
  function legal(g,i=g.turn){
    const top=g.top,turn=i===g.turn;
    if(g.phase!=='play'||!g.p[i].hand.length)return [];
    let moves=pool(g.p[i].hand).filter(m=>{
      if(!turn&&(!top||m.type!=='bomb'))return false;
      if(!top)return true;
      if(m.type==='dog')return false;
      if(m.type==='bomb')return top.type!=='bomb'||m.cards.length>top.cards.length||(m.cards.length===top.cards.length&&m.high>top.high);
      if(m.type!==top.type||m.cards.length!==top.cards.length)return false;
      return m.cards[0]===PH&&m.type==='one'?top.high<15:m.high>top.high;
    });
    if(turn&&g.wish){
      const obey=moves.filter(m=>m.cards.some(c=>rank(c)===g.wish));
      if(obey.length)moves=obey;
    }
    return moves;
  }
  function required(g,i){return !!g.wish&&legal(g,i).some(m=>m.cards.some(c=>rank(c)===g.wish));}
  function next(g,i){for(let k=1;k<=4;k++)if(g.p[(i+k)%4].hand.length)return (i+k)%4;return -1;}
  function start(){const g={totals:[0,0],round:0};deal(g);return g;}
  function deal(g){
    const deck=Array.from({length:56},(_,i)=>i);for(let i=55;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    Object.assign(g,{round:g.round+1,phase:'grand',turn:0,wish:0,top:null,leader:-1,pile:[],passed:[],order:[],last:'',interrupt:false});
    g.p=Array.from({length:4},()=>({hand:deck.splice(0,8),later:[],won:[],call:0,played:false,received:[]}));
    for(const p of g.p)p.later=deck.splice(0,6);
  }
  function strength(h){return h.reduce((v,c)=>v+(c===DR?3:c===PH?2:rank(c)>=13?1:0),0);}
  function grand(g,yes){
    if(g.phase!=='grand')return false;
    g.p.forEach((p,i)=>{p.call=(i?strength(p.hand)>=6:yes)?200:0;p.hand.push(...p.later);p.later=[];});
    g.phase='exchange';return true;
  }
  function small(g,i){const p=g.p[i];if(!['exchange','play'].includes(g.phase)||p.played||p.call)return false;p.call=100;return true;}
  function exchange(g,picks){
    if(g.phase!=='exchange'||picks.length!==3||new Set(picks).size!==3||!picks.every(c=>g.p[0].hand.includes(c)))return false;
    const gifts=[picks,...g.p.slice(1).map(p=>{
      if(!p.call&&strength(p.hand)>=8)p.call=100;
      const v=p.hand.slice().sort((a,b)=>(a===DR?17:a===PH?16:rank(a))-(b===DR?17:b===PH?16:rank(b)));return [v[0],v.at(-1),v[1]];
    })];
    gifts.forEach((v,i)=>{g.p[i].hand=g.p[i].hand.filter(c=>!v.includes(c));});
    gifts.forEach((v,i)=>v.forEach((c,j)=>{const dest=g.p[(i+j+1)%4];dest.hand.push(c);dest.received.push({from:i,c});}));
    g.turn=g.p.findIndex(p=>p.hand.includes(M));g.phase='play';return true;
  }
  function finish(g){
    const first=g.order[0],delta=[0,0];
    if(g.order[1]%2===first%2)delta[first%2]=200;
    else{
      const tail=g.p.findIndex(p=>p.hand.length);
      for(let i=0;i<4;i++)delta[(i===tail?first:i)%2]+=points(g.p[i].won);
      delta[1-tail%2]+=points(g.p[tail].hand);
    }
    g.p.forEach((p,i)=>delta[i%2]+=p.call*(i===first?1:-1));
    g.delta=delta;g.totals=g.totals.map((v,i)=>v+delta[i]);g.phase='result';g.interrupt=false;
  }
  function collect(g,to){
    g.p[to].won.push(...g.pile);g.pile=[];g.top=null;g.passed=[];g.turn=g.p[g.leader].hand.length?g.leader:next(g,g.leader);g.interrupt=false;
    if(g.order.length>=3)finish(g);
  }
  function endTrick(g){if(g.top.cards.length===1&&g.top.cards[0]===DR){g.phase='dragon';g.turn=g.leader;}else collect(g,g.leader);}
  function gift(g,to){if(g.phase!=='dragon'||![0,1,2,3].includes(to)||to%2===g.leader%2)return false;g.phase='play';collect(g,to);return true;}
  function play(g,i,m,wish=0){
    const match=legal(g,i).find(v=>v.type===m.type&&v.high===m.high&&v.cards.length===m.cards.length&&v.cards.every(c=>m.cards.includes(c)));
    if(!match||!Number.isInteger(wish)||wish<0||wish===1||wish>14)return false;
    const p=g.p[i],before=g.top;
    p.hand=p.hand.filter(c=>!match.cards.includes(c));p.played=true;if(!p.hand.length)g.order.push(i);
    g.pile.push(...match.cards);g.passed=[];g.leader=i;g.interrupt=false;
    if(g.wish&&match.cards.some(c=>rank(c)===g.wish))g.wish=0;
    if(match.cards.includes(M))g.wish=wish;
    g.top={...match,high:match.type==='one'&&match.cards[0]===PH?(before?before.high+.5:1.5):match.high};
    g.last=(i+1)+'번 · '+labels[match.type];
    if(g.order.length>=2&&g.order[0]%2===g.order[1]%2){finish(g);return true;}
    if(g.order.length===3){endTrick(g);return true;}
    if(match.type==='dog'){p.won.push(...g.pile);g.pile=[];g.top=null;const partner=(i+2)%4;g.turn=g.p[partner].hand.length?partner:next(g,partner);}
    else g.turn=next(g,i);
    return true;
  }
  function pass(g,i){
    if(g.phase!=='play'||i!==g.turn||!g.top||required(g,i))return false;
    g.passed.push(i);g.last=(i+1)+'번 · 패스';g.turn=next(g,i);
    if(g.p.every((p,j)=>j===g.leader||!p.hand.length||g.passed.includes(j)))endTrick(g);
    return true;
  }
  function ai(g,i){
    const moves=legal(g,i),obey=required(g,i);
    if(!moves.length||g.top&&g.leader%2===i%2&&!obey&&!moves.some(m=>m.cards.length===g.p[i].hand.length))return null;
    const cost=m=>(m.cards.length===g.p[i].hand.length?-200:0)+(m.type==='bomb'?40:0)+(m.cards.includes(PH)?12:0)+m.high-(g.top?0:6*m.cards.length);
    return moves.reduce((a,b)=>cost(a)<=cost(b)?a:b);
  }
  return {start,deal,grand,exchange,small,legal,required,play,pass,gift,ai,pool,rank,points,labels,M,DOG,PH,DR};
})();
if(typeof module!=='undefined')module.exports=Tichu;
