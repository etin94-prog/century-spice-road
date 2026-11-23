"use strict";
const mixNames={12:'모래에서 바다로',13:'동쪽에서 서쪽으로',123:'세 시대의 교역'};
const mixGuide={
  12:'상인 카드를 영입하거나 사용하세요. 항해할 때는 손패 또는 이미 사용한 카드 한 장당 한 칸 이동합니다. 섬에서는 교역소를 짓고 교환하고, 항구에서는 납품합니다. 휴식하면 모든 카드를 회수합니다. 네 번째 납품이 나오면 라운드를 마칩니다.',
  13:'시장에 정착민을 보내 상인 카드를 즉시 사용하거나 개인 교역로에 추가하세요. 교역로는 다섯 장까지이며, 왼쪽에 빈 카드가 많을수록 사용할 때 더 많은 일꾼이 필요합니다. 여덟 번째 납품이 나오면 라운드를 마칩니다.',
  123:'시장에 배치하면 상인 카드를 사용하고 수집합니다. 네 장마다 보너스를 받습니다. 항해 장소에서는 목적지를 정하고 교역소 건설과 교환을 선택하세요. 여덟 번째 납품이 나오면 라운드를 마칩니다.'
};
const mixWhiteOrders=[
 ['113',3,1,1,1,2],['013',5,1,0,0,3],['012',4,1,0,0,4],['033',3,1,2,1,2],
 ['003',4,1,0,0,2],['112',5,1,0,0,2],['113',2,1,2,1,4],['033',4,1,1,1,4],
 ['222',4,1,1,1,2],['123',4,1,1,1,3],['012',3,1,2,0,3],['112',4,1,2,0,2]
];
const mixCards=[...MERCHANTS,{cost:blank(),gain:[2,0,0,0],up:0},{cost:blank(),gain:blank(),up:2}];
const starter=MERCHANTS.length;
const marks=['points','points','crew','crew','12','03','icon0','icon1','icon2','icon3'];
const mixBonuses=['pair11','pair02','triple120','pair11','cards','icon3','icon3','pair12','pair00','triple120','crew','pair00','cards','pair10','crew','pair13','triple130','pair32','crew','fixed','four','pair10','cards','triple130','pair30'];
const site=(name,special,need,help,more={})=>({name,special,need,help,...more});
function newMix(combo,roles,rng){
  const sea=combo===12,g=newExpedition(sea?2:3,roles,rng);
  g.combo=combo;g.merchantDeck=shuffle(MERCHANTS.map((_,i)=>i),rng);g.market=g.merchantDeck.splice(0,4);g.marketPiles=g.market.map(blank);
  for(const p of g.players){p.hand=sea?[starter,starter+1]:[];p.used=[];p.discards=[];p.route=[];}
  if(sea){
    const tiles=shuffle([...seaRoutes.flatMap((row,suit)=>shuffle(row,rng).slice(0,4).map(recipe=>({suit,recipe}))),...Array.from({length:4},()=>({water:true}))],rng);
    for(const t of g.tiles)if(!t.port){delete t.recipe;delete t.suit;Object.assign(t,tiles.pop());}
    return g;
  }
  g.deck=shuffle([...colonyOrders.filter(c=>c[2]!==1),...mixWhiteOrders].filter(c=>c[5]<=g.players.length),rng);
  const pool=shuffle(marks,rng);const bonuses=shuffle(mixBonuses.filter(b=>combo===123||(!b.startsWith('triple')&&b!=='four')),rng);
  g.tiles=g.tiles.slice(0,combo===13?11:17);
  for(let i=0;i<4;i++){const t=g.tiles[i];t.order=g.deck.pop();t.stacks=combo===123?[]:Array.from({length:i>=2?2:1},()=>bonuses.splice(0,[4,3,2,2][i]));}
  for(const [i,t] of g.tiles.entries())if(!t.fort)t.cover=((i===8||i===9)&&roles.length<3||i>=11)?pool.pop():null;
  const refresh=site('시장 새로고침','refresh',2,2);
  g.tiles.push(refresh);
  if(combo===13)g.tiles.push(site('교역로 재정렬','swap',1,2));
  if(combo===123){
    g.prizes={outpost:[4,4,4,4].map(n=>bonuses.splice(0,n)),market:[2,2,2,2].map(n=>bonuses.splice(0,n))};
    const cells=shuffle(seaRoutes.flatMap((row,suit)=>shuffle(row,rng).slice(0,3).map(recipe=>({recipe,suit}))),rng);
    g.islands=[];for(const [col,h] of [2,3,3,3,2].entries())for(let j=0;j<h;j++){
      const center=col===2&&j===1;g.islands.push({col,y:2*j+(col%2===1?-1:col===2?0:0),owners:[],...(center?{water:true}:cells.pop())});
      if(center)g.players.forEach(p=>p.boat=g.islands.length-1);
    }
    const sailSites=[['배 위치 교역','boatTrade',1,2],['교역소 원격 교역','postTrade',2,2],['자유 항해','move',4,2,99],['한 칸 항해','move',2,0,1],['두 칸 항해','move',3,1,2]];
    for(const [name,type,need,help,range] of sailSites)g.tiles.push(site(name,type,need,help,{range,cover:type==='boatTrade'?pool.pop():null}));
  }
  for(let k=0;k<4;k++)g.tiles.push(site('상인 시장 '+(k+1),'market',[1,1,2,3][k],[0,1,0,1][k],{slot:k}));
  if(combo===13)while(pool.length)g.tiles.push({special:'reserve',name:'탐험 타일',cover:pool.pop()});
  return g;
}
function cardOperations(id,bag){
  const c=mixCards[id];if(!c)return [];
  if(c.up)return [{bag:bag.slice()},...upgradeOptions(bag,c.up)];
  if(!total(c.cost))return [{bag:combine(bag,c.gain)}];
  const ops=[];
  for(let n=1;fits(bag,c.cost.map(x=>x*n));n++)ops.push({bag:combine(bag,combine(c.gain,c.cost,-1),n),n});
  return ops;
}

function cardText(id){
  const c=mixCards[id];if(!c)return '빈 시장';
  if(c.up)return '↑ '+c.up;
  const show=b=>b.map((n,i)=>n?['🟨','🟥','🟩','🟫'][i]+(n===1?'':n):'').join('');
  return (total(c.cost)?show(c.cost)+' → ':'')+show(c.gain);
}
function mixSites(g){
  const p=g.players[g.turn];
  if(g.combo===12)return [...g.tiles,...g.market.map((_,slot)=>site('상인 영입','buy',0,-1,{slot})),...p.hand.map((_,slot)=>site('내 손패','play',0,-1,{slot})),site('휴식','recover',0,-1)];
  return [...g.tiles,...p.route.map((_,slot)=>site('개인 교역로','route',0,-1,{slot})),site('일꾼 회수','recover',0,-1)];
}
function takeMerchant(g,slot){
  const card=g.market.splice(slot,1)[0];g.marketPiles.splice(slot,1);
  if(g.merchantDeck.length){g.market.push(g.merchantDeck.shift());g.marketPiles.push(blank());}return card;
}
function placeWorkers(g,t){
  const p=g.players[g.turn],need=workerCost(p,t);p.ready-=need;
  if(t.occupant)g.players[t.occupant.seat].ready+=t.occupant.n;
  t.occupant={seat:g.turn,n:need};
}
function refreshMarket(g,discard){
  const t=g.tiles.find(x=>x.special==='refresh'),p=g.players[g.turn];
  if(!t||t.cover||t.occupant?.seat===g.turn||workerCost(p,t)>p.ready||!g.market.length)return false;
  const raw=p.bag.slice();p.won.filter(c=>c[2]===1&&c[3]===t.help).forEach(c=>raw[c[4]]++);
  const trimmed=trimBag(raw,capacity(p),discard);if(!trimmed)return false;
  placeWorkers(g,t);p.bag=trimmed;
  g.merchantDeck.push(...g.market);g.market=g.merchantDeck.splice(0,4);return true;
}
function rewards(g,p,type){
  if(p.bonus.length>=4)return [-1];
  const available=g.prizes[type].flatMap((s,i)=>s.length?[i]:[]);
  return type==='market'||!available.length?[-1,...available]:available;
}
function mixOptions(g,i,custom={}){
  const t=mixSites(g)[i],p=g.players[g.turn];if(!t)return [];
  if(g.departures)return !t.water&&t.recipe?actionsAt(g,i,{},true):[];
  const result=[], add=(kind,bag,more={})=>result.push({kind,i,bag,...more});
  if(t.special==='recover'){
    if(g.combo===12?p.used.length+p.discards.length:p.ready<p.crew)add('recover',p.bag);return result;
  }
  if(g.combo===12){
    if(t.special==='play'){for(const op of cardOperations(p.hand[t.slot],p.bag))add('playCard',op.bag,op);return result;}
    if(t.special==='buy'){
      const paid=minPaid(p.bag,t.slot,custom.pay);if(paid)add('buyCard',combine(paid.left,g.marketPiles[t.slot]),{paid:paid.paid});return result;
    }
    const path=custom.path??seaPath(g,p.boat,i);
    if(!Array.isArray(path)||path.length>64||(path.at(-1)??p.boat)!==i||path.some((next,j)=>!Number.isInteger(next)||!neighbors(g,j?path[j-1]:p.boat,next)))return [];
    const distance=path.length,n=Math.max(0,distance-p.bonus.filter(b=>b==='move').length);
    const available=[...p.used,...p.hand],fuel=custom.fuel??available.slice(0,n);
    if(!Array.isArray(fuel)||fuel.length!==n)return [];
    for(const id of fuel){const j=available.indexOf(id);if(j<0)return [];available.splice(j,1);}
    const rivals=distance&&!t.port&&!t.water?g.players.map((q,j)=>j!==g.turn&&q.boat===i?j:-1).filter(j=>j>=0):[];
    const toll=minPaid(p.bag,rivals.length,custom.pay);if(!toll)return [];
    const raw=toll.left,detail={fuel,rivals,tolls:toll.paid};
    if(distance)add('sail',raw,detail);
    if(t.port&&t.order&&fits(raw,unitBag(t.order[0])))add('order',combine(raw,unitBag(t.order[0]),-1),detail);
    if(!t.recipe)return result;
    const owned=t.owners.includes(g.turn);
    const price=owned?0:t.owners.length*(g.players.length===2?2:1);
    const paid=minPaid(raw,price,custom.buildPay);if(!paid)return result;
    const post={...detail,build:!owned},tr=p.tracks.slice();tr[t.suit]++;
    let prizes=[null];
    if(!owned&&Math.min(...tr)>Math.min(...p.tracks)){
      prizes=g.market.map((_,k)=>'card'+k);if(Math.min(...tr)>1)prizes.push(...['move','points','cargo'].filter(b=>g.stocks[bonTypes.indexOf(b)]));if(!prizes.length)prizes=[null];
    }
    for(const prize of prizes){
      const reward=prize?.startsWith('card')?g.marketPiles[+prize.at(-1)]:blank();
      const bag=combine(paid.left,reward),extras={...post,prize};
      if(!owned)add('build',bag,extras);
      tradeOptions(t.recipe,bag).forEach(op=>add('trade',op.bag,{...extras,n:op.n}));
    }return result;
  }
  if(t.special==='reserve'||t.cover)return [];
  const raw=p.bag.slice();
  if(t.special==='route'){
    const r=p.route[t.slot],need=1+p.route.slice(0,t.slot).filter(x=>!x.workers).length;
    if(!r.workers&&p.ready>=need)cardOperations(r.card,raw).forEach(op=>add('route',op.bag,{...op,need}));return result;
  }
  if(t.occupant?.seat===g.turn||workerCost(p,t)>p.ready)return [];
  if(!t.special)return actionsAt(g,i,{},true);
  p.won.filter(c=>c[2]===1&&c[3]===t.help).forEach(c=>raw[c[4]]++);
  if(t.special==='market'){
    const card=g.market[t.slot];if(card===undefined)return [];
    const prizes=g.combo===123&&(p.discards.length+1)%4===0?rewards(g,p,'market'):[-1];
    for(const op of cardOperations(card,raw))for(const reward of prizes)add('useMerchant',op.bag,{...op,reward});
    if(g.combo===13)for(const slot of p.route.length<5?[p.route.length]:[0,1,2,3,4])add('extend',raw,{slot});
  }else if(t.special==='swap'){
    const bag=combine(raw,[1,0,0,0]);add('adjust',bag);
    p.route.forEach((_,l)=>p.route.slice(l+1).forEach((_,j)=>add('adjust',bag,{swap:[l,l+j+1]})));
  }else if(t.special==='refresh')add('refresh',raw);
  else{
    const islands=g.islands;
    for(const [dest,tile] of islands.entries()){
      if(t.special!=='move'){
        if(tile.recipe&&(t.special==='postTrade'?tile.owners.includes(g.turn):p.boat===dest))
          tradeOptions(tile.recipe,raw).forEach(op=>add('islandTrade',op.bag,{dest,n:op.n}));
        continue;
      }
      const distance=seaPath({tiles:islands},p.boat,dest).length;
      if((!distance&&t.range!==2)||distance>t.range)continue;
      const rivals=g.players.map((q,j)=>j!==g.turn&&q.boat===dest?j:-1).filter(j=>j>=0),fees=minPaid(raw,rivals.length,custom.pay);
      if(!fees)continue;
      for(const build of [false,true]){
        if(build&&(!tile.recipe||tile.owners.includes(g.turn)))continue;
        const cost=build?tile.owners.length*(g.players.length===2?2:1):0;
        const paid=minPaid(fees.left,cost,custom.buildPay);if(!paid)continue;
        const tr=p.tracks.slice();if(build)tr[tile.suit]++;
        const columns=[[0,1,2],[0,1,3],[0,2,3],[1,2,3]];
        const column=build?columns[tile.suit][tr[tile.suit]-1]:-1;
        const cleared=build&&columns.every((row,suit)=>row.indexOf(column)<tr[suit]);
        const prizes=cleared?rewards(g,p,'outpost'):[-1];
        for(const reward of prizes)for(const op of [{bag:paid.left,n:0},...(tile.recipe?tradeOptions(tile.recipe,paid.left):[])]){
          add('navigate',op.bag,{dest,build,reward,n:op.n,rivals,tolls:fees.paid});
        }
      }
    }
  }
  return result;
}
function tradeOptions(recipe,bag){
  const [cost,gain]=recipe.split('/').map(unitBag),out=[];
  for(let n=1;fits(bag,cost.map(k=>k*n));n++)out.push({bag:combine(bag,combine(gain,cost,-1),n),n});
  return out;
}
function mixFinish(g,i,kind,msg){
  const who=g.turn;g.log.unshift({who,site:i,round:g.round,kind,msg});g.log.length=Math.min(g.log.length,40);
  g.turn=(who+1)%g.players.length;if(!g.turn){g.over=g.players.some(q=>q.won.length>=(g.combo===12?4:8));if(!g.over)g.round++;}
}
const mixActions={playCard:'상인 사용',buyCard:'상인 영입',recover:'휴식',useMerchant:'사용 후 수집',extend:'교역로에 배치',route:'교역로 사용',adjust:'교역로 정렬',refresh:'시장 교체 후 추가 턴',navigate:'항해',islandTrade:'섬 교역'};
function mixApply(g,a){
  if(!a||g.over||a.edition!==g.edition||a.combo!==g.combo||!Number.isInteger(a.i)||a.i<0)return false;
  if(a.priority&&!validPriority(a.priority))return false;
  if(a.refresh){
    const preview=structuredClone(g);if(!refreshMarket(preview,a.refreshDiscard)||!mixApply(preview,{...a,refresh:false}))return false;
    preview.log[0].msg='시장 교체 · '+preview.log[0].msg;Object.assign(g,preview);return true;
  }
  const t=mixSites(g)[a.i],p=g.players[g.turn];
  if(!t||!Number.isInteger(a.option)||a.option<0)return false;
  const c=mixOptions(g,a.i,a)[a.option];if(!c||c.kind!==a.kind||a.kind==='refresh')return false;
  if(g.departures)return apply(g,a,true);
  if(g.combo!==12&&!t.special)return apply(g,a,true);
  const bag=trimBag(c.bag,capacity(p)+(c.prize==='cargo'?3:0),a.discard);if(!bag)return false;
  if(c.kind==='recover'){
    if(g.combo===12){p.hand.push(...p.used,...p.discards);p.discards=[];p.used=[];}
    else{for(const t of g.tiles)if(t.occupant?.seat===g.turn)delete t.occupant;p.route.forEach(r=>r.workers=0);p.ready=p.crew;}
  }else if(g.combo===12){
    if(c.kind==='playCard')p.used.push(...p.hand.splice(t.slot,1));
    else if(c.kind==='buyCard'){c.paid.forEach((v,k)=>g.marketPiles[k][v]++);p.hand.push(takeMerchant(g,t.slot));}
    else{
      for(const id of c.fuel){const pile=p.used.includes(id)?p.used:p.hand;pile.splice(pile.indexOf(id),1);p.discards.push(id);}
      p.boat=a.i;payRivals(g,c);
      if(c.build){t.owners.push(g.turn);p.tracks[t.suit]++;
        if(c.prize?.startsWith('card'))p.hand.push(takeMerchant(g,+c.prize.at(-1)));
        else if(c.prize){const k=bonTypes.indexOf(c.prize);p.bonus.push(c.prize==='points'?2+g.stocks[k]:c.prize);g.stocks[k]--;}
      }
      if(c.kind==='order'){
        p.won.push(t.order);const next=g.deck.pop()??null;
        if(g.closed>=0){g.tiles[g.closed].order=next;t.order=null;g.closed=a.i;}
        else{t.order=next;if(!next)g.closed=a.i;}
      }
    }
  }else if(t.special==='route'){p.ready-=c.need;p.route[t.slot].workers=c.need;}
  else{
    placeWorkers(g,t);
    if(t.special==='market'){
      const card=takeMerchant(g,t.slot);
      if(c.kind==='extend'){const old=p.route[c.slot];if(old)p.discards.push(old.card);p.route[c.slot]={card,workers:old?.workers||0};}
      else p.discards.push(card);
    }
    if(c.swap){const [x,y]=c.swap;[p.route[x],p.route[y]]=[p.route[y],p.route[x]];}
    if(c.kind==='navigate'){
      p.boat=c.dest;payRivals(g,c);
      if(c.build){const island=g.islands[c.dest];island.owners.push(g.turn);p.tracks[island.suit]++;}
    }
    if(c.reward>=0)p.bonus.push(g.prizes[t.special==='market'?'market':'outpost'][c.reward].pop());
  }
  if(a.priority)p.priority=a.priority.slice();
  p.bag=bag;mixFinish(g,a.i,c.kind,mixActions[c.kind]||actNames[c.kind]);return true;
}
function payRivals(g,c){
  c.rivals.forEach((seat,i)=>receiveToll(g.players[seat],c.tolls[i]));
}
function mixScore(g,p){
  const icons=blank();let score=total(p.bag.slice(1))+total(p.won.map(c=>c[1]));
  if(g.combo!==12){p.won.forEach(c=>icons[c[2]]++);for(const x of p.explored){if(x==='points')score+=3;if(x.startsWith('icon'))icons[+x.at(-1)]++;}}
  const rows=g.combo===12?Array(4).fill([1,2,2,3]):[[1,1,2],[1,1,3],[1,2,3],[1,2,3]];
  score+=total(p.tracks.map((n,i)=>total(rows[i].slice(0,n))));
  for(const b of p.bonus){
    if(typeof b==='number'){score+=b;continue;}
    if(b==='fixed')score+=3;if(b==='four')score+=4;if(b==='crew')score+=Math.floor(p.crew/2);
    if(b==='cards')score+=2*Math.floor((p.route.length+p.discards.length)/2);
    if(b.startsWith('icon'))score+=2*icons[+b.at(-1)];
    if(b.startsWith('pair')||b.startsWith('triple')){
      const digits=b.replace(/\D/g,''),req=unitBag(digits),sets=Math.min(...req.map((n,i)=>n?Math.floor(icons[i]/n):Infinity));
      score+=sets*(digits.length===2?3:digits.includes('3')?5:4);
    }
  }return score;
}

