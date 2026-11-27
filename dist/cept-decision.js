function tollLabel(tile,seat){
  const range=C.tollRange(s,tile,seat);
  return (range?range.join('–'):seat==null?C.toll(s,tile):C.owedToll(s,tile,seat))+'G';
}
function routeOption(action){
  const info=C.routePreview(s,action),tile=s.tiles[info.at],name=C.elements[tile.type]||tile.type;
  const button=btn('',()=>act(action),'route-option');
  const heading=el('strong',info.first+1+'번 방향');
  let landing=info.at+1+'번 '+name;
  if(info.phase==='fork')landing+=' · 갈림길에서 '+info.remaining+'칸 남음';
  else if(info.phase==='over')landing+=' · 목표 달성';
  else if(info.phase==='shop')landing+=' · 카드 1장 구매 가능';
  else if(info.phase==='spellCircle')landing+=' · 주문 한 장 무료 사용';
  else if(info.phase==='gemStore')landing+=' · 속성석 거래'+(info.remaining?' 후 '+info.remaining+'칸':'');
  else if(info.phase==='temple')landing+=' · 호부 거래'+(info.remaining?' 후 '+info.remaining+'칸':'');
  else if(tile.owner>=0)landing+=' · '+(C.allied(s,tile.owner,s.turn)?'아군 영지':'통행료 '+(C.tollRange(s,tile,s.turn)?tollLabel(tile,s.turn):info.toll+'G'));
  else if(info.phase==='pathSwitch')landing+=' · 다음 '+(info.switchTo+1)+'번 방향 변경 가능';
  else if(info.tower)landing+=' · 원격 소환 또는 침략';
  else if(info.fountain)landing+=' · 손패 교체';
  else if(C.territoryType(tile.type))landing+=' · 빈 영지';
  const bonus=info.cashGain-info.trapDelta;
  if(bonus)landing+=' · 경유 보너스 +'+bonus+'G';
  if(info.trapDelta)landing+=' · 트랩 '+(info.trapDelta>0?'+':'−')+Math.abs(info.trapDelta)+'G';
  button.append(heading,el('span',landing));
  if(info.toll&&info.phase==='land')button.classList.add('toll-route');
  return button;
}

// A command with many options is one button that opens the choice sheet.
function openerButton(kind,text,count,open){
  const button=btn('',open,'command-open');
  button.dataset.open=kind;button.setAttribute('aria-haspopup','dialog');
  button.append(el('span',text),el('small',String(count)));
  return button;
}

function shopMenu(controls,choices,p){
  const entries=C.shopStock(s).map(id=>{
    const card=C.cards[id],cost=C.shopCost(id),short=cost-p.cash;
    const full=C.edition==='revolt'&&p.hand.length>=10;
    return {action:['buyCard',id],id,label:card.name+' · '+cost+'G',blocked:full?'손패 10장 보유':short>0?short+'G 부족':'',
      confirm:cost+'G에 구매 · 잔액 '+(p.cash-cost)+'G',note:p.hand.length>=6?'구매 후 손패를 6장으로 줄입니다.':''};
  });
  if(!entries.length)return;
  const box=el('div',null,'command');box.dataset.kind='buyCard';
  const open=openerButton('buyCard','카드 구매',entries.length,()=>openTurnPicker(entries,'상점 카드',entries.findIndex(e=>!e.blocked)));
  if(choices.some(a=>a[0]==='buyCard'))open.classList.add('primary');
  box.append(open);controls.append(box);
}

function decisionText(action,p){
  const [kind,x,y]=action,position=s.towerAt??p.pos,here=s.tiles[position];
  if(kind==='sacrifice'&&s.pendingCard){
    const id=p.hand[s.pendingCard.index],form=C.synthesizedCreature(id,C.cards[p.hand[x]]);
    if(form!==id)return C.cards[form].name+'로 합성됩니다.';
  }
  if(kind==='circleCast')return '마법진 사용 비용 0G';
  if(kind==='switchKeep'||kind==='switchFlip')return '다음 이동 '+(C.pathSwitch(s,p.pos,p.previous,kind==='switchFlip').to+1)+'번 칸';
  if(kind==='shrineChoice')return C.shrineDetails[x];
  if(kind==='ability'||kind==='totem')return CepterCreatureText.territorySummary(C,C.cards[s.tiles[x].unit.id]);
  if(['targetLand','abilityLand','teleTo','towerTo'].includes(kind)){
    const tile=s.tiles[x],unit=tile.unit;
    if(kind==='targetLand'&&s.spellEffect==='remission')return '게이트를 경유한 것으로 표시합니다.';
    if(!unit)return '빈 영지 · Lv.'+tile.level;
    const relation=tile.owner===s.turn?'내 영지':C.allied(s,tile.owner,s.turn)?'동맹 영지':'적 영지';
    const hp=unit.hp,max=unit.mhp??C.cards[unit.id].hp;
    let outcome='';
    if(kind==='targetLand'&&(['bolt','heal'].includes(s.spellEffect)||C.hasLandDamage(s.spellEffect))){
      const next=C.spellHP(s,tile,s.spellEffect);
      const revival=C.spellRevival(s,tile,s.spellEffect);
      outcome=revival?' · '+revival+'로 부활':' → '+next+(next===0?' · 격파':'');
    }
    return relation+' · '+s.players[tile.owner].name+' · '+C.cards[unit.id].name+' · HP '+hp+'/'+max+outcome;
  }
  if(kind==='pay'){
    const range=C.tollRange(s,here,s.turn);
    const balance=range?[p.cash-range[1],p.cash-range[0]].join('–'):p.cash-C.owedToll(s,here);
    return '통행료 '+tollLabel(here,s.turn)+' · 지불 후 '+balance+'G';
  }
  if(['level','element','summon','exchange'].includes(kind)){
    const at=kind==='summon'?position:x,t=s.tiles[at],next={...t};
    let cost;
    if(kind==='level'){next.level=y;cost=C.levelCost(t,y,p);}
    else if(kind==='element'){next.type=y;cost=C.elementCost(t);}
    else{
      const id=p.hand[kind==='summon'?x:y];
      next.type=C.claimTerrain(t,C.cards[id]);next.unit={id,hp:C.cards[id].hp};next.owner=s.turn;cost=C.price(p,C.cards[id],s);
    }
    const trial={...s,tiles:s.tiles.map((tile,i)=>i===at?next:tile)};
    const owed=s.towerAt==null&&here.owner>=0&&!C.allied(s,here.owner,s.turn)?C.owedToll(trial,trial.tiles[p.pos]):0;
    const chain=C.chain(trial,next);
    return (t.type!==next.type&&kind==='summon'?'모프 → '+(C.elements[next.type]||next.type)+' · ':'')+(chain>1?chain+'연쇄 · ':'')+'통행료 '+(t.owner>=0?C.toll(s,t):0)+' → '+C.toll(trial,next)+'G · 잔액 '+(p.cash-cost-owed)+'G'+(owed?' (지불할 통행료 '+owed+'G 포함)':'');
  }
  if(kind==='invade'){
    const guard=C.cards[here.unit.id],ground=C.battleGround(s,{at:position,inv:p.hand[x]});
    return guard.name+' · 기본 ST '+(here.unit.st??guard.st)+' / 현재 HP '+here.unit.hp+' · 지형 HP +'+ground.hp+' · '+(s.towerAt!=null?'사령탑 침략 · 통행료 없음':C.allied(s,here.owner,s.turn)?'동맹 영지':'방어 성공 시 통행료 '+tollLabel(here,s.turn));
  }
  return '';
}

function actionCard(action,p){
  const [kind,x,id]=action;
  if(['foresightCard','replaceCard','mesmerCard','stealCard','forgeCard','reformCard','poisonBookCard'].includes(kind))return id;
  if(kind==='buyCard'||kind==='circleCast')return x;
  if(kind==='eraseDraw'&&C.edition==='revolt')return p.peek?.ids[x];
  if(kind==='exchange')return p.hand[id];
  if(['cast','equip','discard','summon','invade','sacrifice'].includes(kind))return p.hand[x];
  if(['breakCard','wormDiscard','suppressCard'].includes(kind))return s.players[s.spellTarget]?.hand[x];
}

function cardSummary(card){
  const base=stats(card);
  if(card.kind!=='creature')return base;
  const ability=localAbility(card)||card.catalog?.ability;
  return !ability||ability===base?base:base+' · '+ability;
}

function turnPicker(title){
  document.querySelector('#turnPicker')?.remove();
  const openedState=s,openedRevision=room?.revision,openedPhase=s.phase,openedTurn=s.turn;
  const dialog=el('dialog',null,'turn-picker');dialog.id='turnPicker';
  const heading=el('h2',title);heading.id='turnPickerTitle';
  dialog.setAttribute('aria-labelledby',heading.id);
  dialog.append(heading,btn('닫기',()=>dialog.close()));
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  const commit=action=>{
    if(!action||s!==openedState||s.phase!==openedPhase||s.turn!==openedTurn||room?.revision!==openedRevision||
        pending||C.isComputer(s,C.actor(s))||room&&(room.busy||room.seat!==C.actor(s))){dialog.close();return;}
    const choices=room?room.choices:C.choices(s);
    dialog.close();
    if(choices.some(a=>a.length===action.length&&a.every((v,i)=>v===action[i])))act(action);
  };
  const show=()=>{
    document.querySelector('main').append(dialog);dialog.showModal();
  };
  return {dialog,commit,show};
}

// Entries are {action,id,label} plus optional blocked (why it cannot be chosen), confirm (button text) and note.
function openTurnPicker(entries,title,preferred=-1){
  const {dialog,commit,show}=turnPicker(title);
  const list=el('div',null,'turn-picker-cards');
  if(!entries.some(entry=>C.cards[entry.id]))list.classList.add('turn-picker-options');
  const detail=el('p',null,'turn-picker-detail');
  let selected;
  const actorSeat=s.players[C.actor(s)];
  const confirm=btn('확정',()=>commit(selected?.blocked?null:selected?.action),'primary');
  confirm.hidden=true;
  const options=entries.map(entry=>{
    const card=C.cards[entry.id];
    const choose=()=>{
      selected=entry;for(const item of list.children)item.setAttribute('aria-pressed',String(item===option));
      const outcome=actorSeat?decisionText(entry.action,actorSeat):'';
      detail.replaceChildren();
      if(card||!outcome)detail.append(el('span',card?cardSummary(card):entry.label));
      if(outcome)detail.append(el('strong',outcome));
      if(entry.note)detail.append(el('span',entry.note));
      confirm.textContent=entry.blocked||entry.confirm||(labels[entry.action[0]]||'행동')+' 확정';
      confirm.disabled=!!entry.blocked;confirm.hidden=false;
      option.scrollIntoView({block:'nearest',inline:'nearest'});
    };
    // A card already shows its cost on its face, so the label keeps only the name and place.
    const option=btn(card?entry.label.replace(/ · \d+G$/,''):entry.label,()=>{
      // A second tap on the chosen option confirms it.
      if(selected===entry&&!confirm.disabled){confirm.click();return;}
      choose();
    },card?'turn-picker-card':'turn-picker-action');
    option.setAttribute('aria-pressed','false');
    if(card){
      const art=cardSeal(entry.id);art.alt='';option.prepend(art);
      const kind=entry.action[0],noExtraCost=['circleCast','replaceCard'].includes(kind)||C.edition==='begins'&&['stealCard','forgeCard','reformCard','poisonBookCard'].includes(kind);
      const cost=kind==='buyCard'?C.shopCost(entry.id):noExtraCost?0:card.kind==='creature'||card.kind==='item'||card.kind==='spell'?(actorSeat?C.price(actorSeat,card,s):card.cost):null;
      if(Number.isFinite(cost))option.append(el('small',cost+'G','card-cost'));
      if(card.kind==='creature')option.append(el('small','ST '+card.st+' · HP '+card.hp,'card-power'));
    }
    if(entry.blocked){option.classList.add('blocked');option.append(el('small',entry.blocked));}
    list.append(option);
    return choose;
  });
  dialog.append(list,detail,confirm);show();
  options[entries.length===1?0:preferred]?.();
}

function symbolLabel(id){
  if(C.board(s).gemStore)return C.elements[id]+' 속성석';
  const area=Math.floor(id/4),legacy=['classic','market'].includes(s.mapId);
  return (legacy?(area===0?'서부':'동부'):(area+1)+'지역')+' '+C.elements[id%4];
}
function symbolTrade(group,p,controls){
  const kind=group[0][0],assets=new Map(),gems=C.board(s).gemStore;
  const gemTrade=['buyGem','sellGem','stealGem'].includes(kind);
  const title=gems&&kind==='liquidate'?'속성석 처분':labels[kind],unit=gems?'개':'장';
  for(const action of group){
    const [,id,count,seller]=action,key=seller==null?String(id):id+'/'+seller;
    if(!assets.has(key))assets.set(key,{id,seller,actions:new Map()});
    assets.get(key).actions.set(count,action);
  }
  const box=el('div',null,'command');box.dataset.kind=kind;
  box.append(openerButton(kind,title,assets.size,()=>{
    const {dialog,commit,show}=turnPicker(title);
    dialog.classList.add('symbol-picker');
    const buy=['buySymbol','buyGem','stealGem'].includes(kind),options=el('div',null,'symbol-options');
    options.setAttribute('role','group');options.setAttribute('aria-label',gems?'속성석 종류':'호부 종류');
    const quantity=el('div',null,'symbol-quantity');
    quantity.setAttribute('role','group');quantity.setAttribute('aria-label','거래 수량');
    const number=el('output',null,'symbol-count');
    number.setAttribute('aria-live','off');
    const amount=el('p',null,'symbol-amount'),result=el('p',null,'symbol-result');
    let selected,counts=[],index=0;
    const change=delta=>{index=Math.min(counts.length-1,Math.max(0,index+delta));update();};
    const fewer=btn('−',()=>change(-1)),more=btn('+',()=>change(1)),max=btn('최대',()=>change(counts.length));
    fewer.setAttribute('aria-label','수량 1'+unit+' 줄이기');more.setAttribute('aria-label','수량 1'+unit+' 늘리기');
    max.setAttribute('aria-label','최대 수량 선택');
    quantity.append(fewer,number,more,max);
    const confirm=btn(title+' 확정',()=>commit(assets.get(selected).actions.get(counts[index])),'primary');
    function update(){
      const {id,seller,actions}=assets.get(selected),count=counts[index],delta=buy?count:-count;
      const quote=gemTrade?C.gemQuote(s,actions.get(count)):{cost:delta*s.prices[id],holdings:p.symbols[id]+delta};
      number.value=count+unit;fewer.disabled=index===0;more.disabled=index===counts.length-1;
      amount.textContent=(buy?'지불 ':'수령 ')+Math.abs(quote.cost)+'G'+(seller==null?'':' · 상대 수령 '+quote.received+'G');
      result.textContent='거래 후 마력 '+(p.cash-quote.cost)+'G · 보유 '+quote.holdings+unit+
        (gemTrade?' · 시세 '+quote.prices[id]+'G':'');
    }
    const buttons=new Map();
    function choose(key){
      selected=key;counts=[...assets.get(key).actions.keys()].sort((a,b)=>a-b);index=0;
      for(const [candidate,button] of buttons)button.setAttribute('aria-pressed',String(candidate===selected));
      update();
    }
    for(const [key,{id,seller}] of assets){
      const button=btn(symbolLabel(id)+(seller==null?'':' · '+s.players[seller].name),()=>choose(key));
      button.append(el('small',unit+'당 '+(gemTrade?C.gemUnitPrice(s,kind,id):s.prices[id])+'G'));
      options.append(button);buttons.set(key,button);
    }
    choose(assets.keys().next().value);
    const details=el('div',null,'symbol-details');
    details.setAttribute('role','status');details.append(amount,result);
    dialog.append(options,quantity,details,confirm);show();
  }));
  controls.append(box);
}

// The character opens and closes its own action menu; a lone roll happens at once.
function launchPawnActions(){
  const choices=room?room.choices:C.choices(s);
  if(choices.length===1&&choices[0][0]==='roll'){act(choices[0]);return;}
  if(handPanel.open&&handPanel.parentElement===viewport){handPanel.open=false;setActionMenu(true);return;}
  setActionMenu(actionToggle.getAttribute('aria-expanded')!=='true');
}

// One option acts at once. A few plain options sit side by side. Cards and long lists open the choice sheet.
function commandGroup(group,p,controls){
  const [kind]=group[0],single=group.length===1;
  const box=el('div',null,'command');box.dataset.kind=kind;
  const pictured=group.some(a=>actionCard(a,p)!=null),territory=['level','element','exchange','transfer'].includes(kind);
  const mustShowCard=kind==='replaceCard'||C.edition==='begins'&&['stealCard','forgeCard','reformCard','poisonBookCard'].includes(kind);
  if(!mustShowCard&&(single||!pictured&&!territory&&group.length<=3)){
    if(!single)box.append(el('small',labels[kind],'command-title'));
    for(const action of group){
      const button=btn('',()=>act(action),['roll','continue'].includes(kind)?'primary':'');
      button.dataset.action=kind;
      button.append(el('span',single?(action.length>1?labels[kind]+' · '+opts(action,p):labels[kind]):opts(action,p)));
      const outcome=decisionText(action,p);
      if(outcome)button.append(el('small',outcome,'decision-preview'));
      box.append(button);
    }
  }else{
    // A land picked on the map narrows its commands to that land; a card picked in the hand is chosen first.
    const here=territory&&inspect>=0?group.filter(a=>a[1]===inspect):[],listed=here.length?here:group;
    const entries=listed.map(action=>({action,id:actionCard(action,p),label:opts(action,p)}));
    const preferred=['summon','invade','equip','cast','discard'].includes(kind)?listed.findIndex(a=>a[1]===focusCard):-1;
    const title=labels[kind]+(here.length?' · '+(inspect+1)+'번 칸':'');
    box.append(openerButton(kind,title,listed.length,()=>openTurnPicker(entries,title,preferred)));
  }
  controls.append(box);
}

// A tapped hand card shows its own actions in a bubble above the card.
function placeCardPopup(){
  const panel=$('detail'),hand=$('hand'),card=hand.querySelectorAll('.card')[focusCard];
  if(!card||!panel.classList.contains('card-popup')||!panel.childElementCount)return;
  const center=handPanel.offsetLeft+card.offsetLeft-hand.scrollLeft+card.offsetWidth/2;
  const width=panel.offsetWidth,left=Math.max(6,Math.min(viewport.clientWidth-width-6,center-width/2));
  panel.style.left=left+'px';
  panel.style.bottom=(viewport.clientHeight-handPanel.offsetTop+10)+'px';
  panel.style.setProperty('--arrow',Math.max(16,Math.min(width-16,center-left))+'px');
}
function closeCardPopup(){
  focusCard=-1;$('detail').replaceChildren();
  for(const card of $('hand').querySelectorAll('.card')){card.classList.remove('active');card.setAttribute('aria-pressed','false');}
}

function showHandSelection(p,choices){
  const panel=$('detail');panel.replaceChildren();
  // Over the map the bubble floats above the tray; in battle it stays inside the tray.
  const floating=handPanel.parentElement===viewport,home=floating?viewport:handPanel;
  if(panel.parentElement!==home)home.append(panel);
  panel.classList.toggle('card-popup',floating);
  const id=p.hand[focusCard],c=C.cards[id];if(!c||floating&&!handPanel.open)return;
  const actions=choices.filter(([k,x])=>['cast','summon','invade','equip','discard','sacrifice'].includes(k)&&x===focusCard);
  const name=el('strong',c.name),buttons=el('div',null,'hand-actions');
  panel.append(name,el('span',cardSummary(c)));
  if(!actions.length&&C.price(p,c,s)>p.cash){
    panel.append(el('small','현재 마력 '+p.cash+'G · 사용 비용까지 '+(C.price(p,c,s)-p.cash)+'G 부족'));
  }
  buttons.append(btn('카드 상세',()=>showCatalogCard(c,id)));
  for(const action of actions)buttons.append(btn(labels[action[0]],()=>act(action),'primary'));
  panel.append(buttons);
  if(floating){
    const close=btn('✕',closeCardPopup,'card-popup-close');close.setAttribute('aria-label','카드 선택 닫기');
    panel.append(close);placeCardPopup();
  }
}

function seatSummary(seat){
  const p=s.players[seat],map=C.board(s),total=C.total(s,seat);
  const team=s.teams?' · '+String.fromCharCode(65+s.teams[seat])+'팀':'';
  $('seatName').textContent=p.name+team;
  const missing=(map.checkpoints||map.forts).filter(id=>!p.flags.includes(id)).map(id=>map.gateNames?.[id]||map.types[id]);
  const land=s.tiles.filter(t=>t.owner===seat);
  const rows=[
    ['보유 마력',p.cash+'G'],
    ['보유 영지',land.length+'곳 · '+land.reduce((sum,t)=>sum+C.value(s,t),0)+'G'],
    [s.teams?'동맹 총마력':'총마력',total+' / '+s.target+'G'],
    ['승리까지',total>=s.target?(map.gates?'게이트를 지나면 승리':'성에 도착하면 승리'):
      (s.target-total)+'G 추가 후 '+(map.gates?'게이트 경유':'성 귀환')],
    [map.gates?'이번 주회 남은 게이트':'이번 주회 남은 요새',missing.join(' · ')||(map.gates?'모두 경유':'모두 경유 · 성으로 귀환')]
  ];
  if(map.gemStore)rows.push(['속성석',s.prices.map((price,e)=>C.elements[e]+' '+p.symbols[e]+'개 × '+price+'G').join(' · ')]);
  const effect=p.status?({goodluck:'솔티스 · 통행료 면제',enlightenment:'모든 내 영지에 명령 가능',bravesong:'브레이브 송 · 전투 ST +20',toughsong:'터프 송 · 전투 HP +20',sagaTollUp:'통행료 30% 증가',
    sagaTollDown:'통행료 30% 감소',sagadrought:'드라우트 · 영지 레벨 변경 금지',sagafloat:'플로트 · 주사위 5 고정',
    hunterssong:'헌터스 송 · 전투 격파 +200G',trespass:'트레스패스 · 다른 셉터 완주 보너스 획득',innocence:'이노센스 · 통행료 면제 및 침략 금지',sagaDeduction:'크리처·장비 비용 감면',sagaInflation:'크리처·장비 비용 증가',
    sagaBreak:'장비 카드 사용 금지',sagaFear:'침략 금지'}[p.status]||C.cards.find(c=>C.combo.key(c)===p.status)?.name||p.status):
    p.word!=null?'다음 주사위 '+p.word:p.reverse?'역방향 이동':p.antiMagic?'안티 매직':p.invisible?'인비저빌리티':p.dream?'드림 테레인':p.sagaClemency?'다음 이동 통행료 면제':p.sagaService?'다음 요새 보너스 +50%':p.sagaFeast?'다음 주회 보너스 +50%':null;
  if(effect){
    const turns=p.enchantDeadline-(s.round-1)*s.players.length-s.turn;
    const rolls=p.diceLimitRolls??p.hasteRolls;
    const remaining=rolls>0?' · '+rolls+'회 굴림 남음':turns>0?' · '+Math.ceil(turns/s.players.length)+'라운드 남음':'';
    rows.push(['셉터 인챈트',effect+remaining]);
  }
  $('seatStats').replaceChildren(...rows.flatMap(([label,value])=>[el('dt',label),el('dd',value)]));
}
