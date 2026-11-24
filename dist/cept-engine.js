/* A single-area introductory match. All state is serializable between decisions. */
const Cepter = (() => {
  const maps=typeof module==='undefined'?CepterMaps:require('./cept-maps.js');
  const original=typeof module==='undefined'?CepterCards:require('./cept-cards.js');
  const board=s=>maps[s.mapId||'classic'];
  const elements=['화','수','지','풍'];
  const creature=(name,element,st,hp,cost)=>({name,kind:'creature',element,st,hp,cost});
  const item=(name,st,hp,cost)=>({name,kind:'item',st,hp,cost});
  const spell=(name,effect,cost)=>({name,kind:'spell',effect,cost});
  const cards=[
    creature('잿빛 사냥개',0,40,30,50),creature('화로 파수꾼',0,30,50,60),
    creature('안개 수달',1,30,40,40),creature('조수의 거인',1,40,50,70),
    creature('뿌리 병사',2,20,50,40),creature('산등성이 곰',2,50,40,70),
    creature('바람 송골매',3,40,30,40),creature('구름 사자',3,50,30,60),
    item('호박석 검',30,0,30),item('조개 방패',0,30,30),
    spell('고정 보폭','one',10),spell('바람 걸음','six',20),spell('마력의 샘','cash',20)
  ];
  const starter=cards.flatMap((_,id)=>Array(id>=11?3:4).fill(id));
  const offset=cards.length;
  cards.push(...original.map(c=>({...c})));
  const fireBook=original.flatMap((c,i)=>Array(c.copies).fill(i+offset));
  const catalog=typeof module==='undefined'?CepterCatalog:require('./cept-catalog-data.js');
  for(const entry of catalog){
    if(entry.gameId!=null){
      Object.assign(cards[entry.gameId],{catalog:entry});
    }else{
      cards.push({...entry,catalog:entry});
    }
  }
  const presets={intro:starter,fire:fireBook};
  function validBook(book){
    return Array.isArray(book)&&book.length===50&&book.every(id=>Number.isInteger(id)&&!!cards[id]&&!cards[id].catalogOnly&&book.filter(n=>n===id).length<=4);
  }
  function shuffledBook(template=starter){
    const book=template.slice();
    for(let i=book.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[book[i],book[j]]=[book[j],book[i]];}
    return book;
  }
  function draw(p){if(!p.book.length)p.book=shuffledBook(p.template);p.hand.push(p.book.pop());}
  function start(count,humans,target=4000,mapId='classic',template=starter){
    if(![2,3,4].includes(count)||!Number.isInteger(humans)||humans<0||humans>count||![3000,4000,5000,6000].includes(target)||!Object.hasOwn(maps,mapId)||!validBook(template))throw Error('대국 설정 오류');
    const players=Array.from({length:count},(_,i)=>{
      const p={ai:i>=humans,name:(i>=humans?'AI ':'셉터 ')+(i+1),cash:200,pos:0,dir:0,lap:0,flags:[],hand:[],book:shuffledBook(template),template:template.slice(),symbols:Array(8).fill(0),previous:null};
      for(let j=0;j<4;j++)draw(p);return p;
    });
    const s={version:1,mapId,prices:Array(8).fill(10),players,target,turn:0,round:1,phase:'spell',tiles:maps[mapId].types.map((type,i)=>({type,area:maps[mapId].areas[i],base:maps[mapId].base,owner:-1,level:1,unit:null})),log:[],die:0,visited:[],winner:-1};
    draw(players[0]);return s;
  }
  function note(s,t){s.log.unshift(t);if(s.log.length>16)s.log.pop();}
  const actor=s=>s.phase==='defend'?s.tiles[s.battle.at].owner:s.turn;
  const worth=t=>(t.base||80)*2**(t.level-1);
  const chain=(s,t)=>Math.min(5,s.tiles.filter(v=>v.owner===t.owner&&v.type===t.type&&v.area===t.area).length);
  const value=(s,t)=>Math.floor(worth(t)*[0,1,1.5,1.8,2,2.2][chain(s,t)]);
  const toll=(s,t)=>Math.floor(value(s,t)*[0,.2,.3,.4,.6,.8][t.level]);
  const total=(s,i)=>s.tiles.reduce((v,t)=>v+(t.owner===i?value(s,t):0),s.players[i].cash)+(s.players[i].symbols||[]).reduce((v,n,k)=>v+n*s.prices[k],0);
  function vacate(t,release=false){t.owner=-1;if(release)t.level=1;t.unit=null;}
  function landValues(s){
    const result=Array(8).fill(0);
    for(const t of s.tiles)if(typeof t.type==='number')result[(t.area||0)*4+t.type]+=t.owner<0?worth(t):value(s,t);
    return result;
  }
  function updatePrices(s,before){
    if(!before)return;
    landValues(s).forEach((v,k)=>{s.prices[k]=Math.max(1,s.prices[k]+Math.trunc((v-before[k])/100));});
  }
  function finish(s){

    s.turn=(s.turn+1)%s.players.length;
    if(s.turn===0)s.round++;
    draw(s.players[s.turn]);s.phase=s.players[s.turn].hand.length>6?'discard':'spell';s.fixed=0;s.die=0;s.visited=[];
  }
  function paid(s,p,j){
    const id=p.hand.splice(j,1)[0];p.cash-=cards[id].cost;return id;
  }
  function onward(s){
    const p=s.players[s.turn];return board(s).links[p.pos].filter(n=>n!==p.previous);
  }
  function advance(s,next){
    const p=s.players[s.turn],m=board(s);
    const path=[p.pos];
    s.lastMove={sequence:(s.lastMove?.sequence||0)+1,seat:s.turn,path};
    while(s.remaining){
      path.push(next);
      p.previous=p.pos;p.pos=next;s.remaining--;
      const t=s.tiles[next];if(t.owner===s.turn)s.visited.push(next);
      if(m.forts.includes(next)&&!p.flags.includes(next)){
        p.flags.push(next);const money=m.fortBonus||50;p.cash+=money;note(s,p.name+' · '+t.type+' +'+money+'G');
      }
      if(next===0&&p.flags.length===m.forts.length){
        p.lap++;p.flags=[];p.cash+=m.bonus+20*(p.lap-1)+20*s.tiles.filter(v=>v.owner===s.turn).length;
        const bonus=(p.symbols||[]).reduce((sum,n,k)=>sum+(n&&s.players.every(q=>q===p||q.symbols[k]<n)?n*s.prices[k]:0),0);
        p.cash+=Math.floor(bonus/10);
        s.tiles.filter(v=>v.owner===s.turn).forEach(v=>{const max=cards[v.unit.id].hp;v.unit.hp=Math.min(max,v.unit.hp+Math.floor(max/5));});
        note(s,p.name+' · '+p.lap+'주 완주');
      }
      if(next===0&&total(s,s.turn)>=s.target){s.winner=s.turn;s.phase='over';return;}
      if(t.type==='신전'){s.phase='temple';return;}
      if(s.remaining){const exits=onward(s);if(exits.length!==1){s.phase='fork';return;}next=exits[0];}
    }
    s.phase='land';
  }
  function resumeMove(s){
    if(!s.remaining){s.phase='land';return;}
    const exits=onward(s);if(exits.length===1)advance(s,exits[0]);else s.phase='fork';
  }
  function move(s,dir){
    const p=s.players[s.turn];p.dir=dir;s.remaining=s.die;s.visited=[];
    if(p.previous==null)advance(s,dir===1?1:board(s).links[p.pos].at(-1));
    else resumeMove(s);
  }
  function debt(s){
    const p=s.players[s.turn];
    if(p.cash>=0){finish(s);return;}
    if((p.symbols||[]).some(Boolean)||s.tiles.some(t=>t.owner===s.turn)){s.phase='sell';return;}
    p.cash=200;p.pos=0;p.flags=[];p.dir=0;p.previous=null;note(s,p.name+' · 마력 고갈, 성에서 재출발');finish(s);
  }
  function payToll(s){
    const p=s.players[s.turn],t=s.tiles[p.pos],n=toll(s,t);
    p.cash-=n;s.players[t.owner].cash+=n;note(s,p.name+' · 통행료 '+n+'G');debt(s);
  }
  function afterTerritory(s){const t=s.tiles[s.players[s.turn].pos];if(t.owner>=0&&t.owner!==s.turn)payToll(s);else finish(s);}
  function territory(s){
    const p=s.players[s.turn];
    if(p.pos===0||board(s).forts.includes(p.pos))return s.tiles.flatMap((v,n)=>v.owner===s.turn?[n]:[]);
    return [...new Set(s.visited)];
  }
  function choices(s){
    if(s.phase==='over')return [];
    const i=actor(s),p=s.players[i],t=s.tiles[p.pos],options=[];
    const hand=(kind,k)=>p.hand.forEach((id,j)=>{if(cards[id].kind===kind&&cards[id].cost<=p.cash&&(!(kind==='creature')||(cards[id].landBan!==t.type&&(k!=='invade'||!cards[id].stationary))))options.push([k,j]);});
    switch(s.phase){
      case 'spell':hand('spell','cast');options.push(['roll']);break;
      case 'spellTarget':{
        const effect=s.spellEffect;
        if(effect==='heal'||effect==='bolt')s.tiles.forEach((v,n)=>{if(v.unit)options.push(['targetLand',n]);});
        else s.players.forEach((q,j)=>{if(effect!=='shatter'||q.hand.some(id=>cards[id].kind!=='creature'))options.push(['targetPlayer',j]);});
        if(!options.length)options.push(['fizzle']);break;
      }
      case 'shatter':return s.players[s.spellTarget].hand.flatMap((id,j)=>cards[id].kind==='creature'?[]:[['breakCard',j]]);
      case 'roll':options.push(['roll']);break;
      case 'direction':return [['direction',1],['direction',-1]];
      case 'fork':return onward(s).map(n=>['route',n]);
      case 'temple':
        s.prices.forEach((price,k)=>{
          for(let n=1;n<=Math.min(50,Math.floor(p.cash/price));n++)options.push(['buySymbol',k,n]);
          for(let n=1;n<=Math.min(50,p.symbols[k]);n++)options.push(['sellSymbol',k,n]);
        });options.push(['leaveTemple']);break;
      case 'land':
        if(t.owner>=0&&t.owner!==i){hand('creature','invade');options.push(['pay']);}
        {
          if(t.owner<0&&typeof t.type==='number')hand('creature','summon');
          for(const n of territory(s)){
            const v=s.tiles[n];for(let level=v.level+1;level<=5;level++){
              if(p.cash>=(v.base||80)*2**(level-1)-worth(v))options.push(['level',n,level]);
            }
            for(const dest of board(s).links[n]){
              if(!cards[v.unit.id].stationary&&cards[v.unit.id].landBan!==s.tiles[dest].type&&typeof s.tiles[dest].type==='number'&&s.tiles[dest].owner!==i)options.push(['transfer',n,dest]);
            }
            if(p.cash>=300)elements.forEach((_,e)=>{if(e!==v.type)options.push(['element',n,e]);});
            p.hand.forEach((id,j)=>{if(cards[id].kind==='creature'&&cards[id].cost<=p.cash&&cards[id].landBan!==v.type)options.push(['exchange',n,j]);});
          }
          if(t.owner<0||t.owner===i)options.push(['pass']);
        }break;
      case 'attack':case 'defend':{
        const unit=cards[s.phase==='attack'?s.battle.inv:s.tiles[s.battle.at].unit.id];
        p.hand.forEach((id,j)=>{const gear=cards[id],category=gear.category||(gear.st?'weapon':'armor');
          if(gear.cost<=p.cash&&(gear.kind==='item'&&!unit.ban?.includes(category)||unit.support&&gear.kind==='creature'))options.push(['equip',j]);
        });options.push(['bare']);break;
      }
      case 'result':return [['continue']];
      case 'discard':return p.hand.map((_,j)=>['discard',j]);
      case 'sell':return [...s.tiles.flatMap((v,n)=>v.owner===i?[['sell',n]]:[]),...(p.symbols||[]).flatMap((n,k)=>n?[['liquidate',k,Math.min(n,Math.ceil(-p.cash/s.prices[k]))]]:[])];
    }
    return options;
  }
  function resolve(s){
    const b=s.battle,t=s.tiles[b.at],inv=cards[b.inv],guard=cards[t.unit.id];
    const atk=cards[b.atkItem],def=cards[b.defItem];
    const bonus=guard.element===t.type?10*t.level:0;
    const near=board(s).links[b.at].filter(n=>n!==b.from);
    const support=i=>10*near.filter(n=>s.tiles[n].owner===i).length;
    const make=(unit,gear,hp,side,land,confused)=>({unit,gear,hp:hp+(gear?.hp||0)+land,land,confused,
      st:['reflect','nullify'].includes(gear?.effect)?0:gear?.category==='scroll'?gear.st:unit.st+(gear?.st||0)+support(side)});
    const attacker=make(inv,atk,b.invHP??inv.hp,s.turn,0,false);
    const defender=make(guard,def,t.unit.hp,t.owner,bonus,t.unit.confused);
    const lines=[];
    const health=()=>[Math.max(0,attacker.hp),Math.max(0,defender.hp)];
    b.startHP=health();b.strikes=[];
    function hit(a,d){
      const scroll=a.gear?.category==='scroll';
      const penetrate=scroll||a.gear?.effect==='pierceEarth'&&d.unit.element===2;
      if(penetrate&&d.land){d.hp-=d.land;d.land=0;lines.push('지형 보너스 관통');}
      let damage=a.st;
      if(scroll&&a.gear.effect==='freeze'&&d.unit.element===0)damage=Math.floor(damage*1.5);
      if(!scroll&&a.gear?.effect!=='orb'){
        if(d.gear?.effect==='reflect'){a.hp-=damage;lines.push('반사 '+damage);return 'reflect';}
        if(d.gear?.effect==='nullify'){lines.push('공격 무효');return 'block';}
        if(d.unit.half)damage=Math.floor(damage/2);
      }
      d.hp-=damage;lines.push(a.unit.name+' → '+damage+' 피해');
      if(a.confused)a.hp-=Math.floor(damage*.3);
      if(a.unit.confuse&&damage>0)d.confused=true;
    }
    const order=guard.first&&!inv.first?[defender,attacker]:[attacker,defender];
    for(let i=0;i<order.length;i++){
      const source=order[i],target=order[1-i],lineStart=lines.length;
      const effect=hit(source,target)||'hit';
      b.strikes.push({effect,side:source===attacker?0:1,hp:health(),notes:lines.slice(lineStart)});
      if(source.hp<=0||target.hp<=0)break;
    }
    const won=defender.hp<=0&&attacker.hp>0,both=defender.hp<=0&&attacker.hp<=0;
    b.guard=t.unit.id;b.guardHP=t.unit.hp;b.attackST=attacker.st;b.defendST=defender.st;b.landHP=bonus;
    b.finalHP=[Math.max(0,attacker.hp),Math.max(0,defender.hp)];
    b.lines=[...lines,both?'양측 소멸':won?'침략 성공 · 영지 점령':'방어 성공'];b.won=won;b.noToll=b.from!=null||both;
    if(both)vacate(t);
    else if(won){t.owner=s.turn;t.unit={id:b.inv,hp:Math.min(inv.hp,attacker.hp),confused:attacker.confused};}
    else{
      t.unit.hp=Math.min(t.unit.hp,defender.hp);t.unit.confused=defender.confused;
      if(attacker.hp>0){if(b.from==null)s.players[s.turn].hand.push(b.inv);else s.tiles[b.from].unit.hp=Math.min(b.invHP,attacker.hp);}
    }
    if(b.from!=null&&(won||attacker.hp<=0))vacate(s.tiles[b.from]);
    s.phase='result';note(s,b.lines.at(-1));
  }
  function play(s,a){
    if(!Array.isArray(a)||!choices(s).some(b=>a.length===b.length&&b.every((v,i)=>v===a[i])))return false;
    const [k,x,y]=a,i=actor(s),p=s.players[i],t=s.tiles[p.pos];
    const before=s.mapId==='market'?landValues(s):null;
    switch(k){
      case 'route':advance(s,x);break;
      case 'buySymbol':case 'sellSymbol':{
        const count=k==='buySymbol'?y:-y;p.cash-=count*s.prices[x];p.symbols[x]+=count;resumeMove(s);break;
      }
      case 'leaveTemple':resumeMove(s);break;
      case 'liquidate':p.cash+=s.prices[x]*y;p.symbols[x]-=y;debt(s);break;
      case 'cast':{
        const c=cards[paid(s,p,x)];s.phase='roll';
        if(c.effect==='cash')p.cash+=100;
        else if(c.effect==='manna')p.cash+=50*(p.lap+1);
        else if(c.effect==='fly')s.fly=true;
        else if(c.effect==='six'||c.effect==='one')p.word=c.effect==='one'?1:6;
        else{s.spellEffect=c.effect;s.phase='spellTarget';}
        note(s,p.name+' · '+c.name);break;
      }
      case 'targetLand':{
        const unit=s.tiles[x].unit;if(s.spellEffect==='heal')unit.hp=cards[unit.id].hp;
        else if((unit.hp-=20)<=0)vacate(s.tiles[x]);s.phase='roll';break;
      }
      case 'targetPlayer':if(s.spellEffect==='shatter'){s.spellTarget=x;s.phase='shatter';}
        else{s.players[x].word=s.spellEffect==='word1'?1:6;s.phase='roll';}break;
      case 'breakCard':s.players[s.spellTarget].hand.splice(x,1);s.phase='roll';break;
      case 'fizzle':s.phase='roll';break;
      case 'roll':{const die=()=>1+Math.floor(Math.random()*board(s).die);s.die=p.word||s.fixed||(die()+(s.fly?die():0));delete p.word;s.fly=false;}note(s,p.name+' · 주사위 '+s.die);if(p.dir){if(p.previous==null)p.previous=(p.pos-p.dir+s.tiles.length)%s.tiles.length;move(s,p.dir);}else s.phase='direction';break;
      case 'direction':move(s,x);break;
      case 'summon':case 'exchange':{
        const tile=k==='summon'?t:s.tiles[x],id=paid(s,p,k==='summon'?x:y);
        if(k==='exchange')p.hand.push(tile.unit.id);
        tile.owner=i;tile.unit={id,hp:cards[id].hp};note(s,p.name+' · '+cards[id].name+' 배치');afterTerritory(s);break;
      }
      case 'level':p.cash-=(s.tiles[x].base||80)*2**(y-1)-worth(s.tiles[x]);s.tiles[x].level=y;note(s,p.name+' · '+(x+1)+'번 영지 Lv.'+y);afterTerritory(s);break;
      case 'transfer':{
        const from=s.tiles[x],dest=s.tiles[y];
        if(dest.owner<0){dest.owner=i;dest.unit=from.unit;delete dest.unit.confused;vacate(from);afterTerritory(s);}
        else{s.battle={at:y,inv:from.unit.id,invHP:from.unit.hp,from:x,atkItem:null,defItem:null};s.phase='attack';}
        break;
      }
      case 'element':p.cash-=300;s.tiles[x].type=y;afterTerritory(s);break;
      case 'pay':payToll(s);break;
      case 'invade':s.battle={at:p.pos,inv:paid(s,p,x),atkItem:null,defItem:null};s.phase='attack';break;
      case 'bare':case 'equip':{
        const id=k==='equip'?paid(s,p,x):null;
        if(s.phase==='attack'){s.battle.atkItem=id;s.phase='defend';}else{s.battle.defItem=id;resolve(s);}break;
      }
      case 'continue':{const moved=s.battle.from!=null,free=s.battle.won||s.battle.noToll;delete s.battle;if(moved)afterTerritory(s);else if(free)finish(s);else payToll(s);break;}
      case 'pass':finish(s);break;
      case 'sell':p.cash+=value(s,s.tiles[x]);vacate(s.tiles[x],true);debt(s);break;
      case 'discard':p.hand.splice(x,1);if(p.hand.length<=6)s.phase='spell';break;
    }updatePrices(s,before);return true;
  }
  function ai(s){
    const p=s.players[actor(s)];
    function score([k,x,y]){
      const c=cards[p.hand[x]];
      switch(k){
        case 'route':{
          const p=s.players[s.turn],goals=board(s).forts.filter(n=>!p.flags.includes(n));
          let queue=[[x,p.pos,0]],seen=new Set();
          for(let k=0;k<queue.length;k++){
            const [at,prev,d]=queue[k],key=at+'/'+prev;if(seen.has(key))continue;seen.add(key);
            if((goals.length?goals:[0]).includes(at))return 9-d;
            board(s).links[at].filter(n=>n!==prev).forEach(n=>queue.push([n,at,d+1]));
          }return -9;
        }
        case 'buySymbol':return p.cash>300&&y<=5&&p.symbols[x]<10?2:-2;
        case 'sellSymbol':return p.cash<90?2+y/100:-2;
        case 'leaveTemple':return 1;
        case 'targetLand':return s.spellEffect==='bolt'?(s.tiles[x].owner===s.turn?-8:8)+(s.tiles[x].unit.hp<=20?2:0):(s.tiles[x].owner===s.turn?5:0)+1-s.tiles[x].unit.hp/cards[s.tiles[x].unit.id].hp;
        case 'targetPlayer':return (s.spellEffect==='word6')===(x===s.turn)?4:0;
        case 'cast':if(['manna','fly','word6','bolt','shatter'].includes(c.effect))return 4;
          return c.effect==='cash'?10:c.effect==='six'?3:-2;
        case 'summon':return 70+c.hp/10+(c.element===s.tiles[p.pos].type?4:0);
        case 'invade':{const g=s.tiles[p.pos],hp=g.unit.hp+(cards[g.unit.id].element===g.type?10*g.level:0);
          return c.st+(p.hand.some(id=>cards[id].kind==='item'&&cards[id].st&&cards[id].cost+c.cost<=p.cash)?30:0)>=hp?40: -2;}
        case 'equip':return (s.phase==='attack'?c.st:c.hp)/5-1;
        case 'level':return 30+y+(chain(s,s.tiles[x])>1?5:0);
        case 'transfer':case 'element':case 'exchange':return -2;
        case 'discard':return c.kind==='spell'?5:1;
        case 'sell':return -value(s,s.tiles[x])/100;
        default:return 0;
      }
    }
    let best,bestScore=-Infinity;
    for(const a of choices(s)){const n=score(a)+Math.random();if(n>bestScore){best=a;bestScore=n;}}
    return best;
  }
  return {start,choices,play,ai,actor,total,toll,value,cards,elements,maps,board,presets,validBook,forts:maps.classic.forts};
})();
if(typeof module!=='undefined')module.exports=Cepter;