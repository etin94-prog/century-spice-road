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
  function rules(s,b,t,cards,fx,combo,total,lines){
    const {ids,creatures}=catalog(cards,combo.key);
    function pick(pool){return pool[s.predict?Math.floor(pool.length/2):Math.floor(Math.random()*pool.length)];}
    const chance=n=>!s.predict&&Math.random()<n;
    const onBoard=n=>s.tiles.some(v=>fx.name(v.unit)===n);
    // A Boost provider taking part in the battle cannot affect either side.
    // Another copy elsewhere can still provide the same non-stacking bonus.
    const sources=s.tiles.filter((v,j)=>v.unit&&j!==b.at&&j!==b.from);
    function boost(n,a,ownOnly=false){
      return sources.some(v=>(!ownOnly||v.owner===a.seat)&&fx.name(v.unit)===n);
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
      if(form!=null)transform(a,form,temporary);
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
        case 'anubias':a.hp=5*(s.destroyedCount||0);break;
        case 'kraken':if(lands.some(v=>v.type===0))a.hp-=20;break;
        case 'gargoyle':if(a.defending)a.st=50;break;
        case 'chonchon':if(!a.gear)a.hp+=20;break;
        case 'soulcollector':a.st+=5*(s.destroyedCount||0);break;
      }
      if(a.element>=0&&boost(lord[a.element],a))a.hp+=10;
      if(boost('madclown',a,true))a.hp+=10;
      if(!a.defending&&boost('ares',a))a.st+=20;
      if(!a.defending&&boost('nue',a))a.st-=10;
      if(a.element===3&&boost('hunbaba',a))a.st-=10;
      if(a.c.first&&boost('quetzalcoatl',a))a.st+=10;
      if(a.u.enchant==='wing')a.st+=20;
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
      if(scroll)return s.edition==='saga'&&a.n==='warlock'||['wizard','efreet','conjurer'].includes(a.n)||a.g==='hellblaze'&&fx.strength(d.u)<=20||a.g==='stonehail'&&d.element===3||a.g==='tearinghalo'&&a.element!==-1;
      return a.n==='elf'&&!a.c.criticalRace&&d.element===2||a.g==='earthamulet'&&a.element===2||a.g==='windamulet'&&a.element===3||a.g==='icicle'&&d.element===0||a.g==='vorpalsword'&&fx.max(d.u)>=40;
    }
    function protect(a,d,damage,scroll,penetrates,orb){
      if(scroll){
        if(d.g==='magussmirror'||d.n==='carbunfly'){
          a.hp-=damage;lines.push('두루마리 반사');return 'reflect';
        }
        if(d.c.neutralizeScroll||scrollBlock.has(d.g)||['battlegearbeta','bundlegear'].includes(d.n)){lines.push('두루마리 무효');return 'block';}
        return;
      }
      if(d.n==='salamander'&&a.element===0){
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
      if(d.g==='talisman'||d.g==='smoketorch'&&penetrates||d.g==='fireshield'&&(a.element===0||d.element===0)||
        ['knightshield','knightsshield'].includes(d.g)&&fx.strength(a.u)>=40||d.n==='grindylow'&&fx.strength(a.u)<=30||
        ['nymph','yeti'].includes(d.n)&&a.element===0||d.n==='dhampir'&&a.element===2||d.n==='kraken'&&a.element===-1){
        lines.push('공격 무효');return 'block';
      }
    }
    function vacant(a){
      const pool=s.tiles.flatMap((v,j)=>j!==b.at&&j!==b.from&&v.owner<0&&combo.territoryType(v.type)?[j]:[]);
      const at=pick(pool);
      if(at==null)a.hp=0;
      else{a.away=at;lines.push((at+1)+'번 빈 영지로 이동');}
    }
    function onHit(a,d,damage){
      a.hit=true;
      const n=a.n;
      if(n==='vampire'||s.edition==='saga'&&n==='crimsonvine'){a.hp+=damage;a.absorbed=true;}
      if(s.edition==='saga'&&n==='jackolantern'){
        const amount=Math.min(Math.max(0,s.players[d.seat].cash),Math.max(0,Math.min(a.u.hp,a.hp))*2);
        s.players[d.seat].cash-=amount;s.players[a.seat].cash+=amount;
        if(amount)lines.push('공격 명중 · '+amount+'G 탈취');
      }
      if(d.hp<=0)return;
      if(n==='werewolf'&&chance(.6))convert(d,'wolf');
      if(n==='medusa')convert(d,'statue');
      if(n==='cockatrice')convert(d,'wallofstone');
      if(n==='littlegray'&&chance(.5))vacant(d);
      if(n==='nymph'&&fx.max(d.u)<=30&&s.players[a.seat].hand.length<6&&chance(.4)){
        d.stolen=true;s.players[a.seat].hand.push(d.u.id);lines.push('상대 크리처를 손패로 획득');
      }
      if(n==='barrowwight'){combo.clear(d.u);d.u.enchant='sleep';}
      if(['ghoul','hugespider'].includes(n)){combo.clear(d.u);d.u.enchant='paralysis';}
      if(n==='hunbaba'){combo.clear(d.u);d.u.poisoned=true;}
      if(a.g==='batteringram'&&d.c.stationary||n==='vodyanoi'&&a.defending&&chance(.8)||n==='igneousfatui'&&chance(.8)||
        n==='angostura'&&fx.max(d.u)<=30&&chance(.8)||n==='basilisk'&&chance(.5)||n==='yeti'&&d.element===0&&chance(.6)||n==='dhampir'&&d.element===2&&chance(.6)){
        d.hp=0;lines.push('즉사');
      }
      if(n==='bard'&&d.hp>0)vacant(a);
    }
    function end(a,d,creatureEnd){
      if(creatureEnd&&a.hp>0){
        if(s.edition==='saga'&&a.n==='flammefleur'&&!a.dealtDamage&&d.hp>0){d.hp=0;lines.push('전투 종료 · 피해를 주지 못해 상대 격파');}
        if(lord.includes(a.n))s.players[a.seat].cash-=100;
        if(a.n==='efreet')s.players[a.seat].cash-=a.ordinaryDamage||0;
        if(a.n==='fungonoid')grow(a,10);
        if(s.edition!=='3ds'&&a.n==='catoblepas'&&!a.gear&&d.hp>0)d.hp=Math.min(d.u.hp,d.hp)-fx.strength(d.u);
        if((a.n==='basilisk'||a.n==='leveler'&&t.type!==3)&&!onBoard('jadeidol')&&!combo.levelLocked(t)&&fx.name(t.unit)!=='trampleweed')t.level=Math.max(1,t.level-1);
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
      if(a.n==='leviathan'&&!onBoard('jadeidol'))t.type=1;
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
