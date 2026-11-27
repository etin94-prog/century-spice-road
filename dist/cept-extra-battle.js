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
    const chance=n=>!s.predict&&Math.random()<n;
    const onBoard=n=>s.tiles.some(v=>fx.name(v.unit)===n);
    // A Boost provider taking part in the battle cannot affect either side.
    // Another copy elsewhere can still provide the same non-stacking bonus.
    const sources=s.tiles.filter((v,j)=>v.unit&&j!==b.at&&j!==b.from);
    function boost(n,a,ownOnly=false){
      return sources.some(v=>(!ownOnly||v.owner===a.seat)&&fx.name(v.unit)===n&&(n!=='madharlequin'||v.unit.enchant!=='paralysis'));
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
      else if(name==='baldanders')form=pick(creatures);
      else if(s.edition==='saga'&&name==='revenant'&&combo.enchanted(t.unit))form=ids.get('vampire');
      if(s.edition==='revolt'&&gear==='necroplasma')form=ids.get('skeleton');
      if(s.edition==='revolt'&&gear==='dragonorb'){
        form=ids.get(pick(['volcanicdragon','deepseadragon','hardrockdragon','lightningdragon']));
        consume=true;
      }
      if(form!=null)transform(a,form,temporary);
      if(!consume&&gear==='metamorphosebelt'){
        transform(a,ids.get('grassstrider'),true);consume=true;
      }
      if(!consume&&(gear==='proteanring'||gear==='trapezon')){
        // There is one restoration slot. With two transformations, the
        // creature's first form remains on the board when the item expires.
        const itemForm=gear==='trapezon'?ids.get('baal'):pick(creatures.filter(id=>id!==a.u.id));
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
        if(a.n==='firedrake')a.st+=5*s.tiles.filter((v,j)=>j!==b.from&&v.unit&&combo.hasElement(cards[v.unit.id],0)).length;
        if(a.n==='amphibianwarrior'&&[1,3].includes(t.type))a.st+=20;
        if(a.n==='nessie'&&t.type===1)a.hp+=t.level*10;
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
      if(s.edition==='saga'){
        if(a.n==='pangolin'){
          if(s.predict)a.hp=Math.floor((a.hp+30)/2);
          else if(chance(.5)){a.hp=30;lines.push('팽골린 · 전투 HP 30');}
        }
        if(a.n==='garuda')a.st=a.hp=10*s.tiles.filter(v=>v.unit&&combo.hasElement(cards[v.unit.id],3)).length;
        if(a.n==='coaloid'){
          const increase=10*lands.filter(v=>v.type===0).length;
          a.st+=increase;a.hp+=increase;
        }
        if([0,2].some(e=>combo.hasElement(a,e))){
          if(sources.some(v=>fx.name(v.unit)==='hellpyron'&&v.unit.enchant!=='paralysis'))a.st+=10;
          if(sources.some(v=>fx.name(v.unit)==='brontides'&&v.unit.enchant!=='paralysis'))a.hp+=10;
        }
      }
      if(s.edition==='saga'&&a.elements){
        const owned=lands.filter(v=>a.elements.includes(v.type)).length;
        if(a.n==='flammefleur')a.st=owned*10;
        if(a.n==='fontaciel')a.hp=owned*10;
        if(a.n==='magmaavatar'||a.n==='stormavatar')a.st=a.hp=owned*15;
      }
      switch(a.n){
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
      if(a.element>=0&&boost(lord[a.element],a))a.hp+=10;
      if(boost('madclown',a,true))a.hp+=10;
      if(!a.defending&&boost('ares',a))a.st+=20;
      if(!a.defending&&boost('nue',a))a.st-=10;
      if(a.element===3&&boost(s.edition==='begins'?'humbaba':'hunbaba',a))a.st-=10;
      if(a.c.first&&boost('quetzalcoatl',a))a.st+=10;
      if(a.u.enchant==='wing')a.st+=20;
      if(s.edition==='saga'){
        const count=e=>s.tiles.filter(v=>v.unit&&combo.hasElement(cards[v.unit.id],e)).length;
        if(a.g==='magmaarmor'){a.st+=count(0)*10;a.hp+=count(2)*10;}
        if(a.g==='stormarmor'){a.st+=count(3)*10;a.hp+=count(1)*10;}

        if(a.g==='forcebracelet')a.st+=s.players[a.seat].hand.length*10;
      }
      if(['saga','revolt'].includes(s.edition)&&a.g==='forceanklet')a.hp+=s.players[a.seat].hand.length*10;
      switch(a.g){
        case 'aurablade':a.st+=fx.max(a.u);break;
        case 'chameleonarmor':a.hp=t.level*20;break;
        case 'daggerofmite':a.st+=20*(1+s.players.filter((_,j)=>total(s,j)>total(s,a.seat)).length);break;
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
        const reflected=d.g==='magussmirror'||d.n==='carbunfly'||s.edition==='revolt'&&d.g==='mirrorhoplon'&&!a.gear;
        if(reflected&&!(s.edition==='revolt'&&blocked)){a.hp-=damage;lines.push('두루마리 반사');return 'reflect';}
        if(blocked){lines.push('두루마리 무효');return 'block';}
        return;
      }
      const fire=side=>s.edition==='saga'?combo.hasElement(side,0):side.element===0;
      if(d.n==='salamander'&&fire(a)){
        d.hp+=damage;d.absorbed=true;lines.push('화속성 피해 흡수');return 'heal';
      }
      if(orb)return;
      const rate=d.g==='holygrail'?(s.edition==='3ds'?3:2):d.n==='charon'?2:d.u.enchant==='simulacrum'?3:0;
      if(rate){
        const cost=damage*rate;
        s.players[d.seat].cash-=cost;
        if(s.predict&&s.edition==='3ds'){b.magicLoss??=[0,0];b.magicLoss[d.defending?1:0]+=cost;}
        lines.push('피해 무효 · 마력 −'+cost+'G');return 'block';
      }
      if(d.g==='talisman'||s.edition==='revolt'&&d.g==='ragdoll'&&a.st>d.st||d.g==='smoketorch'&&penetrates||d.g==='fireshield'&&(fire(a)||fire(d))||
        ['knightshield','knightsshield'].includes(d.g)&&fx.strength(a.u)>=40||d.n==='grindylow'&&fx.strength(a.u)<=30||
        ['nymph','yeti'].includes(d.n)&&a.element===0||d.n==='dhampir'&&a.element===2||d.n==='kraken'&&a.element===-1){
        lines.push('공격 무효');return 'block';
      }
    }
    function vacant(a){
      const pool=s.tiles.flatMap((v,j)=>j!==b.at&&j!==b.from&&v.owner<0&&combo.territoryType(v.type)?[j]:[]);
      const at=pick(pool);
      if(at==null){
        a.hp=0;
        if(s.edition==='revolt'&&a.g==='argentkey')lines.push(a.gear.name+' · 빈 영지가 없어 격파');
      }else{a.away=at;lines.push((at+1)+'번 빈 영지로 이동');}
    }
    function onHit(a,d,damage){
      a.hit=true;
      const n=d.c.blocksAttackAbilities?null:a.n;
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
      if(n==='barrowwight'){combo.clear(d.u);d.u.enchant='sleep';}
      if(['ghoul','hugespider'].includes(n)){combo.clear(d.u);d.u.enchant='paralysis';}
      if(n==='hunbaba'){combo.clear(d.u);d.u.poisoned=true;}
      if(a.g==='batteringram'&&d.c.stationary||n==='vodyanoi'&&a.defending&&chance(.8)||n==='igneousfatui'&&chance(.8)||
        n==='angostura'&&fx.max(d.u)<=30&&chance(.8)||n==='basilisk'&&chance(s.edition==='begins'?.4:.5)||n==='yeti'&&d.element===0&&chance(.6)||n==='dhampir'&&d.element===2&&chance(.6)){
        d.hp=0;lines.push('즉사');
      }
      if(s.edition==='revolt'&&a.gear?.instantDeathElements?.some(e=>combo.hasElement(d,e))&&d.hp>0&&chance(.6)){
        d.hp=0;lines.push(a.gear.name+' · 즉사');
      }
      if(s.edition==='revolt'&&a.g==='twinspike'&&d.hp>0)transform(d,a.u.id);
      if((n==='bard'||s.edition==='revolt'&&a.g==='argentkey')&&d.hp>0)vacant(a);
    }
    function end(a,d,creatureEnd){
      if(creatureEnd&&a.hp>0){
        if(s.edition==='saga'&&a.n==='flammefleur'&&!a.dealtDamage&&d.hp>0){d.hp=0;lines.push('전투 종료 · 피해를 주지 못해 상대 격파');}
        if(lord.includes(a.n))s.players[a.seat].cash-=100;
        if(a.n==='efreet')s.players[a.seat].cash-=a.ordinaryDamage||0;
        if(a.n==='fungonoid')grow(a,10);
        if(s.edition!=='3ds'&&a.n==='catoblepas'&&!a.gear&&d.hp>0)d.hp=Math.min(d.u.hp,d.hp)-fx.strength(d.u);
        const leveller=s.edition==='begins'?a.n==='leveller':a.n==='leveler';
        if((a.n==='basilisk'||leveller&&t.type!==3)&&t.level>1&&!fx.blockedLevel(s,t)){
          t.level--;
          if(s.edition==='begins')lines.push(a.c.name+' · 교전 영지 Lv.'+t.level);
        }
      }
      if(a.g==='venom'&&d.hp>0){d.hp=Math.min(d.u.hp,d.hp)-Math.floor(fx.max(d.u)/2);}
      if(a.u.enchant==='thornfetter'&&a.hp>0)a.hp=Math.min(a.hp,a.u.hp)-20;
      if(a.u.enchant==='parasite')s.players[a.seat].cash-=100;
      if(a.g==='wingedboots'||a.g==='stinkbottle'){
        const book=s.players[a.seat].book;
        book.splice(s.predict?0:Math.floor(Math.random()*(book.length+1)),0,a.item);
      }
      if(a.g==='markerflag'&&!b.teleport&&!b.spellMove)b.markerFlag=true;
    }
    function grow(a,n){
      const max=fx.max(a.u),gain=Math.max(0,Math.min(80,max+n)-max);
      a.u.mhp=max+gain;a.u.hp+=gain;a.hp+=gain;
    }
    function victory(a,d){
      const p=s.players[a.seat],other=s.players[d.seat],symbol=t.area*4+t.type;
      if(typeof t.type==='number'&&s.prices[symbol]!=null){
        if(a.n==='sanctumguard')p.symbols[symbol]+=5;
        if(a.g==='coinofpiety')p.symbols[symbol]+=10;
      }
      if(a.n==='squonk'&&p.hand.length<6){p.hand.push(a.u.id);a.returned=true;}
      if(a.n==='leviathan'&&!onBoard('jadeidol')&&combo.activeWorld(s)!=='solidworld')t.type=1;
      if(a.n==='ghoul'){a.heal=true;a.hp=fx.max(a.u);}
      if(s.edition!=='3ds'&&a.n==='raksas'){
        const most=Math.max(0,...other.symbols),at=other.symbols.indexOf(most);
        if(at>=0)other.symbols[at]-=Math.floor(most*.3);
      }
      if(a.n==='taotieh'){const st=fx.strength(a.u);a.u.st=Math.max(st,Math.min(80,st+10));grow(a,10);}
      if(a.g==='heartfibula'||a.g==='windamulet')grow(a,a.g==='heartfibula'?20:10);
      if(a.g==='offeringdoll'&&a.element>=0){
        const i=t.area*4+a.element;if(s.prices[i]!=null)s.prices[i]=Math.floor(s.prices[i]*1.3);
      }
    }
    return {protectedGear,itemStart,forms,baseStats,critical,protect,onHit,end,victory,transform,convert,ids,boost};
  }
  return {rules,protectedItem};
})();
if(typeof module!=='undefined')module.exports=CepterExtraBattle;
