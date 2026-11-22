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
const reviewQueue=[];
const review=document.getElementById('playedCard');
let reviewTimer,reviewActor=null,flightActor=null,turnTimer;
function showFlightTurn(actor,duration){
  clearTimeout(turnTimer);flightActor=actor;
  turnTimer=setTimeout(()=>{flightActor=null;render();if(g.over&&!review.open)results();},duration);
}

function stockChangeSummary(before,after,drop){
  const rows=after.map((count,t)=>{
    const delta=count-before[t];
    if(!delta)return '';
    return '<span class="changeRow">'+cube(t)+'<span>'+names[t]+'</span><span>'+before[t]+' → '+count+'</span><b class="'+(delta>0?'gain':'loss')+'">'+(delta>0?'+':'−')+Math.abs(delta)+'</b></span>';
  }).join('');
  const returned=drop&&sum(drop)?'<span class="returned">반납 '+chips(drop)+'</span>':'';
  return '<span class="changeList">'+(rows||'보유 수량 변화 없음')+returned+'</span>';
}
let displayedStock=null;
function markStockChanges(){
  document.querySelectorAll('[data-change]').forEach(node=>node.removeAttribute('data-change'));
  if(!displayedStock)return;
  const {actor,before,after}=displayedStock;
  const cells=actor===mySeat()?el('bag').children:document.querySelectorAll('[data-seat="'+actor+'"] .seatStock .chip');
  after.forEach((count,t)=>{
    const delta=count-before[t];
    if(delta&&cells[t])cells[t].dataset.change=(delta>0?'+':'−')+Math.abs(delta);
  });
}
function animateConversion(entry,cardRect,arrival){
  const {actor,c,action}=entry;
  const layer=document.createElement('div');
  layer.className='conversionLayer';layer.setAttribute('aria-hidden','true');review.append(layer);
  const center=[cardRect.left+cardRect.width/2,cardRect.top+cardRect.height*.36];
  const cells=actor===mySeat()?el('bag').children:document.querySelectorAll('[data-seat="'+actor+'"] .seatStock .chip');
  const seat=actor===mySeat()?el('myTable'):document.querySelector('[data-seat="'+actor+'"]');
  if(c.up){
    animateUpgrade(action.steps,cells,seat,center,layer,arrival);
    return;
  }
  const n=action.n||1,paid=c.cost.map(x=>x*n),made=c.gain.map(x=>x*n);
  const stages=[(sum(paid)?chips(paid)+' → ':'')+chips(made)];
  function travel(t,count,inbound){
    if(!count)return;
    const rect=visibleRect(cells[t])||visibleRect(seat);
    if(!rect)return;
    const stock=[rect.left+rect.width/2,rect.top+rect.height/2];
    const point=[center[0]+(t-1.5)*12,center[1]];
    const token=document.createElement('span');token.className='spiceFlight';
    token.innerHTML=cube(t)+(inbound?' −':' +')+count;layer.append(token);
    const path=flightFrames(inbound?stock:point,inbound?point:stock,token.offsetWidth,token.offsetHeight,1,1,18);
    path[0].opacity=0;path[1].opacity=1;path.at(-2).opacity=1;path.at(-1).opacity=0;
    const delay=arrival+pace((inbound?35:1180)+t*25);
    token.animate(path,{delay,duration:pace(415),fill:'both',easing:'ease-in-out'});
    const amount=cells[t]?.querySelector('b')||cells[t];
    amount?.animate([{transform:'scale(1)'},{transform:inbound?'scale(.65)':'scale(1.4)'},{transform:'scale(1)'}],
      {delay:delay+(inbound?0:pace(330)),duration:pace(250)});
  }
  for(let t=0;t<4;t++){
    // Returned output never enters stock. Spending and returns from existing stock are distinct.
    travel(t,paid[t],true);
    travel(t,Math.max(0,made[t]-(action.drop?.[t]||0)),false);
  }
  const start=sum(paid)?520:100,span=(1160-start)/stages.length;
  stages.forEach((html,i)=>{
    const stage=document.createElement('span');stage.className='conversionStage';
    stage.innerHTML=html;stage.style.left=center[0]+'px';stage.style.top=center[1]+'px';layer.append(stage);
    stage.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.82)'},{opacity:1,offset:.16,transform:'translate(-50%,-50%) scale(1)'},{opacity:1,offset:.88},{opacity:0}],
      {delay:arrival+pace(start+i*span),duration:pace(span),fill:'both'});
  });
}
// Each path follows one physical cube, including a cube upgraded more than once.
function animateUpgrade(steps,cells,seat,center,layer,arrival){
  const paths=[];
  steps.forEach((from,i)=>{
    let path=paths.find(p=>p.types.at(-1)===from);
    if(!path){path={types:[from],changes:[]};paths.push(path);}
    path.types.push(from+1);
    path.changes.push(.31+.36*(i+.5)/steps.length);
  });
  const duration=pace(1900);
  const point=t=>{
    const rect=visibleRect(cells[t])||visibleRect(seat);
    return rect?[rect.left+rect.width/2,rect.top+rect.height/2]:center;
  };
  paths.forEach(({types,changes},i)=>{
    const piece=document.createElement('span');piece.className='upgradePiece';
    piece.innerHTML=types.map(cube).join('');layer.append(piece);
    const x=center[0]+(i-(paths.length-1)/2)*34,y=center[1];
    const size=piece.offsetWidth;
    const inward=flightFrames(point(types[0]),[x,y],size,size,.68,1,15);
    const outward=flightFrames([x,y],point(types.at(-1)),size,size,1,.68,15);
    const frames=[...inward.map((frame,j)=>({...frame,offset:.21*j/12})),
      ...outward.map((frame,j)=>({...frame,offset:.79+.21*j/12}))];
    frames[0].opacity=0;frames[1].opacity=1;frames.at(-2).opacity=1;frames.at(-1).opacity=0;
    const timing={delay:arrival,duration,fill:'both'};
    piece.animate(frames,timing);
    Array.from(piece.children).forEach((symbol,j)=>{
      const start=j?changes[j-1]:0,end=j<changes.length?changes[j]:1;
      const faces=[{offset:0,opacity:j?0:1}];
      if(j)faces.push({offset:start-.035,opacity:0},{offset:start+.035,opacity:1});
      if(end<1)faces.push({offset:end-.035,opacity:1},{offset:end+.035,opacity:0});
      faces.push({offset:1,opacity:end===1?1:0});
      symbol.animate(faces,timing);
    });
  });
}
function showPlayedCard(entry){
  if(review.open){reviewQueue.push(entry);return;}
  const {actor,c,rect,substitute}=entry;
  const card=review.querySelector('button');
  const player=seatName(actor)+(substitute?' · AI 대행':'');
  card.innerHTML=face(c,player+' · 사용')+stockChangeSummary(entry.before,entry.after,entry.drop);
  displayedStock=entry;
  card.setAttribute('aria-label',player+' · '+type(c)+' 카드. '+card.querySelector('.changeList').innerText+'. 누르면 닫기');
  reviewActor=actor;refreshTurn();
  review.showModal();
  const end=card.getBoundingClientRect();
  const arrival=rect&&!matchMedia('(prefers-reduced-motion: reduce)').matches?pace(380):0;
  if(arrival){
    const dx=rect.left+rect.width/2-end.left-end.width/2;
    const dy=rect.top+rect.height/2-end.top-end.height/2;
    card.animate([{transform:'translate('+dx+'px,'+dy+'px) scale('+Math.min(1,rect.width/end.width)+') rotate(-4deg)'},{transform:'none'}],{duration:arrival,easing:'ease-out'});
  }
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)animateConversion(entry,end,arrival);
  reviewTimer=setTimeout(dismissPlayedCard,arrival+pace(2000));
}
function dismissPlayedCard(){
  if(!review.open)return;
  clearTimeout(reviewTimer);
  review.querySelector('.conversionLayer')?.remove();
  review.close();reviewActor=null;displayedStock=null;refreshTurn();
  if(reviewQueue.length){showPlayedCard(reviewQueue.shift());return;}
  if(g.over)results();else if(online)scheduleRoomAI();else schedule();
}
review.onclick=e=>{e.stopPropagation();dismissPlayedCard();};
review.oncancel=e=>{e.preventDefault();dismissPlayedCard();};
// A tap held across the timeout must finish on the review surface.
review.onpointerdown=()=>clearTimeout(reviewTimer);
review.onpointerup=review.onpointercancel=()=>{clearTimeout(reviewTimer);reviewTimer=setTimeout(dismissPlayedCard,350);};
function animateMove(actor,a,{c,rect,artwork,before,marketSource,following,substitute}){
  actionSound(a.kind);
  if(a.kind==='play'){
    showPlayedCard({actor,c,rect,substitute,before,after:g.players[actor].bag.slice(),drop:a.drop,action:a});
    return;
  }
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
  showFlightTurn(actor,pace(950));refreshTurn();
  const layer=el('flightLayer');
  const center=(r,defaultY)=>r?[r.left+r.width/2,r.top+r.height/2]:[innerWidth/2,defaultY];
  const from=center(rect,innerHeight/2),to=center(end,actor===mySeat()?innerHeight-32:40);
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
      card.animate(frames,{delay:pace(180),duration:pace(320),fill:'backwards',easing:'ease-out'});
    });
  }
  const frames=flightFrames(from,to,width,height,1,.62,22);
  frames[0].opacity=1;frames[frames.length-3].opacity=1;frames[frames.length-1].opacity=0;
  node.style.transform=frames[0].transform;
  const anim=node.animate(frames,{fill:'both',duration:pace(950),easing:'ease-in-out'});
  anim.onfinish=()=>{
    node.remove();
    if(stack?.isConnected)stack.animate([{transform:'scale(1.28) rotate(-7deg)'},{transform:'none'}],{duration:pace(240)});
  };anim.oncancel=()=>node.remove();
  // Animate only resources the player actually keeps after paying and returning excess.
  g.players[actor].bag.forEach((count,t)=>{
    const delta=count-before[t];
    if(!delta)return;
    const gaining=delta>0;
    const stock=actor===mySeat()?el('bag').children[t]:dest?.querySelectorAll('.seatStock .chip')[t];
    const target=center(visibleRect(stock)||end,actor===mySeat()?innerHeight-32:40);
    const token=document.createElement('span');
    token.className='spiceFlight';token.setAttribute('aria-hidden','true');
    token.innerHTML=cube(t)+(gaining?' +':' −')+Math.abs(delta);
    layer.append(token);
    const origin=from;
    const cardPoint=[origin[0]+t*6,origin[1]];
    const delay=180+t*55;
    const path=flightFrames(gaining?cardPoint:target,gaining?target:cardPoint,token.offsetWidth,token.offsetHeight,1.1,.85,24);
    const amount=stock?.querySelector('b')||stock;
    amount?.animate([{transform:'scale(1)'},{transform:gaining?'scale(1.4)':'scale(.65)',offset:.45},{transform:'scale(1)'}],
      {duration:pace(490),delay:pace(gaining?delay+400:delay),easing:'ease-in-out'});
    path[0].opacity=0;path[1].opacity=1;path[path.length-1].opacity=1;
    const flight=token.animate(path,{duration:pace(520),delay:pace(delay),easing:'ease-in-out',fill:'both'});
    flight.onfinish=()=>token.remove();
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
