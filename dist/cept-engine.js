/* A single-area introductory match. All state is serializable between decisions. */
function createCepter(edition="ps2"){
  const originalMaps=typeof module==='undefined'?CepterMaps:require('./cept-maps.js');
  const record=typeof module==='undefined'?CepterMatchRecord:require('./cept-match-record.js');
  const editions=edition==="ps2"?null:typeof module==="undefined"?CepterEditions:require("./cept-editions");
  const maps=editions?editions.boards(edition,originalMaps):originalMaps;
  const original=typeof module==='undefined'?CepterCards:require('./cept-cards.js');
  const board=s=>maps[(s.mapId?.startsWith('ps2-')&&!s.layoutRevision?'legacy-':'')+(s.mapId||'classic')];
  const firstEdition=edition==='saturn'||edition==='ps1',revolt=edition==='revolt';
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
  const shopLists=edition!=='ps2'?{}:typeof module==='undefined'?CepterShops:require('./cept-shops.js');
  const shopIds=new Map(cards.map((card,id)=>[key(card),id]));
  function shopStock(s,at=s.players[s.turn].pos){
    if(!s.layoutRevision||s.tiles[at]?.type!=='카드 상점')return [];
    return (shopLists[s.mapId]?.[at]||[]).map(name=>shopIds.get(name));
  }
  const enabled=new Set('boggart gnome oldwillow kelpie cornfolk dryad sage manes seabonze goldentotem caitsith decoy bandit executor cerberus grendel phoenix mummy zombie mandrake lunatichare nike succubus leprechaun gremlin leshy gouda drool undine mujina spectre centaur migoal nightmare nightfiend powdereater goblin statue silveridol brassidol borgess lung virus sulfurousballoon wraith sonascetic livingshield mermecoleo bloodypudding behemoth remora deathgaze tetramorph sphinx peri conjurer baal heatimp windimp witch spittingcobra goobaqueen gooba graniteidol marbleidol cleric carbuncle berserker thief hellhound roadrunner wereboar griffon knight lilith pyrodrake dragonzombie firegiant stormgiant hornedchameleon ninja mastermonk willothewisp amazon golem pegasus wyvern wonderwall steamgear trenchworm lavaworm vision samurai troll mudman pushpull tyrannosaurus hydra shellcreeper larvae darkelf coati cyclops grimalkin gladiator gigantherium dragon bunyip wendigo sorcerer valkyria domovikha paladin sprite chimera manticore'.split(' '));
  const gearNames=new Set('clawoftheghoul spikeshield buckler stormcauser goldengoose dynamite wateramulet watershield fireamulet ringofthevampire banditsglove gremlinamulet terrair changingsalve silverplow ringofthesuccubus phoenixamulet dragonhelm mujinamask hourglass gemoflife lunastone necroscarab neutralamulet rathunter belloflaw death windcutter petrifystone thehand vestment boomerang swordofthefalcon diamondarmor rockbiter flametongue earthshield sling powerbracelet rubyring towershield airslasher masamune nuclearfusion nunchaku windshield'.split(' '));
  for(const c of cards){
    const n=key(c);
    const ps2Combat=edition==='ps2'&&c.catalogOnly&&['creature','item'].includes(c.kind);
    if(!ps2Combat&&!combo.type[n]&&!enabled.has(n)&&!gearNames.has(n))continue;
    c.catalogOnly=false;
    if(combo.type[n])c.effect=n;
    if(c.kind==='item'){c.st=Number(c.catalog.ability.match(/\bST([+-]\d+)/)?.[1]||0);c.hp=Number(c.catalog.ability.match(/\bHP([+-]\d+)/)?.[1]||0);}
    c.ban=c.catalog.equipment.split(',').filter(Boolean).map(v=>v.toLowerCase());
    c.stationary=c.catalog.ability.includes('Defensive');c.support=c.catalog.ability.includes('Support');
    c.first=c.catalog.ability.includes('Attacks First');c.last=c.catalog.ability.includes('Attacks Last');
    if(ps2Combat&&c.kind==='item'&&c.category==='scroll')c.st=Number(c.catalog.ability.match(/Scroll Attack: ST=(\d+)/)?.[1]||0);
    if(n==='prismaticwand'){c.st=0;c.hp=0;}
    if(edition==='ps2'&&['quetzalcoatl','silveridol'].includes(n))c.first=false;
    if(edition==='ps2'&&['bundlegear','carbunfly','gooba'].includes(n))c.generatedOnly=true;
    if(n==='sprite')c.blocksLarge=true;
    if(n==='troll'||n==='paladin')c.regenerate=true;
    if(n==='nuclearfusion')c.st=50;
    const neutralizes={wonderwall:[0,1,2,3],vision:[3],shellcreeper:[0,3]};
    if(neutralizes[n])c.neutralizes=neutralizes[n];
    if(n==='windcutter'){c.st=30;c.critical=2;}
    if(n==='sphinx')c.confuse=true;
  }
  const deployable=(s,id)=>!s.tiles.some(v=>fx.name(v.unit)==='marbleidol')||!s.tiles.some(v=>v.unit?.id===id);
  function canOccupy(c,t){
    const terrain=claimTerrain(t,c),color='RBGY'[terrain]||(terrain==='무속성'?'N':'');
    const banned=c.catalog?.placement?.split(',').filter(Boolean)||[];
    const words=c.catalog?.ability.match(/Land Limit: ((?:no(?:fire|water|earth|air|neutral)\s*)+)/)?.[1]||'';
    const land=['fire','water','earth','air'][terrain]||(color==='N'?'neutral':null);
    return c.landBan!==terrain&&!banned.includes(color)&&!(land&&words.includes('no'+land));
  }
  const allowed=(s,i,c,t)=>canOccupy(c,t)&&(fx.idol(s,'goldidol')||
    [...'RBGY'].every((v,e)=>s.tiles.filter(t=>t.owner===i&&t.type===e).length>=(c.catalog?.additionalCost||'').split(',').filter(k=>k===v).length));
  const sacrificeRequired=(s,c)=>c.catalog?.additionalCost?.includes('+[]')&&!(c.kind==='creature'&&fx.idol(s,'goldidol'));
  const canEquip=(unit,gear)=>gear.kind==='item'?!unit.ban?.includes(gear.category||(gear.st?'weapon':'armor')):
    gear.kind==='creature'&&(unit.support||['livingshield','livingspear','livingsword'].includes(key(gear)));
  const presets={intro:starter,fire:fireBook};
  if(editions)editions.configure(edition,cards,presets);
  const modern=!!presets.stronghold;
  const extraSpells=edition==='ps2'||modern?(typeof module==='undefined'?CepterExtraSpells:require('./cept-extra-spells.js')):null;
  const extraTypes=edition==='ps2'?extraSpells.type:extraSpells?.modernType;
  if(edition==='ps2')for(const c of cards)if(extraTypes[key(c)]){c.effect=key(c);c.catalogOnly=false;}
  const circlePools=revolt?[
    'escape gift greed growthbody spiritwalk vitality barrier purify haste windofhope massphantasm manna lifestream restore revival reincarnation',
    'elementalwrath quintessence shatter stoneblast turntothewall disease drainmagic bindingmist pacifism blackout holybanishment holyword3 magicbolt liquidform rayoflaw'
  ].map(group=>group.split(' ').map(name=>cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&key(c)===name))):[];
  function offerCircle(s){
    s.circlePools??=[[],[]];
    s.circleOffers=circlePools.map((available,i)=>{
      const pool=s.circlePools[i];
      if(!pool.length)pool.push(...available);
      return pool.splice(Math.floor(Math.random()*pool.length),1)[0];
    });
    s.phase='spellCircle';
  }
  function validBook(book){
    return Array.isArray(book)&&book.length===50&&book.every(id=>Number.isInteger(id)&&!!cards[id]&&!cards[id].catalogOnly&&!cards[id].generatedOnly&&book.filter(n=>n===id).length<=4);
  }
  function shuffledBook(template=starter){
    const book=template.slice();
    for(let i=book.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[book[i],book[j]]=[book[j],book[i]];}
    return book;
  }
  function draw(p,s){
    if(!p.book.length)p.book=refillBook(p);
    if(!p.book.length)return;
    p.hand.push(p.book.pop());
    if(s)for(const watcher of s.players)if(s.players[watcher.peek?.seat]===p)watcher.peek.ids.shift();
  }
  function refillBook(p){
    return shuffledBook((p.recycleTemplate||p.template)?.filter(id=>!p.bannedCards?.includes(id)));
  }
  function setOpeningBook(s,seat,template){
    const p=s.players[seat];
    if(!p||p.ai||s.round!==1||s.turn!==0||s.phase!=='spell'||!validBook(template))return false;
    p.template=template.slice();p.book=shuffledBook(template);p.hand=[];
    for(let j=0;j<(seat===0?5:4);j++)draw(p);
    return true;
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
  const teamLayouts={teams:[0,1,0,1],'teams-12':[0,0,1,1],'teams-14':[0,1,1,0]};
  function start(count,humans,target=4000,mapId=editions?edition+'-1':'classic',template=presets.intro,aiBook=template,aiLevel=0,alliance='auto',roundLimit=0){
    const storyNames=storyAlliances[mapId];
    const storyCast=!!storyNames&&['story','story-leo'].includes(aiBook)&&count===4&&(alliance==='teams'||alliance==='auto'&&target===0);
    if(aiBook==='story-leo'&&mapId!=='ps2-14')throw Error('레오 동맹은 콴제에서 선택할 수 있습니다.');
    const mapGoal=target===0;
    if(mapGoal)target=maps[mapId]?.storyGoal??5000;
    if(![2,3,4].includes(count)||!Number.isInteger(humans)||humans<0||humans>count||!(mapGoal&&target===maps[mapId]?.storyGoal||[3000,4000,5000,6000,7000,8000,9000,10000,12000].includes(target))||!Object.hasOwn(maps,mapId)||!validBook(template)||(!storyCast&&!validBook(aiBook))||![0,1,2,3].includes(aiLevel))throw Error('대국 설정 오류');
    if(!['auto','duel',...Object.keys(teamLayouts)].includes(alliance)||Object.hasOwn(teamLayouts,alliance)&&count!==4)throw Error('동맹전은 4인 대국입니다.');
    if(![0,20,30,40,60].includes(roundLimit))throw Error('지원하지 않는 라운드 제한입니다.');
    const layout=teamLayouts[alliance]||(count===4&&alliance==='auto'&&mapGoal&&storyNames?teamLayouts.teams:null);
    const teams=layout?.slice()||null;
    const players=Array.from({length:count},(_,i)=>{
      const npc=storyCast&&i>=humans?(aiBook==='story-leo'&&i===2?'Leo · Revenge':storyNames[i]):null;
      const seatBook=npc?storyBook(npc):i>=humans&&!storyCast?aiBook:template;
      const p={ai:i>=humans,name:npc||((i>=humans?'AI ':'셉터 ')+(i+1)),cash:maps[mapId].startCash??200,pos:0,dir:0,lap:0,flags:[],hand:[],book:shuffledBook(seatBook),template:seatBook.slice(),symbols:Array((maps[mapId].areaCount||2)*4).fill(0),previous:null};
      for(let j=0;j<4;j++)draw(p);return p;
    });
    const s={edition,version:1,layoutRevision:1,storyCast,alliance,teams,mapId,mapGoal,aiLevel,roundLimit,prices:Array((maps[mapId].areaCount||2)*4).fill(maps[mapId].gemStore?50:10),players,target,turn:0,round:1,phase:'spell',tiles:maps[mapId].types.map((type,i)=>({type,area:maps[mapId].areas[i],base:maps[mapId].baseValues?.[i]??maps[mapId].base,owner:-1,level:1,unit:null})),log:[],die:0,visited:[],winner:-1};
    if(revolt)players[0].cash+=roundGain(s);
    draw(players[0]);return s;
  }
  function note(s,t){s.log.unshift(t);if(s.log.length>16)s.log.pop();s.logSequence=(s.logSequence||0)+1;}
  function actor(s){
    if(s.phase==='sell')return s.debtor??s.turn;
    if(s.phase==='defend')return s.tiles[s.battle.at].owner;
    if(s.phase==='attack')return s.battle.attackerSeat??s.turn;
    if(s.phase==='result'&&isComputer(s,s.turn)){
      for(const seat of [s.battle.attackerSeat,s.battle.defenderSeat])if(seat!=null&&!isComputer(s,seat))return seat;
    }
    return s.turn;
  }
  const levelCost=(t,level)=>(t.base||80)*2**(level-1)-worth(t);
  const elementCost=t=>edition==='saga'?t.level*100+(typeof t.type==='number'?200:0):300;
  const worth=t=>(t.base||80)*2**(t.level-1);
  const {territoryType}=combo;
  function claimTerrain(tile,card){
    if(edition!=='saga'||tile.type!=='모프')return tile.type;
    return card.elements?'복합':card.element<0?'무속성':card.element;
  }
  function claim(tile,seat,unit){
    Object.assign(tile,{type:claimTerrain(tile,cards[unit.id]),owner:seat,unit});
  }
  const landBonus=(unit,t)=>combo.matchesTerrain(unit,t.type)?10*t.level:0;
  const allied=combo.allied;
  // One verdict for every screen and record. A shared top total at the round limit has no winner.
  // Saves written before this rule kept the first tied seat in `winner`, so `leaders` decides.
  function outcome(s){
    const over=s.phase==='over',tie=over&&s.leaders?.length>1;
    return {over,tie,leaders:tie?s.leaders.slice():[],
      winners:over&&!tie?s.players.flatMap((_,i)=>allied(s,i,s.winner)?[i]:[]):[]};
  }
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
  const toll=(s,t)=>s.players[t.owner]?.status==='blackout'?0:Math.floor(value(s,t)*[0,.2,.3,.4,.6,.8][t.level]*
    ({boggart:2,gnome:1.5,steamgear:.5}[key(cards[t.unit?.id])]||1)*({sleep:0,peace:0,barricade:1.3,greed:1.5,fog:.5}[t.unit?.enchant]??1)*({sagaTollUp:1.3,sagaTollDown:.7}[s.players[t.owner]?.status]??1));
  const owedToll=(s,t,seat=s.turn)=>s.players[seat].status==='goodluck'||s.players[seat].sagaClemency?0:toll(s,t);
  const debtSaleValue=(s,t)=>revolt?Math.floor(value(s,t)*.8):value(s,t);
  const revoltLapBase=(map,laps)=>Math.floor(map.bonus*(1+laps/10));
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
    if(edition!=='ps2'&&edition!=='saga'){
      landValues(s).forEach((v,k)=>{s.prices[k]=Math.max(1,s.prices[k]+Math.trunc((v-before[k])/100));});
      return;
    }
    s.priceRemainder||=Array(s.prices.length).fill(0);
    landValues(s).forEach((v,k)=>{
      const change=v-before[k]+s.priceRemainder[k],whole=Math.trunc(change/100);
      s.prices[k]=Math.max(1,s.prices[k]+whole);s.priceRemainder[k]=change-whole*100;
    });
  }
  const opposingGem=[1,0,3,2],alliedGem=[2,3,0,1];
  const cappedGemPrices=(prices,deltas)=>prices.map((price,e)=>Math.min(300,Math.max(40,price+deltas[e])));
  const gemUnitPrice=(s,kind,element)=>kind==='stealGem'?Math.floor(s.prices[element]*1.5):s.prices[element];
  function gemQuote(s,[kind,element,count,opponent]){
    const buyer=s.players[s.turn],marketPrice=s.prices[element];
    const delta=kind==='sellGem'?-count:count;
    const cost=gemUnitPrice(s,kind,element)*delta,received=opponent==null?0:marketPrice*count;
    const deltas=[0,0,0,0];
    if(opponent==null&&count>=2){deltas[element]=5*delta;deltas[opposingGem[element]]=-3*delta;}
    return {cost,received,holdings:buyer.symbols[element]+delta,prices:cappedGemPrices(s.prices,deltas)};
  }
  function updateGemTerrain(s,before){
    const deltas=[0,0,0,0];
    for(const [at,tile] of s.tiles.entries()){
      const [type,level]=before[at];
      if(type!==tile.type){
        if(Number.isInteger(type))deltas[type]-=10;
        if(Number.isInteger(tile.type))deltas[tile.type]+=10;
      }else if(Number.isInteger(type)&&tile.level!==level){
        const rise=(tile.level-level)*(tile.level>level?level:1)*10;
        deltas[type]+=rise;deltas[alliedGem[type]]+=rise/2;deltas[opposingGem[type]]-=rise/2;
      }
    }
    if(deltas.some(Boolean))s.prices=cappedGemPrices(s.prices,deltas);
  }
  function stealableGems(buyer,seller){
    return seller.symbols.flatMap((count,e)=>count>0&&buyer.symbols[e]<20?Array(count).fill(e):[]);
  }
  const fx=combo.rules(cards,{board,draw,value,vacate,note,claim});
  function spellHP(s,t,e){
    const u=t.unit;
    if(e==='bolt')return u.hp-fx.damageAmount(s,t,20);
    if(fx.immuneHP(t))return u.hp;
    return edition==='saturn'?Math.min(fx.max(u),u.hp+Math.floor(fx.max(u)/2)):fx.max(u);
  }
  const extra=extraSpells?.rules(cards,{fx,combo,board,draw,refillBook,vacate,territoryType,advance,arrived,total,personalTotal,value,canOccupy,deployable,claim});
  const shrineModule=edition==='saga'?(typeof module==='undefined'?CepterSagaShrines:require('./cept-saga-shrines')):null;
  const shrine=shrineModule?.rules(cards,{fx,combo,board,draw,note});
  const roundGain=s=>Math.min(50,19+s.round);
  function finish(s){
    if(settleDebts(s,'endTurn'))return;
    if(revolt&&s.players[s.turn].hand.length>6){s.discardReturn='endTurn';s.phase='discard';return;}
    if(s.shrineClemencyUsed){delete s.players[s.turn].sagaClemency;delete s.shrineClemencyUsed;}
    delete s.spellArrival;
    if(s.roundLimit&&s.round>=s.roundLimit&&s.turn===s.players.length-1){
      s.phase='over';s.endReason='roundLimit';return;
    }
    nextTurn(s);
  }
  function nextTurn(s){
    s.turn=(s.turn+1)%s.players.length;
    if(s.turn===0){s.round++;for(const t of s.tiles)if(t.unit?.expires<=s.round)combo.clear(t.unit);for(const q of s.players)if(q.statusUntil<=s.round&&q.status!=='waste')delete q.status;if(s.shineUntil<=s.round){s.prices=s.prices.map(v=>Math.max(1,Math.round(v/1.5)));delete s.shineUntil;}}
    if(s.turn===0&&board(s).pathSwitches&&s.round>=(s.switchRound??5))flipPaths(s,'자동 전환');
    const p=s.players[s.turn];
    if(revolt)p.cash+=roundGain(s);
    extraSpells?.startTurn(s,cards);
    for(let j=0;j<(s.tiles.some(t=>fx.name(t.unit)==='brassidol')?2:1);j++){draw(p,s);if(p.status==='despair')p.hand.pop();}
    s.phase=!revolt&&p.hand.length>6?'discard':'spell';s.fixed=0;s.die=0;delete s.rollSum;s.visited=[];
  }
  function price(p,c,s){
    const status=c.kind==='spell'?1:({waste:2,lifeforce:.5,sagaDeduction:.3,sagaInflation:1.3}[p.status]??1);
    const rarity=s&&fx.idol(s,'ivoryidol')?({S:1.5,R:2,E:2}[c.catalog?.rarity]||1):1;
    return Math.floor(c.cost*rarity*status);
  }
  const isComputer=(s,seat)=>s.players[seat].ai||s.players[seat].status==='haunt';
  function paid(s,p,j){
    const id=p.hand.splice(j,1)[0];p.cash-=price(p,cards[id],s);return id;
  }
  function pathSwitch(s,at,entry,flip=false){
    const paths=board(s).pathSwitches?.[at];
    if(!paths)return null;
    const start=Math.max(0,paths.indexOf(entry));
    const step=Boolean(s.switchSide)!==flip?2:1;
    return {to:paths[(start+step)%paths.length],rounds:Math.max(0,(s.switchRound??5)-s.round)};
  }
  function flipPaths(s,reason){
    s.switchSide=!s.switchSide;
    s.switchRound=s.round+4;
    s.shrineNotice='분기 스위치 · '+reason;
    note(s,s.shrineNotice);
  }
  function movementExits(s,at,entry){
    const forced=pathSwitch(s,at,entry);
    if(forced)return [forced.to];
    const links=board(s).links[at];
    return links.length===1?links:links.filter(n=>n!==entry);
  }
  function onward(s){
    const p=s.players[s.turn];
    return movementExits(s,p.pos,p.previous);
  }
  function readyCreatures(s,heal=0){
    for(const t of s.tiles){
      if(t.owner!==s.turn||!t.unit)continue;
      delete t.unit.fatigued;
      if(heal&&!(revolt&&fx.name(t.unit)==='statue'))t.unit.hp=Math.min(fx.max(t.unit),t.unit.hp+heal);
    }
  }
  function passGate(s,m,at){
    const p=s.players[s.turn],id=m.gates[at];
    if(p.flags.includes(id))return;
    p.flags.push(id);
    if(m.checkpoints.every(gate=>p.flags.includes(gate))){
      p.lap++;p.flags=[];
      const teamSize=s.teams?s.teams.filter(team=>team===s.teams[s.turn]).length:1;
      const lands=s.tiles.filter(t=>allied(s,t.owner,s.turn)).length;
      const bonus=Math.floor(revoltLapBase(m,p.lap-1)+lands*s.players.length*10/teamSize);
      p.cash+=bonus;
      readyCreatures(s,10);
      note(s,p.name+' · '+p.lap+'주 완주 · +'+bonus+'G');
    }else{
      const bonus=m.fortBonus??m.bonus;
      p.cash+=bonus;
      note(s,p.name+' · '+m.gateNames[id]+' +'+bonus+'G');
    }
  }
  function arrived(s,fromTransit=false){
    const p=s.players[s.turn],tile=s.tiles[p.pos];s.phase='land';
    if(revolt&&board(s).gates[p.pos]!=null)readyCreatures(s);
    if(pathSwitch(s,p.pos,p.previous)){
      s.switchRound=s.round+4;
      s.phase='pathSwitch';
      return;
    }
    if(tile.type==='마법진'){offerCircle(s);return;}
    if(tile.type==='보석 상점'){s.phase='gemStore';return;}
    if(shopStock(s).length){s.phase='shop';return;}
    if(tile.unit?.enchant==='mine'){p.cash-=Math.floor(p.cash/2);combo.clear(tile.unit);}
    if(tile.enchant==='magicfountain'||tile.unit?.enchant==='magicfountain'){p.cash+=400;delete tile.enchant;if(tile.unit)combo.clear(tile.unit);note(s,'매직 파운틴 · +400G');}
    if(edition==='saga'&&tile.type==='분수'&&!fromTransit){
      const prior=p.hand.length,count=Math.min(prior,p.book.length);
      p.hand=[];
      for(let i=0;i<count;i++)draw(p,s);
      s.shrineNotice='분수 · 손패 '+prior+'장 교체 · '+count+'장 뽑음';
      note(s,s.shrineNotice);
      return;
    }
    if(tile.type==='점술관'&&p.status!=='babble'&&p.book.length){s.phase='fortune';return;}
    if(tile.type!=='성소')return;
    if(shrine){shrine.arrive(s,board(s).shrineKinds[p.pos]||'elemental');return;}
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
  function transitDestination(map,at,type,remaining){
    const dest=map.transit?.[at];
    if(dest!=null&&(type==='다리'||type==='강제 전송진'||!remaining&&(type==='전송진'||map.graph)))return dest;
  }
  function magicTrapDelta(roll,cash,stored){
    if(roll<=3)return stored;
    return roll>=6?-Math.floor(Math.max(0,cash)/5):0;
  }
  function passMagicTrap(s,t){
    const p=s.players[s.turn],stored=t.trapMagic??0;
    const change=magicTrapDelta(s.rollSum??s.die,p.cash,stored);
    if(!change)return;
    p.cash+=change;
    t.trapMagic=stored-change;
    s.lastMove.trapDelta=(s.lastMove.trapDelta??0)+change;
    const amount=(change>0?'+':'−')+Math.abs(change)+'G';
    s.shrineNotice='마력 트랩 '+amount+' · 이 칸 적립 '+t.trapMagic+'G';
    note(s,p.name+' · '+s.shrineNotice);
  }
  function advance(s,next,preview=false){
    const p=s.players[s.turn],m=board(s);
    const path=[p.pos];
    s.lastMove={sequence:(s.lastMove?.sequence||0)+1,seat:s.turn,path};
    let fromTransit=false;
    while(s.remaining){
      fromTransit=false;path.push(next);
      p.previous=p.pos;p.pos=next;s.remaining--;
      const t=s.tiles[next];if(t.unit?.enchant==='quicksand'){s.remaining=0;combo.clear(t.unit);}
      if(!allied(s,t.owner,s.turn)&&((fx.name(t.unit)==='kelpie'&&t.type===1)||(fx.name(t.unit)==='oldwillow'&&t.type===0)))s.remaining=0;
      if(t.type==='성'){delete p.dream;if(['fairylight','torture'].includes(p.status))extraSpells?.clearCepter(p);if(p.status==='waste')delete p.status;}
      if(t.owner===s.turn)s.visited.push(next);
      if(revolt){
        if(m.gates[next]!=null)passGate(s,m,next);
        if(t.type==='마력 트랩')passMagicTrap(s,t);
      }else{
        const checkpoint=(m.checkpoints||m.forts).find(n=>m.types[n]===t.type);
        if(checkpoint!==undefined&&!p.flags.includes(checkpoint)){
          p.flags.push(checkpoint);const money=Math.floor((m.fortBonus||50)*(p.sagaService?1.5:1));delete p.sagaService;p.cash+=money;note(s,p.name+' · '+t.type+' +'+money+'G');
        }
        if(t.type==='성'&&p.flags.length===(m.checkpoints||m.forts).length){
          const cashBeforeLap=p.cash;p.lap++;p.flags=[];
          const lapIncrement=edition==='saga'?m.bonus/10:20;
          p.cash+=m.bonus+Math.floor(lapIncrement*(p.lap-1))+20*s.tiles.filter(v=>v.owner===s.turn).length;
          const bonus=(p.symbols||[]).reduce((sum,n,k)=>sum+(n&&s.players.every(q=>q===p||q.symbols[k]<n)?n*s.prices[k]:0),0);
          p.cash+=Math.floor(bonus/10);if(p.sagaFeast){p.cash+=Math.floor((p.cash-cashBeforeLap)/2);delete p.sagaFeast;}if(p.status==='triumph'){p.cash+=Math.floor((p.cash-cashBeforeLap)/2);extraSpells.clearCepter(p);}
          for(const v of s.tiles){
            if(v.owner!==s.turn||['statue','colossus'].includes(fx.name(v.unit)))continue;
            const max=fx.max(v.unit);v.unit.hp=Math.min(max,v.unit.hp+Math.floor(max/5));
            if(fx.name(v.unit)==='chimera'){
              const st=fx.strength(v.unit);v.unit.st=Math.max(st,Math.min(80,st+10));
            }
          }
          note(s,p.name+' · '+p.lap+'주 완주');
        }
        if(t.type==='성'&&p.status==='triumph')extraSpells.clearCepter(p);
      }
      if((revolt?m.gates[next]!=null:t.type==='성')&&total(s,s.turn)>=s.target){s.winner=s.turn;s.phase='over';
        if(m.reward&&!preview){
          s.reward=m.reward.counts.flatMap((count,k)=>{
            const pool=cards.flatMap((card,id)=>card.catalog?.rarity===['N','S','R'][k]&&m.reward.categories.includes(card.catalog.category)?[id]:[]);
            return Array.from({length:count},()=>pool[Math.floor(Math.random()*pool.length)]);
          });
        }
        return;}
      const dest=transitDestination(m,next,t.type,s.remaining);
      if(dest!=null){
        fromTransit=true;p.pos=dest;p.previous=next;path.push(dest);
        note(s,t.type+' · '+(next+1)+'번 → '+(dest+1)+'번');
      }
      if(t.type==='보석 상점'){s.phase='gemStore';return;}
      if(t.type==='신전'&&p.status!=='babble'){s.phase='temple';return;}
      if(s.remaining){const exits=onward(s);if(exits.length!==1){s.phase='fork';return;}next=exits[0];}
    }
    if(preview){
      s.phase=pathSwitch(s,p.pos,p.previous)?'pathSwitch':s.tiles[p.pos].type==='마법진'?'spellCircle':shopStock(s).length?'shop':'land';
      if(fromTransit)s.lastMove.arrivedViaTransit=true;
    }else arrived(s,fromTransit);
  }
  function routePreview(s,action){
    const [kind,x]=action,p=s.players[s.turn];
    const trial={...s,remaining:kind==='route'?s.remaining:s.die,visited:[...s.visited],lastMove:null,log:[],
      tiles:s.tiles.map(t=>({...t,unit:t.unit&&{...t.unit}})),
      players:s.players.map(q=>({...q,flags:[...q.flags]}))};
    if(kind==='route')advance(trial,x,true);else move(trial,x,true);
    const walker=trial.players[trial.turn],tile=trial.tiles[walker.pos];
    return {first:trial.lastMove?.path[1]??p.pos,at:walker.pos,phase:trial.phase,remaining:trial.remaining,
      toll:tile.owner>=0&&!allied(trial,tile.owner,trial.turn)?owedToll(trial,tile):0,switchTo:pathSwitch(trial,walker.pos,walker.previous)?.to,
      cashGain:walker.cash-p.cash,trapDelta:trial.lastMove?.trapDelta??0,tower:tile.type==='사령탑'&&trial.phase==='land',fountain:tile.type==='분수'&&trial.phase==='land'&&!trial.lastMove?.arrivedViaTransit};
  }
  function resumeMove(s,preview=false){
    if(!s.remaining){arrived(s);return;}
    const exits=onward(s);if(exits.length===1)advance(s,exits[0],preview);else s.phase='fork';
  }
  function move(s,dir,preview=false){
    const p=s.players[s.turn];p.dir=dir;s.remaining=s.die;s.visited=[];
    if(pathSwitch(s,p.pos,p.previous))resumeMove(s,preview);
    else if(p.previous==null&&(board(s).stage||board(s).graph)&&board(s).links[p.pos].length>2)s.phase='fork';
    else if(p.previous==null)advance(s,dir===1?board(s).links[p.pos][0]:board(s).links[p.pos].at(-1),preview);
    else resumeMove(s,preview);
  }
  function settleDebts(s,resume){
    for(let offset=0;offset<s.players.length;offset++){
      const seat=(s.turn+offset)%s.players.length,p=s.players[seat];
      if(p.cash>=0)continue;
      if(p.symbols.some(Boolean)||s.tiles.some(t=>t.owner===seat)){
        s.debtor=seat;s.debtResume=resume;s.phase='sell';return true;
      }
      const map=board(s);
      p.cash=revolt?Math.floor(revoltLapBase(map,p.lap)*1.5):edition==='saga'?Math.floor(map.bonus*1.5):(map.startCash??200);
      p.pos=map.castles?.[0]??0;p.flags=[];p.dir=0;p.previous=null;
      note(s,p.name+' · 마력 고갈, '+(revolt?'게이트':'성')+'에서 '+p.cash+'G로 재출발');
    }
    return false;
  }
  function debt(s){
    const resume=s.debtResume||'endTurn';
    delete s.debtor;delete s.debtResume;
    if(settleDebts(s,resume))return;
    if(resume==='endTurn')finish(s);else s.phase=resume;
  }
  function payToll(s){
    const p=s.players[s.turn],t=s.tiles[p.pos],n=owedToll(s,t);
    p.cash-=n;s.players[t.owner].cash+=n;for(const q of s.players)if(q.dream&&q!==s.players[t.owner])q.cash+=Math.floor(n/2);note(s,p.name+' · 통행료 '+n+'G');debt(s);
  }
  function afterTerritory(s){const t=s.tiles[s.players[s.turn].pos];if(t.owner>=0&&!allied(s,t.owner,s.turn))payToll(s);else finish(s);}
  function fatigue(unit){
    if(revolt&&unit&&!cards[unit.id].vigorous)unit.fatigued=true;
  }
  function territory(s){
    const p=s.players[s.turn];
    if(revolt)return s.tiles.flatMap((t,n)=>t.owner===s.turn&&t.unit&&!t.unit.fatigued?[n]:[]);
    const type=s.tiles[p.pos].type;
    if(p.status==='enlightenment'||type==='성'||edition==='saga'&&type==='신전'||board(s).forts.includes(p.pos))return s.tiles.flatMap((v,n)=>v.owner===s.turn?[n]:[]);
    return [...new Set([...s.visited,p.pos])].filter(n=>s.tiles[n].owner===s.turn);
  }
  function usableCreature(s,seat,id,tile,kind){
    const p=s.players[seat],c=cards[id];
    return c.kind==='creature'&&p.status!=='silence'&&deployable(s,id)&&allowed(s,seat,c,tile)&&c.landBan!==tile.type&&
      (kind!=='invade'||!c.stationary)&&price(p,c,s)<=p.cash&&(s.cardPaid||!sacrificeRequired(s,c)||p.hand.length>=2);
  }
  function towerCards(s,at){
    const tile=s.tiles[at],p=s.players[s.turn];
    if(!territoryType(tile.type)||allied(s,tile.owner,s.turn))return [];
    const kind=tile.owner<0?'summon':'invade';
    if(kind==='invade'&&(tile.unit?.enchant==='peace'||['sagaFear','pacifism'].includes(p.status)))return [];
    return p.hand.flatMap((id,j)=>usableCreature(s,s.turn,id,tile,kind)?[[kind,j]]:[]);
  }
  function towerTargets(s){
    return s.tiles.flatMap((_,at)=>towerCards(s,at).length?[['towerTo',at]]:[]);
  }
  function choices(s){
    if(s.phase==='over')return [];
    const follow=extra?.choices(s);if(follow)return follow.length?follow:[['fizzle']];
    if(s.phase==='teleMove'&&s.spellEffect==='chariot')return extra.chariotExits(s,s.teleFrom).map(n=>['teleTo',n]);
    if(s.phase==='bookWorm')return s.players[s.spellTarget].hand.map((_,j)=>['wormDiscard',j]);
    if(s.phase==='sacrifice')return s.players[s.turn].hand.flatMap((_,j)=>j===s.pendingCard.index?[]:[['sacrifice',j]]);
    if(s.phase==='mindseeker')return Array.from({length:Math.min(6,(s.players[s.spellTarget].book?.length??s.players[s.spellTarget].bookCount??0))},(_,j)=>['eraseDraw',j]);
    if(s.phase==='territoryTarget')return fx.territoryTargets(s,s.abilityFrom);
    if(s.phase==='teleMove')return board(s).links[s.teleFrom].filter(n=>territoryType(s.tiles[n].type)&&!allied(s,s.tiles[n].owner,s.tiles[s.teleFrom].owner)&&s.tiles[n].unit?.enchant!=='peace').map(n=>['teleTo',n]);
    const i=actor(s),p=s.players[i],t=s.tiles[p.pos],options=[];
    const hand=(kind,k)=>p.hand.forEach((id,j)=>{
      const c=cards[id],usable=kind==='creature'?usableCreature(s,i,id,t,k):
        c.kind===kind&&(s.cardPaid||!sacrificeRequired(s,c)||p.hand.length>=2)&&price(p,c,s)<=p.cash;
      if(usable)options.push([k,j]);
    });
    switch(s.phase){
      case 'shrineChoice':return s.shrineChoices.map(event=>['shrineChoice',event]);
      case 'spell':if(p.status!=='lifeforce'&&p.status!=='bind')hand('spell','cast');options.push(['roll']);break;
      case 'spellTarget':{
        const effect=s.spellEffect;
        if(effect==='stealgem'){
          const targets=s.players.flatMap((q,j)=>!allied(s,i,j)&&q.status!=='barrier'&&
            (!board(s).gemStore||stealableGems(p,q).length)?[['targetPlayer',j]]:[]);
          return targets.length?targets:[['fizzle']];
        }
        if(extraTypes?.[effect]||combo.type[effect]){const targets=(extraTypes?.[effect]?extra:fx).targets(s,effect).filter(([k,j])=>k!=='targetPlayer'||effect==='dispelmagic'||s.players[j].status!=='barrier');return targets.length?targets:[['fizzle']];}
        if(effect==='shatter'&&s.tiles.some(t=>fx.name(t.unit)==='graniteidol'))return [['fizzle']];
        if(effect==='plague')return [...new Set(s.tiles.map(t=>t.area))].map(area=>['plagueArea',area]);
        if(effect==='heal'||effect==='bolt'){
          for(const [n,v] of s.tiles.entries()){
            if(effect==='bolt'&&!firstEdition&&allied(s,i,v.owner))continue;
            if(fx.targetable(s,v))options.push(['targetLand',n]);
          }
        }else s.players.forEach((q,j)=>{
          if(q.status!=='barrier'&&(effect!=='shatter'||!allied(s,i,j)&&q.hand.some(id=>cards[id].kind!=='creature')))options.push(['targetPlayer',j]);
        });
        if(!options.length)options.push(['fizzle']);break;
      }
      case 'suppression':return s.players[s.spellTarget].hand.flatMap((id,j)=>cards[id].kind==='spell'?[['suppressCard',j]]:[]);
      case 'squeeze':return s.players[s.spellTarget].hand.map((_,j)=>['breakCard',j]);
      case 'shatter':return s.players[s.spellTarget].hand.flatMap((id,j)=>cards[id].kind==='creature'?[]:[['breakCard',j]]);
      case 'roll':options.push(['roll']);break;
      case 'direction':return [['direction',1],['direction',-1]];
      case 'fork':return onward(s).map(n=>['route',n]);
      case 'shop':return [...shopStock(s).filter(id=>cards[id].cost<=p.cash).map(id=>['buyCard',id]),['leaveShop']];
      case 'fortune':return [...new Set(p.book.map(id=>cards[id].kind))].map(kind=>['fortuneDraw',kind]);
      case 'gemStore':
        s.prices.forEach((price,e)=>{
          const room=20-p.symbols[e];
          for(let n=1;n<=Math.min(10,room,Math.floor(p.cash/price));n++)options.push(['buyGem',e,n]);
          for(let n=1;n<=Math.min(10,p.symbols[e]);n++)options.push(['sellGem',e,n]);
          s.players.forEach((q,j)=>{
            if(allied(s,i,j))return;
            const limit=Math.min(10,room,q.symbols[e],Math.floor(p.cash/gemUnitPrice(s,'stealGem',e)));
            for(let n=1;n<=limit;n++)options.push(['stealGem',e,n,j]);
          });
        });
        options.push(['leaveGem']);break;
      case 'temple':
        s.prices.forEach((price,k)=>{
          for(let n=1;n<=Math.min(50,Math.floor(p.cash/price));n++)options.push(['buySymbol',k,n]);
          for(let n=1;n<=Math.min(50,p.symbols[k]);n++)options.push(['sellSymbol',k,n]);
        });options.push(['leaveTemple']);break;
      case 'spellCircle':return [...s.circleOffers.map(id=>['circleCast',id]),['circleSkip']];
      case 'pathSwitch':return [['switchKeep'],['switchFlip']];
      case 'towerTarget':return [...towerTargets(s),['towerCancel']];
      case 'towerDeploy':return [...towerCards(s,s.towerAt),['towerCancel']];
      case 'land':
        if(t.owner>=0&&t.owner!==i&&t.unit?.enchant!=='peace'&&!['sagaFear','pacifism'].includes(p.status))hand('creature','invade');
        if(t.owner>=0&&!allied(s,t.owner,i))options.push(['pay']);
        {
          if(t.owner<0&&territoryType(t.type))hand('creature','summon');
          if(revolt&&t.type==='사령탑'&&towerTargets(s).length)options.push(['towerAim']);
          for(const n of territory(s)){
            const v=s.tiles[n];if(fx.territoryTargets(s,n).length)options.push(['ability',n]);if(fx.name(v.unit)==='goldentotem'&&fx.canUseAbility(s,v))options.push(['totem',n]);for(let level=v.level+1;level<=5;level++){
              if(!fx.levelLocked(v)&&p.cash>=levelCost(v,level))options.push(['level',n,level]);
            }
            for(const dest of new Set([...(fx.name(v.unit)==='roadrunner'?board(s).links[n].flatMap(j=>board(s).links[j]).filter(j=>j!==n):board(s).links[n]),...s.tiles.flatMap((t,j)=>((v.unit.enchant==='spiritwalk'||fx.name(v.unit)==='blynx'||fx.name(v.unit)==='holyllama'&&t.type===3)||(fx.name(v.unit)==='dryad'&&t.type===2)||(fx.name(v.unit)==='wyvern'&&t.type===3))&&territoryType(t.type)&&t.area===v.area&&t.owner<0?[j]:[])])){
              if(v.unit.enchant!=='thornfetter'&&s.tiles[dest].unit?.enchant!=='peace'&&canOccupy(cards[v.unit.id],s.tiles[dest])&&!cards[v.unit.id].stationary&&territoryType(s.tiles[dest].type)&&s.tiles[dest].owner!==i&&(p.status!=='pacifism'||s.tiles[dest].owner<0))options.push(['transfer',n,dest]);
            }
            if(p.cash>=elementCost(v))elements.forEach((_,e)=>{if(e!==v.type)options.push(['element',n,e]);});
            p.hand.forEach((id,j)=>{if(p.status!=='silence'&&deployable(s,id)&&(s.cardPaid||!sacrificeRequired(s,cards[id])||p.hand.length>=2)&&cards[id].kind==='creature'&&allowed(s,i,cards[id],v)&&price(p,cards[id],s)<=p.cash&&cards[id].landBan!==v.type)options.push(['exchange',n,j]);});
          }
          if(t.owner<0||allied(s,t.owner,i))options.push(['pass']);
        }break;
      case 'attack':case 'defend':{
        const tile=s.tiles[s.battle.at],fighter=s.phase==='attack'?s.tiles[s.battle.from]?.unit:tile.unit;
        if(tile.unit.enchant==='dullness'||fighter?.enchant==='paralysis')return [['bare']];
        const unit=cards[s.phase==='attack'?s.battle.inv:tile.unit.id];
        p.hand.forEach((id,j)=>{const gear=cards[id];
          if((p.status!=='sagaBreak'||gear.kind!=='item')&&price(p,gear,s)<=p.cash&&canEquip(unit,gear))options.push(['equip',j]);
        });options.push(['bare']);break;
      }
      case 'result':return [['continue']];
      case 'discard':return p.hand.map((_,j)=>['discard',j]);
      case 'sell':return [...s.tiles.flatMap((v,n)=>v.owner===i?[['sell',n]]:[]),...(p.symbols||[]).flatMap((n,k)=>n?[['liquidate',k,Math.min(n,Math.ceil(-p.cash/s.prices[k]))]]:[])];
    }
    return options;
  }
  function supportST(s,at,from,seat){
    if(revolt)return 0;
    return 10*board(s).links[at].filter(n=>n!==from&&allied(s,s.tiles[n].owner,seat)).length;
  }
  function terrainHP(t,unit,card,name,muted){
    if(unit.enchant==='antielement')return 0;
    const any=!muted&&(name==='hornedchameleon'||unit.enchant==='camouflage');
    return any&&(typeof t.type==='number'||t.type==='복합')?10*t.level:landBonus(card,t);
  }
  function battleGround(s,b){
    const tile=s.tiles[b.at],guard=cards[tile.unit.id],name=key(guard);
    const muted=tile.unit.enchant==='vortex'||name==='seabonze'||key(cards[b.inv])==='seabonze';
    return {hp:terrainHP(tile,tile.unit,guard,name,muted),
      attack:supportST(s,b.at,b.from,b.attackerSeat??s.turn),defense:supportST(s,b.at,b.from,tile.owner)};
  }
  function resolve(s){
    const b=s.battle,t=s.tiles[b.at];
    const lines=[],active=n=>s.tiles.some(t=>fx.name(t.unit)===n);
    const make=(u,seat,item,defending)=>{
      const c=cards[u.id],gear=cards[item];
      return {u:{...u},c,n:c.basicBattle?null:key(c),seat,gear,g:key(gear),item,defending,land:0,hp:u.hp,st:fx.strength(u),element:c.element,elements:c.elements};
    };
    const A=make(s.tiles[b.from]?.unit||{id:b.inv,hp:b.invHP??cards[b.inv].hp},b.attackerSeat??s.turn,b.atkItem,false);
    const D=make(t.unit,t.owner,b.defItem,true),sides=[A,D];
    const extra=(typeof module==='undefined'?CepterExtraBattle:require('./cept-extra-battle')).rules(s,b,t,cards,fx,combo,total,lines);
    b.defenderSeat=t.owner;
    const muted=t.unit.enchant==='vortex'||sides.some(a=>a.n==='seabonze');
    const useGear=(a,src)=>{a.gear=src?.gear;a.g=src?.g;a.item=src?.item;};
    if(!muted){
      for(const a of sides)if(a.u.enchant==='paralysis'){
        a.n=null;a.c={...a.c,first:false,last:false,half:false,regenerate:false,neutralizes:[],blocksLarge:false,battleHP:0,
          criticalElements:[],pierceElements:[],reflectElements:[],reflectNormal:false,neutralizeNormal:false};
        useGear(a);
      }
      for(const [a,d] of [[A,D],[D,A]])if(a.n==='leprechaun'&&a.gear){useGear(d,a);useGear(a);}
      for(const [a,d] of [[A,D],[D,A]])if((a.g==='thehand'||a.n==='thief'&&!a.gear)&&d.gear&&!extra.protectedGear(d)){useGear(a,d);useGear(d);}
      for(const [a,d] of [[A,D],[D,A]]){
        extra.itemStart(a,d);
        const destroy=a.n==='gremlin'||['talisman','gremlinamulet'].includes(a.g)||a.g==='stinkbottle'&&(d.gear?.category==='tool'||d.gear?.kind==='creature');
        if(destroy&&!extra.protectedGear(d))useGear(d);
      }
      const originalIds=sides.map(a=>a.u.id);
      extra.forms(A,originalIds[1]);extra.forms(D,originalIds[0]);
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
      if(a.n==='dragon'){
        if(firstEdition){if(a.defending)a.hp+=10;else a.st+=10;}
        else if(!a.defending){a.hp-=20;a.st+=20;}
      }
      if(a.n==='larvae'&&owner.book.length-other.book.length>=3){a.st+=20;a.hp+=20;}
      if(a.n==='mudman'||a.n==='coati'){
        const boost=5*s.tiles.filter(v=>(a.n==='coati'&&firstEdition?cards[v.unit?.id]?.catalog?.race==='rb':cards[v.unit?.id]?.element===2)).length;
        if(a.n==='mudman')a.hp+=boost;else a.st+=boost;
      }
      if(a.n==='wereboar'&&!a.defending)a.st+=30;
      if(a.n==='pyrodrake'&&!a.gear){a.st+=20;a.hp+=20;}
      if(a.n==='mastermonk'&&!a.gear){a.st+=30;a.hp-=30;}
      if(a.n==='lilith')a.st=owner.hand.length*10;
      if(a.n==='drool')a.st=count(1)*10;
      if(a.n==='undine')a.hp=count(1)*20;
      if(a.n==='manticore'){
        if(firstEdition)a.st=a.hp;else a.st=a.hp=owner.hand.length*10;
      }
      if(a.n==='armadillo')a.hp=s.round%2?60:30;
      if(a.n==='mujina')a.st=a.hp=other.hand.length*10;
      if(a.n==='lung')a.st=a.hp=owner.symbols.reduce((sum,n,j)=>sum+(j%4===1?n:0),0);
      if(a.n==='gouda')a.st=a.hp=s.tiles.filter(v=>cards[v.unit?.id]?.element===3).length*10;
      if(a.n==='spectre'||revolt&&a.u.enchant==='liquidform'){
        const randomStat=()=>s.predict?40:10+Math.floor(Math.random()*61);
        a.st=randomStat();a.hp=randomStat();
      }
      if(a.n==='nightfiend')a.st+=t.level*20;
      if(a.n==='peri'&&other.book.length-owner.book.length>=3){a.st+=20;a.hp+=20;}
      if(a.g==='changingsalve')[a.st,a.hp]=[a.hp,a.st];
      if(a.g==='neutralamulet'){a.element=-1;a.elements=null;}
      if(!muted)extra.baseStats(a,d);
      a.land=a.defending?terrainHP(t,a.u,a,a.n,muted):0;
      a.hp+=a.land+(a.gear?.hp||0)+(muted?0:a.c.battleHP||0);
      a.st+=supportST(s,b.at,b.from,a.seat)+(a.gear?.st||0)+(muted?0:a.c.battleST||0);
      if(!muted){
        if(a.n==='manes'&&combo.enchanted(t.unit))a.hp+=20;
        if(a.g==='terrair')a.st+=count(3)*20;
        if(a.g==='mujinamask')a.hp+=other.hand.length*10;
        if(a.u.enchant==='regeneration')a.hp+=20;
        if(a.u.enchant==='vitality'){a.hp+=20;a.st+=20;}
        if(a.u.enchant==='disease'){a.hp-=20;a.st-=20;}
        if(!revolt&&a.u.enchant==='greed')a.hp-=10;
        if(a.element===-1&&extra.boost('borgess',a))a.hp+=20;
        if(a===A&&extra.boost('tetramorph',a))a.hp-=20;
        if(extra.boost('virus',a))a.hp-=10;
        if(a.element===2&&extra.boost('sphinx',a))a.hp-=10;
        if(a.gear?.category==='scroll')a.st=a.gear.st||0;
        if(!firstEdition&&a.n==='sorcerer'&&!a.gear)a.st=20;
        if(['reflect','nullify'].includes(a.gear?.effect))a.st=0;
      }
      if(a.g==='powerbracelet')a.st*=2;
      if(a.g==='petrifystone'){a.st=0;a.hp=80+a.land;}
      a.st=Math.max(0,a.st);
    }
    const health=()=>sides.map(a=>Math.max(0,a.hp));
    b.guard=D.u.id;b.guardHP=D.u.hp;b.attackST=A.st;b.defendST=D.st;b.landHP=D.land;b.startHP=health();b.strikes=[];b.forms=sides.map(a=>a.u.id);
    function hit(a,d){
      const scroll=a.gear?.category==='scroll'||!firstEdition&&a.n==='sorcerer'&&!a.gear,orb=a.gear?.effect==='orb';
      const weapon=a.gear?.kind==='item'?a.gear:null,guard=d.gear?.kind==='item'?d.gear:null;
      const has=combo.hasElement,matches=(elements,side)=>elements?.some(e=>has(side,e));
      const pierce=!scroll&&!muted&&(matches(a.c.pierceElements,d)||matches(weapon?.pierceElements,d));
      const elementalCritical=!scroll&&!muted&&(matches(a.c.criticalElements,d)||matches(weapon?.criticalElements,d));
      const penetrates=pierce||['drool','nightmare','trojanhorse'].includes(a.n)||a.n==='trenchworm'&&d.element===3||a.n==='lavaworm'&&d.element===1||a.g==='rubyring'&&d.element===0||a.g==='amberring'&&d.element===3||a.g==='sapphirering'&&d.element===1||a.gear?.effect==='pierceEarth'&&d.element===2;
      if(!scroll&&penetrates&&!orb&&d.n==='bunyip'){lines.push('관통 공격 무효');return 'block';}
      let damage=a.st;
      if(scroll&&['deathgaze','pegasus'].includes(d.n))return 'block';
      if(elementalCritical||extra.critical(a,d,scroll)||scroll&&(a.gear?.effect==='freeze'&&d.element===0||a.gear?.critical===d.element||['ninja','sorcerer','witch'].includes(a.n))||!scroll&&(
        a.g==='wateramulet'&&a.element===1||a.g==='fireamulet'&&a.element===0||a.g==='dragonhelm'&&[0,3].includes(d.element)||
        a.g==='flametongue'&&d.element===1||a.g==='rockbiter'&&d.element===2||a.g==='airslasher'&&d.element===3||
        a.n==='paladin'&&d.element===-1||!muted&&a.c.criticalRace&&a.c.criticalRace===d.c.catalog?.race||!firstEdition&&a.n==='darkelf'&&d.element===3||a.n==='gladiator'&&d.element>=0||!firstEdition&&a.n==='knight'&&fx.max(d.u)>=50||a.n==='firegiant'&&d.element===1||a.n==='stormgiant'&&d.element===0||a.n==='migoal'&&[1,2].includes(d.element)||a.n==='grendel'&&fx.strength(d.u)<=20))damage=Math.floor(damage*1.5);
      const ward=muted?null:extra.protect(a,d,damage,scroll,penetrates,orb);
      if(ward==='block'||ward==='heal')return ward;
      const reflected=ward==='reflect'||scroll&&d.n==='carbuncle';
      if(a.g==='sleep'||a.g==='death'){
        const target=reflected?a:d;
        if(a.g==='sleep'){combo.clear(target.u);target.u.enchant='sleep';lines.push('수면 · 통행료 없음');}
        else if(!s.predict&&Math.random()<.6)target.hp=0;
        return reflected?'reflect':'hit';
      }
      if(reflected){if(ward!=='reflect')a.hp-=damage;lines.push('스크롤 반사 '+damage);return 'reflect';}
      if(!scroll&&!muted){
        if(a.n==='hellhound'&&d.element===1)damage=Math.floor(damage/2);
        const reflects=d.c.reflectNormal||matches(d.c.reflectElements,a)||guard?.reflectNormal||matches(guard?.reflectElements,a);
        const blocks=d.c.neutralizeNormal||guard?.neutralizeNormal||matches(guard?.neutralizes,a);
        if(!orb&&(reflects||d.gear?.effect==='reflect'||d.n==='decoy')){a.hp-=damage;lines.push('반사 '+damage);return 'reflect';}
        if(!orb&&(blocks||d.gear?.effect==='nullify'||d.g==='buckler'&&fx.strength(a.u)<=30||d.g==='watershield'&&(d.element===1||a.element===1)||
           d.g==='earthshield'&&(d.element===2||a.element===2)||d.g==='windshield'&&(d.element===3||a.element===3)||d.g==='dragonhelm'&&[1,2].includes(a.element)||matches(d.c.neutralizes,a)||d.c.blocksLarge&&fx.max(a.u)>=40||
           d.n==='caitsith'&&fx.strength(a.u)>=40||d.n==='undine'&&a.element===1||d.n==='migoal'&&[0,3].includes(a.element))){lines.push('공격 무효');return 'block';}
        if(!orb&&d.g==='towershield')damage=Math.floor(damage/2);
        if(!orb&&d.c.half)damage=Math.floor(damage/2);
        if(!orb&&['spikeshield','spikedshield'].includes(d.g)){const reflected=Math.floor(damage/2);a.hp-=reflected;damage-=reflected;}
      }
      if(scroll&&guard?.halveScroll)damage=Math.floor(damage/2);
      if((scroll||penetrates)&&d.land){d.hp-=d.land;d.land=0;lines.push('지형 보너스 관통');}
      d.hp-=damage;lines.push(a.c.name+' → '+damage+' 피해');
      if(damage>0)a.dealtDamage=true;
      if(!scroll)d.ordinaryDamage=(d.ordinaryDamage||0)+damage;
      if(a.u.confused&&!muted)a.hp-=Math.floor(damage*.3);
      if(damage>0&&!scroll&&!muted&&(edition!=='ps2'||a.hp>0)){
        extra.onHit(a,d,damage);
        if(a.n==='berserker'){combo.clear(a.u);a.u.confused=true;}
        if(a.n==='samurai'&&(firstEdition?d.c.catalog?.race==='rh':fx.max(d.u)<=30)&&!s.predict&&Math.random()<(firstEdition ? .3 : .6))d.hp=0;
        if(a.n==='cleric'&&d.element===-1&&!s.predict&&Math.random()<.8)d.hp=0;
        if(a.n==='willothewisp'||a.n==='amazon'&&!a.gear){
          const amount=Math.min(s.players[d.seat].cash,a.n==='amazon'?(s.players[a.seat].lap+1)*20:Math.min(a.hp,a.u.hp)*2);
          s.players[d.seat].cash-=amount;s.players[a.seat].cash+=amount;
        }
        if((a.c.poison||a.c.confuse||a.c.paralyze)&&(!a.c.statusRaces||a.c.statusRaces.includes(d.c.catalog?.race))||a.n==='nike'||a.g==='clawoftheghoul'){
          combo.clear(d.u);if(a.c.poison)d.u.poisoned=true;else if(a.c.confuse)d.u.confused=true;else d.u.enchant='paralysis';
        }
        if(a.n==='succubus'||a.g==='ringofthesuccubus'){d.u.st=0;d.st=0;}
        if(a.g==='ringofthevampire')a.hp+=damage;
        if(a.n==='bandit'||a.g==='banditsglove'){const n=Math.min(s.players[d.seat].cash,damage*2);s.players[d.seat].cash-=n;s.players[a.seat].cash+=n;}
        if(a.g==='rathunter'&&d.hp>0)extra.convert(d,'giantrat');
        if(a.n==='wraith'&&!s.predict&&Math.random()<.5)d.hp=0;
      }
    }
    const priority=(a,d)=>muted?0:a.g==='hourglass'||d.g!=='hourglass'&&(a.c.first||a.gear?.first||a.u.enchant==='wing'||['earthamulet','wingedboots','sling','swordofthefalcon','ringofthesuccubus','ringofthevampire'].includes(a.g)||a.defending&&active('silveridol'))?1:a.c.last||a.gear?.last?-1:0;
    const order=priority(D,A)>priority(A,D)?[D,A]:[A,D];
    for(const a of order){
      const d=a===A?D:A;
      for(let j=0;j<(['cerberus','pushpull'].includes(a.n)?2:1)&&a.hp>0&&d.hp>0&&a.away==null&&d.away==null&&!a.stolen&&!d.stolen;j++){
        const start=lines.length;
        if(!muted&&a.u.enchant==='paralysis'){lines.push('마비 · 공격 불가');break;}
        const effect=hit(a,d)||'hit';b.strikes.push({effect,side:a===A?0:1,hp:health(),notes:lines.slice(start)});
      }
    }
    const creatureEnd=!muted&&!active('basaltidol');
    for(const a of sides){
      const d=a===A?D:A,originalName=a.n;
      if(!creatureEnd)a.n=null;
      if(!muted)extra.end(a,d,creatureEnd);
      if(!muted&&a.hp>0&&a.u.poisoned){const loss=Math.floor(fx.max(a.u)/2);a.hp=Math.min(a.hp,a.u.hp)-loss;lines.push('독 · '+loss+' 피해');}
      if(!muted&&a.hp>0&&(creatureEnd&&(a.c.regenerate||['greenmold','healer'].includes(a.n))||a.n==='hydra'&&t.type!==0||a.u.enchant==='regeneration'||a.g==='fireamulet')){a.heal=true;a.hp=fx.max(a.u);lines.push('재생 · HP 회복');}
      if(a.hp>0&&(a.n==='lunatichare'||a.g==='lunastone')&&d.hp>0){const st=Math.max(0,d.st);d.u.st=Math.max(0,Math.min(d.hp,fx.max(d.u)));d.hp=st;}
      if(a.hp>0&&a.hp<=20&&(a.n==='mandrake'||a.g==='gemoflife'))a.hp=d.hp=0;
      if(a.n==='golem'&&a.hp>0){a.u.st=Math.max(0,fx.strength(a.u)-10);if(!firstEdition)a.hp=Math.min(a.hp,a.u.hp)-10;}
      if(a.g==='boomerang'&&!firstEdition&&s.players[a.seat].hand.length<6)s.players[a.seat].hand.push(a.item);
      if(a.n==='zombie'&&a.hp>0)a.hp-=20;
      if(['behemoth','baal','remora'].includes(a.n)){const hand=s.players[a.n==='remora'?d.seat:a.seat].hand;if(hand.length)hand.splice(s.predict?0:Math.floor(Math.random()*hand.length),1);}
      if(a.g==='death'&&!s.predict&&Math.random()<.4)a.hp=0;
      if(a.g==='dynamite'||a.n==='wraith'||!muted&&a.u.enchant==='senility')a.hp=0;
      if(!combo.levelLocked(t)&&fx.name(t.unit)!=='trampleweed'&&(a.hp>0||d.hp>0)&&(a.n==='leshy'||a.g==='silverplow'))t.level=Math.min(5,t.level+(a.n==='leshy')+(a.g==='silverplow'));
      if(a.item!=null&&(a.n==='centaur'||['neutralamulet','belloflaw'].includes(a.g)))s.players[a.seat].book.unshift(a.item);
      a.n=originalName;
    }
    function revive(a){
      const form=a.g==='necroscarab'?'zombie':creatureEnd?({carbunfly:'carbuncle',mermecoleo:'dragonfly'})[a.n]:null;
      if(!form||a.revived)return false;
      extra.transform(a,extra.ids.get(form));a.revived=true;
      return true;
    }
    if(edition==='ps2')for(const a of sides)if(a.hp<=0)revive(a);
    for(const a of sides)if(creatureEnd&&a.hp<=0&&a.n==='sulfurousballoon'){const d=a===A?D:A;d.hp=Math.min(d.hp,d.u.hp)-30;}
    for(const a of sides)if(a.hp<=0){
      if(edition==='ps2'&&revive(a))continue;
      if(!s.predict)fx.death(s,a.u.id);
      const p=s.players[a.seat];
      if(creatureEnd&&a.n==='cornfolk')p.cash+=200;
      if(creatureEnd&&a.n==='mummy')p.cash+=50*(p.lap+1);
      if(creatureEnd&&a.n==='fate'&&p.hand.length<6)draw(p,s);
      if(a.g==='goldengoose')p.cash+=(firstEdition?5:10)*fx.max(a.u);
      if(creatureEnd&&a.n==='phoenix'||a.g==='phoenixamulet')p.hand.push(a.u.id);
      const victor=a===A?D:A;
      if(victor.hp>0&&victor.n==='deathgaze'&&!s.predict&&Math.random()<(firstEdition ? .6 : .8)){
        const enemy=s.players[a.seat],id=a.u.id;
        enemy.book=enemy.book.filter(card=>card!==id);
        if(edition==='ps2')enemy.bannedCards=[...new Set([...(enemy.bannedCards||[]),id])];
        for(const player of s.players)if(player.peek?.seat===a.seat)delete player.peek;
      }
      if(edition!=='ps2')revive(a);
    }
    if(D.hp>0)for(const a of sides){
      if(a.hp<=0||muted)continue;
      const enchant=creatureEnd?(a.n==='suiko'?'vitality':!a.gear?({wendigo:'fog',chonchon:'antielement',giantrattler:'disease'})[a.n]:null):null;
      if(enchant){combo.clear(D.u);D.u.enchant=enchant;lines.push('방어 영지 · '+enchant);}
      if(a.g==='talisman'){combo.clear(D.u);D.u.enchant='landprotection';}
    }
    for(const a of sides){
      const opponent=a===A?D:A;
      if(a.g==='eternalmail'&&a.hp>0)s.players[a.seat].book.unshift(a.item);
      if(!muted&&a.hp>0&&opponent.hp<=0)extra.victory(a,opponent);
      if(a.n==='valkyria'&&a.hp>0&&opponent.hp<=0){
        const st=fx.strength(a.u);a.u.st=Math.max(st,Math.min(80,st+10));lines.push('발키리아 · 승리 후 ST '+a.u.st);
      }
    }
    const onLand=a=>a.hp>0&&a.away==null&&!a.stolen&&!a.returned;
    const won=!onLand(D)&&onLand(A),empty=!onLand(D)&&!onLand(A);
    b.finalHP=health();b.finalForms=sides.map(a=>a.u.id);
    b.lines=[...lines,A.hp<=0&&D.hp<=0?'양측 소멸':empty?'영지 비움':won?'침략 성공 · 영지 점령':'방어 성공'];b.won=won;b.noToll=b.from!=null||b.tower||empty||allied(s,A.seat,D.seat);
    for(const a of sides){
      if(a.original&&a.hp>0){a.u=a.original;a.u.hp=fx.max(a.u);}
      else a.u.hp=Math.min(a.heal||a.absorbed?fx.max(a.u):a.u.hp,a.hp);
      if(a.away!=null&&a.hp>0){const dst=s.tiles[a.away];claim(dst,a.seat,a.u);combo.clear(dst.unit);}
    }
    const attackerReturns=!won&&onLand(A)&&b.from==null;
    if(edition==='ps2'){
      const returnsToHand=a=>a.returned||a.stolen||a===A&&attackerReturns;
      b.settled={
        forms:sides.map(a=>a.u.id),
        hp:sides.map(a=>a.hp<=0?0:returnsToHand(a)?cards[a.u.id].hp:Math.max(0,a.u.hp)),
        st:sides.map(a=>Math.max(0,(returnsToHand(a)?cards[a.u.id].st:fx.strength(a.u))+supportST(s,b.at,b.from,a.seat)))
      };
    }
    if(empty)vacate(t);
    else if(won){claim(t,A.seat,A.u);fatigue(t.unit);}
    else{t.unit=D.u;if(attackerReturns)s.players[A.seat].hand.push(A.u.id);else if(onLand(A))s.tiles[b.from].unit=A.u;}
    if(t.unit&&sides.some(a=>a.g==='rainbowpiece'&&a.hp>0))combo.clear(t.unit);
    if(b.from!=null&&(won||!onLand(A))&&fx.name(s.tiles[b.from].unit)!=='powdereater')vacate(s.tiles[b.from]);
    s.phase='result';note(s,b.lines.at(-1));
  }
  function configureMatch(s,{inputSeconds=0,suddenDeath=false,recordReplay=false}={}){
    if(![0,15,30,60].includes(inputSeconds)||typeof suddenDeath!=='boolean'||typeof recordReplay!=='boolean')
      throw Error('대전 옵션을 확인하세요.');
    s.inputSeconds=inputSeconds;s.suddenDeath=suddenDeath&&!!s.roundLimit;
    if(recordReplay)record.begin(s,total,board);
    return s;
  }
  function armClock(s,now=Date.now(),renew=false){
    if(!s.inputSeconds||s.phase==='over'||isComputer(s,actor(s))){delete s.deadlineAt;return false;}
    if(s.deadlineAt&&!renew)return false;
    s.deadlineAt=now+s.inputSeconds*1000;return true;
  }
  function movementRoll(s,p){
    const fixed=p.status==='bind'?0:p.word??(s.fixed||null);
    if(edition==='revolt'){
      // OmiyaSoft's six-sided dice show 0–5. An all-zero roll moves 12 spaces.
      const die=()=>Math.floor(Math.random()*6);
      if(fixed==null&&p.status==='haste'&&p.hasteRolls>0){
        const total=6+Math.floor(Math.random()*3);
        const low=Math.max(0,total-5),first=low+Math.floor(Math.random()*(6-low));
        return {faces:[first,total-first],total,sides:6,zeroBased:true,haste:true};
      }
      const faces=fixed!=null?p.word!=null&&s.fly&&p.status!=='bind'?[fixed,die()]:[fixed]
        :Array.from({length:s.fly?3:2},die);
      const sum=faces.reduce((a,b)=>a+b,0);
      return {faces,total:fixed==null&&sum===0?12:sum,sides:6,zeroBased:true};
    }
    const sides=board(s).die;
    const die=()=>fx.idol(s,'ironidol')?4+Math.floor(Math.random()*3):1+Math.floor(Math.random()*sides);
    const roll=()=>p.status==='haste'?6+Math.floor(Math.random()*3):p.status==='slow'?1+Math.floor(Math.random()*3):die();
    const faces=fixed!=null?[fixed]:s.fly?[roll(),roll()]:[roll()];
    return {faces,total:faces.reduce((a,b)=>a+b,0),sides};
  }
  function play(s,a,now=Date.now()){
    if(s.deadlineAt&&now>=s.deadlineAt)return false;
    return recordAction(s,a,now,false);
  }
  function expire(s,now=Date.now()){
    if(!s.deadlineAt||now<s.deadlineAt||s.phase==='over'||isComputer(s,actor(s)))return false;
    const moves=choices(s);
    const action=moves.find(([kind])=>['roll','bare','pass','pay','leaveShop','leaveTemple','continue','fizzle','towerCancel','switchKeep','leaveGem','circleSkip'].includes(kind))||moves[0];
    if(!action)return false;
    return recordAction(s,action,now,true);
  }
  function recordAction(s,a,now,timedOut){
    const prior=record.before(s),seat=actor(s);
    if(!applyAction(s,a))return false;
    armClock(s,now,true);
    record.append(s,prior,a[0],seat,timedOut,total);
    return true;
  }
  function applyAction(s,a){
    if(!Array.isArray(a)||!choices(s).some(b=>a.length===b.length&&b.every((v,i)=>v===a[i])))return false;
    const [k,x,y]=a,i=actor(s),p=s.players[i],t=s.tiles[p.pos];
    const cardIndex=['cast','summon','invade'].includes(k)?x:k==='exchange'?y:null;
    if(cardIndex!=null&&!s.cardPaid&&sacrificeRequired(s,cards[p.hand[cardIndex]])){
      s.pendingCard={phase:s.phase,action:a.slice(),index:cardIndex};s.phase='sacrifice';return true;
    }
    if(k==='sacrifice'){
      const pending=s.pendingCard;p.hand.splice(x,1);
      if(x<pending.index)pending.action[pending.action[0]==='exchange'?2:1]--;
      delete s.pendingCard;s.phase=pending.phase;s.cardPaid=true;
      const ok=applyAction(s,pending.action);delete s.cardPaid;return ok;
    }
    const trackChains=['summon','element','transfer','sell','equip','bare','roll','route','direction','leaveTemple','buySymbol','sellSymbol','cast','targetLand','targetPlayer','comboArea','abilityLand','abilityPlayer','totem','teleTo','mesmerCard','soltisPower','replaceCard'].includes(k);
    const previousChains=trackChains?chainCounts(s):null;
    if(k==='roll'){delete s.chainNotice;delete s.shrineNotice;if(p.sagaClemency)s.shrineClemencyUsed=true;}
    const gemTerrain=board(s).gemStore?s.tiles.map(t=>[t.type,t.level]):null;
    const before=!gemTerrain&&(edition==='ps2'||edition==='saga'||s.mapId==='market'||board(s).special?.includes('Temple'))?landValues(s):null;
    function mapEffect(type,label,tile=p.pos,extra={}){
      s.mapEffect={sequence:(s.mapEffect?.sequence||0)+1,type,label,tile,source:p.pos,...extra};
    }
    switch(k){
      case 'ability':{
        if(fx.territoryTargets(s,x)[0]?.[0]==='abilitySelf'){
          fatigue(s.tiles[x].unit);
          const name=cards[s.tiles[x].unit.id].name;
          fx.territoryEffect(s,x,x);mapEffect('cast',name,x);afterTerritory(s);
        }else{s.abilityFrom=x;s.phase='territoryTarget';}
        break;
      }
      case 'abilityLand':case 'abilityPlayer':{
        fatigue(s.tiles[s.abilityFrom].unit);
        const next=fx.territoryEffect(s,s.abilityFrom,x);delete s.abilityFrom;
        mapEffect('cast','영지 능력',k==='abilityLand'?x:s.players[x].pos);
        if(next)s.phase=next;else afterTerritory(s);break;
      }
      case 'wormDiscard':{
        const victim=s.players[s.spellTarget],id=victim.hand.splice(x,1)[0];
        mapEffect('shatter',cards[id].name,victim.pos);delete s.spellTarget;afterTerritory(s);break;
      }
      case 'eraseDraw':s.players[s.spellTarget].book.splice(-1-x,1);for(const q of s.players)if(q.peek?.seat===s.spellTarget)q.peek.ids.splice(x,1);s.phase='roll';break;
      case 'teleTo':{
        const src=s.tiles[s.teleFrom],dst=s.tiles[x];
        if(dst.unit){s.battle={at:x,from:s.teleFrom,inv:src.unit.id,invHP:src.unit.hp,atkItem:null,defItem:null,attackerSeat:src.owner,teleport:true};s.phase='attack';}
        else{claim(dst,src.owner,{...src.unit});combo.clear(dst.unit);if(fx.name(src.unit)!=='powdereater')vacate(src);s.phase='roll';}
        delete s.teleFrom;break;
      }
      case 'fortuneDraw':{
        const indices=p.book.flatMap((id,j)=>cards[id].kind===x?[j]:[]);
        const j=indices[Math.floor(Math.random()*indices.length)],id=p.book.splice(j,1)[0];p.hand.push(id);
        note(s,'점술관 · '+cards[id].name);s.phase='land';break;
      }
      case 'route':advance(s,x);break;
      case 'buyCard':{
        const card=cards[x];
        p.cash-=card.cost;p.hand.push(x);
        note(s,p.name+' · '+card.name+' 구매 −'+card.cost+'G');
        if(p.hand.length>6){s.phase='discard';s.discardReturn='endTurn';}else finish(s);
        break;
      }
      case 'leaveShop':s.phase='land';break;
      case 'buySymbol':case 'sellSymbol':{
        const count=k==='buySymbol'?y:-y;p.cash-=count*s.prices[x];p.symbols[x]+=count;resumeMove(s);break;
      }
      case 'buyGem':case 'sellGem':case 'stealGem':{
        const quote=gemQuote(s,a);
        p.cash-=quote.cost;p.symbols[x]=quote.holdings;s.prices=quote.prices;
        if(k==='stealGem'){
          const seller=s.players[a[3]];
          seller.cash+=quote.received;seller.symbols[x]-=y;
          note(s,p.name+' · '+seller.name+'의 '+elements[x]+' 속성석 '+y+'개 매입');
        }else note(s,p.name+' · '+elements[x]+' 속성석 '+y+'개 '+(k==='buyGem'?'매수':'매도'));
        if(s.remaining)resumeMove(s);else s.phase='land';
        break;
      }
      case 'leaveGem':if(s.remaining)resumeMove(s);else s.phase='land';break;
      case 'leaveTemple':resumeMove(s);break;
      case 'liquidate':p.cash+=s.prices[x]*y;p.symbols[x]-=y;debt(s);break;
      case 'shrineChoice':shrine.choose(s,x);break;
      case 'soltisPower':case 'soltisArea':case 'foresightCard':case 'prophecyKind':case 'replaceCard':
        s.phase=extra.choose(s,k,x);
        if(k==='foresightCard'&&s.shrineForesight){delete s.shrineForesight;s.phase='land';shrine.after(s);}
        mapEffect('cast',extraSpells.soltis[x]||extraSpells.actions[k]);break;
      case 'circleSkip':delete s.circleOffers;s.phase='land';break;
      case 'circleCast':case 'mesmerCard':case 'cast':{
        const id=k==='circleCast'?x:k==='mesmerCard'?s.players[s.spellTarget].hand.splice(x,1)[0]:paid(s,p,x);
        if(k==='circleCast'){delete s.circleOffers;s.circleCasting=true;}
        const c=cards[id],cash=p.cash;s.phase='roll';p.lastCast={name:key(c),round:s.round};
        delete p.invisible;
        const spellType=extraTypes?.[c.effect]||combo.type[c.effect];
        if(spellType){
          const global=spellType==='global',beforeHP=combo.damageSpells.has(c.effect)||extraSpells?.damageSpells.has(c.effect)?s.tiles.map(t=>t.unit?.hp):[];
          s.spellEffect=c.effect;s.phase=global?(extraTypes?.[c.effect]?extra:fx).apply(s,c.effect):'spellTarget';
          const hits=beforeHP.flatMap((hp,at)=>{
            const damage=hp-(s.tiles[at].unit?.hp??0);
            return damage>0?[{at,damage,defeated:!s.tiles[at].unit}]:[];
          });
          if(hits.length){
            const lost=hits.filter(h=>h.defeated).length;
            const label=hits.length+'곳 피해'+(lost?' · '+lost+'곳 격파':'');
            mapEffect('cast',label,hits[0].at,{hits,title:c.name});note(s,c.name+' · '+label);
          }else{mapEffect('cast',c.name);note(s,p.name+' · '+c.name);}
          break;
        }
        if(c.effect==='obliterate'){
          for(const q of s.players)q.cash-=board(s).gemStore?q.symbols.reduce((sum,count)=>sum+count,0)*70:Math.floor(Math.max(0,q.cash)/10);
          mapEffect('cast',c.name);note(s,p.name+' · '+c.name);break;
        }
        if(c.effect==='remoteswitch'){
          if(board(s).pathSwitches)flipPaths(s,c.name);
          else draw(p,s);
          const at=Math.floor(Math.random()*(p.book.length+1));
          p.book.splice(at,0,id);
          for(const q of s.players)if(q.peek?.seat===s.turn)delete q.peek;
          mapEffect('cast',c.name);
          if(!board(s).pathSwitches)note(s,p.name+' · '+c.name+' · 카드 1장 뽑음');
          break;
        }
        if(c.effect==='cash')p.cash+=100;
        else if(c.effect==='manna')p.cash+=(c.magicPerLap||50)*(p.lap+1);
        else if(c.effect==='fly')s.fly=true;
        else if(c.effect==='six'||c.effect==='one')p.word=c.effect==='one'?1:6;
        else{s.spellEffect=c.effect;s.phase='spellTarget';}
        if(s.phase==='roll'){
          const word=c.effect==='one'||c.effect==='six';
          const label=word?'이동 '+p.word:c.effect==='fly'?'주사위 ×'+(edition==='revolt'?3:2):'+'+(p.cash-cash)+' G';
          mapEffect(word?'word':c.effect==='fly'?'fly':'gain',label,p.pos,{title:c.name});
        }else mapEffect('cast',c.name);
        note(s,p.name+' · '+c.name);break;
      }
      case 'plagueArea':{
        for(const tile of s.tiles)if(tile.area===x&&tile.unit){combo.clear(tile.unit);tile.unit.poisoned=true;}
        mapEffect('cast',(x+1)+'지역 · 독');s.phase='roll';break;
      }
      case 'comboArea':case 'targetLand':{
        if(extraTypes?.[s.spellEffect]){const prior=s.tiles[x].unit?.hp;s.phase=extra.apply(s,s.spellEffect,x);const damage=prior-(s.tiles[x].unit?.hp??0);mapEffect('cast',damage>0?'−'+damage+' HP':s.spellEffect,x);break;}
        if(combo.type[s.spellEffect]){s.phase=fx.apply(s,s.spellEffect,x);mapEffect('cast',s.spellEffect,k==='comboArea'?p.pos:x);break;}
        const unit=s.tiles[x].unit,prior=unit.hp;
        if(s.spellEffect==='heal')unit.hp=spellHP(s,s.tiles[x],'heal');
        else fx.harm(s,s.tiles[x],20);
        s.phase='roll';
        const change=(s.tiles[x].unit?.hp||0)-prior;
        mapEffect(s.spellEffect,(change>=0?'+':'−')+Math.abs(change)+' HP',x,{title:cards[unit.id].name});
        break;
      }
      case 'targetPlayer':if(s.players[x].antiMagic&&s.spellEffect!=='dispelmagic'){delete s.players[x].antiMagic;s.phase='roll';mapEffect('cast','안티 매직',s.players[x].pos);break;}
        if(s.spellEffect==='stealgem'){
          const q=s.players[x];
          if(board(s).gemStore){
            const pool=stealableGems(p,q),e=pool[Math.floor(Math.random()*pool.length)];
            p.symbols[e]++;q.symbols[e]--;mapEffect('cast',elements[e]+' 속성석 1개',q.pos);
          }else{p.cash+=80;q.cash-=80;mapEffect('gain','80G',q.pos);}
          s.phase='roll';break;
        }
        if(extraTypes?.[s.spellEffect]){s.phase=extra.apply(s,s.spellEffect,x);mapEffect('cast',s.spellEffect,s.players[x].pos);break;}
        if(combo.type[s.spellEffect]){s.phase=fx.apply(s,s.spellEffect,x);mapEffect('cast',s.spellEffect,s.players[x].pos);break;}if(s.spellEffect==='shatter'){s.spellTarget=x;s.phase='shatter';}
        else{fx.clearCepter(s.players[x]);s.players[x].word=s.spellEffect==='word1'?1:6;mapEffect('word','이동 '+s.players[x].word,s.players[x].pos,{title:s.players[x].name});s.phase='roll';}break;
      case 'suppressCard':{
        const id=s.players[s.spellTarget].hand[x];
        for(const q of s.players){q.hand=q.hand.filter(v=>v!==id);q.book=q.book.filter(v=>v!==id);}
        mapEffect('shatter',cards[id].name,s.players[s.spellTarget].pos);s.phase='roll';break;
      }
      case 'breakCard':if(s.phase==='squeeze')s.players[s.spellTarget].cash+=150;mapEffect('shatter','카드 파괴',s.players[s.spellTarget].pos,{title:s.players[s.spellTarget].name});s.players[s.spellTarget].hand.splice(x,1);s.phase='roll';break;
      case 'fizzle':delete s.reliefFrom;mapEffect('cast','대상 없음');s.phase='roll';break;
      case 'roll':{const {faces,total,sides,zeroBased,haste}=movementRoll(s,p);if(haste&&!--p.hasteRolls)fx.clearCepter(p);s.die=total;if(revolt)s.rollSum=faces.reduce((sum,face)=>sum+face,0);if(s.die>=5&&s.die<=7)for(const q of s.players)if(q.status==='mistletoe')q.cash+=50;mapEffect('roll',String(s.die),p.pos,{faces,sides,...(zeroBased?{zeroBased}:{})});if(p.word!=null){delete p.word;if(p.status==='die')delete p.status;}s.fly=false;}note(s,p.name+' · 주사위 '+s.die);if(!s.die){s.remaining=0;if(p.status==='bind')finish(s);else arrived(s);break;}if(p.chooseDirection){delete p.chooseDirection;p.dir=0;p.previous=null;}if(pathSwitch(s,p.pos,p.previous)){delete p.reverse;move(s,p.dir||1);break;}if(p.reverse){const back=p.previous;delete p.reverse;p.dir=-(p.dir||1);if(board(s).links[p.pos].includes(back)){s.remaining=s.die;s.visited=[];advance(s,back);break;}p.previous=null;}if(p.dir){if(p.previous==null&&!board(s).stage&&!board(s).graph)p.previous=(p.pos-p.dir+s.tiles.length)%s.tiles.length;move(s,p.dir);}else if((board(s).stage||board(s).graph)&&board(s).links[p.pos].length!==2)move(s,1);else s.phase='direction';break;
      case 'direction':move(s,x);break;
      case 'totem':p.cash+=300;fx.destroy(s,s.tiles[x]);afterTerritory(s);break;
      case 'switchFlip':flipPaths(s,'방향 변경');s.phase='land';break;
      case 'switchKeep':s.phase='land';break;
      case 'towerAim':s.phase='towerTarget';break;
      case 'towerTo':s.towerAt=x;s.phase='towerDeploy';break;
      case 'towerCancel':s.phase=s.phase==='towerDeploy'?'towerTarget':'land';delete s.towerAt;break;
      case 'summon':case 'exchange':{
        const at=k==='summon'?(s.towerAt??p.pos):x,tile=s.tiles[at],id=paid(s,p,k==='summon'?x:y);
        delete s.towerAt;
        if(k==='exchange')p.hand.push(tile.unit.id);
        mapEffect('summon',cards[id].name,at);
        claim(tile,i,{id,hp:cards[id].hp});fatigue(tile.unit);note(s,p.name+' · '+cards[id].name+' 배치');afterTerritory(s);break;
      }
      case 'level':mapEffect('gain','Lv.'+y,x);p.cash-=levelCost(s.tiles[x],y);s.tiles[x].level=y;fatigue(s.tiles[x].unit);note(s,p.name+' · '+(x+1)+'번 영지 Lv.'+y);afterTerritory(s);break;
      case 'transfer':{
        const from=s.tiles[x],dest=s.tiles[y];
        fatigue(from.unit);
        if(dest.owner<0){claim(dest,i,{...from.unit});combo.clear(dest.unit);if(fx.name(from.unit)!=='powdereater')vacate(from);afterTerritory(s);}
        else{mapEffect('invade','영지 공격',y,{source:x});s.battle={at:y,inv:from.unit.id,invHP:from.unit.hp,from:x,atkItem:null,defItem:null};s.phase='attack';}
        break;
      }
      case 'element':mapEffect('cast',elements[y]+' 속성',x);p.cash-=elementCost(s.tiles[x]);s.tiles[x].type=y;fatigue(s.tiles[x].unit);afterTerritory(s);break;
      case 'pay':payToll(s);break;
      case 'invade':{
        const at=s.towerAt??p.pos,tower=s.phase==='towerDeploy';
        delete s.towerAt;
        mapEffect('invade',tower?'사령탑 침략':'영지 침략',at);
        s.battle={at,inv:paid(s,p,x),atkItem:null,defItem:null,spellMove:!!s.spellArrival&&!tower,...(tower?{tower}:{})};
        s.phase='attack';break;
      }
      case 'bare':case 'equip':{
        const id=k==='equip'?paid(s,p,x):null;
        if(s.phase==='attack'){s.battle.atkItem=id;s.phase='defend';}else{s.battle.defItem=id;resolve(s);}break;
      }
      case 'continue':{const b=s.battle,free=b.won||b.noToll;delete s.battle;if(b.markerFlag)s.phase='land';else if(b.teleport)s.phase='roll';else if(b.from!=null)afterTerritory(s);else if(free)finish(s);else payToll(s);break;}
      case 'pass':finish(s);break;
      case 'sell':p.cash+=debtSaleValue(s,s.tiles[x]);vacate(s.tiles[x],true);debt(s);break;
      case 'discard':
        p.hand.splice(x,1);
        if(p.hand.length<=6){
          const next=s.discardReturn||'spell';delete s.discardReturn;
          if(next==='endTurn')finish(s);else s.phase=next;
        }
        break;
    }
    if(s.circleCasting&&['roll','land'].includes(s.phase)){
      s.phase='land';delete s.circleCasting;
    }
    if(!revolt&&s.phase==='roll'&&s.players[s.turn].hand.length>6){s.discardReturn='roll';s.phase='discard';}
    if(gemTerrain)updateGemTerrain(s,gemTerrain);else updatePrices(s,before);
    if(previousChains)reportChains(s,previousChains);
    if(s.endReason==='roundLimit'){
      const entries=s.players.flatMap((_,i)=>!s.teams||s.teams.indexOf(s.teams[i])===i?[[i,total(s,i)]]:[]);
      const top=Math.max(...entries.map(([,g])=>g));
      s.leaders=entries.filter(([,g])=>g===top).map(([i])=>i);
      if(s.suddenDeath&&s.leaders.length>1){
        delete s.endReason;delete s.leaders;s.overtime=true;
        note(s,'서든데스 · 한 라운드 더 진행합니다.');nextTurn(s);
      }else s.winner=s.leaders.length>1?-1:s.leaders[0];
    }
    const cue=s.phase==='over'?'victory':({pay:'coin',sell:'coin',buyCard:'coin',buySymbol:'coin',sellSymbol:'coin',buyGem:'coin',sellGem:'coin',stealGem:'coin',liquidate:'coin',equip:'card',discard:'card',fortuneDraw:'card'})[k];
    if(cue)s.actionSound={sequence:(s.actionSound?.sequence||0)+1,cue};
    if(!['over','sell','result'].includes(s.phase)&&s.players.some(q=>q.cash<0))settleDebts(s,s.phase);
    return true;
  }
  const deckPlans=new WeakMap();
  function ai(s){
    const seat=actor(s),p=s.players[seat],skill=isComputer(s,seat)?(s.aiLevel||0):0;
    const visibleBook=p.template||p.hand;
    let groups=deckPlans.get(visibleBook);
    if(!groups){const names=visibleBook.map(id=>key(cards[id]));groups=combo.recipes.filter(g=>combo.matches(g,names));if(p.template)deckPlans.set(p.template,groups);}
    const plan=combo.planner(s,seat,cards,fx,groups);

    // Only simulate the revealed board and our contemplated equipment. The opposing item is concealed.
    function forecast(battle,gear,defending,unpaid=false){
      const tiles=s.tiles.map(t=>({...t,unit:t.unit&&{...t.unit}}));
      const players=s.players.map(q=>({...q,hand:q.hand.slice(),symbols:q.symbols.slice(),book:q.book?.slice()||[],peek:q.peek&&{...q.peek,ids:q.peek.ids.slice()}}));
      const acting=players[seat];
      // Hand-size effects see the hand after the selected creature and equipment leave it.
      if((s.phase==='land'||unpaid)&&battle.from==null){const j=acting.hand.indexOf(battle.inv);if(j>=0)acting.hand.splice(j,1);}
      if(gear!=null){const j=acting.hand.indexOf(gear);if(j>=0)acting.hand.splice(j,1);}
      const trial={...s,predict:true,tiles,players,prices:s.prices.slice(),log:[],battle:{...battle,atkItem:defending?null:gear,defItem:defending?gear:null}};
      resolve(trial);
      return trial.battle;
    }
    function development(k,x,y,c){
      const t=k==='summon'?s.tiles[p.pos]:s.tiles[x];
      const next={...t,owner:seat},cost=k==='summon'?price(p,c,s):k==='element'?elementCost(t):levelCost(t,y);
      if(k==='summon'){next.type=claimTerrain(t,c);next.unit={id:p.hand[x],hp:c.hp};}
      if(k==='level')next.level=y;
      if(k==='element')next.type=y;
      const trial={...s,tiles:s.tiles.map(v=>v===t?next:v)};
      const gain=total(trial,seat)-total(s,seat)-cost;
      const landing=trial.tiles[p.pos];
      const owed=landing.owner>=0&&!allied(s,seat,landing.owner)?toll(trial,landing):0;
      const balance=p.cash-cost-owed;
      if(owed&&balance<0)return -10000+balance;
      const reserve=Math.max(0,90-balance);
      const guard=k==='summon'?c:cards[t.unit.id];
      const protection=(landBonus(guard,next)+guard.hp+(guard.first?12:0))/100;
      return gain+(toll(trial,next)-(t.owner===seat?toll(s,t):0))*(.32+protection*.28)
        +(k==='summon'?40:0)-reserve*.55;
    }
    // Value a visible straight route; the next fork gets its own decision.
    function landing(next,prev,steps,traveler=seat,roll=steps){
      const m=board(s),walker=s.players[traveler],pots=new Map();
      let bonus=0,cash=walker.cash;
      for(let left=steps;left>0;left--){
        const tile=s.tiles[next];
        const gate=m.gates?.[next];
        if((revolt?gate!=null:tile.type==='성')&&total(s,traveler)>=s.target)return 10000;
        if(revolt?gate!=null&&!walker.flags.includes(gate):m.forts.includes(next)&&!walker.flags.some(f=>m.types[f]===tile.type))bonus+=25;
        if(revolt&&tile.type==='마력 트랩'){
          const stored=pots.get(next)??tile.trapMagic??0;
          const change=magicTrapDelta(roll,cash,stored);
          cash+=change;
          bonus+=change;
          pots.set(next,stored-change);
        }
        const jump=transitDestination(m,next,tile.type,left-1);
        if(jump!=null){prev=next;next=jump;}
        if(left===1||tile.unit?.enchant==='quicksand'||!allied(s,tile.owner,traveler)&&((fx.name(tile.unit)==='oldwillow'&&tile.type===0)||(fx.name(tile.unit)==='kelpie'&&tile.type===1)))break;
        const exits=movementExits(s,next,prev);
        if(exits.length!==1)return bonus;
        prev=next;next=exits[0];
      }
      const t=s.tiles[next];
      if(t.owner>=0&&!allied(s,t.owner,traveler))return bonus-owedToll(s,t,traveler);
      if(allied(s,t.owner,traveler)||m.castles?.includes(next)||m.forts.includes(next))return bonus+20;
      return bonus+(territoryType(t.type)&&traveler===seat&&p.hand.some(id=>cards[id].kind==='creature'&&price(p,cards[id],s)<=p.cash)?65:0);
    }
    function alliedWordTarget(j,steps){
      if(!allied(s,seat,j)||s.players[j].antiMagic||modern&&s.players[j].status==='barrier')return -100;
      const q=s.players[j],exits=movementExits(s,q.pos,q.previous);
      return Math.max(-100,...exits.map(n=>landing(n,q.pos,steps,j)))/12;
    }
    function territoryValue(from,kind,x){
      const src=s.tiles[from],n=fx.name(src.unit),cost=fx.territoryCost(s,n);
      if(edition==='saga'){
        if(n==='gogma')return (allied(s,seat,s.tiles[x].owner)?1:-1)*value(s,s.tiles[x])*1.5;
        if(n==='warlock')return allied(s,seat,x)&&!s.players[x].antiMagic?20:0;
        if(n==='fontaciel')return s.tiles.reduce((sum,t)=>sum+(t.owner===seat&&t.unit&&fx.max(t.unit)<100&&!fx.immuneHP(t)?12:0),0);
      }
      const sign=t=>allied(s,t.owner,seat)?1:-1;
      const damageValue=(t,damage)=>{
        const amount=fx.damageAmount(s,t,damage);
        return -sign(t)*(amount+(amount===t.unit.hp?value(s,t)*.45:0));
      };
      if(kind==='abilityPlayer'){
        const q=s.players[x],friend=allied(s,x,seat);
        if(q.antiMagic)return friend?-30:5;
        if(n==='holyllama')return alliedWordTarget(x,6);
        if(n==='clockworkowl')return friend&&q.previous!=null&&!q.chooseDirection?15:-10;
        if(n==='bookworm')return friend?-60:Math.max(0,...q.hand.map(id=>(cards[id]?.cost||0)*.6));
        return friend?-100:q.cash/20;
      }
      if(kind==='abilityLand'){
        const t=s.tiles[x],u=t.unit;
        if(!u)return 35+t.level;
        if(n==='archer'||n==='tetramorph')return damageValue(t,n==='archer'?10:20);
        if(n==='fanatic')return damageValue(t,20)+damageValue(src,20);
        if(n==='healer')return fx.immuneHP(t)?0:sign(t)*Math.min(30,fx.max(u)-u.hp);
        if(n==='archbishop'){
          const curse=u.poisoned||u.confused||['paralysis','senility','disease','drought','antielement'].includes(u.enchant);
          return sign(t)*(curse?30:u.enchant?-30:0);
        }
        if(n==='domovoi'||n==='domovikha')return sign(t)*(u.enchant===(n==='domovoi'?'phantasm':'landprotection')?0:10+t.level*5);
        if(n==='hyde')return u.enchant==='paralysis'?0:-sign(t)*(20+t.level*5);
        return -sign(t)*(10+(u.hp<=20?5:0));
      }
      if(n==='banshee')return s.tiles.reduce((a,t)=>a+(t.unit?damageValue(t,Math.floor(fx.max(t.unit)/4)):0),0);
      if(n==='quakebeast')return board(s).links[from].reduce((a,j)=>{
        const t=s.tiles[j];return a-(t.owner>=0&&t.level>1&&!fx.blockedLevel(s,t)?sign(t)*value(s,t)*.4:0);
      },-value(s,src)*.6);
      if(n==='algasphere')return !fx.immuneHP(src)&&fx.max(src.unit)<80?20:0;
      if(n==='fate')return p.hand.length<5?30:0;
      if(n==='barometz')return (p.lap+1)*30;
      if(n==='astralqueen')return s.tiles.reduce((a,t)=>a+(t.unit&&t.unit.enchant!=='camouflage'&&cards[t.unit.id].element!==t.type?sign(t)*t.level*10:0),0);
      if(n==='dancingdoll')return s.players.reduce((a,q,j)=>a+(allied(s,j,seat)?-1:1)*q.symbols.reduce((sum,count,e)=>sum+count*s.prices[e],0)*.2,0);
      if(n==='sharazad')return s.players.reduce((a,q,j)=>{
        const bad=['haunt','waste','silence','slow','despair','dullness','blackout'].includes(q.status);
        return a+(allied(s,j,seat)?1:-1)*(bad?30:q.status||q.antiMagic||q.dream||q.invisible?-30:0);
      },0);
      return 45+cost*.2;
    }
    function placementScore(kind,id,at,remote=false){
      const c=cards[id],tile=s.tiles[at];
      if(kind==='summon'){
        const connected=remote?s.tiles.filter(t=>allied(s,t.owner,seat)&&t.type===tile.type&&t.area===tile.area).length:0;
        return 70+c.hp/10+(combo.matchesTerrain(c,tile.type)?4:0)+connected*8;
      }
      const hp=tile.unit.hp+landBonus(cards[tile.unit.id],tile);
      if(remote&&skill>=2){
        const attack={at,inv:id,tower:true};
        const win=Math.max(...[null,...p.hand.filter(card=>card!==id&&canEquip(c,cards[card])&&price(p,cards[card],s)+price(p,c,s)<=p.cash)].map(gear=>forecast(attack,gear,false,true).won?value(s,tile)+15-(cards[gear]?.cost||0):0));
        return win?win/3-price(p,c,s)/6:-20;
      }
      return c.st+(p.hand.some(id=>cards[id].kind==='item'&&cards[id].st&&cards[id].cost+c.cost<=p.cash)?30:0)>=hp?40:-2;
    }
    function gemScore(action){
      const [kind,element,count,opponent]=action,quote=gemQuote(s,action);
      const owned=s.tiles.filter(t=>t.type===element&&allied(s,t.owner,seat)).length;
      const gain=quote.prices.reduce((sum,price,e)=>sum+price*(e===element?quote.holdings:p.symbols[e])-s.prices[e]*p.symbols[e],-quote.cost);
      const reserve=Math.max(0,Math.min(160,p.cash)-p.cash+quote.cost);
      const deny=opponent==null?0:s.prices[element]*count*.32;
      return gain/22-reserve/18+deny/24+(kind==='buyGem'?owned*count*.28:kind==='sellGem'&&p.cash<90?-quote.cost/14:0);
    }
    function score(action){
      const [k,x,y]=action;
      const c=cards[p.hand[x]];
      const n=key(c);
      if(k==='invade'&&allied(s,seat,s.tiles[p.pos].owner)||k==='transfer'&&allied(s,seat,s.tiles[y].owner))return -10000;
      const targetWord=(modern?{word1:1,holyword2:2,holyword3:3,word6:6,holyword8:8}:{word6:6,holyword3:3,holywordx:10})[k==='cast'?c?.effect:s.spellEffect];
      if((s.teams||modern)&&targetWord&&(k==='cast'||k==='targetPlayer')){
        if(k==='targetPlayer')return alliedWordTarget(x,targetWord);
        return Math.max(...s.players.map((_,j)=>alliedWordTarget(j,targetWord)))-c.cost/35;
      }
      if(k==='shrineChoice')return shrine.score(s,x);
      if(k==='circleCast'){
        const effect=cards[x].effect;
        if(extraTypes?.[effect])return extra.scoreCast(s,effect);
        if(combo.type[effect])return plan.cast(effect);
        if(effect==='manna')return Math.max(1,p.lap)*6;
        return effect==='bolt'&&s.tiles.some(t=>t.unit&&!allied(s,t.owner,seat))?5:effect==='shatter'?2:-2;
      }
      if(k==='cast'&&extraTypes?.[c.effect])return extra.scoreCast(s,c.effect)-price(p,c,s)/35;
      if(['targetLand','targetPlayer'].includes(k)&&extraTypes?.[s.spellEffect])return extra.scoreTarget(s,s.spellEffect,x);
      if(extraSpells?.actions[k])return extra.scoreChoice(s,k,x,y);
      if(k==='cast'&&combo.type[c.effect])return plan.cast(c.effect)+plan.sequence(c.effect)-c.cost/35;
      if(['targetLand','comboArea','targetPlayer'].includes(k)&&combo.type[s.spellEffect])return plan.scoreTarget(s.spellEffect,x);
      if(k==='totem')return 130+(s.tiles[x].unit.enchant==='soulhunt'?50:0);
      if(k==='ability'){
        const unit=fx.name(s.tiles[x].unit);
        if(unit==='spittingcobra')return p.hand.some(id=>key(cards[id])==='exile')?65:20;
        if(['conjurer','windimp','heatimp'].includes(unit)&&p.hand.some(id=>key(cards[id])==='raisedead'))return 80;
        return Math.max(-100,...fx.territoryTargets(s,x).map(([kind,j])=>territoryValue(x,kind,j)))-fx.territoryCost(s,unit)*.2;
      }
      if(k==='abilityLand'||k==='abilityPlayer')return territoryValue(s.abilityFrom,k,x);
      if(k==='breakCard'){const target=s.players[s.spellTarget],cost=cards[target.hand[x]].cost;return allied(s,s.spellTarget,seat)?-cost:cost;}
      if(k==='teleTo')return s.tiles[x].owner>=0?10:1;
      if(k==='eraseDraw')return p.peek?.seat===s.spellTarget?(cards[p.peek.ids[x]]?.cost||0):0;
      if(k==='wormDiscard')return cards[s.players[s.spellTarget].hand[x]].cost;
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
          -(k==='equip'?6+price(p,c,s)*.16:0)+(k==='equip'&&plan.pair(key(unit),n)?15:0);
      }
      if(k==='summon'&&plan.ready(n))return (skill?development(k,x,y,c):70)+22;
      if(skill){
        if(['summon','level','element'].includes(k))return development(k,x,y,c);
        if(k==='discard')return (p.hand.filter(id=>id===p.hand[x]).length-1)*5+
          (c.kind==='item'?2:0)-(c.effect==='manna'?20:0)-(c.kind==='creature'&&p.hand.filter(id=>cards[id].kind==='creature').length<=2?12:0);
        if(skill>=2&&k==='direction'){
          const links=board(s).links[p.pos];
          return landing(x===1?links[0]:links.at(-1),p.pos,s.die,seat,s.rollSum??s.die);
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
          const gear=[null,...p.hand.filter((id,j)=>j!==x&&(!sacrificeRequired(s,c)||p.hand.length>=3)&&price(p,cards[id],s)+price(p,c,s)<=p.cash&&canEquip(c,cards[id]))];
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
          const p=s.players[s.turn],m=board(s);
          const gates=revolt?Object.keys(m.gates).map(Number):m.forts;
          const missing=gates.filter(n=>revolt?!p.flags.includes(m.gates[n]):!p.flags.some(f=>m.types[f]===m.types[n]));
          const goals=total(s,s.turn)<s.target&&missing.length?missing:revolt?gates:(m.castles||[0]);
          let queue=[[x,p.pos,0]],seen=new Set();
          for(let k=0;k<queue.length;k++){
            const [at,prev,d]=queue[k],key=at+'/'+prev;if(seen.has(key))continue;seen.add(key);
            if(goals.includes(at))return 9-d+(skill>=2?landing(x,p.pos,s.remaining,seat,s.rollSum??s.die)/12:0);
            const type=m.types[at],dest=m.transit?.[at],immediate=transitDestination(m,at,type,1);
            if(dest!=null&&immediate==null&&(type==='전송진'||m.graph)&&prev!==dest)queue.push([dest,at,d+1]);
            const pos=immediate??at,entry=immediate==null?prev:at;
            for(const exit of movementExits(s,pos,entry))queue.push([exit,pos,d+1]);
          }return -10000;
        }
        case 'buyGem':case 'sellGem':case 'stealGem':return gemScore(action);
        case 'buySymbol':return p.cash>300&&y<=5&&p.symbols[x]<10?2:-2;
        case 'buyCard':{
          const offered=cards[x],missingKind=!p.hand.some(id=>cards[id].kind===offered.kind);
          if(p.hand.length>=6||p.cash-offered.cost<40)return -3;
          return 3+(missingKind?4:0)+(p.template?.includes(x)?2:0)-offered.cost/40;
        }
        case 'leaveShop':return 1;
        case 'sellSymbol':return p.cash<90?2+y/100:-2;
        case 'leaveTemple':return 1;
        case 'targetLand':{
          const tile=s.tiles[x],friendly=allied(s,tile.owner,seat);
          const next=spellHP(s,tile,s.spellEffect);
          if(next===tile.unit.hp)return -20;
          if(s.spellEffect==='bolt')return friendly?-30:8+(next===0?4*tile.level:0);
          return (friendly?1:-1)*(next-tile.unit.hp);
        }
        case 'targetPlayer':return (s.spellEffect==='word6')===allied(s,x,s.turn)?4:0;
        case 'cast':
          if(c.effect==='stealgem')return board(s).gemStore?(s.players.some((q,j)=>!allied(s,seat,j)&&stealableGems(p,q).length)?5:-10):8;
          if(c.effect==='obliterate')return board(s).gemStore?(Math.max(...s.players.filter((_,j)=>!allied(s,seat,j)).map(q=>q.symbols.reduce((sum,n)=>sum+n,0)))-p.symbols.reduce((a,b)=>a+b,0))*1.4-5:-4;
          if(c.effect==='remoteswitch')return board(s).pathSwitches?0:p.hand.length<=2?3:-2;
          if(c.effect==='bolt')return s.tiles.some(t=>fx.targetable(s,t)&&!allied(s,seat,t.owner)&&fx.damageAmount(s,t,20)>0)?4:-10;
          if(c.effect==='shatter')return !s.tiles.some(t=>fx.name(t.unit)==='graniteidol')&&s.players.some((q,j)=>!allied(s,seat,j)&&q.hand.some(id=>cards[id].kind!=='creature'))?4:-10;
          if(['manna','fly','word6'].includes(c.effect))return 4;
          return c.effect==='cash'?10:c.effect==='six'?3:-2;
        case 'switchFlip':case 'switchKeep':{
          const to=pathSwitch(s,p.pos,p.previous,k==='switchFlip').to;
          const tile=s.tiles[to],danger=tile.owner>=0&&!allied(s,tile.owner,seat)?owedToll(s,tile,seat):0;
          const gate=board(s).gates[to];
          return (gate!=null&&!p.flags.includes(gate)?25:0)-danger/10+(k==='switchKeep'?1:0);
        }
        case 'towerAim':return Math.max(...towerTargets(s).map(action=>score(action)));
        case 'towerTo':return Math.max(...towerCards(s,x).map(([kind,j])=>placementScore(kind,p.hand[j],x,true)));
        case 'summon':case 'invade':return placementScore(k,p.hand[x],s.towerAt??p.pos,s.phase==='towerDeploy');
        case 'equip':return (s.phase==='attack'?c.st:c.hp)/5-1;
        case 'level':return 30+y+(chain(s,s.tiles[x])>1?5:0);
        case 'transfer':case 'element':case 'exchange':return -2;
        case 'discard':return c.kind==='spell'?5:1;
        case 'sell':return -debtSaleValue(s,s.tiles[x])/100;
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
  const territoryAbilityCost=card=>key(card)==='goldentotem'?0:fx.territoryCost({edition},key(card));
  return {edition,territoryType,claimTerrain,territoryAbilityCost,shrineNames:shrineModule?.names,shrineDetails:shrineModule?.details,price,spellHP,isComputer,owedToll,spellDescriptions:extraSpells?.descriptions,spellActions:extraSpells?.actions,spellHints:extraSpells?.hints,soltisOptions:extraSpells?.soltis,routePreview,pathSwitch,gemQuote,gemUnitPrice,shopStock,battleGround,combo,storyAlliances,practiceBook,start,setOpeningBook,configureMatch,armClock,expire,choices,play,ai,actor,allied,outcome,personalTotal,total,toll,value,debtSaleValue,levelCost,elementCost,chain,chainRate,sameChain,cards,elements,maps,board,presets,validBook,forts:maps.classic?.forts||[]};
 }
const editionParam=typeof location==='undefined'?null:new URLSearchParams(location.search).get('edition');
// The newer editions start only when their data file is on the page; otherwise the PS2 game opens.
const modernEditionsReady=typeof module!=='undefined'||typeof CepterEditionModern!=='undefined';
const Cepter=createCepter(['dc','saturn','ps1'].includes(editionParam)||modernEditionsReady&&['saga','revolt','begins'].includes(editionParam)?editionParam:'ps2');
if(typeof module!=='undefined'){module.exports=Cepter;module.exports.createEdition=createCepter;}
