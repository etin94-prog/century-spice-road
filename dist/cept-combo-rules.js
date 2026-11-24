/* Original card effects shared by human turns, CPU turns and match simulations. */
const CepterCombos = (() => {
  const groups = {
    land: 'barricade greed regeneration vitality disease peace landprotection mine vortex soulhunt antielement mutation weakness temperance senility fog exile landtransfer relief quicksand telekinesis',
    area: 'cramp reinforce insectswarm exorcism massphantasm sculpture desertstorm',
    player: 'holyword0 grace pain silence haste despair antimagic changeling wizardeye mindseeker waste wordofrecall suppression',
    global: 'catastrophe tempest punisher demonictrade aurora pressure gravity scourge permission windofhope disbelief dreamterrain invisibility chaospanic raisedead shine goblinslair'
  };
  const type = Object.fromEntries(Object.entries(groups).flatMap(([group,names]) => names.split(' ').map(name => [name,group])));
  const key=c=>c?.catalog?.path.split('/').pop();
  const enchanted=u=>!!(u?.enchant||u?.poisoned||u?.confused);
  function clear(u){delete u.enchant;delete u.poisoned;delete u.confused;delete u.expires;delete u.caster;}
  function rules(cards,{board,draw,value,vacate,note}){
    const ids=new Map(cards.map((c,id)=>[key(c),id]));
    const max=u=>u.mhp??cards[u.id].hp;
    const strength=u=>u.st??cards[u.id].st;
    const name=u=>key(cards[u?.id]);
    function destroy(s,t){
      const u=t.unit;
      if(u.enchant==='soulhunt')s.players[u.caster].cash+=max(u)*5;
      if(name(u)==='cornfolk')s.players[t.owner].cash+=200;
      if(name(u)==='boggart')s.players[t.owner].hand.push(u.id);
      s.lastDestroyed=u.id;vacate(t);
    }
    function damage(s,t,n){if(t.unit.enchant!=='phantasm'&&(t.unit.hp-=n)<=0)destroy(s,t);}
    function morph(u,n){return {id:ids.get(n),hp:cards[ids.get(n)].hp};}
    function targets(s,e){
      const i=s.turn;
      if(type[e]==='area')return [...new Set(s.tiles.map(t=>t.area))].map(a=>['comboArea',a]);
      if(type[e]==='player'){
        if(s.tiles.some(t=>name(t.unit)==='graniteidol')&&['pain','grace','wordofrecall','changeling','wizardeye','mindseeker','suppression'].includes(e))return [];
        return s.players.flatMap((q,n)=>i===n&&['pain','silence','despair','changeling','mindseeker','waste'].includes(e)||e==='mindseeker'&&!(q.book?.length??q.bookCount)?[]:[['targetPlayer',n]]);
      }
      return s.tiles.flatMap((t,n)=>{
        if(!t.unit||t.unit.enchant==='landprotection'||s.players[t.owner].invisible||['peri','caitsith'].includes(name(t.unit)))return [];
        if(e==='telekinesis'&&!board(s).links[n].some(j=>{const d=s.tiles[j];return (typeof d.type==='number'||['복합','무속성'].includes(d.type))&&d.owner!==t.owner&&d.unit?.enchant!=='peace';}))return [];
        if(e==='exile'&&(!enchanted(t.unit)||cards[t.unit.id].catalog?.additionalCost))return [];
        if(['landtransfer','relief'].includes(e)&&t.owner!==i)return [];
        if(e==='relief'&&(s.reliefFrom===n||!s.tiles.some((v,j)=>j!==n&&v.owner===i&&v.unit&&v.unit.enchant!=='landprotection'&&!['peri','caitsith'].includes(name(v.unit)))))return [];
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
        }else if(e==='weakness')u.st=0;
        else if(e==='temperance'){u.mhp=30;u.hp=Math.min(30,u.hp);}
        else if(e==='mutation'){
          clear(u);const next=Math.max(max(u),Math.min(80,max(u)+20));u.hp+=next-max(u);u.mhp=next;u.poisoned=true;
        }else{clear(u);u.enchant=e;u.caster=i;if(e==='barricade'||e==='quicksand')u.expires=s.round+(e==='barricade'?3:2);}
      }else if(type[e]==='area'){
        for(const v of tiles){
          const a=v.unit;
          if(e==='cramp')a.st=Math.max(0,strength(a)-20);
          if(e==='reinforce')a.st=Math.max(strength(a),Math.min(80,strength(a)+10));
          if(e==='insectswarm'&&a.hp<max(a))damage(s,v,20);
          if(e==='massphantasm'||e==='desertstorm'){clear(a);a.enchant=e==='massphantasm'?'phantasm':e;if(e==='desertstorm')a.expires=s.round+2;}
          if(e==='exorcism'&&enchanted(a)){clear(a);a.mhp=max(a)+10;a.hp+=10;}
          if(e==='sculpture'&&max(a)<=30)v.unit=morph(a,'statue');
        }
      }else if(type[e]==='player'){
        if(e==='holyword0'){q.word=0;delete q.status;}
        if(e==='suppression'){if(q.hand.some(id=>cards[id].kind==='spell')){s.spellTarget=x;return 'suppression';}return 'roll';}
        if(e==='antimagic')q.antiMagic=true;
        if(e==='waste')q.status=e;
        if(e==='wizardeye'){p.peek={seat:x,ids:q.book.slice(-6).reverse()};p.hand.push(ids.get(e));}
        if(e==='mindseeker'){s.spellTarget=x;return 'mindseeker';}
        if(e==='changeling'){
          for(const watcher of s.players)if(watcher.peek?.seat===x)delete watcher.peek;
          const slots=q.book.map((_,i)=>i);
          for(let j=0;j<2&&slots.length;j++){const index=slots.splice(Math.floor(Math.random()*slots.length),1)[0];q.book[index]=ids.get('goblin');}
        }
        if(e==='wordofrecall'){q.pos=0;q.dir=0;q.previous=null;s.die=0;return 'land';}
        if(e==='grace')p.cash+=Math.floor(q.symbols.reduce((a,n,j)=>a+n*s.prices[j],0)*.15);
        if(e==='pain')q.cash=Math.max(0,q.cash-100);
        if(['silence','haste','despair'].includes(e)){q.status=e;q.statusUntil=s.round+2;delete q.word;}
      }else{
        if(e==='shine'){if(!s.shineUntil)s.prices=s.prices.map(v=>Math.floor(v*1.5));s.shineUntil=s.round+2;}
        if(e==='goblinslair'){const v=s.tiles[p.pos];if(!v.unit&&(typeof v.type==='number'||['복합','무속성'].includes(v.type))){v.owner=i;v.unit=morph(null,'goblin');}p.hand.push(ids.get(e));}
        if(e==='permission')p.flags=[...(board(s).checkpoints||board(s).forts)];
        if(e==='windofhope'){draw(p,s);draw(p,s);}
        if(e==='invisibility')p.invisible=true;
        if(e==='dreamterrain')p.dream=true;
        if(e==='raisedead'){if(s.lastDestroyed!=null)p.hand.push(s.lastDestroyed);p.book.unshift(ids.get(e));}
        if(e==='aurora'||e==='pressure')s.prices=s.prices.map(n=>Math.max(1,Math.floor(n*(e==='aurora'?1.2:.7))));
        for(const a of s.players){
          if(e==='gravity')a.word=1;
          if(e==='scourge'&&(a.word!=null||a.status||a.dream||a.invisible))a.cash-=Math.floor(a.cash*.3);
          if(e==='disbelief')a.cash=Math.max(0,a.cash-5*a.symbols.reduce((sum,n)=>sum+n,0));
          if(e==='chaospanic')a.reverse=true;
        }
        for(const v of tiles){
          if(e==='tempest'||e==='punisher'&&enchanted(v.unit))damage(s,v,20);
          if(e==='catastrophe')damage(s,v,Math.ceil(max(v.unit)/2));
          if(e==='demonictrade'&&v.owner===i)v.unit=morph(v.unit,'goblin');
        }
        if(e==='demonictrade')p.cash+=100*s.tiles.filter(v=>name(v.unit)==='goblin').length;
      }
      return 'roll';
    }
    const territoryCosts={spittingcobra:0,conjurer:80,goobaqueen:20,tetramorph:50,heatimp:50,windimp:50,witch:30};
    function territoryTargets(s,from){
      const n=name(s.tiles[from].unit),cost=territoryCosts[n];
      if(cost==null||s.players[s.turn].cash<cost)return [];
      if(['heatimp','windimp','witch'].includes(n))return s.tiles.some(v=>name(v.unit)==='graniteidol')?[]:s.players.flatMap((q,j)=>j===s.turn?[]:[['abilityPlayer',j]]);
      return s.tiles.flatMap((v,j)=>{
        if(['conjurer','goobaqueen'].includes(n))return !v.unit&&(typeof v.type==='number'||['복합','무속성'].includes(v.type))?[['abilityLand',j]]:[];
        if(!v.unit||v.unit.enchant==='landprotection'||s.players[v.owner].invisible||['peri','caitsith'].includes(name(v.unit)))return [];
        return n==='spittingcobra'||v.owner!==s.turn&&cards[v.unit.id].element!==v.type?[['abilityLand',j]]:[];
      });
    }
    function territoryEffect(s,from,x){
      const src=s.tiles[from],n=name(src.unit),p=s.players[s.turn],q=s.players[x],v=s.tiles[x];p.cash-=territoryCosts[n];
      if(['windimp','heatimp','witch'].includes(n)&&q.antiMagic){delete q.antiMagic;}
      else if(n==='windimp')q.cash-=Math.floor(q.cash/2);
      else if(n==='heatimp'){const j=q.symbols.indexOf(Math.max(...q.symbols));q.symbols[j]-=Math.floor(q.symbols[j]*.4);}
      else if(n==='witch'){const amount=Math.min(q.cash,q.hand.filter(id=>cards[id].kind!=='creature').length*20);p.cash+=amount;q.cash-=amount;}
      else if(n==='tetramorph')damage(s,v,20);
      else if(n==='spittingcobra'){clear(v.unit);v.unit.poisoned=true;}
      else{v.owner=s.turn;v.unit=morph(null,n==='conjurer'?'baal':'gooba');}
      if(['conjurer','heatimp','windimp'].includes(n))destroy(s,src);
    }
    return {targets,apply,max,strength,name,destroy,territoryTargets,territoryEffect};
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
    [["giantrat","dragonfly","ninja","sanctumguard","silveridol","baal","chimera","valkyria","lilith","lizardman","vodyanoi","darkelf","gargoyle","vampire","carbunfly","centaur","elf","harpy","hurricane","mastermonk","nightfiend","pegasus","quetzalcoatl","roadrunner","wyvern"],["clawoftheghoul"]],
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
    const friendly=tiles.filter(t=>t.owner===seat),enemies=tiles.filter(t=>t.owner!==seat);
    const available=names.concat(friendly.map(t=>fx.name(t.unit)),friendly.map(t=>t.unit.enchant));
    const pair=(a,b)=>deckGroups.some(g=>g.some(row=>row.includes(a))&&g.some(row=>row.includes(b)&&!row.includes(a)));
    const ready=n=>deckGroups.some(g=>g.some(row=>row.includes(n))&&matches(g,available));
    const hostile=new Set('disease weakness senility antielement exile temperance silence despair waste pain wizardeye mindseeker changeling'.split(' '));
    const advantage=t=>t.owner===seat?1:-1;
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
        if(e==='suppression')return x===seat?-20:5;
        if(e==='holyword0'){const tile=s.tiles[q.pos];return x!==seat&&tile.owner===seat?25+tile.level*5:-5;}
        if(e==='grace')return q.symbols.reduce((v,n,j)=>v+n*s.prices[j],0)*.15/5;
        if(e==='wordofrecall')return q.status==='waste'&&x!==seat?20:x===seat&&q.flags.length?5:1;
        if(e==='mindseeker'||e==='despair')return x!==seat?(p.peek?.seat===x?13:6): -10;
        return (hostile.has(e)?x!==seat:x===seat)?8:-12;
      }
      const t=s.tiles[x],n=fx.name(t.unit);
      if(e==='relief'){
        const other=s.tiles[s.reliefFrom];if(!other)return friendly.some(v=>v!==t&&pair(n,fx.name(v.unit)))?12:friendly.length>=2?1:-12;
        return pair(n,fx.name(other.unit))?15:0;
      }
      if(e==='landtransfer')return t.owner===seat&&(n==='gooba'||p.cash<75)?10:-8;
      if(['disease','antielement','senility','weakness'].includes(e)&&t.owner!==seat){const attacker=names.some(card=>pair(e,card))||friendly.some(v=>pair(e,fx.name(v.unit)));return 5+(attacker?10:0)+(p.pos===x?2:0)+t.level;}
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
      if(['tempest','catastrophe','punisher'].includes(e))return tiles.reduce((v,t)=>v-advantage(t)*(e==='punisher'&&!enchanted(t.unit)?0:t.unit.hp<=20?15:5),0);
      if(e==='raisedead')return s.lastDestroyed==null?-10:10;
      if(e==='permission')return p.flags.length?2:12;
      if(e==='goblinslair'){const t=s.tiles[p.pos];return !t.unit&&(typeof t.type==='number'||['복합','무속성'].includes(t.type))?20:-10;}
      if(e==='demonictrade')return friendly.length?friendly.reduce((v,t)=>v+(['goblin','powdereater','gooba'].includes(fx.name(t.unit))?12:2),0):-10;
      if(e==='gravity')return names.includes('scourge')?12:2;
      if(e==='scourge')return s.players.reduce((v,q)=>v+(q===p?-1:1)*(q.status||q.word!=null||q.dream||q.invisible?q.cash*.035:0),0);
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
  return {rules,type,key,clear,enchanted,recipes,matches,planner};
})();
if(typeof module!=='undefined')module.exports=CepterCombos;
