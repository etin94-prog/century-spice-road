/* A single-area introductory match. All state is serializable between decisions. */
const Cepter = (() => {
  const maps=typeof module==='undefined'?CepterMaps:require('./cept-maps.js');
  const original=typeof module==='undefined'?CepterCards:require('./cept-cards.js');
  const board=s=>maps[(s.mapId?.startsWith('ps2-')&&!s.layoutRevision?'legacy-':'')+(s.mapId||'classic')];
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
  const stageAbilities={
    'water/wallofice':{landBan:0,ban:['armor','scroll'],stationary:true,battleHP:30},
    'neutral/skeleton':{regenerate:true},'water/giantamoeba':{neutralizes:[0,2]},
    'water/kingtortoise':{last:true},'air/hornet':{poison:true},
    'air/hurricane':{landBan:2,ban:['armor','scroll'],first:true,stationary:true},
    'spells/plague':{effect:'plague'},'air/sprite':{landBan:2,blocksLarge:true},'items/firebolt':{st:30,hp:0,critical:1}
  };
  for(const c of cards){
    const rule=stageAbilities[c.catalog?.path];
    if(rule)Object.assign(c,rule,{catalogOnly:false});
  }
  const combo=typeof module==='undefined'?CepterCombos:require('./cept-combo-rules.js');
  const key=combo.key;
  const enabled=new Set('boggart gnome oldwillow kelpie cornfolk dryad sage manes seabonze goldentotem caitsith decoy bandit executor cerberus grendel phoenix mummy zombie mandrake lunatichare nike succubus leprechaun gremlin leshy gouda drool undine mujina spectre centaur migoal nightmare nightfiend powdereater goblin statue silveridol brassidol borgess lung virus sulfurousballoon wraith sonascetic livingshield mermecoleo bloodypudding behemoth remora deathgaze tetramorph sphinx peri conjurer baal heatimp windimp witch spittingcobra goobaqueen gooba graniteidol marbleidol cleric carbuncle berserker thief hellhound roadrunner wereboar griffon knight lilith pyrodrake dragonzombie firegiant stormgiant hornedchameleon ninja mastermonk willothewisp amazon golem pegasus wyvern wonderwall steamgear trenchworm lavaworm vision samurai troll mudman pushpull tyrannosaurus hydra shellcreeper larvae darkelf coati cyclops grimalkin gladiator gigantherium dragon bunyip'.split(' '));
  const gearNames=new Set('clawoftheghoul spikeshield buckler stormcauser goldengoose dynamite wateramulet watershield fireamulet ringofthevampire banditsglove gremlinamulet terrair changingsalve silverplow ringofthesuccubus phoenixamulet dragonhelm mujinamask hourglass gemoflife lunastone necroscarab neutralamulet rathunter belloflaw death windcutter petrifystone thehand vestment boomerang swordofthefalcon diamondarmor rockbiter flametongue earthshield sling powerbracelet rubyring towershield airslasher masamune nuclearfusion nunchaku windshield'.split(' '));
  for(const c of cards){
    const n=key(c);
    if(!combo.type[n]&&!enabled.has(n)&&!gearNames.has(n))continue;
    c.catalogOnly=false;
    if(combo.type[n])c.effect=n;
    if(c.kind==='item'){c.st=Number(c.catalog.ability.match(/\bST([+-]\d+)/)?.[1]||0);c.hp=Number(c.catalog.ability.match(/\bHP([+-]\d+)/)?.[1]||0);}
    c.ban=c.catalog.equipment.split(',').filter(Boolean).map(v=>v.toLowerCase());
    c.stationary=c.catalog.ability.includes('Defensive');c.support=c.catalog.ability.includes('Support');
    c.first=c.catalog.ability.includes('Attacks First');c.last=c.catalog.ability.includes('Attacks Last');
    if(n==='troll')c.regenerate=true;
    if(n==='nuclearfusion')c.st=50;
    const neutralizes={wonderwall:[0,1,2,3],vision:[3],shellcreeper:[0,3]};
    if(neutralizes[n])c.neutralizes=neutralizes[n];
    if(n==='windcutter'){c.st=30;c.critical=2;}
    if(n==='sphinx')c.confuse=true;
  }
  const deployable=(s,id)=>!s.tiles.some(v=>fx.name(v.unit)==='marbleidol')||!s.tiles.some(v=>v.unit?.id===id);
  const canOccupy=(c,t)=>c.landBan!==t.type&&!c.catalog?.placement?.split(',').includes('RBGY'[t.type]||'-');
  const allowed=(s,i,c,t)=>canOccupy(c,t)&&
    [...'RBGY'].every((v,e)=>s.tiles.filter(t=>t.owner===i&&t.type===e).length>=(c.catalog?.additionalCost||'').split(',').filter(k=>k===v).length);
  const presets={intro:starter,fire:fireBook};
  function validBook(book){
    return Array.isArray(book)&&book.length===50&&book.every(id=>Number.isInteger(id)&&!!cards[id]&&!cards[id].catalogOnly&&book.filter(n=>n===id).length<=4);
  }
  function shuffledBook(template=starter){
    const book=template.slice();
    for(let i=book.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[book[i],book[j]]=[book[j],book[i]];}
    return book;
  }
  function draw(p,s){
    if(!p.book.length)p.book=shuffledBook(p.template);
    p.hand.push(p.book.pop());
    if(s)for(const watcher of s.players)if(s.players[watcher.peek?.seat]===p)watcher.peek.ids.shift();
  }
  const storyAlliances={
    'ps2-8':[null,'Ryvern · Conserve','Selena · Castle Guard','Zagol · Beat You!'],
    'ps2-14':[null,'Gamygin · Detonation','Selena · Castle Guard','Mullyn · Frozen Bind'],
    'ps2-15':[null,'Balberit · Dragon Tamer','Selena · Castle Guard','Ryvern · Conserve']
  };
  const storyDecks=new Map();
  function storyBook(name){
    if(!storyDecks.has(name)){
      const archive=typeof module==='undefined'?CepterArchive:require('./cept-archive-data.js');
      const row=archive.books.find(b=>b.name===name);
      const adapt=typeof module==='undefined'?adaptCepterBook:require('./cept-books.js');
      const book=adapt({cards,presets},row).deck;
      if(!validBook(book))throw Error('스토리 북 오류 · '+name);
      storyDecks.set(name,book);
    }
    return storyDecks.get(name);
  }
  function start(count,humans,target=4000,mapId='classic',template=starter,aiBook=template,aiLevel=0,alliance='auto'){
    const storyNames=storyAlliances[mapId];
    const storyCast=!!storyNames&&['story','story-leo'].includes(aiBook)&&count===4&&alliance!=='duel'&&(alliance==='teams'||target===0);
    if(aiBook==='story-leo'&&mapId!=='ps2-14')throw Error('레오 동맹은 콴제에서 선택할 수 있습니다.');
    const mapGoal=target===0;
    if(mapGoal)target=maps[mapId]?.storyGoal??5000;
    if(![2,3,4].includes(count)||!Number.isInteger(humans)||humans<0||humans>count||![3000,4000,5000,6000,8000,9000,10000,12000].includes(target)||!Object.hasOwn(maps,mapId)||!validBook(template)||(!storyCast&&!validBook(aiBook))||![0,1,2,3].includes(aiLevel))throw Error('대국 설정 오류');
    if(!['auto','duel','teams'].includes(alliance)||alliance==='teams'&&count!==4)throw Error('동맹전은 4인 대국입니다.');
    const teams=count===4&&(alliance==='teams'||alliance==='auto'&&mapGoal&&!!storyNames)?[0,1,0,1]:null;
    const players=Array.from({length:count},(_,i)=>{
      const npc=storyCast&&i>=humans?(aiBook==='story-leo'&&i===2?'Leo · Revenge':storyNames[i]):null;
      const seatBook=npc?storyBook(npc):i>=humans&&!storyCast?aiBook:template;
      const p={ai:i>=humans,name:npc||((i>=humans?'AI ':'셉터 ')+(i+1)),cash:200,pos:0,dir:0,lap:0,flags:[],hand:[],book:shuffledBook(seatBook),template:seatBook.slice(),symbols:Array((maps[mapId].areaCount||2)*4).fill(0),previous:null};
      for(let j=0;j<4;j++)draw(p);return p;
    });
    const s={version:1,layoutRevision:1,storyCast,alliance,teams,mapId,mapGoal,aiLevel,prices:Array((maps[mapId].areaCount||2)*4).fill(10),players,target,turn:0,round:1,phase:'spell',tiles:maps[mapId].types.map((type,i)=>({type,area:maps[mapId].areas[i],base:maps[mapId].base,owner:-1,level:1,unit:null})),log:[],die:0,visited:[],winner:-1};
    draw(players[0]);return s;
  }
  function note(s,t){s.log.unshift(t);if(s.log.length>16)s.log.pop();}
  const actor=s=>s.phase==='defend'?s.tiles[s.battle.at].owner:s.phase==='attack'?(s.battle.attackerSeat??s.turn):s.turn;
  const levelCost=(t,level)=>(t.base||80)*2**(level-1)-worth(t);
  const worth=t=>(t.base||80)*2**(t.level-1);
  const territoryType=type=>typeof type==='number'||type==='복합'||type==='무속성';
  const landBonus=(unit,t)=>unit.element===t.type||t.type==='복합'&&unit.element>=0?10*t.level:0;
  const allied=combo.allied;
  const sameChain=(a,b,s)=>a.owner>=0&&typeof a.type==='number'&&allied(s,a.owner,b.owner)&&a.type===b.type&&a.area===b.area;
  const chain=(s,t)=>t.owner<0||typeof t.type!=='number'?1:Math.min(5,s.tiles.filter(v=>sameChain(t,v,s)).length);
  const chainRates=[0,10,15,18,20,22];
  const chainRate=(s,t)=>chainRates[chain(s,t)]/10;
  const value=(s,t)=>Math.floor(worth(t)*chainRates[chain(s,t)]/10);
  function chainCounts(s){
    const counts=new Map();
    for(const t of s.tiles)if(t.owner>=0&&typeof t.type==='number'){
      const key=[s.teams?.[t.owner]??t.owner,t.area??0,t.type].join('/');
      counts.set(key,Math.min(5,(counts.get(key)||0)+1));
    }
    return counts;
  }
  function reportChains(s,before){
    const after=chainCounts(s),messages=[];
    for(const key of new Set([...before.keys(),...after.keys()])){
      const previous=before.get(key)||0,next=after.get(key)||0;
      if(previous===next||Math.max(previous,next)<2)continue;
      const [owner,area,type]=key.split('/').map(Number);
      const change=next<2?'연쇄 해제':next+'연쇄 · ×'+chainRates[next]/10;
      messages.push((s.teams?String.fromCharCode(65+owner)+'팀':s.players[owner].name)+' · '+(area+1)+'지역 '+elements[type]+' · '+change);
    }
    if(messages.length){s.chainNotice=messages.join(' / ');note(s,s.chainNotice);}
  }
  const toll=(s,t)=>Math.floor(value(s,t)*[0,.2,.3,.4,.6,.8][t.level]*
    ({boggart:2,gnome:1.5,steamgear:.5}[key(cards[t.unit?.id])]||1)*({peace:0,barricade:1.3,greed:1.5,fog:.5}[t.unit?.enchant]??1));
  const personalTotal=(s,i)=>s.tiles.reduce((v,t)=>v+(t.owner===i?value(s,t):0),s.players[i].cash)+(s.players[i].symbols||[]).reduce((v,n,k)=>v+n*s.prices[k],0);
  const total=(s,i)=>s.teams?s.players.reduce((sum,_,j)=>sum+(allied(s,i,j)?personalTotal(s,j):0),0):personalTotal(s,i);
  function vacate(t,release=false){t.owner=-1;if(release)t.level=1;t.unit=null;}
  function landValues(s){
    const result=Array(s.prices.length).fill(0);
    for(const t of s.tiles)if(typeof t.type==='number')result[(t.area||0)*4+t.type]+=t.owner<0?worth(t):value(s,t);
    return result;
  }
  function updatePrices(s,before){
    if(!before)return;
    landValues(s).forEach((v,k)=>{s.prices[k]=Math.max(1,s.prices[k]+Math.trunc((v-before[k])/100));});
  }
  const fx=combo.rules(cards,{board,draw,value,vacate,note});
  function finish(s){

    s.turn=(s.turn+1)%s.players.length;
    if(s.turn===0){s.round++;for(const t of s.tiles)if(t.unit?.expires<=s.round)combo.clear(t.unit);for(const q of s.players)if(q.statusUntil<=s.round&&q.status!=='waste')delete q.status;if(s.shineUntil<=s.round){s.prices=s.prices.map(v=>Math.max(1,Math.round(v/1.5)));delete s.shineUntil;}}
    for(let j=0;j<(s.tiles.some(t=>fx.name(t.unit)==='brassidol')?2:1);j++){draw(s.players[s.turn],s);if(s.players[s.turn].status==='despair')s.players[s.turn].hand.pop();}s.phase=s.players[s.turn].hand.length>6?'discard':'spell';s.fixed=0;s.die=0;s.visited=[];
  }
  const price=(p,c)=>c.cost*(p.status==='waste'&&c.kind!=='spell'?2:1);
  function paid(s,p,j){
    const id=p.hand.splice(j,1)[0];p.cash-=price(p,cards[id]);return id;
  }
  function onward(s){
    const p=s.players[s.turn],links=board(s).links[p.pos];return links.length===1?links:links.filter(n=>n!==p.previous);
  }
  function arrived(s){
    const p=s.players[s.turn],tile=s.tiles[p.pos];s.phase='land';
    if(tile.unit?.enchant==='mine'){p.cash-=Math.floor(p.cash/2);combo.clear(tile.unit);}
    if(tile.type==='점술관'&&p.book.length){s.phase='fortune';return;}
    if(tile.type!=='성소')return;
    const area=s.tiles.filter(t=>t.area===tile.area&&t.unit);
    const event=Math.floor(Math.random()*3),element=Math.floor(Math.random()*4);
    for(const t of area){
      const hp=fx.max(t.unit);
      if(t.unit.enchant==='phantasm')continue;
      if(event===0)t.unit.hp-=Math.floor(hp/2);
      else if(t.type===element)t.unit.hp=event===1?hp:t.unit.hp-Math.floor(hp/5);
      if(t.unit.hp<=0)fx.destroy(s,t);
    }
    note(s,'성소 · '+(event===0?'지역 전체 크리처 최대 HP의 50% 피해':elements[element]+' 영지 크리처 '+(event===1?'HP 회복':'최대 HP의 20% 피해')));
  }
  function advance(s,next){
    const p=s.players[s.turn],m=board(s);
    const path=[p.pos];
    s.lastMove={sequence:(s.lastMove?.sequence||0)+1,seat:s.turn,path};
    while(s.remaining){
      path.push(next);
      p.previous=p.pos;p.pos=next;s.remaining--;
      const t=s.tiles[next];if(t.unit?.enchant==='quicksand'){s.remaining=0;combo.clear(t.unit);}
      if(!allied(s,t.owner,s.turn)&&((fx.name(t.unit)==='kelpie'&&t.type===1)||(fx.name(t.unit)==='oldwillow'&&t.type===0)))s.remaining=0;
      if(t.type==='성'){delete p.dream;if(p.status==='waste')delete p.status;}
      if(t.owner===s.turn)s.visited.push(next);
      const checkpoint=(m.checkpoints||m.forts).find(n=>m.types[n]===t.type);
      if(checkpoint!==undefined&&!p.flags.includes(checkpoint)){
        p.flags.push(checkpoint);const money=m.fortBonus||50;p.cash+=money;note(s,p.name+' · '+t.type+' +'+money+'G');
      }
      if(t.type==='성'&&p.flags.length===(m.checkpoints||m.forts).length){
        p.lap++;p.flags=[];p.cash+=m.bonus+20*(p.lap-1)+20*s.tiles.filter(v=>v.owner===s.turn).length;
        const bonus=(p.symbols||[]).reduce((sum,n,k)=>sum+(n&&s.players.every(q=>q===p||q.symbols[k]<n)?n*s.prices[k]:0),0);
        p.cash+=Math.floor(bonus/10);
        s.tiles.filter(v=>v.owner===s.turn).forEach(v=>{if(fx.name(v.unit)==='statue')return;const max=fx.max(v.unit);v.unit.hp=Math.min(max,v.unit.hp+Math.floor(max/5));});
        note(s,p.name+' · '+p.lap+'주 완주');
      }
      if(t.type==='성'&&total(s,s.turn)>=s.target){s.winner=s.turn;s.phase='over';
        if(m.reward){
          s.reward=m.reward.counts.flatMap((count,k)=>{
            const pool=cards.flatMap((card,id)=>card.catalog?.rarity===['N','S','R'][k]&&m.reward.categories.includes(card.catalog.category)?[id]:[]);
            return Array.from({length:count},()=>pool[Math.floor(Math.random()*pool.length)]);
          });
        }
        return;}
      const dest=m.transit?.[next];
      if(dest!=null&&(t.type==='다리'||t.type==='전송진'&&!s.remaining)){
        p.pos=dest;p.previous=next;path.push(dest);
        note(s,t.type+' · '+(next+1)+'번 → '+(dest+1)+'번');
      }
      if(t.type==='신전'){s.phase='temple';return;}
      if(s.remaining){const exits=onward(s);if(exits.length!==1){s.phase='fork';return;}next=exits[0];}
    }
    arrived(s);
  }
  function resumeMove(s){
    if(!s.remaining){arrived(s);return;}
    const exits=onward(s);if(exits.length===1)advance(s,exits[0]);else s.phase='fork';
  }
  function move(s,dir){
    const p=s.players[s.turn];p.dir=dir;s.remaining=s.die;s.visited=[];
    if(p.previous==null&&board(s).stage&&board(s).links[p.pos].length>2)s.phase='fork';
    else if(p.previous==null)advance(s,dir===1?board(s).links[p.pos][0]:board(s).links[p.pos].at(-1));
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
    p.cash-=n;s.players[t.owner].cash+=n;for(const q of s.players)if(q.dream&&q!==s.players[t.owner])q.cash+=Math.floor(n/2);note(s,p.name+' · 통행료 '+n+'G');debt(s);
  }
  function afterTerritory(s){const t=s.tiles[s.players[s.turn].pos];if(t.owner>=0&&!allied(s,t.owner,s.turn))payToll(s);else finish(s);}
  function territory(s){
    const p=s.players[s.turn];
    if(s.tiles[p.pos].type==='성'||board(s).forts.includes(p.pos))return s.tiles.flatMap((v,n)=>v.owner===s.turn?[n]:[]);
    return [...new Set([...s.visited,p.pos])].filter(n=>s.tiles[n].owner===s.turn);
  }
  function choices(s){
    if(s.phase==='over')return [];
    if(s.phase==='sacrifice')return s.players[s.turn].hand.flatMap((_,j)=>j===s.pendingCard.index?[]:[['sacrifice',j]]);
    if(s.phase==='mindseeker')return Array.from({length:Math.min(6,(s.players[s.spellTarget].book?.length??s.players[s.spellTarget].bookCount??0))},(_,j)=>['eraseDraw',j]);
    if(s.phase==='territoryTarget')return fx.territoryTargets(s,s.abilityFrom);
    if(s.phase==='teleMove')return board(s).links[s.teleFrom].filter(n=>territoryType(s.tiles[n].type)&&!allied(s,s.tiles[n].owner,s.tiles[s.teleFrom].owner)&&s.tiles[n].unit?.enchant!=='peace').map(n=>['teleTo',n]);
    const i=actor(s),p=s.players[i],t=s.tiles[p.pos],options=[];
    const hand=(kind,k)=>p.hand.forEach((id,j)=>{if(cards[id].kind===kind&&(s.cardPaid||!cards[id].catalog?.additionalCost?.includes('+[]')||p.hand.length>=2)&&price(p,cards[id])<=p.cash&&(!(kind==='creature')||(p.status!=='silence'&&deployable(s,id)&&allowed(s,i,cards[id],t)&&cards[id].landBan!==t.type&&(k!=='invade'||!cards[id].stationary))))options.push([k,j]);});
    switch(s.phase){
      case 'spell':hand('spell','cast');options.push(['roll']);break;
      case 'spellTarget':{
        const effect=s.spellEffect;
        if(combo.type[effect]){const targets=fx.targets(s,effect);return targets.length?targets:[['fizzle']];}
        if(effect==='shatter'&&s.tiles.some(t=>fx.name(t.unit)==='graniteidol'))return [['fizzle']];
        if(effect==='plague')return [...new Set(s.tiles.map(t=>t.area))].map(area=>['plagueArea',area]);
        if(effect==='heal'||effect==='bolt')s.tiles.forEach((v,n)=>{if(v.unit&&v.unit.enchant!=='landprotection'&&!s.players[v.owner].invisible&&!['peri','caitsith','pegasus','grimalkin'].includes(fx.name(v.unit)))options.push(['targetLand',n]);});
        else s.players.forEach((q,j)=>{if(effect!=='shatter'||q.hand.some(id=>cards[id].kind!=='creature'))options.push(['targetPlayer',j]);});
        if(!options.length)options.push(['fizzle']);break;
      }
      case 'suppression':return s.players[s.spellTarget].hand.flatMap((id,j)=>cards[id].kind==='spell'?[['suppressCard',j]]:[]);
      case 'shatter':return s.players[s.spellTarget].hand.flatMap((id,j)=>cards[id].kind==='creature'?[]:[['breakCard',j]]);
      case 'roll':options.push(['roll']);break;
      case 'direction':return [['direction',1],['direction',-1]];
      case 'fork':return onward(s).map(n=>['route',n]);
      case 'fortune':return [...new Set(p.book.map(id=>cards[id].kind))].map(kind=>['fortuneDraw',kind]);
      case 'temple':
        s.prices.forEach((price,k)=>{
          for(let n=1;n<=Math.min(50,Math.floor(p.cash/price));n++)options.push(['buySymbol',k,n]);
          for(let n=1;n<=Math.min(50,p.symbols[k]);n++)options.push(['sellSymbol',k,n]);
        });options.push(['leaveTemple']);break;
      case 'land':
        if(t.owner>=0&&t.owner!==i&&t.unit?.enchant!=='peace')hand('creature','invade');
        if(t.owner>=0&&!allied(s,t.owner,i))options.push(['pay']);
        {
          if(t.owner<0&&territoryType(t.type))hand('creature','summon');
          for(const n of territory(s)){
            const v=s.tiles[n];if(fx.territoryTargets(s,n).length)options.push(['ability',n]);if(fx.name(v.unit)==='goldentotem')options.push(['totem',n]);for(let level=v.level+1;level<=5;level++){
              if(!combo.levelLocked(v)&&p.cash>=levelCost(v,level))options.push(['level',n,level]);
            }
            for(const dest of new Set([...(fx.name(v.unit)==='roadrunner'?board(s).links[n].flatMap(j=>board(s).links[j]).filter(j=>j!==n):board(s).links[n]),...s.tiles.flatMap((t,j)=>((fx.name(v.unit)==='dryad'&&t.type===2)||(fx.name(v.unit)==='wyvern'&&t.type===3))&&t.area===v.area&&t.owner<0?[j]:[])])){
              if(s.tiles[dest].unit?.enchant!=='peace'&&canOccupy(cards[v.unit.id],s.tiles[dest])&&!cards[v.unit.id].stationary&&territoryType(s.tiles[dest].type)&&s.tiles[dest].owner!==i)options.push(['transfer',n,dest]);
            }
            if(p.cash>=300)elements.forEach((_,e)=>{if(e!==v.type)options.push(['element',n,e]);});
            p.hand.forEach((id,j)=>{if(p.status!=='silence'&&deployable(s,id)&&(s.cardPaid||!cards[id].catalog?.additionalCost?.includes('+[]')||p.hand.length>=2)&&cards[id].kind==='creature'&&allowed(s,i,cards[id],v)&&price(p,cards[id])<=p.cash&&cards[id].landBan!==v.type)options.push(['exchange',n,j]);});
          }
          if(t.owner<0||allied(s,t.owner,i))options.push(['pass']);
        }break;
      case 'attack':case 'defend':{
        const unit=cards[s.phase==='attack'?s.battle.inv:s.tiles[s.battle.at].unit.id];
        p.hand.forEach((id,j)=>{const gear=cards[id],category=gear.category||(gear.st?'weapon':'armor');
          if(price(p,gear)<=p.cash&&(gear.kind==='item'&&!unit.ban?.includes(category)||(unit.support||key(gear)==='livingshield')&&gear.kind==='creature'))options.push(['equip',j]);
        });options.push(['bare']);break;
      }
      case 'result':return [['continue']];
      case 'discard':return p.hand.map((_,j)=>['discard',j]);
      case 'sell':return [...s.tiles.flatMap((v,n)=>v.owner===i?[['sell',n]]:[]),...(p.symbols||[]).flatMap((n,k)=>n?[['liquidate',k,Math.min(n,Math.ceil(-p.cash/s.prices[k]))]]:[])];
    }
    return options;
  }
  function resolve(s){
    const b=s.battle,t=s.tiles[b.at],near=board(s).links[b.at].filter(n=>n!==b.from);
    const lines=[],active=n=>s.tiles.some(t=>fx.name(t.unit)===n);
    const make=(u,seat,item,defending)=>{
      const c=cards[u.id],gear=cards[item];
      return {u:{...u},c,n:key(c),seat,gear,g:key(gear),item,defending,land:0,hp:u.hp,st:fx.strength(u),element:c.element};
    };
    const A=make(s.tiles[b.from]?.unit||{id:b.inv,hp:b.invHP??cards[b.inv].hp},b.attackerSeat??s.turn,b.atkItem,false);
    const D=make(t.unit,t.owner,b.defItem,true),sides=[A,D];
    const muted=t.unit.enchant==='vortex'||sides.some(a=>a.n==='seabonze');
    const useGear=(a,src)=>{a.gear=src?.gear;a.g=src?.g;a.item=src?.item;};
    if(!muted){
      for(const [a,d] of [[A,D],[D,A]])if(a.n==='leprechaun'&&a.gear){useGear(d,a);useGear(a);}
      for(const [a,d] of [[A,D],[D,A]])if((a.g==='thehand'||a.n==='thief'&&!a.gear)&&d.gear&&d.n!=='sage'&&!['dragonhelm','terrair','vestment'].includes(d.g)){useGear(a,d);useGear(d);}
      for(const [a,d] of [[A,D],[D,A]])if((a.n==='gremlin'||a.g==='gremlinamulet')&&d.n!=='sage'&&!['dragonhelm','terrair','vestment'].includes(d.g))useGear(d);
    }
    for(const a of sides){
      const d=a===A?D:A,owner=s.players[a.seat],other=s.players[d.seat];
      if(muted){useGear(a);a.n=null;}
      if(a.n==='sonascetic'&&a.gear?.kind==='creature')a.n=a.g;
      const count=(e)=>s.tiles.filter(v=>v.owner===a.seat&&v.type===e).length;
      if(a.n==='bloodypudding'&&a.gear?.kind==='creature'){const gain=Math.max(0,Math.min(80,fx.max(a.u)+a.gear.hp)-fx.max(a.u));a.u.mhp=fx.max(a.u)+gain;a.u.hp+=gain;}
      if(!s.predict&&a.g==='belloflaw'&&other.hand.length){const costs=other.hand.map(id=>cards[id].cost);other.hand.splice(costs.indexOf(Math.max(...costs)),1);}
      if(a.n==='vision')a.hp=30;
      if(a.n==='gigantherium'&&combo.enchanted(t.unit))a.hp-=20;
      if(a.n==='dragon'&&!a.defending){a.hp-=20;a.st+=20;}
      if(a.n==='larvae'&&owner.hand.length-other.hand.length>=3){a.st+=20;a.hp+=20;}
      if(a.n==='mudman'||a.n==='coati'){
        const boost=5*s.tiles.filter(v=>cards[v.unit?.id]?.element===2).length;
        if(a.n==='mudman')a.hp+=boost;else a.st+=boost;
      }
      if(a.n==='wereboar'&&!a.defending)a.st+=30;
      if(a.n==='pyrodrake'&&!a.gear){a.st+=20;a.hp+=20;}
      if(a.n==='mastermonk'&&!a.gear){a.st+=30;a.hp-=30;}
      if(a.n==='lilith')a.st=owner.hand.length*10;
      if(a.n==='drool')a.st=count(1)*10;
      if(a.n==='undine')a.hp=count(1)*20;
      if(a.n==='mujina')a.st=a.hp=other.hand.length*10;
      if(a.n==='lung')a.st=a.hp=owner.symbols.reduce((sum,n,j)=>sum+(j%4===1?n:0),0);
      if(a.n==='gouda')a.st=a.hp=s.tiles.filter(v=>cards[v.unit?.id]?.element===3).length*10;
      if(a.n==='spectre')a.st=a.hp=s.predict?40:10*(1+Math.floor(Math.random()*7));
      if(a.n==='nightfiend')a.st+=t.level*20;
      if(a.n==='peri'&&other.book.length-owner.book.length>=3){a.st+=20;a.hp+=20;}
      if(a.g==='changingsalve')[a.st,a.hp]=[a.hp,a.st];
      if(a.g==='neutralamulet')a.element=-1;
      a.land=a.defending&&a.u.enchant!=='antielement'?(a.n==='hornedchameleon'&&typeof t.type==='number'?10*t.level:landBonus({element:a.element},t)):0;
      a.hp+=a.land+(a.gear?.hp||0)+(muted?0:a.c.battleHP||0);
      a.st+=10*near.filter(n=>allied(s,s.tiles[n].owner,a.seat)).length+(a.gear?.st||0);
      if(!muted){
        if(a.n==='manes'&&combo.enchanted(t.unit))a.hp+=20;
        if(a.g==='terrair')a.st+=count(3)*20;
        if(a.g==='mujinamask')a.hp+=other.hand.length*10;
        if(a.u.enchant==='regeneration')a.hp+=20;
        if(a.u.enchant==='vitality'){a.hp+=20;a.st+=20;}
        if(a.u.enchant==='disease'){a.hp-=20;a.st-=20;}
        if(a.u.enchant==='greed')a.hp-=10;
        if(a.element===-1&&active('borgess'))a.hp+=20;
        if(a===A&&active('tetramorph'))a.hp-=20;
        if(active('virus'))a.hp-=10;
        if(a.element===2&&active('sphinx'))a.hp-=10;
        if(a.gear?.category==='scroll')a.st=a.gear.st;
        if(['reflect','nullify'].includes(a.gear?.effect))a.st=0;
      }
      if(a.g==='powerbracelet')a.st*=2;
      if(a.g==='petrifystone'){a.st=0;a.hp=80+a.land;}
      a.st=Math.max(0,a.st);
    }
    const health=()=>sides.map(a=>Math.max(0,a.hp));
    b.guard=D.u.id;b.guardHP=D.u.hp;b.attackST=A.st;b.defendST=D.st;b.landHP=D.land;b.startHP=health();b.strikes=[];
    function hit(a,d){
      const scroll=a.gear?.category==='scroll',orb=a.gear?.effect==='orb';
      const penetrates=['drool','nightmare'].includes(a.n)||a.n==='trenchworm'&&d.element===3||a.n==='lavaworm'&&d.element===1||a.g==='rubyring'&&d.element===0||a.gear?.effect==='pierceEarth'&&d.element===2;
      if(!scroll&&penetrates&&!orb&&d.n==='bunyip'){lines.push('관통 공격 무효');return 'block';}
      if((scroll||penetrates)&&d.land){d.hp-=d.land;d.land=0;lines.push('지형 보너스 관통');}
      let damage=a.st;
      if(scroll&&['deathgaze','pegasus'].includes(d.n))return 'block';
      if(a.g==='death'){if(!s.predict&&Math.random()<.6)d.hp=0;return 'hit';}
      if(scroll&&(a.gear.effect==='freeze'&&d.element===0||a.gear.critical===d.element||a.n==='ninja')||
        a.g==='wateramulet'&&a.element===1||a.g==='fireamulet'&&a.element===0||a.g==='dragonhelm'&&[0,3].includes(d.element)||
        a.g==='flametongue'&&d.element===1||a.g==='rockbiter'&&d.element===2||a.g==='airslasher'&&d.element===3||
        a.n==='darkelf'&&d.element===3||a.n==='gladiator'&&d.element>=0||a.n==='knight'&&fx.max(d.u)>=50||a.n==='firegiant'&&d.element===1||a.n==='stormgiant'&&d.element===0||a.n==='migoal'&&[1,2].includes(d.element)||a.n==='grendel'&&fx.strength(d.u)<=20)damage=Math.floor(damage*1.5);
      if(scroll&&d.n==='carbuncle'){a.hp-=damage;lines.push('스크롤 반사 '+damage);return 'reflect';}
      if(!scroll&&!muted){
        if(a.n==='hellhound'&&d.element===1)damage=Math.floor(damage/2);
        if(!orb&&(d.gear?.effect==='reflect'||d.n==='decoy')){a.hp-=damage;lines.push('반사 '+damage);return 'reflect';}
        if(!orb&&d.gear?.effect==='nullify'||d.g==='buckler'&&fx.strength(a.u)<=30||d.g==='watershield'&&(d.element===1||a.element===1)||
           d.g==='earthshield'&&(d.element===2||a.element===2)||d.g==='windshield'&&(d.element===3||a.element===3)||d.g==='dragonhelm'&&[1,2].includes(a.element)||!orb&&(d.c.neutralizes?.includes(a.element)||d.c.blocksLarge&&fx.max(a.u)>=40||
           d.n==='caitsith'&&fx.strength(a.u)>=40||d.n==='undine'&&a.element===1||d.n==='migoal'&&[0,3].includes(a.element))){lines.push('공격 무효');return 'block';}
        if(d.g==='towershield')damage=Math.floor(damage/2);
        if(!orb&&d.c.half)damage=Math.floor(damage/2);
        if(d.g==='spikeshield'){const reflected=Math.floor(damage/2);a.hp-=reflected;damage-=reflected;}
      }
      d.hp-=damage;lines.push(a.c.name+' → '+damage+' 피해');
      if(a.u.confused&&!muted)a.hp-=Math.floor(damage*.3);
      if(damage>0&&!muted){
        if(a.n==='berserker'){combo.clear(a.u);a.u.confused=true;}
        if(a.n==='samurai'&&fx.max(d.u)<=30&&!s.predict&&Math.random()<.6)d.hp=0;
        if(a.n==='cleric'&&d.element===-1&&!s.predict&&Math.random()<.8)d.hp=0;
        if(a.n==='willothewisp'||a.n==='amazon'&&!a.gear){
          const amount=Math.min(s.players[d.seat].cash,a.n==='amazon'?(s.players[a.seat].lap+1)*20:Math.min(a.hp,a.u.hp)*2);
          s.players[d.seat].cash-=amount;s.players[a.seat].cash+=amount;
        }
        if(a.c.poison||a.c.confuse||a.n==='nike'||a.g==='clawoftheghoul'){
          combo.clear(d.u);if(a.c.poison)d.u.poisoned=true;else if(a.c.confuse)d.u.confused=true;else d.u.enchant='paralysis';
        }
        if(a.n==='succubus'||a.g==='ringofthesuccubus'){d.u.st=0;d.st=0;}
        if(a.g==='ringofthevampire')a.hp+=damage;
        if(a.n==='bandit'||a.g==='banditsglove'){const n=Math.min(s.players[d.seat].cash,damage*2);s.players[d.seat].cash-=n;s.players[a.seat].cash+=n;}
        if(a.g==='rathunter'&&d.hp>0){const id=cards.findIndex(c=>key(c)==='giantrat');d.u={id,hp:cards[id].hp};d.c=cards[id];d.n=key(d.c);d.hp=d.u.hp;d.st=d.c.st;}
        if(a.n==='wraith'&&!s.predict&&Math.random()<.5)d.hp=0;
      }
    }
    const priority=(a,d)=>muted?0:a.g==='hourglass'||d.g!=='hourglass'&&(a.c.first||['sling','swordofthefalcon','ringofthesuccubus','ringofthevampire'].includes(a.g)||a.defending&&active('silveridol'))?1:a.c.last||a.g==='diamondarmor'?-1:0;
    const order=priority(D,A)>priority(A,D)?[D,A]:[A,D];
    for(const a of order){
      const d=a===A?D:A;
      for(let j=0;j<(['cerberus','pushpull'].includes(a.n)?2:1)&&a.hp>0&&d.hp>0;j++){
        const start=lines.length;
        if(!muted&&a.u.enchant==='paralysis'){lines.push('마비 · 공격 불가');break;}
        const effect=hit(a,d)||'hit';b.strikes.push({effect,side:a===A?0:1,hp:health(),notes:lines.slice(start)});
      }
    }
    for(const a of sides){
      const d=a===A?D:A;
      if(!muted&&a.hp>0&&a.u.poisoned){const loss=Math.floor(fx.max(a.u)/2);a.hp=Math.min(a.hp,a.u.hp)-loss;lines.push('독 · '+loss+' 피해');}
      if(!muted&&a.hp>0&&(a.c.regenerate||a.n==='hydra'&&t.type!==0||a.u.enchant==='regeneration'||a.g==='fireamulet')){a.heal=true;a.hp=fx.max(a.u);lines.push('재생 · HP 회복');}
      if(a.hp>0&&(a.n==='lunatichare'||a.g==='lunastone')&&d.hp>0){const st=Math.max(0,d.st);d.u.st=Math.max(0,Math.min(d.hp,fx.max(d.u)));d.hp=st;}
      if(a.hp>0&&a.hp<=20&&(a.n==='mandrake'||a.g==='gemoflife'))a.hp=d.hp=0;
      if(a.n==='golem'&&a.hp>0){a.u.st=Math.max(0,fx.strength(a.u)-10);a.hp=Math.min(a.hp,a.u.hp)-10;}
      if(a.g==='boomerang'&&s.players[a.seat].hand.length<6)s.players[a.seat].hand.push(a.item);
      if(a.n==='zombie'&&a.hp>0)a.hp-=20;
      if(['behemoth','baal','remora'].includes(a.n)){const hand=s.players[a.n==='remora'?d.seat:a.seat].hand;if(hand.length)hand.splice(s.predict?0:Math.floor(Math.random()*hand.length),1);}
      if(a.g==='death'&&!s.predict&&Math.random()<.4)a.hp=0;
      if(a.g==='dynamite'||a.n==='wraith'||!muted&&a.u.enchant==='senility')a.hp=0;
      if(!combo.levelLocked(t)&&(a.hp>0||d.hp>0)&&(a.n==='leshy'||a.g==='silverplow'))t.level=Math.min(5,t.level+(a.n==='leshy')+(a.g==='silverplow'));
      if(a.item!=null&&(a.n==='centaur'||['neutralamulet','belloflaw'].includes(a.g)))s.players[a.seat].book.unshift(a.item);
    }
    for(const a of sides)if(a.hp<=0&&a.n==='sulfurousballoon'){const d=a===A?D:A;d.hp=Math.min(d.hp,d.u.hp)-30;}
    for(const a of sides)if(a.hp<=0){
      s.lastDestroyed=a.u.id;const p=s.players[a.seat];
      if(a.n==='cornfolk')p.cash+=200;
      if(a.n==='mummy')p.cash+=50*(p.lap+1);
      if(a.g==='goldengoose')p.cash+=10*fx.max(a.u);
      if(a.n==='phoenix'||a.g==='phoenixamulet')p.hand.push(a.u.id);
      const victor=a===A?D:A;
      if(victor.hp>0&&victor.n==='deathgaze'&&!s.predict&&Math.random()<.8){const enemy=s.players[a.seat];enemy.book=enemy.book.filter(id=>id!==a.u.id);}
      if(a.g==='necroscarab'||a.n==='mermecoleo'){const id=cards.findIndex(c=>key(c)===(a.g==='necroscarab'?'zombie':'dragonfly'));a.u={id,hp:cards[id].hp};a.hp=a.u.hp;}
    }
    const won=D.hp<=0&&A.hp>0,both=D.hp<=0&&A.hp<=0;
    b.finalHP=health();b.lines=[...lines,both?'양측 소멸':won?'침략 성공 · 영지 점령':'방어 성공'];b.won=won;b.noToll=b.from!=null||both||allied(s,A.seat,D.seat);
    for(const a of sides)a.u.hp=Math.min(a.heal?fx.max(a.u):a.u.hp,a.hp);
    if(both)vacate(t);
    else if(won){t.owner=A.seat;t.unit=A.u;}
    else{t.unit=D.u;if(A.hp>0){if(b.from==null)s.players[s.turn].hand.push(A.u.id);else s.tiles[b.from].unit=A.u;}}
    if(b.from!=null&&(won||A.hp<=0)&&fx.name(s.tiles[b.from].unit)!=='powdereater')vacate(s.tiles[b.from]);
    s.phase='result';note(s,b.lines.at(-1));
  }
  function play(s,a){
    if(!Array.isArray(a)||!choices(s).some(b=>a.length===b.length&&b.every((v,i)=>v===a[i])))return false;
    const [k,x,y]=a,i=actor(s),p=s.players[i],t=s.tiles[p.pos];
    const cardIndex=['cast','summon','invade'].includes(k)?x:k==='exchange'?y:null;
    if(cardIndex!=null&&!s.cardPaid&&cards[p.hand[cardIndex]].catalog?.additionalCost?.includes('+[]')){
      s.pendingCard={phase:s.phase,action:a.slice(),index:cardIndex};s.phase='sacrifice';return true;
    }
    if(k==='sacrifice'){
      const pending=s.pendingCard;p.hand.splice(x,1);
      if(x<pending.index)pending.action[pending.action[0]==='exchange'?2:1]--;
      delete s.pendingCard;s.phase=pending.phase;s.cardPaid=true;
      const ok=play(s,pending.action);delete s.cardPaid;return ok;
    }
    const trackChains=['summon','element','transfer','sell','equip','bare','roll','route','direction','leaveTemple','buySymbol','sellSymbol','cast','targetLand','targetPlayer','comboArea','abilityLand','abilityPlayer','totem','teleTo'].includes(k);
    const previousChains=trackChains?chainCounts(s):null;
    if(k==='roll')delete s.chainNotice;
    const before=(s.mapId==='market'||board(s).special?.includes('Temple'))?landValues(s):null;
    function mapEffect(type,label,tile=p.pos,extra={}){
      s.mapEffect={sequence:(s.mapEffect?.sequence||0)+1,type,label,tile,source:p.pos,...extra};
    }
    switch(k){
      case 'ability':s.abilityFrom=x;s.phase='territoryTarget';break;
      case 'abilityLand':case 'abilityPlayer':fx.territoryEffect(s,s.abilityFrom,x);delete s.abilityFrom;mapEffect('cast','영지 능력',k==='abilityLand'?x:s.players[x].pos);afterTerritory(s);break;
      case 'eraseDraw':s.players[s.spellTarget].book.splice(-1-x,1);for(const q of s.players)if(q.peek?.seat===s.spellTarget)q.peek.ids.splice(x,1);s.phase='roll';break;
      case 'teleTo':{
        const src=s.tiles[s.teleFrom],dst=s.tiles[x];
        if(dst.unit){s.battle={at:x,from:s.teleFrom,inv:src.unit.id,invHP:src.unit.hp,atkItem:null,defItem:null,attackerSeat:src.owner,teleport:true};s.phase='attack';}
        else{dst.owner=src.owner;dst.unit={...src.unit};combo.clear(dst.unit);if(fx.name(src.unit)!=='powdereater')vacate(src);s.phase='roll';}
        delete s.teleFrom;break;
      }
      case 'fortuneDraw':{
        const indices=p.book.flatMap((id,j)=>cards[id].kind===x?[j]:[]);
        const j=indices[Math.floor(Math.random()*indices.length)],id=p.book.splice(j,1)[0];p.hand.push(id);
        note(s,'점술관 · '+cards[id].name);s.phase='land';break;
      }
      case 'route':advance(s,x);break;
      case 'buySymbol':case 'sellSymbol':{
        const count=k==='buySymbol'?y:-y;p.cash-=count*s.prices[x];p.symbols[x]+=count;resumeMove(s);break;
      }
      case 'leaveTemple':resumeMove(s);break;
      case 'liquidate':p.cash+=s.prices[x]*y;p.symbols[x]-=y;debt(s);break;
      case 'cast':{
        const c=cards[paid(s,p,x)],cash=p.cash;s.phase='roll';p.lastCast={name:key(c),round:s.round};
        delete p.invisible;
        if(combo.type[c.effect]){s.spellEffect=c.effect;s.phase=combo.type[c.effect]==='global'?fx.apply(s,c.effect):'spellTarget';mapEffect('cast',c.name);note(s,p.name+' · '+c.name);break;}
        if(c.effect==='cash')p.cash+=100;
        else if(c.effect==='manna')p.cash+=50*(p.lap+1);
        else if(c.effect==='fly')s.fly=true;
        else if(c.effect==='six'||c.effect==='one')p.word=c.effect==='one'?1:6;
        else{s.spellEffect=c.effect;s.phase='spellTarget';}
        if(s.phase==='roll'){
          const word=c.effect==='one'||c.effect==='six';
          const label=word?'이동 '+p.word:c.effect==='fly'?'주사위 ×2':'+'+(p.cash-cash)+' G';
          mapEffect(word?'word':c.effect==='fly'?'fly':'gain',label,p.pos,{title:c.name});
        }else mapEffect('cast',c.name);
        note(s,p.name+' · '+c.name);break;
      }
      case 'plagueArea':{
        for(const tile of s.tiles)if(tile.area===x&&tile.unit){combo.clear(tile.unit);tile.unit.poisoned=true;}
        mapEffect('cast',(x+1)+'지역 · 독');s.phase='roll';break;
      }
      case 'comboArea':case 'targetLand':{
        if(combo.type[s.spellEffect]){s.phase=fx.apply(s,s.spellEffect,x);mapEffect('cast',s.spellEffect,k==='comboArea'?p.pos:x);break;}
        const unit=s.tiles[x].unit,prior=unit.hp;if(s.spellEffect==='heal')unit.hp=fx.max(unit);
        else if(unit.enchant!=='phantasm'&&(unit.hp-=20)<=0)fx.destroy(s,s.tiles[x]);s.phase='roll';
        const change=(s.tiles[x].unit?.hp||0)-prior;
        mapEffect(s.spellEffect,(change>=0?'+':'−')+Math.abs(change)+' HP',x,{title:cards[unit.id].name});
        break;
      }
      case 'targetPlayer':if(s.players[x].antiMagic){delete s.players[x].antiMagic;s.phase='roll';mapEffect('cast','안티 매직',s.players[x].pos);break;}
        if(combo.type[s.spellEffect]){s.phase=fx.apply(s,s.spellEffect,x);mapEffect('cast',s.spellEffect,s.players[x].pos);break;}if(s.spellEffect==='shatter'){s.spellTarget=x;s.phase='shatter';}
        else{s.players[x].word=s.spellEffect==='word1'?1:6;mapEffect('word','이동 '+s.players[x].word,s.players[x].pos,{title:s.players[x].name});s.phase='roll';}break;
      case 'suppressCard':{
        const id=s.players[s.spellTarget].hand[x];
        for(const q of s.players){q.hand=q.hand.filter(v=>v!==id);q.book=q.book.filter(v=>v!==id);}
        mapEffect('shatter',cards[id].name,s.players[s.spellTarget].pos);s.phase='roll';break;
      }
      case 'breakCard':mapEffect('shatter','카드 파괴',s.players[s.spellTarget].pos,{title:s.players[s.spellTarget].name});s.players[s.spellTarget].hand.splice(x,1);s.phase='roll';break;
      case 'fizzle':delete s.reliefFrom;mapEffect('cast','대상 없음');s.phase='roll';break;
      case 'roll':{const die=()=>1+Math.floor(Math.random()*board(s).die);const fixed=p.word??(s.fixed||null),roll=()=>p.status==='haste'?6+Math.floor(Math.random()*3):p.status==='slow'?1+Math.floor(Math.random()*3):die(),faces=fixed!=null?[fixed]:s.fly?[roll(),roll()]:[roll()];s.die=faces.reduce((a,b)=>a+b,0);mapEffect('roll',String(s.die),p.pos,{faces,sides:board(s).die});if(p.word!=null){delete p.word;if(p.status==='die')delete p.status;}s.fly=false;}note(s,p.name+' · 주사위 '+s.die);if(!s.die){s.remaining=0;arrived(s);break;}if(p.reverse){const next=onward(s)[0];p.previous=next;p.dir=-(p.dir||1);delete p.reverse;}if(p.dir){if(p.previous==null&&!board(s).stage)p.previous=(p.pos-p.dir+s.tiles.length)%s.tiles.length;move(s,p.dir);}else if(board(s).stage&&board(s).links[p.pos].length!==2)move(s,1);else s.phase='direction';break;
      case 'direction':move(s,x);break;
      case 'totem':p.cash+=300;fx.destroy(s,s.tiles[x]);afterTerritory(s);break;
      case 'summon':case 'exchange':{
        const tile=k==='summon'?t:s.tiles[x],id=paid(s,p,k==='summon'?x:y);
        if(k==='exchange')p.hand.push(tile.unit.id);
        mapEffect('summon',cards[id].name,k==='summon'?p.pos:x);
        tile.owner=i;tile.unit={id,hp:cards[id].hp};note(s,p.name+' · '+cards[id].name+' 배치');afterTerritory(s);break;
      }
      case 'level':mapEffect('gain','Lv.'+y,x);p.cash-=levelCost(s.tiles[x],y);s.tiles[x].level=y;note(s,p.name+' · '+(x+1)+'번 영지 Lv.'+y);afterTerritory(s);break;
      case 'transfer':{
        const from=s.tiles[x],dest=s.tiles[y];
        if(dest.owner<0){dest.owner=i;dest.unit={...from.unit};combo.clear(dest.unit);if(fx.name(from.unit)!=='powdereater')vacate(from);afterTerritory(s);}
        else{mapEffect('invade','영지 공격',y,{source:x});s.battle={at:y,inv:from.unit.id,invHP:from.unit.hp,from:x,atkItem:null,defItem:null};s.phase='attack';}
        break;
      }
      case 'element':mapEffect('cast',elements[y]+' 속성',x);p.cash-=300;s.tiles[x].type=y;afterTerritory(s);break;
      case 'pay':payToll(s);break;
      case 'invade':mapEffect('invade','영지 침략',p.pos);s.battle={at:p.pos,inv:paid(s,p,x),atkItem:null,defItem:null};s.phase='attack';break;
      case 'bare':case 'equip':{
        const id=k==='equip'?paid(s,p,x):null;
        if(s.phase==='attack'){s.battle.atkItem=id;s.phase='defend';}else{s.battle.defItem=id;resolve(s);}break;
      }
      case 'continue':{const tele=s.battle.teleport,moved=s.battle.from!=null,free=s.battle.won||s.battle.noToll;delete s.battle;if(tele)s.phase='roll';else if(moved)afterTerritory(s);else if(free)finish(s);else payToll(s);break;}
      case 'pass':finish(s);break;
      case 'sell':p.cash+=value(s,s.tiles[x]);vacate(s.tiles[x],true);debt(s);break;
      case 'discard':p.hand.splice(x,1);if(p.hand.length<=6)s.phase='spell';break;
    }
    const cue=s.phase==='over'?'victory':({pay:'coin',sell:'coin',buySymbol:'coin',sellSymbol:'coin',liquidate:'coin',equip:'card',discard:'card',fortuneDraw:'card'})[k];
    if(cue)s.actionSound={sequence:(s.actionSound?.sequence||0)+1,cue};
    updatePrices(s,before);if(previousChains)reportChains(s,previousChains);return true;
  }
  const deckPlans=new WeakMap();
  function ai(s){
    const seat=actor(s),p=s.players[seat],skill=p.ai?(s.aiLevel||0):0;
    const visibleBook=p.template||p.hand;
    let groups=deckPlans.get(visibleBook);
    if(!groups){const names=visibleBook.map(id=>key(cards[id]));groups=combo.recipes.filter(g=>combo.matches(g,names));if(p.template)deckPlans.set(p.template,groups);}
    const plan=combo.planner(s,seat,cards,fx,groups);
    const canEquip=(unit,gear)=>gear.kind==='item'&&!unit.ban?.includes(gear.category||(gear.st?'weapon':'armor'))||gear.kind==='creature'&&(unit.support||key(gear)==='livingshield');
    // Only simulate the revealed board and our contemplated equipment. The opposing item is concealed.
    function forecast(battle,gear,defending){
      const tiles=s.tiles.slice();
      for(const n of [battle.at,battle.from])if(n!=null)tiles[n]={...tiles[n],unit:{...tiles[n].unit}};
      const players=s.players.map(q=>({...q,hand:q.hand.slice(),book:q.book?.slice()||[]}));
      const acting=players[seat];
      // Hand-size effects see the hand after the selected creature and equipment leave it.
      if(s.phase==='land'&&battle.from==null){const j=acting.hand.indexOf(battle.inv);if(j>=0)acting.hand.splice(j,1);}
      if(gear!=null){const j=acting.hand.indexOf(gear);if(j>=0)acting.hand.splice(j,1);}
      const trial={...s,predict:true,tiles,players,log:[],battle:{...battle,atkItem:defending?null:gear,defItem:defending?gear:null}};
      resolve(trial);
      return trial.battle;
    }
    function development(k,x,y,c){
      const t=k==='summon'?s.tiles[p.pos]:s.tiles[x];
      const next={...t,owner:seat},price=k==='summon'?c.cost:k==='element'?300:levelCost(t,y);
      if(k==='level')next.level=y;
      if(k==='element')next.type=y;
      const trial={...s,tiles:s.tiles.map(v=>v===t?next:v)};
      const gain=total(trial,seat)-total(s,seat)-price;
      const reserve=Math.max(0,90-(p.cash-price));
      const guard=k==='summon'?c:cards[t.unit.id];
      const protection=(landBonus(guard,next)+guard.hp+(guard.first?12:0))/100;
      return gain+(toll(trial,next)-(t.owner===seat?toll(s,t):0))*(.32+protection*.28)
        +(k==='summon'?40:0)-reserve*.55;
    }
    // Value a visible straight route; the next fork gets its own decision.
    function landing(next,prev,steps,traveler=seat){
      const m=board(s),walker=s.players[traveler];
      let bonus=0;
      for(let left=steps;left>0;left--){
        const tile=s.tiles[next];
        if(tile.type==='성'&&total(s,traveler)>=s.target)return 10000;
        if(m.forts.includes(next)&&!walker.flags.some(f=>m.types[f]===tile.type))bonus+=25;
        const jump=m.transit?.[next];
        if(jump!=null&&(tile.type==='다리'||tile.type==='전송진'&&left===1)){prev=next;next=jump;}
        if(left===1||tile.unit?.enchant==='quicksand'||!allied(s,tile.owner,traveler)&&((fx.name(tile.unit)==='oldwillow'&&tile.type===0)||(fx.name(tile.unit)==='kelpie'&&tile.type===1)))break;
        const links=m.links[next],exits=links.filter(n=>links.length===1||n!==prev);
        if(exits.length!==1)return bonus;
        prev=next;next=exits[0];
      }
      const t=s.tiles[next];
      if(t.owner>=0&&!allied(s,t.owner,traveler))return bonus-toll(s,t);
      if(allied(s,t.owner,traveler)||m.castles?.includes(next)||m.forts.includes(next))return bonus+20;
      return bonus+(territoryType(t.type)&&traveler===seat&&p.hand.some(id=>cards[id].kind==='creature'&&price(p,cards[id])<=p.cash)?65:0);
    }
    function alliedWordTarget(j,steps){
      if(!allied(s,seat,j)||s.players[j].antiMagic)return -100;
      const q=s.players[j],links=board(s).links[q.pos];
      const exits=links.filter(n=>links.length===1||n!==q.previous);
      return Math.max(-100,...exits.map(n=>landing(n,q.pos,steps,j)))/12;
    }
    function score([k,x,y]){
      const c=cards[p.hand[x]];
      const n=key(c);
      if(k==='invade'&&allied(s,seat,s.tiles[p.pos].owner)||k==='transfer'&&allied(s,seat,s.tiles[y].owner))return -10000;
      const targetWord={word6:6,holyword3:3,holywordx:10}[k==='cast'?c?.effect:s.spellEffect];
      if(s.teams&&targetWord&&(k==='cast'||k==='targetPlayer')){
        if(k==='targetPlayer')return alliedWordTarget(x,targetWord);
        return Math.max(...s.players.map((_,j)=>alliedWordTarget(j,targetWord)))-c.cost/35;
      }
      if(k==='cast'&&combo.type[n])return plan.cast(n)+plan.sequence(n)-c.cost/35;
      if(['targetLand','comboArea','targetPlayer'].includes(k)&&combo.type[s.spellEffect])return plan.scoreTarget(s.spellEffect,x);
      if(k==='totem')return 130+(s.tiles[x].unit.enchant==='soulhunt'?50:0);
      if(k==='ability'){
        const unit=fx.name(s.tiles[x].unit);
        if(unit==='spittingcobra')return p.hand.some(id=>key(cards[id])==='exile')?65:20;
        if(['conjurer','windimp','heatimp'].includes(unit)&&p.hand.some(id=>key(cards[id])==='raisedead'))return 80;
        return 45;
      }
      if(k==='abilityLand'){const t=s.tiles[x];return t.unit?(allied(s,t.owner,seat)?-10:10)+(t.unit.hp<=20?5:0):5+t.level;}
      if(k==='abilityPlayer')return allied(s,x,seat)?-100:s.players[x].cash/20;
      if(k==='teleTo')return s.tiles[x].owner>=0?10:1;
      if(k==='eraseDraw')return p.peek?.seat===s.spellTarget?(cards[p.peek.ids[x]]?.cost||0):0;
      if(k==='sacrifice'||k==='discard'&&groups.length){
        const reserved=plan.ready(n)?25:groups.some(g=>g.some(part=>part.includes(n)))?8:0;
        return -reserved+(p.hand.filter(id=>id===p.hand[x]).length-1)*3-c.cost/40;
      }
      if((skill>=2||groups.length)&&(k==='equip'||k==='bare')){
        const defending=s.phase==='defend',unit=cards[defending?s.tiles[s.battle.at].unit.id:s.battle.inv];
        const out=forecast(s.battle,k==='equip'?p.hand[x]:null,defending),side=defending?1:0;
        const territory=defending?out.finalHP[1]>0:out.won;
        const remaining=Math.min(out.finalHP[side],unit.hp);
        return (territory?220:0)+(out.finalHP[side]>0?35:0)+remaining*.35-Math.min(80,out.finalHP[1-side])*.2
          -(k==='equip'?6+price(p,c)*.16:0)+(k==='equip'&&plan.pair(key(unit),n)?15:0);
      }
      if(k==='summon'&&plan.ready(n))return (skill?development(k,x,y,c):70)+22;
      if(skill){
        if(['summon','level','element'].includes(k))return development(k,x,y,c);
        if(k==='discard')return (p.hand.filter(id=>id===p.hand[x]).length-1)*5+
          (c.kind==='item'?2:0)-(c.effect==='manna'?20:0)-(c.kind==='creature'&&p.hand.filter(id=>cards[id].kind==='creature').length<=2?12:0);
        if(skill>=2&&k==='direction'){
          const links=board(s).links[p.pos];
          return landing(x===1?links[0]:links.at(-1),p.pos,s.die);
        }
        if(skill>=2&&k==='cast'&&['word1','word6','six'].includes(c.effect)){
          const paths=onward(s),steps=c.effect==='word1'?1:6;
          const fixed=Math.max(...paths.map(n=>landing(n,p.pos,steps)));
          return fixed<0?-5:fixed/18+(steps>1?3:-1);
        }
        if(k==='cast'&&c.effect==='manna')return 20+p.lap;
        if(k==='cast'&&c.effect==='bolt'&&!s.tiles.some(t=>t.unit&&!allied(s,t.owner,seat)))return -10;
        if(skill>=2&&k==='invade'){
          const battle={at:p.pos,inv:p.hand[x]};
          const gear=[null,...p.hand.filter((id,j)=>j!==x&&(!c.catalog?.additionalCost?.includes('+[]')||p.hand.length>=3)&&price(p,cards[id])+price(p,c)<=p.cash&&canEquip(c,cards[id]))];
          return Math.max(...gear.map(id=>{const out=forecast(battle,id,false);
            return (out.won?value(s,s.tiles[p.pos])+100:out.noToll?toll(s,s.tiles[p.pos]):-60)-c.cost*.5-(cards[id]?.cost||0)*.5;}));
        }
        if(skill===3&&k==='transfer'&&s.tiles[y].owner>=0){
          const src=s.tiles[x],out=forecast({at:y,from:x,inv:src.unit.id,invHP:src.unit.hp},null,false);
          return out.won?value(s,s.tiles[y])*1.4-value(s,src)+25:-100;
        }
      }
      switch(k){
        case 'route':{
          const p=s.players[s.turn],m=board(s),missing=m.forts.filter(n=>!p.flags.some(f=>m.types[f]===m.types[n]));
          const goals=total(s,s.turn)<s.target&&missing.length?missing:(m.castles||[0]);
          let queue=[[x,p.pos,0]],seen=new Set();
          for(let k=0;k<queue.length;k++){
            const [at,prev,d]=queue[k],key=at+'/'+prev;if(seen.has(key))continue;seen.add(key);
            if(goals.includes(at))return 9-d+(skill>=2?landing(x,p.pos,s.remaining)/12:0);
            const dest=m.transit?.[at];
            if(dest!=null&&m.types[at]==='전송진'&&prev!==dest)queue.push([dest,at,d+1]);
            const pos=dest!=null&&m.types[at]==='다리'?dest:at;
            const exits=m.links[pos];
            exits.filter(n=>exits.length===1||n!==prev).forEach(n=>queue.push([n,pos,d+1]));
          }return -10000;
        }
        case 'buySymbol':return p.cash>300&&y<=5&&p.symbols[x]<10?2:-2;
        case 'sellSymbol':return p.cash<90?2+y/100:-2;
        case 'leaveTemple':return 1;
        case 'targetLand':return s.spellEffect==='bolt'?(allied(s,s.tiles[x].owner,s.turn)?-8:8)+(s.tiles[x].unit.hp<=20?2:0):(allied(s,s.tiles[x].owner,s.turn)?5:0)+1-s.tiles[x].unit.hp/cards[s.tiles[x].unit.id].hp;
        case 'targetPlayer':return (s.spellEffect==='word6')===allied(s,x,s.turn)?4:0;
        case 'cast':if(['manna','fly','word6','bolt','shatter'].includes(c.effect))return 4;
          return c.effect==='cash'?10:c.effect==='six'?3:-2;
        case 'summon':return 70+c.hp/10+(c.element===s.tiles[p.pos].type?4:0);
        case 'invade':{const g=s.tiles[p.pos],hp=g.unit.hp+landBonus(cards[g.unit.id],g);
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
  const byKey=new Map(cards.flatMap((c,id)=>c.catalog&&!c.catalogOnly?[[key(c),id]]:[]));
  function practiceBook(index){
    const groups=combo.recipes[index];if(!groups)return null;
    const selected=groups.map(group=>group.find(n=>byKey.has(n))).map(n=>byKey.get(n));
    if(selected.includes(undefined))return null;
    const book=[...new Set(selected)].flatMap(id=>Array(4).fill(id));
    for(const id of presets.fire)if(book.length<50&&book.filter(v=>v===id).length<4)book.push(id);
    return book;
  }
  return {combo,storyAlliances,practiceBook,start,choices,play,ai,actor,allied,personalTotal,total,toll,value,levelCost,chain,chainRate,sameChain,cards,elements,maps,board,presets,validBook,forts:maps.classic.forts};
})();
if(typeof module!=='undefined')module.exports=Cepter;
