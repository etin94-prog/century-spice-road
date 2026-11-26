function routeOption(action){
  const info=C.routePreview(s,action),tile=s.tiles[info.at],name=C.elements[tile.type]||tile.type;
  const button=btn('',()=>act(action),'route-option');
  const heading=el('strong',info.first+1+'번 방향');
  let landing=info.at+1+'번 '+name;
  if(info.phase==='fork')landing+=' · 갈림길에서 '+info.remaining+'칸 남음';
  else if(info.phase==='over')landing+=' · 목표 달성';
  else if(info.phase==='shop')landing+=' · 카드 1장 구매 가능';
  else if(info.phase==='temple')landing+=' · 호부 거래'+(info.remaining?' 후 '+info.remaining+'칸':'');
  else if(tile.owner>=0)landing+=' · '+(C.allied(s,tile.owner,s.turn)?'아군 영지':'통행료 '+info.toll+'G');
  else if(typeof tile.type==='number'||['무속성','복합'].includes(tile.type))landing+=' · 빈 영지';
  button.append(heading,el('span',landing+(info.cashGain?' · 경유 보너스 +'+info.cashGain+'G':'')));
  if(info.toll&&info.phase==='land')button.classList.add('toll-route');
  return button;
}

function shopMenu(controls,choices,p){
  const stock=C.shopStock(s);
  const box=el('div',null,'command'),field=el('label','판매 카드'),select=el('select');
  const preview=el('small',null,'decision-preview'),buy=btn('',()=>act(['buyCard',Number(select.value)]),'primary');
  select.dataset.action='buyCard';buy.dataset.action='buyCard';
  for(const id of stock){
    const card=C.cards[id];
    select.add(new Option(card.name+' · '+card.cost+'G'+(card.cost>p.cash?' · 마력 부족':''),id));
  }
  const affordable=choices.find(a=>a[0]==='buyCard');
  if(affordable)select.value=affordable[1];
  function refresh(){
    const card=C.cards[Number(select.value)],balance=p.cash-card.cost;
    buy.disabled=balance<0;
    buy.textContent=buy.disabled?(-balance)+'G 부족':card.cost+'G에 구매 · 잔액 '+balance+'G';
    preview.textContent=[localAbility(card)||card.catalog?.ability||stats(card),p.hand.length>=6?'구매 후 손패 1장을 버립니다.':''].filter(Boolean).join(' · ');
  }
  select.onchange=refresh;refresh();field.append(select);box.append(field,preview,buy);controls.append(box);
  if(choices.some(a=>a[0]==='buyCard'))box.append(btn('상품 그림 보기',()=>openTurnPicker(
    choices.filter(a=>a[0]==='buyCard').map(action=>({action,id:action[1],label:C.cards[action[1]].name+' · '+C.cards[action[1]].cost+'G'})),
    '상점 카드'),'picture-select'));
}

function decisionText(action,p){
  const [kind,x,y]=action,here=s.tiles[p.pos];
  if(['targetLand','abilityLand','teleTo'].includes(kind)){
    const tile=s.tiles[x],unit=tile.unit;
    if(!unit)return '빈 영지 · Lv.'+tile.level;
    const relation=tile.owner===s.turn?'내 영지':C.allied(s,tile.owner,s.turn)?'동맹 영지':'적 영지';
    const hp=unit.hp,max=unit.mhp??C.cards[unit.id].hp;
    let outcome='';
    if(kind==='targetLand'&&['bolt','heal'].includes(s.spellEffect)){
      const next=C.spellHP(s,tile,s.spellEffect);
      outcome=' → '+next+(next===0?' · 격파':'');
    }
    return relation+' · '+s.players[tile.owner].name+' · '+C.cards[unit.id].name+' · HP '+hp+'/'+max+outcome;
  }
  if(kind==='pay')return '통행료 '+C.owedToll(s,here)+'G · 지불 후 '+(p.cash-C.owedToll(s,here))+'G';
  if(['level','element','summon','exchange'].includes(kind)){
    const at=kind==='summon'?p.pos:x,t=s.tiles[at],next={...t};
    let cost;
    if(kind==='level'){next.level=y;cost=C.levelCost(t,y);}
    else if(kind==='element'){next.type=y;cost=300;}
    else{
      const id=p.hand[kind==='summon'?x:y];
      next.unit={id,hp:C.cards[id].hp};next.owner=s.turn;cost=C.price(p,C.cards[id],s);
    }
    const trial={...s,tiles:s.tiles.map((tile,i)=>i===at?next:tile)};
    const owed=here.owner>=0&&!C.allied(s,here.owner,s.turn)?C.owedToll(trial,trial.tiles[p.pos]):0;
    const chain=C.chain(trial,next);
    return (chain>1?chain+'연쇄 · ':'')+'통행료 '+(t.owner>=0?C.toll(s,t):0)+' → '+C.toll(trial,next)+'G · 잔액 '+(p.cash-cost-owed)+'G'+(owed?' (지불할 통행료 '+owed+'G 포함)':'');
  }
  if(kind==='invade'){
    const guard=C.cards[here.unit.id],ground=C.battleGround(s,{at:p.pos,inv:p.hand[x]});
    return guard.name+' · 기본 ST '+(here.unit.st??guard.st)+' / 현재 HP '+here.unit.hp+' · 지형 HP +'+ground.hp+' · '+(C.allied(s,here.owner,s.turn)?'동맹 영지':'방어 성공 시 통행료 '+C.owedToll(s,here)+'G');
  }
  return '';
}

function actionCard(action,p){
  const [kind,x,id]=action;
  if(['foresightCard','replaceCard','mesmerCard'].includes(kind))return id;
  if(kind==='buyCard')return x;
  if(kind==='exchange')return p.hand[id];
  if(['cast','equip','discard','summon','invade','sacrifice'].includes(kind))return p.hand[x];
  if(['breakCard','wormDiscard','suppressCard'].includes(kind))return s.players[s.spellTarget]?.hand[x];
}

function openTurnPicker(entries,title){
  document.querySelector('#turnPicker')?.remove();
  const openedState=s,openedRevision=room?.revision,openedPhase=s.phase,openedTurn=s.turn;
  const dialog=el('dialog',null,'turn-picker');dialog.id='turnPicker';
  const heading=el('h2',title);heading.id='turnPickerTitle';
  dialog.setAttribute('aria-labelledby',heading.id);
  const close=btn('닫기',()=>dialog.close());
  const list=el('div',null,'turn-picker-cards');
  const detail=el('p',null,'turn-picker-detail');
  let selected;
  const confirm=btn('확정',()=>{
    const choices=room?room.choices:C.choices(s);
    if(!selected||s!==openedState||s.phase!==openedPhase||s.turn!==openedTurn||room?.revision!==openedRevision||
        pending||C.isComputer(s,C.actor(s))||room&&(room.busy||room.seat!==C.actor(s))||
        !choices.some(a=>a.length===selected.length&&a.every((v,i)=>v===selected[i]))){dialog.close();return;}
    dialog.close();act(selected);
  },'primary');
  confirm.hidden=true;
  for(const {action,id,label} of entries){
    const card=C.cards[id],option=btn(label,()=>{
      selected=action;for(const item of list.children)item.setAttribute('aria-pressed',String(item===option));
      detail.textContent=card?(localAbility(card)||card.catalog?.ability||stats(card)):label;
      confirm.textContent=(labels[action[0]]||'행동')+' 확정';confirm.hidden=false;
    },card?'turn-picker-card':'turn-picker-action');
    option.setAttribute('aria-pressed','false');
    if(card){const art=cardSeal(id);art.alt='';option.prepend(art);}
    list.append(option);
  }
  dialog.append(heading,close,list,detail,confirm);dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.querySelector('main').append(dialog);dialog.showModal();
}

function launchPawnActions(){
  const seat=C.actor(s),p=s.players[seat];
  const choices=room?room.choices:C.choices(s);
  if(choices.length===1&&choices[0][0]==='roll'){act(choices[0]);return;}
  const entries=choices.filter(([k])=>!['route','direction','buySymbol','sellSymbol','liquidate'].includes(k))
    .map(action=>({action,id:actionCard(action,p),label:action[0]==='buyCard'?C.cards[action[1]].name+' · '+C.cards[action[1]].cost+'G':
      [labels[action[0]],action.length>1?opts(action,p):''].filter(Boolean).join(' · ')}));
  if(entries.length)openTurnPicker(entries,p.name+' 행동');
  else $('buttons').querySelector('button,select')?.focus();
}

function commandGroup(group,p,controls){
  const [kind]=group[0],single=group.length===1;
  const box=el('div',null,'command'),preview=el('small',null,'decision-preview');
  const button=btn('',()=>act(selected()),['roll','continue'].includes(kind)?'primary':'');
  button.dataset.action=kind;
  let select;
  const selected=()=>single?group[0]:group[+select.value];
  if(single){
    button.textContent=group[0].length>1?labels[kind]+' · '+opts(group[0],p):labels[kind];
  }else{
    const label=el('label',labels[kind]);select=el('select');select.dataset.action=kind;
    group.forEach((a,j)=>select.add(new Option(opts(a,p),j)));
    if(['summon','invade','equip','cast','discard'].includes(kind)){
      const j=group.findIndex(a=>a[1]===focusCard);if(j>=0)select.value=j;
    }
    label.append(select);box.append(label);button.textContent=labels[kind]+' 확정';
    select.onchange=()=>refresh();
  }
  if(!single&&group.some(a=>actionCard(a,p)!=null)){
    const picture=btn('그림으로 고르기',()=>openTurnPicker(group.map(action=>({action,id:actionCard(action,p),label:opts(action,p)})),labels[kind]),'picture-select');
    box.append(picture);
  }
  function refresh(){preview.textContent=decisionText(selected(),p);preview.hidden=!preview.textContent;}
  refresh();box.append(button,preview);controls.append(box);
}

function showHandSelection(p,choices){
  const panel=$('detail');panel.replaceChildren();
  const id=p.hand[focusCard],c=C.cards[id];if(!c)return;
  const actions=choices.filter(([k,x])=>['cast','summon','invade','equip','discard','sacrifice'].includes(k)&&x===focusCard);
  const name=el('strong',c.name),buttons=el('div',null,'hand-actions');
  panel.append(name,el('span',localAbility(c)||c.catalog?.ability||stats(c)));
  if(!actions.length&&C.price(p,c,s)>p.cash){
    panel.append(el('small','현재 마력 '+p.cash+'G · 사용 비용까지 '+(C.price(p,c,s)-p.cash)+'G 부족'));
  }
  buttons.append(btn('카드 상세',()=>showCatalogCard(c,id)));
  for(const action of actions)buttons.append(btn(labels[action[0]],()=>act(action),'primary'));
  panel.append(buttons);
}

function seatSummary(seat){
  const p=s.players[seat],map=C.board(s),total=C.total(s,seat);
  const team=s.teams?' · '+String.fromCharCode(65+s.teams[seat])+'팀':'';
  $('seatName').textContent=p.name+team;
  const missing=(map.checkpoints||map.forts).filter(id=>!p.flags.includes(id)).map(id=>map.types[id]);
  const land=s.tiles.filter(t=>t.owner===seat);
  const rows=[
    ['보유 마력',p.cash+'G'],
    ['보유 영지',land.length+'곳 · '+land.reduce((sum,t)=>sum+C.value(s,t),0)+'G'],
    [s.teams?'동맹 총마력':'총마력',total+' / '+s.target+'G'],
    ['승리까지',total>=s.target?'성에 도착하면 승리':(s.target-total)+'G 추가 후 성 귀환'],
    ['이번 주회 남은 요새',missing.join(' · ')||'모두 경유 · 성으로 귀환']
  ];
  const effect=p.status?({goodluck:'솔티스 · 통행료 면제',enlightenment:'계시 · 모든 내 영지에 명령 가능'}[p.status]||C.cards.find(c=>C.combo.key(c)===p.status)?.name||p.status):
    p.word!=null?'다음 주사위 '+p.word:p.reverse?'역방향 이동':p.antiMagic?'안티 매직':p.invisible?'인비저빌리티':p.dream?'드림 테레인':null;
  if(effect){
    const turns=p.enchantDeadline-(s.round-1)*s.players.length-s.turn;
    rows.push(['셉터 인챈트',effect+(turns>0?' · '+Math.ceil(turns/s.players.length)+'라운드 남음':'')]);
  }
  $('seatStats').replaceChildren(...rows.flatMap(([label,value])=>[el('dt',label),el('dd',value)]));
}
