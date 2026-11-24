/* Shared rules for the island table. All player choices pass through choices/play. */
const Cities=typeof module!=='undefined'?require('./catan-cities.js'):CatanCities;
const Catan = (() => {
  const resources = ['목재','벽돌','양모','곡식','광석'];
  const modes = {classic:'기본 카탄',friendly:'친절한 도둑',ports:'항구왕',sea:'항해자',knights:'도시와 기사'};
  const cards = ['기사','승점','도로 건설','발견','독점'];
  const costs = {road:[1,1,0,0,0], village:[1,1,1,1,0], city:[0,0,0,2,3], buy:[0,0,1,1,1]};
  const zeros = () => Array(5).fill(0);
  const sum = a => a.reduce((x,y)=>x+y,0);
  const pick = a => a[Math.floor(Math.random()*a.length)];
  function shuffle(a){
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  const target=s=>({ports:11,sea:14,knights:13}[s.mode]||10);
  function board(mode){
    const tiles=[], nodes=[], edges=[], corners=new Map(), links=new Map();
    const land=shuffle([0,0,0,0,1,1,1,2,2,2,2,3,3,3,3,4,4,4,-1]);
    const hexes=[];
    for(let r=-2;r<=2;r++) for(let q=Math.max(-2,-r-2);q<=Math.min(2,-r+2);q++)hexes.push({q,r,res:land.pop(),island:0});
    if(mode==='sea'){
      // Three small islands beyond a continuous ring of navigable water.
      const islands=[[0,-4,8,1,9],[1,-4,3,1,5],[4,-1,4,2,6],[4,0,2,2,10],[-4,3,1,3,8],[-4,4,8,3,4]];
      for(let r=-3;r<=3;r++)for(let q=-3;q<=3;q++)if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))===3)hexes.push({q,r,res:-2});
      islands.forEach(([q,r,res,island,num])=>hexes.push({q,r,res,island,num}));
    }
    for(const {q,r,res,island,num=0} of hexes){
      const x=Math.sqrt(3)*(q+r/2), y=1.5*r, ns=[];
      for(let i=0;i<6;i++){
        const angle=(60*i-30)*Math.PI/180, xx=x+Math.cos(angle), yy=y+Math.sin(angle);
        const key=[Math.round(xx*100),Math.round(yy*100)].join('/');
        if(!corners.has(key)){corners.set(key,nodes.length);nodes.push({x:xx,y:yy,edges:[],tiles:[],owner:-1,level:0,port:null});}
        const n=corners.get(key); ns.push(n); nodes[n].tiles.push(tiles.length);
      }
      ns.forEach((a,i)=>{
        const b=ns[(i+1)%6], key=[Math.min(a,b),Math.max(a,b)].join('/');
        if(!links.has(key)){links.set(key,edges.length);nodes[a].edges.push(edges.length);nodes[b].edges.push(edges.length);edges.push({a,b,count:0,owner:-1});}
        edges[links.get(key)].count++;
      });
      tiles.push({x,y,ns,res,num,island});
    }
    const spiral=[0,1,2,6,11,15,18,17,16,12,7,3,4,5,10,14,13,8,9];
    const nums=[5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11];
    for(const i of spiral) if(tiles[i].res>=0) tiles[i].num=nums.shift();
    for(const e of edges){
      const adjacent=nodes[e.a].tiles.filter(t=>nodes[e.b].tiles.includes(t));
      e.land=adjacent.some(j=>tiles[j].res!==-2);
      e.water=adjacent.some(j=>tiles[j].res===-2);
      e.adjacent=adjacent;
    }
    const coast=edges.filter(e=>e.adjacent.filter(j=>tiles[j].island===0).length===1).sort((u,v)=>{
      const angle=e=>Math.atan2(nodes[e.a].y+nodes[e.b].y,nodes[e.a].x+nodes[e.b].x);
      return angle(u)-angle(v);
    });
    const ports=shuffle([-1,-1,-1,-1,0,1,2,3,4]);
    [0,3,7,10,13,17,20,23,27].forEach((k,i)=>{const e=coast[k];e.port=ports[i];nodes[e.a].port=nodes[e.b].port=e.port;});
    return {tiles,nodes,edges};
  }
  function start(mode='classic',count=3,humans=1){
    if(!Object.hasOwn(modes,mode)||![3,4].includes(count)||!Number.isInteger(humans)||humans<0||humans>count)throw new RangeError('잘못된 카탄 게임 설정');
    const map=board(mode);
    const players=Array.from({length:count},(_,i)=>({name:i<humans?'플레이어 '+(i+1):'AI '+(i+1),ai:i>=humans,hand:zeros(),dev:zeros(),fresh:zeros(),army:0}));
    const s={...map,mode,players,bank:Array(5).fill(19),deck:shuffle([14,5,2,2,2].flatMap((n,i)=>Array(n).fill(i))),
      turn:0,step:0,phase:'setupVillage',robber:map.tiles.findIndex(t=>t.res<0),awards:{road:-1,army:-1,port:-1},
      dice:[],log:[],played:false,rolled:false,discard:[],winner:-1};
    if(mode==='sea'){s.pirate=19;s.sailed=false;players.forEach(p=>p.islands=[]);}
    if(mode==='knights')Cities.init(s,shuffle);
    return s;
  }
  function points(s,i,hidden=true){
    const p=s.players[i];
    return s.nodes.reduce((n,v)=>n+(v.owner===i?v.level:0),0)+Object.values(s.awards).filter(o=>o===i).length*2+ (p.islands?.length||0)*2 + (s.merchant?.owner===i?1:0) + (p.defender||0) + (p.progressVP||0) + s.nodes.filter(v=>v.owner===i&&v.metro!=null).length*2 +(hidden?p.dev[1]+p.fresh[1]:0);
  }
  const other=(e,n)=>e.a===n?e.b:e.a;
  function longest(s,i){
    function walk(n,used,ship){
      if(used.size && ((s.nodes[n].owner>=0 && s.nodes[n].owner!==i)||(s.nodes[n].knight&&s.nodes[n].knight.owner!==i)))return used.size;
      let best=used.size;
      for(const k of s.nodes[n].edges) if(s.edges[k].owner===i&&!used.has(k)&&(!used.size||s.nodes[n].owner===i||!!s.edges[k].ship===ship)){
        used.add(k);best=Math.max(best,walk(other(s.edges[k],n),used,!!s.edges[k].ship));used.delete(k);
      }
      return best;
    }
    return Math.max(...s.nodes.map((_,n)=>walk(n,new Set())));
  }
  function award(s,key,values,min){
    const high=Math.max(...values), old=s.awards[key];
    if(high<min){s.awards[key]=-1;return;}
    if(values[old]===high)return;
    s.awards[key]=values.filter(n=>n===high).length===1?values.indexOf(high):-1;
  }
  function roads(s,i,ship=false,skip=-1){
    if(skip<0&&s.edges.filter(e=>e.owner===i&&!!e.ship===ship).length>=15)return [];
    return s.edges.flatMap((e,k)=>e.owner<0 && (ship?e.water&&!e.adjacent.includes(s.pirate):e.land!==false) && [e.a,e.b].some(n=>{
      const v=s.nodes[n];return v.owner===i || (v.owner<0 && (!v.knight||v.knight.owner===i) && v.edges.some(j=>j!==skip&&s.edges[j].owner===i&&!!s.edges[j].ship===ship));
    })?[k]:[]);
  }
  function actor(s){
    switch(s.phase){
      case 'over':return s.winner;
      case 'gold':return s.goldQueue[0].i;
      case 'aqueduct':return s.waterQueue[0];
      case 'discard':return s.discard[0].i;
      case 'offer':return s.offer.to;
      case 'pillage':case 'reward':case 'returnProgress':
      case 'retreat':case 'dismiss':case 'gift':return s.respondent;
      default:return s.turn;
    }
  }
  function choices(s){
    const i=actor(s),p=s.players[i],a=[];
    const add=(k,...args)=>a.push([k,...args]);
    const villages=setup=>s.nodes.forEach((v,n)=>{
      if(!v.knight && (s.mode!=='sea'||v.tiles.some(j=>setup?s.tiles[j].island===0:s.tiles[j].res!==-2)) && v.owner<0 && v.edges.every(j=>s.nodes[other(s.edges[j],n)].owner<0) && (setup||v.edges.some(j=>s.edges[j].owner===i))) add('village',n);
    });
    const ships=()=>s.mode==='sea'?roads(s,i,true).map(j=>['ship',j]):[];
    if(s.phase==='freeRoad'&&s.mode==='knights'&&!roads(s,i).length)return [['cancel']];
    if(s.phase==='sail')return [...roads(s,i,true,s.shipFrom).map(j=>['relocate',j]),['cancel']];
    if(s.mode==='knights' && Cities.specialChoices(s,a,add))return a;
    switch(s.phase){
      case 'over':return [];
      case 'setupVillage':villages(true);return a;
      case 'setupRoad':return [...roads(s,i).map(j=>['road',j]),...ships()].filter(([,j])=>s.nodes[s.anchor].edges.includes(j));
      case 'freeRoad':return [...roads(s,i).map(j=>['road',j]),...ships()];
      case 'gold':return s.bank.flatMap((n,r)=>n?[['gold',r]]:[]);
      case 'discard':return p.hand.flatMap((n,r)=>n?[['discard',r]]:[]);
      case 'robber':{
        s.tiles.forEach((t,j)=>{if(t.res===-2){if(j!==s.pirate)add('pirate',j);return;}if(j!==s.robber && (s.mode!=='friendly'||t.ns.every(n=>s.nodes[n].owner<0||points(s,s.nodes[n].owner,false)>2)))add('robber',j);});
        if(!a.length)add('robber',s.tiles.findIndex(t=>t.res<0));return a;
      }
      case 'victim':return s.victims.map(v=>['steal',v]);
      case 'plenty':return s.bank.flatMap((n,r)=>n?[['gain',r]]:[]);
      case 'monopoly':return resources.map((_,r)=>['take',r]);
      case 'offer':{
        const {from,give,want}=s.offer;
        return s.players[from].hand[give]>0&&p.hand[want]>0?[['accept'],['reject']]:[['reject']];
      }
      case 'turn':break;
      default:return [];
    }
    if(!s.played)p.dev.forEach((n,k)=>{if(n && k!==1 && (k!==2||roads(s,i).length||ships().length) && (k!==3||sum(s.bank)))add('card',k);});
    if(!s.rolled){add('roll');if(s.mode==='knights')p.progress.forEach(({card},idx)=>{if(card==='alchemy')for(let red=1;red<=6;red++)for(let white=1;white<=6;white++)add('alchemy',idx,red,white);});return a;}
    if(!p.progress||p.progress.length<=4)add('end');else p.progress.forEach((_,idx)=>add('dropProgress',idx));
    const afford=k=>costs[k].every((n,r)=>p.hand[r]>=n);
    if(s.mode==='sea'){
      if(p.hand[0]&&p.hand[2])a.push(...ships());
      if(!s.sailed)s.edges.forEach((e,j)=>{
        if(e.owner===i&&e.ship&&!e.newShip&&!e.adjacent.includes(s.pirate)&&[e.a,e.b].some(n=>s.nodes[n].owner<0&&!s.nodes[n].edges.some(k=>k!==j&&s.edges[k].ship&&s.edges[k].owner===i))&&roads(s,i,true,j).length)add('sail',j);
      });
    }
    if(s.mode==='knights')Cities.turnChoices(s,add,points);
    if(afford('road'))roads(s,i).forEach(j=>add('road',j));
    if(afford('village')&&s.nodes.filter(v=>v.owner===i&&v.level===1).length<5)villages(false);
    if(afford('city')&&s.nodes.filter(v=>v.owner===i&&v.level===2).length<4)s.nodes.forEach((v,n)=>{if(v.owner===i&&v.level===1&&Cities.canUpgrade(s,i,n))add('city',n);});
    if(afford('buy')&&s.deck.length)add('buy');
    const ports=s.nodes.filter(v=>v.owner===i).map(v=>v.port);
    p.hand.forEach((_,r)=>{
      const rate=s.fleet===r||(s.merchant?.owner===i&&s.tiles[s.merchant.tile].res===r)||(r>=5&&p.tracks?.[0]>=3)||ports.includes(r)?2:ports.includes(-1)?3:4;
      p.hand.forEach((_,t)=>{
        if(t===r)return;
        if(p.hand[r]>=rate&&s.bank[t])add('bank',r,t,rate);
        if(p.hand[r])s.players.forEach((q,j)=>{if(j!==i)add('offer',r,t,j);});
      });
    });
    return a;
  }
  function transfer(s,i,r,n){s.players[i].hand[r]+=n;s.bank[r]-=n;}
  function produce(s,total){
    const gold=s.players.map(()=>0);
    const needs=s.bank.map(()=>s.players.map(()=>0));
    s.tiles.forEach((t,j)=>{if(t.num===total&&j!==s.robber)t.ns.forEach(n=>{const v=s.nodes[n];if(v.owner>=0){if(t.res===8){gold[v.owner]+=v.level;return;}const commodity=s.mode==='knights'&&v.level===2?({0:6,2:5,4:7}[t.res]):null;if(commodity!=null){needs[t.res][v.owner]++;needs[commodity][v.owner]++;}else needs[t.res][v.owner]+=v.level;}});});
    needs.forEach((need,r)=>{
      if(sum(need)<=s.bank[r]||need.filter(Boolean).length===1)need.forEach((n,i)=>transfer(s,i,r,Math.min(s.bank[r],n)));
    });
    if(gold.some(Boolean)&&s.bank.some(Boolean)){s.goldQueue=gold.flatMap((_,k)=>{const i=(s.turn+k)%gold.length;return gold[i]?[{i,n:gold[i]}]:[];});s.phase='gold';}
  }
  function resolveProduction(s){
        if(sum(s.dice)===7){
          s.discard=s.players.flatMap((q,j)=>sum(q.hand)>7+2*(s.mode==='knights'?s.nodes.filter(n=>n.owner===j&&n.wall).length:0)?[{i:j,n:Math.floor(sum(q.hand)/2)}]:[]);
          s.phase=s.discard.length?'discard':s.mode==='knights'&&!s.attacked?'turn':'robber';
        }else{
          const before=s.players.map(q=>sum(q.hand));produce(s,sum(s.dice));
          if(s.mode==='knights'){s.waterQueue=s.players.flatMap((q,j)=>q.tracks[1]>=3&&sum(q.hand)===before[j]?[j]:[]);if(s.waterQueue.length&&s.bank.slice(0,5).some(Boolean))s.phase='aqueduct';}
        }
  }
  function play(s,action){
    if(!Array.isArray(action)||!choices(s).some(a=>a.length===action.length&&a.every((v,i)=>v===action[i])))return false;
    const [k,x,y,z]=action,i=actor(s),p=s.players[i],phase=s.phase;
    if(phase==='turn'&&costs[k])costs[k].forEach((n,r)=>transfer(s,i,r,-n));
    const note=t=>{s.log.unshift(p.name+' · '+t);s.log.length=Math.min(s.log.length,12);};
    if(s.mode==='knights')Cities.apply(s,action,transfer,note,points);
    switch(k){
      case 'village':
        s.nodes[x].owner=i;s.nodes[x].level=s.mode==='knights'&&phase==='setupVillage'&&s.step>=s.players.length?2:1;note(s.nodes[x].level===2?'도시 건설':'마을 건설');
        if(s.mode==='sea'){const island=s.nodes[x].tiles.map(j=>s.tiles[j].island).find(v=>v>0);if(island&&!p.islands.includes(island)){p.islands.push(island);note('새 섬 정착 +2점');}}
        if(phase==='setupVillage'){
          if(s.step>=s.players.length)s.nodes[x].tiles.forEach(j=>{const r=s.tiles[j].res;if(r>=0&&s.bank[r])transfer(s,i,r,1);});
          s.anchor=x;s.phase='setupRoad';
        }break;
      case 'sail':s.shipFrom=x;s.phase='sail';break;
      case 'cancel':s.phase='turn';break;
      case 'relocate':s.edges[s.shipFrom].owner=-1;s.edges[s.shipFrom].ship=false;s.edges[x].owner=i;s.edges[x].ship=true;s.sailed=true;s.phase='turn';note('배 이동');break;
      case 'ship':case 'road':
        if(k==='ship'&&phase==='turn'){transfer(s,i,0,-1);transfer(s,i,2,-1);}
        s.edges[x].ship=k==='ship';s.edges[x].newShip=k==='ship';s.edges[x].owner=i;note(k==='ship'?'배 건조':'도로 건설');
        if(phase==='setupRoad'){
          const n=s.players.length;s.step++;s.turn=s.step<n?s.step:Math.max(0,2*n-1-s.step);
          s.phase=s.step===2*n?'turn':'setupVillage';
        }else if(phase==='freeRoad' && (--s.left===0||(!roads(s,i).length&&!(s.mode==='sea'&&roads(s,i,true).length))))s.phase='turn';
        break;
      case 'city':s.nodes[x].level=2;delete s.nodes[x].pillagedCity;note('도시 건설');break;
      case 'alchemy':case 'roll':
        s.dice=k==='alchemy'?[y,z]:[1,2].map(()=>1+Math.floor(Math.random()*6));s.rolled=true;note('주사위 '+s.dice.join(' + '));
        if(s.mode==='knights')Cities.event(s,note);
        if(!s.eventQueue?.length)resolveProduction(s);break;
      case 'pillage':case 'reward':case 'returnProgress':if(s.phase==='turn')resolveProduction(s);break;
      case 'gold':transfer(s,i,x,1);if(!--s.goldQueue[0].n)s.goldQueue.shift();if(!s.goldQueue.length||!s.bank.some(Boolean))s.phase='turn';break;
      case 'discard':transfer(s,i,x,-1);if(!--s.discard[0].n)s.discard.shift();if(!s.discard.length&&s.sabotage){s.sabotage=false;s.phase='turn';}else if(!s.discard.length)s.phase=s.mode==='knights'&&!s.attacked?'turn':'robber';break;
      case 'pirate':
        s.pirate=x;s.victims=[...new Set(s.edges.filter(e=>e.ship&&e.owner>=0&&e.owner!==i&&e.adjacent.includes(x)&&sum(s.players[e.owner].hand)).map(e=>e.owner))];s.phase=s.victims.length?'victim':'turn';note('해적 이동');break;
      case 'robber':
        s.robber=x;s.victims=[...new Set(s.tiles[x].ns.map(n=>s.nodes[n].owner))].filter(j=>j>=0&&j!==i&&sum(s.players[j].hand)&&(s.mode!=='friendly'||points(s,j,false)>2));
        if(s.bishop){for(const j of s.victims){const h=s.players[j].hand,r=pick(h.flatMap((n,r)=>Array(n).fill(r)));h[r]--;p.hand[r]++;}s.victims=[];s.bishop=false;}s.phase=s.victims.length?'victim':'turn';note('도둑 이동');break;
      case 'steal':{
        const h=s.players[x].hand,r=pick(h.flatMap((n,j)=>Array(n).fill(j)));h[r]--;p.hand[r]++;s.phase='turn';break;
      }
      case 'buy':p.fresh[s.deck.pop()]++;note('발전 카드 구입');break;
      case 'card':
        p.dev[x]--;s.played=true;note(cards[x]+' 사용');
        s.phase=['robber','','freeRoad','plenty','monopoly'][x];s.left=2;if(x===0)p.army++;break;
      case 'gain':transfer(s,i,x,1);if(!--s.left||!sum(s.bank))s.phase='turn';break;
      case 'take':s.players.forEach((q,j)=>{if(i!==j){p.hand[x]+=q.hand[x];q.hand[x]=0;}});s.phase='turn';break;
      case 'bank':transfer(s,i,x,-z);transfer(s,i,y,1);note(names[x]+' → '+names[y]);break;
      case 'offer':s.offer={from:i,to:z,give:x,want:y};s.phase='offer';break;
      case 'accept':case 'reject':{
        const o=s.offer,h=s.players[o.from].hand;
        if(k==='accept'){h[o.give]--;p.hand[o.give]++;h[o.want]++;p.hand[o.want]--;}
        note(k==='accept'?'교환 수락':'교환 거절');s.phase='turn';break;
      }
      case 'end':
        if(s.mode==='sea'){s.sailed=false;s.edges.forEach(e=>e.newShip=false);}
        p.dev=p.dev.map((n,r)=>n+p.fresh[r]);p.fresh=zeros();s.turn=(i+1)%s.players.length;s.rolled=false;s.played=false;s.dice=[];break;
    }
    if(['road','ship','relocate','village','recruit','moveKnight','retreat','progress','placeKnight','dismissKnight'].includes(k))award(s,'road',s.players.map((_,j)=>longest(s,j)),5);
    if(k==='card'&&x===0)award(s,'army',s.players.map(q=>q.army),3);
    if(s.mode==='ports'&&['village','city'].includes(k))award(s,'port',s.players.map((_,j)=>s.nodes.reduce((n,v)=>n+(v.owner===j&&v.port!==null?v.level:0),0)),3);
    if(points(s,s.turn)>=target(s)){s.winner=s.turn;s.phase='over';}
    return true;
  }
  function ai(s){
    const opts=choices(s),i=actor(s),h=s.players[i].hand;
    const fertility=n=>s.nodes[n].tiles.reduce((a,j)=>a+Math.max(0,6-Math.abs(7-s.tiles[j].num)),0);
    function rank([k,x,y,z]){
      switch(k){
        case 'city':return 80+fertility(x);
        case 'village':return 60+fertility(x)+(s.nodes[x].port!==null?1:0);
        case 'improve':return 76;
        case 'activate':return 72;
        case 'recruit':return s.nodes.some(n=>n.knight?.owner===i)?12:70;
        case 'promote':return 40;
        case 'wall':return 18;
        case 'progress':return 70;
        case 'pirate':return s.edges.reduce((a,e)=>a+(e.ship&&e.adjacent.includes(x)?(e.owner===i?-3:2):0),0);
        case 'sail':return s.sailed?-5:1;
        case 'relocate':return 4+s.nodes[s.edges[x].a].tiles.filter(j=>s.tiles[j].island>0).length;
        case 'moveKnight':return s.nodes[x].knight?10:1;
        case 'chase':return 4;
        case 'march':return -4;
        case 'ship':return 12+Math.max(...[s.edges[x].a,s.edges[x].b].map(n=>s.nodes[n].tiles.some(j=>s.tiles[j].island>0)?18:0));
        case 'buy':return 38;
        case 'card':return 45;
        case 'road':{
          const e=s.edges[x];
          const potential=n=>s.nodes[n].owner<0&&s.nodes[n].edges.every(j=>s.nodes[other(s.edges[j],n)].owner<0)?fertility(n):0;
          return 10+Math.max(potential(e.a),potential(e.b));
        }
        case 'bank':return h[x]>=z && h[x]>h[y]+1 && h[y]<2?26-h[y]:-5;
        case 'offer':return -10;
        case 'accept':return h[s.offer.want]>h[s.offer.give]?2:-1;
        case 'discard':case 'take':return k==='discard'?h[x]:s.players.reduce((v,p,j)=>v+(i===j?0:p.hand[x]),0);
        case 'gain':return 5-h[x];
        case 'robber':return s.tiles[x].ns.reduce((n,v)=>n+s.nodes[v].level*(s.nodes[v].owner===i?-3:1),0);
        default:return 0;
      }
    }
    let best, bestScore=-Infinity;
    for(const action of opts){
      const score=rank(action)+Math.random();
      if(score>bestScore){best=action;bestScore=score;}
    }
    return best;
  }
  /**
   * @returns {{kind:'ready', game:object}|{kind:'empty'}|{kind:'invalid'}}
   */
  function readSave(raw){
    if(raw==null)return {kind:'empty'};
    try{
      const s=JSON.parse(raw);
      const index=(value,length)=>Number.isInteger(value)&&value>=0&&value<length;
      const counts=(values,size)=>Array.isArray(values)&&values.length===size&&values.every(n=>Number.isSafeInteger(n)&&n>=0);
      if(!s||!Object.hasOwn(modes,s.mode)||![3,4].includes(s.players?.length))return {kind:'invalid'};
      const size=s.mode==='knights'?8:5;
      const seat=j=>index(j,s.players.length);
      const validPlayer=p=>p&&typeof p.name==='string'&&typeof p.ai==='boolean'&&counts(p.hand,size)&&counts(p.dev,5)&&counts(p.fresh,5);
      if(!s.players.every(validPlayer)||!counts(s.bank,size)||!seat(s.turn)||!Array.isArray(s.deck)||!s.awards||
         !Array.isArray(s.dice)||!Array.isArray(s.discard)||!Array.isArray(s.log)||!s.log.every(t=>typeof t==='string'))return {kind:'invalid'};
      if(s.mode==='knights'&&(!Array.isArray(s.progressDecks)||s.progressDecks.length!==3||!s.progressDecks.every(Array.isArray)||
         !s.players.every(p=>counts(p.tracks,3)&&Array.isArray(p.progress)&&p.progress.every(c=>index(c.track,3)&&Object.hasOwn(Cities.names,c.card)))))return {kind:'invalid'};
      if(s.mode==='sea'&&!s.players.every(p=>Array.isArray(p.islands)))return {kind:'invalid'};
      if(!Array.isArray(s.nodes)||!Array.isArray(s.edges)||!Array.isArray(s.tiles)||s.tiles.length!==(s.mode==='sea'?43:19))return {kind:'invalid'};
      const node=n=>index(n,s.nodes.length),edge=e=>index(e,s.edges.length),tile=t=>index(t,s.tiles.length);
      const positioned=v=>Number.isFinite(v.x)&&Number.isFinite(v.y);
      if(!s.nodes.every(v=>positioned(v)&&[0,1,2].includes(v.level)&&(v.owner===-1||seat(v.owner))&&
         (!v.knight||seat(v.knight.owner)&&[1,2,3].includes(v.knight.level))&&v.tiles.every(tile)&&v.edges.every(edge)))return {kind:'invalid'};
      if(!s.edges.every(e=>node(e.a)&&node(e.b)&&(e.owner===-1||seat(e.owner)))||
         !s.tiles.every(t=>positioned(t)&&Number.isInteger(t.num)&&t.ns.length===6&&t.ns.every(node)))return {kind:'invalid'};
      // Pending choices reference other objects in the snapshot. Validate those
      // references before exposing Resume, including actions with a single choice.
      const resource=r=>index(r,size);
      switch(s.phase){
        case 'setupRoad':if(!node(s.anchor)||s.nodes[s.anchor].owner!==s.turn)return {kind:'invalid'};break;
        case 'offer':{
          const o=s.offer;
          if(!o||o.from!==s.turn||!seat(o.to)||o.to===o.from||!resource(o.give)||!resource(o.want)||o.give===o.want)return {kind:'invalid'};
          break;
        }
        case 'victim':if(!s.victims.every(j=>seat(j)&&j!==s.turn&&sum(s.players[j].hand)>0))return {kind:'invalid'};break;
        case 'discard':if(!s.discard.every(q=>seat(q.i)&&Number.isInteger(q.n)&&q.n>0&&q.n<=sum(s.players[q.i].hand)))return {kind:'invalid'};break;
        case 'sail':if(s.mode!=='sea'||!edge(s.shipFrom)||!s.edges[s.shipFrom].ship||s.edges[s.shipFrom].owner!==s.turn)return {kind:'invalid'};break;
        case 'gold':if(s.mode!=='sea'||!s.goldQueue.every(q=>seat(q.i)&&Number.isInteger(q.n)&&q.n>0))return {kind:'invalid'};break;
        case 'spy':if(s.mode!=='knights'||!seat(s.spyTarget)||s.spyTarget===s.turn)return {kind:'invalid'};break;
        case 'reward':case 'pillage':case 'returnProgress':
          if(s.eventQueue?.[0]?.phase!==s.phase||s.respondent!==s.eventQueue[0].j)return {kind:'invalid'};
          break;
      }
      if(!seat(actor(s))||s.phase!=='over'&&!choices(s).length)return {kind:'invalid'};
      return {kind:'ready',game:s};
    }catch{return {kind:'invalid'};}
  }
  const names=[...resources,'직물','종이','화폐'];
  return {readSave,resources:names,target,modes,cards,costs,start,choices,play,ai,points,actor,longest};
})();
if(typeof module!=='undefined')module.exports=Catan;
