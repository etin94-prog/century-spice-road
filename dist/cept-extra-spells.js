/* Edition-specific spells. Decisions are serializable, including the extra card,
   destination or Soltis effect selected after paying the spell's cost. */
const CepterExtraSpells=(()=>{
  const groups={
    land:'banishingray bindingmist bistair chariot dullness influence locust magicfountain meteor parasite phantasm polymorph quintessence removecurse replace simulacrum sink spiritwalk thornfetter turntothewall upheaval weathering wildgrowth wing',
    player:'babble backward barrier bind blackout corruption dispelmagic eclipse fairylight haunt holyword2 judgment lifeforce mesmerize revival ruin rust subsidence torture',
    global:'acidrain aports avalanche darkcraft elementalrage energyflash erasure escape find foresight forestleap incineration lakeleap lifestream lightcraft massgrowth mistletoe mountainleap plainleap prophecy rayoflaw reincarnation revelation selenear soltis soulsteal spartoi telegnosis teleport triumph'
  };
  const ps2Type=Object.fromEntries(Object.entries(groups).flatMap(([phase,names])=>names.split(' ').map(n=>[n,phase])));
  const shifts={fireshift:0,watershift:1,earthshift:2,airshift:3};
  const hybridShifts={magmashift:{0:2,2:0},stormshift:{1:3,3:1}};
  const type={...ps2Type,holyword8:'player',landdrain:'player',
    alarm:'global',burninghail:'global',freezecyclone:'global',globalinsectswarm:'global',fatigueddisaster:'global',elementalwrath:'global',redivision:'global',
    remission:'land',restore:'land',revoltlandtransfer:'land',stoneblast:'land',holybanishment:'land',liquidform:'land',
    gift:'global',purify:'global',pacifism:'global',revoltphantasm:'global',
    ...Object.fromEntries([...Object.keys(shifts),...Object.keys(hybridShifts)].map(e=>[e,'land']))};
  const damageSpells=new Set(['acidrain','avalanche','elementalrage','energyflash','burninghail','freezecyclone','globalinsectswarm','fatigueddisaster','elementalwrath','stoneblast']);
  const terrain={upheaval:0,sink:1,wildgrowth:2,weathering:3,quintessence:'복합',...shifts};
  const leap={mountainleap:0,lakeleap:1,forestleap:2,plainleap:3};
  const enemyOnly=new Set(['babble','bind','blackout','corruption','haunt','landdrain','mesmerize','ruin','rust','subsidence','torture']);
  const duration={babble:3,barrier:5,bind:1,blackout:2,haunt:2,lifeforce:3,mistletoe:2,soulsteal:3,goodluck:2};
  const soltis={
    goodluck:'행운 · 2라운드 통행료 면제',purify:'정화 · 모든 영지의 인챈트 해제',affection:'은총 · 순위 × 200G',
    hope:'희망 · 2장 드로우',depression:'불황 · 모든 호부 가격 20% 하락',suffocate:'질식 · 모든 크리처에 10 피해',lifeflow:'생명 · 한 지역의 내 크리처 전체 회복'
  };
  const descriptions={
    babble:'적은 3라운드 동안 점술관과 신전을 이용할 수 없다. 사용한 카드는 북으로 돌아간다.',
    bind:'적이 1라운드 동안 행동할 수 없다. 현재 칸의 통행료는 다시 지불하지 않는다.',
    eclipse:'대상이 가장 많이 가진 호부를 최대 20개 없애고, 실제로 없어진 호부마다 대상에게 10G를 준다.',
    influence:'영지 주인이 가장 많이 보유한 속성으로 바꾼다. 동률인 속성 중에서는 무작위로 선택한다.',
    magicfountain:'크리처가 있는 영지를 선택한다. 이곳에 처음 멈춘 셉터가 400G를 받는다.',
    mesmerize:'적 손패의 주문 하나를 골라 사용한다. 메스머라이즈는 고를 수 없다.',
    teleport:'가장 가까운 특수 칸으로 이동한다. 이번 차례의 주사위는 생략한다.',
    soltis:'행운, 정화, 순위에 따른 마력, 드로우, 호부 가격 하락, 전체 피해, 지역 회복 중 하나를 선택한다.'
  };
  const actions={soltisPower:'솔티스 권능',soltisArea:'회복할 지역',foresightCard:'북에서 가져올 카드',prophecyKind:'뽑을 종류',mesmerCard:'대신 사용할 주문',replaceCard:'교체할 크리처'};
  const hints={soltisPower:'일곱 권능 중 하나를 고르세요.',soltisArea:'내 크리처를 회복할 지역을 고르세요.',foresightCard:'북 맨 위의 카드 중 손패에 넣을 카드를 고르세요.',prophecyKind:'뽑을 카드 종류를 고르세요.',mesmerCard:'상대 손패에서 사용할 주문을 고르세요.',replaceCard:'영지 주인의 손패에서 교체할 크리처를 고르세요.'};
  function clearCepter(p){
    for(const field of ['status','statusUntil','enchantDeadline','word','antiMagic','invisible','dream','reverse','chooseDirection','hasteRolls','sagaClemency','sagaService','sagaFeast'])delete p[field];
  }
  const time=s=>(s.round-1)*s.players.length+s.turn;
  function setStatus(s,q,name,rounds=duration[name]){
    clearCepter(q);q.status=name;
    if(rounds)q.enchantDeadline=time(s)+rounds*s.players.length;
  }
  function startTurn(s,cards){
    for(const q of s.players)if(q.enchantDeadline!=null&&q.enchantDeadline<=time(s))clearCepter(q);
    const p=s.players[s.turn];
    if(p.status==='fairylight')p.cash+=p.hand.length*10;
    if(p.status==='torture')p.cash-=p.hand.filter(id=>cards[id].kind==='spell').length*20;
  }
  function rules(cards,{fx,combo,board,draw,refillBook,vacate,territoryType,advance,arrived,total,personalTotal,value,canOccupy,deployable,claim}){
    const ids=new Map(cards.flatMap((c,i)=>c.catalog?[[combo.key(c),i]]:[]));
    const matchesLand=(card,land)=>combo.matchesTerrain(card,land)||land==='무속성'&&combo.hasElement(card,-1);
    const creaturePool=cards.flatMap((c,i)=>c.catalog&&c.kind==='creature'&&!c.catalogOnly?[i]:[]);
    const sample=a=>a.length?a[Math.floor(Math.random()*a.length)]:undefined;
    const enemy=(s,i)=>!combo.allied(s,s.turn,i);
    const owning=(s,seat)=>s.tiles.filter(t=>t.owner===seat);
    const landDrainRate=s=>s.edition==='saga'?20:30;
    const sharedCash=s=>Math.floor(s.players.reduce((sum,q)=>sum+q.cash,0)/s.players.length);
    const symbolCount=p=>p.symbols.reduce((a,b)=>a+b,0);
    const replacement=(s,t)=>s.players[t.owner].hand.flatMap((id,j)=>cards[id].kind==='creature'&&canOccupy(cards[id],t)&&deployable(s,id)?[['replaceCard',j,id]]:[]);
    function chariotExits(s,from){
      const tile=s.tiles[from],links=board(s).links;
      return [...new Set(links[from].flatMap(i=>links[i]))].filter(i=>i!==from&&territoryType(s.tiles[i].type)&&!combo.allied(s,tile.owner,s.tiles[i].owner)&&s.tiles[i].unit?.enchant!=='peace');
    }
    function targets(s,e){
      if(e==='remission'){
        const map=board(s),flags=s.players[s.turn].flags;
        const missing=map.checkpoints.filter(id=>!flags.includes(id));
        return missing.length>1?Object.entries(map.gates).flatMap(([at,id])=>missing.includes(id)?[['targetLand',Number(at)]]:[]):[];
      }
      const category=cards[ids.get(e)]?.catalog.category||'sflash';
      if(type[e]==='player'){
        if(e!=='dispelmagic'&&category==='sflash'&&fx.idol(s,'graniteidol'))return [];
        return s.players.flatMap((q,i)=>{
          if(e!=='dispelmagic'&&q.status==='barrier'||enemyOnly.has(e)&&!enemy(s,i))return [];
          if(e==='mesmerize'&&!q.hand.some(id=>cards[id].kind==='spell'&&combo.key(cards[id])!=='mesmerize'))return [];
          return [['targetPlayer',i]];
        });
      }
      return s.tiles.flatMap((t,i)=>{
        if(!territoryType(t.type))return [];
        const empty=!t.unit,hasTerrain=Object.hasOwn(terrain,e)||Object.hasOwn(hybridShifts,e);
        if(empty||(Object.hasOwn(shifts,e)||e==='revoltlandtransfer')&&t.owner!==s.turn)return [];
        if(hybridShifts[e]&&(t.level>3||!Object.hasOwn(hybridShifts[e],t.type)))return [];
        if(e==='quintessence'&&s.edition==='revolt'&&t.level>=5)return [];
        if(!fx.targetable(s,t,category,e==='removecurse'))return [];
        if((hasTerrain||e==='influence')&&fx.idol(s,'jadeidol'))return [];
        if((e==='meteor'||e==='locust')&&fx.blockedLevel(s,t))return [];
        if(e==='chariot'&&(t.owner!==s.turn||!chariotExits(s,i).length))return [];
        if((e==='bistair'||e==='parasite')&&!enemy(s,t.owner)||e==='banishingray'&&cards[t.unit.id].element!==-1)return [];
        if(e==='stoneblast'&&![2,3].some(element=>combo.hasElement(cards[t.unit.id],element)))return [];
        if(e==='holybanishment'&&matchesLand(cards[t.unit.id],t.type))return [];
        if(e==='replace'&&!replacement(s,t).length)return [];
        return [['targetLand',i]];
      });
    }
    function nearest(s,p,condition){
      const links=board(s).links,area=s.tiles[p.pos].area,seen=new Set([p.pos]);
      let frontier=[p.pos];
      while(frontier.length){
        const next=[];
        for(const at of frontier)for(const dest of links[at]){
          if(seen.has(dest))continue;
          seen.add(dest);next.push(dest);
        }
        const candidates=next.filter(i=>s.tiles[i].area===area&&condition(s.tiles[i]));
        if(candidates.length)return sample(candidates);
        frontier=next;
      }
      return p.pos;
    }
    function warp(s,at){
      const p=s.players[s.turn];s.die=0;s.visited=[];s.remaining=0;
      if(at===p.pos){if(s.circleCasting)return 'land';arrived(s);return s.phase;}
      s.spellArrival=true;s.remaining=1;advance(s,at);p.dir=0;p.previous=null;return s.phase;
    }
    function forgetPeek(s,seat){for(const q of s.players)if(q.peek?.seat===seat)delete q.peek;}
    function resetBook(s,seat,restore=false){
      const q=s.players[seat];
      if(restore)delete q.recycleTemplate;
      q.book=refillBook(q);forgetPeek(s,seat);
    }
    const morph=(t,id)=>{t.unit={id,hp:cards[id].hp};delete t.enchant;};
    function mostSymbols(q,amount,rate=false){
      const max=Math.max(0,...q.symbols);if(!max)return 0;
      const n=q.symbols.indexOf(max),loss=rate?Math.floor(max*amount):Math.min(amount,max);
      q.symbols[n]-=loss;return loss;
    }
    function influence(s,t){
      const counts=[0,0,0,0];for(const v of owning(s,t.owner))if(typeof v.type==='number')counts[v.type]++;
      const max=Math.max(...counts),winners=counts.flatMap((n,i)=>n===max?[i]:[]);
      return max?sample(winners):t.type;
    }
    function massDamage(e,t){
      const card=cards[t.unit.id];
      switch(e){
        case 'energyflash':return t.level===1?t.unit.hp:0;
        case 'acidrain':return cards[t.unit.id].stationary?30:0;
        case 'avalanche':return t.level===5?30:0;
        case 'elementalrage':return matchesLand(cards[t.unit.id],t.type)?0:Math.ceil(t.unit.hp/2);
        case 'burninghail':return combo.hasElement(card,1)||combo.hasElement(card,3)?20:0;
        case 'freezecyclone':return combo.hasElement(card,0)||combo.hasElement(card,2)?20:0;
        case 'globalinsectswarm':return t.unit.hp<fx.max(t.unit)?20:0;
        case 'fatigueddisaster':return t.unit.fatigued&&fx.max(t.unit)>=50?30:0;
        case 'elementalwrath':return matchesLand(cards[t.unit.id],t.type)?0:20;
      }
    }
    function purify(s){
      const kinds=new Set();
      for(const q of s.players){
        const key=q.word!=null?'word'+q.word:q.status||['antiMagic','invisible','dream','reverse','chooseDirection'].find(k=>q[k]);
        if(key)kinds.add(key);
        clearCepter(q);
      }
      for(const t of s.tiles){
        const u=t.unit;
        if(u){for(const key of [u.enchant,u.poisoned?'poison':null,u.confused?'confused':null])if(key)kinds.add(key);combo.clear(u);}
        if(t.enchant){kinds.add(t.enchant);delete t.enchant;}
      }
      return kinds.size;
    }
    function apply(s,e,x){
      const p=s.players[s.turn],q=s.players[x],t=s.tiles[x],u=t?.unit;
      if(type[e]==='land'){
        if(Object.hasOwn(terrain,e))t.type=terrain[e];
        else if(hybridShifts[e])t.type=hybridShifts[e][t.type];
        else switch(e){
          case 'remission':p.flags.push(board(s).gates[x]);break;
          case 'restore':delete u.fatigued;if(!fx.immuneHP(t))u.hp=fx.max(u);break;
          case 'revoltlandtransfer':p.cash+=Math.floor(value(s,t)*.7);vacate(t,true);break;
          case 'banishingray':fx.destroy(s,t);break;
          case 'bistair':fx.harm(s,t,10*owning(s,s.turn).filter(v=>v.type===0).length);break;
          case 'chariot':s.teleFrom=x;p.book.unshift(ids.get(e));return 'teleMove';
          case 'influence':t.type=influence(s,t);break;
          case 'locust':t.level=Math.max(1,t.level-1);break;
          case 'meteor':t.level=1;break;
          case 'polymorph':{const id=sample(creaturePool.filter(id=>id!==u.id));if(id!=null)morph(t,id);break;}
          case 'stoneblast':fx.harm(s,t,30);break;
          case 'holybanishment':s.players[t.owner].hand.push(u.id);vacate(t);break;
          case 'liquidform':combo.clear(u);u.enchant=e;u.caster=s.turn;draw(p,s);break;
          case 'turntothewall':{
            const forms=s.edition==='revolt'?['creepingflame','wallofice','wallofstone','tornado']:['pillarofflame','wallofice','wallofstone','hurricane'];
            morph(t,ids.get(forms[cards[u.id].element]||'statue'));
            if(s.edition==='revolt'&&u.fatigued)t.unit.fatigued=true;
            break;
          }
          case 'removecurse':if(u)combo.clear(u);delete t.enchant;break;
          case 'replace':s.replaceAt=x;return 'replaceCard';
          case 'magicfountain':combo.clear(u);u.enchant=e;break;
          default:combo.clear(u);u.enchant=e==='bindingmist'?'paralysis':e;u.caster=s.turn;
        }
      }else if(type[e]==='player'){
        switch(e){
          case 'corruption':q.cash-=10*symbolCount(q);break;
          case 'landdrain':{const amount=owning(s,x).length*landDrainRate(s);p.cash+=amount;q.cash-=amount;break;}
          case 'judgment':{const victim=Math.random()<2/3?q:p;victim.cash-=Math.floor(Math.max(0,victim.cash)*.8);break;}
          case 'eclipse':q.cash+=10*mostSymbols(q,20);break;
          case 'dispelmagic':clearCepter(q);break;
          case 'revival':resetBook(s,x,true);break;
          case 'ruin':p.hand=p.hand.filter(id=>cards[id].kind!=='spell');q.hand=q.hand.filter(id=>cards[id].kind!=='spell');break;
          case 'rust':q.hand=q.hand.filter(id=>cards[id].kind!=='item');break;
          case 'mesmerize':s.spellTarget=x;return 'mesmerCard';
          case 'holyword2':case 'holyword8':clearCepter(q);q.word=e==='holyword2'?2:8;break;
          case 'backward':clearCepter(q);q.reverse=true;break;
          case 'subsidence':{
            const land=owning(s,x),max=Math.max(0,...land.map(t=>t.level)),target=sample(land.filter(t=>t.level===max));
            if(target&&!fx.blockedLevel(s,target))target.level=Math.max(1,max-1);break;
          }
          default:setStatus(s,q,e);if(e==='babble')p.book.unshift(ids.get(e));
        }
      }else{
        if(Object.hasOwn(leap,e))return warp(s,nearest(s,p,t=>t.type===leap[e]));
        const land=s.tiles.filter(t=>t.unit);
        switch(e){
          case 'escape':return warp(s,nearest(s,p,t=>territoryType(t.type)&&!t.unit));
          case 'teleport':return warp(s,nearest(s,p,t=>!territoryType(t.type)));
          case 'aports':
            for(const other of s.players)if(other!==p){other.pos=p.pos;other.dir=0;other.previous=null;}
            return warp(s,p.pos);
          case 'acidrain':case 'avalanche':case 'energyflash':case 'elementalrage':
          case 'burninghail':case 'freezecyclone':case 'globalinsectswarm':case 'fatigueddisaster':case 'elementalwrath':
            for(const v of land){
              const amount=massDamage(e,v);
              if(e==='energyflash'&&v.level===1)fx.destroy(s,v);
              else if(amount&&e!=='energyflash')fx.harm(s,v,amount);
            }break;
          case 'darkcraft':{const n=Math.max(...s.players.map(symbolCount));for(const other of s.players)if(symbolCount(other)===n)mostSymbols(other,.3,true);break;}
          case 'erasure':s.players.forEach(clearCepter);for(const v of s.tiles){if(v.unit)combo.clear(v.unit);delete v.enchant;}break;
          case 'find':draw(p,s);p.hand.push(ids.get(e));break;
          case 'foresight':
            if(!p.book.length)resetBook(s,s.turn);return 'foresightCard';
          case 'prophecy':if(!p.book.length)resetBook(s,s.turn);return 'prophecyKind';
          case 'gift':{
            const wealth=personalTotal(s,s.turn),rank=1+s.players.filter((_,j)=>personalTotal(s,j)>wealth).length;
            p.cash+=rank*50;for(let n=0;n<rank;n++)draw(p,s);
            break;
          }
          case 'purify':p.cash+=purify(s)*50;break;
          case 'pacifism':for(const q of s.players)setStatus(s,q,e,2);break;
          case 'revoltphantasm':for(const v of land){combo.clear(v.unit);v.unit.enchant='phantasm';}break;
          case 'alarm':for(const v of owning(s,s.turn))if(v.unit)delete v.unit.fatigued;break;
          case 'redivision':{const cash=sharedCash(s);for(const q of s.players)q.cash=cash;break;}
          case 'incineration':p.cash+=20*(s.destroyedCount||0);s.destroyedCount=0;break;
          case 'lifestream':for(const v of owning(s,s.turn))if(!fx.immuneHP(v))v.unit.hp=fx.max(v.unit);break;
          case 'lightcraft':s.players.forEach((other,j)=>{resetBook(s,j,true);other.hand=[];for(let n=0;n<5;n++)draw(other,s);});break;
          case 'massgrowth':for(const v of land){if(fx.immuneHP(v))continue;const max=fx.max(v.unit),gain=Math.max(0,Math.min(5,80-max));v.unit.mhp=max+gain;v.unit.hp+=gain;}break;
          case 'rayoflaw':for(const other of s.players)other.hand=other.hand.filter(id=>cards[id].cost<100);break;
          case 'reincarnation':{const n=p.hand.length+Number(s.edition==='revolt'||s.edition==='begins');p.hand=[];for(let j=0;j<n;j++)draw(p,s);break;}
          case 'revelation':case 'telegnosis':setStatus(s,p,'enlightenment',e==='telegnosis'?1:2);if(e==='telegnosis')p.book.unshift(ids.get(e));break;
          case 'selenear':p.cash+=100*owning(s,s.turn).filter(t=>t.type===2).length;break;
          case 'soltis':return 'soltisPower';
          case 'spartoi':{const v=sample(s.tiles.filter(t=>territoryType(t.type)&&!t.unit));if(v){const id=ids.get('skeleton');claim(v,s.turn,{id,hp:cards[id].hp});delete v.enchant;}break;}
          case 'triumph':case 'mistletoe':case 'soulsteal':setStatus(s,p,e);break;
          default:throw Error('알 수 없는 주문 '+e);
        }
      }
      return 'roll';
    }
    function choices(s){
      const p=s.players[s.turn];
      switch(s.phase){
        case 'soltisPower':return Object.keys(soltis).map(k=>['soltisPower',k]);
        case 'soltisArea':return [...new Set(s.tiles.map(t=>t.area))].map(i=>['soltisArea',i]);
        case 'foresightCard':return (p.book||[]).slice(s.shrineForesight?-3:-6).reverse().map((id,j)=>['foresightCard',j,id]);
        case 'prophecyKind':{
          const kinds=['creature','item','spell'];
          return kinds.filter(k=>s.edition!=='begins'||p.book.some(id=>cards[id].kind===k)).map(k=>['prophecyKind',k]);
        }
        case 'replaceCard':return replacement(s,s.tiles[s.replaceAt]);
        case 'mesmerCard':return s.players[s.spellTarget].hand.flatMap((id,j)=>cards[id].kind==='spell'&&combo.key(cards[id])!=='mesmerize'?[['mesmerCard',j,id]]:[]);
      }
    }
    function choose(s,k,x){
      const p=s.players[s.turn];
      switch(k){
        case 'foresightCard':p.hand.push(...p.book.splice(-1-x,1));forgetPeek(s,s.turn);break;
        case 'prophecyKind':{
          const j=p.book.findLastIndex(id=>cards[id].kind===x);
          if(j>=0){p.hand.push(...p.book.splice(j,1));forgetPeek(s,s.turn);}break;
        }
        case 'replaceCard':{
          const t=s.tiles[s.replaceAt],hand=s.players[t.owner].hand,previous=t.unit.id;
          morph(t,hand[x]);hand.splice(x,1,previous);delete s.replaceAt;break;
        }
        case 'soltisArea':for(const t of owning(s,s.turn))if(t.area===x&&!fx.immuneHP(t))t.unit.hp=fx.max(t.unit);break;
        case 'soltisPower':
          if(x==='lifeflow')return 'soltisArea';
          if(x==='goodluck')setStatus(s,p,'goodluck');
          if(x==='affection'){
            const ahead=s.players.flatMap((_,seat)=>total(s,seat)>total(s,s.turn)?[s.teams?.[seat]??seat]:[]);
            p.cash+=(1+new Set(ahead).size)*200;
          }
          if(x==='purify')for(const t of s.tiles){if(t.unit)combo.clear(t.unit);delete t.enchant;}
          if(x==='hope'){draw(p,s);draw(p,s);}
          if(x==='depression')s.prices=s.prices.map(n=>Math.max(1,Math.floor(n*.8)));
          if(x==='suffocate')for(const t of s.tiles)if(t.unit)fx.harm(s,t,10);
          break;
      }
      return 'roll';
    }
    function scoreTarget(s,e,x){
      const p=s.players[s.turn],t=s.tiles[x],q=s.players[x];
      if(e==='remission')return 10;
      if(type[e]==='player'){
        const sign=enemy(s,x)?-1:1;
        if(q.antiMagic&&e!=='dispelmagic')return -1;
        const count=k=>q.hand.filter(id=>cards[id]?.kind===k).length;
        switch(e){
          case 'rust':return -sign*count('item')*9;
          case 'ruin':return -sign*count('spell')*7-p.hand.filter(id=>cards[id].kind==='spell'&&combo.key(cards[id])!==e).length*5;
          case 'mesmerize':return -sign*Math.max(0,...q.hand.filter(id=>cards[id].kind==='spell').map(id=>cards[id].cost/9));
          case 'corruption':return -sign*symbolCount(q)/2;
          case 'landdrain':return Math.min(owning(s,x).length*landDrainRate(s),Math.max(0,q.cash)+50)/9;
          case 'judgment':return -sign*q.cash/30-p.cash/58;
          case 'eclipse':{
            const count=Math.max(...q.symbols),i=q.symbols.indexOf(count);
            return -sign*Math.min(20,count)*(s.prices[i]-10)/10;
          }
          case 'blackout':case 'subsidence':return -sign*Math.max(0,...owning(s,x).map(v=>(v.level-1)*6));
          case 'torture':return -sign*count('spell')*7;
          case 'fairylight':return sign*q.hand.length*3;
          case 'lifeforce':return sign*(count('creature')+count('item')-count('spell')*2)*3;
          case 'revival':return sign*((q.book?.length??q.bookCount)<10?8:0);
          case 'dispelmagic':return (['bind','torture','haunt','blackout','babble','waste'].includes(q.status)?sign:-sign)*(q.status||q.word!=null||q.antiMagic?12:0);
          case 'barrier':return sign*(q.status==='barrier'?0:6);
          case 'holyword2':return sign*(q.status==='slow'?6:1);
          default:return -sign*(q.status===e?0:5);
        }
      }
      const sign=enemy(s,t.owner)?-1:1,weight=t.level+1;
      if(Object.hasOwn(terrain,e)||hybridShifts[e]){
        const dest=hybridShifts[e]?.[t.type]??terrain[e];
        if(s.edition!=='revolt')return sign*((combo.hasElement(cards[t.unit.id],dest)?2:0)-(combo.hasElement(cards[t.unit.id],t.type)?2:0))*weight;
        if(t.type===dest)return -10;
        const before=matchesLand(cards[t.unit.id],t.type),after=matchesLand(cards[t.unit.id],dest);
        const own=owning(s,t.owner);
        const change=own.filter(v=>v!==t&&v.type===dest&&typeof dest==='number').length-own.filter(v=>v!==t&&v.type===t.type).length;
        return sign*(2*(Number(after)-Number(before))*weight+2*change);
      }
      switch(e){
        case 'stoneblast':return -sign*fx.damageAmount(s,t,30)/4;
        case 'holybanishment':return -sign*(5+weight+t.unit.hp/8);
        case 'liquidform':return sign*(40-t.unit.hp)/7;
        case 'restore':return sign*((fx.immuneHP(t)?0:(fx.max(t.unit)-t.unit.hp)/3)+(t.unit.fatigued?4+weight:0));
        case 'revoltlandtransfer':return p.cash<160?Math.min(value(s,t),300)/10-2*weight:-20;
        case 'meteor':case 'locust':return -sign*(t.level-1)*(e==='meteor'?10:5);
        case 'bistair':return -sign*(fx.immuneHP(t)?0:Math.min(30,owning(s,s.turn).filter(v=>v.type===0).length*3)+(t.unit.hp<=10*owning(s,s.turn).filter(v=>v.type===0).length?weight*4:0));
        case 'banishingray':return -sign*(5+weight*4);
        case 'thornfetter':case 'parasite':case 'bindingmist':return -sign*weight*3;
        case 'wing':case 'phantasm':case 'simulacrum':return sign*(t.unit.enchant===e?0:weight*3);
        case 'polymorph':case 'turntothewall':return -sign*(cards[t.unit.id].cost/12+weight-4);
        case 'removecurse':return (['paralysis','thornfetter','parasite','senility','antielement','disease'].includes(t.unit.enchant)||t.unit.poisoned?sign:-sign)*(combo.enchanted(t.unit)?9:0);
        case 'replace':return Math.max(0,...replacement(s,t).map(a=>sign*(cards[a[2]].hp+cards[a[2]].st-t.unit.hp-fx.strength(t.unit))/5));
        case 'chariot':return chariotExits(s,x).some(i=>s.tiles[i].owner<0&&combo.matchesTerrain(cards[t.unit.id],s.tiles[i].type))?4:1;
        case 'magicfountain':return p.pos===x?0:1;
        case 'influence':return sign*(owning(s,t.owner).filter(v=>v.type===t.type).length<=1?5:-2);
        default:return sign*(t.unit.enchant===e?0:weight);
      }
    }
    function scoreCast(s,e){
      if(type[e]!=='global')return Math.max(-40,...targets(s,e).map(([,x])=>scoreTarget(s,e,x)));
      const p=s.players[s.turn],mine=owning(s,s.turn),land=s.tiles.filter(t=>t.unit);
      if(damageSpells.has(e))return land.reduce((sum,v)=>{
        const amount=massDamage(e,v);
        return sum+(!amount||e!=='energyflash'&&fx.immuneHP(v)?0:(enemy(s,v.owner)?1:-1)*(amount/8+(amount>=v.unit.hp?4*v.level:0)));
      },0);
      if(e==='redivision'){
        const average=sharedCash(s);
        return s.players.reduce((sum,q,i)=>sum+(enemy(s,i)?-1:1)*(average-q.cash),0)/15;
      }
      if(e==='alarm')return mine.reduce((sum,t)=>sum+(t.unit?.fatigued?5+t.level:0),0);
      if(e==='incineration')return (s.destroyedCount||0)*2;
      if(e==='selenear')return mine.filter(t=>t.type===2).length*10;
      if(e==='lifestream')return mine.reduce((v,t)=>v+(fx.immuneHP(t)?0:(fx.max(t.unit)-t.unit.hp)/3),0);
      if(e==='triumph')return p.status==='triumph'?0:4+p.flags.length*4;
      if(e==='rayoflaw')return s.players.reduce((v,q,i)=>v+(enemy(s,i)?1:-1)*q.hand.filter(id=>cards[id].cost>=100).length*6,0);
      if(e==='massgrowth')return land.reduce((v,t)=>v+(enemy(s,t.owner)?-1:1)*(fx.max(t.unit)<80&&!fx.immuneHP(t)?2:0),0);
      if(e==='darkcraft'){const highest=Math.max(...s.players.map(symbolCount));return s.players.reduce((v,q,i)=>v+(symbolCount(q)===highest?(enemy(s,i)?1:-1)*Math.max(...q.symbols)*.5:0),0);}
      if(e==='lightcraft')return 7*(5-p.hand.length);
      if(e==='spartoi')return s.tiles.some(t=>territoryType(t.type)&&!t.unit)?12:0;
      if(e==='soltis')return 19;
      if(e==='soulsteal'||e==='mistletoe')return p.status===e?0:7;
      if(e==='foresight'||e==='prophecy'||e==='find')return 6;
      if(e==='gift')return 10;
      if(e==='purify')return s.tiles.some(t=>t.unit&&combo.enchanted(t.unit))||s.players.some(q=>q.status)?5:-10;
      if(e==='pacifism')return s.tiles.filter(t=>t.owner===s.turn&&t.level>2).length*2-3;
      if(e==='revoltphantasm')return s.tiles.filter(t=>t.owner===s.turn&&t.unit?.hp).length-3;
      if(e==='reincarnation'&&s.edition!=='ps2')return p.hand.length<=2?10:p.hand.every(id=>cards[id].kind!=='creature')?7:1;
      if(e==='revelation'||e==='telegnosis')return mine.length&&p.status!=='enlightenment'?5:0;
      return 2;
    }
    function scoreChoice(s,k,x,id){
      if(k==='soltisPower')return x==='affection'?18:x==='hope'?6-s.players[s.turn].hand.length:0;
      if(k==='soltisArea')return owning(s,s.turn).filter(t=>t.area===x).reduce((v,t)=>v+fx.max(t.unit)-t.unit.hp,0);
      if(k==='prophecyKind')return -s.players[s.turn].hand.filter(id=>cards[id].kind===x).length;
      const card=cards[id];
      if(k==='replaceCard')return (enemy(s,s.tiles[s.replaceAt].owner)?-1:1)*(card.hp+card.st);
      if(k==='mesmerCard'&&type[card.effect])return scoreCast(s,card.effect);
      return card.cost/20+(card.kind==='creature'&&s.players[s.turn].hand.every(n=>cards[n].kind!=='creature')?4:0);
    }
    return {apply,targets,choices,choose,chariotExits,scoreTarget,scoreCast,scoreChoice};
  }
  return {rules,type:ps2Type,modernType:type,descriptions,actions,hints,soltis,clearCepter,startTurn,damageSpells};
})();
if(typeof module!=='undefined')module.exports=CepterExtraSpells;
