"use strict";
const el=id=>document.getElementById(id),names=['강황','사프란','카다멈','계피'],key='century-duel-1';
let g,tab='order',draft=null,timer;
try{g=JSON.parse(localStorage.getItem(key));}catch{}
if(!g?.players)g=newGame();
function save(){try{localStorage.setItem(key,JSON.stringify(g));el('save').textContent='이 기기에 자동 저장됨';}catch{el('save').textContent='저장 공간 사용 불가';}}
const cube=t=>'<i aria-hidden="true" class="cube s'+t+'"></i>';
const chips=(bag,all=false)=>'<span class="chips">'+bag.map((n,t)=>n||all?'<span class="chip" aria-label="'+names[t]+' '+n+'개" title="'+names[t]+'">'+cube(t)+n+'</span>':'').join('')+'</span>';
const type=c=>c.up?'승급':sum(c.cost)?'교환':'생산';
const desc=c=>c.up?'최대 '+c.up+'단계':sum(c.cost)?chips(c.cost)+' → '+chips(c.gain):chips(c.gain)+' 획득';
const coinName={gold:'금화 +3',silver:'은화 +1'};
function card(kind,c,i){
  const order=kind==='order';
  let top=order?(coinName[bonus(g,i)]||'주문서'):kind==='buy'?(i?'영입 비용 '+i+'개':'무료 영입'):'손패';
  return '<button class="card '+(order?'':'merchant')+'" data-kind="'+kind+'" data-i="'+i+'"><span class="grade">'+top+'</span><strong>'+(order?c.vp+'점':type(c))+'</strong><span>'+(order?chips(c.cost):desc(c))+'</span>'+(kind==='buy'&&sum(c.pile)?'<small>쌓인 자원 '+chips(c.pile)+'</small>':'')+'</button>';
}
function render(){
  const [p,ai]=g.players;
  el('status').innerHTML='<span>라운드 '+g.round+(p.won.length===6&&!g.over?' · 마지막 라운드':'')+'</span><b class="turn">'+(g.over?'대국 종료':g.turn?'상대가 생각 중…':'나의 차례')+'</b>';
  el('rival').innerHTML='<div class="rivalhead"><b>상대 대상단 <small>· Medium AI</small></b><span>'+score(ai)+'점</span></div><p>'+chips(ai.bag,true)+' &nbsp; · &nbsp; 주문 '+ai.won.length+'/6장</p><p>'+(g.log.find(x=>x.who===1)?.msg||'첫 교역을 기다리는 중')+'</p>';
  el('myScore').textContent=score(p)+'점 · 주문 '+p.won.length+'/6장';
  el('bag').innerHTML=p.bag.map((n,t)=>'<div class="stock"><b>'+cube(t)+n+'</b><small>'+names[t]+'</small></div>').join('');
  el('handTitle').textContent='손패 '+p.hand.length+'장';
  el('hand').innerHTML=p.hand.map((c,i)=>card('play',c,i)).join('')||'<p>휴식하면 사용한 카드를 모두 회수합니다.</p>';
  el('rest').textContent='휴식 · '+p.used.length+'장 회수';el('rest').disabled=!!(g.over||g.turn||!p.used.length);
  el('row').innerHTML=(tab==='order'?g.orders:g.market).map((c,i)=>card(tab,c,i)).join('');
  el('ot').className=tab==='order'?'active':'';el('mt').className=tab==='buy'?'active':'';
  document.querySelectorAll('[data-kind]').forEach(b=>{b.disabled=!!(g.turn||g.over);b.onclick=()=>start(b.dataset.kind,+b.dataset.i);});
  el('log').innerHTML=g.log.map(x=>'<p>'+x.round+'R · '+(x.who?'상대':'나')+' · '+x.msg+'</p>').join('')||'<p>아직 진행한 행동이 없습니다.</p>';
  if(g.over){el('status').innerHTML+='<button id="results">결과 보기</button>';el('results').onclick=results;}
}
function modal(title,body){el('title').textContent=title;el('body').innerHTML=body;if(!el('modal').open)el('modal').showModal();}
const close=()=>el('modal').close();
el('close').onclick=close;
el('ot').onclick=()=>{tab='order';render();};el('mt').onclick=()=>{tab='buy';render();};
function advance(a){
  if(!apply(g,a))return;
  close();save();render();if(g.over)results();else schedule();
}
function schedule(){
  clearTimeout(timer);
  if(!g.over&&g.turn)timer=setTimeout(()=>advance(medium(g)),550);
}
function start(kind,i){
  if(g.over||g.turn)return;
  draft={kind,i,pay:[],steps:[],n:1,drop:zeros()};editor();
}
function picks(list,fn){return '<div class="choices">'+list.map(([id,label,disabled])=>'<button data-pick="'+fn+'" data-val="'+id+'" '+(disabled?'disabled':'')+'>'+label+'</button>').join('')+'</div>';}
function editor(){
  const a=draft,p=g.players[0],c=(a.kind==='play'?p.hand:a.kind==='buy'?g.market:g.orders)[a.i];
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
  body+='<button class="primary" id="confirm" '+(!raw||sum(raw)-sum(a.drop)>10?'disabled':'')+'>'+label+'</button>';
  modal(title,body);
  el('body').querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{
    const field=b.dataset.pick,t=+b.dataset.val;if(field==='drop')a.drop[t]++;else{a.drop=zeros();if(field==='n')a.n=t;else a[field].push(t);}editor();
  });
  if(el('undo'))el('undo').onclick=()=>start(a.kind,a.i);
  el('confirm').onclick=()=>advance(a);
}
el('rest').onclick=()=>start('rest',0);
function results(){
  const [p,ai]=g.players,win=score(p)>score(ai);
  const detail=q=>'주문 '+sum(q.won.map(c=>c.vp))+'점 · 금화 '+3*q.gold+'점 · 은화 '+q.silver+'점 · 남은 향신료 '+sum(q.bag.slice(1))+'점';
  modal(win?'나의 승리':'상대의 승리','<h3>나 '+score(p)+'점</h3><p>'+detail(p)+'</p><h3>Medium AI '+score(ai)+'점</h3><p>'+detail(ai)+'</p>'+(score(p)===score(ai)?'<p>동점이므로 후순위인 상대가 승리합니다.</p>':'')+'<button class="primary" id="again">다시 대결</button>');
  el('again').onclick=reset;
}
function reset(){clearTimeout(timer);g=newGame();tab='order';save();close();render();}
el('reset').onclick=()=>{modal('새 대국','<p>현재 대국을 마치고 새로 섞은 카드로 시작할까요?</p><button id="new" class="primary">새 대국 시작</button>');el('new').onclick=reset;};
el('guide').onclick=()=>modal('게임 안내','<p><b>목표</b> · 주문을 달성해 가장 많은 점수를 모으세요. 누군가 6장을 모으면 그 라운드까지 진행합니다.</p><p><b>첫 수</b> · 손패의 생산 카드를 눌러 강황 2개를 얻거나, 시장의 상인 탭에서 첫 카드를 무료로 영입해 보세요.</p><p><b>한 차례에 한 행동</b> · 손패 사용, 상인 영입, 주문 달성, 휴식 중 하나를 선택합니다. 손패를 사용한 뒤에는 휴식으로 다시 가져옵니다.</p><p><b>향신료</b> · 강황 → 사프란 → 카다멈 → 계피 순으로 승급합니다. 교환은 비용이 허락하는 만큼 반복할 수 있습니다.</p><p><b>점수</b> · 주문, 금화(3점), 은화(1점), 남은 강황 이외의 향신료(각 1점)를 더합니다. 동점이면 후순위가 승리합니다.</p>');
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
landscape();save();render();if(g.over)results();else schedule();
