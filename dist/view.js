"use strict";
const el=id=>document.getElementById(id),names=['강황','사프란','카다멈','계피'],key='century-duel-1';
let g,draft=null,timer;
try{g=JSON.parse(localStorage.getItem(key));}catch{}
const firstVisit=!g?.players;
if(firstVisit)g=newGame();
const mySeat=()=>online?.seat??0;
const myTurn=()=>g.turn===mySeat()&&(!online||online.ready&&online.connected&&!online.pending);
const seatName=i=>i===mySeat()?'나':online?(onlineAI(i)?'AI '+(i+1):'친구 '+(i+1)):'상단 '+i;
const levelOf=p=>levels.includes(p.level)?p.level:'Medium';
let worker=null;

function save(){if(online)return;try{localStorage.setItem(key,JSON.stringify(g));el('save').textContent='이 기기에 자동 저장됨';}catch{el('save').textContent='저장 공간 사용 불가';}}
const cube=t=>'<i aria-hidden="true" class="cube s'+t+'"></i>';
const chips=(bag,all=false)=>'<span class="chips">'+bag.map((n,t)=>n||all?'<span class="chip" aria-label="'+names[t]+' '+n+'개" title="'+names[t]+'">'+cube(t)+n+'</span>':'').join('')+'</span>';
const type=c=>c.up?'승급':sum(c.cost)?'교환':'생산';
const desc=c=>c.up?'최대 '+c.up+'단계':sum(c.cost)?chips(c.cost)+' → '+chips(c.gain):chips(c.gain)+' 획득';
const coinName={gold:'금화 +3',silver:'은화 +1'};
function coinToken(coin){
  return '<span class="coin '+coin+'" role="img" aria-label="'+coinName[coin]+'점" title="'+coinName[coin]+'점">'+(coin==='gold'?'3':'1')+'</span>';
}
function card(kind,c,i,disabled=false){
  if(kind!=='order'){
    const trade=sum(c.cost)>0;
    const recipe=c.up?'↑ '+c.up:trade?chips(c.cost)+' → '+chips(c.gain):chips(c.gain);
    const resources=bag=>bag.map((n,t)=>n?names[t]+' '+n+'개':'').filter(Boolean).join(' ');
    const effectLabel=c.up?'최대 '+c.up+'단계 승급':(trade?resources(c.cost)+' 지불, ':'')+resources(c.gain)+' 획득';
    const artwork='<span class="illustration '+artOf(c)+'"></span>';
    const symbols='<span class="marketRecipe">'+recipe+'</span>';
    if(kind!=='buy'){
      const target=kind==='collection'?'data-hand-index="'+i+'"':'data-kind="play" data-i="'+i+'"';
      return '<button class="card" '+target+' aria-label="'+effectLabel+'" '+(disabled?'disabled':'')+'>'+artwork+symbols+'</button>';
    }
    const pile=sum(c.pile)?'<span class="marketPile">+ '+chips(c.pile)+'</span>':'';
    return '<button class="card merchantTile" data-kind="buy" data-i="'+i+'" aria-label="영입 비용 '+i+'개, '+effectLabel+(pile?', 쌓인 자원 '+resources(c.pile):'')+'">'+artwork+'<span class="marketPrice">'+i+'</span>'+pile+symbols+'</button>';
  }
  const reward=kind==='order'&&bonus(g,i);
  const label=kind==='order'?(reward?coinToken(reward):''):'내 손패';
  const ready=kind==='order'&&covers(g.players[mySeat()].bag,c.cost);
  return '<button class="card'+(ready?' affordable':'')+'" data-kind="'+kind+'" data-i="'+i+'">'+face(c,ready?label+'<span class="canOrder">달성 가능</span>':label)+'</button>';
}
function render(){
  clearGesture();
  const p=g.players[mySeat()],goal=target(g);
  el('mode').textContent='센추리 Ⅰ  /  '+g.players.length+'인 대국';
  el('status').innerHTML='<span>라운드 '+g.round+(g.players.some(q=>q.won.length>=goal)&&!g.over?' · 마지막 라운드':'')+'</span><b class="turn">'+(g.over?'대국 종료':online&&!online.ready?'친구 입장 대기':g.turn!==mySeat()?seatName(g.turn)+' 차례':'나의 차례')+'</b>';
  el('rival').innerHTML=g.players.map((ai,i)=>{
    if(i===mySeat())return '';
    const last=g.log.find(x=>x.who===i);
    return '<button class="rival '+(g.turn===i?'thinking':'')+'" data-seat="'+i+'"><span class="rivalhead"><b>'+seatName(i)+'</b><span class="seatScore">'+score(ai)+'점</span><small>'+(online&&!onlineAI(i)?(awaySeat(i)?'자리 비움 · AI 대행':'온라인'):levelOf(ai))+'</small></span><span>'+chips(ai.bag,true)+'</span><span class="seatArt '+(last?.card?artOf(last.card):'back')+'"></span><small>손패 '+ai.hand.length+' · 사용 '+ai.used.length+' · 주문 '+ai.won.length+'</small><small>'+score(ai)+'점 · '+(last?.msg||'첫 교역 대기')+'</small></button>';
  }).join('');
  document.querySelectorAll('[data-seat]').forEach(b=>b.onclick=()=>inspectSeat(+b.dataset.seat));
  el('myScore').textContent=score(p)+'점 · 주문 '+p.won.length+'/'+goal+'장';
  el('bag').innerHTML=p.bag.map((n,t)=>'<div class="stock"><b>'+cube(t)+n+'</b><small>'+names[t]+'</small></div>').join('');
  el('handTitle').textContent='손패 '+p.hand.length+'장';
  el('hand').innerHTML=p.hand.map((c,i)=>card('play',c,i)).join('')||'<p>휴식하면 사용한 카드를 모두 회수합니다.</p>';
  el('rest').textContent='휴식 · '+p.used.length+'장 회수';el('rest').disabled=!!(g.over||!myTurn()||!p.used.length);
  el('orders').innerHTML=g.orders.map((c,i)=>card('order',c,i)).join('');
  el('merchants').innerHTML=g.market.map((c,i)=>card('buy',c,i)).join('');
  el('orderDeck').textContent='남은 주문 '+g.deck.length+'장';
  el('merchantDeck').textContent='남은 상인 '+g.merchants.length+'장';
  document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{
    const kind=b.dataset.kind,i=+b.dataset.i;
    if(myTurn()&&!g.over){
      if(kind==='play')playHandCard(i);else start(kind,i);
      return;
    }
    const c=(kind==='order'?g.orders:kind==='buy'?g.market:p.hand)[i];
    modal(kind==='order'?'주문 살펴보기':'상인 살펴보기','<div class="detailFace">'+face(c,kind==='order'?'':type(c))+'</div><p>'+(kind==='order'?'필요한 향신료 '+chips(c.cost):'카드 효과 '+desc(c))+'</p>',true);
  });
  if(el('modal').open&&el('collection'))inspectSeat(+el('collection').dataset.seatIndex);
  const entry=g.log[0];
  const latest=entry?seatName(entry.who)+(entry.msg.startsWith('AI 대행')?' · AI 대행':'')+' · '+(entry.action?moveFlow(entry.action,entry).flow:entry.msg):'아직 진행한 행동이 없습니다.';
  const line=el('latestMove').firstElementChild;
  if(line.textContent!==latest)line.textContent=latest;
  el('latestMove').title=latest;
  el('latestMove').setAttribute('aria-label',latest+' 대국 기록 열기');
  if(el('log'))renderHistory();
  el('handHint').hidden=!!g.log.length||!myTurn()||g.over;
  if(g.over){el('status').innerHTML+='<button id="results">결과 보기</button>';el('results').onclick=results;}
}
function renderHistory(){
  el('log').innerHTML=g.log.map((x,i)=>'<p>'+(x.action?'<button class="logMove" data-log="'+i+'">':'')+x.round+'R · '+seatName(x.who)+' · '+x.msg+(x.card?' &nbsp; '+(x.card.vp?chips(x.card.cost):desc(x.card)):'')+(x.action?' · 상세</button>':'')+'</p>').join('')||'<p>아직 진행한 행동이 없습니다.</p>';
  el('log').querySelectorAll('[data-log]').forEach(b=>b.onclick=()=>inspectMove(+b.dataset.log));

}
function modal(title,body,observe=false){el('modal').dataset.observe=String(observe);if(!observe)stopAI();el('title').textContent=title;el('body').innerHTML=body;if(!el('modal').open)el('modal').showModal();}
const close=()=>el('modal').close();
el('close').onclick=close;
el('myTable').onclick=()=>inspectSeat(mySeat());
function advance(a,remote=false,substitute=false){
  if(online&&!remote){submitOnline(a);return;}
  const actor=g.turn,human=actor===mySeat();
  const motion=captureMove(actor,a);
  if(!apply(g,a))return;
  if(substitute)g.log[0].msg='AI 대행 · '+g.log[0].msg;
  motion.substitute=substitute;
  recordMove(a,motion,actor);
  if(human)close();
  save();render();
  animateMove(actor,a,motion);
  if(g.over)results();else schedule();
}
function recordMove(action,motion,actor){
  Object.assign(g.log[0],{action,card:motion.c,used:motion.used,coin:motion.coin,before:motion.before,after:g.players[actor].bag.slice()});
}
function inspectMove(index){
  const entry=g.log[index];
  const {label,flow}=moveFlow(entry.action,entry);
  modal(entry.round+'R · '+seatName(entry.who)+' · '+label,'<div class="detailFace">'+face(entry.card,label)+'</div><p>'+flow+'</p><p class="preview">보유 향신료<br>'+chips(entry.before,true)+' → '+chips(entry.after,true)+'</p>',true);
}
function stopAI(){
  clearTimeout(timer);
  if(worker){worker.terminate();worker=null;}
}
function schedule(){
  stopAI();
  if(online||g.over||!g.turn||(el('modal').open&&el('modal').dataset.observe!=='true'))return;
  timer=setTimeout(()=>{
    const publicBoard={players:g.players,turn:g.turn,orders:g.orders,market:g.market,gold:g.gold,silver:g.silver};
    const fallback=()=>{stopAI();advance(chooseMove(publicBoard));};
    try{
      worker=new Worker('ai-worker.js');
      worker.onmessage=({data})=>{stopAI();advance(data);};
      worker.onerror=fallback;
      worker.postMessage(publicBoard);
    }catch{fallback();}
  },g.log.length?1650:950);
}
function playHandCard(i){
  if(!myTurn()||g.over)return;
  const p=g.players[mySeat()],c=p.hand[i];
  if(!c)return;
  const action={kind:'play',i,n:1};
  const bag=c.up?null:effect(p,action,g);
  const repeatable=sum(c.cost)>0&&effect(p,{...action,n:2},g);
  if(bag&&sum(bag)<=10&&!repeatable){advance(action);return;}
  start('play',i);
}
function start(kind,i){
  if(g.over||!myTurn())return;
  draft={kind,i,pay:[],steps:[],n:1,drop:zeros()};
  const p=g.players[mySeat()];
  if(kind==='order'){
    const cost=g.orders[i].cost;
    if(covers(p.bag,cost)){advance(draft);return;}
    const missing=cost.map((n,t)=>n>p.bag[t]?names[t]+' '+(n-p.bag[t]):'').filter(Boolean);
    el('status').querySelector('.turn').textContent=missing.join(' · ')+' 부족';
    return;
  }
  if(kind==='buy'){
    if(sum(p.bag)<i){
      el('status').querySelector('.turn').textContent='영입 비용 '+(i-sum(p.bag))+'개 부족';
      return;
    }
    finishForcedPayment(draft,p.bag);
    const bag=effect(p,draft,g);
    if(bag){
      finishForcedReturn(draft,bag);
      if(sum(bag)-sum(draft.drop)<=10){advance(draft);return;}
    }
  }
  editor();
}
function finishForcedPayment(action,bag){
  const remaining=bag.slice();
  action.pay.forEach(t=>remaining[t]--);
  if(remaining.filter(n=>n>0).length===1){
    const t=remaining.findIndex(n=>n>0);
    while(action.pay.length<action.i)action.pay.push(t);
  }
}
function finishForcedReturn(action,bag){
  const remaining=add(bag,action.drop,-1);
  const excess=sum(remaining)-10;
  if(excess>0&&remaining.filter(n=>n>0).length===1)
    action.drop[remaining.findIndex(n=>n>0)]+=excess;
}
function picks(list,fn){return '<div class="choices">'+list.map(([id,label,disabled])=>'<button data-pick="'+fn+'" data-val="'+id+'" '+(disabled?'disabled':'')+'>'+label+'</button>').join('')+'</div>';}
function editor(){
  const a=draft,p=g.players[mySeat()],c=(a.kind==='play'?p.hand:a.kind==='buy'?g.market:g.orders)[a.i];
  let title='',body='',label='',bag=p.bag.slice();
  if(a.kind==='rest'){title='휴식';body='<p>사용한 상인 카드 '+p.used.length+'장을 모두 손으로 가져옵니다.</p>';label='휴식하기';}
  if(a.kind==='order'){
    title=c.vp+'점 주문';const b=bonus(g,a.i);body='<p>지불할 향신료 &nbsp;'+chips(c.cost)+'</p>'+(b?'<p>보너스 · '+coinName[b]+'점</p>':'');
    if(!covers(bag,c.cost))body+='<p>부족한 향신료 &nbsp;'+chips(c.cost.map((x,t)=>Math.max(0,x-bag[t])))+'</p>';
    label='주문 달성';
  }
  if(a.kind==='buy'){
    title=type(c)+' 상인 영입';body='<p>카드 효과 &nbsp;'+desc(c)+'</p><p>이 카드에 쌓인 향신료 &nbsp;'+(sum(c.pile)?chips(c.pile):'없음')+'</p>';
    a.pay.forEach(t=>bag[t]--);
    body+='<p>'+(a.i?'앞쪽 카드마다 향신료를 하나씩 놓습니다. ('+a.pay.length+'/'+a.i+')':'첫 번째 상인은 무료입니다.')+'</p>';
    if(a.pay.length<a.i)body+=picks(names.map((n,t)=>[t,cube(t)+' '+n+' '+bag[t],!bag[t]]),'pay');
    if(a.pay.length)body+='<p>지불 순서 · '+a.pay.map(t=>names[t]).join(' → ')+'</p>';
    label='손패에 추가';
  }
  if(a.kind==='play'){
    title=type(c)+' 카드';body='<p>'+desc(c)+'</p>';label='카드 사용';
    if(c.up){
      a.steps.forEach(t=>{bag[t]--;bag[t+1]++;});
      body+='<p>승급할 향신료를 선택하세요. ('+a.steps.length+'/'+c.up+')</p>';
      if(a.steps.length<c.up)body+=picks(names.slice(0,3).map((n,t)=>[t,n+' → '+names[t+1],!bag[t]]),'steps');
    }else if(sum(c.cost)){
      body+='<p>교환 횟수</p>'+picks(Array.from({length:Math.max(1,Math.min(...c.cost.map((x,t)=>x?Math.floor(bag[t]/x):Infinity)))},(_,j)=>[j+1,(a.n===j+1?'✓ ':'')+(j+1)+'회',!covers(bag,c.cost)]),'n');
      if(!covers(bag,c.cost))body+='<p>교환에 필요한 향신료가 부족합니다.</p>';
    }
  }
  const raw=effect(p,a,g);
  if(raw){
    const remaining=add(raw,a.drop,-1);
    if(sum(raw)>10){
      body+='<p>대상단 정원은 10개입니다. 돌려놓을 향신료 '+Math.max(0,sum(remaining)-10)+'개를 선택하세요.</p>';
      if(sum(remaining)>10)body+=picks(names.map((n,t)=>[t,n+' '+remaining[t],!remaining[t]]),'drop');
    }
    body+='<p class="preview">행동 후 보유 &nbsp;'+chips(remaining,true)+'</p>';
  }
  if(a.pay.length||a.steps.length||sum(a.drop))body+='<button id="undo">선택 초기화</button>';
  body+='<div class="actionConfirm"><button class="primary" id="confirm" '+(!raw||sum(raw)-sum(a.drop)>10?'disabled':'')+'>'+label+'</button></div>';
  modal(title,(a.kind==='rest'?'':'<div class="detailFace">'+face(c,'선택한 카드')+'</div>')+body);
  el('body').querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{
    const field=b.dataset.pick,t=+b.dataset.val;if(field==='drop')a.drop[t]++;else{a.drop=zeros();if(field==='n')a.n=t;else a[field].push(t);}
    if(a.kind==='buy'){
      finishForcedPayment(a,p.bag);
      const bag=effect(p,a,g);
      if(bag)finishForcedReturn(a,bag);
    }
    editor();
  });
  if(el('undo'))el('undo').onclick=()=>start(a.kind,a.i);
  el('confirm').onclick=()=>advance(a);
}
el('rest').onclick=()=>start('rest',0);
function results(){
  const ranks=standings(g);
  const rows=ranks.map(({p,i,points},j)=>'<article class="ranking"><b>'+(j+1)+'위 · '+seatName(i)+(i&&(!online||onlineAI(i))?' ('+levelOf(p)+')':'')+' · '+points+'점</b><p>주문 '+sum(p.won.map(c=>c.vp))+' · 금화 '+3*p.gold+' · 은화 '+p.silver+' · 향신료 '+sum(p.bag.slice(1))+'</p></article>').join('');
  modal(ranks[0].i===mySeat()?'나의 승리':seatName(ranks[0].i)+' 승리',rows+'<p>동점이면 차례가 더 늦은 대상단이 앞섭니다.</p><button class="primary" id="again">다음 대국 설정</button>');
  if(online){el('again').textContent='새 친구 대국 만들기';el('again').onclick=createOnline;}else el('again').onclick=openSetup;
}
const descriptions={Easy:'가까운 주문부터 준비합니다.',Medium:'생산·교환·휴식을 연결해 주문을 준비합니다.',Hard:'여러 경로의 점수와 시장 선점 가능성을 비교합니다.',Hell:'상대의 다음 수와 종국의 점수 차까지 계산합니다.'};
function openSetup(){
  if(online){roomMenu();return;}
  let count=g.players.length;
  const selected=Array.from({length:3},(_,j)=>g.players[j+1]?levelOf(g.players[j+1]):'Medium');
  function draw(){
    const seats=selected.slice(0,count-1).map((level,j)=>'<div class="seat"><label for="level'+j+'">'+seatName(j+1)+'</label><select id="level'+j+'">'+levels.map(l=>'<option '+(l===level?'selected':'')+'>'+l+'</option>').join('')+'</select><small id="info'+j+'">'+descriptions[level]+'</small></div>').join('');
    modal('대국 설정','<p>나를 포함한 참가 인원</p><div class="choices">'+[2,3,4].map(n=>'<button data-count="'+n+'" aria-pressed="'+(count===n)+'" class="'+(count===n?'active':'')+'">'+n+'인</button>').join('')+'</div>'+seats+'<p>'+count+'인전 · 주문 '+(count===4?5:6)+'장 달성 시 마지막 라운드</p>'+(g.log.length&&!g.over?'<small>시작하면 진행 중인 대국을 교체합니다.</small>':'')+'<button class="primary" id="new">AI 대국 시작</button><button class="primary" id="friend">친구 초대 대전</button>');
    el('body').querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{count=+b.dataset.count;draw();});
    selected.slice(0,count-1).forEach((_,j)=>el('level'+j).onchange=e=>{selected[j]=e.target.value;el('info'+j).textContent=descriptions[selected[j]];});
    el('friend').onclick=createOnline;
    el('new').onclick=()=>{stopAI();g=newGame(selected.slice(0,count-1));save();close();render();};
  }
  draw();
}
el('latestMove').onclick=el('history').onclick=()=>{modal('대국 기록','<div id="log"></div>',true);renderHistory();};
el('reset').onclick=()=>{if(online){modal('새 친구 대국','<p>현재 방은 초대 링크로 다시 들어올 수 있습니다.</p><button class="primary" id="createRoom">새 초대방 만들기</button>');el('createRoom').onclick=createOnline;}else openSetup();};el('setupTop').onclick=openSetup;
el('modal').addEventListener('close',()=>{if(!el('modal').open&&el('modal').dataset.observe!=='true')schedule();});
el('guide').onclick=()=>modal('게임 안내','<p><b>목표</b> · 주문을 달성해 가장 많은 점수를 모으세요. 2~3인전은 6장, 4인전은 5장을 누군가 모으면 그 라운드까지 진행합니다.</p><p><b>테이블 조작</b> · 카드를 누르거나 길게 잡아 표시된 곳에 놓고 행동을 확정하세요. 각 시장은 좌우로 넘길 수 있습니다. 상대 상단을 누르면 보유한 카드를 볼 수 있습니다.</p><p><b>첫 수</b> · 손패의 생산 카드를 눌러 강황 2개를 얻거나, 상인 시장에서 첫 카드를 무료로 영입해 보세요.</p><p><b>한 차례에 한 행동</b> · 손패 사용, 상인 영입, 주문 달성, 휴식 중 하나를 선택합니다. 손패를 사용한 뒤에는 휴식으로 다시 가져옵니다.</p><p><b>향신료</b> · 강황 → 사프란 → 카다멈 → 계피 순으로 승급합니다. 교환은 비용이 허락하는 만큼 반복할 수 있습니다.</p><p><b>점수</b> · 주문, 금화(3점), 은화(1점), 남은 강황 이외의 향신료(각 1점)를 더합니다. 동점이면 후순위가 승리합니다.</p>');
function landscape(){
  const cv=el('land'),ctx=cv.getContext('2d');cv.width=1000;cv.height=200;
  const grad=ctx.createLinearGradient(0,0,1000,120);grad.addColorStop(0,'#174746');grad.addColorStop(.55,'#527675');grad.addColorStop(1,'#e3ad72');ctx.fillStyle=grad;ctx.fillRect(0,0,1000,200);
  ctx.fillStyle='#f4d396';ctx.beginPath();ctx.arc(805,61,31,0,Math.PI*2);ctx.fill();
  function ridge(y,color,phase){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,200);for(let x=0;x<=1000;x+=5)ctx.lineTo(x,y+Math.sin(x/97+phase)*16+Math.sin(x/44)*4);ctx.lineTo(1000,200);ctx.fill();}
  ridge(125,'#ad9474',2);
  ctx.fillStyle='#687b6b';
  for(let i=0;i<33;i++){const x=410+i*18,h=15+Math.abs(Math.sin(i*9))*27;ctx.fillRect(x,144-h,22,h);if(i%3===0){ctx.beginPath();ctx.arc(x+11,144-h,11,Math.PI,2*Math.PI);ctx.fill();}if(i%7===0){ctx.fillRect(x,91,5,50);ctx.beginPath();ctx.moveTo(x-2,92);ctx.lineTo(x+2,80);ctx.lineTo(x+7,92);ctx.fill();}}
  ridge(148,'#8c795b',.5);ridge(172,'#4e6257',3);
  const shade=ctx.createLinearGradient(0,0,680,0);shade.addColorStop(0,'#163f3ffc');shade.addColorStop(1,'#163f3f00');ctx.fillStyle=shade;ctx.fillRect(0,0,680,200);
}
landscape();save();render();if(roomIdFromUrl())enterOnline(roomIdFromUrl());else if(firstVisit)openSetup();else if(g.over)results();else schedule();
