const CepterEditions=(()=>{
  const data=typeof module==='undefined'?CepterEditionData:require('./cept-edition-data');
  // Saga, Revolt and Begins live in their own file so the older editions do not download them.
  const modern=typeof module==='undefined'?(typeof CepterEditionModern==='undefined'?null:CepterEditionModern):require('./cept-edition-data-modern');
  if(modern){Object.assign(data.cards,modern.cards);Object.assign(data.maps,modern.maps);}
  const modernSets={saga:'culdcept-saga',revolt:'culdcept-revolt',begins:'culdcept-begins'};
  const names={ps2:'컬드셉트 2 · PS2',dc:'컬드셉트 세컨드 · DC',saturn:'컬드셉트 · 새턴',ps1:'컬드셉트 익스팬션 · PS1',saga:'컬드셉트 사가 · Xbox 360',revolt:'컬드셉트 리볼트 · 3DS',begins:'컬드셉트 비긴즈'};
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
  const sagaShrineKinds={'mt-etumer':{4:'light',52:'dark'},zanador:{46:'light',64:'dark'}};
  function boards(edition,original){
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
      result[id]={...m,types,links,transit,forts,checkpoints:forts.filter((j,i)=>forts.findIndex(k=>types[k]===types[j])===i),
        castles:types.flatMap((t,i)=>t==='성'?[i]:[]),position,cols:Math.max(...position.map(v=>v[1])),rows:Math.max(...position.map(v=>v[0])),
        areas:same?other.areas:types.map(()=>0),areaCount:same?other.areaCount:1,startCash,bonus:lapBonus||200,base:landPrice||80,die:die||Number(m.die)||other?.die||6,storyGoal:goal||other?.storyGoal,
        graph:true,...(fortBonus?{fortBonus}:{}),...(same?{stage:index+1,image:other.image,half:other.half,position:other.position,fortBonus:other.fortBonus}:{}),section:m.section,next:m.section==='story'&&nextMap?.section==='story'?mapId(edition,nextMap,index+1):null,
        ...(edition==='revolt'?revoltGates(m):{}),...(edition==='saga'?{shrineKinds:sagaShrineKinds[m.slug]||{}}:{})};
    }
    if(edition==='saga')Object.assign(result,original.sagaPractice);
    if(edition==='revolt')Object.assign(result,original.revoltPractice);
    return result;
  }
  const sharedModernSpells='foresight incineration influence landdrain prophecy rayoflaw windofhope'.split(' ');
  const modernSpellEffects={
    saga:{magicbolt:'bolt',holyword8:'holyword8',find:'find',burninghail:'burninghail',freezecyclone:'freezecyclone',elementalrage:'elementalrage'},
    revolt:{magicbolt:'bolt',manna:'manna',holyword1:'word1',holyword3:'holyword3',holyword6:'word6',holyword8:'holyword8',
      shatter:'shatter',fly:'fly',drainmagic:'drainmagic',barrier:'barrier',bindingmist:'bindingmist',blackout:'blackout',
      fireshift:'fireshift',watershift:'watershift',earthshift:'earthshift',airshift:'airshift',burninghail:'burninghail',
      freezecyclone:'freezecyclone',insectswarm:'globalinsectswarm',lifestream:'lifestream',reincarnation:'reincarnation',
      alarm:'alarm',disaster:'fatigueddisaster',elementalwrath:'elementalwrath',landtransfer:'revoltlandtransfer',
      magmashift:'magmashift',stormshift:'stormshift',quintessence:'quintessence',redivision:'redivision',remission:'remission',restore:'restore'},
    begins:{magicbolt:'bolt',manna:'manna',holyword1:'word1',holyword3:'holyword3',holyword6:'word6',holyword8:'holyword8',
      shatter:'shatter',fly:'fly',drainmagic:'drainmagic',barrier:'barrier',bindingmist:'bindingmist',blackout:'blackout',
      fireshift:'fireshift',watershift:'watershift',earthshift:'earthshift',airshift:'airshift',
      insectswarm:'globalinsectswarm',lifestream:'lifestream',reincarnation:'reincarnation',find:'find',evilblast:'evilblast',elementalwrath:'elementalwrath'}
  };
  function modernBooks(cards){
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
        return (c.st||0)*attackWeight+(c.hp||0)*(1-attackWeight)+(c.first?8:0)-c.cost*.4-requirements*18;
      };
      for(const group of Object.values(groups))group.sort((a,b)=>score(b)-score(a)||a-b);
      const deck=[];
      function add(group,count){
        const choices=group.filter(id=>deck.filter(card=>card===id).length<4).slice(0,Math.ceil(count/2));
        for(let copy=0;copy<4&&count>0;copy++){
          for(const id of choices){
            if(count===0)break;
            if(deck.filter(card=>card===id).length<4){deck.push(id);count--;}
          }
        }
      }
      add(groups.spell,50-creatures-items);
      add(groups.item,items);
      add(groups.creature,creatures);
      add(groups.creature,50-deck.length);
      add(groups.item,50-deck.length);
      add(groups.spell,50-deck.length);
      return deck;
    }
    return {
      intro:build(28,10,.5,'manna windofhope relief word6 foresight fly'),
      fire:build(30,12,.78,'bolt shatter drainmagic windofhope manna'),
      stronghold:build(26,14,.25,'barrier lifestream heal windofhope manna')
    };
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
  // Only enable Begins items whose printed effects the battle engine handles.
  const beginsGear={
    buckler:{},countershield:{effect:'reflect'},diamondarmor:{st:-30,hp:60,last:true},
    earthshield:{},fireshield:{},watershield:{},windshield:{},
    eternalmail:{hp:40},knightsshield:{},magicshield:{hp:30},spikedshield:{},
    towershield:{halveScroll:true},vestment:{hp:30},
    freeze:{st:30,critical:0},firebolt:{st:30,critical:1},windcutter:{st:30,critical:2},
    stonehail:{st:30,critical:3},hellblaze:{st:40},nuclearfusion:{st:50},sparkball:{st:40}
  };
  function configure(edition,cards,presets){
    const index=new Map(cards.flatMap((c,i)=>c.catalog?[[c.catalog.path.split('/').pop(),i]]:[]));
    for(const c of cards){c.unlisted=true;}
    for(const [i,r] of data.cards[edition].entries()){
      const slug=r.name.toLowerCase().replace(/[^a-z0-9]/g,''),id=index.get(slug),base=cards[id];
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
      const catalog={name:base?.catalog.name||name,path,category,rarity:r.rarity,number:i+1,source:modernSets[edition]?'https://culdceptcentral.com/'+modernSets[edition]+'/'+modernSets[edition]+'-card-lists/'+modernSets[edition]+'-complete-card-list':'https://card.culdcept.net/'+({dc:'2nd',saturn:'1st',ps1:'1ex'}[edition])+'/'+encodeURIComponent(r.name)+'/',stats:(kind==='creature'?'ST '+r.st+' · HP '+r.hp+' · ':'')+r.cost+'G',
        ability:r.shared&&base?base.catalog.ability:r.ability,additionalCost:format(r.req,land),placement:format(r.land,land),equipment:format(r.ban,equipment),race:r.race};
      const c={...(compatible?base:{}),name,catalog,element,kind,category,cost:r.cost,ban:r.ban.map(k=>equipment[k].toLowerCase()),catalogOnly:!(compatible||variant||simple),unlisted:false,hasArt:!!base,...(modernSets[edition]?{editionArt:r.image}:{firstArt:r.image})};
      if(kind==='spell'&&modernSets[edition]){
        const effect=modernSpellEffects[edition][slug]||(sharedModernSpells.includes(slug)?slug:null);
        if(effect){c.effect=effect;c.catalogOnly=false;}
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
      if(edition==='begins'&&kind==='item'&&Object.hasOwn(beginsGear,slug)){
        Object.assign(c,{st:0,hp:0,catalogOnly:false},beginsGear[slug]);
      }
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
      Object.assign(presets,modernBooks(cards));
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
  return {names,boards,configure};
})();
if(typeof module!=='undefined')module.exports=CepterEditions;
