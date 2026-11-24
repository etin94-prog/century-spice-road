
'use strict';
const $=k=>document.getElementById(k);
const C=Cepter,colors=['#fa9c80','#85c9ff','#e3c367','#a9d6a4'],storage='cept-local-v1';
const labels={plagueArea:'독을 부여할 지역',fortuneDraw:'카드 종류 선택',route:'갈림길 선택',leaveTemple:'거래 종료',buySymbol:'호부 매수',sellSymbol:'호부 매도',liquidate:'호부 처분',targetPlayer:'대상 셉터',targetLand:'대상 영지',breakCard:'파괴할 카드',fizzle:'대상 없음',cast:'주문 사용',roll:'주사위 굴리기',direction:'이동 방향',summon:'크리처 소환',invade:'영지 침략',pay:'통행료 지불',level:'영지 레벨업',element:'속성 변경',exchange:'크리처 교체',transfer:'크리처 이동',pass:'행동 마치기',bare:'아이템 없이 전투',equip:'아이템 사용',continue:'전투 결과 확인',sell:'영지 처분',discard:'카드 버리기'};
const hints={fortune:'북에서 뽑을 카드의 종류를 선택하세요.',fork:'남은 이동에 사용할 길을 선택하세요.',temple:'지역과 속성을 골라 호부를 거래하거나 지나가세요.',spellTarget:'주문을 적용할 대상을 고르세요.',shatter:'선택한 셉터의 아이템이나 주문 한 장을 파괴하세요.',spell:'주문을 한 장 쓰거나 주사위를 굴리세요.',roll:'주문 효과가 준비됐습니다. 주사위를 굴리세요.',direction:'첫 이동 방향을 선택하세요.',land:'도착한 칸의 행동 또는 영지 명령을 선택하세요.',attack:'침략자가 사용할 아이템을 고르세요.',defend:'방어자가 사용할 아이템을 고르세요.',result:'전투 결과를 확인하세요.',sell:'통행료를 충당할 영지를 선택하세요.',discard:'손패가 6장이 될 때까지 버릴 카드를 고르세요.'};
let room=null,customBook=null,draft=[],s=null,pending=false,timer,focusCard=-1,inspect=-1;
function el(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
function btn(text,fn,cls){const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;}
function save(){if(room)return;try{localStorage.setItem(storage,JSON.stringify(s));}catch{$('notice').textContent='저장 공간을 사용할 수 없어 이번 대국은 현재 창에서만 진행됩니다.';}}
try{const raw=localStorage.getItem(storage);if(raw){const v=JSON.parse(raw);if(v.version===1&&[2,3,4].includes(v.players.length)&&C.board(v)?.types.length===v.tiles.length&&(v.phase==='over'||C.choices(v).length))s=v;else throw Error();}}catch{$('notice').textContent='저장한 대국을 읽을 수 없습니다.';}
function seats(){const select=$('humans'),prior=+select.value||1;select.replaceChildren();for(let i=1;i<=+$('count').value;i++)select.add(new Option(i+'명 · AI '+(+$('count').value-i)+'명',i));select.value=Math.min(prior,+$('count').value);}
let seenMove=0,activeWalk=null;
function lobby(){cancelMapEffect();stopWalk();if(room){location.assign(location.pathname);return;}clearTimeout(timer);$('lobby').hidden=false;$('game').hidden=true;$('setup').hidden=true;$('resume').hidden=!s||s.phase==='over';}
function handoff(){return !room&&s.phase!=='over'&&!s.players[C.actor(s)].ai&&s.players.filter(p=>!p.ai).length>1;}
function enter(){cancelMapEffect();seenMapEffect=s.mapEffect?.sequence||0;stopWalk();seenMove=s.lastMove?.sequence||0;pending=handoff();focusCard=inspect=-1;$('lobby').hidden=true;$('game').hidden=false;$('setup').hidden=false;render();}
$('count').onchange=seats;$('setup').onclick=lobby;$('resume').onclick=enter;
$('config').onsubmit=e=>{e.preventDefault();if(s&&s.phase!=='over'&&!confirm('진행 중인 대국을 새 대국으로 바꿀까요?'))return;s=C.start(+$('count').value,+$('humans').value,+$('target').value,$('mapChoice').value,chosenBook());save();enter();};
const handPanel=$('handPanel');
try{const saved=localStorage.getItem('cept-hand-open');handPanel.open=saved===null?!matchMedia('(max-width:900px), (pointer:coarse)').matches:saved==='1';}catch{}
handPanel.addEventListener('toggle',()=>{try{localStorage.setItem('cept-hand-open',handPanel.open?'1':'0');}catch{}});
seats();lobby();
function act(a){if(room){roomAction(a);return;}const before=C.actor(s);if(!C.play(s,a))return;pending=before!==C.actor(s)&&handoff();focusCard=inspect=-1;save();render();}
function chosenBook(){return $('bookChoice').value==='custom'?customBook:C.presets[$('bookChoice').value];}
const bookKey='cept-book-v1';
try{const data=JSON.parse(localStorage.getItem(bookKey));if(C.validBook(data)){customBook=data;$('bookChoice').lastElementChild.disabled=false;}}catch{}
const catalogTypes={neutral:'무속성',fire:'화속성',water:'수속성',earth:'지속성',air:'풍속성',weapon:'무기',armor:'방어구',scroll:'두루마리',tool:'도구',sflash:'단일 즉시 주문',mflash:'복수 즉시 주문',senchant:'단일 지속 주문',menchant:'복수 지속 주문'};
function showCatalogCard(c,id){
  const entry=c.catalog;
  $('catalogName').textContent=entry&&entry.name!==c.name?c.name+' · '+entry.name:c.name;
  $('catalogArt').replaceChildren(cardSeal(id));
  $('catalogStats').textContent=entry?[catalogTypes[entry.category],entry.rarity,entry.stats].join(' · '):c.cost+'G';
  $('catalogAbility').textContent=entry?entry.ability:stats(c);
  if(entry){
    const terms={R:'화 영지',B:'수 영지',G:'지 영지',Y:'풍 영지','+[]':'손패 1장',Fire:'화',Water:'수',Earth:'지',Air:'풍',Weapon:'무기',Armor:'방어구',Scroll:'두루마리',Tool:'도구'};
    const describe=v=>v.split(',').filter(Boolean).map(x=>terms[x]||x).join(' · ');
    const limits=[entry.additionalCost&&'소환 조건 '+describe(entry.additionalCost),entry.placement&&'배치 제한 '+describe(entry.placement),entry.equipment&&'장비 제한 '+describe(entry.equipment)].filter(Boolean);
    $('catalogStats').textContent=['No. '+entry.number,$('catalogStats').textContent,...limits].join(' · ');
  }
  $('cardDialog').showModal();
}
$('closeCard').onclick=()=>$('cardDialog').close();
function tallyBook(){
  const total=draft.reduce((a,b)=>a+b,0);
  $('bookCount').textContent=total+' / 50장';$('storeBook').disabled=total!==50;
}
function filterBook(){
  const query=$('cardSearch').value.trim().toLowerCase(),scope=$('cardScope').value,kind=$('cardKind').value;
  const rows=[];
  C.cards.forEach((c,id)=>{
    if((scope==='original'&&!c.catalog)||(scope==='usable'&&c.catalogOnly)||(kind&&kind!==c.kind))return;
    if(![c.name,c.catalog?.name,c.catalog?.path].some(v=>v?.toLowerCase().includes(query)))return;
    const row=el('div',null,'catalog-entry'),open=btn(c.name,()=>showCatalogCard(c,id),'catalog-open');
    const art=cardSeal(id);if(art.tagName==='IMG'){art.loading='lazy';art.alt='';}
    open.prepend(art);row.append(open);
    if(c.catalogOnly){row.append(el('small','도감 전용'));}
    else{
      const input=el('select');input.setAttribute('aria-label',c.name+' 수량');
      for(let i=0;i<=4;i++)input.add(new Option(i+'장',i));
      input.value=draft[id];input.onchange=()=>{draft[id]=+input.value;tallyBook();};row.append(input);
    }
    rows.push(row);
  });
  $('bookRows').replaceChildren(...rows);$('bookRows').scrollTop=0;
  $('cardResults').textContent=rows.length+'종';
}
function bookEditor(){
  draft=C.cards.map((_,id)=>chosenBook().filter(n=>n===id).length);
  filterBook();tallyBook();
}
$('cardSearch').onkeydown=e=>{if(e.key==='Enter')e.preventDefault();};
$('cardSearch').oninput=filterBook;$('cardScope').onchange=filterBook;$('cardKind').onchange=filterBook;
$('editor').ontoggle=()=>{if($('editor').open&&!draft.length)bookEditor();};
$('bookChoice').onchange=bookEditor;
$('storeBook').onclick=()=>{
  const book=draft.flatMap((n,id)=>Array(n).fill(id));if(!C.validBook(book))return;
  customBook=book;$('bookChoice').lastElementChild.disabled=false;$('bookChoice').value='custom';
  try{localStorage.setItem(bookKey,JSON.stringify(book));$('bookCount').textContent='50장 · 북 저장 완료';}catch{$('bookCount').textContent='이번 창에서 사용할 북으로 설정했습니다.';}
};
const spellText={plague:'선택한 지역의 모든 크리처에게 독 부여',one:'다음 이동 1칸',six:'다음 이동 6칸',cash:'100G 획득',heal:'크리처 HP 완전 회복',shatter:'대상의 아이템·주문 1장 파괴',fly:'주사위 2개',bolt:'크리처 HP −20',manna:'현재 주회 × 50G',word1:'셉터의 다음 이동 1칸',word6:'셉터의 다음 이동 6칸'};
const gearText={freeze:'두루마리 · 화 속성에 강타',reflect:'ST 0 · 일반 공격 반사',nullify:'ST 0 · 일반 공격 무효',orb:'무효·반사 무시',pierceEarth:'지 속성 지형 보너스 관통'};
function stats(c){
  if(c.kind==='spell')return spellText[c.effect];
  const base=c.st+' ST / '+c.hp+' HP';
  return [base,gearText[c.effect],c.first?'선제':null,c.half?'일반 피해 절반':null,c.stationary?'방어 전용':null,c.support?'크리처로 지원 가능':null,c.confuse?'공격 명중 시 혼란':null,
    c.landBan!=null?C.elements[c.landBan]+' 배치 불가':null,c.ban?.map(v=>({weapon:'무기',armor:'방어구',scroll:'두루마리'})[v]+' 불가').join('·')].filter(Boolean).join(' · ');
}
function opts(a,p){const [k,x,y]=a,c=C.cards[p.hand[x]];
  switch(k){
    case 'plagueArea':return (x+1)+'지역';
    case 'fortuneDraw':return {creature:'크리처',item:'아이템',spell:'주문'}[x];
    case 'route':case 'targetLand':return (x+1)+'번 · '+(C.elements[s.tiles[x].type]||s.tiles[x].type);
    case 'targetPlayer':return s.players[x].name;
    case 'breakCard':return C.cards[s.players[s.spellTarget].hand[x]].name;
    case 'liquidate':case 'buySymbol':case 'sellSymbol':return (C.board(s).stage?(1+Math.floor(x/4))+'지역':x<4?'서부':'동부')+' '+C.elements[x%4]+' · '+y+'장 · '+s.prices[x]*y+'G';
    case 'direction':if(C.board(s).stage){const exits=C.board(s).links[p.pos];return (1+(x===1?exits[0]:exits.at(-1)))+'번 칸 방향';}return x===1?'시계 방향':'반시계 방향';
    case 'cast':case 'equip':case 'discard':case 'summon':case 'invade':return c.name+' · '+c.cost+'G';
    case 'level':return (x+1)+'번 → Lv.'+y+' · '+(80*2**(y-1)-80*2**(s.tiles[x].level-1))+'G';
    case 'exchange':return (x+1)+'번 · '+C.cards[p.hand[y]].name;
    case 'transfer':return (x+1)+'번 → '+(y+1)+'번';
    case 'element':return (x+1)+'번 → '+C.elements[y]+' · 300G';
    case 'sell':return (x+1)+'번 · '+C.value(s,s.tiles[x])+'G';
    default:return labels[k];
  }
}
// StockAgent uses a 104px standing figure on its 360px battle stage.
const boardSizeObserver=new ResizeObserver(([entry])=>{
  const height=entry.contentRect.height;
  if(height>0)entry.target.parentElement.style.setProperty('--standing-height',(height*104/360)+'px');
});
boardSizeObserver.observe($('map'));
// Feet are points on the top diamond; all distances are fractions of the tile.
function pawnFoot(tileId,seat,occupants){
  const positions=[[],[[.5,.58]],[[.36,.50],[.64,.60]],[[.40,.42],[.64,.52],[.44,.70]],[[.29,.43],[.58,.35],[.45,.66],[.75,.56]]];
  const [x,y]=positions[occupants.length][occupants.indexOf(seat)];
  return [s.tiles[tileId].unit ? .60+x*.32 : x,y];
}
function map(){
  const root=$('map'),m=C.board(s);root.replaceChildren();const span=m.stage?1:m.rows+m.cols+.6;
  const half=m.stage?m.half:100/span;
  root.classList.toggle('source-map',!!m.stage);
  root.style.backgroundImage=m.stage?'url("art/cept-maps/'+m.image+'.webp")':'';
  root.style.setProperty('--half-tile',half+'cqw');
  root.style.aspectRatio=m.stage?'3 / 2':'100 / '+(18+.5*(m.rows+m.cols)*half);
  root.closest('.atlas').classList.toggle('in-battle',!!s.battle);root.inert=!!s.battle;
  s.tiles.forEach((t,n)=>{
    const name=C.elements[t.type]||t.type,owner=t.owner>=0?s.players[t.owner].name:'미점유';
    const b=btn('',()=>{if(s.phase==='fork'&&!pending&&(!room||room.seat===s.turn&&!room.busy)&&!s.players[s.turn].ai&&C.choices(s).some(a=>a[0]==='route'&&a[1]===n)){act(['route',n]);return;}inspect=n;focusCard=-1;render();},'tile '+(['fire','water','earth','wind'][t.type]||'special')+(n===inspect?' chosen':''));
    const [r,c]=m.position[n];b.style.left=((m.rows+c-r+.3)*half)+'%';
    b.style.top=(11+(r+c-2)*half*.5)+'cqw';
    if(m.stage){
      b.style.left=r+'%';b.style.top='calc('+c+'% - '+half*.5+'cqw)';
      b.classList.toggle('altered',t.type!==m.types[n]);b.dataset.fort=m.forts.includes(n)?'true':'false';
    }
    b.style.zIndex=String(m.stage?Math.round(c):2*(r+c));b.setAttribute('aria-label',(n+1)+'번 '+name+' '+owner);
    const surface=el('span',null,'tile-surface');surface.setAttribute('aria-hidden','true');
    b.append(surface,el('b',(n+1)+' · '+name));
    if(s.phase==='fork'&&C.choices(s).some(a=>a[0]==='route'&&a[1]===n))b.classList.add('exit');
    if(t.unit){const miniature=creatureFigure(t.unit.id);miniature.classList.add('summoned');b.append(miniature);}
    if(t.unit)b.append(el('small',(t.owner+1)+'P · Lv.'+t.level+' · '+C.toll(s,t)+'G'));
    const pawns=el('div',null,'pawns');
    const occupants=s.players.flatMap((p,i)=>p.pos===n?[i]:[]);
    s.players.forEach((p,i)=>{
      if(p.pos!==n)return;
      const mark=el('span',null,'pawn');const [fx,fy]=pawnFoot(n,i,occupants);
      mark.style.left=fx*100+'%';mark.style.top=fy*100+'%';
      mark.dataset.seat=i;mark.style.setProperty('--color',colors[i]);
      mark.append(figure(i,p.name),el('i',(i+1)+'P'));pawns.append(mark);
    });
    b.append(pawns);root.append(b);
  });
  const center=$('center');center.classList.toggle('market-center',s.mapId==='market'&&!s.battle);
  if(s.battle){
    renderBattle(center,s);return;
  }
  center.replaceChildren();
  if(inspect>=0){const t=s.tiles[inspect];if(t.unit)center.append(creatureFigure(t.unit.id));center.append(el('small',(inspect+1)+'번 칸'),el('b',C.elements[t.type]||t.type),el('span',t.unit?C.cards[t.unit.id].name+(t.unit.poisoned?' · 독':'')+' · HP '+t.unit.hp+' · 가치 '+C.value(s,t)+'G':m.transit?.[inspect]!=null?(m.transit[inspect]+1)+'번으로 이동':t.type==='카드 상점'?'상점 상품 미확인':'점유 크리처 없음'));return;}
  const p=s.players[s.turn];center.append(figure(s.turn,p.name),el('small',s.winner>=0?'대전 종료':p.name+' · '+p.lap+'주 완주'),el('b',s.winner>=0?p.name+' 승리':s.die?'주사위 '+s.die:m.name),el('span','경유 요새 '+p.flags.length+' / '+(m.checkpoints||m.forts).length+(s.remaining?' · 남은 이동 '+s.remaining:'')));
}
function stopWalk(){
  if(!activeWalk)return;
  const {sprite,pawn,animation}=activeWalk;
  activeWalk=null;
  animation?.cancel();
  sprite.remove();
  if(pawn)pawn.style.visibility='';
  $('game').inert=false;
}

async function walkPath(move){
  const root=$('map'),tiles=[...root.querySelectorAll('.tile')];
  const pawn=root.querySelector('.pawn[data-seat="'+move.seat+'"]');
  const sprite=el('img',null,'walking-cepter');
  sprite.alt='';sprite.src='art/cept-walk-'+move.seat+'.webp';
  const walk={sprite,pawn,animation:null};
  activeWalk=walk;
  $('game').inert=true;
  try{
    await sprite.decode();
    if(activeWalk!==walk)return;
    root.append(sprite);
    if(pawn)pawn.style.visibility='hidden';
    for(let step=1;step<move.path.length;step++){
      const from=tiles[move.path[step-1]],to=tiles[move.path[step]];
      const point=(tile,[fx,fy])=>[
        tile.offsetLeft-tile.offsetWidth/2+tile.offsetWidth*fx,
        tile.offsetTop+tile.offsetHeight*fy
      ];
      const start=step===1&&pawn?[parseFloat(pawn.style.left)/100,parseFloat(pawn.style.top)/100]:[.5,.58];
      const destination=move.path[step];
      const occupants=s.players.flatMap((p,i)=>p.pos===destination?[i]:[]);
      const end=step===move.path.length-1?pawnFoot(destination,move.seat,occupants):[.5,.58];
      const [x,y]=point(from,start),[endX,endY]=point(to,end);
      sprite.style.zIndex=String(Math.max(+from.style.zIndex,+to.style.zIndex)+1);
      sprite.style.left=x+'px';sprite.style.top=y+'px';
      if(endX!==x)sprite.style.scale=endX<x?'-1 1':'1 1';
      const jumping=C.board(s).transit?.[move.path[step-1]]===destination;
      const frames=jumping?[{left:x+'px',top:y+'px',opacity:1},{left:x+'px',top:y+'px',opacity:0,offset:.49},{left:endX+'px',top:endY+'px',opacity:0,offset:.5},{left:endX+'px',top:endY+'px',opacity:1}]:[{left:x+'px',top:y+'px'},{left:endX+'px',top:endY+'px'}];
      walk.animation=sprite.animate(frames,{duration:480,fill:'forwards'});
      await walk.animation.finished;
      walk.animation.cancel();
    }
  }catch{/* A cancelled walk or missing sprite falls back to the current board. */}
  finally{if(activeWalk===walk){stopWalk();render();}}
}

function render(){
  clearTimeout(timer);
  syncStageMusic();
  if(presentMapEffect(s.mapEffect))return;
  const move=s.lastMove;
  if(move&&move.sequence!==seenMove){
    stopWalk();seenMove=move.sequence;
    if(move.path.length>1&&s.players[move.seat].pos===move.path.at(-1)&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      walkPath(move);return;
    }
  }
  if(activeWalk)return;
  const i=C.actor(s),p=s.players[i],over=s.phase==='over',local=!p.ai&&!pending&&!over&&(!room||room.seat===i&&!room.busy);
  $('mapName').textContent=C.board(s).name;
  $('round').textContent=s.round+'라운드 · 목표 '+s.target+'G';
  $('seats').replaceChildren(...s.players.map((v,j)=>{const box=el('div',null,'seat'+(i===j?' active':''));box.style.setProperty('--color',colors[j]);box.append(figure(j,v.name),el('b',v.name),el('span','마력 '+v.cash+'G · 총 '+C.total(s,j)+'G'));if(s.mapId==='market'||C.board(s).special?.includes('Temple'))box.append(el('small',' 호부 '+v.symbols.reduce((a,b)=>a+b,0)+'장'));return box;}));
  map();$('who').textContent=over?p.name+' 승리':p.name+' 차례';
  $('hint').textContent=over?'목표 총마력을 가지고 성에 귀환했습니다.':pending?'다음 셉터에게 기기를 건네세요.':p.ai?'AI가 행동을 선택하고 있습니다.':room&&room.seat!==i?p.name+'의 입력을 기다립니다.':hints[s.phase];
  const controls=$('buttons');controls.replaceChildren();
  if(pending)controls.append(btn('내 차례 확인',()=>{pending=false;render();},'primary'));
  if(over){
    if(s.reward){
      const result=el('details');result.append(el('summary','승리 보상 카드 '+s.reward.length+'장'));
      const grid=el('div',null,'archive-cards');
      for(const id of s.reward){const c=C.cards[id];grid.append(archiveCard(c.catalog.path));}
      result.append(grid);controls.append(result);
    }
    const next=C.board(s).stage+1;
    if(!room&&C.maps['ps2-'+next])controls.append(btn('다음 스테이지 · '+C.maps['ps2-'+next].name,()=>{
      const book=s.players[0].template;
      $('mapChoice').value='ps2-'+next;showStage();
      s=C.start(s.players.length,s.players.filter(v=>!v.ai).length,s.target,'ps2-'+next,book);save();enter();
    },'primary'));
    controls.append(btn('대국 설정으로',lobby));
  }
  const choices=local?(room?room.choices:C.choices(s)):[];
  for(const k of new Set(choices.map(a=>a[0]))){
    const group=choices.filter(a=>a[0]===k);
    if(k==='buySymbol'||k==='sellSymbol'){
      const field=el('label',labels[k]),asset=el('select'),quantity=el('select');
      for(const n of new Set(group.map(a=>a[1])))asset.add(new Option((C.board(s).stage?(1+Math.floor(n/4))+'지역':n<4?'서부':'동부')+' '+C.elements[n%4]+' · 장당 '+s.prices[n]+'G',n));
      const refresh=()=>{quantity.replaceChildren();for(const a of group.filter(a=>a[1]===+asset.value))quantity.add(new Option(a[2]+'장 · '+a[2]*s.prices[a[1]]+'G',a[2]));};
      asset.setAttribute('aria-label','호부 종류');quantity.setAttribute('aria-label','거래 수량');asset.onchange=refresh;refresh();
      field.append(asset,quantity,btn(labels[k]+' 확정',()=>act([k,+asset.value,+quantity.value])));controls.append(field);continue;
    }
    if(group.length===1){const a=group[0];controls.append(btn(a.length>1?labels[k]+' · '+opts(a,p):labels[k],()=>act(a),['roll','continue'].includes(k)?'primary':''));continue;}
    const wrap=el('label',labels[k]),select=el('select');group.forEach((a,j)=>select.add(new Option(opts(a,p),j)));
    if(['summon','invade','equip','cast','discard'].includes(k)){const id=group.findIndex(a=>a[1]===focusCard);if(id>=0)select.value=id;}
    wrap.append(select,btn(labels[k]+' 확정',()=>act(group[+select.value])));controls.append(wrap);
  }
  const hand=$('hand');hand.replaceChildren();$('handTitle').textContent=local?p.name+'의 손패 · '+p.hand.length+'장':'손패';
  $('detail').textContent='';
  if(local){p.hand.forEach((id,j)=>{const c=C.cards[id],b=btn('',()=>{focusCard=j;render();},'card'+(j===focusCard?' active':''));b.append(cardSeal(id),el('span',c.kind==='creature'?(C.elements[c.element]||'무')+' · 크리처':c.kind==='item'?'아이템':'주문'),el('b',c.name),el('span',stats(c)),el('span',c.cost+' G'));hand.append(b);});
    if(focusCard>=0&&C.cards[p.hand[focusCard]]){const c=C.cards[p.hand[focusCard]];$('detail').replaceChildren(cardSeal(p.hand[focusCard]),el('span',c.name+' · '+stats(c)+' · 비용 '+c.cost+'G'));}
  }else hand.append(el('span',over?'대국이 끝났습니다.':'본인 차례에 표시됩니다.','muted'));
  if(local&&typeof showHandCombos==='function')showHandCombos(hand,p.hand);
  $('log').replaceChildren(...s.log.map(t=>el('li',t)));
  if(!room&&!over&&p.ai)timer=setTimeout(()=>act(C.ai(s)),550+(s.phase==='result'?battleReplayDuration(s.battle):0));
}
