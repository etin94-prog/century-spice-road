/* Original card effects shared by human turns, CPU turns and match simulations. */
const CepterCombos = (() => {
  const worlds={
    brightworld:{name:'브라이트 월드',description:'크리처를 배치할 때 영지 보유와 카드 제물 비용을 무시합니다.'},
    jointworld:{name:'조인트 월드',description:'화·지 영지는 서로 연쇄하고, 수·풍 영지도 서로 연쇄합니다.'},
    mercifulworld:{name:'머시풀 월드',description:'순위가 낮은 셉터의 영지를 침략할 수 없습니다.'},
    mirrorworld:{name:'미러 월드',description:'전투 시작 시 지도에 같은 카드가 2장 이상 배치된 전투 크리처를 파괴합니다.'},
    solidworld:{name:'솔리드 월드',description:'주문이나 능력으로 영지 레벨이 내려가거나 속성이 바뀌지 않습니다.'},
    naturalworld:{name:'내추럴 월드',description:'크리처의 비술, 전투 종료, 파괴 시 능력이 발동하지 않습니다.'},
    darkworld:{name:'다크 월드',description:'저주가 걸린 크리처는 주문·비술의 대상으로 지정할 수 없습니다.'},
    mistyworld:{name:'미스티 월드',description:'셉터는 주문의 대상으로 지정할 수 없습니다.'},
    wasteworld:{name:'웨이스트 월드',description:'카드 비용이 S는 1.5배, R·E는 2배가 됩니다.'}
  };
  const activeWorld=s=>s?.edition==='revolt'&&s.world?.until>s.round?s.world.effect:null;
  const groups = {
    land: 'barricade greed regeneration vitality disease hustle bulimia fatbody peace landprotection mine vortex energyfield magicshelter soulhunt antielement mutation weakness temperance senility fog exile landtransfer relief quicksand telekinesis drought shrink growthbody evilblast camouflage',
    area: 'refresh holyblight cramp reinforce insectswarm exorcism massphantasm sculpture desertstorm',
    player: 'holyword0 grace pain silence haste despair antimagic changeling wizardeye mindseeker waste wordofrecall suppression drainmagic slow holyword3 holywordx echo dimensiondoor squeeze',
    global: 'catastrophe tempest punisher icestorm fireexplosion thunderstorm deathcloud sonicwave demonictrade aurora pressure gravity scourge permission windofhope disbelief dreamterrain invisibility chaospanic raisedead shine goblinslair earthshaker feast '+Object.keys(worlds).join(' ')
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
  function rules(cards,{board,draw,value,vacate,note,claim,canInvade,canOccupy,hasHandSpace=p=>p.hand.length<6,returnToBook}){
    const names=cards.map(key);
    const ids=new Map(names.map((n,id)=>[n,id]));
    const max=u=>u.mhp??cards[u.id].hp;
    const strength=u=>u.st??cards[u.id].st;
    const name=u=>names[u?.id]??key(cards[u?.id]);
    const idol=(s,n)=>s.tiles.some(t=>name(t.unit)===n&&(s.edition!=='saga'||t.unit.enchant!=='paralysis'));
    const immuneHP=t=>t.unit?.enchant==='phantasm'||name(t.unit)==='odradek'||!!cards[t.unit?.id]?.immutableHP;
    const landLevelLocked=t=>levelLocked(t)||name(t.unit)==='trampleweed';
    const terrainLocked=(s,t)=>s.edition==='begins'&&name(t.unit)==='barong'&&t.unit.enchant!=='paralysis';
    const blockedLevel=(s,t)=>landLevelLocked(t)||terrainLocked(s,t)||idol(s,'jadeidol')||activeWorld(s)==='solidworld';
    const isDefensive=u=>cards[u.id].stationary||u.enchant==='magicshelter';
    function targetable(s,t,category='sflash',dispel=false){
      if(!t.unit)return false;
      const n=name(t.unit);
      return (dispel||!['landprotection','magicshelter'].includes(t.unit.enchant)&&!s.players[t.owner].invisible&&
        !(activeWorld(s)==='darkworld'&&enchanted(t.unit)))&&
        !(s.edition==='saga'&&n==='warlock')&&!cards[t.unit.id].spellWard&&!['peri','caitsith','pegasus','grimalkin','blynx','battlegearalpha','bundlegear'].includes(n)&&!(n==='colossus'&&s.edition!=='begins'&&category==='senchant');
    }
    function death(s,id,count=true){
      if(count)s.destroyedCount=(s.destroyedCount||0)+1;
      s.lastDestroyed=id;
      for(const p of s.players)if(p.status==='soulsteal')p.cash+=50;
    }
    function destroy(s,t,caster=s.turn,fromSpell=false){
      const u=t.unit;
      if(u.enchant==='soulhunt')s.players[u.caster].cash+=max(u)*5;
      if(activeWorld(s)!=='naturalworld'){
        if(name(u)==='cornfolk'&&(s.edition!=='begins'||fromSpell))s.players[t.owner].cash+=200;
        if(s.edition==='revolt'&&name(u)==='creepingcoin')s.players[t.owner].cash+=100;
        if(name(u)==='boggart')s.players[t.owner].hand.push(u.id);
        if(name(u)==='mephistopheles'&&caster!=null)s.players[caster].cash-=200;
      }
      if(s.edition==='saga'&&caster!=null&&name(u)==='coaloid'&&u.enchant!=='paralysis'){
        const reward=50*s.tiles.filter(v=>v.owner===t.owner&&v.type===0).length;
        s.players[t.owner].cash+=reward;
        if(reward)note(s,cards[u.id].name+' · +'+reward+'G');
      }
      death(s,u.id,s.edition!=='saga'||caster!=null);
      if(['begins','3ds'].includes(s.edition)&&fromSpell&&name(u)==='jackalope'){
        t.unit=morph(u,'humbaba');
        note(s,cards[u.id].name+' · '+cards[t.unit.id].name+'로 부활');
      }else vacate(t);
    }
    function returnToHand(s,t){
      const owner=s.players[t.owner];
      if(!hasHandSpace(owner)){if(s.edition==='revolt')destroy(s,t);else vacate(t);return;}
      owner.hand.push(t.unit.id);vacate(t);
    }
    function damageAmount(s,t,n){
      return immuneHP(t)?0:Math.min(t.unit.hp,Math.max(0,n-(idol(s,s.edition==='saga'?'clayidol':'crayidol')?10:0)));
    }
    function damage(s,t,n,caster=s.turn,fromSpell=false){
      t.unit.hp-=damageAmount(s,t,n);
      if(t.unit.hp<=0)destroy(s,t,caster,fromSpell);
    }
    const spellHarm=(s,t,n)=>damage(s,t,n,s.turn,true);
    const spellDestroy=(s,t)=>destroy(s,t,s.turn,true);
    function shrinkHealth(s,t,loss){
      if(immuneHP(t))return;
      const u=t.unit;
      u.mhp=Math.max(0,max(u)-loss);u.hp=Math.min(u.hp,u.mhp);
      if(!u.hp)spellDestroy(s,t);
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
        if(e==='growthbody'&&['ps1','saturn'].includes(s.edition)&&t.owner!==i)return [];
        if(e==='telekinesis'&&!board(s).links[n].some(j=>{const d=s.tiles[j];return territoryType(d.type)&&!allied(s,d.owner,t.owner)&&canInvade(s,t.owner,d.owner)&&d.unit?.enchant!=='peace';}))return [];
        if(e==='exile'&&(!enchanted(t.unit)||cards[t.unit.id].catalog?.additionalCost))return [];
        if(['landtransfer','relief'].includes(e)&&t.owner!==i)return [];
        if(e==='relief'&&(s.reliefFrom===n||!s.tiles.some((v,j)=>j!==n&&v.owner===i&&targetable(s,v))))return [];
        return [['targetLand',n]];
      });
    }
    function apply(s,e,x){
      if(s.edition==='revolt'&&worlds[e]){
        s.world={effect:e,until:s.round+6};
        return 'roll';
      }
      const i=s.turn,p=s.players[i],t=s.tiles[x],u=t?.unit,q=s.players[x];
      const tiles=s.tiles.filter(v=>v.unit&&(type[e]!=='area'||v.area===x));
      if(type[e]==='land'){
        if(e==='telekinesis'){s.teleFrom=x;return 'teleMove';}
        if(e==='landtransfer'){p.cash+=value(s,t);vacate(t,true);if(!['3ds','ps1','saturn'].includes(s.edition))p.book.unshift(ids.get(e));}
        else if(e==='exile')returnToHand(s,t);
        else if(e==='relief'){
          if(s.reliefFrom==null){s.reliefFrom=x;return 'spellTarget';}
          const src=s.tiles[s.reliefFrom];[src.unit,t.unit]=[u,src.unit];clear(src.unit);clear(t.unit);delete s.reliefFrom;returnToBook(s,i,ids.get(e));
        }else if(e==='evilblast')spellHarm(s,t,30);
        else if(immuneHP(t)&&['shrink','growthbody','temperance'].includes(e)){
          if(e==='shrink'&&['saga','begins'].includes(s.edition))u.st=Math.max(0,strength(u)-10);
          return 'roll';
        }
        else if(e==='shrink'){
          if(['saga','begins'].includes(s.edition))u.st=Math.max(0,strength(u)-10);
          if(s.edition==='begins')u.hp=Math.max(0,u.hp-10);
          shrinkHealth(s,t,10);
        }
        else if(e==='growthbody'){
          const gain=['revolt','begins','3ds'].includes(s.edition)?Math.max(0,Math.min(10,100-max(u))):10;
          u.mhp=max(u)+gain;u.hp=s.edition==='begins'?Math.min(u.mhp,u.hp+10):u.hp+gain;
        }
        else if(e==='weakness')u.st=0;
        else if(e==='fatbody'){
          u.st=Math.max(0,strength(u)-20);
          if(!immuneHP(t)){const increase=Math.max(0,Math.min(20,100-max(u)));u.mhp=max(u)+increase;u.hp+=increase;}
        }
        else if(e==='temperance'){u.mhp=30;u.hp=Math.min(30,u.hp);}
        else if(e==='mutation'){
          const begins=s.edition==='begins',locked=begins&&immuneHP(t);
          clear(u);
          if(!locked&&!immuneHP(t)){
            const next=Math.max(max(u),Math.min(['begins','saga','3ds'].includes(s.edition)?100:80,max(u)+20));
            if(!begins)u.hp+=next-max(u);
            u.mhp=next;
          }
          u.poisoned=true;
        }else{clear(u);u.enchant=e;u.caster=i;if(e==='barricade'||e==='quicksand')u.expires=s.round+(e==='barricade'?3:2);}
        if(['begins','3ds'].includes(s.edition)&&e==='camouflage')returnToBook(s,i,ids.get(e));
        if(['revolt','3ds'].includes(s.edition)&&['greed','vitality','disease'].includes(e)||
          s.edition==='3ds'&&['antielement','drought','fog','weakness'].includes(e)||s.edition==='revolt'&&e==='vortex'||
          s.edition==='begins'&&['antielement','disease','drought','fog','greed','vitality','weakness'].includes(e))draw(p,s);
      }else if(type[e]==='area'){
        for(const v of tiles){
          const a=v.unit;
          if(e==='refresh'&&!immuneHP(v))a.hp=max(a);
          if(e==='holyblight'&&hasElement(cards[a.id],-1))spellHarm(s,v,20);
          if(e==='cramp')a.st=Math.max(0,strength(a)-20);
          if(e==='reinforce')a.st=Math.max(strength(a),Math.min(s.edition==='saga'?100:80,strength(a)+10));
          if(e==='insectswarm'&&a.hp<max(a))spellHarm(s,v,20);
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
        if(e==='mindseeker'){
          if(['saga','revolt'].includes(s.edition))p.peek={seat:x,ids:q.book.slice(-6).reverse()};
          s.spellTarget=x;return 'mindseeker';
        }
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
          else if(['ps1','saturn'].includes(s.edition)&&e==='haste')q.enchantDeadline=(s.round+2)*s.players.length+s.turn;
          else if(s.edition==='revolt'&&e==='haste')q.hasteRolls=2;
          else if(s.edition==='begins'){
            if(e==='haste'||e==='slow')q.diceLimitRolls=2;
            else q.enchantDeadline=(s.round+1)*s.players.length+s.turn;
          }else q.statusUntil=s.round+2;
        }
      }else{
        if(e==='feast')for(const [j,player] of s.players.entries())player.cash+=50*s.tiles.filter(v=>v.owner===j).length;
        if(e==='earthshaker')for(const v of s.tiles){
          if(!blockedLevel(s,v)&&(s.edition!=='3ds'||v.unit&&max(v.unit)>=40))v.level=Math.max(1,v.level-1);
        }
        if(e==='shine'){if(!s.shineUntil)s.prices=s.prices.map(v=>Math.floor(v*1.5));s.shineUntil=s.round+2;}
        if(e==='goblinslair'){const v=s.tiles[p.pos];if(!v.unit&&territoryType(v.type))claim(v,i,morph(null,'goblin'));p.hand.push(ids.get(e));}
        if(e==='permission')p.flags=[...(board(s).checkpoints||board(s).forts)];
        if(e==='windofhope'){draw(p,s);draw(p,s);}
        if(e==='invisibility'){clearCepter(p);p.invisible=true;}
        if(e==='dreamterrain'){
          clearCepter(p);p.dream=true;
          if(['revolt','begins','3ds'].includes(s.edition))p.enchantDeadline=(s.round-1+5)*s.players.length+s.turn;
        }
        if(e==='raisedead'){if(s.lastDestroyed!=null)p.hand.push(s.lastDestroyed);p.book.unshift(ids.get(e));}
        if(e==='aurora'||e==='pressure')s.prices=s.prices.map(n=>Math.max(1,Math.floor(n*(e==='aurora'?1.2:.7))));
        for(const a of s.players){
          if(e==='gravity'){clearCepter(a);a.word=1;}
          if(e==='scourge'&&(a.word!=null||a.status||a.dream||a.invisible))a.cash-=Math.floor(a.cash*.3);
          if(e==='disbelief')a.cash=Math.max(0,a.cash-5*a.symbols.reduce((sum,n)=>sum+n,0));
          if(e==='chaospanic'){clearCepter(a);a.reverse=true;}
        }
        for(const v of tiles){
          if(takesAreaDamage(e,v,cards))spellHarm(s,v,20);
          if(e==='catastrophe')spellHarm(s,v,Math.ceil(max(v.unit)/2));
          if(e==='demonictrade'&&v.owner===i)v.unit=morph(v.unit,'goblin');
        }
        if(e==='demonictrade')p.cash+=100*s.tiles.filter(v=>name(v.unit)==='goblin').length;
      }
      return 'roll';
    }
    const territoryCosts={domovikha:70,spittingcobra:0,conjurer:80,goobaqueen:20,tetramorph:50,heatimp:50,windimp:50,witch:30,
      archbishop:50,astralqueen:60,clockworkowl:30,dancingdoll:70,domovoi:30,fanatic:60,sharazad:30,
      algasphere:30,banshee:60,bookworm:40,fate:40,hyde:50,barometz:0,healer:20,quakebeast:60,archer:30,holyllama:30};
    const sagaTerritory={fontaciel:50,gogma:200,warlock:60,clockworkowl:30,fay:60,tokebi:0,hypnosloth:40,lichenoid:40,rockshell:40,sakuya:80,creepingflame:30,fortress:30,helltic:60,hellpyron:30,burnacle:50,lamia:40,sylph:100,spudfolk:0,spinyagama:80,seismodon:120};
    const handheldTerritory={
      metalbug:80,sakuya:120,barometz:0,heatimp:50,archbishop:30,clockworkowl:30,dancingdoll:70,domovikha:80,domovoi:30,
      fanatic:50,sharazad:30,algasphere:60,banshee:60,bookworm:40,hyde:50,healer:10,spittingcobra:10,archer:20,holyllama:30,witch:30,
      fate:40,mystic:30,necromancer:30,conjurer:80,goobaqueen:20,sleipnir:60
    };
    const beginsTerritory={sakuya:120,fay:50,algasphere:60,healer:10,archbishop:30,domovikha:80,archer:20};
    const selfAbilities=new Set(['astralqueen','dancingdoll','sharazad','algasphere','banshee','fate','necromancer','barometz','quakebeast']);
    const sagaEvolution={sylph:'garuda',spinyagama:'seismodon',seismodon:'brontides'};
    const cepterAbilities=new Set(['heatimp','windimp','witch','bookworm','holyllama','clockworkowl']);
    const enchantAbilities=new Set(['domovikha','domovoi','spittingcobra','hyde','holyllama','clockworkowl','burnacle']);
    function canUseAbility(s,t){return !!t.unit&&t.unit.enchant!=='paralysis'&&!idol(s,'ebonyidol');}
    function territoryMoveExits(s,from,adjacentOnly=false){
      const links=board(s).links,adjacent=links[from],src=s.tiles[from];
      if(adjacentOnly&&['thornfetter','magicshelter'].includes(src.unit.enchant))return [];
      const exits=adjacentOnly?adjacent:[...new Set([...adjacent,...adjacent.flatMap(i=>links[i])])];
      return exits.filter(i=>{
        const dst=s.tiles[i];
        return i!==from&&territoryType(dst.type)&&!allied(s,src.owner,dst.owner)&&dst.unit?.enchant!=='peace'&&
          (!adjacentOnly||canOccupy(cards[src.unit.id],dst));
      });
    }
    function territoryTargets(s,from){
      const tile=s.tiles[from],n=name(tile.unit),cost=territoryCost(s,n);
      if(cost==null||s.players[s.turn].cash<cost||!canUseAbility(s,tile))return [];
      if(s.edition==='saga'){
        if(n==='creepingflame')return territoryMoveExits(s,from,true).length?[['abilitySelf',from]]:[];
        if(n==='fontaciel'||n==='rockshell'||n==='hellpyron'||n==='spudfolk'||Object.hasOwn(sagaEvolution,n))return [['abilitySelf',from]];
        if(n==='hypnosloth')return s.players.flatMap((q,j)=>q.status!=='barrier'?[['abilityPlayer',j]]:[]);
        if(n==='tokebi'||n==='sakuya')return s.tiles.flatMap((v,j)=>v.owner===s.turn&&targetable(s,v)&&
          (n==='tokebi'||v.type!==2&&!idol(s,'jadeidol'))?[['abilityLand',j]]:[]);
        if(n==='fay'||n==='lichenoid')return s.tiles.flatMap((v,j)=>targetable(s,v)&&
          (n==='fay'?strength(v.unit)<100:!immuneHP(v)&&max(v.unit)<100)?[['abilityLand',j]]:[]);
        if(n==='lamia')return s.tiles.flatMap((v,j)=>targetable(s,v,'senchant')?[['abilityLand',j]]:[]);
        if(n==='gogma')return s.tiles.flatMap((v,j)=>v.level===1&&targetable(s,v)&&!blockedLevel(s,v)?[['abilityLand',j]]:[]);
        if(n==='warlock')return s.players.flatMap((q,j)=>q.status!=='barrier'?[['abilityPlayer',j]]:[]);
      }
      if(s.edition==='begins'){
        if(n==='sakuya')return idol(s,'jadeidol')?[]:s.tiles.flatMap((v,j)=>
          v.owner===s.turn&&v.type!==2&&!terrainLocked(s,v)&&targetable(s,v)?[['abilityLand',j]]:[]);
        if(n==='fay')return s.tiles.flatMap((v,j)=>targetable(s,v)&&strength(v.unit)<100?[['abilityLand',j]]:[]);
        if(n==='algasphere'&&(immuneHP(tile)||max(tile.unit)>=100))return [];
        if(n==='healer')return s.tiles.flatMap((v,j)=>targetable(s,v)&&!immuneHP(v)&&v.unit.hp<max(v.unit)?[['abilityLand',j]]:[]);
      }
      if(s.edition==='3ds'){
        if(n==='necromancer'&&s.lastDestroyed==null)return [];
        if(n==='mystic')return s.tiles.flatMap((v,j)=>targetable(s,v)&&!immuneHP(v)&&max(v.unit)<100?[['abilityLand',j]]:[]);
        if(n==='sleipnir')return s.tiles.flatMap((v,j)=>v.owner===s.turn&&targetable(s,v)&&!cards[v.unit.id].stationary&&v.unit.enchant!=='thornfetter'&&territoryMoveExits(s,j).length?[['abilityLand',j]]:[]);
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
        if(n==='archer'&&s.edition!=='begins'&&allied(s,v.owner,s.turn))return [];
        if(n==='tetramorph'&&(allied(s,v.owner,s.turn)||hasElement(cards[v.unit.id],v.type)))return [];
        return [['abilityLand',j]];
      });
    }
    const territoryCost=(s,n)=>s.edition==='3ds'?handheldTerritory[n]:
      (s.edition==='begins'?beginsTerritory[n]:s.edition==='saga'?sagaTerritory[n]:undefined)??territoryCosts[n];
    function territoryEffect(s,from,x){
      const src=s.tiles[from],n=name(src.unit),p=s.players[s.turn],q=s.players[x],v=s.tiles[x];p.cash-=territoryCost(s,n);
      if(s.edition==='begins'){
        if(n==='sakuya'){v.type=2;return;}
        if(n==='fay'){v.unit.st=Math.min(100,strength(v.unit)+20);return;}
        if(n==='algasphere'){
          const gain=Math.min(20,100-max(src.unit));
          src.unit.mhp=max(src.unit)+gain;src.unit.hp+=gain;return;
        }
      }
      if(s.edition==='3ds'){
        if(n==='metalbug'){destroy(s,v);destroy(s,src);return;}
        if(n==='sakuya'){v.type=2;return;}
        if(n==='mystic'){
          const old=max(v.unit),gain=Math.min(10,100-old);
          v.unit.mhp=old+gain;v.unit.hp+=gain;return;
        }
        if(n==='necromancer'){p.hand.push(s.lastDestroyed);return;}
        if(n==='sleipnir'){s.teleFrom=x;s.territoryMove=true;return 'teleMove';}
      }
      if(s.edition==='saga'){
        if(n==='creepingflame'){s.teleFrom=from;s.territoryMove='adjacent';return 'teleMove';}
        if(n==='fontaciel'){
          for(const t of s.tiles){
            if(t.owner!==s.turn||!t.unit||immuneHP(t))continue;
            const prior=max(t.unit),gain=Math.max(0,Math.min(5,100-prior));
            t.unit.mhp=prior+gain;t.unit.hp+=gain;
          }
          return;
        }
        if(n==='spudfolk'){
          const reward=20*s.tiles.filter(t=>t.unit&&hasElement(cards[t.unit.id],2)).length;
          p.cash+=reward;note(s,cards[src.unit.id].name+' · +'+reward+'G');return;
        }
        if(Object.hasOwn(sagaEvolution,n)){src.unit=morph(src.unit,sagaEvolution[n]);return;}
        if(n==='lamia'){v.unit.st=Math.max(0,strength(v.unit)-20);return;}
        if(n==='hellpyron'){
          const reward=50*(s.destroyedCount||0);
          p.cash+=reward;s.destroyedCount=0;
          note(s,cards[src.unit.id].name+' · +'+reward+'G');
          return;
        }
        if(n==='fortress'||n==='helltic'){damage(s,v,n==='fortress'?10:20);return;}
        if(n==='burnacle'){clear(v.unit);v.unit.enchant='fog';return;}
        if(n==='rockshell'){clear(src.unit);src.unit.enchant='peace';return;}
        if(n==='hypnosloth'){if(q.antiMagic)delete q.antiMagic;else{clearCepter(q);q.word=1;}return;}
        if(n==='tokebi'){p.cash+=value(s,v);vacate(v,true);return;}
        if(n==='sakuya'){v.type=2;return;}
        if(n==='fay'){v.unit.st=Math.min(100,strength(v.unit)+20);return;}
        if(n==='lichenoid'){const gain=Math.min(10,100-max(v.unit));v.unit.mhp=max(v.unit)+gain;v.unit.hp+=gain;return;}
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
      else if(n==='clockworkowl'){if(s.edition==='saga')clearCepter(q);q.chooseDirection=true;}
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
      else if(n==='witch'){const amount=Math.min(q.cash,q.hand.filter(id=>cards[id].kind!=='creature').length*(['3ds','begins'].includes(s.edition)?30:20));p.cash+=amount;q.cash-=amount;}
      else if(n==='domovikha'){clear(v.unit);v.unit.enchant='landprotection';}
      else if(n==='tetramorph')damage(s,v,20);
      else if(n==='spittingcobra'){clear(v.unit);v.unit.poisoned=true;}
      else if(n==='conjurer'||n==='goobaqueen')claim(v,s.turn,morph(null,n==='conjurer'?'baal':'gooba'));
      if(['conjurer','heatimp','windimp'].includes(n))destroy(s,src);
    }
    const arts={
      dispel:{cost:30,label:'크리처 저주 제거'},
      offering:{cost:0,label:'토템 파괴 · 200G'},
      draw:{cost:40,label:'카드 1장 뽑기'},
      heal:{cost:10,label:'HP 30 회복'},
      arrow:{cost:20,label:'적 크리처 HP −10',damage:10,enemy:true},
      lapGain:{cost:0,label:'완주한 주 수 × 30G'},
      dice6:{cost:50,label:'다음 주사위를 6으로 고정'},
      neutralBlast:{cost:80,label:'무속성 크리처 HP −30',damage:30,elements:[-1]},
      fireAirBlast:{cost:60,label:'화·풍 크리처 HP −20',damage:20,elements:[0,3]},
      waterEarthBlast:{cost:60,label:'수·지 크리처 HP −20',damage:20,elements:[1,2]},
      strength:{cost:50,label:'기본 ST +20 · 최대 100'},
      blind:{cost:50,label:'적 영지 통행료 절반',enchant:'fog',enemy:true},
      boost:{cost:40,label:'전투 ST·HP +20',enchant:'vitality',beneficial:true},
      weaken:{cost:40,label:'전투 ST·HP −20',enchant:'disease'},
      worldDispel:{cost:50,label:'전장 전체 저주 제거'},
      fatigue:{cost:50,label:'적 크리처에 피로 부여',setFatigue:true,enemy:true},
      recover:{cost:60,label:'내 크리처의 피로 제거',setFatigue:false,own:true,beneficial:true},
      protect:{cost:80,label:'내 크리처에 주문 대상 보호',enchant:'landprotection',own:true,beneficial:true},
      paralyze:{cost:50,label:'크리처를 마비',enchant:'paralysis'},
      peace:{cost:50,label:'자기 영지 침략 금지 · 통행료 0G',enchant:'peace',self:true,beneficial:true},
      disableTerrain:{cost:40,label:'적 크리처의 지형 효과 무효',enchant:'antielement',enemy:true},
      immobilize:{cost:30,label:'적 크리처의 영지 이동 금지',enchant:'thornfetter',enemy:true},
      camouflage:{cost:40,label:'내 크리처에 지형 효과',enchant:'camouflage',own:true,beneficial:true},
      loseStrength:{cost:30,label:'기본 ST −10',strength:-10},
      poison:{cost:30,label:'크리처에 독 부여'},
      earthShift:{cost:120,label:'내 영지를 지 속성으로 변경',own:true},
      stealSpellMagic:{cost:30,label:'적의 손패 주문 1장당 40G 탈취',player:true,enemy:true},
      shrinkSigil:{cost:50,label:'크리처의 최대 HP −10',shrink:10},
      drainSigil:{cost:20,label:'적의 보유 마력 10% 탈취',player:true,enemy:true},
      floatSigil:{cost:50,label:'셉터의 다음 주사위를 5로 고정',player:true,word:5},
      drawItem:{cost:50,label:'북에서 장비 한 장 뽑기'},
      toMistwing:{cost:30,label:'미스트윙으로 변신',form:'mistwing',self:true},
      toAquahorn:{cost:30,label:'아쿠아혼으로 변신',form:'aquahorn',self:true},
      toMummy:{cost:50,label:'머미로 변신',form:'mummy',self:true},
      toOldWillow:{cost:50,label:'올드 윌로우로 변신',form:'oldwillow',self:true},
      conjureBaal:{cost:80,label:'빈 영지에 바알 소환 후 자신 파괴',summon:'baal',consume:true},
      conjureGooba:{cost:20,label:'빈 영지에 구바 소환',summon:'gooba'},
      giveHiveWorker:{cost:20,label:'하이브 워커를 손패에 추가',grant:'hiveworker',self:true},
      buildStatues:{cost:80,label:'인접한 빈 영지에 스태추 소환',adjacent:'statue',self:true},
      stepMove:{cost:30,label:'한 칸 이동 또는 이동 침략',move:true},
      growMHP:{cost:30,label:'최대 HP +10 · 최대 100',grow:10},
      chooseDirection:{cost:40,label:'다음 이동 방향을 선택',player:true,chooseDirection:true},
      destructionReward:{cost:30,label:'파괴된 크리처 한 마리당 30G 획득 후 파괴 수 초기화',self:true},
      balanceStrength:{cost:60,label:'지도 전체 기본 ST 30 이하는 +20, 50 이상은 −20',self:true}
    };
    const grantedArts={sigiloffloat:'floatSigil',sigilofdrain:'drainSigil',sigilofshrink:'shrinkSigil'};
    const secretKey=(card,unit)=>card?.secretArt||grantedArts[unit?.enchant];
    const secretArt=(card,unit)=>arts[secretKey(card,unit)];
    const vacantLand=t=>!t.unit&&territoryType(t.type);
    const vacantNeighbors=(s,from)=>board(s).links[from].filter(at=>vacantLand(s.tiles[at]));
    function secretTargets(s,from){
      const src=s.tiles[from];
      const key=secretKey(cards[src?.unit?.id],src?.unit),p=s.players[s.turn],art=arts[key];
      if(s.edition!=='revolt'||!art||activeWorld(s)==='naturalworld'||src.unit.fatigued||!allied(s,src.owner,s.turn)||p.cash<art.cost)return [];
      if(art.player)return activeWorld(s)==='mistyworld'?[]:s.players.flatMap((q,i)=>
        (!art.enemy||!allied(s,i,s.turn))&&q.status!=='barrier'&&(!art.chooseDirection||!q.chooseDirection)?[['secretPlayer',i]]:[]);
      if(key==='drawItem')return p.book.some(id=>cards[id].kind==='item')?[['secretSelf',from]]:[];
      if(art.move)return territoryMoveExits(s,from,true).map(at=>['secretLand',at]);
      if(art.summon)return s.tiles.flatMap((t,at)=>vacantLand(t)?[['secretLand',at]]:[]);
      if(art.adjacent)return vacantNeighbors(s,from).length?[['secretSelf',from]]:[];
      if(art.form||art.grant)return [['secretSelf',from]];
      if(key==='worldDispel')return activeWorld(s)?[['secretSelf',from]]:[];
      if(['offering','draw','lapGain','dice6'].includes(key)||art.self&&(!art.enchant||src.unit.enchant!==art.enchant))return [['secretSelf',from]];
      if(art.self)return [];
      return s.tiles.flatMap((t,at)=>{
        if(!t.unit)return [];
        if(key==='dispel')return enchanted(t.unit)?[['secretLand',at]]:[];
        if(!targetable(s,t))return [];
        if(key==='heal'&&t.owner===s.turn&&!immuneHP(t)&&t.unit.hp<max(t.unit))return [['secretLand',at]];
        if(key==='strength'&&strength(t.unit)<100)return [['secretLand',at]];
        if(art.grow&&!immuneHP(t)&&max(t.unit)<100)return [['secretLand',at]];
        if(art.shrink&&!immuneHP(t))return [['secretLand',at]];
        if(art.enemy&&allied(s,t.owner,s.turn)||art.own&&t.owner!==s.turn)return [];
        if(key==='poison'&&!t.unit.poisoned)return [['secretLand',at]];
        if(key==='earthShift'&&t.type!==2&&activeWorld(s)!=='solidworld')return [['secretLand',at]];
        if(art.setFatigue!=null&&!!t.unit.fatigued!==art.setFatigue)return [['secretLand',at]];
        if(art.strength<0&&strength(t.unit)>0)return [['secretLand',at]];
        if(art.enchant&&t.unit.enchant!==art.enchant)return [['secretLand',at]];
        if(art.damage&&!immuneHP(t)&&
          (!art.elements||art.elements.includes(cards[t.unit.id].element)))return [['secretLand',at]];
        return [];
      });
    }
    function applySecret(s,from,at){
      const p=s.players[s.turn],target=s.tiles[at],src=s.tiles[from];
      const card=cards[src.unit.id],key=secretKey(card,src.unit),art=arts[key];
      p.cash-=art.cost;
      if(art.player){
        const q=s.players[at];
        if(q.antiMagic){
          delete q.antiMagic;
          note(s,q.name+' · 안티 매직으로 비술 방어');
          return '안티 매직';
        }
        if(art.word||art.chooseDirection){
          clearCepter(q);
          if(art.word)q.word=art.word;else q.chooseDirection=true;
          note(s,q.name+' · '+art.label);
          return art.label;
        }
        const amount=key==='drainSigil'?Math.floor(Math.max(0,q.cash)*.1):
          40*q.hand.filter(id=>cards[id]?.kind==='spell').length;
        p.cash+=amount;q.cash-=amount;
        note(s,p.name+' · '+card.name+' 비술 · '+q.name+'에게서 '+amount+'G 탈취');
        return amount+'G 탈취';
      }
      if(art.summon){claim(target,s.turn,morph(null,art.summon));delete target.enchant;}
      if(art.consume)destroy(s,src);
      if(art.grant)p.hand.push(ids.get(art.grant));
      if(art.adjacent)for(const at of vacantNeighbors(s,from)){
        claim(s.tiles[at],s.turn,morph(null,art.adjacent));delete s.tiles[at].enchant;
      }
      if(key==='offering'){p.cash+=200;destroy(s,src);}
      if(key==='draw')draw(p,s);
      if(key==='drawItem'){
        const j=p.book.findLastIndex(id=>cards[id].kind==='item');
        p.hand.push(p.book.splice(j,1)[0]);
        for(const q of s.players)if(q.peek?.seat===s.turn)delete q.peek;
      }
      if(art.form){
        const fatigued=src.unit.fatigued;
        src.unit=morph(src.unit,art.form);
        if(fatigued)src.unit.fatigued=true;
      }
      if(key==='dispel')clear(target.unit);
      if(key==='heal')target.unit.hp=Math.min(max(target.unit),target.unit.hp+30);
      if(key==='lapGain')p.cash+=30*p.lap;
      if(key==='destructionReward'){
        const reward=30*(s.destroyedCount||0);
        p.cash+=reward;s.destroyedCount=0;
        note(s,p.name+' · '+card.name+' 비술 · '+reward+'G 획득');
        return reward+'G 획득';
      }
      if(key==='balanceStrength')for(const t of s.tiles){
        if(!t.unit)continue;
        const prior=strength(t.unit);
        if(prior<=30)t.unit.st=prior+20;
        if(prior>=50)t.unit.st=prior-20;
      }
      if(key==='dice6'){clearCepter(p);p.word=6;}
      if(key==='worldDispel')delete s.world;
      if(key==='poison'){clear(target.unit);target.unit.poisoned=true;}
      if(key==='earthShift')target.type=2;
      if(art.grow){
        const prior=max(target.unit),gain=Math.min(art.grow,100-prior);
        target.unit.mhp=prior+gain;target.unit.hp+=gain;
      }
      if(key==='strength')target.unit.st=Math.min(100,strength(target.unit)+20);
      if(art.setFatigue===true)target.unit.fatigued=true;
      if(art.setFatigue===false)delete target.unit.fatigued;
      if(art.strength<0)target.unit.st=Math.max(0,strength(target.unit)+art.strength);
      if(art.enchant){clear(target.unit);target.unit.enchant=art.enchant;target.unit.caster=s.turn;}
      if(art.shrink)shrinkHealth(s,target,art.shrink);
      if(art.damage)damage(s,target,art.damage);
      note(s,p.name+' · '+card.name+' 비술 · '+art.label);
      return art.label;
    }
    function secretValue(s,from,at){
      const source=s.tiles[from].unit,t=s.tiles[at],p=s.players[s.turn],card=cards[source.id];
      const art=secretKey(card,source),spec=arts[art];
      if(spec.player){
        const q=s.players[at];
        if(q.antiMagic)return -20;
        if(spec.word||spec.chooseDirection)return allied(s,at,s.turn)&&q.word==null?5:-20;
        const value=art==='drainSigil'?Math.floor(Math.max(0,q.cash)*.1)/5:
          q.hand.filter(id=>cards[id]?.kind==='spell').length*9;
        return value-spec.cost*.25-(card.vigorous?0:4);
      }
      const friendly=allied(s,s.turn,t.owner);
      let utility=0;
      if(art==='offering')utility=200-value(s,t)-(t.level-1)*35;
      if(art==='draw')utility=p.hand.length<5?35:4;
      if(art==='drawItem')utility=p.hand.filter(id=>cards[id]?.kind==='item').length<2?28:0;
      if(spec.summon){
        const creature=cards[ids.get(spec.summon)];
        utility=20+(matchesTerrain(creature,t.type)?12:0)+creature.hp*.3-(spec.consume?value(s,s.tiles[from])/6:0);
      }
      if(spec.grant)utility=p.hand.length<6?14:0;
      if(spec.grow)utility=(friendly?1:-1)*(12+t.level*4);
      if(spec.shrink)utility=(friendly?-1:1)*(max(t.unit)<=spec.shrink?47+t.level*10:15+t.level*2);
      if(spec.adjacent)utility=vacantNeighbors(s,from).length*22;
      if(spec.form){
        const enemyColors=s.tiles.filter(v=>v.unit&&!allied(s,v.owner,s.turn)).map(v=>cards[v.unit.id].element);
        const count=(colors=[])=>enemyColors.filter(e=>colors.includes(e)).length;
        const next=cards[ids.get(spec.form)];
        utility=6*(count(next.neutralizes)-count(card.neutralizes))+(next.hp-source.hp)/2;
      }
      if(art==='dispel')utility=(friendly?1:-1)*(['peace','landprotection','regeneration','soulhunt','abilityplus'].includes(t.unit.enchant)?-16:14);
      if(art==='heal')utility=Math.min(30,max(t.unit)-t.unit.hp)+(t.level-1)*4;
      if(art==='lapGain')utility=p.lap*30;
      if(art==='destructionReward')utility=15*(s.destroyedCount||0)-spec.cost*.75;
      if(art==='balanceStrength')utility=s.tiles.reduce((sum,v)=>{
        if(!v.unit)return sum;
        const prior=strength(v.unit),change=prior<=30?20:prior>=50?-20:0;
        return sum+change*(allied(s,s.turn,v.owner)?1:-1)*(.5+v.level*.1);
      },0);
      if(art==='dice6')utility=p.word==null?13:-10;
      if(art==='worldDispel')utility=Object.hasOwn(worlds,activeWorld(s))?(s.world.until-s.round)*4:0;
      if(art==='strength')utility=(friendly?1:-1)*Math.min(20,100-strength(t.unit));
      if(spec.enchant)utility=(friendly===!!spec.beneficial?1:-1)*(15+(t.level-1)*8);
      if(art==='peace')utility=t.level>=3?-15:8;
      if(art==='poison')utility=(friendly?-1:1)*(16+t.level*6);
      if(art==='immobilize'&&isDefensive(t.unit))utility=0;
      if(art==='earthShift'){
        const earth=s.tiles.filter(v=>v.owner===s.turn&&v.type===2&&v.area===t.area).length;
        const current=s.tiles.filter(v=>v.owner===s.turn&&v.type===t.type&&v.area===t.area).length;
        utility=(earth-current+1)*t.level*12+(hasElement(cards[t.unit.id],2)?t.level*18:0);
      }
      if(spec.setFatigue!=null)utility=18+t.level*3;
      if(spec.strength<0)utility=(friendly?-1:1)*Math.min(-spec.strength,strength(t.unit));
      if(spec.damage)utility=(friendly?-1:1)*(t.unit.hp<=spec.damage?50+(t.level-1)*10:spec.damage);
      return utility-spec.cost*.25-(card.vigorous?0:4);
    }
    function clearCepter(q){
      for(const field of ['word','status','statusUntil','enchantDeadline','antiMagic','reverse','dream','invisible','chooseDirection','hasteRolls','diceLimitRolls','sagaClemency','sagaService','sagaFeast'])delete q[field];
    }
    return {targets,targetable,apply,max,strength,name,destroy,returnToHand,death,harm:damage,spellHarm,spellDestroy,damageAmount,immuneHP,shrinkHealth,isDefensive,idol,territoryCosts,territoryCost,levelLocked:landLevelLocked,
      blockedLevel,terrainLocked,clearCepter,canUseAbility,territoryTargets,territoryEffect,territoryMoveExits,secretArt,secretTargets,applySecret,secretValue};
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
    const hostile=new Set('bulimia disease weakness senility antielement evilblast shrink slow exile temperance silence despair waste pain wizardeye mindseeker changeling'.split(' '));
    const advantage=t=>friend(t.owner)?1:-1;
    function scoreTarget(e,x){
      if(type[e]==='area'){
        return tiles.filter(t=>t.area===x).reduce((v,t)=>{
          const u=t.unit,amount=e==='refresh'?Math.min(15,fx.max(u)-u.hp):e==='holyblight'?(hasElement(cards[u.id],-1)?-12:0):e==='insectswarm'?(u.hp<fx.max(u)?(u.hp<=20?-18:-7):0):e==='exorcism'?(enchanted(u)?10:0):
            e==='sculpture'?(fx.max(u)<=30?-9:0):e==='cramp'?-6:e==='reinforce'?6:e==='massphantasm'?4:e==='desertstorm'?-3:0;
          return v+advantage(t)*amount;
        },0);
      }
      if(type[e]==='player'){
        const q=s.players[x];
        if(e==='drainmagic')return q.antiMagic?-10:(Math.floor(q.cash*.3)-80)/6;
        if(e==='antimagic'&&s.edition==='begins')return friend(x)&&!q.antiMagic&&!q.status?6:-12;
        if(s.edition==='begins'&&['haste','slow','silence'].includes(e)){
          if(q.antiMagic||q.status===e)return -12;
          if(e==='haste')return friend(x)&&!q.status?(x===seat?10:5):-12;
          return friend(x)?-12:e==='silence'?4+q.hand.length*2:6;
        }
        if(e==='squeeze')return q.antiMagic?-20:friend(x)?12-Math.min(...q.hand.map(id=>cards[id].cost))/10:Math.max(...q.hand.map(id=>cards[id].cost))/10-12;
        if(e==='suppression')return friend(x)?-20:5;
        if(e==='holyword0'){const tile=s.tiles[q.pos];return !friend(x)&&friend(tile.owner)?25+tile.level*5:-5;}
        if(e==='grace')return q.symbols.reduce((v,n,j)=>v+n*s.prices[j],0)*.15/5;
        if(e==='wordofrecall')return q.status==='waste'&&!friend(x)?20:x===seat&&q.flags.length?5:1;
        if(e==='mindseeker'||e==='despair')return !friend(x)?(p.peek?.seat===x?13:6): -10;
        return (hostile.has(e)?!friend(x):friend(x))?8:-12;
      }
      const t=s.tiles[x],n=fx.name(t.unit);
      if(e==='magicshelter')return friend(t.owner)&&t.unit.enchant!==e?3+t.level*2+(fx.isDefensive(t.unit)?4:0):-12;
      if(e==='energyfield'){
        if(t.unit.enchant===e)return -20;
        const threat=s.players.some((q,i)=>!allied(s,t.owner,i)&&q.pos===x);
        return friend(t.owner)?threat&&t.level>=3&&p.cash>=160?9+t.level:0:
          !threat&&s.players[t.owner].cash<160?7:-8;
      }
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
      if(worlds[e]){
        if(activeWorld(s)===e&&s.world.until-s.round>2)return -10;
        if(e==='darkworld')return tiles.reduce((score,t)=>score+(enchanted(t.unit)?advantage(t)*(2+t.level):0),0);
        if(e==='mistyworld')return s.players.reduce((score,q,i)=>score+(friend(i)?1:-1)*(q.cash>=1000?12:0),0);
        if(e==='naturalworld')return tiles.reduce((score,t)=>score+(cards[t.unit.id].secretArt||cards[t.unit.id].regenerate||cards[t.unit.id].evoLegacy? -advantage(t)*8:0),0);
        if(e==='mercifulworld')return s.players.some((q,i)=>!friend(i)&&q.cash>p.cash)?9:0;
        if(e==='mirrorworld')return tiles.reduce((score,t)=>score+(tiles.some(v=>v!==t&&v.unit.id===t.unit.id)?-advantage(t)*6:0),0);
        if(e==='solidworld')return friendly.reduce((score,t)=>score+Math.max(0,t.level-2)*5,0);
        if(e==='brightworld'){
          const reserved=p.hand.map(id=>cards[id]).filter(c=>c.kind==='creature'&&c.catalog?.additionalCost&&c.cost+70<=p.cash);
          return reserved.length*16-4;
        }
        if(e==='jointworld')return tiles.reduce((score,t)=>score+(typeof t.type==='number'&&tiles.some(v=>t!==v&&t.area===v.area&&allied(s,v.owner,t.owner)&&typeof v.type==='number'&&Math.abs(v.type-t.type)===2)?advantage(t)*9:0),0);
        return s.players.reduce((score,q,i)=>score+(friend(i)?-1:1)*q.hand.reduce((tax,id)=>tax+(cards[id].catalog?.rarity==='S'?1:['R','E'].includes(cards[id].catalog?.rarity)?2:0),0),0);
      }
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
      if(e==='dreamterrain'){
        if(p.dream)return -5;
        if(s.edition==='begins')return Math.min(12,s.tiles.reduce((score,t)=>score+(t.unit&&t.owner!==seat?t.level/2:0),0));
        return 4;
      }
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
  function beginsCombos(cards,canEquip){
    const usable=cards.filter(c=>!c.unlisted&&!c.catalogOnly&&!c.generatedOnly),byName=new Map(usable.map(card=>[key(card),card]));
    const compatible=(check,item)=>usable.filter(c=>c.kind==='creature'&&check(c)&&canEquip(c,byName.get(item))).map(key);
    return [
      {groups:[compatible(c=>c.first&&key(c)!=='nike','bindingwhip'),['bindingwhip']],hint:'선제 공격이 통하면 상대가 마비되어 반격할 수 없습니다.'},
      {groups:[compatible(c=>c.regenerate||key(c)==='hydra','spikedshield'),['spikedshield']],hint:'일반 공격 피해의 절반을 돌려주고, 재생이 발동하는 전투에서 생존하면 HP를 회복합니다.'},
      {groups:[compatible(c=>c.neutralizeScroll,'gaseousform'),['gaseousform','countershield']],hint:'크리처가 두루마리를 막고 장비가 일반 공격을 막습니다. 카운터 실드는 방어구를 쓸 수 있는 크리처에만 장착합니다.'},
      {groups:[['bandit'],['executor']],hint:'지원으로 공격력을 90까지 올립니다. 명중하면 피해량의 두 배를 빼앗고 상대 마력이 모자라면 부채가 생깁니다.'},
      {groups:[['bandit'],['tonfa']],hint:'상대가 첫 타를 버티면 두 번째 타격으로도 마력을 빼앗을 수 있습니다.'},
      {groups:[['caitsith'],['buckler']],hint:'기본 ST 40 이상인 일반 공격은 캣 시스가, ST 30 이하인 일반 공격은 버클러가 막습니다.'},
      {groups:[['centaur'],['stormcauser']],hint:'선제로 강하게 공격합니다. 켄타우로스가 생존하면 사용한 장비가 북으로 돌아갑니다.'},
      {groups:[['cockatrice','medusa'],['batteringram']],hint:'일반 공격으로 상대를 방어형으로 바꾸고, 같은 타격의 공성추 효과로 즉사시킵니다.'},
      {groups:[['decoy'],['holygrail','smoketorch']],hint:'디코이는 일반 공격을 반사합니다. 홀리 그레일 또는 스모크 토치로 두루마리에도 대비할 수 있습니다.'},
      {groups:[['gelatinouswall'],['diamondarmor']],hint:'HP를 60 올려 큰 타격을 버팁니다. 전투에서 생존하면 받은 피해 1당 5G를 얻습니다.'}
    ];
  }
  const revoltCombos=[
    {cards:['cockatrice','batteringram'],hint:'일반 공격이 명중하면 상대를 스톤 월로 바꾸고, 방어형 즉사 효과가 이어집니다.'},
    {cards:['tetrarm','chillingblast'],hint:'보유한 수·풍 영지로 두루마리 ST를 만들고 연속 두 번 공격합니다.'},
    {cards:['tetrarm','spectresrobe'],hint:'로브가 높인 전투 ST를 같은 전투의 두 타격에 모두 적용합니다.'},
    {cards:['tetrarm','twinspike'],hint:'첫 타격에 살아남은 상대를 테트라암으로 바꾸고 변신한 상대에게 한 번 더 공격합니다.'},
    {cards:['triton','soulray'],hint:'두루마리 강타로 공격합니다. 살아남으면 소울 레이가 돌아오고 카드도 한 장 뽑습니다.'},
    {cards:['wonderwall','magussmirror'],hint:'네 속성의 일반 공격을 막고 두루마리 공격을 상대에게 반사합니다.'},
    {cards:['sulfurousballoon','necroscarab'],hint:'격파되면 상대에게 HP 40 피해를 주고 스켈레톤으로 살아납니다.'},
    {cards:['sulfurousballoon','stormcauser'],hint:'전투 ST를 크게 높입니다. 약해진 벌룬이 격파되면 상대에게 HP 40 피해를 줍니다.'},
    {cards:['caitsith','buckler'],hint:'기본 ST가 40 이상인 상대는 캣 시스가, 30 이하인 상대는 버클러가 일반 공격을 막습니다.'}
  ];
  return {rules,type,worlds,activeWorld,key,hasElement,sameElements,matchesTerrain,territoryType,damageSpells,allied,clear,enchanted,levelLocked,recipes,revoltCombos,beginsCombos,matches,planner};
})();
if(typeof module!=='undefined')module.exports=CepterCombos;
