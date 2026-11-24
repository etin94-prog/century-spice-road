/* A single-area introductory match. All state is serializable between decisions. */
const Cepter = (() => {
  const maps=typeof module==='undefined'?CepterMaps:require('./cept-maps.js');
  const original=typeof module==='undefined'?CepterCards:require('./cept-cards.js');
  const board=s=>maps[(s.mapId?.startsWith('ps2-')&&!s.layoutRevision?'legacy-':'')+(s.mapId||'classic')];
  const elements=['화','수','지','풍'];
  const creature=(name,element,st,hp,cost)=>({name,kind:'creature',element,st,hp,cost});
  const item=(name,st,hp,cost)=>({name,kind:'item',st,hp,cost});
  const spell=(name,effect,cost)=>({name,kind:'spell',effect,cost});
  const cards=[
    creature('잿빛 사냥개',0,40,30,50),creature('화로 파수꾼',0,30,50,60),
    creature('안개 수달',1,30,40,40),creature('조수의 거인',1,40,50,70),
    creature('뿌리 병사',2,20,50,40),creature('산등성이 곰',2,50,40,70),
    creature('바람 송골매',3,40,30,40),creature('구름 사자',3,50,30,60),
    item('호박석 검',30,0,30),item('조개 방패',0,30,30),
    spell('고정 보폭','one',10),spell('바람 걸음','six',20),spell('마력의 샘','cash',20)
  ];
  const starter=cards.flatMap((_,id)=>Array(id>=11?3:4).fill(id));
  const offset=cards.length;
  cards.push(...original.map(c=>({...c})));
  const fireBook=original.flatMap((c,i)=>Array(c.copies).fill(i+offset));
  const catalog=typeof module==='undefined'?CepterCatalog:require('./cept-catalog-data.js');
  for(const entry of catalog){
    if(entry.gameId!=null){
      Object.assign(cards[entry.gameId],{catalog:entry});
    }else{
      cards.push({...entry,catalog:entry});
    }
  }
  const stageAbilities={
    'water/wallofice':{landBan:0,ban:['armor','scroll'],stationary:true,battleHP:30},
    'neutral/skeleton':{regenerate:true},'water/giantamoeba':{neutralizes:[0,2]},
    'water/kingtortoise':{last:true},'air/hornet':{poison:true},
    'air/hurricane':{landBan:2,ban:['armor','scroll'],first:true,stationary:true},
    'spells/plague':{effect:'plague'},'air/sprite':{landBan:2,blocksLarge:true},'items/firebolt':{st:30,hp:0,critical:1}
  };
  for(const c of cards){
    const rule=stageAbilities[c.catalog?.path];
    if(rule)Object.assign(c,rule,{catalogOnly:false});
  }
  const presets={intro:starter,fire:fireBook};
  function validBook(book){
    return Array.isArray(book)&&book.length===50&&book.every(id=>Number.isInteger(id)&&!!cards[id]&&!cards[id].catalogOnly&&book.filter(n=>n===id).length<=4);
  }
  function shuffledBook(template=starter){
    const book=template.slice();
    for(let i=book.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[book[i],book[j]]=[book[j],book[i]];}
    return book;
  }
  function draw(p){if(!p.book.length)p.book=shuffledBook(p.template);p.hand.push(p.book.pop());}
  function start(count,humans,target=4000,mapId='classic',template=starter,aiBook=template){
    if(![2,3,4].includes(count)||!Number.isInteger(humans)||humans<0||humans>count||![3000,4000,5000,6000].includes(target)||!Object.hasOwn(maps,mapId)||!validBook(template)||!validBook(aiBook))throw Error('대국 설정 오류');
    const players=Array.from({length:count},(_,i)=>{
      const seatBook=i>=humans?aiBook:template;
      const p={ai:i>=humans,name:(i>=humans?'AI ':'셉터 ')+(i+1),cash:200,pos:0,dir:0,lap:0,flags:[],hand:[],book:shuffledBook(seatBook),template:seatBook.slice(),symbols:Array((maps[mapId].areaCount||2)*4).fill(0),previous:null};
      for(let j=0;j<4;j++)draw(p);return p;
    });
    const s={version:1,layoutRevision:1,mapId,prices:Array((maps[mapId].areaCount||2)*4).fill(10),players,target,turn:0,round:1,phase:'spell',tiles:maps[mapId].types.map((type,i)=>({type,area:maps[mapId].areas[i],base:maps[mapId].base,owner:-1,level:1,unit:null})),log:[],die:0,visited:[],winner:-1};
    draw(players[0]);return s;
  }
  function note(s,t){s.log.unshift(t);if(s.log.length>16)s.log.pop();}
  const actor=s=>s.phase==='defend'?s.tiles[s.battle.at].owner:s.turn;
  const worth=t=>(t.base||80)*2**(t.level-1);
  const territoryType=type=>typeof type==='number'||type==='복합'||type==='무속성';
  const landBonus=(unit,t)=>unit.element===t.type||t.type==='복합'&&unit.element>=0?10*t.level:0;
  const chain=(s,t)=>typeof t.type!=='number'?1:Math.min(5,s.tiles.filter(v=>v.owner===t.owner&&v.type===t.type&&v.area===t.area).length);
  const value=(s,t)=>Math.floor(worth(t)*[0,1,1.5,1.8,2,2.2][chain(s,t)]);
  const toll=(s,t)=>Math.floor(value(s,t)*[0,.2,.3,.4,.6,.8][t.level]);
  const total=(s,i)=>s.tiles.reduce((v,t)=>v+(t.owner===i?value(s,t):0),s.players[i].cash)+(s.players[i].symbols||[]).reduce((v,n,k)=>v+n*s.prices[k],0);
  function vacate(t,release=false){t.owner=-1;if(release)t.level=1;t.unit=null;}
  function landValues(s){
    const result=Array(s.prices.length).fill(0);
    for(const t of s.tiles)if(typeof t.type==='number')result[(t.area||0)*4+t.type]+=t.owner<0?worth(t):value(s,t);
    return result;
  }
  function updatePrices(s,before){
    if(!before)return;
    landValues(s).forEach((v,k)=>{s.prices[k]=Math.max(1,s.prices[k]+Math.trunc((v-before[k])/100));});
  }
  function finish(s){

    s.turn=(s.turn+1)%s.players.length;
    if(s.turn===0)s.round++;
    draw(s.players[s.turn]);s.phase=s.players[s.turn].hand.length>6?'discard':'spell';s.fixed=0;s.die=0;s.visited=[];
  }
  function paid(s,p,j){
    const id=p.hand.splice(j,1)[0];p.cash-=cards[id].cost;return id;
  }
  function onward(s){
    const p=s.players[s.turn],links=board(s).links[p.pos];return links.length===1?links:links.filter(n=>n!==p.previous);
  }
  function arrived(s){
    const p=s.players[s.turn],tile=s.tiles[p.pos];s.phase='land';
    if(tile.type==='점술관'&&p.book.length){s.phase='fortune';return;}
    if(tile.type!=='성소')return;
    const area=s.tiles.filter(t=>t.area===tile.area&&t.unit);
    const event=Math.floor(Math.random()*3),element=Math.floor(Math.random()*4);
    for(const t of area){
      const hp=cards[t.unit.id].hp;
      if(event===0)t.unit.hp-=Math.floor(hp/2);
      else if(t.type===element)t.unit.hp=event===1?hp:t.unit.hp-Math.floor(hp/5);
      if(t.unit.hp<=0)vacate(t);
    }
    note(s,'성소 · '+(event===0?'지역 전체 크리처 최대 HP의 50% 피해':elements[element]+' 영지 크리처 '+(event===1?'HP 회복':'최대 HP의 20% 피해')));
  }
  function advance(s,next){
    const p=s.players[s.turn],m=board(s);
    const path=[p.pos];
    s.lastMove={sequence:(s.lastMove?.sequence||0)+1,seat:s.turn,path};
    while(s.remaining){
      path.push(next);
      p.previous=p.pos;p.pos=next;s.remaining--;
      const t=s.tiles[next];if(t.owner===s.turn)s.visited.push(next);
      const checkpoint=(m.checkpoints||m.forts).find(n=>m.types[n]===t.type);
      if(checkpoint!==undefined&&!p.flags.includes(checkpoint)){
        p.flags.push(checkpoint);const money=m.fortBonus||50;p.cash+=money;note(s,p.name+' · '+t.type+' +'+money+'G');
      }
      if(t.type==='성'&&p.flags.length===(m.checkpoints||m.forts).length){
        p.lap++;p.flags=[];p.cash+=m.bonus+20*(p.lap-1)+20*s.tiles.filter(v=>v.owner===s.turn).length;
        const bonus=(p.symbols||[]).reduce((sum,n,k)=>sum+(n&&s.players.every(q=>q===p||q.symbols[k]<n)?n*s.prices[k]:0),0);
        p.cash+=Math.floor(bonus/10);
        s.tiles.filter(v=>v.owner===s.turn).forEach(v=>{const max=cards[v.unit.id].hp;v.unit.hp=Math.min(max,v.unit.hp+Math.floor(max/5));});
        note(s,p.name+' · '+p.lap+'주 완주');
      }
      if(t.type==='성'&&total(s,s.turn)>=s.target){s.winner=s.turn;s.phase='over';
        if(m.reward){
          s.reward=m.reward.counts.flatMap((count,k)=>{
            const pool=cards.flatMap((card,id)=>card.catalog?.rarity===['N','S','R'][k]&&m.reward.categories.includes(card.catalog.category)?[id]:[]);
            return Array.from({length:count},()=>pool[Math.floor(Math.random()*pool.length)]);
          });
        }
        return;}
      const dest=m.transit?.[next];
      if(dest!=null&&(t.type==='다리'||t.type==='전송진'&&!s.remaining)){
        p.pos=dest;p.previous=next;path.push(dest);
        note(s,t.type+' · '+(next+1)+'번 → '+(dest+1)+'번');
      }
      if(t.type==='신전'){s.phase='temple';return;}
      if(s.remaining){const exits=onward(s);if(exits.length!==1){s.phase='fork';return;}next=exits[0];}
    }
    arrived(s);
  }
  function resumeMove(s){
    if(!s.remaining){arrived(s);return;}
    const exits=onward(s);if(exits.length===1)advance(s,exits[0]);else s.phase='fork';
  }
  function move(s,dir){
    const p=s.players[s.turn];p.dir=dir;s.remaining=s.die;s.visited=[];
    if(p.previous==null&&board(s).stage&&board(s).links[p.pos].length>2)s.phase='fork';
    else if(p.previous==null)advance(s,dir===1?board(s).links[p.pos][0]:board(s).links[p.pos].at(-1));
    else resumeMove(s);
  }
  function debt(s){
    const p=s.players[s.turn];
    if(p.cash>=0){finish(s);return;}
    if((p.symbols||[]).some(Boolean)||s.tiles.some(t=>t.owner===s.turn)){s.phase='sell';return;}
    p.cash=200;p.pos=0;p.flags=[];p.dir=0;p.previous=null;note(s,p.name+' · 마력 고갈, 성에서 재출발');finish(s);
  }
  function payToll(s){
    const p=s.players[s.turn],t=s.tiles[p.pos],n=toll(s,t);
    p.cash-=n;s.players[t.owner].cash+=n;note(s,p.name+' · 통행료 '+n+'G');debt(s);
  }
  function afterTerritory(s){const t=s.tiles[s.players[s.turn].pos];if(t.owner>=0&&t.owner!==s.turn)payToll(s);else finish(s);}
  function territory(s){
    const p=s.players[s.turn];
    if(s.tiles[p.pos].type==='성'||board(s).forts.includes(p.pos))return s.tiles.flatMap((v,n)=>v.owner===s.turn?[n]:[]);
    return [...new Set(s.visited)].filter(n=>s.tiles[n].owner===s.turn);
  }
  function choices(s){
    if(s.phase==='over')return [];
    const i=actor(s),p=s.players[i],t=s.tiles[p.pos],options=[];
    const hand=(kind,k)=>p.hand.forEach((id,j)=>{if(cards[id].kind===kind&&cards[id].cost<=p.cash&&(!(kind==='creature')||(cards[id].landBan!==t.type&&(k!=='invade'||!cards[id].stationary))))options.push([k,j]);});
    switch(s.phase){
      case 'spell':hand('spell','cast');options.push(['roll']);break;
      case 'spellTarget':{
        const effect=s.spellEffect;
        if(effect==='plague')return [...new Set(s.tiles.map(t=>t.area))].map(area=>['plagueArea',area]);
        if(effect==='heal'||effect==='bolt')s.tiles.forEach((v,n)=>{if(v.unit)options.push(['targetLand',n]);});
        else s.players.forEach((q,j)=>{if(effect!=='shatter'||q.hand.some(id=>cards[id].kind!=='creature'))options.push(['targetPlayer',j]);});
        if(!options.length)options.push(['fizzle']);break;
      }
      case 'shatter':return s.players[s.spellTarget].hand.flatMap((id,j)=>cards[id].kind==='creature'?[]:[['breakCard',j]]);
      case 'roll':options.push(['roll']);break;
      case 'direction':return [['direction',1],['direction',-1]];
      case 'fork':return onward(s).map(n=>['route',n]);
      case 'fortune':return [...new Set(p.book.map(id=>cards[id].kind))].map(kind=>['fortuneDraw',kind]);
      case 'temple':
        s.prices.forEach((price,k)=>{
          for(let n=1;n<=Math.min(50,Math.floor(p.cash/price));n++)options.push(['buySymbol',k,n]);
          for(let n=1;n<=Math.min(50,p.symbols[k]);n++)options.push(['sellSymbol',k,n]);
        });options.push(['leaveTemple']);break;
      case 'land':
        if(t.owner>=0&&t.owner!==i){hand('creature','invade');options.push(['pay']);}
        {
          if(t.owner<0&&territoryType(t.type))hand('creature','summon');
          for(const n of territory(s)){
            const v=s.tiles[n];for(let level=v.level+1;level<=5;level++){
              if(p.cash>=(v.base||80)*2**(level-1)-worth(v))options.push(['level',n,level]);
            }
            for(const dest of board(s).links[n]){
              if(!cards[v.unit.id].stationary&&cards[v.unit.id].landBan!==s.tiles[dest].type&&territoryType(s.tiles[dest].type)&&s.tiles[dest].owner!==i)options.push(['transfer',n,dest]);
            }
            if(p.cash>=300)elements.forEach((_,e)=>{if(e!==v.type)options.push(['element',n,e]);});
            p.hand.forEach((id,j)=>{if(cards[id].kind==='creature'&&cards[id].cost<=p.cash&&cards[id].landBan!==v.type)options.push(['exchange',n,j]);});
          }
          if(t.owner<0||t.owner===i)options.push(['pass']);
        }break;
      case 'attack':case 'defend':{
        const unit=cards[s.phase==='attack'?s.battle.inv:s.tiles[s.battle.at].unit.id];
        p.hand.forEach((id,j)=>{const gear=cards[id],category=gear.category||(gear.st?'weapon':'armor');
          if(gear.cost<=p.cash&&(gear.kind==='item'&&!unit.ban?.includes(category)||unit.support&&gear.kind==='creature'))options.push(['equip',j]);
        });options.push(['bare']);break;
      }
      case 'result':return [['continue']];
      case 'discard':return p.hand.map((_,j)=>['discard',j]);
      case 'sell':return [...s.tiles.flatMap((v,n)=>v.owner===i?[['sell',n]]:[]),...(p.symbols||[]).flatMap((n,k)=>n?[['liquidate',k,Math.min(n,Math.ceil(-p.cash/s.prices[k]))]]:[])];
    }
    return options;
  }
  function resolve(s){
    const b=s.battle,t=s.tiles[b.at],inv=cards[b.inv],guard=cards[t.unit.id];
    const atk=cards[b.atkItem],def=cards[b.defItem];
    const bonus=landBonus(guard,t);
    const near=board(s).links[b.at].filter(n=>n!==b.from);
    const support=i=>10*near.filter(n=>s.tiles[n].owner===i).length;
    const make=(unit,gear,hp,side,land,confused)=>({unit,gear,hp:hp+(gear?.hp||0)+(unit.battleHP||0)+land,land,confused,
      st:['reflect','nullify'].includes(gear?.effect)?0:gear?.category==='scroll'?gear.st:unit.st+(gear?.st||0)+support(side)});
    const attacker=make(inv,atk,b.invHP??inv.hp,s.turn,0,false);
    const defender=make(guard,def,t.unit.hp,t.owner,bonus,t.unit.confused);
    defender.poisoned=t.unit.poisoned;
    const lines=[];
    const health=()=>[Math.max(0,attacker.hp),Math.max(0,defender.hp)];
    b.startHP=health();b.strikes=[];
    function hit(a,d){
      const scroll=a.gear?.category==='scroll';
      const penetrate=scroll||a.gear?.effect==='pierceEarth'&&d.unit.element===2;
      if(penetrate&&d.land){d.hp-=d.land;d.land=0;lines.push('지형 보너스 관통');}
      let damage=a.st;
      if(scroll&&(a.gear.effect==='freeze'&&d.unit.element===0||a.gear.critical===d.unit.element))damage=Math.floor(damage*1.5);
      if(!scroll&&a.gear?.effect!=='orb'){
        if(d.gear?.effect==='reflect'){a.hp-=damage;lines.push('반사 '+damage);return 'reflect';}
        if(d.gear?.effect==='nullify'){lines.push('공격 무효');return 'block';}
        if(d.unit.neutralizes?.includes(a.unit.element)||d.unit.blocksLarge&&a.unit.hp>=40){lines.push('크리처 능력 · 공격 무효');return 'block';}
        if(d.unit.half)damage=Math.floor(damage/2);
      }
      d.hp-=damage;lines.push(a.unit.name+' → '+damage+' 피해');
      if(a.confused)a.hp-=Math.floor(damage*.3);
      if(damage>0&&a.unit.confuse){d.confused=true;d.poisoned=false;}
      if(damage>0&&a.unit.poison){d.poisoned=true;d.confused=false;}
    }
    const priority=unit=>unit.first?1:unit.last?-1:0;
    const order=priority(guard)>priority(inv)?[defender,attacker]:[attacker,defender];
    for(let i=0;i<order.length;i++){
      const source=order[i],target=order[1-i],lineStart=lines.length;
      const effect=hit(source,target)||'hit';
      b.strikes.push({effect,side:source===attacker?0:1,hp:health(),notes:lines.slice(lineStart)});
      if(source.hp<=0||target.hp<=0)break;
    }
    for(const side of [attacker,defender]){
      if(side.hp>0&&side.poisoned){
        const damage=Math.floor(side.unit.hp/2),baseHP=side===defender?t.unit.hp:b.invHP??inv.hp;
        side.hp=Math.min(side.hp,baseHP)-damage;lines.push('독 · '+damage+' 피해');
      }
      if(side.hp>0&&side.unit.regenerate){side.hp=side.unit.hp;lines.push('재생 · HP 회복');}
    }
    const won=defender.hp<=0&&attacker.hp>0,both=defender.hp<=0&&attacker.hp<=0;
    b.guard=t.unit.id;b.guardHP=t.unit.hp;b.attackST=attacker.st;b.defendST=defender.st;b.landHP=bonus;
    b.finalHP=[Math.max(0,attacker.hp),Math.max(0,defender.hp)];
    b.lines=[...lines,both?'양측 소멸':won?'침략 성공 · 영지 점령':'방어 성공'];b.won=won;b.noToll=b.from!=null||both;
    if(both)vacate(t);
    else if(won){t.owner=s.turn;t.unit={id:b.inv,hp:Math.min(inv.hp,attacker.hp),poisoned:attacker.poisoned,confused:attacker.confused};}
    else{
      t.unit.hp=guard.regenerate?guard.hp:Math.min(t.unit.hp,defender.hp);t.unit.poisoned=defender.poisoned;t.unit.confused=defender.confused;
      if(attacker.hp>0){if(b.from==null)s.players[s.turn].hand.push(b.inv);else s.tiles[b.from].unit.hp=Math.min(b.invHP,attacker.hp);}
    }
    if(b.from!=null&&(won||attacker.hp<=0))vacate(s.tiles[b.from]);
    s.phase='result';note(s,b.lines.at(-1));
  }
  function play(s,a){
    if(!Array.isArray(a)||!choices(s).some(b=>a.length===b.length&&b.every((v,i)=>v===a[i])))return false;
    const [k,x,y]=a,i=actor(s),p=s.players[i],t=s.tiles[p.pos];
    const before=(s.mapId==='market'||board(s).special?.includes('Temple'))?landValues(s):null;
    function mapEffect(type,label,tile=p.pos,extra={}){
      s.mapEffect={sequence:(s.mapEffect?.sequence||0)+1,type,label,tile,source:p.pos,...extra};
    }
    switch(k){
      case 'fortuneDraw':{
        const indices=p.book.flatMap((id,j)=>cards[id].kind===x?[j]:[]);
        const j=indices[Math.floor(Math.random()*indices.length)],id=p.book.splice(j,1)[0];p.hand.push(id);
        note(s,'점술관 · '+cards[id].name);s.phase='land';break;
      }
      case 'route':advance(s,x);break;
      case 'buySymbol':case 'sellSymbol':{
        const count=k==='buySymbol'?y:-y;p.cash-=count*s.prices[x];p.symbols[x]+=count;resumeMove(s);break;
      }
      case 'leaveTemple':resumeMove(s);break;
      case 'liquidate':p.cash+=s.prices[x]*y;p.symbols[x]-=y;debt(s);break;
      case 'cast':{
        const c=cards[paid(s,p,x)],cash=p.cash;s.phase='roll';
        if(c.effect==='cash')p.cash+=100;
        else if(c.effect==='manna')p.cash+=50*(p.lap+1);
        else if(c.effect==='fly')s.fly=true;
        else if(c.effect==='six'||c.effect==='one')p.word=c.effect==='one'?1:6;
        else{s.spellEffect=c.effect;s.phase='spellTarget';}
        if(s.phase==='roll'){
          const word=c.effect==='one'||c.effect==='six';
          const label=word?'이동 '+p.word:c.effect==='fly'?'주사위 ×2':'+'+(p.cash-cash)+' G';
          mapEffect(word?'word':c.effect==='fly'?'fly':'gain',label,p.pos,{title:c.name});
        }else mapEffect('cast',c.name);
        note(s,p.name+' · '+c.name);break;
      }
      case 'plagueArea':{
        for(const tile of s.tiles)if(tile.area===x&&tile.unit){tile.unit.poisoned=true;delete tile.unit.confused;}
        mapEffect('cast',(x+1)+'지역 · 독');s.phase='roll';break;
      }
      case 'targetLand':{
        const unit=s.tiles[x].unit,prior=unit.hp;if(s.spellEffect==='heal')unit.hp=cards[unit.id].hp;
        else if((unit.hp-=20)<=0)vacate(s.tiles[x]);s.phase='roll';
        const change=(s.tiles[x].unit?.hp||0)-prior;
        mapEffect(s.spellEffect,(change>=0?'+':'−')+Math.abs(change)+' HP',x,{title:cards[unit.id].name});
        break;
      }
      case 'targetPlayer':if(s.spellEffect==='shatter'){s.spellTarget=x;s.phase='shatter';}
        else{s.players[x].word=s.spellEffect==='word1'?1:6;mapEffect('word','이동 '+s.players[x].word,s.players[x].pos,{title:s.players[x].name});s.phase='roll';}break;
      case 'breakCard':mapEffect('shatter','카드 파괴',s.players[s.spellTarget].pos,{title:s.players[s.spellTarget].name});s.players[s.spellTarget].hand.splice(x,1);s.phase='roll';break;
      case 'fizzle':mapEffect('cast','대상 없음');s.phase='roll';break;
      case 'roll':{const die=()=>1+Math.floor(Math.random()*board(s).die);const fixed=p.word||s.fixed,faces=fixed?[fixed]:s.fly?[die(),die()]:[die()];s.die=faces.reduce((a,b)=>a+b,0);mapEffect('roll',String(s.die),p.pos,{faces,sides:board(s).die});delete p.word;s.fly=false;}note(s,p.name+' · 주사위 '+s.die);if(p.dir){if(p.previous==null&&!board(s).stage)p.previous=(p.pos-p.dir+s.tiles.length)%s.tiles.length;move(s,p.dir);}else if(board(s).stage&&board(s).links[p.pos].length!==2)move(s,1);else s.phase='direction';break;
      case 'direction':move(s,x);break;
      case 'summon':case 'exchange':{
        const tile=k==='summon'?t:s.tiles[x],id=paid(s,p,k==='summon'?x:y);
        if(k==='exchange')p.hand.push(tile.unit.id);
        mapEffect('summon',cards[id].name,k==='summon'?p.pos:x);
        tile.owner=i;tile.unit={id,hp:cards[id].hp};note(s,p.name+' · '+cards[id].name+' 배치');afterTerritory(s);break;
      }
      case 'level':mapEffect('gain','Lv.'+y,x);p.cash-=(s.tiles[x].base||80)*2**(y-1)-worth(s.tiles[x]);s.tiles[x].level=y;note(s,p.name+' · '+(x+1)+'번 영지 Lv.'+y);afterTerritory(s);break;
      case 'transfer':{
        const from=s.tiles[x],dest=s.tiles[y];
        if(dest.owner<0){dest.owner=i;dest.unit=from.unit;delete dest.unit.confused;delete dest.unit.poisoned;vacate(from);afterTerritory(s);}
        else{mapEffect('invade','영지 공격',y,{source:x});s.battle={at:y,inv:from.unit.id,invHP:from.unit.hp,from:x,atkItem:null,defItem:null};s.phase='attack';}
        break;
      }
      case 'element':mapEffect('cast',elements[y]+' 속성',x);p.cash-=300;s.tiles[x].type=y;afterTerritory(s);break;
      case 'pay':payToll(s);break;
      case 'invade':mapEffect('invade','영지 침략',p.pos);s.battle={at:p.pos,inv:paid(s,p,x),atkItem:null,defItem:null};s.phase='attack';break;
      case 'bare':case 'equip':{
        const id=k==='equip'?paid(s,p,x):null;
        if(s.phase==='attack'){s.battle.atkItem=id;s.phase='defend';}else{s.battle.defItem=id;resolve(s);}break;
      }
      case 'continue':{const moved=s.battle.from!=null,free=s.battle.won||s.battle.noToll;delete s.battle;if(moved)afterTerritory(s);else if(free)finish(s);else payToll(s);break;}
      case 'pass':finish(s);break;
      case 'sell':p.cash+=value(s,s.tiles[x]);vacate(s.tiles[x],true);debt(s);break;
      case 'discard':p.hand.splice(x,1);if(p.hand.length<=6)s.phase='spell';break;
    }
    const cue=s.phase==='over'?'victory':({pay:'coin',sell:'coin',buySymbol:'coin',sellSymbol:'coin',liquidate:'coin',equip:'card',discard:'card',fortuneDraw:'card'})[k];
    if(cue)s.actionSound={sequence:(s.actionSound?.sequence||0)+1,cue};
    updatePrices(s,before);return true;
  }
  function ai(s){
    const p=s.players[actor(s)];
    function score([k,x,y]){
      const c=cards[p.hand[x]];
      switch(k){
        case 'route':{
          const p=s.players[s.turn],m=board(s),missing=m.forts.filter(n=>!p.flags.some(f=>m.types[f]===m.types[n]));
          const goals=total(s,s.turn)<s.target&&missing.length?missing:(m.castles||[0]);
          let queue=[[x,p.pos,0]],seen=new Set();
          for(let k=0;k<queue.length;k++){
            const [at,prev,d]=queue[k],key=at+'/'+prev;if(seen.has(key))continue;seen.add(key);
            if(goals.includes(at))return 9-d;
            const dest=m.transit?.[at];
            if(dest!=null&&m.types[at]==='전송진'&&prev!==dest)queue.push([dest,at,d+1]);
            const pos=dest!=null&&m.types[at]==='다리'?dest:at;
            const exits=m.links[pos];
            exits.filter(n=>exits.length===1||n!==prev).forEach(n=>queue.push([n,pos,d+1]));
          }return -10000;
        }
        case 'buySymbol':return p.cash>300&&y<=5&&p.symbols[x]<10?2:-2;
        case 'sellSymbol':return p.cash<90?2+y/100:-2;
        case 'leaveTemple':return 1;
        case 'targetLand':return s.spellEffect==='bolt'?(s.tiles[x].owner===s.turn?-8:8)+(s.tiles[x].unit.hp<=20?2:0):(s.tiles[x].owner===s.turn?5:0)+1-s.tiles[x].unit.hp/cards[s.tiles[x].unit.id].hp;
        case 'targetPlayer':return (s.spellEffect==='word6')===(x===s.turn)?4:0;
        case 'cast':if(['manna','fly','word6','bolt','shatter'].includes(c.effect))return 4;
          return c.effect==='cash'?10:c.effect==='six'?3:-2;
        case 'summon':return 70+c.hp/10+(c.element===s.tiles[p.pos].type?4:0);
        case 'invade':{const g=s.tiles[p.pos],hp=g.unit.hp+landBonus(cards[g.unit.id],g);
          return c.st+(p.hand.some(id=>cards[id].kind==='item'&&cards[id].st&&cards[id].cost+c.cost<=p.cash)?30:0)>=hp?40: -2;}
        case 'equip':return (s.phase==='attack'?c.st:c.hp)/5-1;
        case 'level':return 30+y+(chain(s,s.tiles[x])>1?5:0);
        case 'transfer':case 'element':case 'exchange':return -2;
        case 'discard':return c.kind==='spell'?5:1;
        case 'sell':return -value(s,s.tiles[x])/100;
        default:return 0;
      }
    }
    let best,bestScore=-Infinity;
    for(const a of choices(s)){const n=score(a)+Math.random();if(n>bestScore){best=a;bestScore=n;}}
    return best;
  }
  return {start,choices,play,ai,actor,total,toll,value,cards,elements,maps,board,presets,validBook,forts:maps.classic.forts};
})();
if(typeof module!=='undefined')module.exports=Cepter;