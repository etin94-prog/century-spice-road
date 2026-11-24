const CatanCities=(()=>{
  const tracks=['교역','과학','정치'];
  const names={tradeMonopoly:'상품 독점',resourceMonopoly:'자원 독점',merchantFleet:'상선단',mining:'광산',irrigation:'관개',engineer:'기술자',medicine:'의학',constitution:'헌법',printer:'인쇄술',warlord:'사령관',bishop:'주교'};
  Object.assign(names,{alchemy:'연금술',crane:'기중기',invention:'발명',roadworks:'도로 건설',smith:'대장장이',harbor:'상업항',guild:'길드 회비',merchant:'상인',diplomacy:'외교',spy:'첩보',intrigue:'음모',sabotage:'파괴 공작',treason:'반역',wedding:'결혼식'});
  const decks=[{tradeMonopoly:2,resourceMonopoly:4,merchantFleet:2,merchant:6,guild:2,harbor:2},
    {alchemy:2,crane:2,engineer:1,invention:2,irrigation:2,medicine:2,mining:2,roadworks:2,smith:2,printer:1},
    {diplomacy:2,warlord:2,spy:3,intrigue:2,sabotage:2,bishop:2,treason:2,constitution:1,wedding:2}];
  function init(s,shuffle){
    s.bank.push(12,12,12);s.deck=[];s.invaders=0;s.attacked=false;s.waterQueue=[];s.eventName='';
    s.progressDecks=decks.map(counts=>shuffle(Object.entries(counts).flatMap(([card,n])=>Array(n).fill(card))));
    for(const p of s.players){p.hand.push(0,0,0);p.tracks=[0,0,0];p.progress=[];p.defender=0;p.progressVP=0;}
  }
  function draw(s,j,k){
    const deck=s.progressDecks[k],p=s.players[j];if(!deck.length)return;
    const card=deck.shift();
    if(card==='printer'||card==='constitution')p.progressVP++;
    else{p.progress.push({track:k,card});if(j!==s.turn&&p.progress.length>4)s.eventQueue.unshift({j,phase:'returnProgress'});}
  }
  function event(s,note){
    s.eventQueue=[];
    const order=s.players.map((_,offset)=>(s.turn+offset)%s.players.length);
    const face=Math.floor(Math.random()*6);
    if(face>=3){
      s.eventName=tracks[face-3];order.forEach(j=>{const level=s.players[j].tracks[face-3];if(level&&s.dice[0]<=level+1)draw(s,j,face-3);});nextEvent(s);return;
    }
    s.eventName='야만인 전진';if(++s.invaders<7)return;
    s.invaders=0;s.attacked=true;
    const cities=s.nodes.filter(v=>v.level===2);
    const strength=s.players.map((_,j)=>s.nodes.reduce((n,v)=>n+(v.knight?.owner===j&&v.knight.active?v.knight.level:0),0));
    if(strength.reduce((a,b)=>a+b,0)>=cities.length){
      const best=Math.max(...strength),leaders=strength.flatMap((n,j)=>n===best&&n>0?[j]:[]);
      if(leaders.length===1){s.players[leaders[0]].defender++;note(s.players[leaders[0]].name+' 카탄의 수호자 +1점');}
      else if(s.progressDecks.some(d=>d.length))order.filter(j=>leaders.includes(j)).forEach(j=>s.eventQueue.push({j,phase:'reward'}));
      note('야만인 격퇴');
    }else{
      const vulnerable=cities.filter(v=>v.metro==null),low=Math.min(...vulnerable.map(v=>strength[v.owner]));
      order.filter(j=>strength[j]===low&&vulnerable.some(v=>v.owner===j)).forEach(j=>s.eventQueue.push({j,phase:'pillage'}));
    }
    s.nodes.forEach(v=>{if(v.knight)v.knight.active=false;});nextEvent(s);
  }
  function nextEvent(s){
    while(s.eventQueue[0]?.phase==='reward'&&!s.progressDecks.some(d=>d.length))s.eventQueue.shift();
    if(s.eventQueue.length){s.phase=s.eventQueue[0].phase;s.respondent=s.eventQueue[0].j;}
    else{s.phase='turn';delete s.respondent;}
  }
  function destinations(s,n,i,attack=0){
    const seen=new Set([n]),todo=[n],result=[];
    while(todo.length){const at=todo.pop();for(const k of s.nodes[at].edges){
      const e=s.edges[k],to=e.a===at?e.b:e.a;if(e.owner!==i||seen.has(to))continue;
      seen.add(to);const v=s.nodes[to];if(v.knight&&v.knight.owner!==i){if(attack>v.knight.level)result.push(to);continue;}if(v.owner>=0&&v.owner!==i)continue;
      if(v.owner<0&&!v.knight)result.push(to);todo.push(to);
    }}return result;
  }
  function specialChoices(s,a,add){
    if(s.phase==='spy'){
      s.players[s.spyTarget].progress.forEach((_,slot)=>add('takeProgress',slot));
      add('cancel');return true;
    }
    if(s.phase==='pillage'){s.nodes.forEach((v,n)=>{if(v.owner===s.respondent&&v.level===2&&v.metro==null)add('pillage',n);});return true;}
    if(s.phase==='reward'){s.progressDecks.forEach((d,k)=>{if(d.length)add('reward',k);});return true;}
    if(s.phase==='returnProgress'){s.players[s.respondent].progress.forEach((_,k)=>add('returnProgress',k));return true;}
    if(s.phase==='retreat'){destinations(s,s.displaced.at,s.respondent).forEach(n=>add('retreat',n));return true;}
    if(s.phase==='dismiss'){s.nodes.forEach((v,n)=>{if(v.knight?.owner===s.respondent)add('dismissKnight',n);});return true;}
    if(s.phase==='place'){
      const i=s.turn;
      s.nodes.forEach((v,n)=>{if(!v.knight&&v.owner<0&&v.edges.some(j=>s.edges[j].owner===i))for(let l=1;l<=s.replacement.level;l++)if(s.nodes.filter(w=>w.knight?.owner===i&&w.knight.level===l).length<2)add('placeKnight',n,l);});add('cancel');return true;
    }
    if(s.phase==='gift'){s.players[s.respondent].hand.forEach((n,r)=>{if(n&&(s.giftKind!=='harbor'||r>=5))add('gift',r);});return true;}
    if(s.phase==='loot'){s.players[s.lootFrom].hand.forEach((n,r)=>{if(n)add('loot',r);});return true;}
    if(s.phase==='smith'){s.nodes.forEach((v,n)=>{if(canPromote(s,v,s.turn))add('smith',n);});add('cancel');return true;}
    if(s.phase==='aqueduct'){s.bank.slice(0,5).forEach((n,r)=>{if(n)add('water',r);});return true;}
    if(s.phase==='march'){destinations(s,s.origin,s.turn,s.nodes[s.origin].knight.level).forEach(n=>add('moveKnight',n));add('cancel');return true;}
    return false;
  }
  function canUpgrade(s,i,n){
    return !!s.nodes[n].pillagedCity||!s.nodes.some(v=>v.owner===i&&v.pillagedCity);
  }
  function canPromote(s,v,i){const k=v.knight;return k?.owner===i&&!k.promoted&&(k.level===1||k.level===2&&s.players[i].tracks[2]>=3)&&s.nodes.filter(n=>n.knight?.owner===i&&n.knight.level===k.level+1).length<2;}
  function improvements(s,i,discount,add){
    const p=s.players[i],own=s.nodes.filter(v=>v.owner===i&&v.level===2);
    p.tracks.forEach((level,k)=>{
      if(!own.length||level>=5||p.hand[k+5]<level+1-discount)return;
      const holder=s.nodes.find(v=>v.metro===k),wins=level+1>=4&&(!holder||s.players[holder.owner].tracks[k]<level+1&&holder.owner!==i);
      if(wins)s.nodes.forEach((v,n)=>{if(v.owner===i&&v.level===2&&v.metro==null)add(k,n);});
      else if(level<3||holder?.owner===i||own.some(v=>v.metro==null))add(k);
    });
  }
  function turnChoices(s,add,points){
    const i=s.turn,p=s.players[i],h=p.hand,own=s.nodes.filter(v=>v.owner===i&&v.level===2),knights=s.nodes.filter(v=>v.knight?.owner===i);
    const walls=own.filter(v=>v.wall).length;
    s.nodes.forEach((v,n)=>{
      if(h[2]&&h[4]&&knights.filter(v=>v.knight.level===1).length<2&&v.owner<0&&!v.knight&&v.edges.some(j=>s.edges[j].owner===i))add('recruit',n);
      if(v.owner===i&&v.level===2&&!v.wall&&walls<3&&h[1]>=2)add('wall',n);
      if(v.knight?.owner!==i)return;
      const k=v.knight;
      if(!k.active&&h[3])add('activate',n);
      if(h[2]&&h[4]&&canPromote(s,v,i))add('promote',n);
      if(k.active&&!k.tired){
        if(destinations(s,n,i,k.level).length)add('march',n);
        if(s.attacked&&v.tiles.includes(s.robber))add('chase',n);
      }
    });
    improvements(s,i,0,(...args)=>add('improve',...args));
    if(s.harborTurn)s.players.forEach((q,j)=>{if(j!==i&&!s.harborUsed.includes(j)&&q.hand.slice(5).some(Boolean))h.slice(0,5).forEach((n,r)=>{if(n)add('harborTrade',j,r);});});
    p.progress.forEach(({card},idx)=>{
      const emit=(...args)=>add('progress',idx,...args);
      if(card==='alchemy')return;
      if(card==='crane'){improvements(s,i,1,emit);return;}
      if(card==='invention'){const ok=t=>[3,4,5,9,10,11].includes(t.num);s.tiles.forEach((t,j)=>{if(ok(t))s.tiles.forEach((u,k)=>{if(k>j&&ok(u)&&t.num!==u.num)emit(j,k);});});return;}
      if(card==='merchant'){s.tiles.forEach((t,j)=>{if(t.res>=0&&t.ns.some(n=>s.nodes[n].owner===i))emit(j);});return;}
      if(card==='smith'&&!s.nodes.some(v=>canPromote(s,v,i)))return;
      if(card==='intrigue'){s.nodes.forEach((v,n)=>{if(v.knight&&v.knight.owner!==i&&v.edges.some(j=>s.edges[j].owner===i))emit(n);});return;}
      if(card==='diplomacy'){s.edges.forEach((e,k)=>{if(e.owner>=0&&[e.a,e.b].some(n=>s.nodes[n].owner<0&&!s.nodes[n].knight&&s.nodes[n].edges.every(j=>j===k||s.edges[j].owner!==e.owner)))emit(k);});return;}
      if(['spy','guild','treason'].includes(card)){s.players.forEach((q,j)=>{if(i===j)return;
        if(card==='spy'&&q.progress.length)emit(j);
        if(card==='guild'&&points(s,j,false)>points(s,i,false)&&q.hand.some(Boolean))emit(j);
        if(card==='treason'&&s.nodes.some(v=>v.knight?.owner===j))emit(j);
      });return;}
      if(card==='harbor'){if(!p.hand.slice(0,5).some(Boolean)||!s.players.some((q,j)=>j!==i&&q.hand.slice(5).some(Boolean)))return;}
      if(card==='bishop'&&!s.attacked)return;
      if(card==='tradeMonopoly'||card==='resourceMonopoly'||card==='merchantFleet'){
        h.forEach((_,r)=>{if(card==='merchantFleet'||(card==='tradeMonopoly')===(r>=5))add('progress',idx,r);});return;
      }
      if(card==='engineer'||card==='medicine'){
        s.nodes.forEach((v,n)=>{if(v.owner===i&&(card==='engineer'?v.level===2&&!v.wall&&walls<3:v.level===1&&canUpgrade(s,i,n)&&h[3]>=1&&h[4]>=2&&own.length<4))add('progress',idx,n);});return;
      }
      add('progress',idx);
    });
  }
  function displace(s,n){
    const knight=s.nodes[n].knight;delete s.nodes[n].knight;
    if(destinations(s,n,knight.owner).length){s.displaced={at:n,knight};s.respondent=knight.owner;s.phase='retreat';}
  }
  function giftQueue(s){if(s.gifts.length){s.respondent=s.gifts[0].j;s.phase='gift';}else{delete s.respondent;s.phase='turn';}}
  function improve(s,i,k,where,discount,pay,note){
    const level=++s.players[i].tracks[k];pay(s,i,k+5,-(level-discount));
    if(where!=null){s.nodes.forEach(n=>{if(n.metro===k)delete n.metro;});s.nodes[where].metro=k;}note(tracks[k]+' '+level+'단계');
  }
  function apply(s,[k,x,y,z],pay,note,points){
    const i=s.turn,p=s.players[i],v=s.nodes[x];
    switch(k){
      case 'pillage':case 'reward':case 'returnProgress':{
        const {j}=s.eventQueue.shift();
        if(k==='pillage'){v.pillagedCity=s.nodes.filter(n=>n.owner===j&&n.level===1&&!n.pillagedCity).length>=5;v.level=1;v.wall=false;note('도시 약탈');}
        if(k==='reward')draw(s,j,x);
        if(k==='returnProgress'){const c=s.players[j].progress.splice(x,1)[0];s.progressDecks[c.track].push(c.card);}
        nextEvent(s);break;
      }
      case 'harborTrade':p.hand[y]--;s.players[x].hand[y]++;s.harborUsed.push(x);s.giftKind='harbor';s.gifts=[{j:x,n:1}];giftQueue(s);break;
      case 'end':s.harborTurn=false;s.fleet=null;s.nodes.forEach(v=>{if(v.knight?.owner===i){v.knight.tired=false;v.knight.promoted=false;}});break;
      case 'recruit':pay(s,i,2,-1);pay(s,i,4,-1);v.knight={owner:i,level:1,active:false};note('기사 모집');break;
      case 'activate':pay(s,i,3,-1);v.knight.active=true;v.knight.tired=true;note('기사 활성화');break;
      case 'promote':pay(s,i,2,-1);pay(s,i,4,-1);v.knight.level++;v.knight.promoted=true;note('기사 승급');break;
      case 'wall':pay(s,i,1,-2);v.wall=true;note('성벽 건설');break;
      case 'march':s.origin=x;s.phase='march';break;
      case 'moveKnight':s.phase='turn';if(v.knight)displace(s,x);v.knight=s.nodes[s.origin].knight;delete s.nodes[s.origin].knight;v.knight.active=false;note('기사 이동');break;
      case 'chase':v.knight.active=false;s.phase='robber';break;
      case 'improve':improve(s,i,x,y,0,pay,note);break;
      case 'dropProgress':case 'alchemy':{const c=p.progress.splice(x,1)[0];s.progressDecks[c.track].push(c.card);break;}
      case 'retreat':v.knight=s.displaced.knight;delete s.respondent;s.phase='turn';break;
      case 'dismissKnight':s.replacement=v.knight;delete v.knight;delete s.respondent;s.phase='place';break;
      case 'placeKnight':v.knight={owner:i,level:y,active:s.replacement.active,tired:s.replacement.active};s.phase='turn';break;
      case 'takeProgress':p.progress.push(s.players[s.spyTarget].progress.splice(x,1)[0]);s.phase='turn';break;
      case 'loot':s.players[s.lootFrom].hand[x]--;p.hand[x]++;if(!--s.left||!s.players[s.lootFrom].hand.some(Boolean))s.phase='turn';break;
      case 'gift':{
        const giver=s.players[s.respondent];giver.hand[x]--;p.hand[x]++;
        if(!--s.gifts[0].n||!giver.hand.some(Boolean))s.gifts.shift();
        giftQueue(s);break;
      }
      case 'smith':v.knight.level++;v.knight.promoted=true;if(!--s.left||!s.nodes.some(n=>canPromote(s,n,i)))s.phase='turn';break;
      case 'water':pay(s,s.waterQueue.shift(),x,1);if(!s.waterQueue.length||!s.bank.slice(0,5).some(Boolean))s.phase='turn';break;
      case 'progress':{
        const {card,track}=p.progress.splice(x,1)[0];s.progressDecks[track].push(card);note(names[card]);
        if(card==='crane')improve(s,i,y,z,1,pay,note);
        if(card==='invention')[s.tiles[y].num,s.tiles[z].num]=[s.tiles[z].num,s.tiles[y].num];
        if(card==='merchant')s.merchant={owner:i,tile:y};
        if(card==='roadworks'||card==='smith'){s.phase=card==='smith'?'smith':'freeRoad';s.left=2;}
        if(card==='intrigue')displace(s,y);
        if(card==='diplomacy'){if(s.edges[y].owner===i){s.phase='freeRoad';s.left=1;}s.edges[y].owner=-1;}
        if(card==='guild'){s.lootFrom=y;s.left=2;s.phase='loot';}
        if(card==='spy'){s.spyTarget=y;s.phase='spy';}
        if(card==='treason'){s.phase='dismiss';s.respondent=y;}
        if(card==='sabotage'){s.discard=s.players.flatMap((q,j)=>{const n=Math.floor(q.hand.reduce((a,b)=>a+b)/2);return j!==i&&points(s,j,false)>=points(s,i,false)&&n?[{i:j,n}]:[];});if(s.discard.length){s.sabotage=true;s.phase='discard';}}
        if(card==='wedding'){s.giftKind=card;s.gifts=s.players.flatMap((q,j)=>j!==i&&points(s,j,false)>points(s,i,false)&&q.hand.some(Boolean)?[{j,n:2}]:[]);giftQueue(s);}
        if(card==='harbor'){s.harborUsed=[];s.harborTurn=true;}
        if(card==='tradeMonopoly'||card==='resourceMonopoly')s.players.forEach((q,j)=>{if(j!==i){const n=Math.min(q.hand[y],card==='tradeMonopoly'?1:2);q.hand[y]-=n;p.hand[y]+=n;}});
        if(card==='merchantFleet')s.fleet=y;
        if(card==='engineer')s.nodes[y].wall=true;
        if(card==='medicine'){pay(s,i,3,-1);pay(s,i,4,-2);s.nodes[y].level=2;delete s.nodes[y].pillagedCity;}
        if(card==='bishop'){s.bishop=true;s.phase='robber';}
        if(card==='warlord')s.nodes.forEach(n=>{if(n.knight?.owner===i&&!n.knight.active){n.knight.active=true;n.knight.tired=true;}});
        if(card==='mining'||card==='irrigation'){const r=card==='mining'?4:3;const count=s.tiles.filter(t=>t.res===r&&t.ns.some(n=>s.nodes[n].owner===i)).length;pay(s,i,r,Math.min(s.bank[r],2*count));}
        break;
      }
    }
  }
  function cardLabel(s,idx,y,z,R){
    const card=s.players[s.turn].progress[idx].card,base=names[card];
    if(y==null)return base;
    if(['tradeMonopoly','resourceMonopoly','merchantFleet'].includes(card))return base+' · '+R[y];
    if(card==='crane')return base+' · '+tracks[y]+(z!=null?' · 도시 '+(z+1):'');
    if(['spy','guild','treason'].includes(card))return base+' · '+s.players[y].name;
    return base+' · '+(y+1)+'번'+(z!=null?' ↔ '+(z+1)+'번':'');
  }
  return {canUpgrade,cardLabel,init,event,turnChoices,specialChoices,apply,names,tracks};
})();
if(typeof module!=='undefined')module.exports=CatanCities;