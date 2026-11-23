"use strict";
const guildModes=['base','cities','posts','orient','forts'];
const guildNames={base:'기본판',cities:'도시',posts:'교역소',orient:'동방',forts:'성채'};
const guildRules={cities:'귀족 대신 도시 3개를 공개합니다. 명성과 할인 조건을 채워 도시를 얻으면 마지막 라운드입니다. 도시 소유자끼리 명성을 비교합니다.',posts:'턴 종료에 조건을 채우면 교역소 권능을 영구 획득합니다. 구매 보상, 추가 보석, 황금 강화, 귀족 명성, 문장 명성을 활용하세요.',orient:'각 단계에 동방 카드 두 장이 추가됩니다. 주머니 복제, 가상 황금, 귀족 예약, 무료 연쇄 획득과 보너스 반납이 가능합니다.',forts:'구매할 때마다 성채 하나를 놓거나 옮기거나 상대 성채를 제거합니다. 점유 카드는 소유자만 살 수 있고, 성채 셋을 모으면 정복 구매를 할 수 있습니다.'};
const guildPowers=['구매 후 보석 1개','같은 색 2개 획득 시 다른 보석 1개','황금 1개로 같은 색 2개 지불','명성 +5','내 문장마다 명성 +1'];
// Printed costs in white, blue, green, red, black order (hexanome-04/splendor, resources/cards.csv).
const guildCost=s=>[4,1,2,3,0].map(i=>+s[i]);
const cityFaces=[
 [13,'00043'],[13,'34000'],[17,'00000'],[13,'00304'],[13,'40030'],[16,'11111'],[11,'33033'],
 [12,'00000',6],[14,'00400',4],[14,'21122'],[11,'30333'],[15,'00000',5],[13,'03400'],[13,'22222']
].map(([vp,s,wild=0])=>({vp,cost:guildCost(s),wild}));
const specialText={pair:'보너스 복제',gold:'가상 황금 2',double:'할인 ×2',noble:'귀족 예약',chain1:'복제 · Ⅰ 획득',chain2:'Ⅱ 획득',sacrifice:'보너스 반납'};
function orientGroup(tier,ability,costs,colors,vp=0){
  costs.split(' ').forEach((s,j)=>catalog.push({id:catalog.length,tier,color:colors[j],cost:guildCost(s),vp,ability}));
}
orientGroup(0,'pair','02030 30020 03200 00302 20003',[-1,-1,-1,-1,-1]);
orientGroup(0,'gold','00030 00300 03000 30000 00003',[-1,-1,-1,-1,-1]);
orientGroup(1,'double','30004 04300 40030 00403 03040',[1,4,2,3,0]);
orientGroup(1,'noble','02222 22022 22202',[4,2,3],1);
orientGroup(1,'chain1','00431 43001',[-1,-1]);
orientGroup(2,'sacrifice','02000 00020 00200 00002 20000',[2,0,3,4,1],3);
orientGroup(2,'chain2','16300 01630 00163 30016 63001',[4,1,2,3,0]);
function guildSetup(g,mode,random){
  if(!guildModes.slice(1).includes(mode))return g;
  g.mode=mode;
  if(mode==='cities'){
    g.nobles=[];g.cities=shuffled([0,1,2,3,4,5,6],random).slice(0,3).map(i=>i+(random()<.5?0:7));
  }
  if(mode==='orient')for(let t=0;t<3;t++){
    const deck=shuffled(catalog.filter(c=>c.ability&&c.tier===t).map(c=>c.id),random);
    g.decks.push(deck);g.market.push(deck.splice(0,2));
  }
  if(mode==='forts')g.forts={};
  for(const p of g.players){
    if(mode==='posts')p.posts=[];
    if(mode==='orient'){p.pairs={};p.privateNobles=[];}
  }
  return g;
}
function guildPoints(p){return (p.posts?.includes(3)?5:0)+(p.posts?.includes(4)?p.posts.length:0);}
function cityEligible(p,n){
  const c=cityFaces[n];return score(p)>=c.vp&&c.cost.every((v,i)=>p.bonus[i]>=v)&&(!c.wild||p.bonus.some((v,i)=>!c.cost[i]&&v>=c.wild));
}
function guildColor(p,id){const c=catalog[id];return c.color>=0?c.color:(p.pairs?.[id]??-1);}
function powerCheck(p){
  const [black,blue,green,red,white]=p.bonus;
  [red>=3&&white>=1,white>=2,blue>=3&&black>=1,green>=5&&p.nobles.length>0,black>=3].forEach((ok,i)=>{if(ok&&!p.posts.includes(i))p.posts.push(i);});
}
function guildBills(p,c){
  const cost=c.cost.map((x,i)=>Math.max(0,x-p.bonus[i])),bars=p.cards.filter(id=>catalog[id].ability==='gold');
  const doubled=p.posts?.includes(2),bills=[];
  function search(i,used,gems){
    if(i===5){
      for(let n=0;n<=Math.min(bars.length,Math.ceil(used/2));n++){
        const gold=Math.max(0,used-2*n);if(gold<=p.tokens[5])bills.push({gems:[...gems,gold],bars:n});
      }
      return;
    }
    for(let n=Math.min(cost[i],p.tokens[i]);n>=0;n--){
      const wild=used+Math.ceil((cost[i]-n)/(doubled?2:1));
      if(wild<=p.tokens[5]+bars.length*2)search(i+1,wild,[...gems,n]);
    }
  }
  search(0,0,[]);
  return bills.sort((a,b)=>(a.bars-b.bars)*10+a.gems[5]-b.gems[5]);
}
function guildBadge(p,id){const c=catalog[id];return c.color<0?specialText[c.ability]:gemNames[c.color]+' '+c.vp+'점'+(c.ability?' · '+specialText[c.ability]:'');}
function guildTurn(original,a,auto=false){
  if(original.over||!a||!Number.isInteger(a.i)||a.i<0||!Array.isArray(a.choices??[]))return null;
  const g={...original,players:original.players.slice(),bank:original.bank.slice(),decks:original.decks.map(d=>d.slice()),market:original.market.map(r=>r.slice()),nobles:original.nobles.slice()};
  const seat=g.turn,p=structuredClone(g.players[seat]);g.players[seat]=p;
  if(g.cities)g.cities=g.cities.slice();if(g.forts)g.forts=structuredClone(g.forts);
  const choices=a.choices??[],chosen=[];let step=0;
  const invalid=Symbol();
  function pick(title,items,label=String){
    if(!items.length)throw invalid;
    if(items.length===1)return items[0];
    let index=choices[step++];
    if(index===undefined){if(!auto)throw {title,labels:items.map(label)};index=0;}
    if(!Number.isInteger(index)||index<0||index>=items.length)throw invalid;
    chosen.push(index);return items[index];
  }
  const row=id=>g.market.findIndex(r=>r.includes(id));
  const allowed=id=>!g.forts?.[id]||g.forts[id].seat===seat;
  const text=id=>guildBadge(p,id)+' (#'+(id+1)+')';
  const token=i=>gemNames[i];
  function removePublic(id){const r=row(id);if(r<0)throw invalid;g.market[r].splice(g.market[r].indexOf(id),1);if(g.forts)delete g.forts[id];return r;}
  function refill(r){if(r>=0&&g.decks[r].length)g.market[r].push(g.decks[r].pop());}
  function gain(i){g.bank[i]--;p.tokens[i]++;}
  function discard(id){const c=catalog[id],color=guildColor(p,id);p.cards.splice(p.cards.indexOf(id),1);if(color>=0)p.bonus[color]-=c.ability==='double'?2:1;if(p.pairs)delete p.pairs[id];}
  function acquire(id,free=false){
    const c=catalog[id];if(!c)throw invalid;
    const pair=c.ability==='pair'||c.ability==='chain1';
    if(pair&&!p.bonus.some(Boolean))throw invalid;
    if(!free&&c.ability==='sacrifice'){
      const color=c.cost.findIndex(Boolean);if(p.bonus[color]<2)throw invalid;
      let owed=2;
      while(owed>0){
        let ids=p.cards.filter(k=>guildColor(p,k)===color);
        const bags=ids.filter(k=>['pair','chain1'].includes(catalog[k].ability));if(bags.length)ids=bags;
        const k=pick('반납할 개발 카드',ids,text);owed-=catalog[k].ability==='double'?2:1;discard(k);
      }
    }else if(!free){
      const bill=pick('지불할 보석',guildBills(p,c),b=>b.gems.map((v,i)=>v?gemNames[i]+v:'').filter(Boolean).join(' ') +(b.bars?' · 가상 황금 카드 '+b.bars:'')||'무료');
      bill.gems.forEach((n,i)=>{p.tokens[i]-=n;g.bank[i]+=n;});
      for(let n=0;n<bill.bars;n++)discard(p.cards.find(k=>catalog[k].ability==='gold'));
    }
    let color=c.color;
    if(pair){color=pick('복제할 보너스',[0,1,2,3,4].filter(i=>p.bonus[i]),token);p.pairs[id]=color;}
    p.cards.push(id);if(color>=0)p.bonus[color]+=c.ability==='double'?2:1;
    if(c.ability==='noble'&&g.nobles.length){
      const n=pick('예약할 귀족',g.nobles,n=>patrons[n].map((v,i)=>v?gemNames[i]+v:'').filter(Boolean).join(' '));g.nobles.splice(g.nobles.indexOf(n),1);p.privateNobles.push(n);
    }
    if(['chain1','chain2'].includes(c.ability)){
      const tier=c.ability==='chain1'?0:1;
      const ids=g.market.flat().filter(k=>catalog[k].tier===tier&&allowed(k)&&(!['pair','chain1'].includes(catalog[k].ability)||p.bonus.some(Boolean))).sort((a,b)=>catalog[b].vp-catalog[a].vp);
      if(ids.length){const k=pick('무료로 얻을 카드',ids,text),r=removePublic(k);acquire(k,true);refill(r);}
    }
  }
  function arrange(){
    const mine=Object.keys(g.forts).map(Number).filter(k=>g.forts[k].seat===seat);
    const supply=3-sum(mine.map(k=>g.forts[k].n));
    const options=[];
    for(const id of g.market.flat()){
      if(!allowed(id)){options.push({id,remove:true});continue;}
      if(supply)options.push({id,from:-1});
      for(const from of mine)if(from!==id)options.push({id,from});
    }
    if(!options.length)return;
    options.sort((a,b)=>(g.forts[b.id]?.seat===seat?g.forts[b.id].n:0)-(g.forts[a.id]?.seat===seat?g.forts[a.id].n:0));
    const o=pick('성채 배치 · 이동 · 철거',options,x=>(x.remove?'상대 성채 철거':x.from<0?'성채 배치':'#'+(x.from+1)+'에서 이동')+' → '+text(x.id));
    const subtract=id=>{if(!--g.forts[id].n)delete g.forts[id];};
    if(o.remove)subtract(o.id);else{if(o.from>=0)subtract(o.from);g.forts[o.id]??={seat,n:0};g.forts[o.id].n++;}
  }
  function purchase(id,held){
    if(held?!p.held.includes(id):row(id)<0||!allowed(id))throw invalid;
    const r=held?-1:removePublic(id);if(held)p.held.splice(p.held.indexOf(id),1);
    acquire(id);
    if(p.posts?.includes(0)&&g.bank.slice(0,5).some(Boolean))gain(pick('구매 보상 보석',[0,1,2,3,4].filter(i=>g.bank[i]),token));
    if(g.forts)arrange();refill(r);
  }
  try{
    if(a.kind==='buy'||a.kind==='held')purchase(a.i,a.kind==='held');
    else if(a.kind==='take'){
      if(!takeOptions(g.bank).some(o=>JSON.stringify(o)===JSON.stringify(a.take)))throw invalid;
      a.take.forEach(gain);
      if(p.posts?.includes(1)&&a.take.length===2&&a.take[0]===a.take[1]){
        const other=[0,1,2,3,4].filter(i=>i!==a.take[0]&&g.bank[i]);if(other.length)gain(pick('추가 보석',other,token));
      }
    }else if(a.kind==='blind'||a.kind==='reserve'){
      if(p.held.length>=3)throw invalid;
      if(a.kind==='blind'){const k=g.decks[a.i]?.pop();if(k==null)throw invalid;p.held.push(k);}
      else{if(!allowed(a.i))throw invalid;const r=removePublic(a.i);p.held.push(a.i);refill(r);}
      if(g.bank[5])gain(5);
    }else throw invalid;
    if(g.forts){
      const k=g.market.flat().find(id=>g.forts[id]?.seat===seat&&g.forts[id].n===3);
      if(k!=null&&guildBills(p,catalog[k]).length&&pick('성채 정복',[true,false],x=>x?text(k)+' 구매':'이번 턴 건너뛰기'))purchase(k,false);
    }
    while(sum(p.tokens)>10){
      const options=[0,1,2,3,4,5].filter(i=>p.tokens[i]).sort((a,b)=>Number(a===5)-Number(b===5)||p.tokens[b]-p.tokens[a]);
      const i=pick('반납할 보석',options,token);p.tokens[i]--;g.bank[i]++;
    }
    const nobles=[...g.nobles,...p.privateNobles||[]].filter(n=>patrons[n].every((v,i)=>v<=p.bonus[i]));
    if(nobles.length){const n=pick('방문할 귀족',nobles,n=>'귀족 '+(n+1)+' · '+patrons[n].map((v,i)=>v?gemNames[i]+v:'').filter(Boolean).join(' '));
      const pool=g.nobles.includes(n)?g.nobles:p.privateNobles;pool.splice(pool.indexOf(n),1);p.nobles.push(n);}
    if(p.posts)powerCheck(p);
    if(g.cities){
      const eligible=g.cities.filter(n=>cityEligible(p,n));
      if(eligible.length){p.city=pick('획득할 도시',eligible,n=>'도시 '+(n+1)+' · '+cityFaces[n].vp+'점');g.cities.splice(g.cities.indexOf(p.city),1);g.last=true;}
    }else g.last||=score(p)>=15;
    if(!auto&&choices.length!==step)throw invalid;
    const msg=({take:'보석 획득',blind:'덱에서 예약',reserve:'공개 카드 예약',buy:'개발 카드 구매',held:'예약 카드 구매'})[a.kind];
    g.log=[{actor:seat,msg:msg+(['buy','held','reserve'].includes(a.kind)?' · '+text(a.i):'')+(nobles.length?' · 귀족 방문':'')+(p.city!=null?' · 도시 획득':'')},...original.log];
    g.turn=(seat+1)%g.players.length;if(!g.turn){if(g.last)g.over=true;else g.round++;}
    return {board:g,choices:chosen};
  }catch(e){if(e===invalid)return null;if(e.labels)return {prompt:e};throw e;}
}
function guildAI(g,level){
  const p=g.players[g.turn],ids=g.market.flat(),actions=[...ids.map(i=>({kind:'buy',i})),...p.held.map(i=>({kind:'held',i})),
    ...takeOptions(g.bank).map(take=>({kind:'take',i:0,take})),...ids.map(i=>({kind:'reserve',i}))];
  function position(q){
    const progress=card=>{const need=card.cost.map((n,i)=>Math.max(0,n-q.bonus[i]-q.tokens[i]));return (2+card.vp*2)/(1+Math.max(0,sum(need)-q.tokens[5]));};
    const city=g.cities?.length?Math.max(...g.cities.map(i=>{
      const c=cityFaces[i],other=Math.max(0,...q.bonus.filter((_,k)=>!c.cost[k]));
      return -sum(c.cost.map((v,k)=>Math.max(0,v-q.bonus[k])))-Math.max(0,c.wild-other);
    })):0;
    return score(q)*6+sum(q.bonus)*2.9+city*2+Math.max(0,...[...ids,...q.held].map(k=>progress(catalog[k])))+sum(q.tokens)*.48+q.tokens[5]*.8-q.held.length*.8+(q.city!=null?200:0);
  }
  let best,max=-Infinity;
  for(const a of actions){
    const result=guildTurn(g,a,true);if(!result)continue;
    let value=position(result.board.players[g.turn])+Math.random()*({Easy:7,Medium:2,Hard:.7,Hell:.12}[level]??1);
    if(['Hard','Hell'].includes(level)&&['reserve','buy'].includes(a.kind)){
      const c=catalog[a.i];
      for(const rival of g.players)if(rival!==p&&payment(rival,c)[5]<=rival.tokens[5]){
        value+=c.vp*.55;
        if(level==='Hell'&&!g.cities&&score(rival)+c.vp>=15)value+=14;
      }
    }
    if(value>max){best={...a,choices:result.choices};max=value;}
  }
  return best;
}
