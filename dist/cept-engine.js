/* A single-area introductory match. All state is serializable between decisions. */
function createCepter(edition="ps2"){
  const originalMaps=typeof module==='undefined'?CepterMaps:require('./cept-maps.js');
  const record=typeof module==='undefined'?CepterMatchRecord:require('./cept-match-record.js');
  const editions=edition==="ps2"?null:typeof module==="undefined"?CepterEditions:require("./cept-editions");
  const maps=editions?editions.boards(edition,originalMaps):originalMaps;
  const original=typeof module==='undefined'?CepterCards:require('./cept-cards.js');
  const board=s=>maps[(s.mapId?.startsWith('ps2-')&&!s.layoutRevision?'legacy-':'')+(s.mapId||'classic')];
  const firstEdition=edition==='saturn'||edition==='ps1',revolt=edition==='revolt',handheld=edition==='3ds',begins=edition==='begins';
  const elements=['화','수','지','풍'];
  const creature=(name,element,st,hp,cost)=>({name,kind:'creature',element,st,hp,cost});
  const item=(name,st,hp,cost)=>({name,kind:'item',st,hp,cost});
  const spell=(name,effect,cost)=>({name,kind:'spell',effect,cost});
  let cards=[
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
    if(flatFeeShop)return (board(s).cardShops?.[at]||[]).map(name=>flatFeeShopIds.get(name)).filter(Number.isInteger);
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
  const deployable=(s,id)=>!fx.idol(s,'marbleidol')||!s.tiles.some(v=>v.unit?.id===id);
  function canOccupy(c,t,unlock=false){
    if(unlock)return true;
    const terrain=claimTerrain(t,c),color='RBGY'[terrain]||(terrain==='무속성'?'N':'');
    const banned=c.catalog?.placement?.split(',').filter(Boolean)||[];
    const words=c.catalog?.ability.match(/Land Limit: ((?:no(?:fire|water|earth|air|neutral)\s*)+)/)?.[1]||'';
    const land=['fire','water','earth','air'][terrain]||(color==='N'?'neutral':null);
    return c.landBan!==terrain&&!banned.includes(color)&&!(land&&words.includes('no'+land));
  }
  const allowed=(s,i,c,t)=>canOccupy(c,t,s.players[i].status==='release')&&(s.players[i].status==='aetherflash'||combo.activeWorld(s)==='brightworld'||fx.idol(s,'goldidol')||
    [...'RBGY'].every((v,e)=>s.tiles.filter(t=>(handheld?allied(s,i,t.owner):t.owner===i)&&t.type===e).length>=(c.catalog?.additionalCost||'').split(',').filter(k=>k===v).length));
  const sacrificeRequired=(s,c)=>c.catalog?.additionalCost?.includes('+[]')&&!(c.kind==='creature'&&(s.players[s.turn].status==='aetherflash'||combo.activeWorld(s)==='brightworld'||fx.idol(s,'goldidol')));
  const canEquip=(unit,gear,active,unlock=false,state)=>gear.kind==='item'?(unlock||!unit.ban?.includes(gear.category||(gear.st?'weapon':'armor')))&&
    !((begins||revolt)&&active?.enchant==='metalform'&&gear.category==='armor'):
    gear.kind==='creature'&&(gear.itemCreature||unit.support&&!(handheld&&state&&fx.idol(state,'bronzeidol'))&&(!unit.supportElements||unit.supportElements.some(e=>combo.hasElement(gear,e)))||['livingshield','livingspear','livingsword'].includes(key(gear)));
  const presets={intro:starter,fire:fireBook};
  const bookSize=edition==='begins'?40:50;
  const openingHandSize=edition==='begins'?5:4;
  const copyLimit=card=>(edition==='begins'&&card?.catalog?.rarity==='E'||handheld&&key(card)==='rainbowpiece')?1:4;
  if(editions)editions.configure(edition,cards,presets,bookSize,copyLimit);
  const evo=revolt?(typeof module==='undefined'?CepterEvo:require('./cept-evo')):null;
  if(evo)cards=evo.catalog(cards);
  const flatFeeShop=revolt||edition==='begins';
  const flatFeeShopIds=flatFeeShop?new Map(cards.flatMap((card,id)=>!card.unlisted&&!card.catalogOnly&&card.catalog?.path?[[card.catalog.path.split('/').pop(),id]]:[])):null;
  const shopCost=id=>flatFeeShop?20:cards[id].cost;
  const modern=!!presets.stronghold;
  const extraSpells=typeof module==='undefined'?CepterExtraSpells:require('./cept-extra-spells.js');
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
  function validateBookSize(book,size,limit=copyLimit){
    if(!Array.isArray(book)||book.length!==size)return false;
    const counts=new Map(),evoSlots=new Set();
    for(const id of book){
      if(!Number.isSafeInteger(id))return false;
      const card=cards[id],count=(counts.get(id)||0)+1;
      if(!card||card.catalogOnly||card.generatedOnly||count>limit(card))return false;
      if(card.evo){
        if(evoSlots.has(card.evoSlot))return false;
        evoSlots.add(card.evoSlot);
      }
      counts.set(id,count);
    }
    return true;
  }
  const validBook=book=>validateBookSize(book,bookSize);
  const validLegacyBook=book=>edition==='begins'&&Array.isArray(book)&&[40,50].includes(book.length)&&validateBookSize(book,book.length,()=>4);
  function shuffledBook(template=starter){
    const book=template.slice();
    for(let i=book.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[book[i],book[j]]=[book[j],book[i]];}
    return book;
  }
  // Begins reshuffles the whole remaining book when a card returns to it.
  // Confirmed in-game at https://culdcept.club/blog/fukumen/20261125194640773.
  function returnToBook(s,seat,id){
    const p=s.players[seat];
    if(!begins){p.book.unshift(id);return;}
    p.book.push(id);
    if(!s.predict)p.book=shuffledBook(p.book);
    for(const q of s.players)if(q.peek?.seat===seat)delete q.peek;
  }
  const discardAtEnd=revolt||edition==='begins';
  const hasHandSpace=p=>p.hand.length<(revolt?10:6);
  function draw(p,s){
    if(revolt&&!hasHandSpace(p))return;
    if(!p.book.length)p.book=refillBook(p);
    if(!p.book.length)return;
    p.hand.push(p.book.pop());
    if(s)for(const watcher of s.players)if(s.players[watcher.peek?.seat]===p)watcher.peek.ids.shift();
  }
  function refillBook(p){
    return shuffledBook((p.recycleTemplate||p.template)?.filter(id=>!p.bannedCards?.includes(id)));
  }
  function dealOpeningBook(p,seat,template,baseHand=4){
    p.template=template.slice();p.book=shuffledBook(template);p.hand=[];
    const drawCount=baseHand+Number(seat===0);
    for(let j=0;j<drawCount;j++)draw(p);
  }
  function limitAllianceEvos(s){
    if(!evo||!s.teams||s.round!==1||s.turn!==0||s.phase!=='spell')return;
    const used=[0,0];
    const order=s.players.map((_,i)=>i).sort((a,b)=>
      Number(!!s.players[b].explicitOpening)-Number(!!s.players[a].explicitOpening)||a-b);
    for(const seat of order){
      const p=s.players[seat],requested=p.evoOpeningBook||p.template,team=s.teams[seat];
      if(!requested.some(id=>cards[id]?.evo))continue;
      const next=[],ordinary=new Map();
      for(const id of requested)if(!cards[id].evo)ordinary.set(id,(ordinary.get(id)||0)+1);
      let limited=0;
      for(const id of requested){
        if(!cards[id].evo||used[team]<2){
          next.push(id);if(cards[id].evo)used[team]++;
          continue;
        }
        const replacement=presets.intro.find(id=>cards[id].kind==='creature'&&(ordinary.get(id)||0)<4)??
          cards.findIndex((c,id)=>c.kind==='creature'&&!c.unlisted&&!c.catalogOnly&&!c.generatedOnly&&(ordinary.get(id)||0)<4);
        next.push(replacement);ordinary.set(replacement,(ordinary.get(replacement)||0)+1);limited++;
      }
      if(limited){
        p.evoOpeningBook=requested.slice();p.evoOpeningLimited=limited;
      }else{delete p.evoOpeningBook;delete p.evoOpeningLimited;}
      if(next.some((id,i)=>id!==p.template[i]))dealOpeningBook(p,seat,next);
    }
  }
  function setOpeningBook(s,seat,template){
    const p=s.players[seat];
    if(!p||p.ai||s.round!==1||s.turn!==0||s.phase!=='spell')return false;
    const usesOldBook=edition==='begins'&&p.template?.length===50;
    if(usesOldBook?template?.length!==50||!validLegacyBook(template):!validBook(template))return false;
    dealOpeningBook(p,seat,template,usesOldBook?4:s.openingHandSize??4);
    if(evo&&s.teams){
      p.explicitOpening=true;
      delete p.evoOpeningLimited;delete p.evoOpeningBook;
      limitAllianceEvos(s);
    }
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
  function start(count,humans,target=4000,mapId=handheld?'3ds-original-bend':editions?edition+'-1':'classic',template=presets.intro,aiBook=template,aiLevel=0,alliance='auto',roundLimit=0){
    const storyNames=storyAlliances[mapId];
    const storyCast=!!storyNames&&['story','story-leo'].includes(aiBook)&&count===4&&(alliance==='teams'||alliance==='auto'&&target===0);
    if(aiBook==='story-leo'&&mapId!=='ps2-14')throw Error('레오 동맹은 콴제에서 선택할 수 있습니다.');
    const mapGoal=target===0;
    if(mapGoal)target=maps[mapId]?.storyGoal??maps[mapId]?.defaultGoal??5000;
    if(![2,3,4].includes(count)||!Number.isInteger(humans)||humans<0||humans>count||!(mapGoal&&target===(maps[mapId]?.storyGoal??maps[mapId]?.defaultGoal)||[3000,4000,5000,6000,7000,8000,9000,10000,12000].includes(target))||!Object.hasOwn(maps,mapId)||!validBook(template)||(!storyCast&&!validBook(aiBook))||![0,1,2,3].includes(aiLevel))throw Error('대국 설정 오류');
    if(!['auto','duel',...Object.keys(teamLayouts)].includes(alliance)||Object.hasOwn(teamLayouts,alliance)&&count!==4)throw Error('동맹전은 4인 대국입니다.');
    if(![0,20,30,40,60].includes(roundLimit)&&!(begins&&roundLimit===25))throw Error('지원하지 않는 라운드 제한입니다.');
    const layout=teamLayouts[alliance]||(count===4&&alliance==='auto'&&mapGoal&&storyNames?teamLayouts.teams:null);
    const teams=layout?.slice()||null;
    const players=Array.from({length:count},(_,i)=>{
      const npc=storyCast&&i>=humans?(aiBook==='story-leo'&&i===2?'Leo · Revenge':storyNames[i]):null;
      const seatBook=npc?storyBook(npc):i>=humans&&!storyCast?aiBook:template;
      const p={ai:i>=humans,name:npc||((i>=humans?'AI ':'셉터 ')+(i+1)),cash:maps[mapId].startCash??200,pos:0,dir:0,lap:0,flags:[],hand:[],book:shuffledBook(seatBook),template:seatBook.slice(),symbols:Array((maps[mapId].areaCount||2)*4).fill(0),previous:null};
      for(let j=0;j<openingHandSize;j++)draw(p);return p;
    });
    const s={edition,version:1,layoutRevision:1,storyCast,alliance,teams,mapId,mapGoal,aiLevel,roundLimit,prices:Array((maps[mapId].areaCount||2)*4).fill(maps[mapId].gemStore?50:10),players,target,turn:0,round:1,phase:'spell',tiles:maps[mapId].types.map((type,i)=>({type,area:maps[mapId].areas[i],base:maps[mapId].baseValues?.[i]??maps[mapId].base,owner:-1,level:1,unit:null})),log:[],die:0,visited:[],winner:-1};
    if(edition==='begins')s.openingHandSize=openingHandSize;
    if(revolt){
      players[0].cash+=roundGain(s);
      s.evoMatch=Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
    }
    draw(players[0]);
    if(evo&&teams){players[0].explicitOpening=true;limitAllianceEvos(s);}
    return s;
  }
  function note(s,t){s.log.unshift(t);if(s.log.length>16)s.log.pop();s.logSequence=(s.logSequence||0)+1;}
  function actor(s){
    if(s.phase==='sell')return s.debtor??s.turn;
    if(s.phase==='discard'&&s.discardSeat!=null)return s.discardSeat;
    if(s.phase==='defend')return s.tiles[s.battle.at].owner;
    if(s.phase==='attack')return s.battle.attackerSeat??s.turn;
    if(s.phase==='result'&&isComputer(s,s.turn)){
      for(const seat of [s.battle.attackerSeat,s.battle.defenderSeat])if(seat!=null&&!isComputer(s,seat))return seat;
    }
    return s.turn;
  }
  const levelCost=(t,level,p)=>{
    const cost=(t.base||80)*2**(level-1)-worth(t);
    return p?.status==='magicbooster'?Math.floor(cost/2):cost;
  };
  const elementCost=t=>{
    if(revolt&&t.unit?.enchant!=='paralysis'&&cards[t.unit?.id]?.changeElementCost)return cards[t.unit.id].changeElementCost;
    if(edition==='saga')return t.level*100+(typeof t.type==='number'?200:0);
    return begins&&t.type==='복합'?100:300;
  };
  const worth=t=>(t.base||80)*2**(t.level-1);
  const {territoryType}=combo;
  function claimTerrain(tile,card){
    if(tile.type!=='모프'||!(revolt||begins||edition==='saga'))return tile.type;
    if(card.elements||(revolt||begins)&&card.element<0)return '복합';
    return card.element<0?'무속성':card.element;
  }
  function claim(tile,seat,unit){
    Object.assign(tile,{type:claimTerrain(tile,cards[unit.id]),owner:seat,unit});
  }
  function claimFromHand(tile,seat,unit){
    const enchant=cards[unit.id].entryEnchant;
    if(enchant){combo.clear(unit);unit.enchant=enchant;}
    claim(tile,seat,unit);
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
  const chainType=(s,type)=>typeof type==='number'&&combo.activeWorld(s)==='jointworld'?4+type%2:type;
  const chainName=(s,t)=>chainNames[chainType(s,t.type)];
  const chainNames=[...elements,'화·지','수·풍'];
  const sameChain=(a,b,s)=>a.owner>=0&&typeof a.type==='number'&&allied(s,a.owner,b.owner)&&chainType(s,a.type)===chainType(s,b.type)&&a.area===b.area;
  const chain=(s,t)=>t.owner<0||typeof t.type!=='number'?1:Math.min(5,s.tiles.filter(v=>sameChain(t,v,s)).length);
  const chainRates=begins?[0,10,15,20,25,30]:[0,10,15,18,20,22];
  const chainRate=(s,t)=>chainRates[chain(s,t)]/10;
  const value=(s,t)=>Math.floor(worth(t)*chainRates[chain(s,t)]/10);
  function chainCounts(s){
    const counts=new Map();
    for(const t of s.tiles)if(t.owner>=0&&typeof t.type==='number'){
      const key=[s.teams?.[t.owner]??t.owner,t.area??0,chainType(s,t.type)].join('/');
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
      messages.push((s.teams?String.fromCharCode(65+owner)+'팀':s.players[owner].name)+' · '+(area+1)+'지역 '+chainNames[type]+' · '+change);
    }
    if(messages.length){s.chainNotice=messages.join(' / ');note(s,s.chainNotice);}
  }
  const tollRates=begins?[0,.2,.3,.4,.5,.6]:[0,.2,.3,.4,.6,.8];
  const tollAbility=(t,card=cards[t.unit?.id])=>!(begins&&t.unit?.enchant==='paralysis')&&card;
  function toll(s,t,randomRate=15){
    const card=tollAbility(t),status=s.players[t.owner]?.status;
    if(status==='blackout'||card?.freeToll)return 0;
    const factor=card?.randomToll?randomRate/10:card?.tollFactor||{boggart:2,gnome:1.5,steamgear:.5}[key(card)]||1;
    const enchant={sleep:0,peace:0,barricade:1.3,greed:1.5,fog:.5}[t.unit?.enchant]??1;
    if(status==='uniformity')return enchant?200:0;
    return Math.floor(value(s,t)*tollRates[t.level]*factor*enchant*({sagaTollUp:1.3,sagaTollDown:.7}[status]??1));
  }
  const owedToll=(s,t,seat=s.turn,randomRate=15)=>s.players[seat].status==='goodluck'||s.players[seat].status==='innocence'||s.players[seat].status==='sagaStrut'||s.players[seat].sagaClemency?0:toll(s,t,randomRate);
  function tollRange(s,t,seat){
    if(!tollAbility(t)?.randomToll)return null;
    const low=seat==null?toll(s,t,5):owedToll(s,t,seat,5),high=seat==null?toll(s,t,25):owedToll(s,t,seat,25);
    return low===high?null:[low,high];
  }
  const debtSaleValue=(s,t)=>revolt||begins?Math.floor(value(s,t)*.8):value(s,t);
  const revoltLapBase=(map,laps)=>Math.floor(map.bonus*(1+laps/10));
  const personalTotal=(s,i)=>s.tiles.reduce((v,t)=>v+(t.owner===i?value(s,t):0),s.players[i].cash)+(s.players[i].symbols||[]).reduce((v,n,k)=>v+n*s.prices[k],0);
  const canInvade=(s,attacker,defender)=>defender<0||s.players[attacker]?.status!=='innocence'&&(combo.activeWorld(s)!=='mercifulworld'||total(s,attacker)<=total(s,defender));
  const total=(s,i)=>s.teams?s.players.reduce((sum,_,j)=>sum+(allied(s,i,j)?personalTotal(s,j):0),0):personalTotal(s,i);
  function vacate(t,release=false){t.owner=-1;if(release)t.level=1;t.unit=null;}
  function landValues(s){
    const result=Array(s.prices.length).fill(0);
    for(const t of s.tiles)if(typeof t.type==='number')result[(t.area||0)*4+t.type]+=t.owner<0?worth(t):value(s,t);
    return result;
  }
  function updatePrices(s,before){
    if(!before)return;
    if(!handheld&&!begins&&edition!=='ps2'&&edition!=='saga'){
      landValues(s).forEach((v,k)=>{s.prices[k]=Math.max(1,s.prices[k]+Math.trunc((v-before[k])/100));});
      return;
    }
    s.priceRemainder||=Array(s.prices.length).fill(0);
    landValues(s).forEach((v,k)=>{
      const change=v-before[k]+s.priceRemainder[k],whole=Math.trunc(change/100);
      const price=Math.max(1,s.prices[k]+whole);
      s.prices[k]=begins?Math.min(99,price):price;s.priceRemainder[k]=change-whole*100;
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
  const fx=combo.rules(cards,{board,draw,value,vacate,note,claim,canInvade,canOccupy,hasHandSpace,returnToBook});
  const landSpellDamage=e=>({bolt:20,evilblast:30}[e]??extraSpells?.landDamage[e]);
  const hasLandDamage=e=>!!extraSpells?.landDamage[e]||(begins||handheld)&&['bolt','evilblast'].includes(e)||begins&&e==='shrink';
  function spellHP(s,t,e){
    const u=t.unit;
    if(begins&&e==='shrink')return fx.immuneHP(t)?u.hp:Math.max(0,u.hp-10);
    const damage=landSpellDamage(e);
    if(damage)return u.hp-fx.damageAmount(s,t,damage);
    if(fx.immuneHP(t))return u.hp;
    return edition==='saturn'?Math.min(fx.max(u),u.hp+Math.floor(fx.max(u)/2)):fx.max(u);
  }
  function spellRevival(s,t,e){
    if((begins||handheld)&&hasLandDamage(e)&&fx.name(t.unit)==='jackalope'&&spellHP(s,t,e)===0)
      return cards.find(c=>!c.unlisted&&key(c)==='humbaba')?.name;
  }
  const revivalLabel=(before,after)=>(begins||handheld)&&fx.name(before)==='jackalope'&&fx.name(after)==='humbaba'?cards[after.id].name+' 부활':null;
  const extra=extraSpells?.rules(cards,{fx,combo,board,draw,note,refillBook,returnToBook,vacate,territoryType,advance,arrived,total,personalTotal,value,chain,canOccupy,deployable,claim,claimFromHand,canInvade});
  const shrineModule=edition==='saga'?(typeof module==='undefined'?CepterSagaShrines:require('./cept-saga-shrines')):null;
  const shrine=shrineModule?.rules(cards,{fx,combo,board,draw,note});
  const beginsShrineModule=begins?(typeof module==='undefined'?CepterBeginsShrines:require('./cept-begins-shrines')):null;
  const beginsShrine=beginsShrineModule?.rules(cards,{
    fx,combo,board,draw,note,total,refillBook,setStatus:extraSpells?.setStatus,
    escape(s){
      const p=s.players[s.turn],at=extra.nearest(s,p,t=>territoryType(t.type)&&t.owner<0);
      if(at===p.pos)return null;
      extra.warp(s,at);
      return at;
    }
  });
  const roundGain=s=>Math.min(50,19+s.round);
  function finish(s){
    if(settleDebts(s,'endTurn'))return;
    if(discardAtEnd&&s.players[s.turn].hand.length>6){s.discardReturn='endTurn';s.phase='discard';return;}
    if(s.shrineClemencyUsed){delete s.players[s.turn].sagaClemency;delete s.shrineClemencyUsed;}
    if(s.players[s.turn].status==='magicbooster')fx.clearCepter(s.players[s.turn]);
    delete s.spellArrival;
    if(s.roundLimit&&s.round>=s.roundLimit&&s.turn===s.players.length-1){
      s.phase='over';s.endReason='roundLimit';return;
    }
    nextTurn(s);
  }
  function nextTurn(s){
    delete s.doublecast;
    s.turn=(s.turn+1)%s.players.length;
    if(s.turn===0){s.round++;if(s.world?.until<=s.round)delete s.world;for(const t of s.tiles)if(t.unit?.expires<=s.round)combo.clear(t.unit);for(const q of s.players)if(q.statusUntil<=s.round&&q.status!=='waste')delete q.status;if(s.shineUntil<=s.round){s.prices=s.prices.map(v=>Math.max(1,Math.round(v/1.5)));delete s.shineUntil;}}
    if(s.turn===0&&board(s).pathSwitches&&s.round>=(s.switchRound??5))flipPaths(s,'자동 전환');
    const p=s.players[s.turn];
    if(revolt){
      p.cash+=roundGain(s);
      const now=(s.round-1)*s.players.length+s.turn;
      for(const tile of s.tiles)if(tile.unit?.enchantDeadline<=now)combo.clear(tile.unit);
    }
    extraSpells?.startTurn(s,cards);
    for(let j=0;j<(fx.idol(s,'brassidol')?2:1);j++){draw(p,s);if(p.status==='despair')p.hand.pop();}
    s.phase=!discardAtEnd&&p.hand.length>6?'discard':'spell';s.fixed=0;s.die=0;delete s.rollSum;s.visited=[];
  }
  function price(p,c,s,summoning=true){
    if(p.status==='aetherflash'&&c.kind==='creature'&&summoning)return 90;
    if(p.status==='sagaMagicEra'||p.status==='revoltLifeForce'&&c.kind!=='spell')return 0;
    if(summoning&&s&&p.status==='conspiracy'&&c.kind==='creature'&&s.tiles.some(t=>t.unit&&cards[t.unit.id].cost>c.cost))return 0;
    const status=c.kind==='spell'||edition==='ps1'&&p.status==='lifeforce'&&c.kind==='item'?1:
      ({waste:2,lifeforce:.5,sagaDeduction:.3,sagaInflation:1.3}[p.status]??1);
    const rarity=(combo.activeWorld(s)==='wasteworld'||s&&fx.idol(s,'ivoryidol'))?({S:1.5,R:2,E:2}[c.catalog?.rarity]||1):1;
    return Math.floor(c.cost*rarity*status);
  }
  const isComputer=(s,seat)=>s.players[seat].ai||s.players[seat].status==='haunt';
  function paid(s,p,j,summoning=true){
    const id=p.hand.splice(j,1)[0];p.cash-=price(p,cards[id],s,summoning);return id;
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
      const c=cards[t.unit.id];
      if(revolt&&heal&&c.lapGrowth){
        const prior=fx.max(t.unit),next=prior+c.lapGrowth;
        t.unit.mhp=next>80?c.hp:next;
        t.unit.hp=Math.min(t.unit.hp,t.unit.mhp);
        note(s,c.name+' · 최대 HP '+prior+' → '+t.unit.mhp);
      }
      if(heal&&!(revolt&&(fx.name(t.unit)==='statue'||c.noLapHeal)))t.unit.hp=Math.min(fx.max(t.unit),t.unit.hp+heal);
      if(revolt&&heal&&c.lapStrength)t.unit.st=Math.min(100,fx.strength(t.unit)+10);
    }
  }
  function growDoomDevourers(s){
    for(const t of s.tiles){
      const u=t.unit;
      if(t.owner!==s.turn||fx.name(u)!=='doomdevourer'||u.enchant==='paralysis')continue;
      const prior=fx.max(u),gain=Math.min(10,100-prior);
      u.st=Math.min(100,fx.strength(u)+10);u.mhp=prior+gain;u.hp+=gain;
      note(s,cards[u.id].name+' · 낮은 주사위로 기본 ST와 최대 HP 증가');
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
  const shopBlocked=p=>firstEdition&&p.status==='babble';
  function arrived(s,fromTransit=false){
    const p=s.players[s.turn],tile=s.tiles[p.pos];s.phase='land';
    if(revolt&&p.status==='chargingstep'&&p.hasteRolls===0)fx.clearCepter(p);
    if(revolt&&board(s).gates[p.pos]!=null)readyCreatures(s);
    if(pathSwitch(s,p.pos,p.previous)){
      s.switchRound=s.round+4;
      s.phase='pathSwitch';
      return;
    }
    if(tile.type==='마법진'){offerCircle(s);return;}
    if(!shopBlocked(p)){
      if(tile.type==='보석 상점'){s.phase='gemStore';return;}
      if(shopStock(s).length){s.phase='shop';return;}
    }
    if(tile.unit?.enchant==='mine'){p.cash-=Math.floor(p.cash/2);combo.clear(tile.unit);}
    if((revolt||begins)&&tile.unit?.enchant==='blasttrap'){
      const loss=Math.floor(Math.max(0,p.cash)*.4),hp=tile.unit.hp;
      p.cash-=loss;combo.clear(tile.unit);fx.spellHarm(s,tile,20);
      const damage=hp-(tile.unit?.hp||0);
      s.shrineNotice='폭발 함정 · 마력 −'+loss+'G'+(damage?' · HP −'+damage:'');
      note(s,p.name+' · '+s.shrineNotice);
    }
    if(tile.enchant==='magicfountain'||tile.unit?.enchant==='magicfountain'){
      const magic=edition==='dc'?500:400;
      p.cash+=magic;delete tile.enchant;if(tile.unit)combo.clear(tile.unit);
      note(s,'매직 파운틴 · +'+magic+'G');
    }
    if(edition==='saga'&&tile.type==='분수'&&!fromTransit){
      const prior=p.hand.length,count=Math.min(prior,p.book.length);
      p.hand=[];
      for(let i=0;i<count;i++)draw(p,s);
      s.shrineNotice='분수 · 손패 '+prior+'장 교체 · '+count+'장 뽑음';
      note(s,s.shrineNotice);
      return;
    }
    if(tile.type==='점술관'&&p.status!=='babble'&&p.book.length&&(!revolt||hasHandSpace(p))){s.phase='fortune';return;}
    if(tile.type!=='성소')return;
    if(beginsShrine){beginsShrine.arrive(s);return;}
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
  function creatureStops(s,t,seat){
    if(allied(s,t.owner,seat)||begins&&t.unit?.enchant==='paralysis')return false;
    const name=fx.name(t.unit);
    return name==='kelpie'&&t.type===1||name==='oldwillow'&&t.type===0;
  }
  function advance(s,next,preview=false){
    const p=s.players[s.turn],m=board(s);
    const path=[p.pos];
    s.lastMove={sequence:(s.lastMove?.sequence||0)+1,seat:s.turn,path};
    let fromTransit=false;
    while(s.remaining){
      fromTransit=false;path.push(next);
      p.previous=p.pos;p.pos=next;s.remaining--;
      const t=s.tiles[next];if(t.unit?.enchant==='quicksand'&&(!revolt||s.remaining)){s.remaining=0;combo.clear(t.unit);}
      if(s.remaining&&creatureStops(s,t,s.turn)){
        s.remaining=0;
        if(begins&&!preview)note(s,cards[t.unit.id].name+' · '+p.name+'의 이동 정지');
      }
      if(t.type==='성'){if(!revolt&&!begins&&!handheld)delete p.dream;if(['fairylight','torture','conspiracy','mindblast'].includes(p.status)||edition==='ps1'&&p.status==='lifeforce')extraSpells?.clearCepter(p);if(p.status==='waste')delete p.status;}
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
          const lapIncrement=edition==='saga'||handheld?m.bonus/10:20;
          const lands=s.tiles.filter(v=>handheld?allied(s,v.owner,s.turn):v.owner===s.turn).length;
          const fixed=begins?(p.lap+1)*100:m.bonus+Math.floor(lapIncrement*(p.lap-1));
          const landBonus=begins?(s.players.length===2?60:80):handheld?s.players.length*10:20;
          p.cash+=fixed+landBonus*lands;
          if(handheld){
            for(const [k,n] of p.symbols.entries()){
              if(!n)continue;
              const sideCount=seat=>s.players.reduce((sum,q,i)=>sum+(allied(s,seat,i)?q.symbols[k]:0),0);
              const own=sideCount(s.turn);
              if(s.players.every((_,i)=>allied(s,s.turn,i)||sideCount(i)<own))p.cash+=Math.floor(n*s.prices[k]/10);
            }
          }else{
            const bonus=p.symbols.reduce((sum,n,k)=>sum+(n&&s.players.every(q=>q===p||q.symbols[k]<n)?n*s.prices[k]:0),0);
            p.cash+=Math.floor(bonus/10);
          }if(p.sagaFeast){p.cash+=Math.floor((p.cash-cashBeforeLap)/2);delete p.sagaFeast;}if(p.status==='triumph'){p.cash+=Math.floor((p.cash-cashBeforeLap)*(begins?3:5)/10);extraSpells.clearCepter(p);}
          for(const v of s.tiles){
            if(v.owner!==s.turn||['statue','colossus'].includes(fx.name(v.unit))||begins&&cards[v.unit.id]?.noLapHeal)continue;
            const max=fx.max(v.unit);v.unit.hp=Math.min(max,v.unit.hp+(begins?10:Math.floor(max/5)));
            if(fx.name(v.unit)==='chimera'){
              const st=fx.strength(v.unit);v.unit.st=Math.max(st,Math.min(handheld||begins||edition==='saga'?100:80,st+10));
            }
          }
          if(edition==='saga')for(const q of s.players)if(q!==p&&q.status==='trespass'){
            const bonus=p.cash-cashBeforeLap;q.cash+=bonus;
            note(s,q.name+' · 트레스패스 +'+bonus+'G');
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
      if(t.type==='보석 상점'&&!shopBlocked(p)){s.phase='gemStore';return;}
      if(t.type==='신전'&&p.status!=='babble'){s.phase='temple';return;}
      if(s.remaining){const exits=onward(s);if(exits.length!==1){s.phase='fork';return;}next=exits[0];}
    }
    if(preview){
      s.phase=pathSwitch(s,p.pos,p.previous)?'pathSwitch':s.tiles[p.pos].type==='마법진'?'spellCircle':!shopBlocked(p)&&shopStock(s).length?'shop':'land';
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
  function armBeginsSuddenDeath(s){
    if(s.beginsSuddenDeath&&!s.suddenDeathArmed&&s.players.some((_,seat)=>total(s,seat)>=s.target/2)){
      s.suddenDeathArmed=true;
      note(s,'서든데스 · 목표 총마력의 절반 도달. 이제 마력 고갈 시 대국을 종료합니다.');
    }
  }
  function settleDebts(s,resume){
    armBeginsSuddenDeath(s);
    for(let offset=0;offset<s.players.length;offset++){
      const seat=(s.turn+offset)%s.players.length,p=s.players[seat];
      if(p.cash>=0)continue;
      if(p.symbols.some(Boolean)||s.tiles.some(t=>t.owner===seat)){
        s.debtor=seat;s.debtResume=resume;s.phase='sell';return true;
      }
      if(s.suddenDeathArmed){
        s.phase='over';s.endReason='suddenDeath';
        note(s,'서든데스 · '+p.name+' 마력 고갈');
        return true;
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
    const p=s.players[s.turn],t=s.tiles[p.pos];
    // Draw once when the toll is due, so route previews and shared room views do not consume randomness.
    const variable=tollRange(s,t,s.turn),rate=variable?5+Math.floor(Math.random()*21):15;
    const n=owedToll(s,t,s.turn,rate);
    if(variable)s.mapEffect={sequence:(s.mapEffect?.sequence||0)+1,type:'coin',label:'요위 통행료 '+n+'G · ×'+(rate/10).toFixed(1),tile:p.pos,source:p.pos};
    p.cash-=n;s.players[t.owner].cash+=n;for(const q of s.players)if(q.dream&&q!==s.players[t.owner])q.cash+=Math.floor(n/2);note(s,p.name+' · 통행료 '+n+'G');debt(s);
  }
  function afterTerritory(s){
    if(s.sagaImmediateRoll){delete s.sagaImmediateRoll;s.phase='roll';return;}
    const t=s.tiles[s.players[s.turn].pos];if(t.owner>=0&&!allied(s,t.owner,s.turn))payToll(s);else finish(s);}
  function fatigue(unit){
    if(revolt&&unit&&!cards[unit.id].vigorous&&unit.enchant!=='hyperactive')unit.fatigued=true;
  }
  function territory(s){
    if(begins&&s.spellArrival&&s.spellEffect==='shadowleap')return [];
    if(s.immediateAt!=null)return [s.immediateAt];
    const p=s.players[s.turn];
    if(revolt)return s.tiles.flatMap((t,n)=>allied(s,s.turn,t.owner)&&t.unit&&!t.unit.fatigued?[n]:[]);
    const type=s.tiles[p.pos].type;
    const commandable=t=>handheld?allied(s,s.turn,t.owner):t.owner===s.turn;
    if(p.status==='enlightenment'||type==='성'||edition==='saga'&&type==='신전'||board(s).forts.includes(p.pos))return s.tiles.flatMap((v,n)=>commandable(v)?[n]:[]);
    return [...new Set([...s.visited,p.pos])].filter(n=>commandable(s.tiles[n]));
  }
  function usableCreature(s,seat,id,tile,kind){
    const p=s.players[seat],c=cards[id];
    return c.kind==='creature'&&p.status!=='silence'&&deployable(s,id)&&allowed(s,seat,c,tile)&&
      (kind!=='invade'||!c.stationary)&&price(p,c,s)<=p.cash&&(s.cardPaid||!sacrificeRequired(s,c)||p.hand.length>=2);
  }
  function towerCards(s,at){
    const tile=s.tiles[at],p=s.players[s.turn];
    if(!territoryType(tile.type)||allied(s,tile.owner,s.turn))return [];
    const kind=tile.owner<0?'summon':'invade';
    if(kind==='invade'&&(!canInvade(s,s.turn,tile.owner)||tile.unit?.enchant==='peace'||['sagaFear','pacifism'].includes(p.status)))return [];
    return p.hand.flatMap((id,j)=>usableCreature(s,s.turn,id,tile,kind)?[[kind,j]]:[]);
  }
  function towerTargets(s){
    return s.tiles.flatMap((_,at)=>towerCards(s,at).length?[['towerTo',at]]:[]);
  }
  function territoryDestinations(s,from){
    const {unit,area,owner}=s.tiles[from],name=fx.name(unit),links=board(s).links;
    if((begins||revolt)&&['immobilize','bountyhunt'].includes(unit.enchant))return [];
    const {remoteVacant,remoteVacantElements}=cards[unit.id];
    const nearby=name==='roadrunner'?[...(begins||handheld?links[from]:[]),...links[from].flatMap(j=>links[j]).filter(j=>j!==from)]:links[from];
    const remote=s.tiles.flatMap((tile,j)=>{
      if(tile.unit&&!allied(s,owner,tile.owner)&&unit.enchant!=='paralysis'){
        if(name==='aerogoetia'&&tile.type===3||revolt&&name==='thunderspawn'&&!combo.matchesTerrain(cards[tile.unit.id],tile.type)||
          (edition==='saga'||handheld)&&name==='tengu'&&tile.area===area&&tile.type===3)return [j];
      }
      if(tile.owner>=0||!territoryType(tile.type))return [];
      if((remoteVacant||remoteVacantElements?.includes(tile.type)||begins&&unit.enchant==='spiritwalk')&&unit.enchant!=='paralysis')return [j];
      if(tile.area!==area)return [];
      if(edition==='saga'&&unit.enchant==='paralysis')return [];
      const unrestricted=unit.enchant==='spiritwalk'||!remoteVacant&&name==='blynx';
      return unrestricted||tile.type===3&&(name==='holyllama'||!remoteVacantElements&&name==='wyvern')||!remoteVacantElements&&tile.type===2&&name==='dryad'?[j]:[];
    });
    return new Set([...nearby,...remote]);
  }
  function choices(s){
    if(s.phase==='over')return [];
    const follow=extra?.choices(s);if(follow)return follow.length?follow:[['fizzle']];
    if(s.phase==='teleMove'&&s.secretTravel)return fx.secretMoveExits(s,s.teleFrom).map(n=>['teleTo',n]);
    if(s.phase==='teleMove'&&s.territoryMove)return fx.territoryMoveExits(s,s.teleFrom,s.territoryMove==='adjacent').map(n=>['teleTo',n]);
    if(s.phase==='teleMove'&&['outrage','thrustblow'].includes(s.spellEffect))
      return extra.forcedMoveExits(s,s.teleFrom,s.spellEffect).map(at=>['teleTo',at]);
    if(s.phase==='teleMove'&&s.spellEffect==='chariot')return extra.chariotExits(s,s.teleFrom).map(n=>['teleTo',n]);
    if(['runeHand','lemuresHand'].includes(s.phase))return fx.secretHandChoices(s);
    if(s.phase==='bookWorm')return s.players[s.spellTarget].hand.map((_,j)=>['wormDiscard',j]);
    if(s.phase==='sacrifice')return s.players[s.turn].hand.flatMap((_,j)=>j===s.pendingCard.index?[]:[['sacrifice',j]]);
    if(s.phase==='mindseeker')return Array.from({length:Math.min(6,(s.players[s.spellTarget].book?.length??s.players[s.spellTarget].bookCount??0))},(_,j)=>['eraseDraw',j]);
    if(s.phase==='secretTarget')return [...fx.secretTargets(s,s.secretFrom,s.borrowedSecret),['secretCancel']];
    if(s.phase==='territoryTarget')return fx.territoryTargets(s,s.abilityFrom,s.borrowedAbility);
    if(s.phase==='teleMove')return fx.telekinesisExits(s,s.teleFrom).map(n=>['teleTo',n]);
    const i=actor(s),p=s.players[i],t=s.tiles[p.pos],options=[];
    const hand=(kind,k)=>p.hand.forEach((id,j)=>{
      const c=cards[id],usable=kind==='creature'?usableCreature(s,i,id,t,k):
        c.kind===kind&&(s.cardPaid||!sacrificeRequired(s,c)||p.hand.length>=2)&&price(p,c,s)<=p.cash;
      if(usable)options.push([k,j]);
    });
    switch(s.phase){
      case 'shrineChoice':return s.shrineChoices.map(event=>['shrineChoice',event]);
      case 'spell':
        if(!['lifeforce','bind','quietude'].includes(p.status)){
          hand('spell','cast');
          if(revolt)for(const at of territory(s))if(fx.secretTargets(s,at).length)options.push(['secretArt',at]);
        }
        options.push(['roll']);break;
      case 'spellTarget':{
        const effect=s.spellEffect,canTargetPlayer=q=>combo.activeWorld(s)!=='mistyworld'&&q.status!=='barrier';
        if(effect==='stealgem'){
          const targets=s.players.flatMap((q,j)=>!allied(s,i,j)&&canTargetPlayer(q)&&
            (!board(s).gemStore||stealableGems(p,q).length)?[['targetPlayer',j]]:[]);
          return targets.length?targets:[['fizzle']];
        }
        if(extraTypes?.[effect]||combo.type[effect]){const targets=(extraTypes?.[effect]?extra:fx).targets(s,effect).filter(([k,j])=>k!=='targetPlayer'||effect==='dispelmagic'||canTargetPlayer(s.players[j]));return targets.length?targets:[['fizzle']];}
        if(effect==='shatter'&&fx.idol(s,'graniteidol'))return [['fizzle']];
        if(effect==='plague')return [...new Set(s.tiles.map(t=>t.area))].map(area=>['plagueArea',area]);
        if(effect==='heal'||effect==='bolt'){
          for(const [n,v] of s.tiles.entries()){
            if(effect==='bolt'&&!firstEdition&&allied(s,i,v.owner))continue;
            if(fx.targetable(s,v))options.push(['targetLand',n]);
          }
        }else s.players.forEach((q,j)=>{
          if(canTargetPlayer(q)&&(effect!=='shatter'||!allied(s,i,j)&&q.hand.some(id=>cards[id].kind!=='creature')))options.push(['targetPlayer',j]);
        });
        if(!options.length)options.push(['fizzle']);break;
      }
      case 'suppression':return s.players[s.spellTarget].hand.flatMap((id,j)=>cards[id].kind==='spell'?[['suppressCard',j]]:[]);
      case 'squeeze':return s.players[s.spellTarget].hand.map((_,j)=>['breakCard',j]);
      case 'shatter':return s.players[s.spellTarget].hand.flatMap((id,j)=>cards[id].kind==='creature'?[]:[['breakCard',j]]);
      case 'roll':options.push(['roll']);break;
      case 'direction':return [['direction',1],['direction',-1]];
      case 'fork':return onward(s).map(n=>['route',n]);
      case 'shop':return [...shopStock(s).filter(id=>shopCost(id)<=p.cash&&(!revolt||hasHandSpace(p))).map(id=>['buyCard',id]),['leaveShop']];
      case 'fortune':return revolt&&!hasHandSpace(p)?[['pass']]:[...new Set(p.book.map(id=>cards[id].kind))].map(kind=>['fortuneDraw',kind]);
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
          const capacity=begins?50-p.symbols[k]:50;
          for(let n=1;n<=Math.min(capacity,Math.floor(p.cash/price));n++)options.push(['buySymbol',k,n]);
          for(let n=1;n<=Math.min(50,p.symbols[k]);n++)options.push(['sellSymbol',k,n]);
        });options.push(['leaveTemple']);break;
      case 'spellCircle':return [...s.circleOffers.map(id=>['circleCast',id]),['circleSkip']];
      case 'pathSwitch':return [['switchKeep'],['switchFlip']];
      case 'towerTarget':return [...towerTargets(s),['towerCancel']];
      case 'towerDeploy':return [...towerCards(s,s.towerAt),['towerCancel']];
      case 'land':
        if(s.immediateAt==null&&t.owner>=0&&(handheld||revolt||begins?!allied(s,t.owner,i):t.owner!==i)&&canInvade(s,i,t.owner)&&t.unit?.enchant!=='peace'&&!['sagaFear','pacifism'].includes(p.status))hand('creature','invade');
        if(s.immediateAt==null&&t.owner>=0&&!allied(s,t.owner,i))options.push(['pay']);
        {
          if(s.immediateAt==null&&t.owner<0&&territoryType(t.type))hand('creature','summon');
          if(revolt&&t.type==='사령탑'&&towerTargets(s).length)options.push(['towerAim']);
          const leadIdol=edition==='saga'&&fx.idol(s,'leadidol');
          for(const n of territory(s)){
            const v=s.tiles[n];if(!revolt&&fx.territoryTargets(s,n).length)options.push(['ability',n]);if(!revolt&&fx.name(v.unit)==='goldentotem'&&fx.canUseAbility(s,v))options.push(['totem',n]);for(let level=v.level+1;level<=5;level++){
              if(!fx.levelLocked(v,s)&&p.cash>=levelCost(v,level,p))options.push(['level',n,level]);
            }
            if(!leadIdol)for(const dest of territoryDestinations(s,n)){
              const defender=s.tiles[dest].unit;
              if(defender&&defender.enchant!=='paralysis'&&(begins&&fx.name(defender)==='landurchin'||revolt&&cards[defender.id].moveInvasionWard))continue;
              if(v.unit.enchant!=='thornfetter'&&canInvade(s,v.owner,s.tiles[dest].owner)&&s.tiles[dest].unit?.enchant!=='peace'&&canOccupy(cards[v.unit.id],s.tiles[dest],p.status==='release')&&!fx.isDefensive(v.unit)&&territoryType(s.tiles[dest].type)&&(handheld||revolt||begins?!allied(s,s.tiles[dest].owner,i):s.tiles[dest].owner!==i)&&(p.status!=='pacifism'||s.tiles[dest].owner<0))options.push(['transfer',n,dest]);
            }
            if(!fx.terrainLocked(s,v)&&p.cash>=elementCost(v))elements.forEach((_,e)=>{if(e!==v.type)options.push(['element',n,e]);});
            if(!leadIdol&&s.immediateAt==null&&v.unit.enchant!=='bountyhunt')p.hand.forEach((id,j)=>{if(p.status!=='silence'&&deployable(s,id)&&(s.cardPaid||!sacrificeRequired(s,cards[id])||p.hand.length>=2)&&cards[id].kind==='creature'&&allowed(s,i,cards[id],v)&&price(p,cards[id],s)<=p.cash)options.push(['exchange',n,j]);});
          }
          if(s.immediateAt!=null||t.owner<0||allied(s,t.owner,i))options.push(['pass']);
        }break;
      case 'attack':case 'defend':{
        const tile=s.tiles[s.battle.at],fighter=s.phase==='attack'?s.tiles[s.battle.from]?.unit:tile.unit;
        if(tile.unit.enchant==='dullness'||fighter?.enchant==='paralysis')return [['bare']];
        const unit=cards[s.phase==='attack'?s.battle.inv:tile.unit.id];
        p.hand.forEach((id,j)=>{const gear=cards[id];
          if((p.status!=='sagaBreak'||gear.kind!=='item')&&(!begins||p.status!=='silence'||gear.kind!=='creature')&&
            price(p,gear,s,false)<=p.cash&&canEquip(unit,gear,fighter,p.status==='release',s)&&
            !(p.status==='mesozoicsong'&&fighter?.enchant!=='paralysis'&&gear.category==='scroll'))options.push(['equip',j]);
        });options.push(['bare']);break;
      }
      case 'result':return [['continue']];
      case 'discard':return p.hand.map((_,j)=>['discard',j]);
      case 'sell':return [...s.tiles.flatMap((v,n)=>v.owner===i?[['sell',n]]:[]),...(p.symbols||[]).flatMap((n,k)=>n?[['liquidate',k,Math.min(n,Math.ceil(-p.cash/s.prices[k]))]]:[])];
    }
    return options;
  }
  function supportST(s,at,from,seat,fighter){
    if(revolt||fighter?.enchant==='solitude')return 0;
    return 10*board(s).links[at].filter(n=>n!==from&&allied(s,s.tiles[n].owner,seat)).length;
  }
  function terrainHP(t,unit,card,name,muted){
    if(unit.enchant==='antielement')return 0;
    const any=!muted&&unit.enchant!=='paralysis'&&((card.c??card).anyTerrain||['hornedchameleon','abyssalmonarch'].includes(name)||unit.enchant==='camouflage');
    const bonus=!muted&&unit.enchant!=='paralysis'&&(card.c??card).bonusTerrain?.includes(t.type);
    return any&&(typeof t.type==='number'||t.type==='복합')||bonus?10*t.level:landBonus(card,t);
  }
  function battleGround(s,b){
    const tile=s.tiles[b.at],guard=cards[tile.unit.id],name=key(guard);
    const muted=tile.unit.enchant==='vortex'||name==='seabonze'||key(cards[b.inv])==='seabonze';
    return {hp:terrainHP(tile,tile.unit,guard,name,muted),
      attack:supportST(s,b.at,b.from,b.attackerSeat??s.turn,s.tiles[b.from]?.unit),defense:supportST(s,b.at,b.from,tile.owner,tile.unit)};
  }
  function resolve(s){
    const b=s.battle,t=s.tiles[b.at];
    const lines=[],active=n=>fx.idol(s,n);
    const make=(u,seat,item,defending)=>{
      const c=cards[u.id],gear=cards[item];
      return {u:{...u},c,n:c.basicBattle?null:key(c),seat,gear,g:key(gear),item,defending,land:0,hp:u.hp,st:fx.strength(u),element:c.element,elements:c.elements};
    };
    const A=make(s.tiles[b.from]?.unit||b.invUnit||{id:b.inv,hp:b.invHP??cards[b.inv].hp},b.attackerSeat??s.turn,b.atkItem,false);
    const D=make(t.unit,t.owner,b.defItem,true),sides=[A,D];
    const extra=(typeof module==='undefined'?CepterExtraBattle:require('./cept-extra-battle')).rules(s,b,t,cards,fx,combo,total,lines,chain);
    b.defenderSeat=t.owner;
    const fieldMuted=t.unit.enchant==='vortex'||sides.some(a=>a.n==='seabonze');
    const disk=revolt&&!fieldMuted&&sides.some(a=>a.g==='warlocksdisk');
    const muted=fieldMuted||disk,initialLand=disk?battleGround(s,b).hp:null;
    if(disk)lines.push('워록 디스크 · 장비와 전투 능력 무효');
    const useGear=(a,src)=>{a.gear=src?.gear;a.g=src?.g;a.item=src?.item;};
    const mimic=a=>begins&&a.n==='sonascetic'&&a.gear?.kind==='creature'?a.gear:null;
    const battleAbility=a=>key(mimic(a))||a.n;
    const protection=a=>extra.protectedGear(a)||mimic(a)?.protectGear;
    if(!muted){
      for(const a of sides)if(a.u.enchant==='paralysis'){
        a.n=null;a.c={...a.c,revenge:null,innateScroll:0,blocksAttackAbilities:false,neutralizeScroll:false,protectGear:false,scrollCritical:false,first:false,last:false,half:false,regenerate:false,neutralizes:[],blocksLarge:false,blocksSmall:false,blocksFirst:false,criticalMHP:0,battleHP:0,invadeST:0,doubleAttack:false,
          criticalElements:[],pierceElements:[],reflectElements:[],reflectNormal:false,partialReflect:0,neutralizeNormal:false};
        useGear(a);
      }
      for(const [a,d] of [[A,D],[D,A]])if(a.n==='leprechaun'&&a.gear){useGear(d,a);useGear(a);}
      for(const [a,d] of [[A,D],[D,A]])if((a.g==='thehand'||a.n==='thief'&&!a.gear)&&d.gear&&!protection(d)){useGear(a,d);useGear(d);}
      for(const [a,d] of [[A,D],[D,A]]){
        extra.itemStart(a,d);
        const ability=battleAbility(a);
        const destroy=ability==='gremlin'||['talisman','gremlinamulet'].includes(a.g)||a.g==='stinkbottle'&&(d.gear?.category==='tool'||d.gear?.kind==='creature');
        const target=d.gear?.category;
        const penguin=revolt&&a.n==='kaiserpenguin'&&(target==='tool'||target==='scroll'||d.gear?.kind==='creature');
        const monarch=ability==='abyssalmonarch'&&d.gear?.kind==='item'&&['weapon','tool'].includes(target);
        const duchess=revolt&&ability==='sylvanduchess'&&(['tool','scroll'].includes(target)||d.gear?.kind==='creature');
        const gremlin=a.g==='gremlinclaw'&&['weapon','scroll','tool'].includes(target)||
          a.g==='gremlintooth'&&(['armor','tool'].includes(target)||d.gear?.kind==='creature');
        const revoltBreak=revolt&&d.gear&&(a.g==='reactivearmor'&&target==='weapon'||a.g==='gremlinseye'&&d.gear.catalog?.rarity!=='N');
        const beginsBreak=begins&&(a.g==='corrosiverobe'&&['weapon','scroll'].includes(target)||a.g==='corrosivespear'&&['armor','tool'].includes(target));
        if((destroy||gremlin||monarch||duchess||penguin||revoltBreak||beginsBreak)&&!protection(d)){
          if(d.gear&&(duchess||revoltBreak||beginsBreak||begins&&ability==='gremlin'))lines.push((mimic(a)?.name||a.gear?.name||a.c.name)+' · '+d.gear.name+' 파괴');
          useGear(d);
        }
      }
      for(const a of sides){
        const copied=mimic(a);
        if(copied){
          const {name,catalog,element,elements,kind,st,hp,cost}=a.c;
          a.c={...a.c,...copied,name,catalog,element,elements,kind,st,hp,cost};
          a.n=key(copied);a.mimicked=true;
          lines.push(name+' · '+copied.name+'의 전투 능력 모방');
        }
        if(begins&&a.n==='deathworm')a.suppressPhysicalWard=true;
      }
      const originalIds=sides.map(a=>a.u.id);
      extra.forms(A,originalIds[1]);extra.forms(D,originalIds[0]);
    }
    if(revolt||begins)for(const a of sides)if(a.g==='neutralcloak'){a.element=-1;a.elements=null;}
    const baseStrength=sides.map(a=>fx.strength(a.u));
    const randomStat=()=>s.predict?40:10+Math.floor(Math.random()*61);
    const drawUntil=(p,count)=>{for(let j=p.hand.length;j<count;j++)draw(p,s);};
    for(const a of sides){
      const d=a===A?D:A,owner=s.players[a.seat],other=s.players[d.seat];
      if(muted){useGear(a);a.n=null;}
      if(!begins&&a.n==='sonascetic'&&a.gear?.kind==='creature')a.n=a.g;
      const count=(e)=>s.tiles.filter(v=>v.owner===a.seat&&v.type===e).length;
      if(a.n==='bloodypudding'&&a.gear?.kind==='creature'){
        const max=fx.max(a.u),gain=Math.max(0,Math.min(begins||revolt||edition==='saga'?100:80,max+a.gear.hp)-max);
        a.u.mhp=max+gain;a.u.hp+=gain;
      }
      if(!s.predict&&a.g==='belloflaw'&&other.hand.length){const costs=other.hand.map(id=>cards[id].cost);other.hand.splice(costs.indexOf(Math.max(...costs)),1);}
      if((handheld||begins)&&a.g==='powerbracelet'){a.st=baseStrength[a===A?0:1]*2;a.hp=fx.max(a.u)*2;}
      if((handheld||begins)&&a.n==='camazotz')a.st+=baseStrength[a===A?1:0];
      if((begins||edition==='saga')&&a.n==='avenger'){
        const wealth=personalTotal(s,a.seat);
        const amount=10*(1+s.players.filter((_,seat)=>personalTotal(s,seat)>wealth).length);
        a.st+=amount;a.hp+=amount;
      }
      if(begins&&a.n==='nezha'&&s.tiles.filter(v=>v.owner===d.seat).length-s.tiles.filter(v=>v.owner===a.seat).length>=2)a.st+=30;
      if(begins&&a.n==='shamblingvine'){
        a.st+=10*count(2);
        if(sides.some(side=>combo.enchanted(side.u)))a.hp+=20;
      }
      if(a.n==='vision')a.hp=30;
      if(a.n==='gigantherium'&&(begins?sides.some(side=>combo.enchanted(side.u)):combo.enchanted(t.unit)))a.hp-=20;
      if(a.n==='dragon'){
        if(firstEdition){if(a.defending)a.hp+=10;else a.st+=10;}
        else if(!a.defending){a.hp-=20;a.st+=20;}
      }
      if(a.n==='larvae'&&owner.book.length-other.book.length>=3){a.st+=20;a.hp+=20;}
      if(a.n==='mudman'||a.n==='coati'){
        const boost=5*s.tiles.filter((v,j)=>(!revolt||j!==b.from)&&(a.n==='coati'&&firstEdition?cards[v.unit?.id]?.catalog?.race==='rb':cards[v.unit?.id]?.element===2)).length;
        if(a.n==='mudman')a.hp+=boost;else a.st+=boost;
      }
      if(a.n==='wereboar'&&(begins||!a.defending))a.st+=30;
      if(a.n==='pyrodrake'&&!a.gear){a.st+=20;a.hp+=20;}
      if(a.n==='mastermonk'&&!a.gear){a.st+=30;a.hp-=30;}
      if(a.n==='lilith')a.st=owner.hand.length*10;
      if((revolt||begins)&&a.n==='pulgasari'&&a.gear)a.st+=20;
      if(a.n==='drool')a.st=count(1)*10;
      if(handheld&&a.n==='shadefolk')a.st=s.tiles.filter(v=>v.unit&&cards[v.unit.id].element===d.element).length*10;
      if(a.n==='undine')a.hp=count(1)*20;
      if(revolt&&a.n==='gargoyle'&&a.defending)a.st=50;
      if(revolt&&a.n==='thunderspawn')a.st+=count(1)*10;
      if(revolt&&a.n==='cactuswall'&&[1,3].includes(d.element))a.hp+=50;
      if(revolt&&a.n==='tigerweta'&&board(s).links[b.at].some(at=>at!==b.from&&s.tiles[at].owner===a.seat)){
        a.st+=20;a.hp+=20;
      }
      if(a.n==='manticore'){
        if(firstEdition)a.st=a.hp;else a.st=a.hp=owner.hand.length*10;
      }
      if(a.n==='armadillo')a.hp=s.round%2?60:30;
      if(a.n==='mujina')a.st=a.hp=other.hand.length*10;
      if(a.n==='lung')a.st=a.hp=owner.symbols.reduce((sum,n,j)=>sum+(j%4===1?n:0),0);
      if(a.n==='gouda')a.st=a.hp=s.tiles.filter(v=>cards[v.unit?.id]?.element===3).length*10;
      if(a.n==='spectre'||(revolt||begins||edition==='saga')&&a.u.enchant==='liquidform'){a.st=randomStat();a.hp=randomStat();}
      if((revolt||edition==='saga')&&a.g==='spectresrobe'){a.st+=randomStat();a.hp+=randomStat();}
      if(a.n==='nightfiend')a.st+=t.level*20;
      if(a.n==='peri'){
        if(handheld)a.st=a.hp=owner.book.length+10;
        else if(other.book.length-owner.book.length>=3){a.st+=20;a.hp+=20;}
      }
      if(revolt&&!muted&&a.n==='coatlicue'&&owner.book.length>other.book.length){a.st+=20;a.hp+=20;}
      if(a.g==='changingsalve')[a.st,a.hp]=[a.hp,a.st];
      if(a.g==='neutralamulet'||!revolt&&a.g==='neutralcloak'){a.element=-1;a.elements=null;}
      if(!muted){
        extra.baseStats(a,d);
        if(a.c.evoBattle){
          const effect=a.c.evoBattle,stat=effect.endsWith('ST')?'st':'hp';
          if(effect.startsWith('land'))a[stat]=s.tiles.filter(v=>v.owner===a.seat).length*10;
          if(effect.startsWith('round'))a[stat]+=s.round;
          if(effect.startsWith('element'))a[stat]+=5*s.tiles.filter(v=>v.unit&&cards[v.unit.id].element===a.element).length;
          if(effect.startsWith('age'))a[stat]+=a.c.evoAge*4;
        }
      }
      a.land=a.defending?(initialLand??terrainHP(t,a.u,a,a.n,muted)):0;
      const gloveGear=revolt&&a.g==='livingglove',gloveCreature=revolt&&!muted&&a.n==='livingglove';
      const glovePower=gloveGear||gloveCreature?5*s.tiles.filter(v=>v.unit&&!combo.hasElement(cards[v.unit.id],a.element)).length:0;
      if(gloveCreature)a.st=a.hp=glovePower;
      a.hp+=a.land+(gloveGear?glovePower:a.gear?.hp||0)+(muted?0:a.c.battleHP||0);
      a.st+=supportST(s,b.at,b.from,a.seat,a.u)+(gloveGear?glovePower:a.gear?.st||0)+(muted?0:a.c.battleST||0);
      if(!muted){
        if(!a.defending)a.st+=a.c.invadeST||0;
        if(a.u.enchant!=='paralysis'){
          if(owner.status==='bravesong')a.st+=20;
          if(owner.status==='toughsong')a.hp+=20;
        }
        if(a.n==='manes'&&combo.enchanted(t.unit))a.hp+=20;
        if(a.g==='terrair')a.st+=count(3)*20;
        if(a.g==='mujinamask')a.hp+=other.hand.length*10;
        if(handheld&&a.g==='powercrown')a.hp+=baseStrength[a===A?1:0];
        if(a.u.enchant==='regeneration')a.hp+=20;
        if(a.u.enchant==='vitality'){a.hp+=20;a.st+=20;}
        if(a.u.enchant==='hustle'){a.hp+=30;a.st+=30;}
        if(a.u.enchant==='disease'){a.hp-=20;a.st-=20;}
        if(!revolt&&!handheld&&edition!=='begins'&&a.u.enchant==='greed')a.hp-=10;
        if(revolt&&extra.boost('madharlequin',a,true)){
          const nearby=board(s).links[b.at].filter(j=>j!==b.from&&s.tiles[j].owner===a.seat).length;
          a.hp+=nearby*20;a.st+=nearby*20;
        }
        if(a.element===-1&&extra.boost('borgess',a))a.hp+=20;
        if(a===A&&extra.boost('tetramorph',a))a.hp-=20;
        if(revolt&&a===A&&extra.boost('deadwarlord',a))a.st+=10;
        if(extra.boost('virus',a))a.hp-=10;
        if(a.element===2&&extra.boost('sphinx',a))a.hp-=10;
        if(a.gear?.scrollAsItem)a.st=a.gear.scrollAsItem;
        else if(a.gear?.category==='scroll'){
          if(a.g==='aurastrike')a.st=baseStrength[a===A?0:1];
          else if(a.gear.scrollTerritoryElements)a.st=a.gear.scrollTerritoryElements.reduce((sum,e)=>sum+count(e),0)*10;
          else a.st=a.gear.st||0;
        }
        if(!a.gear&&a.c.innateScroll)a.st=a.c.innateScroll==='base'?fx.strength(a.u):a.c.innateScroll;
        if(!firstEdition&&a.n==='sorcerer'&&!a.gear)a.st=20;
        if(['reflect','nullify'].includes(a.gear?.effect)||handheld&&a.u.enchant==='reflection')a.st=0;
      }
      if(!handheld&&!begins&&a.g==='powerbracelet')a.st*=2;
      if(a.g==='petrifystone'){a.st=0;a.hp=80+a.land;}
      a.st=Math.max(0,a.st);
      if(revolt&&a.n==='sludgetitan'&&a.u.hp<fx.max(a.u)){
        a.hp=0;lines.push(a.c.name+' · 최대 HP 상태가 아니어서 파괴');
      }
    }
    const health=()=>sides.map(a=>Math.max(0,a.hp));
    b.guard=D.u.id;b.guardHP=D.u.hp;b.attackST=A.st;b.defendST=D.st;b.landHP=D.land;b.startHP=health();b.strikes=[];b.forms=sides.map(a=>a.u.id);
    function trackDamage(a,damage,normal){
      if(edition==='saga'||revolt||begins)a.receivedDamage=(a.receivedDamage||0)+damage;
      if(normal)a.ordinaryDamage=(a.ordinaryDamage||0)+damage;
    }
    function reflectNormal(a,damage){
      a.hp-=damage;
      trackDamage(a,damage,edition==='saga');
      if((edition==='saga'||revolt)&&a.hp<=0)a.defeatedByOpponent=true;
    }
    function hit(a,d){
      const scroll=a.gear?.category==='scroll'||a.gear?.scrollAsItem||!muted&&!a.gear&&(a.c.innateScroll||!firstEdition&&a.n==='sorcerer'),orb=a.gear?.effect==='orb'||a.suppressPhysicalWard;
      const weapon=a.gear?.kind==='item'?a.gear:null,guard=d.gear?.kind==='item'?d.gear:null;
      const has=combo.hasElement,matches=(elements,side)=>elements?.some(e=>has(side,e));
      const pierce=!scroll&&!muted&&(matches(a.c.pierceElements,d)||a.c.pierceAll||a.c.pierceBaseSTAtLeast&&fx.strength(d.u)>=a.c.pierceBaseSTAtLeast||weapon?.pierceAll||matches(weapon?.pierceElements,d));
      const beastCritical=revolt&&a.n==='lonebeast'&&board(s).links[b.at].some(at=>at!==b.from&&s.tiles[at].owner===a.seat);
      const elementalCritical=!scroll&&!muted&&(beastCritical||matches(a.c.criticalElements,d)||matches(weapon?.criticalElements,d)||matches(weapon?.criticalOwnElements,a)||weapon?.criticalRarity&&a.c.catalog?.rarity===weapon.criticalRarity);
      const penetrates=pierce||['drool','nightmare','trojanhorse'].includes(a.n)||a.n==='trenchworm'&&d.element===3||a.n==='lavaworm'&&d.element===1||a.g==='rubyring'&&d.element===0||a.g==='amberring'&&d.element===3||a.g==='sapphirering'&&d.element===1||a.gear?.effect==='pierceEarth'&&d.element===2;
      if(!scroll&&penetrates&&!orb&&d.n==='bunyip'){lines.push('관통 공격 무효');return 'block';}
      let damage=a.st;
      if(scroll&&['deathgaze','pegasus'].includes(d.n))return 'block';
      if(elementalCritical||!scroll&&begins&&a.n==='juggernaut'&&fx.strength(d.u)>=40||extra.critical(a,d,scroll)||scroll&&(a.gear?.effect==='freeze'&&d.element===0||a.gear?.critical===d.element||!muted&&(matches(a.gear?.scrollCriticalElements,d)||matches(a.c.scrollCriticalElements,d))||a.c.scrollCritical||['ninja','sorcerer','witch'].includes(a.n))||!scroll&&(
        a.g==='wateramulet'&&a.element===1||a.g==='fireamulet'&&a.element===0||a.g==='dragonhelm'&&[0,3].includes(d.element)||
        a.g==='flametongue'&&d.element===1||a.g==='rockbiter'&&d.element===2||a.g==='airslasher'&&d.element===3||
        !muted&&(a.c.criticalMHP&&fx.max(d.u)<=a.c.criticalMHP||a.c.criticalLargeMHP&&fx.max(d.u)>=a.c.criticalLargeMHP)||a.n==='paladin'&&d.element===-1||a.n==='uriel'&&combo.enchanted(d.u)||!muted&&a.c.criticalRace&&a.c.criticalRace===d.c.catalog?.race||!firstEdition&&a.n==='darkelf'&&d.element===3||a.n==='gladiator'&&d.element>=0||!firstEdition&&a.n==='knight'&&fx.max(d.u)>=50||a.n==='firegiant'&&d.element===1||a.n==='stormgiant'&&d.element===0||a.n==='migoal'&&[1,2].includes(d.element)||a.n==='grendel'&&fx.strength(d.u)<=20))damage=Math.floor(damage*1.5);
      if(!muted&&a.u.enchant!=='paralysis'&&s.players[a.seat].status==='sinkingsong')damage=Math.floor(damage/2);
      const ward=muted?null:extra.protect(a,d,damage,scroll,penetrates,orb);
      if(ward==='block'||ward==='heal')return ward;
      const reflected=ward==='reflect'||scroll&&d.n==='carbuncle';
      if(edition==='saga'&&a.g==='blasterray'){
        const target=reflected?a:d;
        if(s.predict?!s.raySuccess:Math.random()>=.5){lines.push('블래스터 레이 · 이동 실패');return reflected?'reflect':'miss';}
        extra.vacant(target);target.keepForcedForm=true;
        if(target.hp<=0)lines.push('블래스터 레이 · 빈 영지가 없어 격파');
        return reflected?'reflect':'hit';
      }
      if(a.g==='sleep'||a.g==='death'){
        const target=reflected?a:d;
        if(a.g==='sleep'){combo.clear(target.u);target.u.enchant='sleep';lines.push('수면 · 통행료 없음');}
        else if(!s.predict&&Math.random()<.6)target.hp=0;
        return reflected?'reflect':'hit';
      }
      if(reflected){
        if(ward!=='reflect')a.hp-=damage;
        trackDamage(a,damage,false);
        lines.push('스크롤 반사 '+damage);return 'reflect';
      }
      if(!scroll&&!muted){
        if(a.n==='hellhound'&&d.element===1)damage=Math.floor(damage/2);
        const reflects=d.c.reflectNormal||matches(d.c.reflectElements,a)||guard?.reflectNormal||matches(guard?.reflectElements,a)||
          d.gear?.effect==='reflect'||d.u.enchant==='reflection'||d.n==='decoy'||revolt&&d.g==='mirrorhoplon'&&!a.gear;
        const blocks=revolt&&d.u.enchant==='energyfield'||(begins||revolt)&&d.u.enchant==='metalform'||d.c.neutralizeNormal||guard?.neutralizeNormal||matches(guard?.neutralizes,a)||
          d.gear?.effect==='nullify'||d.g==='buckler'&&fx.strength(a.u)<=30||d.g==='watershield'&&(d.element===1||a.element===1)||
          revolt&&(d.g==='stormshield'&&[1,3].includes(d.element)||d.g==='magmashield'&&[0,2].includes(d.element))||
          d.g==='earthshield'&&(d.element===2||a.element===2)||d.g==='windshield'&&(d.element===3||a.element===3)||d.g==='dragonhelm'&&[1,2].includes(a.element)||
          matches(d.c.neutralizes,a)||d.c.blocksBaseSTAtMost!=null&&fx.strength(a.u)<=d.c.blocksBaseSTAtMost||
          d.c.blocksBaseSTAtLeast!=null&&fx.strength(a.u)>=d.c.blocksBaseSTAtLeast||d.c.blocksLarge&&fx.max(a.u)>=(edition==='saga'&&d.n==='rahab'?50:40)||d.c.blocksSmall&&fx.max(a.u)<=30||d.c.blocksFirst&&a.c.first||
          d.n==='caitsith'&&fx.strength(a.u)>=40||d.c.blocksWithArmor&&d.gear?.category==='armor'||(revolt||begins)&&d.n==='apsaras'&&t.level>=3||d.n==='undine'&&a.element===1||d.n==='migoal'&&[0,3].includes(a.element);
        if(!orb&&reflects&&!(revolt&&blocks)){reflectNormal(a,damage);lines.push('반사 '+damage);return 'reflect';}
        if(!orb&&blocks){lines.push('공격 무효');return 'block';}
        if(!orb&&d.c.partialReflect){
          const reflected=Math.floor(damage*d.c.partialReflect);
          reflectNormal(a,reflected);lines.push('반사 '+reflected);return 'reflect';
        }
        if(!orb&&d.g==='towershield')damage=Math.floor(damage/2);
        if(!orb&&revolt&&d.g==='wondercharm')damage=Math.floor(damage/5);
        if(!orb&&d.c.half)damage=Math.floor(damage/2);
        if(!orb&&(['spikeshield','spikedshield'].includes(d.g)||edition==='saga'&&d.n==='spinyagama')){
          const reflected=Math.floor(damage/2);reflectNormal(a,reflected);damage-=reflected;
        }
      }
      if(scroll&&guard?.halveScroll)damage=Math.floor(damage/2);
      if((scroll||penetrates)&&d.land){d.hp-=d.land;d.land=0;lines.push('지형 보너스 관통');}
      d.hp-=damage;lines.push(a.c.name+' → '+damage+' 피해');
      if(damage>0){
        a.dealtDamage=true;
        if(revolt)d.damagedByAttack=true;
        if(!scroll)d.hitByOpponent=true;
      }
      trackDamage(d,damage,!scroll);
      if(handheld&&a.g==='soulblast'&&damage>0){
        const amount=(s.players[a.seat].lap+1)*40;
        s.players[a.seat].cash+=amount;s.players[d.seat].cash-=amount;
        if(s.predict){b.magicLoss??=[0,0];b.magicLoss[+a.defending]-=amount;b.magicLoss[+d.defending]+=amount;}
        lines.push(a.gear.name+' · '+amount+'G 탈취');
      }
      if(begins&&!muted&&a.g==='mindshock'&&damage>0&&d.hp>0){
        combo.clear(d.u);d.u.enchant='sleep';lines.push(a.gear.name+' · 상대에게 수면 부여');
      }
      if(a.u.confused&&!muted)a.hp-=Math.floor(damage*.3);
      const blocksAttackBonus=revolt&&(d.n==='scylla'||d.g==='squidmantle');
      if(damage>0&&!scroll&&!muted&&!blocksAttackBonus&&(edition!=='ps2'||a.hp>0)){
        const creatureEffects=!d.c.blocksAttackAbilities&&!d.gear?.blocksCreatureHits,attacker=creatureEffects?a.n:null;
        if(revolt&&d.hp>0&&(attacker==='saint'&&d.element===-1||attacker==='samurai'&&fx.strength(d.u)>=40&&!s.predict&&Math.random()<.7)){
          d.hp=0;lines.push(a.c.name+' · 즉사');
        }
        if(revolt&&attacker==='nebiros')drawUntil(s.players[a.seat],5);
        if(revolt&&attacker==='shocker')d.u.fatigued=true;
        if(revolt&&d.hp>0&&!s.predict&&(attacker==='chironex'&&a.defending&&Math.random()<.8||
          attacker==='sigurd'&&fx.strength(d.u)>=50&&Math.random()<.6||attacker==='unnameable'&&Math.random()<.7)){
          d.hp=0;lines.push(a.c.name+' · 즉사');
        }
        extra.onHit(a,d,damage);
        if((begins||edition==='saga')&&a.g==='abyssaltome'&&d.hp>0)extra.transform(d,extra.ids.get('statue'));
        if(!s.predict&&a.g==='bladeofculdra'){
          const victim=s.players[d.seat];victim.hand.length=0;
          for(let j=0;j<6;j++)draw(victim,s);
          lines.push('컬드라의 검 · 상대 손패 교체');
        }
        if(attacker==='deathquito'&&s.players[d.seat].hand.length){
          const hand=s.players[d.seat].hand;
          hand.splice(s.predict?0:Math.floor(Math.random()*hand.length),1);
          lines.push('데스키토 · 상대 손패 1장 파괴');
        }
        if(handheld&&attacker==='mystic'&&fx.max(d.u)>=60&&!s.predict&&Math.random()<.7){d.hp=0;lines.push('미스틱 · 즉사');}
        if(revolt&&a.g==='goldenhammer'&&d.hp>0){s.players[a.seat].cash+=200;lines.push('골든 해머 · 200G 획득');}
        if(revolt&&a.g==='moonscimitar'||begins&&['sphinx','wendigo'].includes(attacker)&&d.hp>0){
          combo.clear(d.u);d.u.enchant=attacker==='wendigo'?'fog':'sleep';
        }
        if(attacker==='berserker'){combo.clear(a.u);a.u.confused=true;}
        if(!revolt&&attacker==='samurai'&&!s.predict&&
          (firstEdition?d.c.catalog?.race==='rh':begins?fx.strength(d.u)>=40:fx.max(d.u)<=30)&&
          Math.random()<(firstEdition?.3:begins?.7:.6))d.hp=0;
        if(attacker==='cleric'&&d.element===-1&&(begins||!s.predict&&Math.random()<.8))d.hp=0;
        if(attacker==='willothewisp'||attacker==='amazon'&&!a.gear){
          const available=s.players[d.seat].cash;
          const amount=begins&&attacker==='willothewisp'?Math.max(0,a.hp)*2:Math.min(available,attacker==='amazon'?(s.players[a.seat].lap+1)*(s.edition==='revolt'?30:20):Math.min(a.hp,a.u.hp)*2);
          s.players[d.seat].cash-=amount;s.players[a.seat].cash+=amount;
          if(begins&&amount){
            if(s.predict){b.magicLoss??=[0,0];b.magicLoss[+d.defending]+=amount;b.magicLoss[+a.defending]-=amount;}
            lines.push(a.c.name+' · '+amount+'G 탈취');
          }
        }
        if(creatureEffects&&(a.c.poison||a.c.confuse||a.c.paralyze)&&(!a.c.statusRaces||a.c.statusRaces.includes(d.c.catalog?.race))||attacker==='nike'||a.g==='clawoftheghoul'||(revolt||begins||handheld)&&a.g==='bindingwhip'){
          combo.clear(d.u);if(creatureEffects&&a.c.poison)d.u.poisoned=true;else if(creatureEffects&&a.c.confuse)d.u.confused=true;else d.u.enchant='paralysis';
        }
        if((revolt||begins)&&a.g==='ringofthesuccubus'||revolt&&attacker==='shadowgeist'||begins&&attacker==='succubus'){
          const fixed=d.gear?.category==='scroll'||d.g==='petrifystone'||d.c.evoBattle==='landST'||d.n==='spectre'||d.n==='gargoyle'&&d.defending||d.u.enchant==='liquidform'||begins&&['manticore','lilith'].includes(d.n);
          if(!fixed)d.st=Math.max(0,d.st-fx.strength(d.u));
          d.u.st=0;lines.push((['shadowgeist','succubus'].includes(attacker)?a.c.name:'서큐버스 링')+' · 상대 기본 ST 0');
        }else if(attacker==='succubus'||!revolt&&!begins&&a.g==='ringofthesuccubus'||creatureEffects&&a.c.drainST){d.u.st=0;d.st=0;if(a.c.drainST)lines.push('ST 드레인 · 상대 기본 ST 0');}
        if(a.g==='ringofthevampire')a.hp+=damage;
        if(attacker==='bandit'||a.g==='banditsglove'){
          const amount=begins&&attacker==='bandit'?damage*2:Math.min(s.players[d.seat].cash,damage*2);
          s.players[d.seat].cash-=amount;s.players[a.seat].cash+=amount;
          if(begins&&attacker==='bandit'){
            if(s.predict){b.magicLoss??=[0,0];b.magicLoss[+d.defending]+=amount;b.magicLoss[+a.defending]-=amount;}
            lines.push(a.c.name+' · '+amount+'G 탈취');
          }
        }
        if(handheld&&attacker==='remora'){
          const hand=s.players[d.seat].hand;
          if(hand.length){hand.splice(s.predict?0:Math.floor(Math.random()*hand.length),1);lines.push(a.c.name+' · 상대 손패 한 장 파괴');}
        }
        if(a.g==='rathunter'&&d.hp>0)extra.convert(d,'giantrat');
        if(attacker==='wraith'&&!s.predict&&Math.random()<(handheld?.6:.5)){d.hp=0;if(handheld)lines.push(a.c.name+' · 즉사');}
      }
    }
    function reduceBattleMhp(a,loss){
      a.u.mhp=Math.max(0,fx.max(a.u)-loss);
      a.u.hp=Math.min(a.u.hp,a.u.mhp);
      a.hp=a.u.mhp?Math.min(a.hp,a.u.mhp+a.land):0;
    }
    function revenge(a,d){
      const player=s.players[a.seat],opponent=s.players[d.seat];
      let impact=0;
      for(const effect of new Set([a.c.revenge,a.gear?.revenge])){
        if(effect==='destroy'){d.hp=0;lines.push('설욕 · 상대 파괴');}
        if(effect==='shrink'){
          reduceBattleMhp(d,30);
          lines.push('설욕 · 상대 최대 HP −30');
        }
        if(effect==='magic'){
          const amount=Math.floor(Math.max(0,opponent.cash)*.3);
          opponent.cash-=amount;player.cash+=amount;impact+=amount*2;
          lines.push('설욕 · 마력 '+amount+'G 탈취');
        }
        if(effect==='level'&&t.level>1&&!fx.levelLocked(t,s)){
          const prior=value(s,t);t.level--;
          impact+=(prior-value(s,t))*(allied(s,a.seat,t.owner)?-1:1);
          lines.push('설욕 · 영지 Lv.'+t.level);
        }
        if(effect==='symbols'){
          const most=Math.max(0,...opponent.symbols),i=opponent.symbols.indexOf(most),amount=Math.floor(most*.3);
          if(amount>0){opponent.symbols[i]-=amount;player.symbols[i]+=amount;impact+=amount*s.prices[i]*2;}
          lines.push('설욕 · 호부 '+amount+'개 탈취');
        }
        if(effect==='hand'){
          let removed=0;
          while(removed<2&&opponent.hand.length){
            const i=s.predict?0:Math.floor(Math.random()*opponent.hand.length);
            const [id]=opponent.hand.splice(i,1);removed++;
            impact+=20+cards[id].cost*.2;
          }
          lines.push('설욕 · 상대 손패 '+removed+'장 파괴');
        }
        if(effect==='fossil'&&d.hp>0){
          extra.transform(d,extra.ids.get('greatfossil'));
          useGear(d);
          lines.push('설욕 · 그레이트 포실로 변신');
        }
      }
      if(s.predict)b.revengeValue=(b.revengeValue||0)+(a===A?1:-1)*impact;
    }
    if(combo.activeWorld(s)==='mirrorworld')for(const a of sides){
      const count=s.tiles.filter(v=>v.unit?.id===a.u.id).length;
      if(count<2)continue;
      a.hp=0;lines.push('미러 월드 · '+a.c.name+' 격파');
    }
    const priority=(a,d)=>muted?0:a.g==='hourglass'||d.g!=='hourglass'&&(a.c.first||a.gear?.first||a.u.enchant==='wing'||['earthamulet','wingedboots','sling','swordofthefalcon','ringofthesuccubus','ringofthevampire'].includes(a.g)||a.defending&&active('silveridol'))?1:a.c.last||a.gear?.last?-1:0;
    const order=priority(D,A)>priority(A,D)?[D,A]:[A,D];
    for(const a of order){
      const d=a===A?D:A;
      const attacks=['cerberus','pushpull'].includes(a.n)||a.gear?.doubleAttack||a.c.doubleAttack?2:1;
      for(let j=0;j<attacks&&a.hp>0&&d.hp>0&&a.away==null&&d.away==null&&!a.stolen&&!d.stolen&&!a.returned&&!d.returned;j++){
        const start=lines.length;
        if(!muted&&a.u.enchant==='paralysis'){lines.push('마비 · 공격 불가');break;}
        const bounty=revolt&&d.u.enchant==='bountyhunt'&&a.gear?.category==='weapon';
        const effect=hit(a,d)||'hit';
        if(bounty&&d.hp<=0&&effect==='hit'){
          s.players[a.seat].cash+=300;
          if(s.predict){b.magicLoss??=[0,0];b.magicLoss[+a.defending]-=300;}
          lines.push('현상 수배 · 300G 획득');
        }
        if(edition==='saga'||handheld||revolt){
          if(d.hp<=0)d.defeatedByOpponent=true;
          if(effect==='reflect'&&a.hp<=0)a.defeatedByOpponent=true;
        }
        if(!muted&&a.hp>0&&a.st>0&&['block','reflect'].includes(effect)){
          if(handheld&&a.gear?.category!=='scroll')revenge(a,d);
          if(revolt&&a.g==='napalmarrow'){
            reduceBattleMhp(d,40);
            lines.push(a.gear.name+' · 상대 최대 HP −40');
          }
        }
        b.strikes.push({effect,side:a===A?0:1,hp:health(),notes:lines.slice(start)});
      }
    }
    const basalt=active('basaltidol');
    const creatureEnd=!muted&&!basalt&&combo.activeWorld(s)!=='naturalworld';
    const itemEnd=!muted&&(edition!=='saga'||!basalt);
    const opal=edition==='saga'&&active('opalidol');
    if(edition==='saga'&&creatureEnd)for(const a of sides){
      const d=a===A?D:A;
      if(a.n!=='flyingpuffer')continue;
      if(a.hp<=0&&a.defeatedByOpponent&&d.hp>0){
        d.hp=0;d.defeatedByOpponent=true;lines.push(a.c.name+' · 격파될 때 상대도 파괴');
      }else if(a.hp>0&&d.hp<=0&&d.defeatedByOpponent){
        a.hp=0;lines.push(a.c.name+' · 상대를 격파한 뒤 자신도 파괴');
      }
    }
    function applyPoison(a){
      if(a.hp<=0||!a.u.poisoned)return;
      const loss=Math.floor(fx.max(a.u)*(edition==='saga'?.3:.5));
      a.hp=Math.min(a.hp,a.u.hp)-loss;lines.push('독 · '+loss+' 피해');
    }
    if((revolt||handheld)&&creatureEnd)for(const a of order){
      if(a.n==='pyromancer'&&a.hp>0&&a.hitByOpponent){
        a.u.st=20;a.u.mhp=30;a.u.hp=Math.min(a.u.hp,30);a.hp=Math.min(a.hp,30+a.land);
        lines.push(a.c.name+' · 기본 ST 20 · 최대 HP 30');
      }
    }
    if(revolt&&!muted)for(const a of order){
      const rival=a===A?D:A;
      if(creatureEnd&&a.n==='rocktitan'&&a.hp>0){
        a.u.st=Math.max(0,fx.strength(a.u)-10);reduceBattleMhp(a,10);
        lines.push(a.c.name+' · 기본 ST·최대 HP −10');
      }
      if(creatureEnd&&a.n==='pulgasari'&&a.hp>0&&rival.gear){
        const cap=fx.max(a.u),gain=Math.max(0,Math.min(10,100-cap));
        a.u.mhp=cap+gain;a.u.hp+=gain;a.hp+=gain;
        if(gain)lines.push(a.c.name+' · 최대 HP +'+gain);
      }
      applyPoison(a);
      if(a.u.enchant==='senility')a.hp=0;
    }
    if((edition==='saga'||revolt||begins)&&itemEnd)for(const a of order){
      const d=a===A?D:A;
      if(a.g==='angrymask'&&a.hp>0&&d.hp>0&&a.receivedDamage>0){
        d.hp=Math.min(d.hp,d.u.hp)-a.receivedDamage;
        if(edition==='saga'&&d.hp<=0)d.defeatedByOpponent=true;
        lines.push(a.gear.name+' · 상대 기본 HP에 '+a.receivedDamage+' 피해');
      }
    }
    for(const a of sides){
      const d=a===A?D:A,originalName=a.n;
      if(!creatureEnd)a.n=null;
      if(!muted){
        const opponentAlive=d.hp>0;
        extra.end(a,d,creatureEnd,itemEnd);
        if(revolt&&creatureEnd&&a.n==='scylla'&&a.hp>0&&d.hp>0){
          combo.clear(d.u);d.u.enchant='sleep';lines.push('스킬라 · 상대 영지 통행료 무효');
        }
        if(edition==='saga'&&opponentAlive&&d.hp<=0)d.defeatedByOpponent=true;
      }
      if(!revolt&&!muted)applyPoison(a);
      if(!muted&&a.hp>0&&(creatureEnd&&(opal||a.c.regenerate||['greenmold','healer'].includes(a.n))||a.n==='hydra'&&t.type!==0||(edition!=='saga'||!basalt)&&a.u.enchant==='regeneration'||itemEnd&&a.g==='fireamulet')){
        a.regenerated=a.heal=true;a.hp=fx.max(a.u);lines.push('재생 · HP 회복');
      }
      if(revolt&&a.hp>0&&d.hp>0&&a.n==='samhain'){
        const loss=Math.min(fx.max(d.u),fx.strength(a.u));
        d.u.mhp=fx.max(d.u)-loss;d.u.hp=Math.min(d.u.hp,d.u.mhp);
        if(!d.u.hp)d.hp=0;
        if(loss)lines.push(a.c.name+' · 상대 최대 HP −'+loss);
      }
      if(a.hp>0&&(a.n==='lunatichare'||itemEnd&&a.g==='lunastone')&&d.hp>0){
        if(begins&&a.n==='lunatichare'){
          const priorST=Math.max(0,fx.strength(d.u));
          d.u.st=Math.max(0,Math.min(d.hp,d.u.hp));
          d.u.hp=d.u.mhp=d.hp=priorST;
          lines.push(a.c.name+' · 상대 기본 ST와 HP 교환');
        }else if(revolt&&a.n==='lunatichare'){
          const priorST=fx.strength(d.u);
          d.u.st=fx.max(d.u);
          d.u.hp=d.u.mhp=d.hp=priorST;
          lines.push(a.c.name+' · 상대 기본 ST와 최대 HP 교환');
        }else{
          const st=Math.max(0,d.st);d.u.st=Math.max(0,Math.min(d.hp,fx.max(d.u)));d.hp=st;
        }
      }
      const livingBomb=revolt&&(a.n==='livingbomb'||itemEnd&&a.g==='livingbomb');
      if(a.hp>0&&a.hp<=20&&(livingBomb||a.n==='mandrake'||itemEnd&&a.g==='gemoflife')){
        if(livingBomb)lines.push('리빙 봄 · 폭발로 양측 격파');
        if(edition==='saga'&&d.hp>0)d.defeatedByOpponent=true;
        a.hp=d.hp=0;
      }
      if(a.n==='golem'&&a.hp>0){a.u.st=Math.max(0,fx.strength(a.u)-10);if(!firstEdition&&!begins&&!handheld)a.hp=Math.min(a.hp,a.u.hp)-10;}
      if(a.g==='boomerang'&&edition!=='saga'&&edition!=='begins'&&!firstEdition&&(!revolt||a.n!=='centaur'||a.hp<=0)&&hasHandSpace(s.players[a.seat]))s.players[a.seat].hand.push(a.item);
      if(a.n==='zombie'&&a.hp>0){
        a.hp=(begins?Math.min(a.hp,a.u.hp):a.hp)-20;
        if(begins)lines.push('좀비 · 기본 HP 20 감소');
      }
      const needsSurvivor=(revolt||begins||edition==='saga')&&a.n==='baal'||(begins||edition==='saga')&&a.n==='behemoth';
      if(['behemoth','baal','remora'].includes(a.n)&&!(handheld&&a.n==='remora')&&(!needsSurvivor||a.hp>0)){
        const hand=s.players[a.n==='remora'?d.seat:a.seat].hand;
        if(hand.length){
          hand.splice(s.predict?0:Math.floor(Math.random()*hand.length),1);
          if(begins)lines.push(a.c.name+' · 손패 한 장 파괴');
        }
      }
      if(!muted&&(edition!=='saga'||!basalt)&&a.u.enchant==='bulimia'&&a.hp>0){
        const hand=s.players[a.seat].hand;
        if(hand.length){hand.splice(s.predict?0:Math.floor(Math.random()*hand.length),1);lines.push('불리미아 · 손패 1장 파괴');}
      }
      if(itemEnd&&a.g==='death'&&!s.predict&&Math.random()<.4)a.hp=0;
      if(itemEnd&&a.g==='dynamite'||a.n==='wraith'||!revolt&&!muted&&(edition!=='saga'||!basalt)&&a.u.enchant==='senility')a.hp=0;
      const plow=itemEnd&&a.g==='silverplow'&&(!begins||a.hp>0);
      if(!fx.levelLocked(t,s)&&(revolt?a.hp>0:a.hp>0||d.hp>0)&&(a.n==='leshy'||plow)){
        const previous=t.level;
        t.level=Math.min(5,t.level+(a.n==='leshy')+plow);
        if((revolt||begins)&&previous!==t.level)lines.push((plow?a.gear.name:a.c.name)+' · 영지 Lv.'+t.level);
      }
      if(a.item!=null&&(a.n==='centaur'&&edition!=='saga'&&!begins&&(!revolt||a.hp>0)||['neutralamulet','belloflaw'].includes(a.g)))s.players[a.seat].book.unshift(a.item);
      a.n=originalName;
    }
    if(itemEnd){
      const defeated=new Set();
      for(const [a,d] of [[A,D],[D,A]]){
        if(a.hp<=0)continue;
        if(a.g==='corrosiveknife'&&d.hp>0&&d.regenerated){d.defeatedByOpponent=true;defeated.add(d);lines.push('부식 나이프 · 재생한 상대 격파');}
        if(a.g==='deathchoker'){defeated.add(a);lines.push('데스 초커 · 장착 크리처 격파');}
      }
      for(const a of defeated)a.hp=0;
    }
    if(begins&&creatureEnd)for(const a of sides){
      const d=a===A?D:A;
      if(a.n==='amabie'&&a.hp>0&&d.hp>0)extra.vacant(a,1);
    }
    function revive(a){
      const scarab=a.g==='necroscarab'&&(edition!=='saga'||itemEnd&&a.defeatedByOpponent);
      const kudz=begins&&a.n==='kudzufolk'&&s.tiles.filter(v=>v.owner===a.seat).length<=4?'greenmold':null;
      const fossil=edition==='saga'&&['greatfossil','littlefossil'].includes(a.n);
      const creatureForm=creatureEnd&&(!fossil||a.defeatedByOpponent)&&(kudz||a.c.reviveForm||({carbunfly:'carbuncle',mermecoleo:'dragonfly',...(handheld||begins?{greatfossil:'tyrannosaurus'}:revolt?{hellgrammite:'serpentfly'}:{})})[a.n]);
      const itemForm=scarab?(edition==='saga'||revolt?'skeleton':'zombie'):null;
      const opponent=a===A?D:A;
      const amulet=revolt&&(creatureEnd&&a.n==='livingamulet'||itemEnd&&a.g==='livingamulet')&&opponent.gear?.category!=='weapon';
      const form=revolt?creatureForm||itemForm||(amulet?'livingamulet':null):itemForm||creatureForm;
      if(!form||a.revived)return false;
      extra.transform(a,extra.ids.get(form));a.revived=true;
      return true;
    }
    if(edition==='ps2')for(const a of sides)if(a.hp<=0)revive(a);
    for(const a of sides)if(creatureEnd&&a.hp<=0&&a.n==='sulfurousballoon'){
      const d=a===A?D:A,loss=revolt||handheld?40:30;
      d.hp=Math.min(d.hp,d.u.hp)-loss;
      if(revolt)lines.push(a.c.name+' · 상대 기본 HP −'+loss);
    }
    if(revolt&&itemEnd)for(const a of sides)if(a.hp<=0&&a.g==='burningheart'){
      const d=a===A?D:A;
      if(d.hp>0){d.hp=0;lines.push(a.gear.name+' · 상대 크리처도 격파');}
    }
    if(edition==='saga'&&itemEnd){
      const defeats=sides.filter(a=>a.hp<=0&&a.defeatedByOpponent);
      for(const a of defeats){
        const d=a===A?D:A;
        if(a.g==='tombstone'){
          const player=s.players[a.seat];
          if(!s.predict)for(let j=player.hand.length;j<6;j++)draw(player,s);
          lines.push('툼스톤 · 손패를 6장까지 보충');
        }
        if(a.g==='cursedseal'&&d.hp>0){
          const damage=Math.floor(d.u.hp/2);
          d.hp=Math.min(d.hp,d.u.hp)-damage;
          lines.push('저주의 인장 · 상대 기본 HP 피해 '+damage);
          if(d.hp<=0){d.defeatedByOpponent=true;defeats.push(d);}
        }
      }
    }
    for(const a of sides)if(a.hp<=0){
      if((edition==='ps2'||handheld)&&revive(a))continue;
      if(!s.predict)fx.death(s,a.u.id);
      if(revolt&&revive(a))continue;
      const p=s.players[a.seat];
      if(creatureEnd&&a.n==='cornfolk')p.cash+=200;
      if(creatureEnd&&a.n==='mummy')p.cash+=(revolt||handheld?40:50)*(p.lap+1);
      if(revolt&&creatureEnd&&a.n==='creepingcoin')p.cash+=100;
      if(revolt&&creatureEnd&&a.n==='chironex'&&a.defeatedByOpponent){p.cash-=100;lines.push(a.c.name+' · 격파 후 −100G');}
      if(edition==='saga'&&creatureEnd&&a.n==='spudfolk'&&a.defeatedByOpponent){
        const reward=10*s.tiles.filter(t=>t.unit&&combo.hasElement(cards[t.unit.id],0)).length;
        p.cash+=reward;if(reward)lines.push('스퍼드포크 · '+reward+'G 획득');
      }
      if(edition==='saga'&&creatureEnd&&a.n==='seismodon'&&a.defeatedByOpponent&&t.level>1&&!fx.blockedLevel(s,t)){
        t.level--;lines.push('사이즈모돈 · 교전 영지 Lv.'+t.level);
      }
      if(creatureEnd&&(a.n==='fate'&&(revolt||begins||p.hand.length<6)||a.c.evoLegacy==='draw'))draw(p,s);
      if(creatureEnd&&a.c.evoLegacy==='cash'){p.cash+=100;lines.push('마력 유산 · 100G');}
      if(creatureEnd&&a.c.evoLegacy==='draw')lines.push('카드 유산 · 카드 1장');
      if(a.g==='goldengoose'&&(edition!=='saga'||itemEnd)){
        const reward=(begins||revolt||handheld?7:firstEdition?5:10)*fx.max(a.u);
        p.cash+=reward;
        if(revolt||handheld)lines.push(a.gear.name+' · '+reward+'G 획득');
        if(handheld&&s.predict){
          b.magicLoss??=[0,0];b.magicLoss[a.defending?1:0]-=reward;
        }
      }
      if(revolt&&a.g==='tombstone'&&!s.predict){
        for(let i=p.hand.length;i<6;i++)draw(p,s);
        lines.push(a.gear.name+' · 손패를 6장까지 보충');
      }
      const amulet=a.g==='phoenixamulet'&&(!begins||itemEnd);
      if((creatureEnd&&(a.n==='phoenix'||(begins||revolt&&a.defeatedByOpponent)&&a.n==='barong')||amulet)&&(!revolt||hasHandSpace(p))){
        const returned=begins&&amulet?(a.original?.id??a.u.id):a.u.id;
        p.hand.push(returned);
        if((begins||handheld)&&amulet){
          const refund=cards[returned].cost;
          p.cash+=refund;lines.push(a.gear.name+' · 손패로 복귀 · '+refund+'G 획득');
          if(handheld&&s.predict){
            b.magicLoss??=[0,0];b.magicLoss[a.defending?1:0]-=refund;
            b.handRecovery=a.defending?1:0;
          }
        }
      }
      const victor=a===A?D:A;
      if(victor.hp>0&&victor.n==='deathgaze'&&!s.predict&&Math.random()<(firstEdition ? .6 : .8)){
        const enemy=s.players[a.seat],id=a.u.id;
        enemy.book=enemy.book.filter(card=>card!==id);
        if(edition==='ps2')enemy.bannedCards=[...new Set([...(enemy.bannedCards||[]),id])];
        for(const player of s.players)if(player.peek?.seat===a.seat)delete player.peek;
      }
      if(edition!=='ps2'&&!handheld&&!revolt)revive(a);
    }
    if(revolt&&creatureEnd){
      for(const a of sides){
        const d=a===A?D:A;
        if(a.n==='otohime'&&a.hp>0&&d.hp>0){
          combo.clear(d.u);d.u.enchant='senility';lines.push(a.c.name+' · 상대에게 노쇠 부여');
        }
      }
      for(const a of sides){
        if(a.hp<=0||a.u.enchant!=='energyfield')continue;
        const d=a===A?D:A;
        s.players[a.seat].cash-=100;s.players[d.seat].cash+=100;
        if(s.predict){b.magicLoss??=[0,0];b.magicLoss[a.defending?1:0]+=100;b.magicLoss[a.defending?0:1]-=100;}
        lines.push('마력 결계 · '+s.players[d.seat].name+'에게 100G 탈취당함');
      }
    }
    if(D.hp>0)for(const a of sides){
      if(a.hp<=0||muted)continue;
      const enchant=creatureEnd?(a.n==='suiko'?'vitality':!a.gear?({wendigo:begins?null:'fog',chonchon:'antielement',giantrattler:'disease'})[a.n]:null):null;
      if(enchant){combo.clear(D.u);D.u.enchant=enchant;lines.push('방어 영지 · '+enchant);}
      if(a.g==='talisman'){combo.clear(D.u);D.u.enchant='landprotection';}
    }
    for(const a of sides){
      const opponent=a===A?D:A;
      const centaurReturn=begins&&a.hp>0&&creatureEnd&&a.n==='centaur'&&a.gear?.kind==='item';
      const alreadyRecycled=revolt&&a.n==='centaur';
      if(a.hp>0&&(centaurReturn||a.g==='eternalmail'&&(!begins||itemEnd)&&!alreadyRecycled))returnToBook(s,a.seat,a.item);
      if(revolt&&itemEnd&&a.hp>0&&a.g==='soulray'&&!alreadyRecycled&&hasHandSpace(s.players[a.seat]))s.players[a.seat].hand.push(a.item);
      if(begins&&creatureEnd&&a.hp>0){
        if(a.n==='triton'&&(a.gear?.kind==='item'||a.mimicked&&a.gear?.kind==='creature')){
          draw(s.players[a.seat],s);lines.push(a.c.name+' · 카드 1장 뽑기');
        }
        if(a.n==='pulgasari'&&opponent.gear?.kind==='item'){
          const max=fx.max(a.u),gain=Math.min(10,100-max);
          if(gain>0){
            a.u.mhp=max+gain;a.u.hp+=gain;a.hp+=gain;
            lines.push(a.c.name+' · 최대 HP +'+gain);
          }
        }
        if(a.n==='gelatinouswall'&&a.receivedDamage>0){
          const gain=a.receivedDamage*5;
          s.players[a.seat].cash+=gain;
          if(s.predict){b.magicLoss??=[0,0];b.magicLoss[a.defending?1:0]-=gain;}
          lines.push(a.c.name+' · '+gain+'G 획득');
        }
      }
      if((edition==='saga'||revolt)&&creatureEnd&&a.hp>0){
        const owner=s.players[a.seat];
        if(edition==='saga'&&a.n==='centaur'&&a.item!=null)owner.book.unshift(a.item);
        if(edition==='saga'&&a.n==='dragonlord')extra.transform(a,extra.ids.get('dragonewt'));
        if(edition==='saga'&&a.n==='pulgasari'&&opponent.gear){
          a.u.st=Math.min(100,fx.strength(a.u)+10);extra.grow(a,10);
          lines.push(a.c.name+' · 기본 ST와 최대 HP 증가');
        }
        if(revolt&&a.n==='creepingcoin')owner.cash+=100;
        if(revolt&&a.n==='devastator'&&!a.defending&&t.level>1&&!fx.blockedLevel(s,t)){
          t.level--;lines.push(a.c.name+' · 영지 Lv.'+t.level);
        }
        if(a.n==='triton'&&a.gear?.kind==='item'&&(revolt||owner.hand.length<6)){
          draw(owner,s);lines.push(a.c.name+' · 카드 1장 뽑기');
        }
        if(a.n==='gelatinouswall'&&a.ordinaryDamage>0){
          const gain=a.ordinaryDamage*5;
          owner.cash+=gain;lines.push('젤라티너스 월 · '+gain+'G 획득');
        }
      }
      if(revolt&&a.g==='gelatinousarmor'&&itemEnd&&a.hp>0&&a.ordinaryDamage>0){
        const gain=a.ordinaryDamage*5;
        s.players[a.seat].cash+=gain;
        lines.push(a.gear.name+' · '+gain+'G 획득');
      }
      if(begins&&itemEnd&&a.hp>0){
        const hand=s.players[a.seat].hand;
        if(!centaurReturn&&a.g==='boomerang')hand.push(a.item);
        if(a.g==='migoalblessing'&&hand.length){
          hand.splice(s.predict?0:Math.floor(Math.random()*hand.length),1);
          lines.push(a.gear.name+' · 손패 한 장 파괴');
        }
      }
      if(edition==='saga'&&itemEnd&&a.hp>0){
        if(['boomerang','soulray'].includes(a.g)&&s.players[a.seat].hand.length<6)s.players[a.seat].hand.push(a.item);
        if(a.g==='doomneedle'&&opponent.hp>0){combo.clear(opponent.u);opponent.u.enchant='senility';lines.push('둠 니들 · 노쇠');}
      }
      if(begins&&a.hp>0&&opponent.hp>0){
        const source=creatureEnd&&a.n==='otohime'?a.c:itemEnd&&a.g==='doomneedle'?a.gear:null;
        if(source){combo.clear(opponent.u);opponent.u.enchant='senility';lines.push(source.name+' · 노쇠 부여');}
      }
      if(edition==='saga'&&!muted&&a.u.enchant!=='paralysis'&&opponent.hp<=0&&opponent.defeatedByOpponent&&s.players[a.seat].status==='hunterssong'){
        s.players[a.seat].cash+=200;
        if(s.predict){b.magicLoss??=[0,0];b.magicLoss[a.defending?1:0]-=200;}
        lines.push('헌터스 송 · 상대 크리처 격파 +200G');
      }
      if(!muted&&a.hp>0&&opponent.hp<=0)extra.victory(a,opponent);
      if(revolt&&creatureEnd&&a.n==='duskdweller'&&a.hp>0&&opponent.hp<=0){
        a.u.st=Math.min(100,fx.strength(a.u)+10);
        const max=fx.max(a.u),gain=Math.max(0,Math.min(10,100-max));
        a.u.mhp=max+gain;a.u.hp+=gain;a.hp+=gain;
        lines.push(a.c.name+' · 승리 후 기본 ST '+a.u.st+' · 최대 HP '+a.u.mhp);
      }
      if(revolt&&creatureEnd&&a.hp>0&&a.n==='tentacles')drawUntil(s.players[a.seat],5);
      if(revolt&&!s.predict&&creatureEnd&&a.hp>0&&a.n==='mycoron'&&a.damagedByAttack){
        const vacancies=s.tiles.filter((tile,at)=>at!==b.at&&!tile.unit&&territoryType(tile.type)&&canOccupy(a.c,tile));
        if(vacancies.length){
          const dst=vacancies[Math.floor(Math.random()*vacancies.length)];
          claimFromHand(dst,a.seat,{id:a.u.id,hp:a.c.hp});
          lines.push(a.c.name+' · 빈 영지에 분열');
        }
      }
      if(revolt&&creatureEnd&&a.hp>0&&a.n==='flameduke'&&a.gear?.kind==='item'){
        returnToBook(s,a.seat,a.item);lines.push(a.c.name+' · 사용한 아이템을 북으로 복귀');
      }
      if(revolt&&creatureEnd&&a.hp>0&&!a.defending&&['python','treasureraider'].includes(a.n)){
        s.players[a.seat].cash+=100;
        if(s.predict){b.magicLoss??=[0,0];b.magicLoss[0]-=100;}
        lines.push(a.c.name+' · 침략 보너스 100G');
      }
      if((a.n==='valkyria'||begins&&a.n==='valkyrie'||handheld&&a.n==='ixtol')&&a.hp>0&&opponent.hp<=0&&(!revolt||opponent.defeatedByOpponent)){
        const st=fx.strength(a.u);
        a.u.st=Math.max(st,Math.min(begins||revolt||handheld?100:80,st+10));
        lines.push(a.c.name+' · 승리 후 ST '+a.u.st);
      }
    }
    if((begins||edition==='saga')&&itemEnd)for(const a of sides){
      if(a.hp<=0)continue;
      if(a.g==='abyssaltome')extra.transform(a,extra.ids.get('statue'));
      if(begins&&a.g==='coinofpiety'){
        const symbols=s.players[a.seat].symbols,most=Math.max(...symbols),gain=Math.floor(most*.1);
        if(gain>0){symbols[symbols.indexOf(most)]+=gain;lines.push(a.gear.name+' · 호부 '+gain+'개 증가');}
      }
    }
    const onLand=a=>a.hp>0&&a.away==null&&!a.stolen&&!a.returned;
    const won=!onLand(D)&&onLand(A),empty=!onLand(D)&&!onLand(A);
    b.finalHP=health();b.finalForms=sides.map(a=>a.u.id);
    if(edition==='saga')b.defended=onLand(D);
    const tollGuard=begins?cards[D.original?.id??D.u.id]:D.c;
    b.lines=[...lines,A.hp<=0&&D.hp<=0?'양측 소멸':empty?'영지 비움':won?'침략 성공 · 영지 점령':'방어 성공'];b.won=won;b.noToll=b.from!=null||b.tower||b.sagaIntrusion||empty||tollAbility(t,tollGuard)?.freeToll||allied(s,A.seat,D.seat);
    for(const a of sides){
      if(a.original&&a.hp>0&&!a.keepForcedForm){a.u=a.original;a.u.hp=fx.max(a.u);}
      else a.u.hp=Math.min(a.heal||a.absorbed?fx.max(a.u):a.u.hp,a.hp);
      if(a.away!=null&&a.hp>0){const dst=s.tiles[a.away];claim(dst,a.seat,a.u);combo.clear(dst.unit);}
    }
    const attackerReturns=!won&&onLand(A)&&b.from==null;
    if(edition==='ps2'){
      const returnsToHand=a=>a.returned||a.stolen||a===A&&attackerReturns;
      b.settled={
        forms:sides.map(a=>a.u.id),
        hp:sides.map(a=>a.hp<=0?0:returnsToHand(a)?cards[a.u.id].hp:Math.max(0,a.u.hp)),
        st:sides.map(a=>Math.max(0,(returnsToHand(a)?cards[a.u.id].st:fx.strength(a.u))+supportST(s,b.at,b.from,a.seat,a.u)))
      };
    }
    if(empty)vacate(t);
    else if(won){
      (b.from==null?claimFromHand:claim)(t,A.seat,A.u);fatigue(t.unit);
    }
    else{
      t.unit=D.u;
      if(attackerReturns){
        const owner=s.players[A.seat];
        if(!revolt||hasHandSpace(owner))owner.hand.push(A.u.id);
        else b.lines.splice(-1,0,A.c.name+' · 손패가 가득 차 돌아갈 수 없음');
      }else if(onLand(A))s.tiles[b.from].unit=A.u;
    }
    if(t.unit&&sides.some(a=>a.g==='rainbowpiece'&&a.hp>0))combo.clear(t.unit);
    if(b.from!=null&&(won||!onLand(A))&&((handheld||begins||revolt)&&b.teleport||fx.name(s.tiles[b.from].unit)!=='powdereater'))vacate(s.tiles[b.from]);
    s.phase='result';note(s,b.lines.at(-1));
  }
  function configureMatch(s,{inputSeconds=0,suddenDeath=false,recordReplay=false}={}){
    if(![0,15,30,60].includes(inputSeconds)||typeof suddenDeath!=='boolean'||typeof recordReplay!=='boolean')
      throw Error('대전 옵션을 확인하세요.');
    s.inputSeconds=inputSeconds;s.suddenDeath=suddenDeath&&(begins||!!s.roundLimit);
    if(begins)s.beginsSuddenDeath=s.suddenDeath;
    if(recordReplay)record.begin(s,total,board);
    return s;
  }
  function armClock(s,now=Date.now(),renew=false){
    if(!s.inputSeconds||s.phase==='over'||isComputer(s,actor(s))){delete s.deadlineAt;return false;}
    if(s.deadlineAt&&!renew)return false;
    s.deadlineAt=now+s.inputSeconds*1000;return true;
  }
  function movementRoll(s,p){
    const fixed=p.status==='bind'?0:p.status==='sagafloat'?5:p.word??(s.fixed||null);
    if(edition==='revolt'){
      // OmiyaSoft's six-sided dice show 0–5. An all-zero roll moves 12 spaces.
      const die=()=>Math.floor(Math.random()*6);
      if(fixed==null&&p.diceLimitRolls>0&&p.status==='slow'){
        const total=1+Math.floor(Math.random()*3),first=Math.floor(Math.random()*(total+1));
        return {faces:[first,total-first],total,sides:6,zeroBased:true,limited:true};
      }
      if(fixed==null&&p.hasteRolls>0&&['haste','chargingstep'].includes(p.status)){
        const charging=p.status==='chargingstep',total=(charging?2:6)+Math.floor(Math.random()*3);
        const low=Math.max(0,total-5),first=low+Math.floor(Math.random()*(Math.min(5,total)-low+1));
        return {faces:[first,total-first],total,sides:6,zeroBased:true,haste:!charging,charging};
      }
      const faces=fixed!=null?p.word!=null&&s.fly&&p.status!=='bind'?[fixed,die()]:[fixed]
        :Array.from({length:s.fly?3:2},die);
      const sum=faces.reduce((a,b)=>a+b,0);
      return {faces,total:fixed==null&&sum===0?12:sum,sides:6,zeroBased:true};
    }
    const sides=board(s).die;
    const die=()=>fx.idol(s,'ironidol')?4+Math.floor(Math.random()*3):1+Math.floor(Math.random()*sides);
    const limited=begins&&fixed==null&&p.diceLimitRolls>0&&['haste','slow','footrace'].includes(p.status);
    if(limited&&p.status==='footrace'){
      const face=2*extra.personalRank(s,s.turn);
      return {faces:s.fly?[face,face]:[face],total:face*(s.fly?2:1),sides,limited};
    }
    const roll=()=>p.status==='haste'?(handheld||begins?5:6)+Math.floor(Math.random()*3):p.status==='slow'?1+Math.floor(Math.random()*3):p.status==='magicdie'?5+Math.floor(Math.random()*2):die();
    const faces=fixed!=null?(begins&&s.fly&&p.word!=null&&p.status!=='bind'?[fixed,fixed]:[fixed]):s.fly?[roll(),roll()]:[roll()];
    return {faces,total:faces.reduce((a,b)=>a+b,0),sides,limited};
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
    if(evo&&s.teams)for(const p of s.players){delete p.evoOpeningBook;delete p.explicitOpening;}
    armClock(s,now,true);
    record.append(s,prior,a[0],seat,timedOut,total);
    return true;
  }
  function matchesSynthesis(card,sacrifice){
    if(!card?.synthesis||!sacrifice)return false;
    if(card.synthesis==='instant')return ['sflash','mflash'].includes(sacrifice.category);
    if(card.synthesis==='enchant')return ['senchant','menchant'].includes(sacrifice.category);
    return card.synthesis===sacrifice.kind||card.synthesis===sacrifice.category||card.synthesis===key(sacrifice);
  }
  function synthesizedCreature(id,sacrifice,discardedId){
    const card=cards[id];
    if(!card.synthesizedForm||!matchesSynthesis(card,sacrifice))return id;
    if(card.synthesizedForm==='discarded')return discardedId??id;
    const form=cards.findIndex(c=>!c.unlisted&&key(c)===card.synthesizedForm);
    return form>=0?form:id;
  }
  function synthesizedUnit(id,discardedId){
    const material=cards[discardedId],form=synthesizedCreature(id,material,discardedId),card=cards[form];
    const unit={id:form,hp:card.hp};
    const bonus=cards[id].synthesizedStats;
    if(bonus&&matchesSynthesis(cards[id],material)){
      unit.st=Math.max(0,Math.min(100,card.st+bonus.st));
      unit.hp=unit.mhp=Math.max(1,Math.min(100,card.hp+bonus.hp));
    }
    return unit;
  }
  function applyAction(s,a,discardedId){
    const sacrifice=cards[discardedId];
    if(!Array.isArray(a)||!choices(s).some(b=>a.length===b.length&&b.every((v,i)=>v===a[i])))return false;
    const [k,x,y]=a,i=actor(s),p=s.players[i],t=s.tiles[p.pos],immediate=s.immediateAt!=null;
    if(immediate)delete s.immediateAt;
    const cardIndex=['cast','summon','invade'].includes(k)?x:k==='exchange'?y:null;
    if(cardIndex!=null&&!s.cardPaid&&sacrificeRequired(s,cards[p.hand[cardIndex]])){
      s.pendingCard={phase:s.phase,action:a.slice(),index:cardIndex};s.phase='sacrifice';return true;
    }
    if(k==='sacrifice'){
      const pending=s.pendingCard,[discarded]=p.hand.splice(x,1);
      if(x<pending.index)pending.action[pending.action[0]==='exchange'?2:1]--;
      delete s.pendingCard;s.phase=pending.phase;s.cardPaid=true;
      const ok=applyAction(s,pending.action,discarded);delete s.cardPaid;return ok;
    }
    const enchantedTarget=revolt&&k==='targetLand'&&s.spellCategory==='senchant'&&fx.name(s.tiles[x].unit)==='enchantress'?s.tiles[x]:null;
    const curseFields=['enchant','poisoned','confused','expires','enchantDeadline','caster'];
    const sourceUnit=enchantedTarget?.unit;
    const earlierCurse=sourceUnit?curseFields.map(field=>sourceUnit[field]):null;
    const trackChains=['lemuresCard','runeCard','summon','element','transfer','sell','equip','bare','roll','route','direction','leaveTemple','buySymbol','sellSymbol','cast','targetLand','targetPlayer','comboArea','secretArt','secretLand','ability','abilityLand','abilityPlayer','totem','teleTo','mesmerCard','soltisPower','zeromnPower','replaceCard'].includes(k);
    const previousChains=trackChains||combo.activeWorld(s)==='jointworld'||(handheld||revolt)&&k==='exchange'?chainCounts(s):null;
    armBeginsSuddenDeath(s);
    if(k==='roll'){delete s.doublecast;delete s.chainNotice;delete s.shrineNotice;if(p.sagaClemency)s.shrineClemencyUsed=true;}
    const gemTerrain=board(s).gemStore?s.tiles.map(t=>[t.type,t.level]):null;
    const before=!gemTerrain&&(handheld||begins||edition==='ps2'||edition==='saga'||s.mapId==='market'||board(s).special?.includes('Temple'))?landValues(s):null;
    function mapEffect(type,label,tile=p.pos,extra={}){
      s.mapEffect={sequence:(s.mapEffect?.sequence||0)+1,type,label,tile,source:p.pos,...extra};
    }
    function openImmediate(at){
      if(edition!=='saga'||!cards[s.tiles[at].unit?.id]?.immediate)return false;
      s.immediateAt=at;s.phase='land';return true;
    }
    function moveWithAbility(from,at,territoryMove,label){
      const src=s.tiles[from],dst=s.tiles[at];
      if(dst.unit){
        if(label)mapEffect('invade',label+' 이동 침략',at,{source:from});
        s.battle={at,from,inv:src.unit.id,invHP:src.unit.hp,atkItem:null,defItem:null,attackerSeat:src.owner,...(territoryMove?{}:{teleport:true})};
        s.phase='attack';
      }else{
        claim(dst,src.owner,{...src.unit});combo.clear(dst.unit);
        if((handheld||begins||revolt)&&!territoryMove||fx.name(src.unit)!=='powdereater')vacate(src);
        if(label)mapEffect('cast',label+' 이동',at,{source:from});
        if(territoryMove)afterTerritory(s);else s.phase='roll';
      }
    }
    function castSecret(from,at,player=false){
      const unit=s.tiles[from].unit,card=cards[unit.id],move=fx.secretArt(card,unit)?.move;
      const borrowed=s.borrowedSecret;
      if(!borrowed)fatigue(unit);
      s.phase='roll';
      const label=fx.applySecret(s,from,at,borrowed);
      delete s.secretFrom;delete s.borrowedSecret;
      if(move){moveWithAbility(from,at,false,card.name);return;}
      mapEffect('cast',label,player?s.players[at].pos:at,{source:from});
      if(s.secretTravel)s.phase='teleMove';
      if(s.cloudGizmo==='secret')s.phase='bookWorm';
    }
    function commandHealth(tile){
      const unit=tile.unit,delta=unit.enchant==='dominantgrowth'&&!fx.immuneHP(tile)?20:cards[unit.id].commandMHP;
      if(!revolt||!delta)return;
      const old=fx.max(unit);
      unit.mhp=delta>0?Math.min(100,old+delta):Math.max(10,old+delta);
      unit.hp=Math.min(unit.mhp,unit.hp+Math.max(0,unit.mhp-old));
    }
    switch(k){
      case 'secretArt':
        if(fx.secretTargets(s,x)[0]?.[0]==='secretSelf')castSecret(x,x);
        else{s.secretFrom=x;s.phase='secretTarget';}
        break;
      case 'secretLand':case 'secretPlayer':castSecret(s.secretFrom,x,k==='secretPlayer');break;
      case 'secretCancel':
        s.phase=s.borrowedSecret?'spellTarget':'spell';
        delete s.secretFrom;delete s.borrowedSecret;break;
      case 'ability':{
        if(fx.territoryTargets(s,x)[0]?.[0]==='abilitySelf'){
          fatigue(s.tiles[x].unit);
          const name=cards[s.tiles[x].unit.id].name;
          const next=fx.territoryEffect(s,x,x);mapEffect('cast',name,x);
          if(next)s.phase=next;else afterTerritory(s);
        }else{s.abilityFrom=x;s.phase='territoryTarget';}
        break;
      }
      case 'abilityLand':case 'abilityPlayer':{
        const from=s.abilityFrom,borrowed=s.borrowedAbility;
        if(!borrowed)fatigue(s.tiles[from].unit);
        const next=fx.territoryEffect(s,from,x,borrowed);
        delete s.abilityFrom;delete s.borrowedAbility;
        mapEffect('cast',borrowed?'템테이션 · 영지 능력':'영지 능력',k==='abilityLand'?x:s.players[x].pos,{source:from});
        if(next)s.phase=next;else if(borrowed)s.phase='roll';else afterTerritory(s);
        break;
      }
      case 'lemuresCard':{
        const src=s.tiles[s.lemuresFrom],victim=s.players[s.spellTarget],id=src.unit.id;
        p.hand.push(victim.hand[x]);victim.hand[x]=id;
        vacate(src);delete s.lemuresFrom;delete s.spellTarget;
        mapEffect('cast','크리처 손패 교환',victim.pos,{title:cards[id].name});s.phase='roll';break;
      }
      case 'wormDiscard':{
        const victim=s.players[s.spellTarget],id=victim.hand.splice(x,1)[0];
        const secret=s.cloudGizmo==='secret',label=s.cloudGizmo?'손패 교체':cards[id].name;
        if(s.cloudGizmo){draw(victim,s);delete s.cloudGizmo;}
        mapEffect('shatter',label,victim.pos);delete s.spellTarget;
        if(secret)s.phase='roll';else afterTerritory(s);break;
      }
      case 'eraseDraw':{
        s.players[s.spellTarget].book.splice(-1-x,1);
        for(const q of s.players)if(q.peek?.seat===s.spellTarget)q.peek.ids.splice(x,1);
        if(revolt){delete p.peek;draw(p,s);}
        s.phase='roll';break;
      }
      case 'teleTo':{
        const from=s.teleFrom,territoryMove=s.territoryMove,secretTravel=s.secretTravel;
        delete s.teleFrom;delete s.territoryMove;delete s.secretTravel;
        const chariotMove=!territoryMove&&edition!=='ps2'&&s.spellEffect==='chariot';
        const forcedLabel={outrage:'아웃레이지',thrustblow:'스러스트 블로'}[s.spellEffect];
        const label=secretTravel?'슬레이프니르':forcedLabel||(chariotMove?'채리엇':territoryMove==='adjacent'?'크리핑 플레임':territoryMove?'슬레이프니르':begins?'텔레키네시스':null);
        moveWithAbility(from,x,territoryMove,label);
        break;
      }
      case 'fortuneDraw':{
        const indices=p.book.flatMap((id,j)=>cards[id].kind===x?[j]:[]);
        const j=indices[Math.floor(Math.random()*indices.length)],id=p.book.splice(j,1)[0];p.hand.push(id);
        note(s,'점술관 · '+cards[id].name);s.phase='land';break;
      }
      case 'route':advance(s,x);break;
      case 'buyCard':{
        const cost=shopCost(x);
        p.cash-=cost;p.hand.push(x);
        note(s,p.name+' · '+cards[x].name+' 구매 −'+cost+'G');
        if(p.hand.length>6){s.phase='discard';s.discardReturn='endTurn';}else finish(s);
        break;
      }
      case 'leaveShop':s.phase='land';break;
      case 'buySymbol':case 'sellSymbol':{
        const count=k==='buySymbol'?y:-y;p.cash-=count*s.prices[x];p.symbols[x]+=count;
        if(s.pilgrimTemple){delete s.pilgrimTemple;s.phase='roll';}
        else resumeMove(s);
        break;
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
      case 'leaveTemple':
        if(s.pilgrimTemple){delete s.pilgrimTemple;s.phase='roll';}
        else resumeMove(s);
        break;
      case 'liquidate':p.cash+=s.prices[x]*y;p.symbols[x]-=y;debt(s);break;
      case 'shrineChoice':shrine.choose(s,x);break;
      case 'zeromnPower':{
        const before=s.tiles.map(t=>t.unit?.hp);
        s.phase=extra.choose(s,k,x);
        const hits=before.flatMap((hp,at)=>{
          const damage=hp-(s.tiles[at].unit?.hp??0);
          return damage>0?[{at,damage,defeated:!s.tiles[at].unit}]:[];
        });
        const label=extraSpells.zeromn[x];
        mapEffect('cast',label,hits[0]?.at,hits.length?{hits,title:'제롬'}:{});
        note(s,'제롬 · '+label);break;
      }
      case 'forfeitSymbol':{
        const q=s.players[s.spellTarget],qty=q.symbols[x],amount=qty*s.prices[x];
        s.phase=extra.choose(s,k,x);
        mapEffect('cast',qty+'장 → '+amount+'G',q.pos,{title:'포핏'});break;
      }
      case 'clairvoyanceDone':s.phase=extra.choose(s,k,x);break;
      case 'soltisPower':case 'soltisArea':case 'foresightCard':case 'prophecyKind':case 'replaceCard':case 'stealCard':case 'forgeCard':case 'metamorphCard':case 'reformCard':case 'poisonBookCard':
        s.phase=extra.choose(s,k,x);
        if(k==='foresightCard'&&s.shrineForesight){delete s.shrineForesight;s.phase='land';shrine.after(s);}
        mapEffect('cast',extraSpells.soltis[x]||extraSpells.actions[k]);break;
      case 'circleSkip':delete s.circleOffers;s.phase='land';break;
      case 'circleCast':case 'mesmerCard':case 'runeCard':case 'cast':{
        const id=k==='circleCast'?x:k==='runeCard'?y:k==='mesmerCard'?s.players[s.spellTarget].hand.splice(x,1)[0]:paid(s,p,x);
        if(k==='circleCast'){delete s.circleOffers;s.circleCasting=true;}
        const c=cards[id],cash=p.cash;s.phase='roll';
        if(c.doublecast)s.doublecast='pending';else delete s.doublecast;
        p.lastCast={name:key(c),round:s.round};
        if(revolt)s.spellCategory=c.category;
        if(!handheld)delete p.invisible;
        if(p.status==='revoltLifeForce'){
          fx.clearCepter(p);
          mapEffect('cast','라이프 포스 · 주문 무효',p.pos,{title:c.name});break;
        }
        const synthesis=matchesSynthesis(c,sacrifice);
        const effect=synthesis&&c.synthesizedEffect||c.effect;
        const spellType=extraTypes?.[effect]||combo.type[effect];
        if(spellType){
          const global=spellType==='global',beforeHP=combo.damageSpells.has(effect)||extraSpells?.damageSpells.has(effect)?s.tiles.map(t=>t.unit?.hp):[];
          s.spellEffect=effect;s.phase=global?(extraTypes?.[effect]?extra:fx).apply(s,effect,undefined,synthesis):'spellTarget';
          const hits=beforeHP.flatMap((hp,at)=>{
            const damage=hp-(s.tiles[at].unit?.hp??0);
            return damage>0?[{at,damage,defeated:!s.tiles[at].unit}]:[];
          });
          if(hits.length){
            const lost=hits.filter(h=>h.defeated).length;
            const label=hits.length+'곳 피해'+(lost?' · '+lost+'곳 격파':'');
            mapEffect('cast',label,hits[0].at,{hits,title:c.name});note(s,c.name+' · '+label);
          }else{const label=c.name+(synthesis?' · 합성':'');mapEffect('cast',label);note(s,p.name+' · '+label);}
          break;
        }
        if(c.effect==='obliterate'){
          for(const q of s.players)q.cash-=board(s).gemStore?q.symbols.reduce((sum,count)=>sum+count,0)*70:Math.floor(Math.max(0,q.cash)/10);
          mapEffect('cast',c.name);note(s,p.name+' · '+c.name);break;
        }
        if(c.effect==='miraclecall'){
          const indices=p.book.flatMap((id,j)=>cards[id]?.evo?[j]:[]);
          if(indices.length){
            const j=indices[Math.floor(Math.random()*indices.length)];
            p.hand.push(p.book.splice(j,1)[0]);
          }else{draw(p,s);draw(p,s);}
          const label=indices.length?'에보 카드 1장 뽑음':'카드 2장 뽑음';
          mapEffect('cast',label,p.pos,{title:c.name});note(s,c.name+' · '+label);
          break;
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
        const tile=s.tiles[x],unit=tile?.unit,prior=unit?.hp;
        if(extraTypes?.[s.spellEffect]){
          const effect=s.spellEffect,tradeFrom=s.tradeFrom;
          const areaHP=k==='comboArea'&&extraSpells.damageSpells.has(effect)?s.tiles.map(t=>t.unit?.hp):[];
          s.phase=extra.apply(s,effect,x);
          if(effect==='revoltTemptation'&&fx.secretTargets(s,x,true)[0]?.[0]==='secretSelf'){castSecret(x,x);break;}
          if(effect==='trade'){
            if(tradeFrom!=null)mapEffect('cast','영지 교환',x,{source:tradeFrom});
            break;
          }
          if(k==='comboArea'){
            const hits=areaHP.flatMap((hp,at)=>{
              const damage=hp-(s.tiles[at].unit?.hp??0);
              return damage>0?[{at,damage,defeated:!s.tiles[at].unit}]:[];
            });
            const title=cards.find(c=>c.effect===effect)?.name||effect;
            mapEffect('cast',title,hits[0]?.at??s.tiles.findIndex(t=>t.area===x),hits.length?{hits,title}:{});break;
          }
          const damage=prior-(tile.unit?.hp??0),showDamage=extraSpells.landDamage[effect];
          const label=effect==='magicalleap'?'매지컬 리프':effect==='shadowleap'?'섀도 리프':revivalLabel(unit,tile.unit)??(damage>0?'−'+damage+' HP'+(showDamage&&!tile.unit?' · 격파':''):showDamage?'피해 없음':effect);
          mapEffect('cast',label,x);break;
        }
        if(combo.type[s.spellEffect]){
          const effect=s.spellEffect;
          s.phase=fx.apply(s,effect,x);
          let label=effect;
          if(k==='targetLand'){
            const damage=prior-(tile.unit?.hp??0);
            label=revivalLabel(unit,tile.unit)||(begins&&effect==='shrink'?(damage>0?'−'+damage+' HP':'HP 변화 없음'):effect);
          }
          mapEffect('cast',label,k==='comboArea'?p.pos:x);break;
        }
        if(s.spellEffect==='heal'){
          unit.hp=spellHP(s,tile,'heal');
          if(handheld)draw(p,s);
        }else fx.spellHarm(s,tile,20);
        s.phase='roll';
        const change=(tile.unit?.hp||0)-prior;
        mapEffect(s.spellEffect,revivalLabel(unit,tile.unit)??((change>=0?'+':'−')+Math.abs(change)+' HP'),x,{title:cards[unit.id].name});
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
        if(extraTypes?.[s.spellEffect]){
          const effect=s.spellEffect;
          const levels=begins&&effect==='subsidence'?s.tiles.map(t=>t.level):null;
          s.phase=extra.apply(s,effect,x);
          const at=levels?.findIndex((level,tile)=>s.tiles[tile].level<level)??-1;
          mapEffect('cast',at>=0?'영지 레벨 −1':effect,at>=0?at:s.players[x].pos);
          break;
        }
        if(combo.type[s.spellEffect]){s.phase=fx.apply(s,s.spellEffect,x);mapEffect('cast',s.spellEffect,s.players[x].pos);break;}if(s.spellEffect==='shatter'){s.spellTarget=x;s.phase='shatter';}
        else{fx.clearCepter(s.players[x]);s.players[x].word=s.spellEffect==='word1'?1:6;mapEffect('word','이동 '+s.players[x].word,s.players[x].pos,{title:s.players[x].name});s.phase='roll';}break;
      case 'suppressCard':{
        const id=s.players[s.spellTarget].hand[x];
        for(const q of s.players){q.hand=q.hand.filter(v=>v!==id);q.book=q.book.filter(v=>v!==id);}
        mapEffect('shatter',cards[id].name,s.players[s.spellTarget].pos);s.phase='roll';break;
      }
      case 'breakCard':if(s.phase==='squeeze')s.players[s.spellTarget].cash+=150;mapEffect('shatter','카드 파괴',s.players[s.spellTarget].pos,{title:s.players[s.spellTarget].name});s.players[s.spellTarget].hand.splice(x,1);s.phase='roll';break;
      case 'fizzle':delete s.reliefFrom;mapEffect('cast','대상 없음');s.phase='roll';break;
      case 'roll':{const {faces,total,sides,zeroBased,haste,charging,limited}=movementRoll(s,p);if(charging){p.hasteRolls--;p.cash+=50;note(s,p.name+' · 마력 보행 +50G');}if((haste&&!--p.hasteRolls)||(limited&&!--p.diceLimitRolls))fx.clearCepter(p);s.die=total;if(revolt){s.rollSum=faces.reduce((sum,face)=>sum+face,0);if(total>0&&total<=3&&combo.activeWorld(s)!=='naturalworld')growDoomDevourers(s);}if(s.die>=5&&s.die<=7)for(const q of s.players)if(q.status==='mistletoe'){const magic=s.edition==='dc'?100:50;q.cash+=magic;note(s,q.name+' · 미스틀토 +'+magic+'G');}mapEffect('roll',String(s.die),p.pos,{faces,sides,...(zeroBased?{zeroBased}:{})});if(p.word!=null){delete p.word;if(p.status==='die')delete p.status;}s.fly=false;}note(s,p.name+' · 주사위 '+s.die);if(!s.die){s.remaining=0;if(p.status==='bind')finish(s);else arrived(s);break;}if(p.chooseDirection){delete p.chooseDirection;p.dir=0;p.previous=null;}if(pathSwitch(s,p.pos,p.previous)){delete p.reverse;move(s,p.dir||1);break;}if(p.reverse){const back=p.previous;delete p.reverse;p.dir=-(p.dir||1);if(board(s).links[p.pos].includes(back)){s.remaining=s.die;s.visited=[];advance(s,back);break;}p.previous=null;}if(p.dir){if(p.previous==null&&!board(s).stage&&!board(s).graph)p.previous=(p.pos-p.dir+s.tiles.length)%s.tiles.length;move(s,p.dir);}else if((board(s).stage||board(s).graph)&&board(s).links[p.pos].length!==2)move(s,1);else s.phase='direction';break;
      case 'direction':move(s,x);break;
      case 'totem':p.cash+=handheld?200:edition==='begins'?400:300;fx.destroy(s,s.tiles[x]);afterTerritory(s);break;
      case 'switchFlip':flipPaths(s,'방향 변경');s.phase='land';break;
      case 'switchKeep':s.phase='land';break;
      case 'towerAim':s.phase='towerTarget';break;
      case 'towerTo':s.towerAt=x;s.phase='towerDeploy';break;
      case 'towerCancel':s.phase=s.phase==='towerDeploy'?'towerTarget':'land';delete s.towerAt;break;
      case 'summon':case 'exchange':{
        const at=k==='summon'?(s.towerAt??p.pos):x,tile=s.tiles[at];
        const unit=synthesizedUnit(paid(s,p,k==='summon'?x:y),discardedId),{id}=unit;
        delete s.towerAt;
        if(k==='exchange')p.hand.push(tile.unit.id);
        mapEffect('summon',cards[id].name,at);
        claimFromHand(tile,i,unit);fatigue(tile.unit);note(s,p.name+' · '+cards[id].name+' 배치');if(!openImmediate(at))afterTerritory(s);break;
      }
      case 'level':mapEffect('gain','Lv.'+y,x);p.cash-=levelCost(s.tiles[x],y,p);s.tiles[x].level=y;commandHealth(s.tiles[x]);fatigue(s.tiles[x].unit);note(s,p.name+' · '+(x+1)+'번 영지 Lv.'+y);afterTerritory(s);break;
      case 'transfer':{
        const from=s.tiles[x],dest=s.tiles[y],owner=from.owner;
        fatigue(from.unit);
        if(dest.owner<0){claim(dest,owner,{...from.unit});combo.clear(dest.unit);if(fx.name(from.unit)!=='powdereater')vacate(from);afterTerritory(s);}
        else{
          mapEffect('invade','영지 공격',y,{source:x});
          s.battle={at:y,inv:from.unit.id,invHP:from.unit.hp,from:x,atkItem:null,defItem:null,...(owner===i?{}:{attackerSeat:owner})};
          s.phase='attack';
        }
        break;
      }
      case 'element':mapEffect('cast',elements[y]+' 속성',x);p.cash-=elementCost(s.tiles[x]);s.tiles[x].type=y;commandHealth(s.tiles[x]);fatigue(s.tiles[x].unit);afterTerritory(s);break;
      case 'pay':payToll(s);break;
      case 'intrusionCard':{
        const at=s.intrusionAt,[inv]=p.hand.splice(x,1);
        delete s.intrusionAt;
        mapEffect('invade','인트루드',at);
        s.battle={at,inv,atkItem:null,defItem:null,spellMove:true,sagaIntrusion:true};
        s.phase='attack';break;
      }
      case 'invade':{
        const at=s.towerAt??p.pos,tower=s.phase==='towerDeploy';
        delete s.towerAt;
        mapEffect('invade',tower?'사령탑 침략':'영지 침략',at);
        const invUnit=synthesizedUnit(paid(s,p,x),discardedId);
        s.battle={at,inv:invUnit.id,atkItem:null,defItem:null,spellMove:!!s.spellArrival&&!tower,...(tower?{tower}:{}),...(invUnit.mhp!=null?{invUnit}:{})};
        s.phase='attack';break;
      }
      case 'bare':case 'equip':{
        const id=k==='equip'?paid(s,p,x,false):null;
        if(s.phase==='attack'){s.battle.atkItem=id;s.phase='defend';}else{s.battle.defItem=id;resolve(s);}break;
      }
      case 'continue':{
        const b=s.battle;delete s.battle;
        if(b.sagaIntrusion){
          if(b.won&&openImmediate(b.at))s.sagaImmediateRoll=true;
          else s.phase='roll';
        }
        else if(b.markerFlag)s.phase='land';
        else if(b.teleport)s.phase='roll';
        else if(b.from!=null)afterTerritory(s);
        else if(b.won||b.noToll){if(!b.won||!openImmediate(b.at))finish(s);}
        else payToll(s);
        break;
      }
      case 'pass':if(immediate)afterTerritory(s);else finish(s);break;
      case 'sell':p.cash+=debtSaleValue(s,s.tiles[x]);vacate(s.tiles[x],true);debt(s);break;
      case 'discard':
        p.hand.splice(x,1);
        if(p.hand.length<=6){
          const next=s.discardReturn||'spell';delete s.discardReturn;delete s.discardSeat;
          if(next==='endTurn')finish(s);else s.phase=next;
        }
        break;
    }
    if(sourceUnit&&enchantedTarget.unit===sourceUnit&&combo.enchanted(sourceUnit)&&
        curseFields.some((field,index)=>sourceUnit[field]!==earlierCurse[index])){
      for(const tile of s.tiles){
        if(tile===enchantedTarget||!tile.unit||!allied(s,tile.owner,enchantedTarget.owner))continue;
        combo.clear(tile.unit);
        for(const field of curseFields)if(sourceUnit[field]!=null)tile.unit[field]=sourceUnit[field];
      }
      sourceUnit.fatigued=true;
      note(s,cards[sourceUnit.id].name+' · 동맹 크리처에게 인챈트 전파');
    }
    if(s.doublecast==='pending'&&s.phase==='roll'){
      s.doublecast='ready';s.phase='spell';note(s,'연속 주문 · 주사위를 굴리기 전에 주문을 더 쓸 수 있습니다.');
    }
    if(s.circleCasting&&['roll','land'].includes(s.phase)){
      s.phase='land';delete s.circleCasting;
    }
    if(!discardAtEnd&&(s.phase==='roll'||edition==='saga'&&s.phase==='spell')){
      const seat=edition==='saga'?s.players.findIndex(p=>p.hand.length>6):s.players[s.turn].hand.length>6?s.turn:-1;
      if(seat>=0){
        if(seat!==s.turn)s.discardSeat=seat;
        s.discardReturn=s.phase;s.phase='discard';
      }
    }
    if(gemTerrain)updateGemTerrain(s,gemTerrain);else updatePrices(s,before);
    if(previousChains)reportChains(s,previousChains);
    if(!['over','sell','result'].includes(s.phase)&&s.players.some(q=>q.cash<0))settleDebts(s,s.phase);
    if(s.phase!=='over')armBeginsSuddenDeath(s);
    if(s.endReason==='roundLimit'||s.endReason==='suddenDeath'){
      const entries=s.players.flatMap((_,i)=>!s.teams||s.teams.indexOf(s.teams[i])===i?[[i,total(s,i)]]:[]);
      const top=Math.max(...entries.map(([,g])=>g));
      s.leaders=entries.filter(([,g])=>g===top).map(([i])=>i);
      if(s.suddenDeath&&!s.beginsSuddenDeath&&s.leaders.length>1){
        delete s.endReason;delete s.leaders;s.overtime=true;
        note(s,'서든데스 · 한 라운드 더 진행합니다.');nextTurn(s);
      }else s.winner=s.leaders.length>1?-1:s.leaders[0];
    }
    const cue=s.phase==='over'?'victory':({pay:'coin',sell:'coin',buyCard:'coin',buySymbol:'coin',sellSymbol:'coin',buyGem:'coin',sellGem:'coin',stealGem:'coin',liquidate:'coin',equip:'card',discard:'card',fortuneDraw:'card'})[k];
    if(cue)s.actionSound={sequence:(s.actionSound?.sequence||0)+1,cue};
    return true;
  }
  const deckPlans=new WeakMap();
  const battleCombos=begins?combo.beginsCombos(cards,canEquip):edition==='saga'?combo.sagaCombos(cards,canEquip):revolt?combo.revoltCombos.map(({cards,hint})=>({groups:cards.map(n=>[n]),hint})):null;
  const deckRecipes=battleCombos?[...combo.recipes,...battleCombos.map(({groups})=>groups)]:combo.recipes;
  function ai(s){
    const seat=actor(s),p=s.players[seat],skill=isComputer(s,seat)?(s.aiLevel||0):0;
    const visibleBook=p.template||p.hand;
    let groups=deckPlans.get(visibleBook);
    if(!groups){const names=visibleBook.map(id=>key(cards[id]));groups=deckRecipes.filter(g=>combo.matches(g,names));if(p.template)deckPlans.set(p.template,groups);}
    const plan=combo.planner(s,seat,cards,fx,groups);

    // Only simulate the revealed board and our contemplated equipment. The opposing item is concealed.
    function forecast(battle,gear,defending,unpaid=false,spent,raySuccess=false){
      const tiles=s.tiles.map(t=>({...t,unit:t.unit&&{...t.unit}}));
      const players=s.players.map(q=>({...q,hand:q.hand.slice(),symbols:q.symbols.slice(),book:q.book?.slice()||[],peek:q.peek&&{...q.peek,ids:q.peek.ids.slice()}}));
      const acting=players[seat];
      // Hand-size effects see the hand after the selected creature and equipment leave it.
      const removed=spent??((s.phase==='land'||unpaid)&&battle.from==null?[battle.inv]:[]);
      for(const id of removed){const j=acting.hand.indexOf(id);if(j>=0)acting.hand.splice(j,1);}
      if(gear!=null){const j=acting.hand.indexOf(gear);if(j>=0)acting.hand.splice(j,1);}
      const trial={...s,predict:true,raySuccess,tiles,players,prices:s.prices.slice(),log:[],battle:{...battle,atkItem:defending?null:gear,defItem:defending?gear:null}};
      resolve(trial);
      return trial.battle;
    }
    function evaluateGear(battle,gear,defending,unpaid,spent,score){
      const normal=score(forecast(battle,gear,defending,unpaid,spent));
      return edition==='saga'&&key(cards[gear])==='blasterray'?
        (normal+score(forecast(battle,gear,defending,unpaid,spent,true)))/2:normal;
    }
    function invasionValue(at,cardIndex,discardIndex){
      const base=p.hand[cardIndex],discard=p.hand[discardIndex],invUnit=synthesizedUnit(base,discard),inv=invUnit.id;
      const tile=s.tiles[at],tower=s.phase==='towerDeploy'||s.pendingCard?.phase==='towerDeploy',c=cards[base];
      const canUseItem=discardIndex!=null||!sacrificeRequired(s,c)||p.hand.length>=3;
      const items=canUseItem?p.hand.filter((id,i)=>i!==cardIndex&&i!==discardIndex&&price(p,cards[id],s,false)+price(p,c,s)<=p.cash&&canEquip(cards[inv],cards[id],null,p.status==='release',s)):[];
      return Math.max(...[null,...items].map(item=>{
        return evaluateGear({at,inv,invUnit,tower},item,false,true,discardIndex==null?[base]:[base,discard],battle=>
          (battle.won?value(s,tile)+100:battle.noToll&&!tower?toll(s,tile):-60)-price(p,c,s)*.5-(cards[item]?.cost||0)*.5);
      }));
    }
    function intrusionScore(at,index,spellCost=0){
      const inv=p.hand[index],tile=s.tiles[at];
      const items=p.hand.filter((id,j)=>j!==index&&price(p,cards[id],s,false)<=p.cash-spellCost&&canEquip(cards[inv],cards[id],null,p.status==='release'));
      return Math.max(...[null,...items].map(item=>{
        const outcome=forecast({at,inv,sagaIntrusion:true},item,false,true,[inv]);
        return (outcome.won?value(s,tile)*1.5+80:outcome.finalHP[0]<=0?-65:0)-price(p,cards[item]||{cost:0},s,false);
      }));
    }
    function sleipnirValue(from,to){
      const src=s.tiles[from],dst=s.tiles[to],unit=cards[src.unit.id];
      if(dst.owner<0){
        const next={...dst,owner:src.owner,type:claimTerrain(dst,unit)};
        const same=combo.matchesTerrain(unit,next.type),prior=combo.matchesTerrain(unit,src.type);
        if(revolt){
          const vacated={...src,owner:-1};
          const trial={...s,tiles:s.tiles.map(t=>t===src?vacated:t===dst?next:t)};
          return total(trial,seat)-total(s,seat)+(same?24:0)-(prior?24:0)-4;
        }
        return value(s,dst)-value(s,src)+(same?24:0)-(prior?18:0);
      }
      const outcome=forecast({at:to,from,inv:src.unit.id,attackerSeat:src.owner},null,false);
      return outcome.won?value(s,dst)*1.4-value(s,src)+25:-100;
    }
    function telekinesisValue(from,to){
      const src=s.tiles[from],dst=s.tiles[to],unit=cards[src.unit.id];
      const friendly=allied(s,seat,src.owner)?1:-1;
      const sourceValue=value(s,src);
      if(!dst.unit){
        const next={...dst,owner:src.owner,type:claimTerrain(dst,unit),unit:src.unit};
        const trial={...s,tiles:s.tiles.map((tile,i)=>i===from?{...src,owner:-1,unit:null}:i===to?next:tile)};
        return friendly*(value(trial,next)-sourceValue+(combo.matchesTerrain(unit,next.type)?20:0)-(combo.matchesTerrain(unit,src.type)?20:0));
      }
      const result=forecast({at:to,from,inv:src.unit.id,invHP:src.unit.hp,attackerSeat:src.owner,teleport:true},null,false);
      const guard=allied(s,seat,dst.owner)?1:-1,defenseValue=value(s,dst);
      if(result.won)return friendly*(defenseValue-sourceValue)-guard*defenseValue;
      return (result.finalHP[0]<=0?-friendly*sourceValue:0)+(result.finalHP[1]<=0?-guard*defenseValue:0);
    }
    function secretScore(from,to){
      const unit=s.tiles[from].unit,art=fx.secretArt(cards[unit.id],unit);
      if(art.carry)return Math.max(-20,...fx.secretMoveExits(s,to).map(at=>sleipnirValue(to,at)/8))-art.cost/12;
      if(art===fx.secretArt(cards[unit.id],unit)&&cards[unit.id].secretArt==='useInstant')
        return Math.max(-20,...fx.secretHandChoices({...s,phase:'runeHand'}).map(([, ,id])=>extra.scoreCast(s,cards[id].effect)))-art.cost/12;
      return art.move?sleipnirValue(from,to)/8-art.cost/12:fx.secretValue(s,from,to);
    }
    function development(k,x,y,c){
      const t=k==='summon'?s.tiles[p.pos]:s.tiles[x];
      const next={...t,owner:seat},cost=k==='summon'?price(p,c,s):k==='element'?elementCost(t):levelCost(t,y,p);
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
        if(left===1||tile.unit?.enchant==='quicksand'||creatureStops(s,tile,traveler))break;
        const exits=movementExits(s,next,prev);
        if(exits.length!==1)return bonus;
        prev=next;next=exits[0];
      }
      const t=s.tiles[next];
      if((revolt||begins)&&t.unit?.enchant==='blasttrap')bonus-=Math.floor(Math.max(0,cash)*.4);
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
        if(n==='spinyagama')return src.level<=2&&src.type===2?35:10;
        if(n==='seismodon')return src.level*12+(src.type===2?10:0);
        if(n==='spudfolk')return 20*s.tiles.filter(t=>t.unit&&combo.hasElement(cards[t.unit.id],2)).length;
        if(n==='sylph'){
          const strength=10*s.tiles.filter(t=>t.unit&&combo.hasElement(cards[t.unit.id],3)).length;
          return strength>=50?strength+src.level*8+(src.type===3?12:0)-cost*.4:-10;
        }
        if(n==='hellpyron')return 50*(s.destroyedCount||0)-cost;
        if(n==='gogma')return (allied(s,seat,s.tiles[x].owner)?1:-1)*value(s,s.tiles[x])*1.5;
        if(n==='warlock')return allied(s,seat,x)&&!s.players[x].antiMagic?20:0;
        if(n==='creepingflame')return Math.max(...fx.territoryMoveExits(s,from,true).map(dst=>sleipnirValue(from,dst)));
        if(n==='fontaciel')return s.tiles.reduce((sum,t)=>sum+(t.owner===seat&&t.unit&&fx.max(t.unit)<100&&!fx.immuneHP(t)?12:0),0);
      }
      const sign=t=>allied(s,t.owner,seat)?1:-1;
      const damageValue=(t,damage)=>{
        const amount=fx.damageAmount(s,t,damage);
        const reward=edition==='saga'&&fx.name(t.unit)==='coaloid'&&t.unit.enchant!=='paralysis'
          ?50*s.tiles.filter(v=>v.type===0&&v.owner===t.owner).length:0;
        return -sign(t)*(amount+(amount===t.unit.hp?value(s,t)*.45-reward:0));
      };
      if(kind==='abilityPlayer'){
        const q=s.players[x],friend=allied(s,x,seat);
        if(q.antiMagic)return friend?-30:5;
        if(n==='holyllama'||n==='hypnosloth'||n==='swampspawn')return alliedWordTarget(x,n==='hypnosloth'?1:n==='swampspawn'?2:6);
        if(n==='clockworkowl')return friend&&q.previous!=null&&!q.chooseDirection?15:-10;
        if(edition==='saga'&&n==='lordofbane')return friend?-30:q.symbols.reduce((sum,count)=>sum+count,0)*.6;
        if(edition==='saga'&&n==='swampspawn')return !friend&&s.tiles[q.pos].owner===seat&&owedToll(s,s.tiles[q.pos],x)>50?owedToll(s,s.tiles[q.pos],x)/3:-20;
        if(n==='cloudgizmo')return friend?q.hand.length>=2?15:-16:Math.max(0,...q.hand.map(id=>(cards[id]?.cost||0)*.4));
        if(n==='bookworm')return friend?-60:Math.max(0,...q.hand.map(id=>(cards[id]?.cost||0)*.6));
        if((handheld||begins)&&n==='witch')return friend?-60:Math.min(q.cash,q.hand.filter(id=>cards[id].kind!=='creature').length*30);
        return friend?-100:q.cash/20;
      }
      if(kind==='abilityLand'){
        const t=s.tiles[x],u=t.unit;
        if(!u)return 35+t.level;
        if(handheld&&n==='mystic')return sign(t)*Math.min(10,100-fx.max(u))*3;
        if((handheld||edition==='saga')&&n==='sleipnir')return Math.max(...fx.territoryMoveExits(s,x).map(dst=>sleipnirValue(x,dst)));
        if(handheld&&n==='metalbug')return -sign(t)*(value(s,t)+fx.max(u))-value(s,src)-fx.max(src.unit);
        if((handheld||begins||edition==='saga')&&n==='sakuya'){
          const trial={...s,tiles:s.tiles.map(v=>v===t?{...v,type:2}:v)};
          return total(trial,seat)-total(s,seat)+(cards[u.id].element===2?20:0);
        }
        if(edition==='saga'&&n==='assassin')return -sign(t)*(20+value(s,t)/5)-value(s,src)/6;
        if(edition==='saga'&&n==='ahuizotl'){
          const trial={...s,tiles:s.tiles.map(v=>v===t?{...v,type:1}:v)};
          return total(trial,seat)-total(s,seat)+(combo.hasElement(cards[u.id],1)?20:0);
        }
        if(edition==='saga'&&['armoreddragon','hardrockdragon','lightningdragon'].includes(n))return damageValue(t,30);
        if(edition==='saga'&&n==='bonegolem')return sign(t)*(8+t.level*8);
        if(edition==='saga'&&n==='possession')return (value(s,t)-value(s,src))/4+(fx.max(u)-fx.max(src.unit))/2;
        if(edition==='saga'&&n==='venomouspore')return s.tiles.reduce((sum,v)=>sum+(v.area===t.area&&v.unit&&!v.unit.poisoned?-sign(v)*(5+v.level*3):0),0);
        if(edition==='saga'&&n==='tokebi')return p.cash<100?Math.min(value(s,t),200)*.22-t.level*4: -20;
        if((begins||edition==='saga')&&n==='fay')return sign(t)*Math.min(20,100-fx.strength(u));
        if(edition==='saga'&&n==='lichenoid')return sign(t)*Math.min(10,100-fx.max(u))*(1+t.level*.3);
        if(['archer','tetramorph','fortress','helltic'].includes(n))return damageValue(t,['archer','fortress'].includes(n)?10:20);
        if(edition==='saga'&&n==='lamia')return -sign(t)*Math.min(20,fx.strength(u))*3;
        if(n==='burnacle')return sign(t)<0&&u.enchant!=='fog'?Math.min(35,toll(s,t)/5):0;
        if(n==='fanatic')return damageValue(t,20)+damageValue(src,handheld?10:20);
        if(n==='healer')return fx.immuneHP(t)?0:sign(t)*Math.min(30,fx.max(u)-u.hp);
        if(n==='amabie')return sign(t)*Math.min(10,100-fx.max(u))*(2+t.level);
        if(n==='sanguivore')return -sign(t)*(fx.max(u)<=10?40+t.level*10:12+t.level);
        if(n==='landurchin')return sign(t)<0&&u.enchant!=='immobilize'?Math.min(25,value(s,t)/8):0;
        if(n==='archbishop'){
          const curse=u.poisoned||u.confused||['paralysis','senility','disease','drought','antielement'].includes(u.enchant);
          return sign(t)*(curse?30:u.enchant?-30:0);
        }
        if(n==='domovoi'||n==='domovikha')return sign(t)*(u.enchant===(n==='domovoi'?'phantasm':'landprotection')?0:10+t.level*5);
        if(n==='hyde')return u.enchant==='paralysis'?0:-sign(t)*(20+t.level*5);
        return -sign(t)*(10+(u.hp<=20?5:0));
      }
      if(edition==='saga'&&n==='rockshell')return src.unit.enchant==='peace'||src.level>=3? -10:5;
      if(n==='banshee')return s.tiles.reduce((a,t)=>a+(t.unit?damageValue(t,Math.floor(fx.max(t.unit)/4)):0),0);
      if(n==='quakebeast')return board(s).links[from].reduce((a,j)=>{
        const t=s.tiles[j];return a-(t.owner>=0&&t.level>1&&!fx.blockedLevel(s,t)?sign(t)*value(s,t)*.4:0);
      },-value(s,src)*.6);
      if(n==='algasphere')return !fx.immuneHP(src)&&fx.max(src.unit)<(handheld||begins?100:80)?handheld||begins?40:20:0;
      if(n==='beacontower')return p.status!=='enlightenment'&&p.cash>=150&&s.tiles.some((t,at)=>at!==from&&t.owner===seat&&t.level<5&&!fx.blockedLevel(s,t))?28:-20;
      if(n==='fate')return p.hand.length<5?30:0;
      if(edition==='saga'&&n==='shapeshifter')return p.cash>120&&fx.strength(src.unit)+fx.max(src.unit)<80?18:-20;
      if(edition==='saga'&&n==='hivequeen')return p.hand.length<5?20:4;
      if(edition==='saga'&&['nil','peluda'].includes(n))return s.tiles.reduce((sum,t)=>{
        if(!t.unit||n==='peluda'&&![-1,1,2,3].some(e=>combo.hasElement(cards[t.unit.id],e)))return sum;
        return sum+damageValue(t,n==='nil'?Math.floor(fx.max(t.unit)/2):10);
      },n==='nil'?-value(s,src)/4:0);
      if(edition==='saga'&&n==='dragonsegg')return p.cash>220?46:15;
      if(edition==='saga'&&n==='dragonewt')return p.cash>230?75:22;
      if(edition==='saga'&&n==='spriggan')return fx.strength(src.unit)<40?24:-8;
      if(edition==='saga'&&n==='heraldspirit')return p.status!=='enlightenment'&&s.tiles.some((t,i)=>t.owner===seat&&!territory(s).includes(i))?16:-20;
      if(edition==='saga'&&n==='nobleshaman')return s.tiles.reduce((sum,t)=>sum+(t.unit&&combo.enchanted(t.unit)?sign(t)*(['paralysis','disease','senility','fog'].includes(t.unit.enchant)||t.unit.poisoned?12:-8):0),0);
      if(n==='quicksilver'){
        const forms=fx.quicksilverForms(s);
        const found=forms.reduce((sum,id)=>{
          const card=cards[id];
          return sum+card.st+card.hp+(combo.matchesTerrain(card,src.type)?src.level*10:0);
        },0)/forms.length;
        return found-fx.strength(src.unit)-src.unit.hp;
      }
      if(n==='necromancer')return p.hand.length<6?Math.max(24,cards[s.lastDestroyed].cost*.65):0;
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
        const stopBonus=begins&&(key(c)==='kelpie'&&tile.type===1||key(c)==='oldwillow'&&tile.type===0)?14:0;
        return 70+c.hp/10+(combo.matchesTerrain(c,tile.type)?4:0)+connected*8+stopBonus;
      }
      const hp=tile.unit.hp+landBonus(cards[tile.unit.id],tile);
      if(remote&&skill>=2){
        const attack={at,inv:id,tower:true};
        const win=Math.max(...[null,...p.hand.filter(card=>card!==id&&canEquip(c,cards[card],null,false,s)&&price(p,cards[card],s,false)+price(p,c,s)<=p.cash)].map(gear=>forecast(attack,gear,false,true).won?value(s,tile)+15-(cards[gear]?.cost||0):0));
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
      if(k==='invade'&&allied(s,seat,s.tiles[s.towerAt??p.pos].owner)||k==='transfer'&&allied(s,seat,s.tiles[y].owner))return -10000;
      const targetWord=(modern?{word1:1,holyword2:2,holyword3:3,word6:6,holyword8:8}:{word6:6,holyword3:3,holywordx:10})[k==='cast'?c?.effect:s.spellEffect];
      if((s.teams||modern)&&targetWord&&(k==='cast'||k==='targetPlayer')){
        if(k==='targetPlayer')return alliedWordTarget(x,targetWord);
        return Math.max(...s.players.map((_,j)=>alliedWordTarget(j,targetWord)))-c.cost/35;
      }
      if(k==='shrineChoice')return shrine.score(s,x);
      if(k==='lemuresCard')return cards[y].cost+cards[y].st+cards[y].hp;
      if(k==='circleCast'||k==='runeCard'){
        const effect=cards[k==='runeCard'?y:x].effect;
        if(extraTypes?.[effect])return extra.scoreCast(s,effect);
        if(combo.type[effect])return plan.cast(effect);
        if(effect==='manna')return Math.max(1,p.lap)*6;
        return effect==='bolt'&&s.tiles.some(t=>t.unit&&!allied(s,t.owner,seat))?5:effect==='shatter'?2:-2;
      }
      if(begins&&(k==='cast'&&c.effect==='temptation'||k==='targetLand'&&s.spellEffect==='temptation')){
        const worth=from=>fx.name(s.tiles[from].unit)==='goldentotem'?100:
          Math.max(-40,...fx.territoryTargets(s,from,true).map(([kind,at])=>territoryValue(from,kind,at)));
        if(k==='targetLand')return worth(x);
        return Math.max(-40,...extra.targets(s,c.effect).map(([,from])=>worth(from)))/2-c.cost/15;
      }
      if(edition==='saga'&&s.spellEffect==='intrusion'&&k==='intrusionCard')return intrusionScore(s.intrusionAt,x);
      if(edition==='saga'&&s.spellEffect==='intrusion'&&k==='targetLand')
        return Math.max(-40,...extra.intrusionCards(s,x).map(([,index])=>intrusionScore(x,index)));
      if(edition==='saga'&&k==='cast'&&c.effect==='intrusion'){
        const cost=price(p,c,s);
        return (Math.max(0,...extra.targets(s,'intrusion').map(([,at])=>
          Math.max(0,...extra.intrusionCards(s,at).map(([,index])=>intrusionScore(at,index,cost)))))-cost)/8;
      }
      if(k==='cast'&&extraTypes?.[c.effect]){
        const effect=c.synthesizedEffect&&p.hand.some((id,j)=>j!==x&&matchesSynthesis(c,cards[id]))?c.synthesizedEffect:c.effect;
        return extra.scoreCast(s,effect)-price(p,c,s)/35;
      }
      if(k==='targetLand'&&spellRevival(s,s.tiles[x],s.spellEffect))return -24;
      if(['targetLand','targetPlayer','comboArea'].includes(k)&&extraTypes?.[s.spellEffect])return extra.scoreTarget(s,s.spellEffect,x);
      if(extraSpells?.actions[k])return extra.scoreChoice(s,k,x,y);
      if(handheld&&(k==='cast'&&c.effect==='landtransfer'||k==='targetLand'&&s.spellEffect==='landtransfer')){
        const scoreSale=t=>p.cash<220&&value(s,t)>=250?6+Math.min(value(s,t),800)/24-3*t.level:-20;
        if(k==='targetLand')return scoreSale(s.tiles[x]);
        return Math.max(-20,...fx.targets(s,'landtransfer').map(([,at])=>scoreSale(s.tiles[at])))-c.cost/35;
      }
      if(begins&&(k==='cast'&&c.effect==='telekinesis'||k==='targetLand'&&s.spellEffect==='telekinesis')){
        const worth=from=>Math.max(-400,...fx.telekinesisExits(s,from).map(to=>telekinesisValue(from,to)));
        if(k==='targetLand')return worth(x);
        return Math.max(-400,...fx.targets(s,c.effect).map(([,from])=>worth(from)))/9-c.cost/20;
      }
      if(k==='cast'&&combo.type[c.effect])return plan.cast(c.effect)+plan.sequence(c.effect)-(revolt?price(p,c,s):c.cost)/35;
      if(['targetLand','comboArea','targetPlayer'].includes(k)&&combo.type[s.spellEffect])return plan.scoreTarget(s.spellEffect,x);
      if(k==='secretArt')return Math.max(...fx.secretTargets(s,x).map(([,at])=>secretScore(x,at)));
      if(k==='secretLand'||k==='secretPlayer')return s.borrowedSecret?fx.secretValue(s,s.secretFrom,x,true):secretScore(s.secretFrom,x);
      if(k==='secretCancel')return -1000;
      if(k==='totem')return 130+(s.tiles[x].unit.enchant==='soulhunt'?50:0);
      if(k==='ability'){
        const unit=fx.name(s.tiles[x].unit);
        if(unit==='spittingcobra')return p.hand.some(id=>key(cards[id])==='exile')?65:20;
        if(['conjurer','windimp','heatimp'].includes(unit)&&p.hand.some(id=>key(cards[id])==='raisedead'))return 80;
        return Math.max(-100,...fx.territoryTargets(s,x).map(([kind,j])=>territoryValue(x,kind,j)))-fx.territoryCost(s,unit)*.2;
      }
      if(k==='abilityLand'||k==='abilityPlayer')return territoryValue(s.abilityFrom,k,x);
      if(k==='breakCard'){const target=s.players[s.spellTarget],cost=cards[target.hand[x]].cost;return allied(s,s.spellTarget,seat)?-cost:cost;}
      if(k==='teleTo'&&begins&&s.spellEffect==='telekinesis'&&!s.territoryMove)return telekinesisValue(s.teleFrom,x);
      if(k==='teleTo')return s.territoryMove||s.secretTravel?sleipnirValue(s.teleFrom,x):s.tiles[x].owner>=0?10:1;
      if(k==='eraseDraw')return p.peek?.seat===s.spellTarget?(cards[p.peek.ids[x]]?.cost||0):0;
      if(k==='wormDiscard'){
        const card=cards[s.players[s.spellTarget].hand[x]];
        return s.cloudGizmo&&allied(s,seat,s.spellTarget)?-card.cost:card.cost;
      }
      if(k==='sacrifice'||k==='discard'&&groups.length){
        const reserved=plan.ready(n)?25:groups.some(g=>g.some(part=>part.includes(n)))?8:0;
        const pending=k==='sacrifice'?cards[p.hand[s.pendingCard.index]]:null;
        let synthesis=0;
        if(matchesSynthesis(pending,c)){
          if(pending.synthesizedForm||pending.synthesizedStats){
            const {action,index}=s.pendingCard,at=s.towerAt??p.pos;
            synthesis=action[0]==='invade'?invasionValue(at,index,x)-invasionValue(at,index):18;
          }
          else if(pending.synthesizedEffect)synthesis=2*Math.max(0,extra.scoreCast(s,pending.synthesizedEffect)-extra.scoreCast(s,pending.effect));
          else if(s.tiles.some(t=>t.unit&&!allied(s,seat,t.owner)&&fx.max(t.unit)<100&&!fx.immuneHP(t)))synthesis=8;
        }
        return synthesis-reserved+(p.hand.filter(id=>id===p.hand[x]).length-1)*3-c.cost/40;
      }
      if((skill>=2||groups.length)&&(k==='equip'||k==='bare')){
        const defending=s.phase==='defend',unit=cards[defending?s.tiles[s.battle.at].unit.id:s.battle.inv];
        const side=defending?1:0;
        return evaluateGear(s.battle,k==='equip'?p.hand[x]:null,defending,false,undefined,out=>{
          const territory=defending?out.defended??out.finalHP[1]>0:out.won;
          const remaining=Math.min(out.finalHP[side],unit.hp);
          return (territory?220:0)+(out.finalHP[side]>0?35:0)+remaining*.35-Math.min(80,out.finalHP[1-side])*.2
            -(k==='equip'?6+price(p,c,s,false)*.16:0)+(k==='equip'&&plan.pair(key(unit),n)?15:0)
            +(out.revengeValue||0)*(defending?-.3:.3)-(out.magicLoss?.[side]||0)*.3+(out.handRecovery===side?10:0)+(handheld&&!territory&&out.noToll&&!defending&&s.battle.from==null?toll(s,s.tiles[s.battle.at])*.6:0);
        });
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
        if(k==='cast'&&c.effect==='miraclecall'){
          const wantsEvo=!p.hand.some(id=>cards[id]?.evo)&&p.book?.some(id=>cards[id]?.evo);
          return (wantsEvo?34:17)-Math.max(0,p.hand.length-5)*10;
        }
        if(k==='cast'&&c.effect==='manna')return 20+p.lap;
        if(k==='cast'&&c.effect==='bolt'&&!s.tiles.some(t=>t.unit&&!allied(s,t.owner,seat)))return -10;
        if(skill>=2&&k==='invade'){
          const at=s.towerAt??p.pos;
          if(c.synthesizedForm&&sacrificeRequired(s,c))return Math.max(...p.hand.flatMap((_,i)=>i===x?[]:[invasionValue(at,x,i)]));
          return invasionValue(at,x);
        }
        if((handheld||begins)&&k==='transfer'&&fx.name(s.tiles[x].unit)==='powdereater'&&s.tiles[y].owner<0){
          return 26+value(s,s.tiles[y])/15+(s.tiles[y].type===3?4:0);
        }
        if((revolt||begins)&&k==='transfer'&&s.tiles[y].owner<0&&cards[s.tiles[x].unit.id].remoteVacantElements)return sleipnirValue(x,y);
        if(k==='transfer'&&s.tiles[y].owner>=0&&(skill===3||edition==='saga'&&fx.name(s.tiles[x].unit)==='tengu'||edition==='begins'&&fx.name(s.tiles[x].unit)==='aerogoetia'||revolt&&fx.name(s.tiles[x].unit)==='thunderspawn')){
          const src=s.tiles[x],out=forecast({at:y,from:x,inv:src.unit.id,invHP:src.unit.hp,attackerSeat:src.owner},null,false);
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
          const cost=shopCost(x);
          if(p.hand.length>=6||p.cash-cost<40)return -3;
          return 3+(missingKind?4:0)+(p.template?.includes(x)?2:0)-cost/40;
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
          if(c.effect==='shatter')return !fx.idol(s,'graniteidol')&&s.players.some((q,j)=>!allied(s,seat,j)&&q.hand.some(id=>cards[id].kind!=='creature'))?4:-10;
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
    const groups=battleCombos?battleCombos[index]?.groups:combo.recipes[index];
    if(!groups)return null;
    const selected=groups.map(group=>group.find(n=>byKey.has(n))).map(n=>byKey.get(n));
    if(selected.includes(undefined))return null;
    const book=[...new Set(selected)].flatMap(id=>Array(copyLimit(cards[id])).fill(id));
    for(const id of presets.fire)if(book.length<bookSize&&book.filter(v=>v===id).length<copyLimit(cards[id]))book.push(id);
    return book;
  }
  const territoryAbilityCost=card=>revolt?undefined:key(card)==='goldentotem'?0:fx.territoryCost({edition},key(card));
  return {edition,bookSize,copyLimit,evo,synthesizedCreature,synthesizedUnit,secretArt:fx.secretArt,limitAllianceEvos,territoryType,claimTerrain,territoryAbilityCost,hasLandDamage,spellRevival,shrineNames:shrineModule?.names,shrineDetails:shrineModule?.details,price,spellHP,isComputer,owedToll,tollRange,spellDescriptions:extraSpells?.descriptions,spellActions:extraSpells?.actions,spellHints:extraSpells?.hints,soltisOptions:extraSpells?.soltis,zeromnOptions:extraSpells?.zeromn,routePreview,pathSwitch,gemQuote,gemUnitPrice,shopStock,shopCost,battleGround,combo,storyAlliances,battleCombos,practiceBook,start,setOpeningBook,configureMatch,armClock,expire,choices,play,ai,actor,allied,outcome,personalTotal,total,toll,value,debtSaleValue,levelCost,elementCost,chain,chainRate,chainName,sameChain,cards,elements,maps,board,presets,validBook,validLegacyBook,forts:maps.classic?.forts||[]};
 }
const editionParam=typeof location==='undefined'?null:new URLSearchParams(location.search).get('edition');
// The newer editions start only when their data file is on the page; otherwise the PS2 game opens.
const modernEditionsReady=typeof module!=='undefined'||typeof CepterEditionModern!=='undefined';
const handheldEditionReady=typeof module!=='undefined'||typeof CepterEdition2012!=='undefined';
const Cepter=createCepter(['dc','saturn','ps1'].includes(editionParam)||handheldEditionReady&&editionParam==='3ds'||
  modernEditionsReady&&['saga','revolt','begins'].includes(editionParam)?editionParam:'ps2');
if(typeof module!=='undefined'){module.exports=Cepter;module.exports.createEdition=createCepter;}
