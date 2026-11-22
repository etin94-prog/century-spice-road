"use strict";
const artOf=c=>c.vp?'order':c.up?'upgrade':sum(c.cost)?'trade':'produce';
function face(c,label){
  const art=artOf(c);
  const name=c.vp?c.vp+'점':type(c);
  return '<span class="illustration '+art+'">'+(label?'<small>'+label+'</small>':'')+'</span><span class="cardtext"><strong>'+name+'</strong><span class="recipe">'+(c.vp?chips(c.cost):desc(c))+'</span></span>';
}
function inspectSeat(i){
  const p=g.players[i];
  const groups=[['손패',p.hand],['사용한 카드',p.used],['달성한 주문',p.won]];
  const own=i===mySeat(),canPlay=own&&myTurn()&&!g.over;
  const zones=groups.map(([label,cards],group)=>{
    const tiles=cards.map((c,index)=>own&&group===0
      ? card('collection',c,index,!canPlay)
      : '<div class="card">'+face(c,'')+'</div>').join('');
    return '<section><h3>'+label+' · '+cards.length+'장</h3>'+(tiles?'<div class="collectionGrid">'+tiles+'</div>':'<p class="meta">아직 없습니다.</p>')+'</section>';
  }).join('');
  modal(seatName(i)+'의 카드','<div id="collection" data-seat-index="'+i+'"><p>'+chips(p.bag,true)+' · '+score(p)+'점</p>'+zones+'</div>',true);
  el('collection').querySelectorAll('[data-hand-index]').forEach(button=>{
    button.onclick=()=>playHandCard(+button.dataset.handIndex);
  });
}
function visibleRect(node){
  if(!node)return null;
  const r=node.getBoundingClientRect();
  if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return null;
  return r;
}
function captureMove(actor,a,animate=true){
  const p=g.players[actor];
  const c=a.kind==='buy'?g.market[a.i]:a.kind==='order'?g.orders[a.i]:a.kind==='play'?p.hand[a.i]:p.used[p.used.length-1];
  const source=!animate?null:actor!==mySeat()&&['play','rest'].includes(a.kind)?document.querySelector('[data-seat="'+actor+'"]'):a.kind==='rest'?el('myTable'):document.querySelector('[data-kind="'+a.kind+'"][data-i="'+a.i+'"]');
  const selected=animate&&a.kind==='play'&&actor===mySeat()&&el('modal').open
    ? el('body').querySelector('.detailFace')||el('collection')?.querySelector('[data-hand-index="'+a.i+'"]'):null;
  const marketSource=source?.matches('.marketmat .card')?source:null;
  const following=marketSource?Array.from(marketSource.parentElement.children).slice(a.i+1).map(card=>card.getBoundingClientRect()):[];
  return {marketSource,following,c,artwork:source?.matches('.card')?source.innerHTML:null,rect:visibleRect(selected)||visibleRect(source),before:p.bag.slice(),used:p.used.length,coin:a.kind==='order'?bonus(g,a.i):null};
}
// Sample a shallow arc; the browser interpolates transforms between these points.
function flightFrames(from,to,width,height,startScale,endScale,lift){
  return Array.from({length:13},(_,i)=>{
    const t=i/12,bend=Math.sin(Math.PI*t);
    const x=from[0]+(to[0]-from[0])*t-width/2;
    const y=from[1]+(to[1]-from[1])*t-height/2-lift*bend;
    const scale=startScale+(endScale-startScale)*t;
    return {transform:'translate3d('+x+'px,'+y+'px,0) rotate('+(-4*bend)+'deg) scale('+scale+')'};
  });
}
function animateMove(actor,a,{c,rect,artwork,before,marketSource,following}){
  if(!c||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const dest=actor!==mySeat()?document.querySelector('[data-seat="'+actor+'"]'):['buy','rest'].includes(a.kind)?el('hand'):el('myTable');
  const stack=actor!==mySeat()?dest?.querySelector(a.kind==='order'?'.orderMini':'.cardBack'):null;
  let end=visibleRect(stack)||visibleRect(dest);
  if(actor===mySeat()&&a.kind==='buy'){
    const last=visibleRect(el('hand').lastElementChild);
    if(last&&end&&last.right<=end.right+1&&last.left>=end.left-1)end=last;
    else end=visibleRect(el('handTitle'))||visibleRect(el('myTable'))||end;
  }
  if(!rect&&!end)return;
  const layer=el('flightLayer');
  // render() has detached the selected card. Carry its original face and dimensions.
  const node=marketSource||document.createElement('div');
  node.classList.add('card','flying');
  node.removeAttribute('data-kind');node.removeAttribute('data-i');
  node.tabIndex=-1;node.setAttribute('aria-hidden','true');
  if(!marketSource)node.innerHTML=artwork||face(c,'');
  const width=rect?rect.width:82,height=rect?rect.height:106;
  Object.assign(node.style,{width:width+'px',height:height+'px',minHeight:'0',transformOrigin:'center'});
  layer.append(node);
  if(marketSource){
    const row=el(a.kind==='buy'?'merchants':'orders');
    Array.from(row.children).slice(a.i).forEach((card,j)=>{
      const old=following[j],next=card.getBoundingClientRect();
      const frames=old?[{transform:'translate('+(old.left-next.left)+'px,'+(old.top-next.top)+'px)'},{transform:'none'}]:[{opacity:0},{opacity:1}];
      card.animate(frames,{delay:180,duration:320,fill:'backwards',easing:'ease-out'});
    });
  }
  const center=(r,defaultY)=>r?[r.left+r.width/2,r.top+r.height/2]:[innerWidth/2,defaultY];
  const from=center(rect,innerHeight/2),to=center(end,actor===mySeat()?innerHeight-32:40);
  const playing=a.kind==='play';
  const table=center(visibleRect(el('merchants')),innerHeight*.48);
  const landing=playing?table:to;
  const frames=flightFrames(from,landing,width,height,1,playing?.95:.62,22);
  if(playing){
    frames.forEach((frame,i)=>frame.offset=.42*i/12);
    const laid=frames[12].transform;
    frames.push({transform:laid+' scaleY(.89)',offset:.56,opacity:1},
      {transform:laid+' scale(.72,.67)',offset:.85,opacity:.34},
      {transform:laid+' scale(.36)',offset:1,opacity:0});
  }
  frames[0].opacity=1;if(!playing)frames[frames.length-3].opacity=1;frames[frames.length-1].opacity=0;
  node.style.transform=frames[0].transform;
  const anim=node.animate(frames,{fill:'both',duration:playing?1020:950,easing:'ease-in-out'});
  anim.onfinish=()=>{
    node.remove();
    if(stack?.isConnected)stack.animate([{transform:'scale(1.28) rotate(-7deg)'},{transform:'none'}],{duration:240});
  };anim.oncancel=()=>node.remove();

  // Animate only resources the player actually keeps after paying and returning excess.
  g.players[actor].bag.forEach((count,t)=>{
    const gain=count-before[t];
    if(gain<=0)return;
    const stock=actor===mySeat()?el('bag').children[t]:dest?.querySelectorAll('.seatStock .chip')[t];
    const target=center(visibleRect(stock)||end,actor===mySeat()?innerHeight-32:40);
    const token=document.createElement('span');
    token.className='spiceFlight';token.setAttribute('aria-hidden','true');
    token.innerHTML=cube(t)+' +'+gain;
    layer.append(token);
    const origin=playing?table:from;
    const path=flightFrames([origin[0]+t*6,origin[1]],target,token.offsetWidth,token.offsetHeight,1.1,.85,24);
    path[0].opacity=0;path[1].opacity=1;path[path.length-1].opacity=1;
    const flight=token.animate(path,{duration:520,delay:(playing?510:220)+t*55,easing:'ease-in-out',fill:'both'});
    flight.onfinish=()=>{
      token.remove();
      if(stock?.isConnected)stock.animate([{filter:'brightness(1.35)'},{filter:'none'}],{duration:260});
    };
    flight.oncancel=()=>token.remove();
  });
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
  suppressClick=false;
  const card=e.target.closest('button[data-kind]');
  if(!card||card.disabled||el('modal').open||!myTurn()||g.over)return;
  const s={card,x,y,kind:card.dataset.kind,i:+card.dataset.i};gesture=s;
  s.timer=setTimeout(()=>{s.held=true;},310);
}
function liftGesture(s){
  s.ghost=s.card.cloneNode(true);s.ghost.removeAttribute('data-kind');s.ghost.removeAttribute('data-i');s.ghost.classList.add('lifted');s.ghost.setAttribute('aria-hidden','true');
  s.zone=document.createElement('div');s.zone.className='dropzone';s.zone.textContent={buy:'여기에 놓아 손패로 가져오기',play:'여기에 놓아 카드 사용',order:'여기에 놓아 주문 달성'}[s.kind];
  s.zone.style.top='max(8px, env(safe-area-inset-top))';
  document.body.append(s.ghost,s.zone);
}
function inside(zone,x,y){const r=zone.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
function trackGesture(e,x,y){
  const s=gesture;if(!s)return;
  if(!s.ghost){
    if(Math.hypot(x-s.x,y-s.y)<=9)return;
    if(!s.held){clearGesture();return;}
    liftGesture(s);
  }
  if(e?.cancelable)e.preventDefault();
  const left=Math.max(4,Math.min(innerWidth-s.ghost.offsetWidth-4,x-45));
  const top=Math.max(4,Math.min(innerHeight-s.ghost.offsetHeight-4,y-s.ghost.offsetHeight-12));
  s.ghost.style.transform='translate('+left+'px,'+top+'px) rotate(-6deg)';
  s.zone.classList.toggle('armed',inside(s.zone,x,y));
}
function endGesture(e,x,y){
  const s=gesture;if(!s)return;
  if(s.held&&!s.ghost&&s.card.isConnected){
    if(e.cancelable)e.preventDefault();
    clearGesture();s.card.click();
    suppressClick=true;setTimeout(()=>suppressClick=false,350);
    return;
  }
  const confirm=s.card.isConnected&&s.zone&&inside(s.zone,x,y);
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
window.addEventListener('resize',clearGesture);
function moveFlow(a,motion){
  const c=motion.c??motion.card;
  const spices=bag=>bag.map((n,t)=>n?names[t]+' '+n+'개':'').filter(Boolean).join(', ');
  let label,flow;
  if(a.kind==='rest'){label='휴식';flow='사용한 카드 '+motion.used+'장을 손패로 가져왔어요.';}
  if(a.kind==='buy'){
    label='상인 영입';
    const paid=zeros();
    a.pay.forEach(t=>paid[t]++);
    flow=a.pay.length?spices(paid)+'를 내고 상인을 영입했어요.':'상인을 무료로 영입했어요.';
    if(sum(c.pile))flow+=' 카드에 쌓인 '+spices(c.pile)+'도 받았어요.';
  }
  if(a.kind==='order'){
    label='주문 달성';
    flow=spices(c.cost)+'를 내고 '+c.vp+'점 주문을 달성했어요.';
    if(motion.coin)flow+=' '+(motion.coin==='gold'?'금화 1개(+3점)':'은화 1개(+1점)')+'도 받았어요.';
  }
  if(a.kind==='play'){
    label=type(c);
    if(c.up)flow=a.steps.map(t=>names[t]+' → '+names[t+1]).join(', ')+' 순서로 승급했어요.';
    else {
      const n=a.n||1;
      flow=sum(c.cost)?spices(c.cost.map(x=>x*n))+'를 내고 '+spices(c.gain.map(x=>x*n))+'를 받았어요.':spices(c.gain)+'를 얻었어요.';
    }
  }
  if(a.drop&&sum(a.drop))flow+=' '+spices(a.drop)+'를 반납했어요.';
  return {label,flow};
}
const fullButton=document.getElementById('fullscreen');
const nativeFull=()=>document.fullscreenElement||document.webkitFullscreenElement;
function updateFullLabel(){
  const boardOnly=document.body.classList.contains('boardOnly');
  fullButton.textContent=nativeFull()?'전체화면 종료':boardOnly?'보드 모드 종료':'전체화면';
  fullButton.setAttribute('aria-pressed',String(!!nativeFull()||boardOnly));
}
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
