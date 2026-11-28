// Second Expansion battle-only transformations. The Egg consumes its item after
// item theft/destruction and before item stat bonuses (PS2 Culdscience, §3.3).
const CepterExtraBattle=(()=>{
  const eggItems={
    carbuncle:'aurablade gemoflife gremlinamulet iksear neutralamulet prismaticwand ringofthevampire stormcauser towershield vorpalsword',
    cockatrice:'chainmail crossbow fireamulet flametongue holygrail nunchaku offeringdoll rathunter stonehail wingedboots',
    cyclops:'batteringram boomerang chameleonarmor earthamulet leatherarmor livingshield magicshield petrifystone sapphirering sleep terrair wateramulet',
    dragonfly:'buckler clawoftheghoul earthshield livingspear mujinamask necroscarab phoenixamulet rockbiter shadowarmor sling trident venom watershield',
    firegiant:'airslasher battleaxe bellofchaos dragonhelm dynamite icicle kris livingsword longsword magussmirror nuclearfusion silverplow',
    giantamoeba:'belloflaw blackorb diamondarmor emeraldring glaive hourglass mace powerbracelet scalearmor trapezon',
    goblin:'catapult coinofpiety death masamune rainbowpiece ringofthesuccubus smoketorch swordofthefalcon vestment windshield',
    nightmare:'daggerofmite firebolt gaseousform heartfibula proteanring rubyring spear tearinghalo thehand windcutter',
    sprite:'changingsalve counteramulet fireshield goldengoose lunastone markerflag platemail spikeshield windamulet',
    stormgiant:'amberring banditsglove claymore freeze hellblaze knightshield lanceofodin morningstar stinkbottle talisman'
  };
  const egg=new Map(Object.entries(eggItems).flatMap(([form,names])=>names.split(' ').map(name=>[name,form])));
  const protectedItems=new Set('bellofchaos dragonhelm iksear kris tearinghalo terrair vestment'.split(' '));
  const protectedItem=name=>protectedItems.has(name);
  const scrollBlock=new Set(['smoketorch','rainbowpiece','magicshield','holygrail']);
  const lord=['flamelord','dagon','darkmaster','beelzebub'];
  const indices=new WeakMap();
  function catalog(cards,key){
    if(!indices.has(cards)){
      const ids=new Map(),creatures=[];
      cards.forEach((c,i)=>{
        if(!c.catalog||c.unlisted)return;
        const name=key(c);ids.set(name,i);
        if(c.kind==='creature'&&!c.generatedOnly)creatures.push(i);
      });
      indices.set(cards,{ids,creatures});
    }
    return indices.get(cards);
  }
  function rules(s,b,t,cards,fx,combo,total,lines,chain){
    const {ids,creatures}=catalog(cards,combo.key);
    function pick(pool){return pool[s.predict?Math.floor(pool.length/2):Math.floor(Math.random()*pool.length)];}
    function randomForm(excluded){
      return pick(creatures.filter(id=>id!==excluded&&(s.edition!=='begins'||cards[id].catalog.rarity!=='E')));
    }
    const chance=n=>!s.predict&&Math.random()<n;
    const onBoard=n=>s.tiles.some(v=>fx.name(v.unit)===n);
    // A Boost provider taking part in the battle cannot affect either side.
    // Another copy elsewhere can still provide the same non-stacking bonus.
    const sources=s.tiles.filter((v,j)=>v.unit&&j!==b.at&&j!==b.from);
    function boost(n,a,ownOnly=false){
      return sources.some(v=>(!ownOnly||v.owner===a.seat)&&fx.name(v.unit)===n&&(!['revolt','saga','begins'].includes(s.edition)||v.unit.enchant!=='paralysis'));
    }
    function transform(a,id,temporary=false){
      if(id==null)return;
      if(temporary)a.original={...a.u};
      else delete a.original;
      const c=cards[id],u={id,hp:c.hp};
      Object.assign(a,{u,c,n:combo.key(c),element:c.element,elements:c.elements,hp:c.hp,st:c.st,land:0});
      lines.push(c.name+' 변신');
    }
    function protectedGear(a){return ['archbishop','sage'].includes(a.n)||a.c.protectGear||a.gear?.protectItem||protectedItem(a.g);}
    function convert(target,name){
      const remaining=target.hp;
      transform(target,ids.get(name));
      target.u.hp=target.hp=Math.min(target.hp,remaining);
    }
    function itemStart(a,d){
      if(a.g!=='bellofchaos'||d.item==null||s.predict)return;
      for(const p of s.players){
        p.hand=p.hand.filter(id=>id!==d.item);
        p.book=p.book.filter(id=>id!==d.item);
        delete p.peek;
      }
      lines.push('상대 장비의 같은 카드 제거');
    }
    function forms(a,opponentId){
      const gear=a.g,name=a.n;
      let form,temporary=true,consume=false;
      if(name==='mysticegg'&&a.gear){form=ids.get(egg.get(gear));consume=true;}
      else if(name==='carbuncle'&&gear==='dragonfly'){
        form=ids.get('carbunfly');consume=true;temporary=false;
      }
      else if(name==='battlegearalpha'&&gear==='battlegearbeta'||name==='battlegearbeta'&&gear==='battlegearalpha'){
        form=ids.get('bundlegear');consume=true;temporary=false;
      }else if(name==='ambermosquito')form=ids.get(pick(['giantrat','tyrannosaurus']));
      else if(name==='doppelganger')form=opponentId;
      else if(name==='baldanders')form=s.edition==='begins'?randomForm(a.u.id):pick(creatures);
      else if(s.edition==='saga'&&name==='revenant'&&combo.enchanted(t.unit))form=ids.get('vampire');
      if(s.edition==='revolt'&&gear==='necroplasma')form=ids.get('skeleton');
      if(s.edition==='revolt'&&gear==='dragonorb'){
        form=ids.get(pick(['volcanicdragon','deepseadragon','hardrockdragon','lightningdragon']));
        consume=true;
      }
      if(s.edition==='saga'&&a.gear?.kind==='creature'){
        if(name==='groundgear'&&gear==='skygear'||name==='skygear'&&gear==='groundgear')form=ids.get('androgear');
        if(name==='androgear'&&gear==='beastgear')form=ids.get('gearion');
        if(form!=null){consume=true;temporary=false;}
      }
      if(form!=null){
        transform(a,form,temporary);
        if(s.edition==='begins'&&a.mimicked)consume=true;
      }
      if(!consume&&gear==='metamorphosebelt'){
        transform(a,ids.get('grassstrider'),true);consume=true;
      }
      if(!consume&&(gear==='proteanring'||gear==='trapezon')){
        // There is one restoration slot. With two transformations, the
        // creature's first form remains on the board when the item expires.
        const itemForm=gear==='trapezon'?ids.get('baal'):randomForm(a.u.id);
        transform(a,itemForm,true);consume=true;
      }
      if(consume){a.item=null;a.gear=null;a.g=null;}
    }
    function baseStats(a,d){
      const lands=s.tiles.filter(v=>v.owner===a.seat);
      if(s.edition==='revolt'){
        const synergy=a.c.synergy;
        if(synergy&&s.tiles.some((v,j)=>j!==b.from&&v.unit&&combo.hasElement(cards[v.unit.id],synergy.element))){
          a.st+=synergy.st;a.hp+=synergy.hp||0;
        }
        if(a.n==='armedpaladin')a.st=10*s.tiles.filter((v,i)=>i!==b.from&&v.unit&&[0,2].includes(cards[v.unit.id].element)).length;
        if(a.n==='amphibianwarrior'&&[1,3].includes(t.type))a.st+=20;
        if(a.n==='nessie'&&t.type===1)a.hp+=t.level*10;
        if(a.n==='lonebeast')a.hp+=fx.strength(a.u);
        if(a.n==='lavakin'){a.st-=s.round;a.hp+=s.round;}
        if([0,2].includes(a.element)&&boost('hellpyron',a))a.st+=10;
        if([1,3].includes(a.element)&&boost('lordofbane',a))a.st+=10;
        if(a.n==='hiveworker'){
          const amount=10*s.tiles.filter((v,j)=>j!==b.from&&fx.name(v.unit)==='hiveworker').length;
          a.st+=amount;a.hp+=amount;
        }
        if(['magmaarmor','stormarmor'].includes(a.g)){
          const elements=a.g==='magmaarmor'?[0,2]:[1,3];
          a.hp+=lands.filter(t=>elements.includes(t.type)).length*20;
        }
        if(a.g==='chainsaw')a.st+=20*chain(s,t);
        const affinity={magmaflail:[0,2],stormhalberd:[1,3],clawofshade:[d.element]}[a.g];
        if(affinity){
          const count=s.tiles.filter(t=>t.unit&&affinity.some(e=>combo.hasElement(cards[t.unit.id],e))).length;
          a.st+=count*(a.g==='clawofshade'?10:5);
        }
      }
      if(['revolt','3ds'].includes(s.edition)&&a.n==='firedrake')a.st+=5*s.tiles.filter((v,i)=>i!==b.from&&v.unit&&combo.hasElement(cards[v.unit.id],0)).length;
      if(s.edition==='3ds'&&a.n==='generalguan')a.st+=5*s.tiles.filter((v,i)=>i!==b.from&&v.unit&&fx.max(v.unit)>=50).length;
      if(s.edition==='saga'){
        if(a.n==='pangolin'){
          if(s.predict)a.hp=Math.floor((a.hp+30)/2);
          else if(chance(.5)){a.hp=30;lines.push('팽골린 · 전투 HP 30');}
        }
        if(a.n==='coaloid'){
          const increase=10*lands.filter(v=>v.type===0).length;
          a.st+=increase;a.hp+=increase;
        }
        if([0,2].some(e=>combo.hasElement(a,e))){
          if(sources.some(v=>fx.name(v.unit)==='hellpyron'&&v.unit.enchant!=='paralysis'))a.st+=10;
          if(sources.some(v=>fx.name(v.unit)==='brontides'&&v.unit.enchant!=='paralysis'))a.hp+=10;
        }
      }
      if(['saga','begins'].includes(s.edition)&&a.n==='garuda')a.st=a.hp=10*s.tiles.filter(v=>v.unit&&combo.hasElement(cards[v.unit.id],3)).length;
      if(s.edition==='saga'&&a.elements){
        const owned=lands.filter(v=>a.elements.includes(v.type)).length;
        if(a.n==='flammefleur')a.st=owned*10;
        if(a.n==='fontaciel')a.hp=owned*10;
        if(a.n==='magmaavatar'||a.n==='stormavatar')a.st=a.hp=owned*15;
      }
      switch(a.n){
        case 'mothman':if(s.edition==='begins')a.st+=5*s.tiles.filter(v=>v.unit&&combo.hasElement(cards[v.unit.id],-1)).length;break;
        case 'astralqueen':a.hp+=5*s.tiles.filter(v=>v.unit&&cards[v.unit.id].element===-1).length;break;
        case 'leoknight':a.st=10*s.tiles.filter(v=>v.owner===d.seat).length;a.hp=10*lands.length;break;
        case 'pyrallis':a.st+=10*lands.filter(v=>v.type===0).length;if(lands.some(v=>v.type===1))a.hp-=20;break;
        case 'flamegoetia':if(s.players[a.seat].book.length>s.players[d.seat].book.length){a.st+=20;a.hp+=20;}break;
        case 'anubias':a.hp=5*(s.destroyedCount||0);break;
        case 'kraken':if(lands.some(v=>v.type===0))a.hp-=20;break;
        case 'grassstrider':a.st+=s.players[d.seat].hand.length*10;break;
        case 'gargoyle':if(a.defending)a.st=50;break;
        case 'chonchon':if(!a.gear)a.hp+=20;break;
        case 'soulcollector':a.st+=5*(s.destroyedCount||0);break;
        case 'bia':if(d.gear?.kind==='creature'){a.st+=30;a.hp+=30;}break;
        case 'burningtitan':if(lands.length>=5){a.st-=30;a.hp-=30;}break;
        case 'kasha':if(combo.enchanted(t.unit)){a.st+=20;a.hp+=20;}break;
        case 'sirgawain':if(s.round>=20){a.st+=30;a.hp+=30;}break;
        case 'aspidochelone':a.st+=s.round;a.hp+=s.round;break;
        case 'weretiger':if(s.round>=25){a.st-=20;a.hp-=20;}break;
      }
      if((s.edition==='revolt'||s.edition==='begins')&&a.defending&&boost('otohime',a))a.hp+=10;
      if(s.edition==='begins'){
        if(a.n==='doomreaper')a.st+=5*(s.destroyedCount||0);
        if(a.n==='paleglobster'){a.st+=t.level*10;a.hp+=t.level*10;}
        if(a.n==='redcap')a.st=a.hp=20*s.tiles.filter(v=>fx.name(v.unit)==='goblin').length;
        if(a.n==='goblin'&&boost('redcap',a))a.st+=20;
      }
      if(a.element>=0&&boost(lord[a.element],a)){
        if(s.edition==='begins'&&a.element>=2)a.st+=10;
        else a.hp+=10;
      }
      if(boost('madclown',a,true))a.hp+=10;
      if(!a.defending&&boost('ares',a))a.st+=20;
      if(s.edition==='saga'&&[1,3].some(e=>combo.hasElement(a,e))){
        if(boost('lordofbane',a))a.st+=10;
        if(boost('rahab',a))a.hp+=10;
      }
      if(s.edition==='saga'&&a.defending&&boost('poseidon',a))a.hp+=20;
      if(!a.defending&&boost('nue',a))a.st-=10;
      if(a.element===3&&boost(['begins','3ds','saga'].includes(s.edition)?'humbaba':'hunbaba',a))a.st-=10;
      if(s.edition==='saga'&&fx.strength(a.u)>=60&&boost('dragonlord',a))a.st+=10;
      if(a.c.first&&boost('quetzalcoatl',a))a.st+=10;
      if(a.u.enchant==='wing')a.st+=20;
      if(s.edition==='saga'){
        const count=e=>s.tiles.filter(v=>v.unit&&combo.hasElement(cards[v.unit.id],e)).length;
        if(a.n==='brancharmy')a.st+=count(2)*5;
        if(a.n==='hiveworker'){
          const amount=10*s.tiles.filter(v=>fx.name(v.unit)==='hiveworker').length;
          a.st+=amount;a.hp+=amount;
        }
        if(a.n==='metalshambler'&&s.players[a.seat].cash<s.players[d.seat].cash){a.st+=30;a.hp-=30;}
        if(a.n==='ogrelord'){
          if(onBoard('redogre')||onBoard('yellowogre'))a.st+=30;
          if(onBoard('blueogre')||onBoard('greenogre'))a.hp+=30;
        }
        if(a.n==='lukoie'&&!combo.enchanted(t.unit))a.hp+=20;
        if(a.n==='mothman')a.st=a.hp=count(-1)*10;
        if(a.n==='redcap')a.st=a.hp=20*s.tiles.filter(v=>fx.name(v.unit)==='goblin').length;
        if(a.n==='goblin'&&boost('redcap',a)){a.st+=20;a.hp+=20;}
        if(a.n==='ukobach'&&s.players[a.seat].cash<s.players[d.seat].cash){a.st+=20;a.hp+=20;}
        if(a.g==='magmaarmor'){a.st+=count(0)*10;a.hp+=count(2)*10;}
        if(a.g==='stormarmor'){a.st+=count(3)*10;a.hp+=count(1)*10;}

        if(a.g==='forcebracelet')a.st+=s.players[a.seat].hand.length*10;
      }
      if(['saga','revolt'].includes(s.edition)&&a.g==='forceanklet')a.hp+=s.players[a.seat].hand.length*10;
      switch(a.g){
        case 'aurablade':a.st+=fx.max(a.u);break;
        case 'chameleonarmor':
          if(s.edition==='3ds')a.hp+=(t.level+1)*10;else a.hp=t.level*20;
          break;
        case 'daggerofmite':{
          const mine=total(s,a.seat),opponents=s.players.flatMap((_,j)=>total(s,j)>mine?[j]:[]);
          const higher=s.edition==='3ds'&&s.teams?new Set(opponents.map(j=>s.teams[j])).size:opponents.length;
          a.st+=20*(1+higher);
          break;
        }
        case 'iksear':a.hp+=20*lands.filter(v=>v.type===1).length;break;
        case 'prismaticwand':if(!combo.sameElements(a,d)){a.hp+=40;a.st+=40;}break;
        case 'shadowarmor':a.hp+=(7-t.level)*10;break;
      }
    }
    function critical(a,d,scroll){
      if(scroll)return s.edition==='revolt'&&a.g==='shadowblaze'&&s.tiles.filter(v=>v.owner===d.seat&&v.unit?.id===d.u.id).length>1||
        s.edition==='saga'&&a.n==='warlock'||['wizard','efreet','conjurer'].includes(a.n)||a.g==='hellblaze'&&fx.strength(d.u)<=20||a.g==='stonehail'&&d.element===3||a.g==='tearinghalo'&&a.element!==-1;
      return a.n==='elf'&&!a.c.criticalRace&&d.element===2||a.g==='earthamulet'&&a.element===2||a.g==='windamulet'&&a.element===3||a.g==='icicle'&&d.element===0||a.g==='vorpalsword'&&fx.max(d.u)>=40;
    }
    function protect(a,d,damage,scroll,penetrates,orb){
      if(scroll){
        const blocked=d.c.neutralizeScroll||d.gear?.neutralizeScroll||scrollBlock.has(d.g)||['battlegearbeta','bundlegear'].includes(d.n);
        const reflected=d.g==='magussmirror'||d.n==='carbunfly'||s.edition==='saga'&&(d.n==='livingmirror'||d.g==='livingmirror')||s.edition==='revolt'&&d.g==='mirrorhoplon'&&!a.gear;
        if(reflected&&!(s.edition==='revolt'&&blocked)){a.hp-=damage;lines.push('두루마리 반사');return 'reflect';}
        if(blocked){lines.push('두루마리 무효');return 'block';}
        return;
      }
      const fire=side=>s.edition==='saga'?combo.hasElement(side,0):side.element===0;
      if(d.n==='salamander'&&fire(a)){
        d.hp+=damage;d.absorbed=true;lines.push('화속성 피해 흡수');return 'heal';
      }
      if(orb)return;
      const rate=d.g==='holygrail'?(['3ds','begins'].includes(s.edition)?3:2):d.n==='charon'?2:d.u.enchant==='simulacrum'?3:0;
      if(rate){
        const cost=damage*rate;
        s.players[d.seat].cash-=cost;
        if(s.predict&&['3ds','begins'].includes(s.edition)){b.magicLoss??=[0,0];b.magicLoss[d.defending?1:0]+=cost;}
        lines.push('피해 무효 · 마력 −'+cost+'G');return 'block';
      }
      if(d.g==='talisman'||s.edition==='revolt'&&d.g==='ragdoll'&&a.st>d.st||d.g==='smoketorch'&&penetrates||d.g==='fireshield'&&(fire(a)||fire(d))||
        ['knightshield','knightsshield'].includes(d.g)&&fx.strength(a.u)>=40||d.n==='grindylow'&&fx.strength(a.u)<=30||
        ['nymph','yeti'].includes(d.n)&&a.element===0||d.n==='dhampir'&&a.element===2||d.n==='kraken'&&a.element===-1){
        lines.push('공격 무효');return 'block';
      }
    }
    function vacant(a,type=null){
      const pool=s.tiles.flatMap((v,j)=>j!==b.at&&j!==b.from&&v.owner<0&&combo.territoryType(v.type)&&(type==null||v.type===type)?[j]:[]);
      const at=pick(pool);
      if(at==null){
        a.hp=0;
        if(s.edition==='revolt'&&a.g==='argentkey')lines.push(a.gear.name+' · 빈 영지가 없어 격파');
        if(s.edition==='begins'&&a.n==='amabie')lines.push(a.c.name+' · 빈 수 영지가 없어 격파');
      }else{a.away=at;lines.push((at+1)+'번 빈 영지로 이동');}
    }
    function onHit(a,d,damage){
      a.hit=true;
      const n=d.c.blocksAttackAbilities||d.gear?.blocksCreatureHits?null:a.n;
      if(n==='vampire'||s.edition==='saga'&&n==='crimsonvine'){a.hp+=damage;a.absorbed=true;}
      if(s.edition==='saga'&&n==='jackolantern'){
        const amount=Math.min(Math.max(0,s.players[d.seat].cash),Math.max(0,Math.min(a.u.hp,a.hp))*2);
        s.players[d.seat].cash-=amount;s.players[a.seat].cash+=amount;
        if(amount)lines.push('공격 명중 · '+amount+'G 탈취');
      }
      if(d.hp<=0)return;
      if(s.edition==='begins'){
        const alteredForm={werewolf:'wolf',medusa:'statue',cockatrice:'wallofstone'}[n];
        if(alteredForm)transform(d,ids.get(alteredForm));
      }else{
        if(n==='werewolf'&&chance(.6))convert(d,'wolf');
        if(n==='medusa')convert(d,'statue');
        if(n==='cockatrice'){
          if(s.edition==='revolt')transform(d,ids.get('wallofstone'));
          else convert(d,'wallofstone');
        }
      }
      if(n==='littlegray'&&chance(.5))vacant(d);
      if(n==='nymph'&&fx.max(d.u)<=30&&s.players[a.seat].hand.length<6&&chance(.4)){
        d.stolen=true;s.players[a.seat].hand.push(d.u.id);lines.push('상대 크리처를 손패로 획득');
      }
      if(s.edition==='saga'&&n==='cherub'&&fx.max(d.u)>=50&&chance(.6)){
        const hand=s.players[d.seat].hand;
        if(hand.length<6){hand.push(d.u.id);d.returned=true;lines.push('상대 크리처를 손패로 돌려보냄');}
        else{d.hp=0;lines.push('상대 손패가 가득 차 크리처 격파');}
      }
      if(n==='barrowwight'){combo.clear(d.u);d.u.enchant='sleep';}
      if(['ghoul','hugespider','livingclaw'].includes(n)||s.edition==='saga'&&a.g==='livingclaw'){combo.clear(d.u);d.u.enchant='paralysis';}
      if(n==='hunbaba'){combo.clear(d.u);d.u.poisoned=true;}
      if(a.g==='batteringram'&&fx.isDefensive(d.u)||n==='vodyanoi'&&a.defending&&chance(.8)||n==='igneousfatui'&&chance(.8)||
        s.edition==='begins'&&n==='juggernaut'&&fx.isDefensive(d.u)||n==='angostura'&&fx.max(d.u)<=30&&chance(.8)||n==='basilisk'&&chance(s.edition==='begins'?.4:.5)||
        n==='yeti'&&combo.hasElement(d,0)&&chance(.6)||n==='dhampir'&&combo.hasElement(d,2)&&chance(.6)||
        s.edition==='saga'&&(n==='saint'&&combo.hasElement(d,-1)&&chance(.8)||n==='nil'&&chance(.5)||n==='unnameable'&&chance(.7))){
        d.hp=0;lines.push('즉사');
      }
      if(s.edition==='revolt'&&a.gear?.instantDeathElements?.some(e=>combo.hasElement(d,e))&&d.hp>0&&chance(.6)){
        d.hp=0;lines.push(a.gear.name+' · 즉사');
      }
      if(s.edition==='revolt'&&a.g==='twinspike'&&d.hp>0)transform(d,a.u.id);
      if((n==='bard'||s.edition==='revolt'&&a.g==='argentkey')&&d.hp>0)vacant(a);
    }
    function end(a,d,creatureEnd,itemEnd){
      if(s.edition==='begins'&&creatureEnd&&a.n==='doomreaper'&&!a.defending){
        s.players[a.seat].cash+=100;
        if(s.predict){b.magicLoss??=[0,0];b.magicLoss[0]-=100;}
        lines.push(a.c.name+' · 침략 마력 100G 획득');
      }
      if(creatureEnd&&a.hp>0){
        if(s.edition==='saga'&&a.n==='flammefleur'&&!a.dealtDamage&&d.hp>0){d.hp=0;lines.push('전투 종료 · 피해를 주지 못해 상대 격파');}
        if(lord.includes(a.n)){
          s.players[a.seat].cash-=100;
          if(s.edition==='begins'){
            if(s.predict){b.magicLoss??=[0,0];b.magicLoss[+a.defending]+=100;}
            lines.push(a.c.name+' · 100G 지불');
          }
        }
        if(a.n==='efreet')s.players[a.seat].cash-=a.ordinaryDamage||0;
        if(s.edition==='saga'&&a.n==='nil'){s.players[a.seat].cash-=100;lines.push('닐 · 전투 종료 100G 상실');}
        if(a.n==='fungonoid')grow(a,10);
        if(s.edition!=='3ds'&&a.n==='catoblepas'&&!a.gear&&d.hp>0)d.hp=Math.min(d.u.hp,d.hp)-fx.strength(d.u);
        const leveller=['begins','3ds','saga'].includes(s.edition)?a.n==='leveller':a.n==='leveler';
        if((a.n==='basilisk'||leveller&&t.type!==3)&&t.level>1&&!fx.blockedLevel(s,t)){
          t.level--;
          if(['begins','3ds'].includes(s.edition))lines.push(a.c.name+' · 교전 영지 Lv.'+t.level);
        }
      }
      if(itemEnd&&a.g==='venom'&&d.hp>0){d.hp=Math.min(d.u.hp,d.hp)-Math.floor(fx.max(d.u)/2);}
      if(s.edition!=='revolt'&&a.u.enchant==='thornfetter'&&a.hp>0)a.hp=Math.min(a.hp,a.u.hp)-20;
      if(a.u.enchant==='parasite')s.players[a.seat].cash-=100;
      if(['3ds','begins'].includes(s.edition)&&a.g==='offeringdoll'&&a.hp>0&&a.element>=0){
        const i=t.area*4+a.element;
        if(s.prices[i]!=null)s.prices[i]=Math.floor(s.prices[i]*1.3);
      }
      if(itemEnd&&(a.g==='wingedboots'||a.g==='stinkbottle')){
        const book=s.players[a.seat].book;
        book.splice(s.predict?0:Math.floor(Math.random()*(book.length+1)),0,a.item);
      }
      if(a.g==='markerflag'&&!b.teleport&&!b.spellMove)b.markerFlag=true;
    }
    function grow(a,n){
      const cap=['3ds','saga'].includes(s.edition)?100:80,max=fx.max(a.u),gain=Math.max(0,Math.min(cap,max+n)-max);
      a.u.mhp=max+gain;a.u.hp+=gain;a.hp+=gain;
    }
    function victory(a,d){
      if(s.edition==='begins'){
        if(a.n==='nezha')a.u.mhp=Math.min(100,fx.max(a.u)+10);
        if(a.n==='mattocktail'&&t.level<5&&!fx.levelLocked(t)){t.level++;lines.push(a.c.name+' · 영지 Lv.'+t.level);}
      }
      const p=s.players[a.seat],other=s.players[d.seat],symbol=t.area*4+t.type;
      if(s.edition==='saga'&&a.n==='unnameable'&&d.defeatedByOpponent&&!s.predict){
        const removed=other.hand.length+other.book.length;
        other.hand=other.hand.filter(id=>id!==d.u.id);other.book=other.book.filter(id=>id!==d.u.id);
        for(const player of s.players)if(player.peek?.seat===d.seat)delete player.peek;
        const count=removed-other.hand.length-other.book.length;
        if(count)lines.push(a.c.name+' · 격파한 카드와 같은 카드 '+count+'장 파괴');
      }
      if(typeof t.type==='number'&&s.prices[symbol]!=null){
        if(a.n==='sanctumguard')p.symbols[symbol]+=5;
        if(s.edition!=='begins'&&a.g==='coinofpiety')p.symbols[symbol]+=10;
      }
      if(s.edition==='saga'&&a.g==='godlesspike')for(const [index,price] of s.prices.entries()){
        if(combo.hasElement(d,index%4)){s.prices[index]=Math.max(1,Math.floor(price/2));}
      }
      if(a.n==='squonk'&&p.hand.length<6){p.hand.push(a.u.id);a.returned=true;}
      if(a.n==='leviathan'&&!onBoard('jadeidol')&&combo.activeWorld(s)!=='solidworld')t.type=1;
      if(a.n==='ghoul'){a.heal=true;a.hp=fx.max(a.u);}
      const camazotz=a.n==='camazotz'&&(s.edition==='begins'||d.defeatedByOpponent);
      if(s.edition!=='3ds'&&a.n==='raksas'||camazotz){
        const most=Math.max(0,...other.symbols),at=other.symbols.indexOf(most),loss=Math.floor(most*.3);
        if(loss>0){
          other.symbols[at]-=loss;
          if(camazotz)lines.push(a.c.name+' · 상대 호부 '+loss+'개 파괴');
        }
      }
      if(a.n==='taotieh'&&(s.edition!=='saga'||d.defeatedByOpponent)){
        const st=fx.strength(a.u),native=s.edition==='begins',gain=native?20:10;
        a.u.st=Math.max(st,Math.min(native||s.edition==='saga'?100:80,st+gain));
        if(native){
          const max=Math.min(100,fx.max(a.u)+gain);
          a.u.mhp=max;a.u.hp=Math.min(max,a.u.hp+gain);a.hp+=gain;a.heal=true;
        }else grow(a,gain);
      }
      if(a.g==='heartfibula'||a.g==='windamulet')grow(a,a.g==='heartfibula'?20:10);
      if(s.edition==='3ds'&&a.g==='wateramulet'){
        const before=fx.strength(a.u);
        a.u.st=Math.max(before,Math.min(100,before+10));
      }
      if(!['3ds','begins'].includes(s.edition)&&a.g==='offeringdoll'&&a.element>=0){
        const i=t.area*4+a.element;if(s.prices[i]!=null)s.prices[i]=Math.floor(s.prices[i]*1.3);
      }
    }
    return {protectedGear,itemStart,forms,baseStats,critical,protect,onHit,end,victory,transform,convert,vacant,ids,boost,grow};
  }
  return {rules,protectedItem};
})();
if(typeof module!=='undefined')module.exports=CepterExtraBattle;
