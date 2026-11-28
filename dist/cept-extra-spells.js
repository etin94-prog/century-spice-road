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
  const type={...ps2Type,holyword8:'player',landdrain:'player',chargingstep:'player',
    alarm:'global',chaospanic:'global',revoltPlague:'global',philosophy:'global',magicbooster:'global',castlerecall:'global',burninghail:'global',freezecyclone:'global',globalinsectswarm:'global',fatigueddisaster:'global',elementalwrath:'global',redivision:'global',
    remission:'land',magicalleap:'land',shadowleap:'land',blasttrap:'land',sigiloffloat:'land',sigilofdrain:'land',sigilofshrink:'land',debility:'land',debilitystrong:'land',restore:'land',revoltlandtransfer:'land',stoneblast:'land',zap:'land',holybanishment:'land',liquidform:'land',
    gift:'global',charity:'global',turnover:'global',purify:'global',pacifism:'global',revoltphantasm:'global',
    armageddon:'global',beginstempest:'global',scarestorm:'global',disbelief:'global',beginsculdra:'global',immobilize:'global',footrace:'global',unholygrasp:'player',
    blacksmith:'player',reform:'player',beginspoisonmind:'player',discord:'global',metalform:'land',temptation:'land',beginspolymorph:'land',
    trade:'land',intrusion:'land',reflection:'land',sagaselection:'global',rouetsoleil:'global',sagadrought:'player',sagafloat:'player',innocence:'player',sagaiksear:'global',sagaterrair:'land',sagabistair:'land',sagaselenear:'global',sagagift:'player',
    beginsbistair:'global',beginsiksear:'global',beginsselenear:'global',beginsterrair:'global',
    bravesong:'player',toughsong:'player',hunterssong:'player',trespass:'global',zeromn:'global',capture:'player',theft:'player',refuge:'global',
    comet:'land',crusherstorm:'global',desolation:'global',elevation:'land',erosion:'global',fame:'global',
    frostneedle:'land',venomousboil:'land',shininggeyser:'land',shininggeyserstrong:'land',blazesplash:'land',dreadblast:'land',
    deathmiasma:'global',penalize:'global',colorfrombeyond:'global',speedpenalty:'global',
    ...Object.fromEntries([...Object.keys(shifts),...Object.keys(hybridShifts)].map(e=>[e,'land']))};
  const secretSigils=new Set(['sigiloffloat','sigilofdrain','sigilofshrink']);
  const landDamage={shininggeyser:30,shininggeyserstrong:40,blazesplash:30,dreadblast:30};
  const damageSpells=new Set(['acidrain','avalanche','elementalrage','energyflash','burninghail','freezecyclone','globalinsectswarm','fatigueddisaster','elementalwrath','stoneblast','deathmiasma','sagaselection','armageddon','beginstempest']);
  const terrain={upheaval:0,sink:1,wildgrowth:2,weathering:3,quintessence:'복합',...shifts};
  const leap={mountainleap:0,lakeleap:1,forestleap:2,plainleap:3};
  const divineDraw={beginsbistair:[0,'weapon'],beginsiksear:[1,'armor'],beginsselenear:[2,'tool'],beginsterrair:[3,'scroll']};
  const stolenKind={capture:'item',theft:'spell'};
  const enemyOnly=new Set(['capture','theft','babble','bind','blackout','corruption','haunt','landdrain','mesmerize','ruin','rust','subsidence','torture','reform','beginspoisonmind']);
  const duration={bravesong:4,toughsong:4,hunterssong:4,trespass:2,sagadrought:3,sagafloat:2,innocence:2,sagaStrut:3,sagaMagicEra:3,babble:3,barrier:5,bind:1,blackout:2,haunt:2,lifeforce:3,mistletoe:2,soulsteal:3,goodluck:2};
  const soltis={
    goodluck:'행운 · 2라운드 통행료 면제',purify:'정화 · 모든 영지의 인챈트 해제',affection:'은총 · 순위 × 200G',
    hope:'희망 · 2장 드로우',depression:'불황 · 모든 호부 가격 20% 하락',suffocate:'질식 · 모든 크리처에 10 피해',lifeflow:'생명 · 한 지역의 내 크리처 전체 회복'
  };
  const zeromn={
    panic:'대공황 · 모든 호부 가격 50% 하락',extermination:'박멸 · 모든 크리처에 20 피해',
    removeCurse:'저주 제거 · 내 크리처와 영지의 인챈트 해제',fortune:'행운 · 내 순위 × 200G',
    love:'사랑 · 내 모든 크리처 HP 회복',strut:'통행료 면제 · 3라운드',
    magicEra:'마력의 시대 · 3라운드 동안 카드 사용 마력 0G'
  };
  const descriptions={
    babble:'적은 3라운드 동안 점술관과 신전을 이용할 수 없다. 사용한 카드는 북으로 돌아간다.',
    bind:'적이 1라운드 동안 행동할 수 없다. 현재 칸의 통행료는 다시 지불하지 않는다.',
    eclipse:'대상이 가장 많이 가진 호부를 최대 20개 없애고, 실제로 없어진 호부마다 대상에게 10G를 준다.',
    influence:'영지 주인이 가장 많이 보유한 속성으로 바꾼다. 동률인 속성 중에서는 무작위로 선택한다.',
    magicfountain:'크리처가 있는 영지를 선택한다. 이곳에 처음 멈춘 셉터가 400G를 받는다.',
    mesmerize:'적 손패의 주문 하나를 골라 사용한다. 메스머라이즈는 고를 수 없다.',
    teleport:'가장 가까운 특수 칸으로 이동한다. 이번 차례의 주사위는 생략한다.',
    chaospanic:'모든 셉터의 다음 이동 방향을 한 번 뒤집습니다.',
    revoltPlague:'지도에 배치된 모든 크리처에 독을 겁니다. 전투가 끝날 때 최대 HP의 절반만큼 피해를 받습니다.',
    philosophy:'손패에 합성 능력이 있는 카드가 있으면 북에서 3장, 없으면 2장 뽑습니다.',
    chargingstep:'대상 셉터의 다음 두 번 이동은 2~4칸으로 제한됩니다. 대상은 굴릴 때마다 50G를 받습니다.',
    castlerecall:'사용자가 성에 도착합니다. 이번 차례에는 주사위를 굴리지 않습니다.',
    magicbooster:'이번 차례에 영지 레벨업 비용이 절반이 됩니다. 차례 종료 시 효과가 사라집니다.',
    debility:'고른 크리처의 기본 ST를 0으로 바꾸고 한 장 뽑습니다. 주문을 버려 합성하면 최대 HP도 20 줄입니다.',
    sigilofshrink:'기존 비술이 없는 내 크리처에게 50G로 대상 크리처의 최대 HP를 10 낮추는 비술을 부여합니다.',
    blasttrap:'크리처에 폭발 함정을 겁니다. 누구든 그 영지에 멈추면 보유 마력의 40%를 잃고 크리처는 HP 20 피해를 받습니다. 한 번 발동합니다.',
    sigiloffloat:'기존 비술이 없는 내 크리처에게 50G로 셉터의 주사위를 5로 고정하는 비술을 부여합니다.',
    sigilofdrain:'기존 비술이 없는 내 크리처에게 20G로 적의 보유 마력 10%를 빼앗는 비술을 부여합니다.',
    magicalleap:'1~4칸 거리에서 도착할 칸을 고릅니다. 중간 칸을 건너뛰고 이번 차례 주사위를 생략합니다.',
    speedpenalty:'나보다 많이 완주한 적 중 최다 완주자 한 명에게서 완주 차이 1회당 100G를 빼앗는다. 동률이면 한 명을 무작위로 고른다.',
    soltis:'행운, 정화, 순위에 따른 마력, 드로우, 호부 가격 하락, 전체 피해, 지역 회복 중 하나를 선택한다.'
  };
  const actions={zeromnPower:'제롬 권능',intrusionCard:'침략할 크리처',stealCard:'카드 탈취',soltisPower:'솔티스 권능',soltisArea:'회복할 지역',foresightCard:'북에서 가져올 카드',prophecyKind:'뽑을 종류',mesmerCard:'대신 사용할 주문',replaceCard:'교체할 크리처',forgeCard:'제련할 손패',reformCard:'변환할 아이템 또는 주문',poisonBookCard:'파괴할 북 카드'};
  const hints={zeromnPower:'제롬의 일곱 권능 중 하나를 고르세요.',intrusionCard:'소환 조건이 없는 손패 크리처 중 한 장을 고르세요.',stealCard:'상대 손패에서 가져올 카드 한 장을 고르세요.',soltisPower:'일곱 권능 중 하나를 고르세요.',soltisArea:'내 크리처를 회복할 지역을 고르세요.',foresightCard:'북 맨 위의 카드 중 손패에 넣을 카드를 고르세요.',prophecyKind:'뽑을 카드 종류를 고르세요.',mesmerCard:'상대 손패에서 사용할 주문을 고르세요.',replaceCard:'영지 주인의 손패에서 교체할 크리처를 고르세요.',
    forgeCard:'무작위 무기나 방어구로 바꿀 손패 카드를 고르세요.',reformCard:'모든 북과 손패에서 마나로 바꿀 카드를 고르세요.',poisonBookCard:'상대 북 맨 위에서 최대 6장을 보고 파괴할 한 장을 고르세요.'};
  function clearCepter(p){
    for(const field of ['status','statusUntil','enchantDeadline','word','antiMagic','invisible','dream','reverse','chooseDirection','hasteRolls','diceLimitRolls','sagaClemency','sagaService','sagaFeast'])delete p[field];
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
  function rules(cards,{fx,combo,board,draw,note,refillBook,returnToBook,vacate,territoryType,advance,arrived,total,personalTotal,value,chain,canOccupy,deployable,claim,canInvade}){
    const ids=new Map(cards.flatMap((c,i)=>c.catalog?[[combo.key(c),i]]:[]));
    const spellCards=new Map(cards.flatMap(c=>!c.unlisted&&!c.catalogOnly&&c.effect?[[c.effect,c]]:[]));
    const matchesLand=(card,land)=>combo.matchesTerrain(card,land)||land==='무속성'&&combo.hasElement(card,-1);
    const creaturePool=cards.flatMap((c,i)=>c.catalog&&c.kind==='creature'&&!c.catalogOnly?[i]:[]);
    const forgePool=cards.flatMap((c,id)=>!c.unlisted&&!c.catalogOnly&&['weapon','armor'].includes(c.category)?[id]:[]);
    const sample=a=>a.length?a[Math.floor(Math.random()*a.length)]:undefined;
    const enemy=(s,i)=>!combo.allied(s,s.turn,i);
    const owning=(s,seat)=>s.tiles.filter(t=>t.owner===seat);
    function speedPenalty(s){
      const lap=s.players[s.turn].lap;
      const foes=s.players.filter((q,i)=>enemy(s,i)&&q.lap>lap);
      const max=Math.max(lap,...foes.map(q=>q.lap));
      return {amount:(max-lap)*100,leaders:foes.filter(q=>q.lap===max)};
    }
    const affinity=(s,first,second)=>owning(s,s.turn).filter(t=>t.type===first||t.type===second).length;
    function personalRank(s,seat=s.turn){
      const wealth=personalTotal(s,seat);
      return 1+s.players.filter((_,seat)=>personalTotal(s,seat)>wealth).length;
    }
    const divineMatch=(card,e)=>{
      const [element,category]=divineDraw[e];
      return card.kind==='creature'?combo.hasElement(card,element):card.kind==='item'&&card.category===category;
    };
    const landDrainRate=s=>s.edition==='saga'?20:30;
    const sharedCash=s=>Math.floor(s.players.reduce((sum,q)=>sum+q.cash,0)/s.players.length);
    const symbolCount=p=>p.symbols.reduce((a,b)=>a+b,0);
    function discordGroups(land){
      const byCard=new Map();
      for(const t of land){
        const group=byCard.get(t.unit.id);
        if(group)group.push(t);else byCard.set(t.unit.id,[t]);
      }
      const groups=[...byCard.values()],most=Math.max(0,...groups.map(group=>group.length));
      return groups.filter(group=>group.length===most);
    }
    function unholyGraspQuote(s,q){
      const index=q.symbols.indexOf(Math.max(...q.symbols));
      const count=Math.min(10,q.symbols[index]||0);
      return {index,count,magic:count*(s.prices[index]||0)};
    }
    const replacement=(s,t)=>s.players[t.owner].hand.flatMap((id,j)=>cards[id].kind==='creature'&&canOccupy(cards[id],t)&&deployable(s,id)?[['replaceCard',j,id]]:[]);
    function chariotExits(s,from){
      const tile=s.tiles[from],links=board(s).links;
      return [...new Set(links[from].flatMap(i=>links[i]))].filter(i=>{
        const dest=s.tiles[i];
        return i!==from&&territoryType(dest.type)&&!combo.allied(s,tile.owner,dest.owner)&&
          canInvade(s,tile.owner,dest.owner)&&dest.unit?.enchant!=='peace'&&
          (!['saga','revolt','3ds'].includes(s.edition)||canOccupy(cards[tile.unit.id],dest));
      });
    }
    function leapDestinations(s,steps=4,sameArea=true){
      const m=board(s),pos=s.players[s.turn].pos,area=s.tiles[pos].area;
      const seen=new Set([pos]);
      let frontier=[pos];
      for(let distance=1;distance<=steps&&frontier.length;distance++){
        const next=[];
        for(const at of frontier)for(const dest of m.links[at]){
          if(seen.has(dest)||sameArea&&s.tiles[dest].area!==area)continue;
          seen.add(dest);next.push(dest);
        }
        frontier=next;
      }
      seen.delete(pos);
      return [...seen];
    }
    function intrusionCards(s,at){
      const tile=s.tiles[at],p=s.players[s.turn];
      if(!tile.unit||tile.unit.enchant==='peace'||!enemy(s,tile.owner)||!fx.targetable(s,tile)||!canInvade(s,s.turn,tile.owner)||
        ['silence','sagaFear','pacifism'].includes(p.status))return [];
      return p.hand.flatMap((id,j)=>{
        const card=cards[id];
        return card.kind==='creature'&&!card.catalog?.additionalCost&&deployable(s,id)&&canOccupy(card,tile)?[['intrusionCard',j,id]]:[];
      });
    }
    const rouetTargets=s=>s.players.filter((q,i)=>enemy(s,i)&&q.cash>=2);
    function tradeTargets(s,from){
      const owned=s.tiles[from];
      return s.tiles.flatMap((t,i)=>t.unit&&enemy(s,t.owner)&&t.level===owned.level&&fx.targetable(s,t)?[['targetLand',i]]:[]);
    }
    function tradeScore(s,from,to){
      const own=s.tiles[from],target=s.tiles[to],seat=s.turn;
      const peers=(tile,owner)=>s.tiles.filter(t=>t!==tile&&t.owner===owner&&t.type===tile.type&&t.area===tile.area).length;
      const control=(tile,owner)=>peers(tile,owner)*(tile.level+2);
      const strength=tile=>fx.strength(tile.unit)+tile.unit.hp;
      return control(target,seat)+control(own,target.owner)-control(own,seat)-control(target,target.owner)+(strength(target)-strength(own))/5;
    }
    function targets(s,e){
      if(e==='intrusion')return s.tiles.flatMap((_,at)=>intrusionCards(s,at).length?[['targetLand',at]]:[]);
      if(e==='trade'){
        if(s.tradeFrom!=null)return tradeTargets(s,s.tradeFrom);
        return s.tiles.flatMap((t,i)=>t.owner===s.turn&&fx.targetable(s,t)&&tradeTargets(s,i).length?[['targetLand',i]]:[]);
      }
      if(e==='magicalleap'||e==='shadowleap'){
        const nativeShadow=e==='shadowleap';
        return leapDestinations(s,nativeShadow?5:4,!nativeShadow).flatMap(at=>
          !nativeShadow||territoryType(s.tiles[at].type)?[['targetLand',at]]:[]);
      }
      if(e==='remission'){
        const map=board(s),flags=s.players[s.turn].flags;
        const missing=map.checkpoints.filter(id=>!flags.includes(id));
        return missing.length>1?Object.entries(map.gates).flatMap(([at,id])=>missing.includes(id)?[['targetLand',Number(at)]]:[]):[];
      }
      const category=spellCards.get(e)?.catalog?.category||cards[ids.get(e)]?.catalog.category||'sflash';
      if(type[e]==='player'){
        if(e!=='dispelmagic'&&category==='sflash'&&fx.idol(s,'graniteidol'))return [];
        return s.players.flatMap((q,i)=>{
          if(e!=='dispelmagic'&&q.status==='barrier'||enemyOnly.has(e)&&!enemy(s,i))return [];
          if(e==='unholygrasp'&&!symbolCount(q))return [];
          if(e==='blacksmith'&&!q.hand.length||e==='reform'&&!q.hand.some(id=>cards[id].kind!=='creature')||e==='beginspoisonmind'&&!(q.book?.length??q.bookCount))return [];
          if(stolenKind[e]&&!q.hand.some(id=>cards[id].kind===stolenKind[e]))return [];
          if(e==='mesmerize'&&!q.hand.some(id=>cards[id].kind==='spell'&&combo.key(cards[id])!=='mesmerize'))return [];
          return [['targetPlayer',i]];
        });
      }
      return s.tiles.flatMap((t,i)=>{
        if(!territoryType(t.type))return [];
        const empty=!t.unit,hasTerrain=Object.hasOwn(terrain,e)||Object.hasOwn(hybridShifts,e);
        if(empty||(Object.hasOwn(shifts,e)||e==='revoltlandtransfer')&&t.owner!==s.turn)return [];
        if(hybridShifts[e]&&(t.level>3||!Object.hasOwn(hybridShifts[e],t.type)))return [];
        if(e==='quintessence'&&['3ds','revolt','begins'].includes(s.edition)&&t.level>=5)return [];
        if(s.edition==='3ds'&&['sink','upheaval','weathering','wildgrowth'].includes(e)&&t.level>3)return [];
        if(!fx.targetable(s,t,category,e==='removecurse'))return [];
        if(e==='temptation'&&!fx.territoryTargets(s,i,true).length)return [];
        if(secretSigils.has(e)&&(t.owner!==s.turn||fx.secretArt(cards[t.unit.id])||t.unit.enchant===e))return [];
        if((hasTerrain||e==='influence')&&(fx.terrainLocked(s,t)||fx.idol(s,'jadeidol')||combo.activeWorld(s)==='solidworld'))return [];
        if(['meteor','locust','comet','sagaterrair','elevation'].includes(e)&&fx.blockedLevel(s,t))return [];
        if(e==='comet'&&(!enemy(s,t.owner)||t.level<2)||e==='elevation'&&t.level!==1)return [];
        if(e==='frostneedle'&&![0,2].some(element=>combo.hasElement(cards[t.unit.id],element)))return [];
        if(e==='venomousboil'&&![1,3].some(element=>combo.hasElement(cards[t.unit.id],element)))return [];
        if(e==='chariot'&&(t.owner!==s.turn||!chariotExits(s,i).length))return [];
        if((e==='bistair'||e==='parasite')&&!enemy(s,t.owner)||e==='banishingray'&&cards[t.unit.id].element!==-1)return [];
        const creature=cards[t.unit.id];
        if((e==='shininggeyser'||e==='shininggeyserstrong')&&!enemy(s,t.owner))return [];
        if(e==='blazesplash'&&![0,1].some(element=>combo.hasElement(creature,element)))return [];
        if(e==='dreadblast'&&matchesLand(creature,t.type))return [];
        if(e==='stoneblast'&&![2,3].some(element=>combo.hasElement(cards[t.unit.id],element)))return [];
        if(e==='holybanishment'&&matchesLand(cards[t.unit.id],t.type))return [];
        if(e==='replace'&&(s.edition==='begins'&&(t.owner!==s.turn||s.players[s.turn].status==='silence')||!replacement(s,t).length))return [];
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
        const candidates=next.filter(i=>(s.edition==='begins'||s.tiles[i].area===area)&&condition(s.tiles[i]));
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
    function allianceRank(s){
      const own=total(s,s.turn);
      const ahead=s.players.flatMap((_,seat)=>total(s,seat)>own?[s.teams?.[seat]??seat]:[]);
      return 1+new Set(ahead).size;
    }
    const turnoverChange=st=>st<=30?20:st>=50?-20:0;
    function massDamage(s,e,t){
      const card=cards[t.unit.id];
      switch(e){
        case 'deathmiasma':return card.first||card.support?20:0;
        case 'sagaselection':return fx.territoryCost(s,fx.name(t.unit))!=null?20:0;
        case 'energyflash':return t.level===1?t.unit.hp:0;
        case 'armageddon':return fx.max(t.unit)>=40?30:0;
        case 'beginstempest':return fx.strength(t.unit)<=40?20:0;
        case 'acidrain':return fx.isDefensive(t.unit)?30:0;
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
    function apply(s,e,x,synthesis=false){
      const p=s.players[s.turn],q=s.players[x],t=s.tiles[x],u=t?.unit;
      if(type[e]==='land'){
        if(Object.hasOwn(terrain,e))t.type=terrain[e];
        else if(hybridShifts[e])t.type=hybridShifts[e][t.type];
        else if(landDamage[e])fx.spellHarm(s,t,landDamage[e]);
        else if(secretSigils.has(e)||e==='blasttrap'){combo.clear(u);u.enchant=e;u.caster=s.turn;}
        else switch(e){
          case 'remission':p.flags.push(board(s).gates[x]);break;
          case 'magicalleap':case 'shadowleap':return warp(s,x);
          case 'reflection':combo.clear(u);u.enchant=e;break;
          case 'restore':delete u.fatigued;if(!fx.immuneHP(t))u.hp=fx.max(u);break;
          case 'revoltlandtransfer':p.cash+=Math.floor(value(s,t)*(s.edition==='begins'?.8:.7));vacate(t,true);break;
          case 'banishingray':fx.spellDestroy(s,t);break;
          case 'bistair':fx.spellHarm(s,t,10*owning(s,s.turn).filter(v=>v.type===0).length);break;
          case 'sagabistair':if(affinity(s,0,2)>=5)fx.spellHarm(s,t,40);break;
          case 'sagaterrair':if(affinity(s,1,3)>=5)t.level=1;break;
          case 'comet':t.level=Math.max(1,t.level-2);break;
          case 'elevation':t.level=2;break;
          case 'frostneedle':case 'venomousboil':fx.spellHarm(s,t,30);break;
          case 'chariot':
            s.teleFrom=x;
            if(!['ps1','saturn'].includes(s.edition))returnToBook(s,s.turn,ids.get(e));
            return 'teleMove';
          case 'influence':t.type=influence(s,t);break;
          case 'locust':t.level=Math.max(1,t.level-1);break;
          case 'meteor':t.level=s.edition==='begins'&&chain(s,t)>1?Math.max(1,t.level-2):1;break;
          case 'beginspolymorph':case 'polymorph':{
            const id=sample(creaturePool.filter(id=>id!==u.id&&(s.edition!=='begins'||cards[id].catalog.rarity!=='E')));
            if(id!=null)morph(t,id);
            break;
          }
          case 'stoneblast':fx.spellHarm(s,t,30);break;
          case 'zap':fx.spellHarm(s,t,10);break;
          case 'debility':case 'debilitystrong':
            u.st=0;
            if(e==='debilitystrong')fx.shrinkHealth(s,t,20);
            draw(p,s);
            break;
          case 'holybanishment':
            if(s.edition==='revolt')fx.returnToHand(s,t);
            else{s.players[t.owner].hand.push(u.id);vacate(t);}
            break;
          case 'liquidform':combo.clear(u);u.enchant=e;u.caster=s.turn;draw(p,s);break;
          case 'turntothewall':{
            const forms=s.edition==='revolt'?['creepingflame','wallofice','wallofstone','tornado']:['pillarofflame','wallofice','wallofstone','hurricane'];
            morph(t,ids.get(forms[cards[u.id].element]||'statue'));
            if(s.edition==='revolt'&&u.fatigued)t.unit.fatigued=true;
            break;
          }
          case 'removecurse':
            if(u)combo.clear(u);
            delete t.enchant;
            if(['begins','3ds'].includes(s.edition))returnToBook(s,s.turn,ids.get(e));
            break;
          case 'temptation':{
            const first=fx.territoryTargets(s,x,true)[0];
            if(first?.[0]==='abilitySelf')fx.territoryEffect(s,x,x,true);
            else if(first){s.abilityFrom=x;s.borrowedAbility=true;return 'territoryTarget';}
            break;
          }
          case 'intrusion':s.intrusionAt=x;return 'intrusionCard';
          case 'trade':{
            if(s.tradeFrom==null){s.tradeFrom=x;return 'spellTarget';}
            const from=s.tradeFrom,own=s.tiles[from];
            [own.owner,t.owner]=[t.owner,own.owner];
            delete s.tradeFrom;
            note(s,'트레이드 · '+(from+1)+'번 ↔ '+(x+1)+'번 영지 소유권 교환');
            break;
          }
          case 'replace':s.replaceAt=x;return 'replaceCard';
          case 'magicfountain':combo.clear(u);u.enchant=e;break;
          default:combo.clear(u);u.enchant=e==='bindingmist'?'paralysis':e;u.caster=s.turn;
        }
      }else if(type[e]==='player'){
        switch(e){
          case 'corruption':q.cash-=(['dc','ps1'].includes(s.edition)?5:10)*symbolCount(q);break;
          case 'sagagift':q.cash+=100;draw(q,s);break;
          case 'landdrain':{const amount=owning(s,x).length*landDrainRate(s);p.cash+=amount;q.cash-=amount;break;}
          case 'judgment':{const victim=Math.random()<2/3?q:p;victim.cash-=Math.floor(Math.max(0,victim.cash)*.8);break;}
          case 'eclipse':q.cash+=10*mostSymbols(q,20);break;
          case 'unholygrasp':{
            const {index,count,magic}=unholyGraspQuote(s,q);
            q.symbols[index]-=count;p.cash+=magic;
            note(s,p.name+' · 호부 '+count+'개 소멸 · +'+magic+'G');
            break;
          }
          case 'dispelmagic':
            clearCepter(q);
            if(s.edition==='saga')p.book.unshift(ids.get(e));
            if(s.edition==='3ds')returnToBook(s,s.turn,ids.get(e));
            break;
          case 'revival':resetBook(s,x,true);break;
          case 'ruin':p.hand=p.hand.filter(id=>cards[id].kind!=='spell');q.hand=q.hand.filter(id=>cards[id].kind!=='spell');break;
          case 'rust':q.hand=q.hand.filter(id=>cards[id].kind!=='item');break;
          case 'capture':case 'theft':s.spellTarget=x;return 'stealCard';
          case 'mesmerize':s.spellTarget=x;return 'mesmerCard';
          case 'blacksmith':s.spellTarget=x;return 'forgeCard';
          case 'reform':s.spellTarget=x;return 'reformCard';
          case 'beginspoisonmind':s.spellTarget=x;return 'poisonBookCard';
          case 'holyword2':case 'holyword8':clearCepter(q);q.word=e==='holyword2'?2:8;break;
          case 'backward':clearCepter(q);q.reverse=true;break;
          case 'barrier':setStatus(s,q,e,s.edition==='ps1'?6:s.edition==='saturn'?3:duration.barrier);break;
          case 'chargingstep':setStatus(s,q,e);q.hasteRolls=2;break;
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
          case 'castlerecall':return warp(s,board(s).castles?.[0]??0);
          case 'teleport':return warp(s,nearest(s,p,t=>!territoryType(t.type)));
          case 'aports':
            for(const other of s.players)if(other!==p){other.pos=p.pos;other.dir=0;other.previous=null;}
            return warp(s,p.pos);
          case 'scarestorm':
            for(const v of land)if(fx.strength(v.unit)<=30){combo.clear(v.unit);v.unit.enchant='paralysis';}
            break;
          case 'disbelief':
            for(const q of s.players)q.cash-=symbolCount(q)*5;
            break;
          case 'discord':{
            const group=sample(discordGroups(land));
            if(group?.length&&group[0].unit.id!==ids.get('goblin')){
              for(const tile of group)morph(tile,ids.get('goblin'));
              note(s,'디스코드 · 크리처 '+group.length+'마리 고블린으로 변신');
            }
            break;
          }
          case 'footrace':
            for(const q of s.players){setStatus(s,q,e);q.diceLimitRolls=2;}
            break;
          case 'beginsculdra':{
            const average=sharedCash(s);
            for(const q of s.players){clearCepter(q);q.cash=average;q.word=6;}
            for(const v of land)if(!fx.immuneHP(v))v.unit.hp=fx.max(v.unit);
            break;
          }
          case 'immobilize':
            for(const v of land){combo.clear(v.unit);v.unit.enchant='immobilize';}
            break;
          case 'armageddon':case 'beginstempest':case 'sagaselection':
          case 'acidrain':case 'avalanche':case 'energyflash':case 'elementalrage':
          case 'burninghail':case 'freezecyclone':case 'globalinsectswarm':case 'fatigueddisaster':case 'elementalwrath':case 'deathmiasma':
            for(const v of land){
              const amount=massDamage(s,e,v);
              if(e==='energyflash'&&v.level===1)fx.spellDestroy(s,v);
              else if(amount&&e!=='energyflash'){
                const lower=e==='armageddon'&&v.level>1&&!fx.blockedLevel(s,v)&&fx.damageAmount(s,v,amount)>0;
                fx.spellHarm(s,v,amount);
                if(lower)v.level--;
              }
            }break;
          case 'darkcraft':{const n=Math.max(...s.players.map(symbolCount));for(const other of s.players)if(symbolCount(other)===n)mostSymbols(other,.3,true);break;}
          case 'erasure':s.players.forEach(clearCepter);for(const v of s.tiles){if(v.unit)combo.clear(v.unit);delete v.enchant;}break;
          case 'find':draw(p,s);p.hand.push(ids.get(e));break;
          case 'refuge':p.cash+=80;p.hand.push(ids.get(e));break;
          case 'foresight':
            if(!p.book.length)resetBook(s,s.turn);return 'foresightCard';
          case 'prophecy':if(!p.book.length)resetBook(s,s.turn);return 'prophecyKind';
          case 'beginsbistair':case 'beginsiksear':case 'beginsselenear':case 'beginsterrair':{
            for(let drawCount=0;drawCount<2;drawCount++){
              const slot=p.book.findLastIndex(id=>divineMatch(cards[id],e));
              if(slot<0)break;
              p.hand.push(...p.book.splice(slot,1));
              forgetPeek(s,s.turn);
            }
            break;
          }
          case 'sagaiksear':if(affinity(s,1,3)>=5)for(let n=0;n<6;n++)draw(p,s);break;
          case 'sagaselenear':if(affinity(s,0,2)>=5)p.cash+=500;break;
          case 'rouetsoleil':{
            const victim=sample(rouetTargets(s));
            if(victim){
              const amount=Math.floor(victim.cash/2);
              victim.cash-=amount;p.cash+=amount;
              note(s,p.name+' · '+victim.name+'에게서 '+amount+'G 탈취');
            }
            break;
          }
          case 'zeromn':return 'zeromnPower';
          case 'trespass':setStatus(s,p,e);break;
          case 'fame':p.cash+=100*Math.max(0,...owning(s,s.turn).map(t=>t.level));break;
          case 'desolation':for(const v of s.tiles)if(v.level===3&&!fx.blockedLevel(s,v))v.level--;break;
          case 'crusherstorm':for(const q of s.players)q.hand=q.hand.filter(id=>cards[id].kind!=='item');break;
          case 'erosion':{
            const counts=new Map();
            for(const q of s.players)for(const id of q.hand)counts.set(id,(counts.get(id)||0)+1);
            for(const q of s.players)q.hand=q.hand.filter(id=>counts.get(id)===1);
            break;
          }
          case 'gift':{
            const rank=personalRank(s);
            p.cash+=rank*50;for(let n=0;n<rank;n++)draw(p,s);
            break;
          }
          case 'charity':{const place=allianceRank(s);for(let n=0;n<place;n++)draw(p,s);break;}
          case 'turnover':
            for(const v of land){
              const st=fx.strength(v.unit),change=turnoverChange(st);
              if(change)v.unit.st=st+change;
            }
            break;
          case 'purify':p.cash+=purify(s)*50;break;
          case 'pacifism':for(const q of s.players)setStatus(s,q,e,2);break;
          case 'chaospanic':for(const q of s.players){clearCepter(q);q.reverse=true;}break;
          case 'revoltPlague':for(const v of land){combo.clear(v.unit);v.unit.poisoned=true;}break;
          case 'philosophy':{
            const count=p.hand.some(id=>cards[id].synthesis)?3:2;
            for(let i=0;i<count;i++)draw(p,s);
            break;
          }
          case 'colorfrombeyond':for(const v of land)v.unit.st=Math.max(0,fx.strength(v.unit)-30);break;
          case 'revoltphantasm':case 'penalize':
            for(const v of land){
              if(e==='penalize'&&!cards[v.unit.id].evo)continue;
              combo.clear(v.unit);v.unit.enchant=e==='penalize'?'paralysis':'phantasm';
            }
            break;
          case 'alarm':for(const v of owning(s,s.turn))if(v.unit)delete v.unit.fatigued;break;
          case 'speedpenalty':{
            const {amount,leaders}=speedPenalty(s),victim=sample(leaders);
            if(victim){victim.cash-=amount;p.cash+=amount;note(s,victim.name+' · '+amount+'G 탈취');}
            break;
          }
          case 'redivision':{const cash=sharedCash(s);for(const q of s.players)q.cash=cash;break;}
          case 'incineration':p.cash+=20*(s.destroyedCount||0);s.destroyedCount=0;break;
          case 'magicbooster':setStatus(s,p,e);break;
          case 'lifestream':for(const v of owning(s,s.turn))if(!fx.immuneHP(v))v.unit.hp=fx.max(v.unit);break;
          case 'lightcraft':s.players.forEach((other,j)=>{resetBook(s,j,true);other.hand=[];for(let n=0;n<5;n++)draw(other,s);});break;
          case 'massgrowth':{
            const cap=['saga','revolt','begins','3ds'].includes(s.edition)?100:80;
            for(const v of land){
              if(synthesis&&v.owner!==s.turn||fx.immuneHP(v))continue;
              const max=fx.max(v.unit),gain=Math.max(0,Math.min(5,cap-max));
              v.unit.mhp=max+gain;
              v.unit.hp=s.edition==='begins'?Math.min(v.unit.mhp,v.unit.hp+5):v.unit.hp+gain;
            }
            break;
          }
          case 'rayoflaw':for(const other of s.players)other.hand=other.hand.filter(id=>cards[id].cost<100);break;
          case 'reincarnation':{const n=p.hand.length+Number(['revolt','begins','3ds'].includes(s.edition));p.hand=[];for(let j=0;j<n;j++)draw(p,s);break;}
          case 'revelation':case 'telegnosis':
            setStatus(s,p,'enlightenment',e==='telegnosis'?1:2);
            if(e==='telegnosis')returnToBook(s,s.turn,ids.get(e));
            break;
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
        case 'foresightCard':return (p.book||[]).slice(s.shrineForesight?-3:s.edition==='dc'?-4:-6).reverse().map((id,j)=>['foresightCard',j,id]);
        case 'prophecyKind':{
          const kinds=['creature','item','spell'];
          return kinds.filter(k=>s.edition!=='begins'||p.book.some(id=>cards[id].kind===k)).map(k=>['prophecyKind',k]);
        }
        case 'replaceCard':return replacement(s,s.tiles[s.replaceAt]);
        case 'zeromnPower':return Object.keys(zeromn).map(name=>['zeromnPower',name]);
        case 'intrusionCard':return intrusionCards(s,s.intrusionAt);
        case 'stealCard':return s.players[s.spellTarget].hand.flatMap((id,j)=>cards[id].kind===stolenKind[s.spellEffect]?[['stealCard',j,id]]:[]);
        case 'forgeCard':return (s.players[s.spellTarget]?.hand||[]).map((id,j)=>['forgeCard',j,id]);
        case 'reformCard':return (s.players[s.spellTarget]?.hand||[]).flatMap((id,j)=>cards[id].kind!=='creature'?[['reformCard',j,id]]:[]);
        case 'poisonBookCard':return (s.players[s.spellTarget]?.book||[]).slice(-6).reverse().map((id,j)=>['poisonBookCard',j,id]);
        case 'mesmerCard':return s.players[s.spellTarget].hand.flatMap((id,j)=>cards[id].kind==='spell'&&combo.key(cards[id])!=='mesmerize'?[['mesmerCard',j,id]]:[]);
      }
    }
    function choose(s,k,x){
      const p=s.players[s.turn];
      switch(k){
        case 'zeromnPower':{
          switch(x){
            case 'panic':s.prices=s.prices.map(n=>Math.max(1,Math.floor(n/2)));break;
            case 'extermination':for(const tile of s.tiles)if(tile.unit)fx.spellHarm(s,tile,20);break;
            case 'removeCurse':for(const tile of owning(s,s.turn)){if(tile.unit)combo.clear(tile.unit);delete tile.enchant;}break;
            case 'fortune':p.cash+=personalRank(s)*200;break;
            case 'love':for(const tile of owning(s,s.turn))if(tile.unit&&!fx.immuneHP(tile))tile.unit.hp=fx.max(tile.unit);break;
            case 'strut':setStatus(s,p,'sagaStrut');break;
            case 'magicEra':setStatus(s,p,'sagaMagicEra');break;
          }
          break;
        }
        case 'stealCard':p.hand.push(...s.players[s.spellTarget].hand.splice(x,1));delete s.spellTarget;break;
        case 'forgeCard':{
          s.players[s.spellTarget].hand[x]=sample(forgePool);
          delete s.spellTarget;
          break;
        }
        case 'reformCard':{
          const from=s.players[s.spellTarget].hand[x],to=ids.get('manna');
          if(from!==to)for(const [seat,q] of s.players.entries()){
            q.hand=q.hand.map(id=>id===from?to:id);
            if(q.book.includes(from)){q.book=q.book.map(id=>id===from?to:id);forgetPeek(s,seat);}
          }
          delete s.spellTarget;
          break;
        }
        case 'poisonBookCard':
          s.players[s.spellTarget].book.splice(-1-x,1);forgetPeek(s,s.spellTarget);delete s.spellTarget;
          break;
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
          if(x==='suffocate')for(const t of s.tiles)if(t.unit)fx.spellHarm(s,t,10);
          break;
      }
      return 'roll';
    }
    function scoreTarget(s,e,x){
      if(e==='trade')return s.tradeFrom!=null?tradeScore(s,s.tradeFrom,x):
        Math.max(-40,...tradeTargets(s,x).map(([,to])=>tradeScore(s,x,to)));
      const p=s.players[s.turn],t=s.tiles[x],q=s.players[x];
      if(e==='remission')return 10;
      if(e==='magicalleap'||e==='shadowleap'){
        const gate=board(s).gates?.[x];
        if(gate!=null)return (p.flags.includes(gate)?2:9)+s.tiles.filter(v=>v.owner===s.turn&&v.unit?.fatigued).length;
        if(t.owner<0)return territoryType(t.type)?2:1;
        return enemy(s,t.owner)?-(4+t.level*3):3;
      }
      if(type[e]==='player'){
        const sign=enemy(s,x)?-1:1;
        if(q.antiMagic&&e!=='dispelmagic')return -1;
        const count=k=>q.hand.filter(id=>cards[id]?.kind===k).length;
        switch(e){
          case 'rust':return -sign*count('item')*9;
          case 'ruin':return -sign*count('spell')*7-p.hand.filter(id=>cards[id].kind==='spell'&&combo.key(cards[id])!==e).length*5;
          case 'mesmerize':return -sign*Math.max(0,...q.hand.filter(id=>cards[id].kind==='spell').map(id=>cards[id].cost/9));
          case 'corruption':return -sign*symbolCount(q)/2;
          case 'unholygrasp':return enemy(s,x)?unholyGraspQuote(s,q).magic/6:0;
          case 'blacksmith':return x===s.turn&&p.hand.length>1&&!p.hand.some(id=>cards[id].kind==='item')?14:enemy(s,x)?3:-8;
          case 'reform':return Math.min(12,q.hand.length*3);
          case 'beginspoisonmind':return Math.min(8,(q.book?.length??q.bookCount)/3);
          case 'capture':case 'theft':return Math.max(0,...q.hand.filter(id=>cards[id].kind===stolenKind[e]).map(id=>cards[id].cost/5));
          case 'bravesong':case 'toughsong':return sign*(q.status===e?0:Math.min(24,6+3*owning(s,x).length));
          case 'sagafloat':return q.status===e?-10:sign*(2+q.flags.length*3);
          case 'innocence':return q.status===e?-12:sign*Math.max(0,...s.tiles.filter(t=>t.owner>=0&&!combo.allied(s,t.owner,x)).map(t=>value(s,t)/20-7));
          case 'sagadrought':return q.status===e?-12:-sign*Math.min(42,owning(s,x).filter(t=>t.level<5).length*9);
          case 'hunterssong':return sign*(q.status===e?0:4+q.hand.filter(id=>cards[id].kind==='creature'&&cards[id].st>=30).length*9);
          case 'sagagift':return sign*(10+(q.hand.length<5?8:0));
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
          case 'chargingstep':return !enemy(s,x)&&!q.antiMagic&&q.status!==e&&q.word==null?Math.max(0,16-q.cash/60)-(x===s.turn?0:3):-12;
          default:return -sign*(q.status===e?0:5);
        }
      }
      const sign=enemy(s,t.owner)?-1:1,weight=t.level+1;
      if(e==='debility'||e==='debilitystrong'){
        const reduction=e==='debilitystrong'&&!fx.immuneHP(t)?20:0;
        return -sign*(fx.strength(t.unit)/4+(reduction>=fx.max(t.unit)?weight*8:reduction/3));
      }
      if(secretSigils.has(e))return (cards[t.unit.id].vigorous?14:7)-(t.unit.enchant==='landprotection'?14:0);
      if(e==='blasttrap')return t.unit.enchant===e?-20:enemy(s,t.owner)?10+(t.unit.hp<=20?8:0):2;
      if(Object.hasOwn(terrain,e)||hybridShifts[e]){
        const dest=hybridShifts[e]?.[t.type]??terrain[e];
        if(s.edition!=='revolt')return sign*((combo.hasElement(cards[t.unit.id],dest)?2:0)-(combo.hasElement(cards[t.unit.id],t.type)?2:0))*weight;
        if(t.type===dest)return -10;
        const before=matchesLand(cards[t.unit.id],t.type),after=matchesLand(cards[t.unit.id],dest);
        const own=owning(s,t.owner);
        const change=own.filter(v=>v!==t&&v.type===dest&&typeof dest==='number').length-own.filter(v=>v!==t&&v.type===t.type).length;
        return sign*(2*(Number(after)-Number(before))*weight+2*change);
      }
      if(landDamage[e]){
        const damage=fx.damageAmount(s,t,landDamage[e]);
        return -sign*(damage/4+(damage===t.unit.hp?weight*5:0));
      }
      switch(e){
        case 'zap':return -sign*(fx.damageAmount(s,t,10)+(t.unit.hp<=10?weight*4:0));
        case 'stoneblast':case 'frostneedle':case 'venomousboil':return -sign*fx.damageAmount(s,t,30)/4;
        case 'reflection':return sign*(t.unit.enchant===e?0:14+weight*3);
        case 'sagabistair':return affinity(s,0,2)>=5?-sign*fx.damageAmount(s,t,40)/3:-30;
        case 'sagaterrair':return affinity(s,1,3)>=5?-sign*(t.level-1)*12:-30;
        case 'comet':return -sign*Math.min(2,t.level-1)*10;
        case 'elevation':return sign*10;
        case 'holybanishment':return -sign*(5+weight+t.unit.hp/8);
        case 'liquidform':return sign*(40-t.unit.hp)/7;
        case 'restore':return sign*((fx.immuneHP(t)?0:(fx.max(t.unit)-t.unit.hp)/3)+(t.unit.fatigued?4+weight:0));
        case 'revoltlandtransfer':return p.cash<160?Math.min(value(s,t),300)/10-2*weight:-20;
        case 'meteor':case 'locust':return -sign*(t.level-1)*(e==='meteor'?10:5);
        case 'bistair':return -sign*(fx.immuneHP(t)?0:Math.min(30,owning(s,s.turn).filter(v=>v.type===0).length*3)+(t.unit.hp<=10*owning(s,s.turn).filter(v=>v.type===0).length?weight*4:0));
        case 'banishingray':return -sign*(5+weight*4);
        case 'thornfetter':case 'parasite':case 'bindingmist':return -sign*weight*3;
        case 'wing':case 'phantasm':case 'simulacrum':return sign*(t.unit.enchant===e?0:weight*3);
        case 'beginspolymorph':case 'polymorph':case 'turntothewall':return -sign*(cards[t.unit.id].cost/12+weight-4);
        case 'removecurse':return (['paralysis','thornfetter','parasite','senility','antielement','disease'].includes(t.unit.enchant)||t.unit.poisoned?sign:-sign)*(combo.enchanted(t.unit)?9:0);
        case 'replace':return Math.max(0,...replacement(s,t).map(a=>sign*(cards[a[2]].hp+cards[a[2]].st-t.unit.hp-fx.strength(t.unit))/5));
        case 'chariot':return chariotExits(s,x).some(i=>s.tiles[i].owner<0&&combo.matchesTerrain(cards[t.unit.id],s.tiles[i].type))?4:1;
        case 'magicfountain':return p.pos===x?0:1;
        case 'influence':return sign*(owning(s,t.owner).filter(v=>v.type===t.type).length<=1?5:-2);
        default:return sign*(t.unit.enchant===e?0:weight);
      }
    }
    function scoreZeromn(s,e){
      const p=s.players[s.turn],own=owning(s,s.turn);
      switch(e){
        case 'panic':return s.players.reduce((sum,q,i)=>sum+(enemy(s,i)?1:-1)*q.symbols.reduce((value,n,j)=>value+n*Math.floor(s.prices[j]/2),0),0)/12;
        case 'extermination':return s.tiles.reduce((sum,t)=>sum+(t.unit?(enemy(s,t.owner)?1:-1)*fx.damageAmount(s,t,20)*(t.unit.hp<=20?t.level+2:1):0),0);
        case 'removeCurse':return own.reduce((sum,t)=>sum+(t.unit&&(t.unit.poisoned||['paralysis','senility','disease','fog'].includes(t.unit.enchant))?10*t.level:0),0);
        case 'fortune':return personalRank(s)*25;
        case 'love':return own.reduce((sum,t)=>sum+(t.unit&&!fx.immuneHP(t)?(fx.max(t.unit)-t.unit.hp)*.6:0),0);
        case 'strut':return p.status==='sagaStrut'?0:Math.max(0,...s.tiles.filter(t=>t.owner>=0&&enemy(s,t.owner)).map(t=>value(s,t)/35));
        case 'magicEra':return p.status==='sagaMagicEra'?0:p.hand.reduce((sum,id)=>sum+cards[id].cost,0)/15;
      }
    }
    function scoreCast(s,e){
      if(type[e]!=='global')return Math.max(-40,...targets(s,e).map(([,x])=>scoreTarget(s,e,x)));
      const p=s.players[s.turn],mine=owning(s,s.turn),land=s.tiles.filter(t=>t.unit);
      if(damageSpells.has(e))return land.reduce((sum,v)=>{
        const amount=massDamage(s,e,v);
        return sum+(!amount||e!=='energyflash'&&fx.immuneHP(v)?0:(enemy(s,v.owner)?1:-1)*(amount/8+(amount>=v.unit.hp?4*v.level:0)));
      },0);
      if(e==='redivision'){
        const average=sharedCash(s);
        return s.players.reduce((sum,q,i)=>sum+(enemy(s,i)?-1:1)*(average-q.cash),0)/15;
      }
      if(e==='speedpenalty')return speedPenalty(s).amount/10;
      if(e==='revoltPlague')return land.reduce((sum,t)=>sum+(t.unit.poisoned?0:enemy(s,t.owner)?5:-6),0);
      if(e==='chaospanic')return s.players.reduce((score,q,i)=>score+((enemy(s,i)?1:-1)*(q.word!=null?5:0)),0);
      if(e==='philosophy')return Math.min(3,10-p.hand.length)*5;
      if(e==='alarm')return mine.reduce((sum,t)=>sum+(t.unit?.fatigued?5+t.level:0),0);
      if(e==='refuge'){
        if(p.cash<120)return 22;
        if(p.hand.length<4)return -8;
        return p.cash<260?10:0;
      }
      if(e==='incineration')return (s.destroyedCount||0)*2;
      if(e==='magicbooster')return p.cash>=200?Math.min(15,mine.filter(t=>t.level<5&&!fx.blockedLevel(s,t)).length*3):0;
      if(e==='castlerecall')return p.pos!==0&&p.flags.length===(board(s).checkpoints||board(s).forts).length?25:-20;
      if(e==='selenear')return mine.filter(t=>t.type===2).length*10;
      if(e==='lifestream')return mine.reduce((v,t)=>v+(fx.immuneHP(t)?0:(fx.max(t.unit)-t.unit.hp)/3),0);
      if(e==='zeromn')return Math.max(...Object.keys(zeromn).map(name=>scoreZeromn(s,name)));
      if(e==='rouetsoleil'){
        const candidates=rouetTargets(s);
        return candidates.length?candidates.reduce((sum,q)=>sum+Math.floor(q.cash/2),0)/candidates.length/8:-20;
      }
      if(e==='trespass'){
        if(p.status==='trespass')return -10;
        const m=board(s),needed=(m.checkpoints||m.forts).length;
        return s.players.reduce((score,q,i)=>score+(i!==s.turn&&q.flags.length===needed?14:0),0);
      }
      if(e==='triumph')return p.status==='triumph'||s.edition==='begins'&&p.status?0:4+p.flags.length*4;
      if(e==='colorfrombeyond')return land.reduce((score,t)=>score+(enemy(s,t.owner)?1:-1)*Math.min(30,fx.strength(t.unit))/5,0);
      if(e==='rayoflaw')return s.players.reduce((v,q,i)=>v+(enemy(s,i)?1:-1)*q.hand.filter(id=>cards[id].cost>=100).length*6,0);
      if(e==='massgrowth'){
        const cap=['saga','revolt','begins','3ds'].includes(s.edition)?100:80;
        const growing=land.filter(v=>fx.max(v.unit)<cap&&!fx.immuneHP(v));
        const broad=growing.reduce((score,v)=>score+(enemy(s,v.owner)?-2:2),0);
        return s.edition==='revolt'&&p.hand.some(id=>cards[id].kind==='item')?Math.max(broad,growing.filter(v=>v.owner===s.turn).length*2):broad;
      }
      if(e==='darkcraft'){const highest=Math.max(...s.players.map(symbolCount));return s.players.reduce((v,q,i)=>v+(symbolCount(q)===highest?(enemy(s,i)?1:-1)*Math.max(...q.symbols)*.5:0),0);}
      if(e==='lightcraft')return 7*(5-p.hand.length);
      if(e==='spartoi')return s.tiles.some(t=>territoryType(t.type)&&!t.unit)?12:0;
      if(e==='soltis')return 19;
      if(e==='soulsteal'||e==='mistletoe')return p.status===e?0:7;
      if(e==='foresight'||e==='prophecy'||e==='find')return 6;
      if(divineDraw[e])return Math.min(2,p.book.filter(id=>divineMatch(cards[id],e)).length)*7-Math.max(0,p.hand.length-6)*5;
      if(e==='scarestorm')return land.reduce((utility,t)=>utility+(fx.strength(t.unit)<=30&&t.unit.enchant!=='paralysis'?(enemy(s,t.owner)?1:-1)*(8+t.level*4):0),0);
      if(e==='discord'){
        const groups=discordGroups(land);
        const score=groups.reduce((total,group)=>total+group.reduce((impact,t)=>{
          const card=cards[t.unit.id];
          return impact+(card===cards[ids.get('goblin')]?0:(enemy(s,t.owner)?1:-1)*((fx.strength(t.unit)+t.unit.hp-50)/6+t.level*2));
        },0),0);
        return groups.length?score/groups.length:-20;
      }
      if(e==='footrace'){
        const average=(board(s).die+1)/2;
        return s.players.reduce((utility,q,seat)=>utility+(enemy(s,seat)?-1:1)*(2*personalRank(s,seat)-(q.word??average))*4,0);
      }
      if(e==='disbelief')return s.players.reduce((utility,q,seat)=>utility+(enemy(s,seat)?1:-1)*symbolCount(q)/2,0)-12;
      if(e==='gift')return s.edition==='begins'?Math.max(-5,personalRank(s)*8-p.cash/100-p.hand.length):10;
      if(e==='charity')return 4*Math.min(allianceRank(s),Math.max(0,7-p.hand.length));
      if(e==='turnover')return land.reduce((score,t)=>score+(enemy(s,t.owner)?-1:1)*turnoverChange(fx.strength(t.unit))/5,0);
      if(e==='purify')return s.tiles.some(t=>t.unit&&combo.enchanted(t.unit))||s.players.some(q=>q.status)?5:-10;
      if(e==='pacifism')return s.tiles.filter(t=>t.owner===s.turn&&t.level>2).length*2-3;
      if(e==='revoltphantasm')return s.tiles.filter(t=>t.owner===s.turn&&t.unit?.hp).length-3;
      if(e==='penalize')return land.reduce((score,t)=>score+(cards[t.unit.id].evo&&t.unit.enchant!=='paralysis'?(enemy(s,t.owner)?1:-1)*(3+2*t.level):0),0);
      if(e==='sagaiksear')return affinity(s,1,3)>=5?25-(p.hand.length-1)*3:-30;
      if(e==='sagaselenear')return affinity(s,0,2)>=5?30:-30;
      if(e==='fame')return Math.max(0,...mine.map(t=>t.level))*5;
      if(e==='desolation')return s.tiles.reduce((score,t)=>score+(t.owner>=0&&t.level===3&&!fx.blockedLevel(s,t)?(enemy(s,t.owner)?12:-12):0),0);
      if(e==='crusherstorm')return s.players.reduce((score,q,seat)=>score+(enemy(s,seat)?1:-1)*q.hand.filter(id=>cards[id].kind==='item').length*6,0);
      if(e==='reincarnation'&&s.edition!=='ps2')return p.hand.length<=2?10:p.hand.every(id=>cards[id].kind!=='creature')?7:1;
      if(e==='revelation'||e==='telegnosis')return mine.length&&p.status!=='enlightenment'?5:0;
      return 2;
    }
    function scoreChoice(s,k,x,id){
      if(k==='zeromnPower')return scoreZeromn(s,x);
      if(k==='soltisPower')return x==='affection'?18:x==='hope'?6-s.players[s.turn].hand.length:0;
      if(k==='soltisArea')return owning(s,s.turn).filter(t=>t.area===x).reduce((v,t)=>v+fx.max(t.unit)-t.unit.hp,0);
      if(k==='prophecyKind')return -s.players[s.turn].hand.filter(id=>cards[id].kind===x).length;
      const card=cards[id];
      if(k==='forgeCard')return (enemy(s,s.spellTarget)?1:-1)*(card.cost+Number(card.kind==='creature')*30)/8;
      if(k==='reformCard')return card.cost/9-(s.players[s.turn].template||[]).filter(n=>n===id).length*5-Number(combo.key(card)==='manna')*100;
      if(k==='poisonBookCard')return card.cost/10+Number(card.kind==='creature')*2-x/3;
      if(k==='replaceCard')return (enemy(s,s.tiles[s.replaceAt].owner)?-1:1)*(card.hp+card.st);
      if(k==='mesmerCard'&&type[card.effect])return scoreCast(s,card.effect);
      return card.cost/20+(card.kind==='creature'&&s.players[s.turn].hand.every(n=>cards[n].kind!=='creature')?4:0);
    }
    return {apply,targets,choices,choose,intrusionCards,chariotExits,personalRank,scoreTarget,scoreCast,scoreChoice,nearest,warp};
  }
  return {rules,type:ps2Type,modernType:type,descriptions,actions,hints,soltis,zeromn,clearCepter,setStatus,startTurn,damageSpells,landDamage};
})();
if(typeof module!=='undefined')module.exports=CepterExtraSpells;
