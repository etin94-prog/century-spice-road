"use strict";
const el=id=>document.getElementById(id);
const tableId=roomIdFromUrl(),mark=tableId?.slice(0,8);
const params=new URL(location.href).searchParams;
const markedCombo=tableId?.[12]==='e'?tableId.slice(8,12):null;
const combo=tableId?({'c012':12,'c013':13,'c123':123}[markedCombo]||0):([12,13,123].includes(Number(params.get('combo')))?Number(params.get('combo')):0);
const edition=combo?(combo===12?2:3):mark==='ce000003'?3:mark==='ce000002'?2:Number(new URL(location.href).searchParams.get('edition'))===3?3:2;
if(tableId&&!['ce000002','ce000003'].includes(mark))location.replace('index.html'+location.search);
const info={...expeditionInfo[edition],...(combo?{name:mixNames[combo]}:{})}, storageKey='century-expedition-v1-'+(combo||edition);
const newGame=(roles=['Medium'],random=Math.random)=>combo?newMix(combo,roles,random):newExpedition(edition,roles,random);
const review={get open(){return flightActor!==null;}};
let g,flightActor=null,timer=null,worker=null,motionTimer=null,draft=null;
try{g=JSON.parse(localStorage.getItem(storageKey));}catch{}
const fresh=!g||g.edition!==edition;if(fresh)g=newGame();
const mySeat=()=>online?.seat??0;
const myTurn=()=>!g.over&&g.turn===mySeat()&&flightActor===null&&(!online||online.ready&&online.connected&&!online.pending);
const seatName=i=>i===mySeat()?'나':online&&!onlineAI(i)?'친구 '+(i+1):'상단 '+(i+1);
const colors=['#edc568','#74c8ca','#f69b82','#c7a9df'];
const bonusLabel=b=>({move:'무료 항해 +1',upgrade:'건설 후 승급',harvest:'수확 고추 +1',cargo:'적재 +3',points:'승점 타일',crew:'정착민 보너스',fixed:'승점 +3'}[b]??(typeof b==='number'?b+'점':b.startsWith('icon')?benefitNames[+b.at(-1)]+' 문양':b.startsWith('pair')?benefitNames[+b[4]]+'·'+benefitNames[+b[5]]+' 한 쌍':b));
const goods=(bag,all=false)=>'<span class="goods">'+bag.map((n,t)=>n||all?'<span title="'+info.goods[t]+'" aria-label="'+info.goods[t]+' '+n+'"><i class="cube s'+t+'"></i>'+n+'</span>':'').join('')+'</span>';
const wordBag=bag=>bag.map((n,i)=>n?info.goods[i]+' '+n:'').filter(Boolean).join(' · ')||'없음';
const siteName=(t,i)=>t.port?'항구 '+(g.ports.indexOf(i)+1):t.fort?'요새 '+(i+1):edition===2?info.goods[t.suit]+' 섬 '+(i+1):t.name;
const flow=recipe=>recipe.split('/').map(s=>goods(unitBag(s))).join(' → ');
const helpNames=['통','칼','악수'];
function cardBenefit(c){return c[2]===0?helpNames[c[3]]+' 장소 · 일꾼 1명 할인':c[2]===1?info.goods[c[3]]+' 생산지 · '+info.goods[c[4]]+' +1':c[2]===2?'정착민 +'+c[3]:'탐험 타일 1개 획득';}
const landCells=[0,1,2,3,4,5,6,7,8,9,10,12,13,16,17,20,21,14,15,18,19,22,23];
const series=()=>'<nav class="series" aria-label="시리즈"><a href="index.html">모드 선택</a><a href="spice.html">Ⅰ 향신료의 길</a><a href="expedition.html?edition=2">Ⅱ 동방의 바다</a><a href="expedition.html?edition=3">Ⅲ 신대륙의 개척자</a></nav>';
function modal(title,body){el('title').textContent=title;el('body').innerHTML=body;if(!el('modal').open)el('modal').showModal();}
function close(){el('modal').close();draft=null;}
el('close').onclick=close;
function save(){if(!online)try{localStorage.setItem(storageKey,JSON.stringify(g));}catch{}}
let nextPriority=null;
function inventory(i){
  const p=g.players[i],own=i===mySeat(),hide=edition===2&&!own&&!g.over;
  const order=nextPriority||p.priority||[0,1,2,3];
  modal(seatName(i)+'의 보유 현황','<p>'+wordBag(p.bag)+'</p><p>납품 '+p.won.length+'건'+(hide?'':' · '+expScore(g,p)+'점')+'</p><p>'+(edition===2?'교역소 '+p.tracks.join(' / ')+' · 적재 한도 '+capacity(p):'정착민 '+p.ready+' / '+p.crew+' · 탐험 '+p.explored.length+'곳')+'</p><p>보너스 · '+(p.bonus.map(bonusLabel).join(', ')||'없음')+'</p>'+(own&&edition===2&&!g.over?'<p>통행료로 선창이 넘치면 앞 재료부터 반납합니다. 다음 내 행동부터 적용됩니다.</p><div class="actions">'+order.map(t=>'<button data-priority="'+t+'">'+info.goods[t]+' ↑</button>').join('')+'</div>':'')+(hide?'':p.won.map(c=>'<p>'+c[1]+'점 · '+goods(unitBag(c[0]))+(edition===3?' · '+cardBenefit(c):'')+'</p>').join('')));
  el('body').querySelectorAll('[data-priority]').forEach(b=>b.onclick=()=>{const k=+b.dataset.priority;nextPriority=[k,...order.filter(t=>t!==k)];inventory(i);});
}
function siteFace(t,i){
  if(t.order)return '<strong>'+siteName(t,i)+' · '+t.order[1]+'점</strong>'+goods(unitBag(t.order[0]))+(edition===3?'<small>'+benefitNames[t.order[2]]+'</small>':'');
  if(t.port)return '<strong>폐쇄 항구</strong>';
  if(t.fort)return '<strong>'+siteName(t,i)+'</strong>';
  if(t.cover)return '<strong>탐험지 '+(i-3)+'</strong><small>'+exploreName(t.cover)+'</small>';
  return '<strong>'+siteName(t,i)+'</strong>'+(t.industry===1?'↑ '+t.recipe:flow(t.recipe));
}
function exploreName(x){return /^\d+$/.test(x)?wordBag(unitBag(x)):x==='points'?'3점':x==='crew'?'정착민 +1':benefitNames[+x.at(-1)]+' 문양';}
function render(){
  if(g.combo)return renderMix();
  const active=flightActor??g.turn,p=g.players[mySeat()]||g.players[0];
  el('status').textContent='Century '+(edition===2?'Ⅱ':'Ⅲ')+' · '+(g.departures?'출항':g.round+'R');
  el('latestMove').textContent=g.log[0]?seatName(g.log[0].who)+' · '+g.log[0].msg:info.name;
  el('seats').innerHTML=g.players.map((q,i)=>'<button class="player '+(!g.over&&active===i?'activeTurn':'')+'" data-seat="'+i+'" style="--seat:'+colors[i]+'"><b>'+seatName(i)+'</b> '+goods(q.bag,true)+' <small>'+q.won.length+'/'+info.goal+'</small></button>').join('');
  el('seats').querySelectorAll('button').forEach(b=>b.onclick=()=>inventory(+b.dataset.seat));
  el('atlas').className=edition===2?'sea':'land';
  el('atlas').innerHTML=g.tiles.map((t,i)=>{
    const markers=edition===2?g.players.map((q,j)=>q.boat===i?piece(j,'⛵'):'').join(''):t.occupant?piece(t.occupant.seat,t.occupant.n+'명'):'';
    const pos=edition===2?'style="grid-column:'+(t.col+1)+';grid-row:'+(t.y+1)+' / span 2"':'style="grid-column:'+(landCells[i]%4+1)+';grid-row:'+(Math.floor(landCells[i]/4)+1)+'"';
    return '<button class="site '+(t.port?'port':t.fort?'fort':t.cover?'covered':'')+'" data-site="'+i+'" '+pos+'>'+siteFace(t,i)+(edition===3?'<small>♟ '+workerCost(p,t)+'</small>':t.owners.length?'<small>교역소 '+t.owners.map(j=>j+1).join('·')+'</small>':'')+'<span class="pieces">'+markers+'</span></button>';
  }).join('');
  el('atlas').querySelectorAll('button').forEach(b=>b.onclick=()=>openSite(+b.dataset.site));
  el('myTitle').textContent=edition===2?'나의 선창':'나의 정착지';
  el('inventory').innerHTML=p.bag.map((n,i)=>'<span><i class="cube s'+i+'"></i> '+info.goods[i]+' '+n+'</span>').join('');
  el('personal').innerHTML='<b>'+(g.over?'대국 종료':seatName(active)+'의 차례')+'</b><br>'+expScore(g,p)+'점 · '+(edition===2?'교역소 '+total(p.tracks)+'곳':'정착민 '+p.ready+'/'+p.crew+'명')+' · 납품 '+p.won.length+'/'+info.goal+'<br>'+(g.departures?'시작할 섬과 화물을 선택하세요.':edition===2?'목적지 섬이나 항구를 누르세요.':'일할 장소 또는 요새를 누르세요.')+(edition===3&&g.deck.length?'<p>다음 승점 카드 · '+g.deck.at(-1)[1]+'점<br>'+goods(unitBag(g.deck.at(-1)[0]))+'</p>':'');
  el('workerPool').hidden=edition!==3;
  el('workerPool').textContent='♟ '+p.ready+'명 · 끌어 배치';
  el('rest').hidden=edition!==3;el('rest').disabled=!myTurn()||p.ready===p.crew;
  el('ledger').textContent=g.over?'최종 결과':'내 보유 현황';
  el('save').textContent=online?(online.connected?'초대방':'다시 연결 중')+' · '+(mySeat()+1)+'번 좌석':'이 기기에 자동 저장됨';
}
let dragging=null,suppressTap=false;
document.addEventListener('pointerdown',e=>{
  const source=e.target.closest('#workerPool,.piece[data-owner]');
  if(!source||!myTurn()||el('modal').open)return;
  if(source.id!=='workerPool'&&(edition!==2||+source.dataset.owner!==mySeat()))return;
  dragging={id:e.pointerId,x:e.clientX,y:e.clientY,source};source.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove',e=>{
  if(dragging?.id!==e.pointerId)return;
  if(!dragging.ghost&&Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)>7){
    const ghost=document.createElement('span');ghost.className='dragPiece';ghost.textContent=edition===2?'⛵':'♟';document.body.append(ghost);dragging.ghost=ghost;
  }
  if(!dragging.ghost)return;
  dragging.ghost.style.left=e.clientX+'px';dragging.ghost.style.top=e.clientY+'px';
  dragging.target?.classList.remove('route');dragging.target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-site]');dragging.target?.classList.add('route');
});
function endDrag(e){
  if(dragging?.id!==e.pointerId)return;
  const {ghost,target}=dragging;dragging=null;ghost?.remove();target?.classList.remove('route');
  if(ghost&&e.type==='pointerup'&&myTurn()){suppressTap=true;setTimeout(()=>suppressTap=false,350);if(target)openSite(+target.dataset.site);}
}
document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
document.addEventListener('click',e=>{if(suppressTap){e.preventDefault();e.stopImmediatePropagation();}},true);
function piece(i,text){return '<span class="piece" data-owner="'+i+'" style="--seat:'+colors[i]+'">'+text+(edition===2?i+1:'')+'</span>';}
function optionsLabel(c,t){
  let label=actNames[c.kind];
  if(c.kind==='depart')return wordBag(c.bag);
  if(c.build&&c.kind==='trade')label='건설 후 교역';
  if(c.n)label+=' ×'+c.n;
  if(c.steps?.length)label+=' · '+c.steps.map(k=>goods(unitBag(String(k)))+' → '+goods(unitBag(String(k+1)))).join(' / ');
  if(c.kind==='upgrade'&&!c.steps?.length)label+=' 없이 배치';
  if(c.prize)label+=' · '+bonusLabel(c.prize);
  if(c.stack>=0)label+=' · '+bonusLabel(t.stacks[c.stack].at(-1));
  if(c.explore>=0)label+=' · '+siteName(g.tiles[c.explore],c.explore)+' 탐험 ('+exploreName(g.tiles[c.explore].cover)+')';
  return label;
}
function openSite(i,opts={}){
  if(g.combo)return openMix(i,opts);
  const t=g.tiles[i],p=g.players[mySeat()],arrival=edition===2&&!g.departures?seaArrival(g,i,opts):null;
  const options=myTurn()?actionsAt(g,i,opts):[];
  let detail=siteFace(t,i);
  if(g.departures){
    detail+='<p>이 섬에서 출항합니다. 남은 화물 조합 하나를 선택하세요. 마지막 좌석부터 역순으로 출항합니다.</p>';
  }else if(edition===2){
    const path=opts.path??seaPath(g,p.boat,i);
    detail+='<p>항로 '+[p.boat,...path].map(n=>n+1).join(' → ')+' · '+(arrival?'항해 지불 '+arrival.paid.length+'개':'지불 재료 부족')+'</p>';
    if(myTurn())detail+='<button id="editRoute">항로·지불 재료 선택</button>';
  }else detail+='<p>필요한 정착민 '+workerCost(p,t)+'명 · 대기 '+p.ready+'명 · '+helpNames[t.help]+' 문양</p>'+(t.order?'<p>'+cardBenefit(t.order)+'</p>':'');
  modal(siteName(t,i),detail+'<div class="actions">'+options.map((c,j)=>'<button data-option="'+j+'">'+optionsLabel(c,t)+'</button>').join('')+'</div>'+(!options.length?'<p>'+(myTurn()?'현재 이곳에서 수행할 수 있는 행동이 없습니다.':seatName(g.turn)+'의 차례입니다.')+'</p>':''));
  draft={i,opts};if(el('editRoute'))el('editRoute').onclick=()=>editRoute(i,opts);
  el('body').querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{
    const option=+b.dataset.option,c=options[option],a={edition,i,option,kind:c.kind,...opts};

    const limit=capacity(p)+(c.prize==='cargo'?3:0);
    if(total(c.bag)>limit)discard(a,c.bag,limit);else advance(a);
  });
}
function editRoute(i,previous){
  const p=g.players[mySeat()],route=(previous.path??seaPath(g,p.boat,i)).slice();
  let pay=(previous.pay||[]).slice(),buildPay=(previous.buildPay||[]).slice(),collect=previous.collect!==false;
  function draw(){
    const last=route.at(-1)??p.boat,t=g.tiles[last],opts={path:route,pay,buildPay,collect};
    const ar=seaArrival(g,last,opts);
    const free=1+p.bonus.filter(x=>x==='move').length;
    const fees=Math.max(0,route.length-free)+(route.length&&!t.port?g.players.filter((q,j)=>j!==mySeat()&&q.boat===last).length:0);
    const price=!t.port&&!t.owners.includes(mySeat())?t.owners.length*(g.players.length===2?2:1):0;
    const panel=(id,bag,choices,n)=>n?'<h3>'+({pay:'항해·통행료',buildPay:'교역소 건설비'}[id])+' · '+n+'개</h3><p>'+(choices.map(k=>info.goods[k]).join(' → ')||'낮은 단계부터 자동 지불')+'</p><div class="actions">'+bag.map((amount,k)=>'<button data-fee="'+id+'" data-spice="'+k+'" '+(choices.length>=n||choices.filter(x=>x===k).length>=amount?'disabled':'')+'>'+goods(unitBag(String(k)))+'</button>').join('')+'<button data-clear="'+id+'">다시 선택</button></div>':'';
    const next=g.tiles.map((t,k)=>neighbors(g,last,k)?'<button data-next="'+k+'">'+siteName(t,k)+'</button>':'').join('');
    modal('항로 선택','<p>'+[p.boat,...route].map(k=>siteName(g.tiles[k],k)).join(' → ')+'</p><div class="actions">'+next+'<button id="undo">한 칸 취소</button></div>'+panel('pay',p.bag,pay,fees)+panel('buildPay',ar?.bag||blank(),buildPay,price)+'<label><input type="checkbox" id="collect" '+(collect?'checked':'')+'> 도착지에 놓인 재료 회수</label><button class="primary" id="landHere" '+(!ar?'disabled':'')+'>이곳에서 행동 선택</button>');
    el('body').querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>{if(route.length>=free+total(p.bag))return;route.push(+b.dataset.next);pay=[];buildPay=[];draw();});
    el('undo').onclick=()=>{route.pop();pay=[];buildPay=[];draw();};
    el('body').querySelectorAll('[data-fee]').forEach(b=>b.onclick=()=>{(b.dataset.fee==='pay'?pay:buildPay).push(+b.dataset.spice);draw();});
    el('body').querySelectorAll('[data-clear]').forEach(b=>b.onclick=()=>{if(b.dataset.clear==='pay')pay=[];else buildPay=[];draw();});
    el('collect').onchange=e=>{collect=e.target.checked;draw();};el('landHere').onclick=()=>openSite(last,opts);
  }draw();
}
function discard(a,bag,limit,submit=advance){
  const left=bag.slice(),paid=[];
  function draw(){modal('반납할 재료 선택','<p>'+ (total(left)-limit)+'개 남음</p><div class="actions">'+left.map((n,i)=>'<button data-drop="'+i+'" '+(!n?'disabled':'')+'>'+info.goods[i]+' '+n+'</button>').join('')+'</div>');
    el('body').querySelectorAll('[data-drop]').forEach(b=>b.onclick=()=>{
      if(!myTurn())return;
      const k=+b.dataset.drop;
      if(total(left)===limit+1){
        const buttons=[...el('body').querySelectorAll('[data-drop]:enabled')];
        buttons.forEach(button=>button.disabled=true);
        Promise.resolve(submit({...a,discard:[...paid,k]})).finally(()=>{
          buttons.forEach(button=>button.disabled=false);
        });
      }else{left[k]--;paid.push(k);draw();}
    });}
  draw();
}
function captureMove(who,a,animate=true){
  if(g.combo)return {before:g.players[who].bag.slice(),path:[],who,i:a.i,origin:animate?mixOrigin(a.i):null};
  const p=g.players[who],t=g.tiles[a.i];
  const path=animate&&edition===2&&!g.departures&&t?[p.boat,...(a.path??seaPath(g,p.boat,a.i))]:[];
  return {before:p.bag.slice(),path,bumped:t?.occupant?.seat,i:a.i,who};
}
function recordMove(){}
function advance(a,remote=false,sub=false){
  if(!remote&&g.turn===mySeat()&&(edition===2||combo===123)&&nextPriority)a={...a,priority:nextPriority.slice()};
  if(online&&!remote)return submitOnline(a);
  const who=g.turn,m=captureMove(who,a);if(!apply(g,a))return;
  if(sub)g.log[0].msg='AI 대행 · '+g.log[0].msg;
  if(g.combo){mixRefresh=false;delete g.stagedRefresh;}
  close();save();flightActor=who;render();playMotion(who,a,m);
}
function point(n){const r=n.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];}
function finishMotion(){
  clearTimeout(motionTimer);el('motion').replaceChildren();flightActor=null;render();
  if(g.over)results();else if(online)scheduleRoomAI();else schedule();
}
function playMotion(who,a,m){
  clearTimeout(motionTimer);const layer=el('motion');layer.replaceChildren();
  actionSound(a.kind==='order'?'order':a.kind==='rest'?'rest':'play');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){motionTimer=setTimeout(finishMotion,pace(200));return;}
  const seat=point(el('seats').children[who]),site=m.origin||(g.combo?mixOrigin(a.i):point(el('atlas').children[a.i])),center=[innerWidth/2,innerHeight/2];
  function fly(cls,html,points,offsets,duration){
    const n=document.createElement('div');n.className=cls;n.innerHTML=html;layer.append(n);
    n.animate(points.map(([x,y],i)=>({left:x+'px',top:y+'px',offset:offsets[i]})),{duration:pace(duration),fill:'both',easing:'ease-in-out'});
  }
  if(m.path.length>1){
    const points=m.path.map(i=>point(el('atlas').children[i]));
    fly('motionCube','⛵ '+seatName(who),points,points.map((_,i)=>i/(points.length-1)),500);
  }else if(edition===3&&a.kind!=='rest'){
    fly('motionCube','♟ '+seatName(who),[seat,site],[0,1],350);
    if(m.bumped!==undefined)fly('motionCube','♟ 회수',[site,point(el('seats').children[m.bumped])],[0,1],450);
  }
  fly('motionTile '+(edition===2?'seaFace':'landFace'),seatName(who)+' · '+g.log[0].msg,[site,center,center,seat],[0,.12,.88,1],2600);
  g.players[who].bag.forEach((n,i)=>{const delta=n-m.before[i];if(!delta)return;
    const mid=[center[0]+(i-1.5)*43,center[1]+38];
    const cell=who===mySeat()?el('inventory').children[i]:el('seats').children[who].querySelector('.goods').children[i];
    const home=point(cell);
    fly('motionCube','<i class="cube s'+i+'"></i> '+(delta>0?'+':'')+delta,delta>0?[mid,mid,home,home]:[home,mid,mid,mid],delta>0?[0,.58,.90,1]:[0,.34,.75,1],2500);
  });
  motionTimer=setTimeout(finishMotion,pace(2600));
}
document.addEventListener('click',e=>{if(flightActor!==null&&!el('modal').open){e.stopPropagation();finishMotion();}},true);
function stopAI(){clearTimeout(timer);if(worker){worker.terminate();worker=null;}}
function schedule(){
  stopAI();if(online||g.over||!g.turn||flightActor!==null||el('modal').open)return;
  timer=setTimeout(()=>{worker=new Worker('expedition-worker.js?v=mobile-audit');worker.onmessage=e=>{stopAI();advance(e.data);};
    worker.onerror=()=>{stopAI();advance(chooseMove(g));};worker.postMessage(g);},pace(650));
}
function results(){modal('최종 순위',expRanks(g).map((r,j)=>'<p class="rank"><b>'+(j+1)+'위 · '+seatName(r.i)+' · '+r.points+'점</b>　납품 '+g.players[r.i].won.length+'건</p>').join('')+'<button id="again">새 대국</button>');el('again').onclick=online?createOnline:setup;}
function setup(){
  if(online){roomMenu();return;}let n=g.players.length;const roles=Array.from({length:3},(_,j)=>g.players[j+1]?.level||'Medium');
  function draw(){modal(info.name+' · 대국 설정',series()+''+(combo?'<p>'+mixGuide[combo]+'</p>':'')+'<div class="choices">'+[2,3,4].map(i=>'<button data-count="'+i+'" aria-pressed="'+(i===n)+'">'+i+'인</button>').join('')+'</div>'+roles.slice(0,n-1).map((l,i)=>'<div class="seat"><label for="l'+i+'">상단 '+(i+2)+'</label><select id="l'+i+'">'+levels.map(v=>'<option '+(l===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div>').join('')+'<button class="primary" id="new">AI 대국 시작</button><button id="friend" class="primary">친구 초대 대전</button>');
    el('body').querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{n=+b.dataset.count;draw();});roles.slice(0,n-1).forEach((_,i)=>el('l'+i).onchange=e=>roles[i]=e.target.value);
    el('new').onclick=()=>{stopAI();g=newGame(roles.slice(0,n-1));if(combo){mixRefresh=false;mixTab='board';}close();save();render();schedule();};el('friend').onclick=createOnline;
  }draw();
}
el('setupTop').onclick=setup;el('ledger').onclick=()=>g.over?results():inventory(mySeat());
el('rest').onclick=()=>{if(myTurn())advance({edition,kind:'rest',i:0});};
el('guide').onclick=()=>modal(info.name,series()+'<p>'+(edition===2?'섬을 눌러 항로를 확인하세요. 첫 이동은 무료입니다. 수확으로 생강을 모으고 교역소를 건설해 재료를 교환하세요. 항구의 요구 재료를 납품하세요. 누군가 4건을 납품하면 해당 라운드 후 종료합니다.':'장소를 눌러 정착민을 보내세요. 자기 일꾼이 있는 장소에는 들어갈 수 없습니다. 다른 사람의 일꾼보다 한 명 더 보내면 상대 일꾼이 돌아갑니다. 요새에서 주문과 보너스를 받고 필요하면 일꾼을 회수하세요. 8번째 주문이 나온 라운드에 종료합니다.')+'</p>');
el('latestMove').onclick=()=>modal('대국 기록',g.log.map(x=>'<p>'+x.round+'R · '+seatName(x.who)+' · '+x.msg+'</p>').join('')||'<p>아직 기록이 없습니다.</p>');
function updateFull(){
  const full=document.fullscreenElement||document.webkitFullscreenElement||document.body.classList.contains('boardOnly');
  el('fullscreen').textContent=full?'전체화면 종료':'전체화면';el('fullscreen').setAttribute('aria-pressed',String(!!full));
}
el('fullscreen').onclick=async()=>{
  const root=document.documentElement;
  if(document.body.classList.contains('boardOnly'))document.body.classList.remove('boardOnly');
  else try{
    if(document.fullscreenElement||document.webkitFullscreenElement)await (document.exitFullscreen||document.webkitExitFullscreen).call(document);
    else{await (root.requestFullscreen||root.webkitRequestFullscreen).call(root);try{await screen.orientation.lock('landscape');}catch{}}
  }catch{document.body.classList.add('boardOnly');}updateFull();
};
document.addEventListener('fullscreenchange',updateFull);document.addEventListener('webkitfullscreenchange',updateFull);
el('workerPool').onclick=()=>{
  if(!myTurn())return;
  const sites=g.tiles.map((t,i)=>actionsAt(g,i).length?'<button data-work="'+i+'">'+siteName(t,i)+' · '+workerCost(g.players[g.turn],t)+'명</button>':'').join('');
  modal('일할 장소 선택','<div class="actions">'+sites+'</div>'+(sites?'':'<p>배치할 수 있는 장소가 없습니다. 일꾼을 회수하세요.</p>'));
  el('body').querySelectorAll('[data-work]').forEach(b=>b.onclick=()=>openSite(+b.dataset.work));
};
el('modal').addEventListener('close',()=>{if(!el('modal').open)schedule();});
if(combo){el('guide').onclick=()=>modal(info.name,series()+'<p>'+mixGuide[combo]+'</p>');}
if(combo&&!tableId&&g.stagedRefresh){mixRefresh=true;mixRefreshDiscard=g.stagedRefresh;}
render();if(tableId)enterOnline(tableId);else if(fresh)setup();else if(g.over)results();else schedule();
