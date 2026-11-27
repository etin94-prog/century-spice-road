/* Original card effects shared by human turns, CPU turns and match simulations. */
const CepterCombos = (() => {
  const groups = {
    land: 'barricade greed regeneration vitality disease peace landprotection mine vortex soulhunt antielement mutation weakness temperance senility fog exile landtransfer relief quicksand telekinesis drought shrink growthbody evilblast camouflage',
    area: 'cramp reinforce insectswarm exorcism massphantasm sculpture desertstorm',
    player: 'holyword0 grace pain silence haste despair antimagic changeling wizardeye mindseeker waste wordofrecall suppression drainmagic slow holyword3 holywordx echo dimensiondoor squeeze',
    global: 'catastrophe tempest punisher icestorm fireexplosion thunderstorm deathcloud sonicwave demonictrade aurora pressure gravity scourge permission windofhope disbelief dreamterrain invisibility chaospanic raisedead shine goblinslair earthshaker feast'
  };
  const stormElement={icestorm:0,fireexplosion:1,thunderstorm:2,deathcloud:3};
  const damageSpells=new Set(['catastrophe','tempest','punisher','sonicwave',...Object.keys(stormElement)]);
  function takesAreaDamage(effect,tile,cards){
    if(tile.unit.enchant==='phantasm')return false;
    if(Object.hasOwn(stormElement,effect))return hasElement(cards[tile.unit.id],stormElement[effect]);
    if(effect==='sonicwave')return !!cards[tile.unit.id].first;
    return effect==='tempest'||effect==='punisher'&&enchanted(tile.unit);
  }
  const type = Object.fromEntries(Object.entries(groups).flatMap(([group,names]) => names.split(' ').map(name => [name,group])));
  const key=c=>c?.catalog?.path.split('/').pop();
  const hasElement=(card,element)=>card?.elements?.includes(element)??(card?.element===element);
  const sameElements=(a,b)=>a.elements&&b.elements?a.elements.length===b.elements.length&&a.elements.every(e=>hasElement(b,e))
    :!a.elements&&!b.elements&&a.element===b.element;
  const territoryType=type=>typeof type==='number'||['복합','무속성','모프'].includes(type);
  const matchesTerrain=(card,type)=>typeof type==='number'?hasElement(card,type):type==='복합'&&(!!card.elements||card.element>=0);
  const enchanted=u=>!!(u?.enchant||u?.poisoned||u?.confused);
  const levelLocked=t=>['drought','desertstorm'].includes(t.unit?.enchant);
  function clear(u){delete u.enchant;delete u.poisoned;delete u.confused;delete u.expires;delete u.caster;}
  const allied=(s,a,b)=>a>=0&&b>=0&&(a===b||!!s?.teams&&s.teams[a]===s.teams[b]);
  function rules(cards,{board,draw,value,vacate,note,claim}){
    const names=cards.map(key);
    const ids=new Map(names.map((n,id)=>[n,id]));
    const max=u=>u.mhp??cards[u.id].hp;
    const strength=u=>u.st??cards[u.id].st;
    const name=u=>names[u?.id];
    const idol=(s,n)=>s.tiles.some(t=>name(t.unit)===n);
    const immuneHP=t=>t.unit?.enchant==='phantasm'||name(t.unit)==='odradek';
    const landLevelLocked=t=>levelLocked(t)||name(t.unit)==='trampleweed';
    const blockedLevel=(s,t)=>landLevelLocked(t)||idol(s,'jadeidol');
    function targetable(s,t,category='sflash',dispel=false){
      if(!t.unit)return false;
      const n=name(t.unit);
      return (dispel||t.unit.enchant!=='landprotection'&&!s.players[t.owner].invisible)&&
        !(s.edition==='saga'&&n==='warlock')&&!['peri','caitsith','pegasus','grimalkin','blynx','battlegearalpha','bundlegear'].includes(n)&&!(n==='colossus'&&category==='senchant');
    }
    function death(s,id){
      s.destroyedCount=(s.destroyedCount||0)+1;s.lastDestroyed=id;
      for(const p of s.players)if(p.status==='soulsteal')p.cash+=50;
    }
    function destroy(s,t,caster=s.turn){
      const u=t.unit;
      if(u.enchant==='soulhunt')s.players[u.caster].cash+=max(u)*5;
      if(name(u)==='cornfolk')s.players[t.owner].cash+=200;
      if(name(u)==='boggart')s.players[t.owner].hand.push(u.id);
      if(name(u)==='mephistopheles'&&caster!=null)s.players[caster].cash-=200;
      death(s,u.id);vacate(t);
    }
    function damageAmount(s,t,n){
      return immuneHP(t)?0:Math.min(t.unit.hp,Math.max(0,n-(idol(s,'crayidol')?10:0)));
    }
    function damage(s,t,n,caster=s.turn){
      t.unit.hp-=damageAmount(s,t,n);
      if(t.unit.hp<=0)destroy(s,t,caster);
    }
    function morph(u,n){return {id:ids.get(n),hp:cards[ids.get(n)].hp};}
    function targets(s,e){
      const i=s.turn;
      if(type[e]==='area')return [...new Set(s.tiles.map(t=>t.area))].map(a=>['comboArea',a]);
      if(type[e]==='player'){
        if(s.tiles.some(t=>name(t.unit)==='graniteidol')&&['pain','grace','wordofrecall','changeling','wizardeye','mindseeker','suppression','drainmagic','echo','dimensiondoor','squeeze'].includes(e))return [];
        if(e==='squeeze')return s.players.flatMap((q,n)=>q.hand.length?[['targetPlayer',n]]:[]);
        return s.players.flatMap((q,n)=>allied(s,i,n)&&['pain','silence','despair','changeling','mindseeker','waste','drainmagic','echo'].includes(e)||e==='mindseeker'&&!(q.book?.length??q.bookCount)?[]:[['targetPlayer',n]]);
      }
      return s.tiles.flatMap((t,n)=>{
        if(!targetable(s,t,cards[ids.get(e)]?.catalog?.category))return [];
        if(['evilblast','shrink'].includes(e)&&allied(s,i,t.owner))return [];
        if(e==='telekinesis'&&!board(s).links[n].some(j=>{const d=s.tiles[j];return territoryType(d.type)&&!allied(s,d.owner,t.owner)&&d.unit?.enchant!=='peace';}))return [];
        if(e==='exile'&&(!enchanted(t.unit)||cards[t.unit.id].catalog?.additionalCost))return [];
        if(['landtransfer','relief'].includes(e)&&t.owner!==i)return [];
        if(e==='relief'&&(s.reliefFrom===n||!s.tiles.some((v,j)=>j!==n&&v.owner===i&&targetable(s,v))))return [];
        return [['targetLand',n]];
      });
    }
    function apply(s,e,x){
      const i=s.turn,p=s.players[i],t=s.tiles[x],u=t?.unit,q=s.players[x];
      const tiles=s.tiles.filter(v=>v.unit&&(type[e]!=='area'||v.area===x));
      if(type[e]==='land'){
        if(e==='telekinesis'){s.teleFrom=x;return 'teleMove';}
        if(e==='landtransfer'){p.cash+=value(s,t);vacate(t,true);p.book.unshift(ids.get(e));}
        else if(e==='exile'){const owner=s.players[t.owner];if(owner.hand.length<6)owner.hand.push(u.id);vacate(t);}
        else if(e==='relief'){
          if(s.reliefFrom==null){s.reliefFrom=x;return 'spellTarget';}
          const src=s.tiles[s.reliefFrom];[src.unit,t.unit]=[u,src.unit];clear(src.unit);clear(t.unit);delete s.reliefFrom;p.book.unshift(ids.get(e));
        }else if(e==='evilblast')damage(s,t,30);
        else if(immuneHP(t)&&['shrink','growthbody','temperance'].includes(e))return 'roll';
        else if(e==='shrink'){u.mhp=Math.max(0,max(u)-10);u.hp=Math.min(u.hp,u.mhp);if(!u.hp)destroy(s,t);}
        else if(e==='growthbody'){const gain=s.edition==='revolt'?Math.max(0,Math.min(10,100-max(u))):10;u.mhp=max(u)+gain;u.hp+=gain;}
        else if(e==='weakness')u.st=0;
        else if(e==='temperance'){u.mhp=30;u.hp=Math.min(30,u.hp);}
        else if(e==='mutation'){
          clear(u);if(!immuneHP(t)){const next=Math.max(max(u),Math.min(80,max(u)+20));u.hp+=next-max(u);u.mhp=next;}u.poisoned=true;
        }else{clear(u);u.enchant=e;u.caster=i;if(e==='barricade'||e==='quicksand')u.expires=s.round+(e==='barricade'?3:2);}
        if(['revolt','3ds'].includes(s.edition)&&['greed','vitality','disease'].includes(e))draw(p,s);
      }else if(type[e]==='area'){
        for(const v of tiles){
          const a=v.unit;
          if(e==='cramp')a.st=Math.max(0,strength(a)-20);
          if(e==='reinforce')a.st=Math.max(strength(a),Math.min(80,strength(a)+10));
          if(e==='insectswarm'&&a.hp<max(a))damage(s,v,20);
          if(e==='massphantasm'||e==='desertstorm'){clear(a);a.enchant=e==='massphantasm'?'phantasm':e;if(e==='desertstorm')a.expires=s.round+2;}
          if(e==='exorcism'&&enchanted(a)){clear(a);if(!immuneHP(v)){a.mhp=max(a)+10;a.hp+=10;}}
          if(e==='sculpture'&&max(a)<=30)v.unit=morph(a,'statue');
        }
      }else if(type[e]==='player'){
        if(['holyword0','holyword3','holywordx','antimagic','waste','silence','haste','despair','slow'].includes(e))clearCepter(q);
        if(['holyword0','holyword3','holywordx'].includes(e)){q.word=e==='holywordx'?10:e==='holyword3'?3:0;delete q.status;}
        if(e==='squeeze'){s.spellTarget=x;return 'squeeze';}
        if(e==='suppression'){if(q.hand.some(id=>cards[id].kind==='spell')){s.spellTarget=x;return 'suppression';}return 'roll';}
        if(e==='antimagic')q.antiMagic=true;
        if(e==='waste')q.status=e;
        if(e==='wizardeye'){p.peek={seat:x,ids:q.book.slice(-6).reverse()};p.hand.push(ids.get(e));}
        if(e==='mindseeker'){s.spellTarget=x;return 'mindseeker';}
        if(e==='changeling'){
          for(const watcher of s.players)if(watcher.peek?.seat===x)delete watcher.peek;
          const slots=q.book.map((_,i)=>i);
          const goblin=ids.get('goblin');
          if(s.edition==='ps2')q.recycleTemplate??=q.template.slice();
          for(let j=0;j<2&&slots.length;j++){
            const index=slots.splice(Math.floor(Math.random()*slots.length),1)[0];
            const prior=q.book[index];
            q.book[index]=goblin;
            if(prior!==goblin&&q.recycleTemplate){
              const copy=q.recycleTemplate.indexOf(prior);
              if(copy>=0)q.recycleTemplate[copy]=goblin;
            }
          }
        }
        if(e==='dimensiondoor'){
          const dest=s.tiles.flatMap((v,j)=>j!==q.pos&&territoryType(v.type)?[j]:[]);
          if(dest.length){q.pos=dest[Math.floor(Math.random()*dest.length)];q.previous=null;q.dir=0;if(x===i)s.spellArrival=true;}
          s.visited=[];s.remaining=0;s.die=0;return 'land';
        }
        if(e==='wordofrecall'){if(x===i&&q.pos!==0)s.spellArrival=true;q.pos=0;q.dir=0;q.previous=null;s.die=0;return 'land';}
        if(e==='grace')p.cash+=Math.floor(q.symbols.reduce((a,n,j)=>a+n*s.prices[j],0)*.15);
        if(e==='echo')p.cash=Math.floor(q.cash/2);
        if(e==='drainmagic'){const amount=Math.floor(Math.max(0,q.cash)*.3);q.cash-=amount;p.cash+=amount;}
        if(e==='pain')q.cash=Math.max(0,q.cash-100);
        if(['silence','haste','despair','slow'].includes(e)){
          q.status=e;
          if(s.edition==='ps2')q.enchantDeadline=(s.round+1)*s.players.length+s.turn;
          else if(s.edition==='revolt'&&e==='haste')q.hasteRolls=2;
          else q.statusUntil=s.round+2;
        }
      }else{
        if(e==='feast')for(const [j,player] of s.players.entries())player.cash+=50*s.tiles.filter(v=>v.owner===j).length;
        if(e==='earthshaker')for(const v of s.tiles)if(!blockedLevel(s,v))v.level=Math.max(1,v.level-1);
        if(e==='shine'){if(!s.shineUntil)s.prices=s.prices.map(v=>Math.floor(v*1.5));s.shineUntil=s.round+2;}
        if(e==='goblinslair'){const v=s.tiles[p.pos];if(!v.unit&&territoryType(v.type))claim(v,i,morph(null,'goblin'));p.hand.push(ids.get(e));}
        if(e==='permission')p.flags=[...(board(s).checkpoints||board(s).forts)];
        if(e==='windofhope'){draw(p,s);draw(p,s);}
        if(e==='invisibility'){clearCepter(p);p.invisible=true;}
        if(e==='dreamterrain'){clearCepter(p);p.dream=true;}
        if(e==='raisedead'){if(s.lastDestroyed!=null)p.hand.push(s.lastDestroyed);p.book.unshift(ids.get(e));}
        if(e==='aurora'||e==='pressure')s.prices=s.prices.map(n=>Math.max(1,Math.floor(n*(e==='aurora'?1.2:.7))));
        for(const a of s.players){
          if(e==='gravity'){clearCepter(a);a.word=1;}
          if(e==='scourge'&&(a.word!=null||a.status||a.dream||a.invisible))a.cash-=Math.floor(a.cash*.3);
          if(e==='disbelief')a.cash=Math.max(0,a.cash-5*a.symbols.reduce((sum,n)=>sum+n,0));
          if(e==='chaospanic'){clearCepter(a);a.reverse=true;}
        }
        for(const v of tiles){
          if(takesAreaDamage(e,v,cards))damage(s,v,20);
          if(e==='catastrophe')damage(s,v,Math.ceil(max(v.unit)/2));
          if(e==='demonictrade'&&v.owner===i)v.unit=morph(v.unit,'goblin');
        }
        if(e==='demonictrade')p.cash+=100*s.tiles.filter(v=>name(v.unit)==='goblin').length;
      }
      return 'roll';
    }
    const territoryCosts={domovikha:70,spittingcobra:0,conjurer:80,goobaqueen:20,tetramorph:50,heatimp:50,windimp:50,witch:30,
      archbishop:50,astralqueen:60,clockworkowl:30,dancingdoll:70,domovoi:30,fanatic:60,sharazad:30,
      algasphere:30,banshee:60,bookworm:40,fate:40,hyde:50,barometz:0,healer:20,quakebeast:60,archer:30,holyllama:30};
    const sagaTerritory={fontaciel:50,gogma:200,warlock:60};
    const handheldTerritory={
      metalbug:80,sakuya:120,barometz:0,heatimp:50,archbishop:30,clockworkowl:30,dancingdoll:70,domovikha:80,domovoi:30,
      fanatic:50,sharazad:30,algasphere:60,banshee:60,bookworm:40,hyde:50,healer:10,spittingcobra:10,archer:20,holyllama:30,witch:30
    };
    const selfAbilities=new Set(['astralqueen','dancingdoll','sharazad','algasphere','banshee','fate','barometz','quakebeast']);
    const cepterAbilities=new Set(['heatimp','windimp','witch','bookworm','holyllama','clockworkowl']);
    const enchantAbilities=new Set(['domovikha','domovoi','spittingcobra','hyde','holyllama','clockworkowl']);
    function canUseAbility(s,t){return !!t.unit&&t.unit.enchant!=='paralysis'&&!idol(s,'ebonyidol');}
    function territoryTargets(s,from){
      const tile=s.tiles[from],n=name(tile.unit),cost=territoryCost(s,n);
      if(cost==null||s.players[s.turn].cash<cost||!canUseAbility(s,tile))return [];
      if(s.edition==='saga'){
        if(n==='fontaciel')return [['abilitySelf',from]];
        if(n==='gogma')return s.tiles.flatMap((v,j)=>v.level===1&&targetable(s,v)&&!blockedLevel(s,v)?[['abilityLand',j]]:[]);
        if(n==='warlock')return s.players.flatMap((q,j)=>q.status!=='barrier'?[['abilityPlayer',j]]:[]);
      }
      if(s.edition==='3ds'){
        if(n==='metalbug')return s.tiles.flatMap((v,j)=>j!==from&&targetable(s,v)&&v.unit.hp<max(v.unit)?[['abilityLand',j]]:[]);
        if(n==='sakuya')return s.tiles.flatMap((v,j)=>v.owner===s.turn&&v.unit&&territoryType(v.type)&&v.type!==2&&v.level<=3&&!blockedLevel(s,v)?[['abilityLand',j]]:[]);
      }
      if(selfAbilities.has(n))return [['abilitySelf',from]];
      if(cepterAbilities.has(n)){
        if(!enchantAbilities.has(n)&&idol(s,'graniteidol'))return [];
        return s.players.flatMap((q,j)=>q.status==='barrier'||!enchantAbilities.has(n)&&allied(s,j,s.turn)||n==='bookworm'&&!q.hand.length?[]:[['abilityPlayer',j]]);
      }
      return s.tiles.flatMap((v,j)=>{
        if(['conjurer','goobaqueen'].includes(n))return !v.unit&&territoryType(v.type)?[['abilityLand',j]]:[];
        if(!targetable(s,v,enchantAbilities.has(n)?'senchant':'sflash',n==='archbishop'))return [];
        if(n==='archer'&&allied(s,v.owner,s.turn))return [];
        if(n==='tetramorph'&&(allied(s,v.owner,s.turn)||hasElement(cards[v.unit.id],v.type)))return [];
        return [['abilityLand',j]];
      });
    }
    const territoryCost=(s,n)=>s.edition==='3ds'?handheldTerritory[n]:(s.edition==='saga'?sagaTerritory[n]:undefined)??territoryCosts[n];
    function territoryEffect(s,from,x){
      const src=s.tiles[from],n=name(src.unit),p=s.players[s.turn],q=s.players[x],v=s.tiles[x];p.cash-=territoryCost(s,n);
      if(s.edition==='3ds'){
        if(n==='metalbug'){destroy(s,v);destroy(s,src);return;}
        if(n==='sakuya'){v.type=2;return;}
      }
      if(s.edition==='saga'){
        if(n==='fontaciel'){
          for(const t of s.tiles){
            if(t.owner!==s.turn||!t.unit||immuneHP(t))continue;
            const prior=max(t.unit),gain=Math.max(0,Math.min(5,100-prior));
            t.unit.mhp=prior+gain;t.unit.hp+=gain;
          }
          return;
        }
        if(n==='gogma'){v.level=3;return;}
        if(n==='warlock'){
          if(q.antiMagic)delete q.antiMagic;
          else{clearCepter(q);q.antiMagic=true;}
          return;
        }
      }
      if(cepterAbilities.has(n)&&q.antiMagic){delete q.antiMagic;}
      else if(n==='archbishop')clear(v.unit);
      else if(n==='astralqueen'){for(const t of s.tiles)if(t.unit){clear(t.unit);t.unit.enchant='camouflage';}}
      else if(n==='clockworkowl'){q.chooseDirection=true;}
      else if(n==='dancingdoll'){s.prices=s.prices.map(price=>Math.max(1,Math.floor(price*.8)));}
      else if(n==='domovoi'||n==='hyde'){clear(v.unit);v.unit.enchant=n==='domovoi'?'phantasm':'paralysis';}
      else if(n==='fanatic'){damage(s,v,20);if(src.unit)damage(s,src,s.edition==='3ds'?10:20);}
      else if(n==='sharazad'){for(const who of s.players)clearCepter(who);}
      else if(n==='algasphere'&&!immuneHP(src)){
        const handheld=s.edition==='3ds',gain=Math.max(0,Math.min(handheld?20:10,(handheld?100:80)-max(src.unit)));
        src.unit.mhp=max(src.unit)+gain;src.unit.hp+=gain;
      }
      else if(n==='banshee'){for(const t of s.tiles)if(t.unit)damage(s,t,Math.floor(max(t.unit)/4));}
      else if(n==='bookworm'){s.spellTarget=x;return 'bookWorm';}
      else if(n==='fate')draw(p,s);
      else if(n==='barometz')p.cash+=(p.lap+1)*30;
      else if(n==='healer'){if(!immuneHP(v))v.unit.hp=Math.min(max(v.unit),v.unit.hp+30);}
      else if(n==='quakebeast'){for(const j of board(s).links[from]){const t=s.tiles[j];if(!blockedLevel(s,t))t.level=Math.max(1,t.level-1);}destroy(s,src);}
      else if(n==='archer')damage(s,v,10);
      else if(n==='holyllama'){clearCepter(q);q.word=6;}
      else if(n==='windimp')q.cash-=Math.floor(q.cash/2);
      else if(n==='heatimp'){const j=q.symbols.indexOf(Math.max(...q.symbols));q.symbols[j]-=Math.floor(q.symbols[j]*.4);}
      else if(n==='witch'){const amount=Math.min(q.cash,q.hand.filter(id=>cards[id].kind!=='creature').length*(s.edition==='3ds'?30:20));p.cash+=amount;q.cash-=amount;}
      else if(n==='domovikha'){clear(v.unit);v.unit.enchant='landprotection';}
      else if(n==='tetramorph')damage(s,v,20);
      else if(n==='spittingcobra'){clear(v.unit);v.unit.poisoned=true;}
      else if(n==='conjurer'||n==='goobaqueen')claim(v,s.turn,morph(null,n==='conjurer'?'baal':'gooba'));
      if(['conjurer','heatimp','windimp'].includes(n))destroy(s,src);
    }
    function clearCepter(q){
      for(const field of ['word','status','statusUntil','enchantDeadline','antiMagic','reverse','dream','invisible','chooseDirection','hasteRolls','sagaClemency','sagaService','sagaFeast'])delete q[field];
    }
    return {targets,targetable,apply,max,strength,name,destroy,death,harm:damage,damageAmount,immuneHP,idol,territoryCosts,territoryCost,levelLocked:landLevelLocked,
      blockedLevel,clearCepter,canUseAbility,territoryTargets,territoryEffect};
  }
  const recipes=[
    [["antimagic"],["goblinslair"]],
    [["boggart","gnome"],["barricade"]],
    [["oldwillow","kelpie"],["barricade"]],
    [["oldwillow","kelpie"],["holyword1"]],
    [["boggart","gnome"],["greed"]],
    [["cornfolk"],["soulhunt"]],
    [["dryad"],["landprotection"]],
    [["gascloud"],["regeneration"]],
    [["gascloud"],["vitality"]],
    [["goldentotem"],["soulhunt"]],
    [["kelpie"],["peace"]],
    [["manes"],["greed","vitality"]],
    [["mermecoleo"],["landprotection"]],
    [["oldwillow","kelpie"],["greed"]],
    [["oldwillow","kelpie"],["mine"]],
    [["oldwillow","kelpie"],["vortex"]],
    [["sage"],["landprotection"]],
    [["seabonze"],["greed"]],
    [["sphinx"],["disease"]],
    [["spittingcobra"],["exile"]],
    [["giantrat","dragonfly","ninja","sanctumguard","silveridol","baal","chimera","valkyria","lilith","lizardman","vodyanoi","darkelf","gargoyle","vampire","carbunfly","centaur","elf","harpy","hurricane","mastermonk","nightfiend","pegasus","roadrunner","wyvern"],["clawoftheghoul"]],
    [["skeleton","hydra","ghoul","greenmold","healer","troll","paladin"],["spikeshield"]],
    [["bandit"],["executor"]],
    [["bloodypudding"],["behemoth"]],
    [["caitsith"],["buckler"]],
    [["centaur"],["stormcauser"]],
    [["cerberus"],["rathunter"]],
    [["cornfolk"],["goldengoose"]],
    [["deathgaze"],["death"]],
    [["decoy","sulfurousballoon","drool","nightmare"],["dynamite"]],
    [["decoy"],["wateramulet"]],
    [["drool"],["blackorb","gremlinamulet"]],
    [["drool"],["wateramulet"]],
    [["drool"],["watershield"]],
    [["gascloud"],["fireamulet"]],
    [["gascloud"],["ringofthevampire"]],
    [["gascloud"],["livingshield"]],
    [["gouda"],["banditsglove"]],
    [["gremlin"],["terrair"]],
    [["hurricane"],["changingsalve"]],
    [["leprechaun"],["changingsalve"]],
    [["leprechaun"],["dynamite"]],
    [["leshy"],["silverplow"]],
    [["lunatichare"],["ringofthesuccubus"]],
    [["mandrake"],["phoenixamulet"]],
    [["migoal"],["dragonhelm"]],
    [["mujina"],["mujinamask"]],
    [["mummy"],["goldengoose"]],
    [["nike"],["hourglass"]],
    [["phoenix"],["dynamite"]],
    [["remora"],["belloflaw"]],
    [["sonascetic"],["decoy"]],
    [["spectre"],["stormcauser"]],
    [["sprite"],["gemoflife"]],
    [["succubus"],["lunastone"]],
    [["sulfurousballoon"],["necroscarab"]],
    [["undine"],["terrair"]],
    [["wraith"],["phoenixamulet"]],
    [["zombie"],["necroscarab"]],
    [["pan","bandit","berserker","cleric","littlegray","samurai","werewolf","wraith","barrowwight","willothewisp","amazon","medusa","nymph","vodyanoi","yeti","angostura","basilisk","cockatrice","ghoul","hugespider","hunbaba","vampire","dhampir","hornet","igneousfatui","nike","sphinx","succubus"],["silveridol"]],
    [["borgess"],["gascloud"],["neutralamulet"]],
    [["tetramorph"],["virus"]],
    [["tempest","catastrophe","punisher","tetramorph"],["insectswarm"]],
    [["massphantasm","desertstorm","plague"],["exorcism"]],
    [["dynamite","mandrake","gemoflife"],["goblinslair"]],
    [["windofhope"],["peri"]],
    [["antielement"],["nightfiend"]],
    [["aurora"],["grace"]],
    [["brassidol"],["despair"]],
    [["brassidol"],["exile"]],
    [["catastrophe"],["catastrophe"]],
    [["catastrophe"],["tempest"],["insectswarm"]],
    [["conjurer"],["raisedead"]],
    [["demonictrade"],["demonictrade"]],
    [["desertstorm"],["punisher"]],
    [["dreamterrain"],["fog"]],
    [["goblinslair"],["demonictrade"]],
    [["goldentotem"],["raisedead"]],
    [["goobaqueen"],["landtransfer"]],
    [["graniteidol"],["disbelief"]],
    [["gravity"],["scourge"]],
    [["haste"],["fly"]],
    [["heatimp","windimp"],["raisedead"]],
    [["leshy"],["telekinesis"],["silverplow"]],
    [["lung"],["pressure"]],
    [["marbleidol"],["changeling"]],
    [["massphantasm"],["invisibility"]],
    [["mutation"],["exorcism"]],
    [["mutation"],["vitality"]],
    [["permission"],["chaospanic"]],
    [["powdereater"],["demonictrade"]],
    [["powdereater"],["relief"]],
    [["shine"],["grace"]],
    [["waste"],["wordofrecall"]],
    [["wizardeye"],["despair"]],
    [["wizardeye"],["mindseeker"]],
    [["boggart","gnome"],["holyword0"]],
    [["cramp"],["grendel"]],
    [["disease"],["lunatichare"]],
    [["oldwillow"],["kelpie"],["relief"]],
    [["pain"],["banditsglove"]],
    [["pain"],["witch"]],
    [["reinforce"],["decoy"]],
    [["senility"],["powdereater"]],
    [["silence"],["oldwillow","kelpie","quicksand"]],
    [["sphinx"],["disease"]],
    [["temperance"],["sculpture"]],
    [["weakness"],["lunatichare"]]
  ];
  function matches(groups,names){
    if(!groups.length)return true;
    const [first,...rest]=groups;
    return names.some((n,j)=>first.includes(n)&&matches(rest,names.filter((_,k)=>j!==k)));
  }
  function planner(s,seat,cards,fx,deckGroups){
    const p=s.players[seat],names=p.hand.map(id=>key(cards[id])),tiles=s.tiles.filter(t=>t.unit);
    const friend=j=>allied(s,seat,j),friendly=tiles.filter(t=>friend(t.owner));
    const available=names.concat(friendly.map(t=>fx.name(t.unit)),friendly.map(t=>t.unit.enchant));
    const pair=(a,b)=>deckGroups.some(g=>g.some(row=>row.includes(a))&&g.some(row=>row.includes(b)&&!row.includes(a)));
    const ready=n=>deckGroups.some(g=>g.some(row=>row.includes(n))&&matches(g,available));
    const hostile=new Set('disease weakness senility antielement evilblast shrink slow exile temperance silence despair waste pain wizardeye mindseeker changeling'.split(' '));
    const advantage=t=>friend(t.owner)?1:-1;
    function scoreTarget(e,x){
      if(type[e]==='area'){
        return tiles.filter(t=>t.area===x).reduce((v,t)=>{
          const u=t.unit,amount=e==='insectswarm'?(u.hp<fx.max(u)?(u.hp<=20?-18:-7):0):e==='exorcism'?(enchanted(u)?10:0):
            e==='sculpture'?(fx.max(u)<=30?-9:0):e==='cramp'?-6:e==='reinforce'?6:e==='massphantasm'?4:e==='desertstorm'?-3:0;
          return v+advantage(t)*amount;
        },0);
      }
      if(type[e]==='player'){
        const q=s.players[x];
        if(e==='drainmagic')return q.antiMagic?-10:(Math.floor(q.cash*.3)-80)/6;
        if(e==='squeeze')return q.antiMagic?-20:friend(x)?12-Math.min(...q.hand.map(id=>cards[id].cost))/10:Math.max(...q.hand.map(id=>cards[id].cost))/10-12;
        if(e==='suppression')return friend(x)?-20:5;
        if(e==='holyword0'){const tile=s.tiles[q.pos];return !friend(x)&&friend(tile.owner)?25+tile.level*5:-5;}
        if(e==='grace')return q.symbols.reduce((v,n,j)=>v+n*s.prices[j],0)*.15/5;
        if(e==='wordofrecall')return q.status==='waste'&&!friend(x)?20:x===seat&&q.flags.length?5:1;
        if(e==='mindseeker'||e==='despair')return !friend(x)?(p.peek?.seat===x?13:6): -10;
        return (hostile.has(e)?!friend(x):friend(x))?8:-12;
      }
      const t=s.tiles[x],n=fx.name(t.unit);
      if(e==='evilblast')return (t.unit.hp<=30?20*t.level:3)-Number(t.unit.enchant==='phantasm')*100;
      if(e==='camouflage')return friend(t.owner)&&t.unit.enchant!==e&&typeof t.type==='number'&&!hasElement(cards[t.unit.id],t.type)?6+t.level*2:-10;
      if(e==='drought')return !friend(t.owner)&&t.level<5&&!levelLocked(t)?12-t.level:-10;
      if(e==='relief'){
        const other=s.tiles[s.reliefFrom];if(!other)return friendly.some(v=>v!==t&&pair(n,fx.name(v.unit)))?12:friendly.length>=2?1:-12;
        return pair(n,fx.name(other.unit))?15:0;
      }
      if(e==='landtransfer')return t.owner===seat&&(n==='gooba'||p.cash<75)?10:-8;
      if(['disease','antielement','senility','weakness'].includes(e)&&!friend(t.owner)){const attacker=names.some(card=>pair(e,card))||friendly.some(v=>pair(e,fx.name(v.unit)));return 5+(attacker?10:0)+(p.pos===x?2:0)+t.level;}
      if(e==='telekinesis')return n==='leshy'&&t.owner===seat?12:1;
      const beneficial=!hostile.has(e)&&e!=='fog',sign=beneficial?advantage(t):-advantage(t);
      if(t.unit.enchant===e)return -8;
      const tactical=pair(e,n)?12:0;
      return sign*(6+Math.min(t.level,4)+tactical)+(e==='temperance'&&fx.max(t.unit)<=30?-12:0);
    }
    function cast(e){
      if(type[e]!=='global'){
        const opts=fx.targets(s,e);return opts.length?Math.max(...opts.map(a=>scoreTarget(e,a[1]))):-30;
      }
      if(damageSpells.has(e)){
        return tiles.reduce((sum,t)=>{
          const affected=e==='catastrophe'?t.unit.enchant!=='phantasm':takesAreaDamage(e,t,cards);
          const damage=e==='catastrophe'?Math.ceil(fx.max(t.unit)/2):20;
          return affected?sum-advantage(t)*(t.unit.hp<=damage?12+t.level*3:5):sum;
        },0);
      }
      if(e==='feast')return tiles.reduce((v,t)=>v+advantage(t)*5,0);
      if(e==='earthshaker')return tiles.reduce((net,t)=>net-(t.level>1&&!levelLocked(t)?advantage(t)*(t.base||80)*2**(t.level-2):0),-300)/10;
      if(e==='raisedead')return s.lastDestroyed==null?-10:10;
      if(e==='permission')return p.flags.length?2:12;
      if(e==='goblinslair'){const t=s.tiles[p.pos];return !t.unit&&territoryType(t.type)?20:-10;}
      if(e==='demonictrade')return friendly.length?friendly.reduce((v,t)=>v+(['goblin','powdereater','gooba'].includes(fx.name(t.unit))?12:2),0):-10;
      if(e==='gravity')return names.includes('scourge')?12:2;
      if(e==='scourge')return s.players.reduce((v,q)=>v+(friend(s.players.indexOf(q))?-1:1)*(q.status||q.word!=null||q.dream||q.invisible?q.cash*.035:0),0);
      if(['aurora','shine','pressure','disbelief'].includes(e)){
        const own=p.symbols.reduce((a,b)=>a+b,0),op=Math.max(...s.players.filter(q=>q!==p).map(q=>q.symbols.reduce((a,b)=>a+b,0)));
        return (['pressure','disbelief'].includes(e)?op-own:own-op)+(names.includes('grace')&&Math.max(own,op)>0?8:0);
      }
      if(e==='invisibility')return !p.invisible&&friendly.length?6:-5;
      if(e==='windofhope')return p.hand.length<5?10:1;
      if(e==='dreamterrain')return p.dream?-5:4;
      return ready(e)?7:2;
    }
    function sequence(n){
      // Consider successive spell turns only while the second spell has a useful target.
      if(cast(n)<=0)return 0;
      const sequences=[['catastrophe','catastrophe'],['catastrophe','tempest','insectswarm'],
        ['massphantasm','exorcism'],['plague','exorcism'],['gravity','scourge'],
        ['desertstorm','punisher'],['mutation','exorcism'],['mutation','vitality'],
        ['temperance','sculpture'],['haste','fly'],['demonictrade','demonictrade'],
        ['goblinslair','demonictrade'],['aurora','grace'],['shine','grace'],
        ['waste','wordofrecall'],['wizardeye','despair'],['wizardeye','mindseeker'],
        ['antimagic','goblinslair'],['permission','chaospanic'],['massphantasm','invisibility']];
      let bonus=0;
      for(const path of sequences){
        for(let j=1;j<path.length;j++){
          if(path[j]===n&&p.lastCast?.name===path[j-1]&&p.lastCast.round>=s.round-1)bonus=Math.max(bonus,18);
          if(path[j-1]===n&&names.includes(path[j])&&pair(n,path[j]))bonus=Math.max(bonus,10);
        }
      }
      return bonus;
    }
    return {pair,ready,scoreTarget,cast,sequence};
  }
  return {rules,type,key,hasElement,sameElements,matchesTerrain,territoryType,damageSpells,allied,clear,enchanted,levelLocked,recipes,matches,planner};
})();
if(typeof module!=='undefined')module.exports=CepterCombos;
