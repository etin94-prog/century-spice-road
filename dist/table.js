"use strict";
const artOf=c=>c.vp?'order':c.up?'upgrade':sum(c.cost)?'trade':'produce';
function face(c,label){
  const art=artOf(c);
  const name=c.vp?c.vp+'점':type(c);
  return '<span class="illustration '+art+'"><small>'+label+'</small></span><span class="cardtext"><strong>'+name+'</strong><span class="recipe">'+(c.vp?chips(c.cost):desc(c))+'</span></span>';
}
function inspectSeat(i){
  const p=g.players[i];
  const groups=[['손패',p.hand],['사용한 카드',p.used],['달성한 주문',p.won]];
  const zones=groups.map(([label,cards])=>'<section><h3>'+label+' · '+cards.length+'장</h3>'+(cards.length?'<div class="row">'+cards.map(c=>'<div class="card">'+face(c,label)+'</div>').join('')+'</div>':'<p class="meta">아직 없습니다.</p>')+'</section>').join('');
  modal(seatName(i)+'의 카드','<p>'+chips(p.bag,true)+' · '+score(p)+'점</p>'+zones);
}
function visibleRect(node){
  if(!node)return null;
  const r=node.getBoundingClientRect();
  if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return null;
  return r;
}
function captureMove(actor,a){
  const p=g.players[actor];
  const c=a.kind==='buy'?g.market[a.i]:a.kind==='order'?g.orders[a.i]:a.kind==='play'?p.hand[a.i]:p.used[p.used.length-1];
  const source=actor&&['play','rest'].includes(a.kind)?document.querySelector('[data-seat="'+actor+'"]'):a.kind==='rest'?el('myTable'):document.querySelector('[data-kind="'+a.kind+'"][data-i="'+a.i+'"]');
  return {c,rect:visibleRect(source),before:p.bag.slice(),used:p.used.length,coin:a.kind==='order'?bonus(g,a.i):null};
}
function animateMove(actor,a,{c,rect}){
  if(!c||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const dest=actor?document.querySelector('[data-seat="'+actor+'"]'):['buy','rest'].includes(a.kind)?el('hand'):el('myTable');
  const end=visibleRect(dest);
  if(a.kind==='buy'||a.kind==='order'){
    const row=el(a.kind==='buy'?'merchants':'orders');
    if(row.children.length===(a.kind==='buy'?6:5))
      row.lastElementChild.animate([{transform:'translateX(18px) rotate(4deg)',opacity:.3},{transform:'none',opacity:1}],{duration:450});
  }
  if(!rect&&!end)return;
  const node=document.createElement('div');node.className='card flying';
  node.innerHTML=face(c,seatName(actor)+' · '+({buy:'영입',play:'사용',rest:'회수',order:'주문 달성'}[a.kind]));
  document.body.append(node);
  const point=(r,fallback)=>r?[Math.max(0,Math.min(innerWidth-96,r.left+(r.width-96)/2)),Math.max(0,Math.min(innerHeight-96,r.top))]:fallback;
  const from=point(rect,[innerWidth/2-48,12]),to=point(end,[innerWidth/2-48,actor?4:innerHeight-96]);
  const move=(v,scale,angle)=>'translate('+v[0]+'px,'+v[1]+'px) rotate('+angle+'deg) scale('+scale+')';
  const anim=node.animate([{transform:move(from,.78,-5),opacity:.7},{offset:.42,transform:move([(from[0]+to[0])/2,(from[1]+to[1])/2-12],1.08,2),opacity:1},{transform:move(to,.65,0),opacity:.2}],{duration:700,easing:'ease-in-out'});
  anim.onfinish=()=>node.remove();anim.oncancel=()=>node.remove();
}

// A short swipe remains native scrolling. Holding lifts a card and reveals
// a reachable landing area even when the player's hand is below the fold.
let gesture=null,suppressClick=false;
function clearGesture(){
  if(!gesture)return;
  clearTimeout(gesture.timer);gesture.ghost?.remove();gesture.zone?.remove();gesture=null;
}
function beginGesture(e,x,y){
  clearGesture();
  const card=e.target.closest('button[data-kind]');
  if(!card||card.disabled||el('modal').open)return;
  const s={card,x,y,kind:card.dataset.kind,i:+card.dataset.i};gesture=s;
  s.timer=setTimeout(()=>{
    s.ghost=card.cloneNode(true);s.ghost.removeAttribute('data-kind');s.ghost.removeAttribute('data-i');s.ghost.classList.add('lifted');s.ghost.setAttribute('aria-hidden','true');
    s.zone=document.createElement('div');s.zone.className='dropzone';s.zone.textContent={buy:'여기에 놓아 손패로 가져오기',play:'여기에 놓아 카드 사용',order:'여기에 놓아 주문 달성'}[s.kind];
    // Keep the target on the opposite half of the screen from the finger.
    s.zone.style[s.y>innerHeight*.6?'top':'bottom']='max(16px, env(safe-area-inset-bottom))';
    document.body.append(s.ghost,s.zone);trackGesture(null,s.x,s.y);
  },310);
}
function inside(zone,x,y){const r=zone.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
function trackGesture(e,x,y){
  const s=gesture;if(!s)return;
  if(!s.ghost){if(Math.hypot(x-s.x,y-s.y)>9)clearGesture();return;}
  if(e?.cancelable)e.preventDefault();
  s.ghost.style.transform='translate('+(x-45)+'px,'+(y-75)+'px) rotate(-6deg)';
  s.zone.classList.toggle('armed',inside(s.zone,x,y));
}
function endGesture(e,x,y){
  const s=gesture;if(!s)return;
  const confirm=s.zone&&inside(s.zone,x,y);
  if(s.ghost){if(e.cancelable)e.preventDefault();suppressClick=true;setTimeout(()=>suppressClick=false,350);}
  clearGesture();if(confirm)start(s.kind,s.i);
}
document.addEventListener('click',e=>{if(suppressClick&&e.target.closest('[data-kind]')){e.preventDefault();e.stopImmediatePropagation();}},true);
document.addEventListener('touchstart',e=>{if(e.touches.length!==1){clearGesture();return;}const t=e.touches[0];beginGesture(e,t.clientX,t.clientY);},{passive:true});
document.addEventListener('touchmove',e=>{const t=e.touches[0];trackGesture(e,t.clientX,t.clientY);},{passive:false});
document.addEventListener('touchend',e=>{const t=e.changedTouches[0];endGesture(e,t.clientX,t.clientY);},{passive:false});
document.addEventListener('touchcancel',clearGesture);
document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0)beginGesture(e,e.clientX,e.clientY);});
document.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')trackGesture(e,e.clientX,e.clientY);});
document.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')endGesture(e,e.clientX,e.clientY);});
document.addEventListener('contextmenu',e=>{if(gesture)e.preventDefault();});
window.addEventListener('blur',clearGesture);
let stageTimer;
function hideAction(){
  clearTimeout(stageTimer);
  document.getElementById('actionStage').hidden=true;
}
function showOpponentMove(actor,a,motion){
  hideAction();
  const c=motion.c,p=g.players[actor],stage=el('actionStage');
  let label,flow;
  if(a.kind==='rest'){label='휴식';flow='사용 더미 '+motion.used+'장 → 손패';}
  if(a.kind==='buy'){
    label='상인 영입';
    flow=a.pay.length?'시장에 '+a.pay.map(t=>cube(t)+names[t]).join(' · ')+' 지불':'첫 상인 무료 영입';
    if(sum(c.pile))flow+=' · '+chips(c.pile)+' 회수';
  }
  if(a.kind==='order'){label=c.vp+'점 주문 달성';flow=chips(c.cost)+' 지불'+(motion.coin?' · '+coinName[motion.coin]+'점':'');}
  if(a.kind==='play'){
    label=type(c);
    if(c.up)flow=a.steps.map(t=>cube(t)+names[t]+' → '+cube(t+1)+names[t+1]).join(' · ');
    else {const n=a.n||1;flow=sum(c.cost)?chips(c.cost.map(x=>x*n))+' → '+chips(c.gain.map(x=>x*n)):chips(c.gain)+' 획득';}
  }
  if(a.drop&&sum(a.drop))flow+=' · '+chips(a.drop)+' 반납';
  stage.innerHTML='<div class="stageCard">'+face(c,a.kind==='rest'?'회수한 카드':label)+'</div><div><b>'+seatName(actor)+' · '+label+'</b><div class="stageFlow">'+flow+'</div><small>보유 '+chips(motion.before,true)+' → '+chips(p.bag,true)+'</small></div>';
  stage.hidden=false;
  stageTimer=setTimeout(hideAction,2000);
}
const fullButton=document.getElementById('fullscreen');
const nativeFull=()=>document.fullscreenElement||document.webkitFullscreenElement;
function updateFullLabel(){fullButton.textContent=nativeFull()||document.body.classList.contains('boardOnly')?'전체화면 종료':'전체화면';}
document.addEventListener('fullscreenchange',updateFullLabel);
document.addEventListener('webkitfullscreenchange',updateFullLabel);
fullButton.onclick=async()=>{
  if(nativeFull()){await (document.exitFullscreen||document.webkitExitFullscreen).call(document);}
  else if(document.body.classList.contains('boardOnly'))document.body.classList.remove('boardOnly');
  else{
    const root=document.documentElement;
    try{await (root.requestFullscreen||root.webkitRequestFullscreen).call(root);}
    catch{document.body.classList.add('boardOnly');}
    if(nativeFull()){try{await screen.orientation.lock('landscape');}catch{}}
  }
  updateFullLabel();
};
