const CepterEditions=(()=>{
  const data=typeof module==='undefined'?CepterEditionData:require('./cept-edition-data');
  // Saga, Revolt and Begins live in their own file so the older editions do not download them.
  const modern=typeof module==='undefined'?(typeof CepterEditionModern==='undefined'?null:CepterEditionModern):require('./cept-edition-data-modern');
  if(modern){Object.assign(data.cards,modern.cards);Object.assign(data.maps,modern.maps);}
  const handheld=typeof module==='undefined'?(typeof CepterEdition2012==='undefined'?null:CepterEdition2012):require('./cept-edition-data-2012');
  if(handheld)data.cards['3ds']=handheld.cards;
  const handheldPlayerBooks=typeof module==='undefined'?(typeof Cepter2012PlayerBooks==='undefined'?[]:Cepter2012PlayerBooks):require('./cept-2012-player-books');
  const handheldRefs={
    cards:'https://culdceptcentral.com/ii/culdcept-3ds/culdcept-3ds-card-lists/culdcept-3ds-complete-card-list',
    maps:'https://culdceptcentral.com/ii/culdcept-3ds/culdcept-3ds-map-list',
    rules:'https://www.nintendo.co.jp/3ds/acbj/man_acbj.pdf',
    decks:'https://culdceptcentral.com/ii/culdcept-3ds/culdcept-3ds-player-decks'
  };
  const modernSets={'3ds':'culdcept-3ds',saga:'culdcept-saga',revolt:'culdcept-revolt',begins:'culdcept-begins'};
  const names={ps2:'컬드셉트 2 · PS2',dc:'컬드셉트 세컨드 · DC',saturn:'컬드셉트 · 새턴',ps1:'컬드셉트 익스팬션 · PS1','3ds':'컬드셉트 · 3DS 2012',saga:'컬드셉트 사가 · Xbox 360',revolt:'컬드셉트 리볼트 · 3DS',begins:'컬드셉트 비긴즈'};
  const categories={ed:'dual',en:'neutral',ef:'fire',ew:'water',ee:'earth',ea:'air',iw:'weapon',ia:'armor',it:'tool',is:'scroll',si:'sflash',mi:'mflash',sc:'senchant',mc:'menchant',sa:'공격 주문',sd:'방어 주문',sm:'이동 주문',so:'기타 주문'};
  const land={ef:'R',ew:'B',ee:'G',ea:'Y',cd:'+[]',nf:'R',nw:'B',ne:'G',na:'Y',nn:'N'};
  const equipment={xw:'Weapon',xa:'Armor',xt:'Tool',xs:'Scroll'};
  const tiles={castle:'성',fire:0,water:1,earth:2,air:3,neutral:'무속성',multi:'복합',temple:'신전',shrine:'성소',shop:'카드 상점',fortune:'점술관',bridge:'다리',teleport:'전송진','fort-north':'북쪽 요새','fort-south':'남쪽 요새','fort-east':'동쪽 요새','fort-west':'서쪽 요새'};
  const economy={"ps1":{"roca":[6000,400,300,6,100],"sneph":[7000,440,350,7,100],"mt-karin":[7000,600,400,7,80],"gosa":[8000,450,350,8,80],"kelder":[8000,600,400,8,80],"talio":[8000,600,500,9,80],"gilman":[10000,600,500,8,80],"bisteam":[8000,500,400,8,80],"nabath":[10000,500,400,8,100],"abyss":[12000,800,600,10,90]},"saturn":{"roca":[6000,400,300,6],"sneph":[7000,450,350,7],"mt-karin":[7000,600,400,7],"gosa":[8000,450,350,7],"kelder":[8000,600,400,8],"talio":[8000,600,500,9],"bisteam":[8000,500,400,8],"gilman":[10000,600,500,8],"nabath":[10000,500,400,8]},
    // Saga: Culdcept Central map list. [goal, starting, lap, highest die, land price (0 = map default), fort bonus]
    "saga":{"alcyon":[8000,250,250,8,0,100],"colosseum":[5000,200,200,6,0,80],"colosseum-2":[6000,250,250,7,0,100],"kaningun":[10000,250,250,8,0,120],"mt-etumer":[9000,300,250,8,0,120],"phoenixion":[9000,250,250,9,0,120],"provedin":[10000,250,250,7,0,150],"santanavillage":[5000,200,200,6,0,100],"zanador":[12000,300,300,9,0,150],"arrow":[8000,200,200,7,0,100],"the-second-morning":[6000,200,200,6,0,100],"the-two-towers":[7000,200,200,7,0,100],"vaulting-horse":[8000,250,250,8,0,150],"windmill":[9000,250,250,8,0,150],"x":[6000,200,200,7,0,100]}};
  // These slots identify existing saves and replays. New maps use section + slug IDs.
  const modernMapSlots={
    saga:'story/alcyon story/colosseum story/colosseum-2 story/kaningun story/mt-etumer story/phoenixion story/provedin story/santanavillage story/zanador arena/arrow download/chariot arena/the-second-morning download/the-speckled-band arena/the-two-towers arena/vaulting-horse arena/windmill arena/x'.split(' '),
    revolt:'story/battle-wagon story/battle-wagon-tower story/bumblebee story/bumblebee-flat story/bumblebee-trap story/catch-away story/dual-branch story/dual-branch-flat story/dual-branch-full-morph story/junction story/junction-flat story/junction-full-morph story/large-window story/large-window-flat story/large-window-tower story/long-horn story/long-horn-flat story/long-horn-trap story/middle-circle story/middle-circle-full-morph story/middle-circle-trap story/number-8 story/number-8-natural story/route-change story/simple-branch story/simple-branch-full-morph story/simple-circle story/spikes story/spikes-flat story/switch-box story/switch-box-flat story/twin-ring story/yin-yang story/yin-yang-flat'.split(' '),
    begins:'story/dark-gods-shrine story/gaidess-arena-1 story/gaidess-arena-2 story/library-story-only story/port-ciedamo story/terrair-city-of-spires story/the-temple-of-earth story/the-village-of-rikadh arena/double-heart download/fortune-alley download/holy-hammer arena/library-versus arena/rotary arena/the-eight download/x'.split(' ')
  };
  function mapId(edition,map,index){
    const slots=modernMapSlots[edition];
    if(!slots)return edition+'-'+(index+1);
    const slot=slots.indexOf(map.section+'/'+map.slug);
    return slot>=0?edition+'-'+(slot+1):edition+'-'+map.section+'-'+map.slug;
  }
  function checkedTransit(id,map,types,links){
    const transit=map.transit||{};
    for(const [key,destination] of Object.entries(transit)){
      const entry=Number(key);
      if(String(entry)!==key||!['전송진','다리'].includes(types[entry])||
         !Number.isInteger(destination)||entry===destination||!links[destination]?.length){
        throw Error(id+' · 잘못된 특수 이동: '+key+' → '+destination);
      }
    }
    return transit;
  }
  // The map import encodes the first gate as a castle to preserve existing tile IDs.
  // Directions were checked against the tile data for the 34 imported Revolt maps.
  const revoltStartGate=Object.fromEntries([
    ['west','battle-wagon battle-wagon-tower'],
    ['south','large-window large-window-flat large-window-tower switch-box switch-box-flat yin-yang yin-yang-flat'],
    ['east','long-horn long-horn-flat long-horn-trap number-8 number-8-natural']
  ].flatMap(([direction,slugs])=>slugs.split(' ').map(slug=>[slug,direction])));
  function revoltGates(map){
    const start=revoltStartGate[map.slug]||'north';
    const ids=new Map(),gates={};
    for(const [i,t] of map.types.entries()){
      const gate=t==='castle'?start:t.startsWith('fort-')?t.slice(5):null;
      if(!gate)continue;
      if(!ids.has(gate))ids.set(gate,i);
      gates[i]=ids.get(gate);
    }
    return {gates,gateNames:Object.fromEntries([...ids].map(([key,i])=>[i,tiles['fort-'+key].replace('요새','게이트')])),checkpoints:[...ids.values()]};
  }
  const beginsShops={
    'gaidess-arena-2':['longsword','chainmail','manna','holyword6'],
    'double-heart':['skeleton','catapult','shatter','holyword6']
  };
  const sagaShrineKinds={'mt-etumer':{4:'light',52:'dark'},zanador:{46:'light',64:'dark'}};
  function boards(edition,original){
    if(edition==='3ds')return {...original.handheldPractice};
    const result={};
    for(const [index,m] of data.maps[edition].entries()){
      const types=m.types.map(t=>tiles[t]),forts=types.flatMap((t,i)=>String(t).endsWith('요새')?[i]:[]);
      const grid=m.loc.map(([x,y])=>[Math.floor(y/2)-x,Math.ceil(y/2)+x]);
      const minRow=Math.min(...grid.map(p=>p[0])),minCol=Math.min(...grid.map(p=>p[1]));
      const position=grid.map(([r,c])=>[r-minRow+1,c-minCol+1]);
      const links=grid.map(([r,c])=>grid.flatMap(([u,v],i)=>Math.abs(r-u)+Math.abs(c-v)===1?[i]:[]));
      const other=edition==='dc'&&Object.values(original).find(v=>v.source?.endsWith('/'+m.slug));
      const same=other&&types.length===other.types.length&&types.every((t,i)=>t===other.types[i]&&links[i].length===other.links[i].length&&links[i].every(j=>other.links[i].includes(j)));
      const [goal,startCash,lapBonus,die,landPrice,fortBonus]=economy[edition]?.[m.slug]||[];
      const id=mapId(edition,m,index),nextMap=data.maps[edition][index+1];
      const transit=modernMapSlots[edition]?checkedTransit(id,m,types,links):m.transit;
      const shop=edition==='begins'?beginsShops[m.slug]:null;
      result[id]={...m,types,links,transit,forts,checkpoints:forts.filter((j,i)=>forts.findIndex(k=>types[k]===types[j])===i),
        castles:types.flatMap((t,i)=>t==='성'?[i]:[]),position,cols:Math.max(...position.map(v=>v[1])),rows:Math.max(...position.map(v=>v[0])),
        areas:same?other.areas:types.map(()=>0),areaCount:same?other.areaCount:1,startCash,bonus:lapBonus||200,base:landPrice||(edition==='begins'&&m.slug==='gaidess-arena-2'?100:80),die:die||Number(m.die)||other?.die||(edition==='begins'?8:6),storyGoal:goal||other?.storyGoal,
        graph:true,...(fortBonus||edition==='begins'?{fortBonus:fortBonus||200}:{}),...(same?{stage:index+1,image:other.image,half:other.half,position:other.position,fortBonus:other.fortBonus}:{}),section:m.section,next:m.section==='story'&&nextMap?.section==='story'?mapId(edition,nextMap,index+1):null,
        ...(edition==='revolt'?revoltGates(m):{}),...(edition==='saga'?{shrineKinds:sagaShrineKinds[m.slug]||{}}:{}),
        ...(shop?{cardShops:Object.fromEntries(types.flatMap((t,i)=>t==='카드 상점'?[[i,shop]]:[]))}:{})};
    }
    if(edition==='saga')Object.assign(result,original.sagaPractice);
    if(edition==='revolt')Object.assign(result,original.revoltPractice);
    if(edition==='begins')Object.assign(result,original.beginsPractice);
    return result;
  }
  const sharedModernSpells='foresight incineration influence landdrain prophecy rayoflaw windofhope'.split(' ');
  const modernSpellEffects={
    '3ds':{
      barrier:'barrier',bindingmist:'bindingmist',blackout:'blackout',disease:'disease',drainmagic:'drainmagic',
      escape:'escape',find:'find',foresight:'foresight',forestleap:'forestleap',lakeleap:'lakeleap',
      mountainleap:'mountainleap',plainleap:'plainleap',greed:'greed',growthbody:'growthbody',haste:'haste',
      holyword1:'word1',holyword2:'holyword2',holyword3:'holyword3',holyword6:'word6',holyword8:'holyword8',
      landdrain:'landdrain',lifestream:'lifestream',magicbolt:'bolt',manna:'manna',prophecy:'prophecy',rayoflaw:'rayoflaw',
      reincarnation:'reincarnation',shatter:'shatter',sink:'sink',upheaval:'upheaval',vitality:'vitality',
      weathering:'weathering',wildgrowth:'wildgrowth',windofhope:'windofhope',
      acidrain:'acidrain',avalanche:'avalanche',backward:'backward',banishingray:'banishingray',bistair:'bistair',
      chariot:'chariot',corruption:'corruption',drought:'drought',fairylight:'fairylight',fog:'fog',
      incineration:'incineration',locust:'locust',phantasm:'phantasm',revelation:'revelation',revival:'revival',
      selenear:'selenear',simulacrum:'simulacrum',spartoi:'spartoi',spiritwalk:'spiritwalk',telegnosis:'telegnosis',
      torture:'torture',triumph:'triumph',magicbooster:'magicbooster',theft:'theft',
      antielement:'antielement',permission:'permission',wordofrecall:'castlerecall',dreamterrain:'dreamterrain',earthshaker:'earthshaker',
      charity:'charity',landtransfer:'landtransfer',mutation:'mutation',turnover:'turnover'
    },
    saga:{capture:'capture',theft:'theft',chariot:'chariot',bravesong:'bravesong',toughsong:'toughsong',magicbolt:'bolt',holyword8:'holyword8',find:'find',burninghail:'burninghail',freezecyclone:'freezecyclone',elementalrage:'elementalrage',
      reincarnation:'reincarnation',cleanse:'removecurse',crusher:'shatter',debility:'weakness',fistfight:'vortex',
      illness:'disease',mimicry:'camouflage',paralyzer:'bindingmist',zap:'zap',
      bulimia:'bulimia',fatbody:'fatbody',hustle:'hustle',poisonmind:'mindseeker',
      acidrain:'acidrain',avalanche:'avalanche',backward:'backward',banishingray:'banishingray',blackout:'blackout',
      corruption:'corruption',dispelmagic:'dispelmagic',escape:'escape',fairylight:'fairylight',forestleap:'forestleap',
      holyword2:'holyword2',lakeleap:'lakeleap',landprotection:'landprotection',locust:'locust',massgrowth:'massgrowth',
      mountainleap:'mountainleap',mutation:'mutation',phantasm:'phantasm',plainleap:'plainleap',quintessence:'quintessence',
      reinforce:'reinforce',revelation:'revelation',revival:'revival',shrink:'shrink',simulacrum:'simulacrum',
      sink:'sink',spiritwalk:'spiritwalk',subsidence:'subsidence',telegnosis:'telegnosis',teleport:'teleport',
      triumph:'triumph',upheaval:'upheaval',weathering:'weathering',wildgrowth:'wildgrowth',
      iksear:'sagaiksear',terrair:'sagaterrair',bistair:'sagabistair',selenear:'sagaselenear',
      comet:'comet',crusherstorm:'crusherstorm',desolation:'desolation',elevation:'elevation',erosion:'erosion',
      fame:'fame',frostneedle:'frostneedle',venomousboil:'venomousboil',refuge:'refuge',gift:'sagagift',refresh:'refresh',holyblight:'holyblight'},
    revolt:{magicbolt:'bolt',manna:'manna',holyword1:'word1',holyword3:'holyword3',holyword6:'word6',holyword8:'holyword8',
      shatter:'shatter',fly:'fly',drainmagic:'drainmagic',barrier:'barrier',bindingmist:'bindingmist',blackout:'blackout',
      fireshift:'fireshift',watershift:'watershift',earthshift:'earthshift',airshift:'airshift',burninghail:'burninghail',
      freezecyclone:'freezecyclone',insectswarm:'globalinsectswarm',lifestream:'lifestream',reincarnation:'reincarnation',
      alarm:'alarm',disaster:'fatigueddisaster',elementalwrath:'elementalwrath',landtransfer:'revoltlandtransfer',
      magmashift:'magmashift',stormshift:'stormshift',quintessence:'quintessence',redivision:'redivision',remission:'remission',restore:'restore',remoteswitch:'remoteswitch',stealgem:'stealgem',obliteration:'obliterate',
      escape:'escape',gift:'gift',greed:'greed',growthbody:'growthbody',spiritwalk:'spiritwalk',vitality:'vitality',
      miraclecall:'miraclecall',purify:'purify',haste:'haste',massphantasm:'revoltphantasm',revival:'revival',stoneblast:'stoneblast',
      turntothewall:'turntothewall',disease:'disease',pacifism:'pacifism',holybanishment:'holybanishment',liquidform:'liquidform',
      peace:'peace',senility:'senility',squeeze:'squeeze',exile:'exile',dreamterrain:'dreamterrain',quicksand:'quicksand',fatbody:'fatbody',massgrowth:'massgrowth',shininggeyser:'shininggeyser',blazesplash:'blazesplash',penalize:'penalize',
      spartoi:'spartoi',speedpenalty:'speedpenalty',magicalleap:'magicalleap',chariot:'chariot',
      sigiloffloat:'sigiloffloat',sigilofdrain:'sigilofdrain',poisonmind:'mindseeker',blasttrap:'blasttrap',
      chaospanic:'chaospanic',plague:'revoltPlague',philosophy:'philosophy',vortex:'vortex',energyfield:'energyfield',magicshelter:'magicshelter',sigilofshrink:'sigilofshrink',
      debility:'debility',chargingstep:'chargingstep'},
    begins:{magicbolt:'bolt',manna:'manna',holyword1:'word1',holyword3:'holyword3',holyword6:'word6',holyword8:'holyword8',
      shatter:'shatter',fly:'fly',drainmagic:'drainmagic',barrier:'barrier',bindingmist:'bindingmist',blackout:'blackout',
      fireshift:'fireshift',watershift:'watershift',earthshift:'earthshift',airshift:'airshift',
      insectswarm:'globalinsectswarm',lifestream:'lifestream',reincarnation:'reincarnation',find:'find',evilblast:'evilblast',elementalwrath:'elementalwrath',
      acidrain:'acidrain',avalanche:'avalanche',banishingray:'banishingray',changeling:'changeling',erasure:'erasure',
      growthbody:'growthbody',landprotection:'landprotection',locust:'locust',massgrowth:'massgrowth',landtransfer:'revoltlandtransfer',
      antielement:'antielement',disease:'disease',drought:'drought',fog:'fog',greed:'greed',vitality:'vitality',weakness:'weakness',
      peace:'peace',permission:'permission',phantasm:'phantasm',pressure:'pressure',punisher:'punisher',revival:'revival',senility:'senility',squeeze:'squeeze',
      massphantasm:'revoltphantasm',deathmiasma:'deathmiasma',dreadblast:'dreadblast',
      antimagic:'antimagic',dreamterrain:'dreamterrain',revelation:'revelation',telegnosis:'telegnosis',
      haste:'haste',slow:'slow',silence:'silence',triumph:'triumph',colorfrombeyond:'colorfrombeyond',
      camouflage:'camouflage',chariot:'chariot',relief:'relief',
      escape:'escape',mountainleap:'mountainleap',lakeleap:'lakeleap',forestleap:'forestleap',plainleap:'plainleap',
      mutation:'mutation',removecurse:'removecurse',turntowall:'turntothewall'}
  };
  // These three original books are the baseline used to calibrate Revolt difficulty.
  const revoltBaselineBooks={
    intro:[
      'manna windofhope relief holyword6 foresight fly',
      'chainmail longsword mace catapult trident',
      'megalodon fighter steamgear goblin tyrannosaurus skeleton armoreddragon statue blitzraven tornado wallofstone ninja phoenix hidebehind'
    ],
    fire:[
      'magicbolt brightworld shatter drainmagic',
      'longsword battleaxe claymore stormcauser mace trident',
      'elvenarcher megalodon hardrockdragon lightningdragon dwarvenminer fighter steamgear blitzraven goblin tyrannosaurus phoenix skeleton armoreddragon ninja griffon'
    ],
    stronghold:[
      'barrier jointworld darkworld lifestream manna',
      'chainmail scalearmor platemail magicshield eternalmail diamondarmor catapult',
      'wallofstone megalodon statue tornado fighter gelatinouswall goblin tyrannosaurus steamgear skeleton armoreddragon mummy burnacle'
    ]
  };
  function modernBooks(cards,edition,bookSize,copyLimit){
    const pool=cards.flatMap((c,id)=>!c.catalogOnly&&!c.generatedOnly?[id]:[]);
    function build(creatures,items,attackWeight,spells){
      const favored=spells.split(' ');
      const groups={creature:[],item:[],spell:[]};
      for(const id of pool)groups[cards[id].kind].push(id);
      const score=id=>{
        const c=cards[id],requirements=(c.catalog?.additionalCost||'').split(',').filter(Boolean).length;
        if(c.kind==='spell'){
          const index=favored.indexOf(c.effect);
          return index<0?-c.cost:100-index;
        }
        const summons=favored.includes('brightworld')&&['dwarvenminer','elvenarcher','hardrockdragon','lightningdragon'].includes(c.catalog?.path.split('/').pop());
        return (c.st||0)*attackWeight+(c.hp||0)*(1-attackWeight)+(c.first?8:0)-c.cost*.4-requirements*18+(summons?40:0);
      };
      for(const group of Object.values(groups))group.sort((a,b)=>score(b)-score(a)||a-b);
      const deck=[];
      function add(group,count){
        const choices=group.filter(id=>deck.filter(card=>card===id).length<copyLimit(cards[id])).slice(0,Math.ceil(count/2));
        for(let copy=0;copy<4&&count>0;copy++){
          for(const id of choices){
            if(count===0)break;
            if(deck.filter(card=>card===id).length<copyLimit(cards[id])){deck.push(id);count--;}
          }
        }
      }
      add(groups.spell,bookSize-creatures-items);
      add(groups.item,items);
      add(groups.creature,creatures);
      add(groups.creature,bookSize-deck.length);
      add(groups.item,bookSize-deck.length);
      add(groups.spell,bookSize-deck.length);
      return deck;
    }
    const ids=new Map(pool.map(id=>[cards[id].catalog.path.split('/').pop(),id]));
    const presets=edition==='revolt'?Object.fromEntries(Object.entries(revoltBaselineBooks).map(([name,groups])=>[
      name,groups.flatMap(group=>{
        const idsInGroup=group.split(' ').map(slug=>ids.get(slug));
        return [...idsInGroup,...idsInGroup];
      })
    ])):{
      intro:build(edition==='begins'?22:28,edition==='begins'?8:10,.5,'manna windofhope relief word6 foresight fly'),
      fire:build(edition==='begins'?24:30,edition==='begins'?9:12,.78,'bolt shatter drainmagic windofhope manna'),
      stronghold:build(edition==='begins'?21:26,edition==='begins'?11:14,.25,'barrier lifestream heal windofhope manna')
    };
    function addNamedBooks(books){
      for(const [key,entries] of Object.entries(books)){
        const deck=Object.entries(entries).flatMap(([name,count])=>Array(count).fill(ids.get(name)));
        if(deck.length===bookSize&&deck.every(Number.isInteger))presets[key]=deck;
      }
      return presets;
    }
    // Culdcept Central's Revolt AI deck records for Alicia, Gen and Yuma.
    if(edition==='revolt')return addNamedBooks({
      revoltAliciaEntry:{
        fighter:2,goblin:4,skeleton:4,statue:4,phlogiston:4,redogre:1,aqualing:2,blueogre:1,wallofice:2,greenogre:1,
        squirrine:2,wallofstone:2,blitzraven:4,yellowogre:1,chainmail:2,mace:2,growthbody:2,holyword1:2,holyword3:2,holyword6:2,
        manna:2,windofhope:2
      },
      revoltGenSerious:{
        skeleton:2,gascloud:3,gladiator:2,kingvaran:2,minotaur:3,phlogiston:3,blitzraven:2,cornfolk:3,griffon:2,spectre:2,
        yellowogre:3,battleaxe:4,chainmail:3,magmahammer:2,scalearmor:3,growthbody:2,holyword1:2,holyword6:3,magicbolt:2,shatter:2
      },
      revoltYumaFellowship:{
        fighter:2,goblin:4,statue:4,amazon:4,aqualing:2,lizardman:3,wallofice:2,greenogre:3,squirrine:3,wallofstone:2,
        chainmail:3,longsword:2,mace:3,sparkball:1,fly:3,holyword6:3,manna:3,windofhope:3
      },
      revoltYumaResolve:{
        fighter:3,amazon:2,aqualing:3,gianteel:2,lizardman:3,wallofice:2,greenogre:2,rocktroll:2,squirrine:3,wallofstone:3,
        woodfolk:3,buckler:2,longsword:2,scalearmor:3,sparkball:2,stormspear:2,fly:2,holyword6:3,manna:2,shatter:2,
        windofhope:2
      },
      revoltYumaBonds:{
        ninja:2,amazon:2,gianteel:2,kingtortoise:1,lizardman:3,scylla:2,wallofice:2,dryad:3,greattusker:2,greenogre:2,
        squirrine:2,woodfolk:3,bindingwhip:2,scalearmor:2,sparkball:2,trident:2,wondercharm:2,blackout:2,earthshift:1,fatbody:2,
        fly:2,gift:2,holyword6:2,shatter:2,watershift:1
      },
      revoltSomniaSerenity:{
        borgess:4,creepingcoin:2,halfling:1,steamgear:1,trojanhorse:2,aqualing:2,blueogre:2,gelatinouswall:3,kingtortoise:2,megalodon:2,
        undine:4,yeti:2,forceanklet:2,ringofthesuccubus:2,stormshield:2,stormspear:2,trident:2,fly:2,foresight:2,freezecyclone:1,
        holyword3:2,reincarnation:3,squeeze:2,watershift:1
      },
      revoltTenetBelief:{
        giantnautilus:2,kaiserpenguin:2,triton:2,wallofice:2,gargoyle:2,sage:2,squirrine:2,wallofstone:2,breezespirit:2,cornfolk:2,
        knight:2,tornado:2,angelcape:4,goldenhammer:1,mace:2,magicshield:3,tearinghalo:1,escape:2,holybanishment:1,holyword3:2,
        liquidform:1,prophecy:2,purify:2,quintessence:2,rayoflaw:1,spiritwalk:2
      },
      revoltTenetPraise:{
        giantnautilus:2,hellgrammite:2,kaiserpenguin:2,triton:2,gargoyle:2,mummy:2,rocktroll:2,sage:2,breezespirit:2,knight:2,
        thunderspawn:2,tornado:2,angelcape:2,diamondarmor:2,goldenhammer:2,tearinghalo:2,trident:2,barrier:2,escape:2,fly:2,
        holybanishment:2,prophecy:2,purify:1,quintessence:2,rayoflaw:1,spiritwalk:2
      },
      revoltAliciaFreedom:{
        halfling:2,wonderwall:2,caitsith:2,firebeak:1,kingvaran:2,phoenix:1,amphibianwarrior:2,
        blueogre:2,gelatinouswall:1,kaiserpenguin:1,cactuswall:2,cockatrice:1,greattusker:1,woodfolk:2,
        centaur:2,gremlin:1,thunderspawn:1,yellowogre:2,battleaxe:2,drilllance:2,eaglerapier:2,
        platemail:2,spikedshield:2,wondercharm:2,drainmagic:2,foresight:2,holyword6:2,quintessence:1,
        relief:2,spartoi:1
      },
      revoltTenetPoverty:{
        gianteel:2,kingtortoise:2,triton:3,greattusker:3,woodfolk:3,caladrius:2,centaur:3,
        dhampir:2,knight:2,wyvern:2,armet:3,sparkball:2,spectresrobe:3,swordofpluck:4,
        blackout:1,escape:2,holybanishment:2,relief:2,speedpenalty:2,spiritwalk:2,wasteworld:3
      },
      revoltGoliganServant:{
        caitsith:2,domovikha:1,kingvaran:2,phoenix:2,redogre:2,giantnautilus:2,kingtortoise:2,
        lizardman:2,triton:2,breezespirit:2,centaur:2,knight:2,serpentfly:2,tornado:2,
        battleaxe:2,catapult:2,spectresrobe:2,spikedshield:2,trident:2,growthbody:2,pacifism:2,
        relief:2,speedpenalty:2,wasteworld:3,windofhope:2
      },
      revoltZenethPower:{
        baal:2,firedrake:2,phoenix:2,gianteel:2,lizardman:2,yeti:2,gargoyle:2,
        spittingcobra:2,woodfolk:2,centaur:2,gremlin:2,knight:2,angelcape:2,catapult:1,
        claymore:2,eaglerapier:2,platemail:2,trident:2,drainmagic:3,haste:3,insectswarm:1,
        magicbolt:4,relief:2,shatter:2
      },
      revoltYumaLove:{
        decoy:2,apsaras:3,fate:2,lilith:3,scylla:2,wallofice:2,dryad:3,
        dwarvenminer:2,grimalkin:2,sage:3,sakuya:2,chillingblast:2,neutralcloak:2,ragdoll:4,
        shadowblaze:2,sparkball:2,bindingmist:2,fatbody:4,holyword6:2,vitality:2,windofhope:2
      },
      revoltHypnaPetrify:{
        cockatrice:3,dragonzombie:2,dryad:2,gargoyle:2,glowhorn:2,healer:2,mudman:3,
        rocktroll:2,screamer:2,spittingcobra:2,woodfolk:3,batteringram:3,gelatinousarmor:2,magmashield:2,
        shadowblaze:4,bindingmist:2,earthshift:2,exile:2,magicalleap:2,manna:2,senility:1,
        turntothewall:3
      },
      revoltMoriAnnoying:{
        amphibianwarrior:2,gelatinouswall:2,kawahime:2,triton:2,undine:2,yeti:2,elvenarcher:1,
        greatnimbus:2,madharlequin:2,rokh:2,spectre:3,witch:2,angrymask:2,battleaxe:2,
        bindingwhip:1,gelatinousarmor:2,shadowblaze:2,squidmantle:2,blackout:2,disease:2,holyword6:2,
        liquidform:2,magicbolt:1,remoteswitch:2,shatter:2,spartoi:2
      },
      revoltSomniaScripture:{
        ironmonger:2,aquahorn:2,fate:2,hellgrammite:2,odontotyrannus:2,triton:2,yeti:2,
        dhampir:2,greatnimbus:2,gremlin:2,rokh:2,serpentfly:2,thunderspawn:2,chillingblast:2,
        forceanklet:2,gremlinseye:2,squidmantle:2,stormspear:2,trident:2,drainmagic:2,gift:2,
        holybanishment:2,holyword6:2,quintessence:2,sigiloffloat:2
      },
      revoltMoriCrazy:{
        amphibianwarrior:2,aquahorn:2,odontotyrannus:2,undine:2,yeti:2,breezespirit:2,elvenarcher:2,
        pulgasari:2,rokh:2,spectre:2,witch:2,battleaxe:2,bindingwhip:1,shadowblaze:2,
        spectresrobe:2,stormshield:2,stormspear:2,blackout:2,chariot:2,disease:2,freezecyclone:1,
        holyword6:2,liquidform:2,remoteswitch:2,shatter:2,spartoi:2
      },
      revoltHypnaBewitch:{
        greatfossil:1,thief:3,cockatrice:4,dragonzombie:4,dryad:3,greattusker:1,greenogre:1,
        mudman:4,rocktroll:1,woodfolk:1,bindingwhip:4,gelatinousarmor:1,magmashield:3,petrifystone:2,
        shadowblaze:1,sparkball:2,bindingmist:1,earthshift:2,exile:1,magicalleap:4,manna:2,
        poisonmind:3,senility:1
      },
      revoltTerrormireFireClaw:{
        shadowgeist:2,chimera:2,conjurer:3,creepingflame:2,fay:2,firebeak:2,firedrake:4,
        kingvaran:2,minotaur:4,shieldmaiden:4,armet:2,burningrod:2,claymore:3,gremlinseye:2,
        magmashield:2,blazesplash:1,drainmagic:2,fireshift:3,gift:2,holyword8:2,magicbolt:2
      },
      revoltGoliganSuppression:{
        ironmonger:2,burnacle:2,caitsith:2,domovikha:1,lonebeast:2,shieldmaiden:2,amphibianwarrior:2,
        aquahorn:2,odontotyrannus:2,triton:2,breezespirit:2,centaur:2,knight:2,rokh:2,
        angelcape:2,diamondarmor:2,sparkball:2,trident:2,wondercharm:2,chaospanic:2,fly:2,
        manna:2,mistyworld:3,relief:2,windofhope:2
      },
      revoltTerrormireFireStorm:{
        shadowgeist:2,chimera:2,conjurer:3,firebeak:2,firedrake:3,hellpyron:1,kingvaran:2,lavakin:2,minotaur:3,shieldmaiden:3,
        burningrod:2,claymore:3,eaglerapier:1,gremlinseye:2,magmashield:2,wondercharm:2,
        blazesplash:1,burninghail:1,drainmagic:2,energyfield:2,fireshift:3,holyword8:2,magicbolt:2,shatter:2
      },
      revoltMemenLame:{
        fate:2,gelatinouswall:2,kaiserpenguin:2,kawahime:2,triton:2,undine:2,dragonzombie:2,
        healer:1,lichenoid:2,mummy:3,screamer:2,tigerweta:2,angrymask:2,battleaxe:2,
        bindingwhip:1,gelatinousarmor:2,shadowblaze:2,squidmantle:2,chaospanic:2,fatbody:2,holyword1:2,
        insectswarm:1,magicbolt:1,magicshelter:2,plague:1,senility:2,sigilofshrink:2
      },
      revoltZenethInvasion:{
        decoy:2,knighterrant:2,pyromancer:3,volcanicdragon:1,gianteel:2,kaiserpenguin:2,lilith:2,
        nessie:2,duskdweller:2,rocktroll:2,woodfolk:2,gremlin:2,knight:2,boomerang:2,
        dragonorb:2,murasame:2,platemail:2,soulray:2,sphereshield:2,drainmagic:2,haste:2,
        magicbolt:2,relief:2,shininggeyser:2,windofhope:2
      },
      revoltKranissResurrection:{
        ammon:2,deathscythe:2,firebeak:2,lonebeast:2,mushussu:2,shieldmaiden:2,cactuswall:2,
        dwarvenminer:2,gargoyle:2,glowhorn:2,greattusker:2,greenogre:2,pixie:2,angrymask:1,
        burningrod:2,diamondarmor:3,drilllance:2,magmashield:2,burninghail:1,earthshift:1,fireshift:1,
        haste:2,magicalleap:2,quintessence:1,reincarnation:1,remission:2,revival:1,squeeze:2
      }
    });
    if(edition!=='saga'&&edition!=='begins')return presets;
    if(edition==='begins')return addNamedBooks({
      // Forty-card recipes checked against the public in-game book codes at culdcept-db.com.
      beginsStarterFireEarth:{
        kobold:1,tigerbeetle:1,airslasher:1,battleaxe:1,flametongue:1,longsword:1,wolf:2,fighter:2,
        dragonfly:2,pillarofflame:2,phoenix:2,minotaur:2,woodfolk:2,wallofstone:2,dwarf:2,gnome:2,
        scalearmor:2,chainmail:2,fly:1,magicbolt:1,windofhope:2,holyword1:2,holyword6:2,manna:2
      },
      beginsStarterWaterAir:{
        merfolk:1,giantbat:1,icicle:1,battleaxe:1,rockbiter:1,longsword:1,wolf:2,fighter:2,
        giantamoeba:2,wallofice:2,kingtortoise:2,lizardman:2,cornfolk:2,spectre:2,harpy:2,hurricane:2,
        scalearmor:2,chainmail:2,fly:1,magicbolt:1,windofhope:2,holyword1:2,holyword6:2,manna:2
      },
      beginsVeramiSeaWind:{
        wallofice:1,dwarf:2,merfolk:2,megalodon:2,lizardman:2,giantrat:3,fighter:3,bandit:3,
        woodfolk:3,sage:3,pirate:4,holyword1:2,holyword3:2,shatter:2,holyword6:3,fly:3
      },
      beginsIsharaFirst:{
        spear:2,phoenixamulet:2,mace:3,leatherarmor:3,giantbat:3,spectre:3,cornfolk:3,tigerbeetle:3,wallofstone:3,gnome:3,
        holyword3:2,holyword6:2,haste:2,fly:2,windofhope:2,manna:2
      },
      beginsGanzBeast:{
        scalearmor:1,towershield:1,weakness:1,chainmail:2,morningstar:2,wolf:2,lunatichare:2,growthbody:2,
        carbuncle:3,cerberus:3,blynx:3,jackalope:3,haste:2,fly:2,windofhope:2,vitality:2,massgrowth:2,earthshift:2,greattusker:3
      },
      beginsGanzInstinct:{
        towershield:1,catapult:2,batteringram:2,werewolf:2,carbuncle:2,coati:2,sage:2,growthbody:2,gigantherium:3,
        grimalkin:4,jackalope:4,massgrowth:1,windofhope:2,earthshift:2,haste:3,fly:3,greattusker:3
      },
      beginsGanzGiantBeasts:{
        catapult:2,earthshield:2,batteringram:2,werewolf:2,cockatrice:2,coati:3,odradek:3,grimalkin:3,
        sage:3,gigantherium:3,jackalope:3,haste:2,fly:2,earthshift:2,windofhope:3,greattusker:3
      },
      beginsTindalosFreeWind:{
        swordofthefalcon:2,windshield:2,gremlinamulet:2,armet:2,bindingwhip:2,sprite:2,leveller:2,nike:2,
        giantamoeba:2,gianteel:2,phoenix:2,hornet:3,centaur:3,firebeak:1,holyword3:2,windofhope:2,senility:2,
        airshift:2,bindingmist:3
      },
      beginsNajaranMistral:{
        longsword:1,airslasher:1,buckler:1,towershield:1,windcutter:2,magicshield:2,harpy:2,gremlin:2,elf:2,knight:2,
        wyvern:2,pillarofflame:2,minotaur:2,caitsith:2,dragon:2,mutation:1,haste:2,fly:2,removecurse:2,shatter:2,
        firebeak:2,windofhope:3
      },
      beginsPopoloDragon:{
        basilisk:1,firebolt:2,stonehail:2,armet:2,glaive:2,wallofstone:2,dragon:2,influence:2,hornedchameleon:3,
        greatfossil:3,dragonzombie:3,hellhound:3,mountainleap:2,manna:2,relief:3,kingvaran:3,fireshift:3
      },
      beginsSteamdrillPierce:{
        steamgear:2,statue:2,wonderwall:2,colossus:2,merfolk:2,drool:2,kobold:2,lavawurm:2,goldengoose:3,
        lizardman:3,golem:3,mace:4,spear:4,morningstar:4,drilllance:3
      },
      beginsArtAssault:{
        abyssalmonarch:1,hornedchameleon:3,gascloud:3,flameacolyte:3,flamegoetia:2,aeroacolyte:3,aerogoetia:2,fighter:2,
        chainmail:3,magicshield:2,gremlinamulet:1,boomerang:2,
        manna:3,magicbolt:2,holyword6:2,shatter:2,find:2,fly:2
      },
      beginsTidalGuard:{
        aquagoetia:3,aquaacolyte:2,gascloud:2,kingtortoise:2,dwarf:3,hornedchameleon:3,goldentotem:2,terragoetia:2,
        chainmail:3,magicshield:2,watershield:2,towershield:1,countershield:2,
        manna:3,growthbody:2,greed:2,landprotection:2,lifestream:2
      }
    });
    const gear={prismaticwand:2,scalearmor:2,towershield:2,longsword:2};
    // Culdcept Central's Xbox 360 opening books: 446-cs360-playerdecks-starterby and 426-cs360-playerdecks-starterrg.
    const starterShared={
      fighter:2,giantrat:2,goblin:2,skeleton:2,
      chainmail:2,leatherarmor:2,longsword:2,mace:2,
      crusher:2,cure:2,haste:1,holyword1:2,holyword6:2,magicbolt:2,manna:2
    };
    const books={
      sagaStarterWater:{
        ...starterShared,aqualing:2,blueogre:2,giantamoeba:2,lizardman:2,wallofice:2,
        blitzraven:2,griffon:2,harpy:2,tornado:2,yellowogre:2,freezingwind:1
      },
      sagaStarterFire:{
        ...starterShared,creepingflame:2,gascloud:2,minotaur:2,phlogiston:2,redogre:2,
        dwarf:2,greenogre:2,squirrine:2,wallofstone:2,woodfolk:2,firestone:1
      },
      // Xbox 360 Rilara deck records: 98-cs360-aidecks-rilara.
      sagaRilaraPlunder:{
        bandit:4,fighter:2,goblin:4,thief:4,gascloud:2,redogre:2,blueogre:2,giantamoeba:2,
        dwarf:2,greenogre:2,harpy:2,yellowogre:2,chainmail:2,leatherarmor:2,longsword:3,mace:2,
        ringofthesuccubus:2,drainmagic:1,holyword1:2,holyword6:2,manna:2,slow:2
      },
      sagaRilaraRobbery:{
        fighter:4,giantrat:4,goblin:4,phlogiston:2,redogre:4,aqualing:2,blueogre:4,greenogre:4,
        squirrine:2,blitzraven:2,yellowogre:4,leatherarmor:2,mace:2,sling:2,haste:2,magicbolt:2,
        manna:2,slow:2
      },
      // Xbox 360 Gottlieb deck records: 111-cs360-aidecks-gottlieb.
      sagaGottliebKill:{
        thief:2,bia:3,fay:3,hellhound:2,peri:2,sharazad:3,cerberus:2,dryad:3,
        grimalkin:2,healer:3,sakuya:2,chainmail:2,bravesong:2,cleanse:1,crusherstorm:2,find:1,
        holyword0:1,holyword3:1,holyword6:1,illness:2,manna:2,shrink:2,silence:2,toughsong:2,upheaval:1,wildgrowth:1
      },
      sagaGottliebSlaves:{
        thief:2,bia:2,fay:3,hellhound:2,peri:2,sharazad:3,cerberus:2,dryad:3,
        grimalkin:3,healer:2,sakuya:2,chainmail:2,magmahammer:2,bravesong:2,cramp:1,crusherstorm:2,
        fog:2,holyword0:1,holyword3:2,holyword6:2,illness:2,manna:2,telegnosis:2,windofhope:2
      },
      // Xbox 360 Borival and Zeneth deck records: 103-cs360-aidecks-borival and 120-cs360-aidecks-zeneth.
      sagaBorivalFire:{
        barbarian:2,bia:2,creepingflame:2,fay:2,firegiant:2,gascloud:2,lavawurm:2,minotaur:2,
        peri:2,phlogiston:2,phoenix:2,salamander:2,sorcerer:2,aurablade:2,chainmail:2,firestone:2,
        morningstar:2,stormcounter:2,chariot:2,haste:2,holyword1:2,hustle:2,influence:2,manna:2,mutation:2
      },
      sagaZenethDragon:{
        hornedchameleon:2,gascloud:2,golem:2,hellhound:2,salamander:2,charon:2,giantamoeba:2,lilith:2,
        stormgiant:2,griffon:2,soulcollector:2,spectre:2,catapult:2,claymore:3,counteramulet:2,platemail:3,
        antielement:2,antimagic:2,banishingray:2,insectswarm:2,magicbolt:3,manna:2,phantasm:2,tempest:1
      },
      // Xbox 360 Ticomun deck records: 102-cs360-aidecks-ticomun.
      sagaTicomunKill:{
        fighter:2,giantrat:2,goblin:2,deathquito:2,gelatinouswall:2,lilith:2,lizardman:2,seahag:2,
        centaur:3,harpy:3,pegasus:2,tornado:2,battleaxe:1,buckler:2,chainmail:2,leatherarmor:2,
        longsword:2,mace:1,sling:2,blackout:2,holyword6:2,holyword1:2,magicbolt:2,manna:2,pain:2
      },
      sagaTicomunChallenge:{
        deathquito:3,gelatinouswall:2,grendel:1,seahag:2,lizardman:2,stormgiant:2,centaur:2,harpy:2,
        knight:2,nightmare:2,pegasus:2,tornado:2,amethystring:1,berylring:1,buckler:2,chainmail:2,
        longsword:2,sling:2,stormspear:2,blackout:2,crusher:2,holyword6:2,holyword1:2,manna:2,pain:2,waste:2
      },
      sagaRilaraExploit:{
        bandit:4,fighter:2,thief:2,boggart:2,hellhound:2,amazon:3,gelatinouswall:2,dwarf:2,
        squirrine:2,gremlin:1,succubus:1,witch:3,gremlintooth:1,kris:2,morningstar:2,ringofthesuccubus:3,
        scalearmor:2,vestment:2,capture:1,drainmagic:2,haste:2,landdrain:2,manna:2,slow:2,theft:1
      },
      sagaBorivalHellFire:{
        barbarian:2,burnacle:2,burningtitan:2,coaloid:4,creepingflame:2,firegiant:2,gascloud:2,hellpyron:1,
        helltic:2,kasha:2,peri:2,phlogiston:2,salamander:2,fireshield:2,firestone:2,gremlintooth:2,magmahammer:4,
        bravesong:2,burninghail:2,influence:1,magicbolt:2,mountainleap:2,upheaval:2,venomousboil:2
      },
      sagaRilaraConspire:{
        bandit:4,fighter:2,hornedchameleon:2,thief:2,golem:2,hellhound:2,phlogiston:1,amazon:3,bunyip:1,lamia:1,
        dwarf:2,squirrine:3,pegasus:2,succubus:1,witch:2,chainmail:2,kris:1,morningstar:2,ringofthesuccubus:2,
        sling:2,backward:2,drainmagic:2,feast:1,holyword8:2,manna:2,slow:2
      },
      sagaRilaraFierce:{
        bandit:4,thief:2,boggart:3,firegiant:2,gascloud:2,gladiator:1,minotaur:2,phlogiston:2,revenant:2,squirrine:2,
        vampire:1,wereboar:2,weretiger:2,wolverine:3,boomerang:2,catapult:2,gremlintooth:2,ringofthesuccubus:2,
        scalearmor:2,capture:1,drainmagic:2,fairylight:2,slow:2,theft:1,venomousboil:2
      },
      sagaKoenigStar:{
        fighter:2,gemoid:2,giantrat:4,goblin:4,skeleton:4,statue:2,gascloud:2,phoenix:2,aqualing:2,lizardman:2,
        dwarf:2,mummy:2,blitzraven:2,sylph:2,chainmail:2,leatherarmor:2,longsword:2,mace:2,
        haste:2,magicbolt:2,manna:2,slow:2
      },
      sagaTraderMoney:{
        barbarian:2,boggart:2,caitsith:2,coaloid:2,gascloud:2,gelatinouswall:2,hypnosloth:2,lichenoid:2,mummy:2,
        spudfolk:2,wolverine:2,witch:2,jackolantern:2,deathchoker:1,longbow:2,petrifystone:2,thehand:2,
        drainmagic:2,dreamterrain:1,echo:1,fairylight:1,feast:1,greed:2,incineration:1,landdrain:2,manna:2,refuge:2,squeeze:2
      },
      sagaGuilderTwins:{
        burningtitan:2,coaloid:2,golem:2,lavawurm:2,salamander:2,dragonzombie:2,gigantherium:2,pangolin:2,
        spinyagama:2,trenchwurm:2,crimsonvine:2,jackolantern:1,magmaavatar:1,firestone:2,magmaarmor:2,
        magmahammer:4,scalearmor:4,burninghail:2,forestleap:1,holyword0:2,holyword8:2,mountainleap:1,upheaval:2,venomousboil:2,wildgrowth:2
      },
      sagaImmediate:{
        barbarian:4,tokebi:3,fay:2,lichenoid:2,sakuya:3,wolverine:2,rockshell:2,goblin:4,
        ...gear,zap:3,crusher:3,cleanse:2,reincarnation:2,revelation:2,holyword8:3,windofhope:3,fame:2
      },
      sagaAffinity:{
        minotaur:4,barbarian:4,goblin:2,woodfolk:4,golem:2,wolverine:2,rockshell:2,sakuya:2,mudman:2,
        ...gear,bistair:3,selenear:3,manna:3,holyword8:2,elevation:2,fame:3,revelation:2
      }
    };
    return addNamedBooks(books);
  }
  function handheldBooks(cards){
    const ids=new Map(cards.flatMap((card,id)=>card.unlisted||card.catalogOnly||card.generatedOnly?[]:[[card.catalog.path.split('/').pop(),id]]));
    const books={
      intro:{
        goblin:3,wolf:2,woodfolk:4,dwarf:3,greenmold:2,troll:2,healer:2,goobaqueen:2,sakuya:2,pan:2,
        earthshield:3,scalearmor:2,boomerang:2,countershield:1,vorpalsword:2,
        manna:3,windofhope:3,holyword6:2,wildgrowth:2,barrier:2,relief:2,drainmagic:2
      },
      fire:{
        minotaur:3,dragonfly:3,conjurer:2,gladiator:2,ixtol:2,shadefolk:3,sleipnir:3,nightmare:2,gremlin:2,goblin:2,
        blackorb:2,lifestealer:2,vorpalsword:2,gremlinamulet:2,chainmail:2,countershield:1,powercrown:1,
        manna:2,windofhope:2,holyword6:2,magicbolt:2,evilblast:2,upheaval:2,drainmagic:2
      },
      stronghold:{
        giantamoeba:3,kingtortoise:3,lizardman:3,wallofice:3,gianteel:2,fate:2,bookworm:2,archbishop:2,hyde:2,
        watershield:3,magicshield:2,magussmirror:1,spikedshield:2,countershield:2,powercrown:1,holygrail:1,
        manna:3,windofhope:3,sink:2,relief:2,lifestream:2,peace:1,barrier:2,landdrain:1
      },
      // Four starter books recorded by OmiyaSoft in the 2012 player deck archive.
      handheldStarterFireEarth:{
        cyclops:2,fighter:2,giantrat:1,wolf:2,dragonfly:2,gascloud:2,kobold:2,minotaur:2,
        pillarofflame:2,dwarf:2,pan:2,tigerbeetle:2,wallofstone:2,woodfolk:2,battleaxe:1,chainmail:2,
        flametongue:1,leatherarmor:1,longsword:1,mace:1,scalearmor:1,stonehail:1,fly:2,holyword1:2,
        holyword6:2,magicbolt:2,manna:3,shatter:2,windofhope:1
      },
      handheldStarterWaterAir:{
        cyclops:2,fighter:2,giantrat:1,wolf:2,giantamoeba:2,kingtortoise:2,lizardman:2,merfolk:2,
        wallofice:2,giantbat:2,harpy:2,hornet:2,hurricane:2,spectre:2,battleaxe:1,chainmail:2,
        leatherarmor:1,longsword:1,mace:1,scalearmor:1,icicle:1,windcutter:1,fly:2,holyword1:2,
        holyword6:2,magicbolt:2,manna:3,shatter:2,windofhope:1
      },
      handheldStarterFireAir:{
        cyclops:2,fighter:2,giantrat:1,wolf:2,dragonfly:2,gascloud:2,kobold:2,minotaur:2,
        pillarofflame:2,giantbat:2,harpy:2,hornet:2,hurricane:2,spectre:2,battleaxe:1,chainmail:2,
        leatherarmor:1,longsword:1,mace:1,scalearmor:1,firebolt:1,rockbiter:1,fly:2,holyword1:2,
        holyword6:2,magicbolt:2,manna:3,shatter:2,windofhope:1
      },
      handheldStarterWaterEarth:{
        cyclops:2,fighter:2,giantrat:1,wolf:2,giantamoeba:2,kingtortoise:2,lizardman:2,merfolk:2,
        wallofice:2,dwarf:2,pan:2,tigerbeetle:2,wallofstone:2,woodfolk:2,battleaxe:1,chainmail:2,
        leatherarmor:1,longsword:1,mace:1,scalearmor:1,airslasher:1,freeze:1,fly:2,holyword1:2,
        holyword6:2,magicbolt:2,manna:3,shatter:2,windofhope:1
      }
    };
    for(const [,,source,recipe] of handheldPlayerBooks){
      if(Object.values(recipe).reduce((sum,n)=>sum+n,0)===50&&Object.keys(recipe).every(slug=>ids.has(slug)))books['handheld-'+source]=recipe;
    }
    return Object.fromEntries(Object.entries(books).map(([key,counts])=>[key,Object.entries(counts).flatMap(([name,count])=>Array(count).fill(ids.get(name)))]));
  }
  // Element pairs are separate from the land requirements in the catalog.
  const sagaPairs={crimsonvine:[0,2],flammefleur:[0,2],fontaciel:[1,3],frostbeast:[1,3],gogma:[2,3],
    jackolantern:[0,2],magmaavatar:[0,2],stormavatar:[1,3],stymphalides:[1,3],warlock:[0,1]};
  const battleElements=['fire','water','earth','air'];
  const elementalTraits={'Critical Hit':'criticalElements',Penetrates:'pierceElements',Reflects:'reflectElements',Neutralizes:'neutralizes'};
  function elementalTrait(clause){
    const parts=clause.match(/^(Critical Hit|Penetrates|Reflects|Neutralizes): (Normal Attacks|(?:\[(?:fire|water|earth|air|neutral)\] ?)+)\.?$/);
    if(!parts)return null;
    if(parts[2]==='Normal Attacks'){
      if(parts[1]==='Reflects')return {reflectNormal:true};
      if(parts[1]==='Neutralizes')return {neutralizeNormal:true};
      return null;
    }
    const elements=[...parts[2].matchAll(/\[(\w+)\]/g)].map(([,name])=>battleElements.indexOf(name));
    return {[elementalTraits[parts[1]]]:elements};
  }
  const revoltBattleCards={
    gascloud:{half:true},woodfolk:{support:true},bandit:{support:true},borgess:{},ninja:{first:true,scrollCritical:true},
    statue:{stationary:true},trojanhorse:{support:true},caitsith:{spellWard:true},baal:{first:true},firedrake:{},
    amphibianwarrior:{immutableHP:true},cockatrice:{},apsaras:{},lilith:{first:true},
    livinghelmet:{itemCreature:true},livingarmor:{itemCreature:true,battleST:50},
    aquahorn:{neutralizes:[1,2]},mistwing:{neutralizes:[0,3]},odontotyrannus:{synergy:{element:3,st:20,hp:10}},pulgasari:{},
    kelpie:{},oldwillow:{stationary:true},nightmare:{},sulfurousballoon:{},tetrarm:{doubleAttack:true},
    burningtitan:{},nessie:{},soulcollector:{},samurai:{},saint:{neutralizes:[-1]},shadowgeist:{first:true,vigorous:true,drainST:true},
    pixie:{support:true,supportElements:[0,2],vigorous:true},duskdweller:{first:true},rocktitan:{},devastator:{},
    greatfossil:{stationary:true,freeToll:true,reviveForm:'tyrannosaurus'},gigantherium:{},
    conjurer:{scrollCritical:true},gooba:{generatedOnly:true},hiveworker:{},legendarypharos:{stationary:true,noLapHeal:true},
    ammon:{spellWard:true,synergy:{element:2,st:20,hp:20}},mushussu:{synergy:{element:2,st:20,hp:10},criticalElements:[0,2]},
    sproutling:{bonusTerrain:[0]},shankrubber:{spellWard:true},knighterrant:{synthesis:'earth',synthesizedForm:'armedpaladin',partialReflect:.5},
    armedpaladin:{generatedOnly:true,neutralizeScroll:true},lavakin:{},otohime:{},pyromancer:{innateScroll:30},kirin:{first:true,synergy:{element:1,st:20,hp:20}},
    chimera:{first:true,lapStrength:true},creepingflame:{stationary:true},lonebeast:{},earthspirit:{commandMHP:10},dunetitan:{commandMHP:-10},
    glowhorn:{synergy:{element:0,st:20,hp:20}},rokh:{synergy:{element:1,st:30}},mudman:{},madharlequin:{vigorous:true},witch:{scrollCritical:true},
    grimalkin:{support:true,supportElements:[0,2],spellWard:true},
    phlogiston:{criticalMHP:40},aqualing:{blocksSmall:true},squirrine:{support:true},cornfolk:{},amazon:{},phoenix:{},
    scylla:{blocksAttackAbilities:true},greattusker:{blocksFirst:true},
    cactuswall:{stationary:true,regenerate:true},tigerweta:{},mummy:{stationary:true},
    kaiserpenguin:{},gargoyle:{first:true},sage:{support:true,protectGear:true,scrollCritical:true},
    hellgrammite:{},serpentfly:{first:true,bonusTerrain:[1]},thunderspawn:{},
    triton:{scrollCritical:true},dhampir:{},knight:{},gremlin:{},breezespirit:{remoteVacantElements:[1,3]},
    creepingcoin:{},halfling:{spellWard:true,anyTerrain:true},gelatinouswall:{stationary:true},undine:{},yeti:{},
    centaur:{first:true},wyvern:{first:true,remoteVacantElements:[3]},dryad:{support:true,supportElements:[-1,0,2],remoteVacantElements:[2]},
    sparkball:{st:40},magmahammer:{st:20,criticalOwnElements:[0,2]},stormspear:{st:20,criticalOwnElements:[1,3]},
    angelcape:{hp:40,protectItem:true},spikedshield:{},goldenhammer:{st:40},swordofpluck:{st:40,criticalRarity:'N'},
    bindingwhip:{st:30},moonscimitar:{st:30},forceanklet:{},stormshield:{},drilllance:{st:20,pierceAll:true},batteringram:{st:30},boomerang:{st:20,hp:10},buckler:{},magicshield:{hp:30},magussmirror:{hp:20},
    petrifystone:{},prismaticwand:{},ringofthesuccubus:{first:true},tearinghalo:{st:30,protectItem:true},wondercharm:{},
    goldengoose:{},silverplow:{st:10,hp:20},vorpalsword:{st:30},tonfa:{doubleAttack:true},neutralcloak:{hp:40},
    sphereshield:{effect:'nullify'},murasame:{st:20,effect:'orb'},magmashield:{},mirrorhoplon:{},squidmantle:{hp:40},
    reactivearmor:{hp:30},gremlinseye:{},magmaarmor:{},stormarmor:{},tombstone:{protectItem:true},
    aurastrike:{},burningrod:{scrollTerritoryElements:[0,2],scrollCriticalElements:[1,3]},
    chillingblast:{scrollTerritoryElements:[1,3],scrollCriticalElements:[0,2]},
    angrymask:{hp:30},argentkey:{first:true,st:10},burningheart:{st:20,hp:20},gelatinousarmor:{hp:40},
    necroplasma:{st:50},necroscarab:{},twinspike:{st:20},napalmarrow:{st:30,hp:20},
    magmaflail:{criticalElements:[1,3]},stormhalberd:{criticalElements:[0,2]},clawofshade:{},shadowblaze:{st:40},
    topazamulet:{neutralizes:[0,3],instantDeathElements:[0,3]},turquoiseamulet:{neutralizes:[1,2],instantDeathElements:[1,2]},
    chainsaw:{},ragdoll:{neutralizeScroll:true},warlocksdisk:{},eternalmail:{hp:40},soulray:{st:30},dragonorb:{},spectresrobe:{},
    volcanicdragon:{first:true,innateScroll:'base'},deepseadragon:{first:true,innateScroll:'base'}
  };
  const beginsCreatures={
    gascloud:{half:true},bandit:{support:true},borgess:{},decoy:{},goldentotem:{stationary:true},hornedchameleon:{},skeleton:{regenerate:true},
    gnome:{tollFactor:1.5},phoenix:{},wallofice:{stationary:true,battleHP:20},
    giantamoeba:{neutralizes:[0,2]},cornfolk:{},spectre:{},
    greattusker:{blocksFirst:true},blynx:{spellWard:true,remoteVacant:true},troll:{regenerate:true},zombie:{},centaur:{first:true},
    nightmare:{},pushpull:{doubleAttack:true},wereboar:{},greenmold:{stationary:true,regenerate:true},
    lavawurm:{pierceElements:[1]},stormgiant:{criticalElements:[0]},firegiant:{criticalElements:[1]},
    ninja:{first:true,scrollCritical:true},elf:{first:true,criticalElements:[2]},knight:{},gargoyle:{first:true},
    sprite:{blocksLarge:true},statue:{stationary:true},gianteel:{neutralizes:[2,3]},hellhound:{},
    roadrunner:{first:true},lilith:{first:true},sandman:{spellWard:true,immutableHP:true},
    pegasus:{first:true,spellWard:true,neutralizeScroll:true},caitsith:{spellWard:true},hydra:{},
    manticore:{},coati:{},mudman:{},anubias:{},steamgear:{tollFactor:.5},wonderwall:{stationary:true,neutralizes:[0,1,2,3]},
    firebeak:{first:true,pierceElements:[1,3],criticalElements:[1,3]},trojanhorse:{support:true},gigantherium:{},
    aspidochelone:{},dragon:{first:true},hornet:{poison:true},
    battlegearalpha:{support:true,spellWard:true},battlegearbeta:{support:true,neutralizeScroll:true},
    bundlegear:{spellWard:true,neutralizeScroll:true,generatedOnly:true},
    jackalope:{support:true},humbaba:{poison:true},lunatichare:{},
    werewolf:{},cockatrice:{},grimalkin:{support:true,supportElements:[-1,2],spellWard:true},
    odradek:{support:true,supportElements:[-1,2],immutableHP:true},leveller:{},nike:{first:true},
    carbunfly:{first:true,generatedOnly:true},
    gremlin:{},wyvern:{first:true,remoteVacantElements:[3],landBan:2},basilisk:{},greatfossil:{stationary:true,freeToll:true},
    colossus:{last:true},drool:{pierceAll:true},golem:{},
    sage:{support:true,supportElements:[-1,2],protectGear:true},pirate:{support:true,supportElements:[-1,1]},
    flameacolyte:{innateScroll:30,scrollCriticalElements:[0]},
    aquaacolyte:{innateScroll:30,scrollCriticalElements:[1]},
    terraacolyte:{innateScroll:30,scrollCriticalElements:[2]},
    aeroacolyte:{innateScroll:30,scrollCriticalElements:[3]},
    terragoetia:{innateScroll:40,support:true,supportElements:[-1,2],blocksAttackAbilities:true},
    aquagoetia:{innateScroll:40,half:true},flamegoetia:{innateScroll:40},aerogoetia:{innateScroll:40,first:true},abyssalmonarch:{innateScroll:50}
  };
  const beginsExtraTerritories={flamegoetia:'R,R',aerogoetia:'Y,Y',carbunfly:'R,R',basilisk:'G,G'};
  // Only enable Begins items whose printed effects the battle engine handles.
  const beginsGear={
    gaseousform:{effect:'nullify'},airslasher:{st:30},flametongue:{st:30},battleaxe:{st:40},
    icicle:{st:30,critical:0},rockbiter:{st:30,critical:2},phoenixamulet:{},goldengoose:{},ringofthesuccubus:{first:true},
    batteringram:{st:20},bindingwhip:{st:30},gremlinamulet:{},rathunter:{},boomerang:{st:20,hp:10},
    buckler:{},countershield:{effect:'reflect'},diamondarmor:{st:-30,hp:60,last:true},
    earthshield:{},fireshield:{},watershield:{},windshield:{},
    eternalmail:{hp:40},knightsshield:{},magicshield:{hp:30},spikedshield:{},
    towershield:{halveScroll:true},vestment:{hp:30},
    glaive:{st:20,hp:20},drilllance:{st:20,pierceAll:true},aurablade:{},petrifystone:{},
    freeze:{st:30,critical:0},firebolt:{st:30,critical:1},windcutter:{st:30,critical:2},
    stonehail:{st:30,critical:3},hellblaze:{st:40},nuclearfusion:{st:50},sparkball:{st:40}
  };
  const handheldSpecial={
    gascloud:{half:true},statue:{stationary:true},doppelganger:{},sanctumguard:{first:true},squonk:{support:true},barrowwight:{},
    madclown:{},hornet:{poison:true},medusa:{},vodyanoi:{first:true},gargoyle:{first:true},odradek:{support:true,immutableHP:true},dhampir:{neutralizes:[2]},soulcollector:{},
    colossus:{},decoy:{},dryad:{support:true},nike:{first:true},sprite:{blocksLarge:true},humbaba:{},jackalope:{support:true},neutralcloak:{st:0,hp:40},
    chimera:{first:true},dragon:{first:true},firedrake:{},flamelord:{scrollCritical:true},generalguan:{first:true},golem:{},
    salamander:{},fireamulet:{st:20,hp:10},oldwillow:{stationary:true},caitsith:{spellWard:true},sulfurousballoon:{},
    burningtitan:{},camazotz:{},leveller:{},myrmecoleo:{last:true,reviveForm:'dragonfly'},powdereater:{},
    powerbracelet:{st:0,hp:0},
    aurablade:{st:0,hp:0},coinofpiety:{st:0,hp:0},hellblaze:{st:40,hp:0},iksear:{st:0,hp:0,protectItem:true},
    kris:{st:30,hp:0,protectItem:true},offeringdoll:{st:0,hp:0},rainbowpiece:{st:0,hp:40,neutralizeScroll:true},
    shadowarmor:{st:0,hp:0},sleep:{st:0,hp:0},stinkbottle:{st:0,hp:0},trapezon:{st:0,hp:0},wingedboots:{st:0,hp:0,first:true,protectItem:true},
    shadefolk:{revenge:'magic'},catoblepas:{revenge:'level',poison:true},raksas:{revenge:'symbols'},
    mindripper:{revenge:'hand',st:40,hp:0},soulcorrupter:{revenge:'symbols',st:40,hp:0},
    powercrown:{revenge:'fossil',protectItem:true,st:0,hp:0},
    ixtol:{revenge:'destroy'},kodama:{revenge:'shrink',support:true},lifestealer:{revenge:'shrink',st:40,hp:0},
    greatfossil:{stationary:true,freeToll:true},metalbug:{},sakuya:{support:true},barometz:{stationary:true},
    archbishop:{},clockworkowl:{},dancingdoll:{},domovikha:{},domovoi:{},fanatic:{},
    sharazad:{support:true},algasphere:{stationary:true},banshee:{},bookworm:{},hyde:{},
    healer:{regenerate:true},spittingcobra:{},archer:{},holyllama:{},witch:{},goldentotem:{stationary:true},
    fate:{},mystic:{},necromancer:{scrollCritical:true},conjurer:{scrollCritical:true},
    goobaqueen:{},gooba:{generatedOnly:true},sleipnir:{},
    gremlin:{},blackorb:{effect:'orb',protectItem:true},fireshield:{},holygrail:{},
    magicshield:{hp:30},magussmirror:{hp:20},smoketorch:{hp:20},stonehail:{st:30,critical:3},
    tearinghalo:{st:30,protectItem:true},knightsshield:{},spikedshield:{},vorpalsword:{st:30},prismaticwand:{}
  };
  const sagaStarterEffects={
    aqualing:{blocksSmall:true},blitzraven:{criticalMHP:30},phlogiston:{invadeST:20},
    wallofice:{stationary:true,battleHP:30},tornado:{stationary:true,first:true,battleST:30,battleHP:-10},
    creepingflame:{stationary:true},
    freezingwind:{st:30,hp:0,scrollCriticalElements:[0,2]},firestone:{st:30,hp:0,scrollCriticalElements:[1,3]}
  };
  const sagaBattleCreatures={
    leoknight:{},sanctumguard:{first:true},trojanhorse:{support:true},anubias:{},
    lilith:{first:true},gargoyle:{first:true},odradek:{support:true},nightfiend:{first:true},
    nike:{first:true},pegasus:{first:true,spellWard:true,neutralizeScroll:true},soulcollector:{},
    beastgear:{spellWard:true,neutralizeScroll:true},colossus:{},gemoid:{stationary:true,freeToll:true,immutableHP:true},garuda:{},pangolin:{},brontides:{support:true},revenant:{paralyze:true},vampire:{first:true},
    deathquito:{first:true},salamander:{},charon:{},centaur:{first:true},gelatinouswall:{stationary:true},seahag:{entryEnchant:'greed'},sirgawain:{},coaloid:{},bia:{},burningtitan:{},kasha:{},aspidochelone:{},weretiger:{},tetrarm:{doubleAttack:true}
  };
  const sagaTerritoryCreatures={
    archbishop:{},domovoi:{},sharazad:{support:true},bookworm:{},hyde:{},healer:{regenerate:true},holyllama:{},
    lamia:{entryEnchant:'spiritwalk'},sylph:{blocksLarge:true},spudfolk:{},spinyagama:{},seismodon:{},fortress:{stationary:true},helltic:{},hellpyron:{},burnacle:{stationary:true}
  };
  const sagaTerritoryIdols=new Set(['clayidol','ebonyidol','goldidol','ironidol','ivoryidol','jadeidol','leadidol','opalidol']);
  const sagaGear={
    aurablade:{},batteringram:{st:20},coinofpiety:{},fireshield:{},kris:{st:30,protectItem:true},
    ringofthesuccubus:{first:true},shadowarmor:{},sleep:{},smoketorch:{},tearinghalo:{st:30,protectItem:true},
    vorpalsword:{st:30},forceanklet:{},forcebracelet:{},knightsshield:{},spikedshield:{},
    magmaarmor:{},magmahammer:{st:20,criticalOwnElements:[0,2]},stormarmor:{},stormspear:{st:20,criticalOwnElements:[1,3]},
    soulray:{st:30},tonfa:{doubleAttack:true},gremlinclaw:{},gremlintooth:{},
    corrosiveknife:{},deathchoker:{st:30,pierceAll:true},doomneedle:{st:20},neutralcloak:{hp:20},metamorphosebelt:{},bladeofculdra:{st:40,hp:40},
    necroscarab:{},tombstone:{},cursedseal:{}
  };
  function configure(edition,cards,presets,bookSize,copyLimit){
    const index=new Map(cards.flatMap((c,i)=>c.catalog?[[c.catalog.path.split('/').pop(),i]]:[]));
    for(const c of cards){c.unlisted=true;}
    for(const [i,r] of data.cards[edition].entries()){
      const sourceSlug=r.slug||r.name.toLowerCase().replace(/[^a-z0-9]/g,''),id=index.get(sourceSlug),base=cards[id];
      const slug=edition==='begins'&&sourceSlug==='battlegear'?r.image.split('/').pop():sourceSlug;
      const category=categories[r.type],kind=r.type[0]==='e'?'creature':r.type[0]==='i'?'item':'spell';
      const path=base?.catalog.path||((kind==='creature'?category:kind+'s')+'/'+slug);
      const traits={'援護':'support','再生':'regenerate','先制':'first','後手':'last','防御型':'stationary',...(edition==='revolt'?{Vigorous:'vigorous'}:{})};
      const clauses=r.ability.split(' ; ');
      const effects=modernSets[edition]&&category!=='scroll'&&kind!=='spell'?new Map(clauses.map(v=>[v,elementalTrait(v)])):new Map();
      const basicCreature=kind==='creature'&&clauses.every(v=>v==='-'||traits[v]||effects.get(v));
      const gearClauses=modernSets[edition]?clauses.map(v=>v.replace(/^AT(?=[+-]\d+$)/,'ST')):clauses;
      const basicGear=kind==='item'&&gearClauses.every(v=>/^(ST|HP)[+-]\d+$/.test(v)||v==='先制'||!!modernSets[edition]&&v==='後手'||effects.get(v));
      const simple=basicCreature||basicGear;
      const first=edition==='saturn'||edition==='ps1';
      const variant=first&&['dragon','pan','hornet','holyword1','holyword6','magicbolt','steamgear','golem','sorcerer','manticore','armadillo','coati','darkelf','elf','knight','samurai','deathgaze','goldengoose','wallofice','giantspider','giantsnake','stonehail','cure'].includes(slug);
      const compatible=!!base&&!base.catalogOnly&&(r.shared||variant);
      const name=base?.name||r.name.replace(/([a-z])([A-Z])/g,'$1 $2');
      const pair=edition==='saga'?sagaPairs[slug]:null;
      const element=pair?-2:battleElements.indexOf(category);
      const format=(arr,lookup)=>arr.map(k=>lookup[k]).filter(Boolean).join(',');
      const catalog={name:base?.catalog.name||name,path,category,rarity:r.rarity,number:i+1,source:edition==='3ds'?handheldRefs.cards:modernSets[edition]?'https://culdceptcentral.com/'+modernSets[edition]+'/'+modernSets[edition]+'-card-lists/'+modernSets[edition]+'-complete-card-list':'https://card.culdcept.net/'+({dc:'2nd',saturn:'1st',ps1:'1ex'}[edition])+'/'+encodeURIComponent(r.name)+'/',stats:(kind==='creature'?'ST '+r.st+' · HP '+r.hp+' · ':'')+r.cost+'G',
        ability:r.shared&&base?base.catalog.ability:r.ability,additionalCost:(edition==='begins'&&beginsExtraTerritories[slug])||format(r.req,land),placement:format(r.land,land),equipment:format(r.ban,equipment),race:r.race};
      const c={...(compatible?base:{}),name,catalog,element,kind,category,cost:r.cost,ban:r.ban.map(k=>equipment[k].toLowerCase()),catalogOnly:!(compatible||variant||simple),unlisted:false,hasArt:!!base,...(modernSets[edition]?{editionArt:r.image}:{firstArt:r.image})};
      if(kind==='spell'&&modernSets[edition]){
        const effect=modernSpellEffects[edition][slug]||(edition!=='3ds'&&sharedModernSpells.includes(slug)?slug:null);
        if(effect){
          c.effect=effect;c.catalogOnly=false;
          if(edition==='saga'&&clauses.includes('Doublecast'))c.doublecast=true;
          if(edition==='revolt'&&slug==='massgrowth')c.synthesis='item';
          if(edition==='revolt'&&slug==='debility'){
            c.synthesis='spell';c.synthesizedEffect='debilitystrong';
          }
          if(edition==='revolt'&&slug==='shininggeyser'){
            c.synthesis='sflash';c.synthesizedEffect='shininggeyserstrong';
          }
        }
        if(edition==='revolt'&&['brightworld','darkworld','jointworld','mercifulworld','mirrorworld','mistyworld','naturalworld','solidworld','wasteworld'].includes(slug)){c.effect=slug;c.catalogOnly=false;}
        if(edition==='begins'&&slug==='manna')c.magicPerLap=100;
      }
      if(pair){c.elements=pair;c.catalogOnly=false;}
      if(edition==='saga'&&slug==='prismaticwand'){c.st=0;c.hp=0;c.catalogOnly=false;}
      if(simple)for(const effect of effects.values())if(effect)Object.assign(c,effect);
      if(kind==='creature'){c.st=r.st;c.hp=r.hp;delete c.landBan;}
      if(kind==='creature')for(const clause of clauses)if(traits[clause])c[traits[clause]]=true;
      if(basicGear){
        c.st=Number(gearClauses.find(v=>v.startsWith('ST'))?.slice(2)||0);
        c.hp=Number(gearClauses.find(v=>v.startsWith('HP'))?.slice(2)||0);
        c.first=gearClauses.includes('先制');c.last=gearClauses.includes('後手');
      }
      if(edition==='begins'&&kind==='creature'&&Object.hasOwn(beginsCreatures,slug))Object.assign(c,{catalogOnly:false},beginsCreatures[slug]);
      if(edition==='begins'&&kind==='item'&&Object.hasOwn(beginsGear,slug)){
        Object.assign(c,{st:0,hp:0,catalogOnly:false},beginsGear[slug]);
      }
      if(edition==='revolt'){
        if(Object.hasOwn(revoltBattleCards,slug)){
          if(kind==='item')Object.assign(c,{st:0,hp:0});
          Object.assign(c,{catalogOnly:false},revoltBattleCards[slug]);
        }
        const art={
          archbishop:'dispel',goldentotem:'offering',fate:'draw',healer:'heal',elvenarcher:'arrow',
          dwarvenminer:'lapGain',holyllama:'dice6',armoreddragon:'neutralBlast',
          hardrockdragon:'fireAirBlast',lightningdragon:'waterEarthBlast',fay:'strength',burnacle:'blind',caladrius:'boost',uriel:'worldDispel',
          alp:'fatigue',captaincock:'recover',domovikha:'protect',hyde:'paralyze',rockshell:'peace',
          screamer:'disableTerrain',hidebehind:'camouflage',kawahime:'loseStrength',
          spittingcobra:'poison',sakuya:'earthShift',witch:'stealSpellMagic',ironmonger:'drawItem',
          aquahorn:'toMistwing',mistwing:'toAquahorn',deathscythe:'toMummy',
          conjurer:'conjureBaal',goobaqueen:'conjureGooba',hivequeen:'giveHiveWorker',legendarypharos:'buildStatues',
          creepingflame:'stepMove',lichenoid:'growMHP',clockworkowl:'chooseDirection',hellpyron:'destructionReward',lordofbane:'balanceStrength',sproutling:'toOldWillow',shankrubber:'immobilize'
        }[slug];
        if(art)Object.assign(c,{catalogOnly:false,secretArt:art});
        if(slug==='dwarvenminer')c.tollFactor=1.5;
        if(slug==='fay')c.scrollCritical=true;
      }
      if(edition==='revolt'&&slug==='wallofice')Object.assign(c,{catalogOnly:false,stationary:true,battleHP:20});
      if(edition==='revolt'&&slug==='tornado')Object.assign(c,{catalogOnly:false,stationary:true,first:true,battleST:20,battleHP:-10});
      if(edition==='3ds'&&slug==='pyromancer')Object.assign(c,{catalogOnly:false,innateScroll:30});
      if(edition==='3ds'&&slug==='countershield')Object.assign(c,{catalogOnly:false,effect:'reflect',st:0,hp:0});
      if(edition==='3ds'&&Object.hasOwn(handheldSpecial,slug))Object.assign(c,{catalogOnly:false},handheldSpecial[slug]);
      if(edition==='saga'&&['clockworkowl','barbarian','fay','tokebi','hypnosloth','lichenoid','rockshell','sakuya','wolverine'].includes(slug)){
        Object.assign(c,{catalogOnly:false,immediate:true});
        if(slug==='wolverine')c.tollFactor=1.5;
      }
      if(edition==='saga'&&kind==='creature'&&Object.hasOwn(sagaBattleCreatures,slug))Object.assign(c,{catalogOnly:false},sagaBattleCreatures[slug]);
      if(edition==='saga'&&kind==='creature'&&Object.hasOwn(sagaTerritoryCreatures,slug))Object.assign(c,{catalogOnly:false},sagaTerritoryCreatures[slug]);
      if(edition==='saga'&&kind==='creature'&&sagaTerritoryIdols.has(slug))Object.assign(c,{catalogOnly:false,stationary:true});
      if(edition==='saga'&&kind==='item'&&Object.hasOwn(sagaGear,slug))Object.assign(c,{st:0,hp:0,catalogOnly:false},sagaGear[slug]);
      if(edition==='saga'&&Object.hasOwn(sagaStarterEffects,slug))Object.assign(c,{catalogOnly:false},sagaStarterEffects[slug]);
      if(edition==='3ds'&&slug==='wallofice')Object.assign(c,{catalogOnly:false,stationary:true,battleHP:20});
      if(first&&slug==='wallofice'){c.stationary=true;c.battleHP=edition==='ps1'?20:0;}
      if(first&&slug==='giantspider'){c.paralyze=true;c.statusRaces=['rh','rb'];}
      if(first&&slug==='giantsnake'){c.poison=true;c.statusRaces=['rh','rb','rd'];}
      if(first&&slug==='stonehail'){c.st=30;c.hp=0;c.critical=3;}
      if(first&&slug==='cure')c.effect='heal';
      if(basicCreature&&!r.shared)c.basicBattle=true;
      if(first&&slug==='sorcerer')c.support=true;
      if(first)c.criticalRace={knight:'rd',darkelf:'rh',elf:'ru'}[slug];
      if(first&&['pan','hornet'].includes(slug))c.statusRaces=['rh','rb','rd'];
      if(id===undefined)cards.push(c);else cards[id]=c;
    }
    for(const c of cards)if(c.unlisted)c.catalogOnly=true;
    if(modernSets[edition]){
      Object.assign(presets,edition==='3ds'?handheldBooks(cards):modernBooks(cards,edition,bookSize,copyLimit));
      return;
    }
    function build(preferred){
      const pool=cards.flatMap((c,i)=>!c.catalogOnly?[i]:[]),deck=[];
      for(const id of preferred)if(deck.length<50&&pool.includes(id)&&deck.filter(n=>n===id).length<4)deck.push(id);
      const rest=pool.filter(id=>!deck.includes(id)).sort((a,b)=>cards[a].cost-cards[b].cost);
      for(let copy=0;copy<4&&deck.length<50;copy++)for(const id of rest){if(deck.length===50)break;deck.push(id);}
      return deck;
    }
    const lookup=new Map(cards.flatMap((c,i)=>c.unlisted?[]:[[c.catalog.path.split('/').pop(),i]]));
    const water='fighter goblin skeleton wolf giantamoeba kingtortoise lizardman marfolk wallofice giantbat harpy hornet hurricane sprite chainmail firebolt leatherarmor longsword mace cure fly holyword1 holyword6 magicbolt manna shatter'.split(' ');
    const waterDeck=water.flatMap(n=>Array(['firebolt','cure'].includes(n)?1:2).fill(lookup.get(n)));
    presets.fire=build(presets.fire);presets.intro=build(waterDeck);
    if(edition==='saturn'||edition==='ps1'){
      const common='goblin wolf fighter mace leatherarmor magicbolt cure shatter manna fly holyword1 holyword6'.split(' ');
      const fire='kobold minotaur pillarofflame gascloud dragonfly',earth='tigerbeetle wereboar wallofstone woodfolk dwarf';
      const water='marfolk kingtortoise wallofice giantamoeba lizardman',air='giantbat eidolon hurricane gremlin harpy';
      for(const [key,groups] of Object.entries({fire:[fire,earth,'giantrat firebolt'],intro:[water,air,'hobgoblin freeze'],fireAir:[fire,air,'giantspider windcutter'],waterEarth:[water,earth,'giantsnake stonehail']})){
        presets[key]=[...common,...groups.join(' ').split(' ')].flatMap(n=>[lookup.get(n),lookup.get(n)]).concat(lookup.get('longsword'),lookup.get('wingedboots'));
      }
    }
    if(edition==='saturn'||edition==='ps1')for(const [name,counts] of Object.entries(data.books)){
      const ids=Object.entries(counts).flatMap(([key,n])=>Array(n).fill(lookup.get(key)));
      presets[name]=build([...ids,...presets.fire]);
    }
  }
  return {names,boards,configure,handheldRefs,handheldMaps:handheld?.maps};
})();
if(typeof module!=='undefined')module.exports=CepterEditions;
