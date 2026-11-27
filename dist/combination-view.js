"use strict";
let mixRefresh=false,mixRefreshDiscard,mixTab='board';
async function startRefresh(discard=[]){
  if(!myTurn())return;
  if(online){
    if(online.refreshSaving)return;
    online.refreshSaving=true;
    try{await roomService.set(roomRef(roomService,online.id,'refreshes/t'+online.count),{n:online.count,drop:discard.join('')});}
    catch(error){roomError(error);}
    finally{online.refreshSaving=false;}
  }else{
    g.stagedRefresh=discard;save();mixRefreshDiscard=discard;mixRefresh=true;mixTab='cards';close();render();
  }
}
function syncRefresh(room){
  const stage=room.refreshes?.['t'+online.count];
  if(online.refreshRevision===(stage?stage.n:-1))return;
  const drop=stage?Array.from(stage.drop,Number):undefined;
  if(stage&&!refreshMarket(structuredClone(g),drop))return;
  online.refreshRevision=stage?stage.n:-1;mixRefresh=Boolean(stage);
  mixRefreshDiscard=drop;
  if(stage){close();mixTab='cards';online.aiJob=null;}
  render();
}
const mixPreview=()=>{if(!mixRefresh)return g;const copy=structuredClone(g);if(refreshMarket(copy,mixRefreshDiscard))return copy;mixRefresh=false;return g;};
function mixOrigin(i){const n=el('atlas').querySelector('[data-site="'+i+'"]')||el('atlas');return point(n);}
function mixTileName(board,t,i){
  if(t.port)return '항구 '+(board.ports.indexOf(i)+1);
  if(t.fort)return '요새 '+(i+1);
  if(t.water)return '바다 '+(i+1);
  if(board.combo===12&&t.recipe)return info.goods[t.suit]+' 섬 '+(i+1);
  return t.name;
}
function mixTileDetail(board,t,i){
  const p=board.players[board.turn];
  if(t.order)return t.order[1]+'점 '+goods(unitBag(t.order[0]))+(t.fort?' · '+benefitNames[t.order[2]]:'');
  if(t.cover)return '탐험 · '+exploreName(t.cover);
  if(t.special==='market'||t.special==='buy')return cardText(board.market[t.slot])+(t.special==='buy'?' · 비용 '+t.slot:'');
  if(t.special==='play')return cardText(p.hand[t.slot]);
  if(t.special==='route')return cardText(p.route[t.slot].card)+' · '+(p.route[t.slot].workers?'사용 중':'일꾼 '+(1+p.route.slice(0,t.slot).filter(r=>!r.workers).length));
  if(t.special==='recover')return board.combo===12?'사용·항해 카드 회수':'배치한 정착민 회수';
  if(t.recipe)return t.industry===1?'승급 ↑'+t.recipe:flow(t.recipe);
  return t.port?'폐쇄':t.special==='refresh'?'교체 후 한 번 더':t.special==='swap'?'옥수수 +1':t.range?(t.range===99?'어느 섬이든':t.range+'칸 이내'):'';
}
function mixTabs(){return g.combo===12?[['board','항해 지도'],['cards','상인과 손패']]:[['board','개척지'],['cards',g.combo===13?'상인과 교역로':'상인 시장'],...(g.combo===123?[['map','섬 지도']]:[])];}
function renderMix(){
  const live=mixPreview(),board={...live,turn:mySeat()},active=flightActor??g.turn,p=board.players[mySeat()]||board.players[0],all=mixSites(board);
  el('status').textContent='Century '+String(combo).split('').join('+')+' · '+(g.departures?'출항':g.round+'R');
  el('latestMove').textContent=g.log[0]?seatName(g.log[0].who)+' · '+g.log[0].msg:info.name;
  el('seats').innerHTML=board.players.map((q,i)=>'<button class="player '+(!g.over&&active===i?'activeTurn':'')+'" data-seat="'+i+'" style="--seat:'+colors[i]+'"><b>'+seatName(i)+'</b> '+goods(q.bag,true)+' <small>'+q.won.length+'/'+info.goal+'</small></button>').join('');
  el('seats').querySelectorAll('button').forEach(b=>b.onclick=()=>mixInventory(+b.dataset.seat));
  const sea=combo===12&&mixTab==='board',map=mixTab==='map',atlas=el('atlas');
  atlas.className=sea?'sea':map?'comboMap':'comboGrid';
  if(map){
    atlas.innerHTML=board.islands.map((t,i)=>'<button class="site" data-island="'+i+'" style="grid-column:'+(t.col+1)+';grid-row:'+(t.y+2)+' / span 2"><strong>'+(t.water?'바다':'섬 '+(i+1))+'</strong>'+(t.recipe?flow(t.recipe):'')+'<small>'+board.players.map((q,j)=>q.boat===i?'⛵'+(j+1):'').join(' ')+' '+t.owners.map(j=>'⌂'+(j+1)).join(' ')+'</small></button>').join('');
    atlas.querySelectorAll('button').forEach(b=>b.onclick=()=>islandMenu(+b.dataset.island));
  }else{
    const extra=['market','play','buy','route','refresh','swap'];
    atlas.innerHTML=all.map((t,i)=>{
      if(t.special==='reserve'||t.special==='recover'||(mixTab==='cards')!==extra.includes(t.special))return '';
      const name=mixTileName(board,t,i),detail=mixTileDetail(board,t,i),marks=sea?board.players.map((q,j)=>q.boat===i?piece(j,'⛵'):'').join(''):t.occupant?piece(t.occupant.seat,t.occupant.n+'명'):'';
      const position=sea?'style="grid-column:'+(t.col+1)+';grid-row:'+(t.y+1)+' / span 2"':'';
      return '<button data-site="'+i+'" class="site '+(t.port?'port':t.fort?'fort':t.special==='market'||t.special==='buy'?'merchant':'')+'" '+position+'><strong>'+name+'</strong><span>'+detail+'</span><small>'+(t.need?'♟ '+workerCost(p,t):t.owners?.length?'⌂ '+t.owners.map(j=>j+1).join('·'):'')+'</small><span class="pieces">'+marks+'</span></button>';
    }).join('');
    atlas.querySelectorAll('[data-site]').forEach(b=>b.onclick=()=>openMix(+b.dataset.site));
  }
  el('myTitle').textContent=seatName(mySeat())+'의 '+(combo===12?'선창':'정착지');
  el('inventory').innerHTML=p.bag.map((n,i)=>'<span><i class="cube s'+i+'"></i> '+info.goods[i]+' '+n+'</span>').join('');
  el('personal').innerHTML='<b>'+(g.over?'대국 종료':seatName(active)+'의 차례')+'</b> · '+expScore(g,p)+'점<br>'+(g.departures?'섬을 눌러 출항하세요.':mixRefresh?'시장을 교체했습니다. 추가 행동을 선택하세요.':combo===12?'손패 '+p.hand.length+' · 사용 '+p.used.length+' · 항해 '+p.discards.length:'정착민 '+p.ready+'/'+p.crew+' · 수집 '+(p.route.length+p.discards.length)+'장');
  let tabs=el('mixTabs');if(!tabs){tabs=document.createElement('nav');tabs.id='mixTabs';el('personal').after(tabs);}
  tabs.innerHTML=mixTabs().map(([k,v])=>'<button data-tab="'+k+'" aria-pressed="'+(mixTab===k)+'">'+v+'</button>').join('');
  tabs.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{mixTab=b.dataset.tab;render();});
  el('workerPool').hidden=true;el('rest').hidden=false;el('rest').textContent='휴식';el('rest').disabled=!myTurn()||!mixOptions(board,all.length-1).length;
  el('rest').onclick=()=>openMix(all.length-1);
  el('ledger').textContent=g.over?'최종 결과':'내 보유 현황';el('ledger').onclick=()=>g.over?results():mixInventory(mySeat());
  el('save').textContent=online?(online.connected?'초대방':'다시 연결 중'):'이 기기에 자동 저장됨';
}
function mixInventory(i){
  const p=g.players[i];
  modal(seatName(i)+'의 보유 현황','<p>'+wordBag(p.bag)+'</p><p>납품 '+p.won.length+'건 · 교역소 '+total(p.tracks)+'곳</p><p>보너스 '+(p.bonus.map(mixBonusName).join(' · ')||'없음')+'</p>'+(g.combo===13?p.route.map(r=>'<p>'+cardText(r.card)+' · 일꾼 '+r.workers+'</p>').join(''):'')+(g.combo===12?'<p>손패 '+p.hand.length+'장 · 사용 '+p.used.length+'장 · 항해 '+p.discards.length+'장</p>':''));
  if(i===mySeat()&&g.combo!==13&&!g.over){
    const order=nextPriority||p.priority||[0,1,2,3];
    el('body').insertAdjacentHTML('beforeend','<p>통행료로 적재 한도를 넘으면 앞 재료부터 반납합니다. 변경은 다음 내 행동부터 적용됩니다.</p><div class="actions">'+order.map(t=>'<button data-priority="'+t+'">'+info.goods[t]+' ↑</button>').join('')+'</div>');
    el('body').querySelectorAll('[data-priority]').forEach(b=>b.onclick=()=>{const k=+b.dataset.priority;nextPriority=[k,...order.filter(t=>t!==k)];mixInventory(i);});
  }
}
function mixBonusName(b){
  if(b==='cards')return '상인 두 장당 2점';if(b==='four')return '4점';
  if(typeof b==='string'&&b.startsWith('triple'))return b.slice(6).split('').map(k=>benefitNames[+k]).join('·')+' 세트';
  if(typeof b==='string'&&b.startsWith('card'))return '상인 '+(+b.at(-1)+1)+' 무료 영입';return bonusLabel(b);
}
function islandMenu(dest){
  const board=mixPreview(),t=board.islands[dest],sites=mixSites(board);
  const possible=sites.flatMap((s,i)=>['move','boatTrade','postTrade'].includes(s.special)&&myTurn()&&mixOptions(board,i).some(c=>c.dest===dest)?[i]:[]);
  modal(t.water?'바다':'섬 '+(dest+1),(t.recipe?flow(t.recipe):'')+'<div class="actions">'+possible.map(i=>'<button data-go="'+i+'">'+sites[i].name+'</button>').join('')+'</div>'+(!possible.length?'<p>지금 이곳에서 할 수 있는 항해·교역이 없습니다.</p>':''));
  el('body').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openMix(+b.dataset.go,{dest}));
}
function mixLabel(board,c,t){
  let str=mixActions[c.kind]||actNames[c.kind];
  if(c.kind==='depart')return wordBag(c.bag);
  if(c.dest!==undefined)str+=' · '+(board.islands[c.dest].water?'바다':'섬 '+(c.dest+1));
  if(c.build&&c.kind!=='build')str+=' · 건설';
  if(c.n)str+=' · 교환 ×'+c.n;
  if(c.steps?.length)str+=' · '+c.steps.map(k=>goods(unitBag(String(k)))+' → '+goods(unitBag(String(k+1)))).join(' / ');
  if(c.kind==='upgrade'&&!c.steps?.length)str+=' 없이 배치';
  if(c.need)str+=' · 일꾼 '+c.need;
  if(c.slot!==undefined)str+=' · '+(c.slot+1)+'번째';
  if(c.swap)str+=' · '+c.swap.map(k=>k+1).join(' ↔ ');
  if(c.stack>=0)str+=' · '+mixBonusName(t.stacks[c.stack].at(-1));
  if(c.explore>=0)str+=' · 탐험 '+exploreName(board.tiles[c.explore].cover);
  if(c.prize)str+=' · '+mixBonusName(c.prize);
  if(c.reward>=0)str+=' · '+mixBonusName(board.prizes[t.special==='market'?'market':'outpost'][c.reward].at(-1));
  return str;
}
function openMix(i,opts={}){
  const live=mixPreview(),board=myTurn()?live:{...live,turn:mySeat()},p=board.players[board.turn],t=mixSites(board)[i];if(!t)return;
  const choices=myTurn()?mixOptions(board,i,opts):[],shown=choices.map((c,j)=>({c,j})).filter(({c})=>opts.dest===undefined||opts.dest===c.dest);
  let notes='';
  if(t.order&&t.fort){
    const c=t.order;notes+='<p>'+(c[2]===1?helpNames[c[3]]+' 문양 장소에 배치할 때 '+info.goods[c[4]]+' +1':cardBenefit(c))+'</p>';
    if(t.stacks.length)notes+='<p>보너스 · '+t.stacks.filter(s=>s.length).map(s=>mixBonusName(s.at(-1))).join(' / ')+'</p>';
  }
  if(t.need)notes+='<p>일꾼 '+workerCost(p,t)+'명 · '+helpNames[t.help]+' 문양</p>';
  if(combo===12&&!t.special&&!board.departures)notes+='<p>항해 비용 '+(choices[0]?.fuel?.length??Math.max(0,(opts.path??seaPath(board,p.boat,i)).length-p.bonus.filter(b=>b==='move').length))+'장 · 사용한 카드부터 지불</p>'+(myTurn()?'<button id="mixPath">항로 직접 선택</button>':'');
  if(t.special==='move'&&opts.dest===undefined){
    const dests=[...new Set(choices.map(c=>c.dest))];
    if(!dests.length)return myTurn()?refuseBoardMove('이동할 수 있는 섬이 없습니다.'):refuseCenturyTurn();
    modal(t.name,'<p>목적지 섬을 선택하세요.</p><div class="actions">'+dests.map(d=>'<button data-dest="'+d+'">'+(board.islands[d].water?'바다':'섬 '+(d+1))+' '+(board.islands[d].recipe?flow(board.islands[d].recipe):'')+'</button>').join('')+'</div>');
    el('body').querySelectorAll('[data-dest]').forEach(b=>b.onclick=()=>openMix(i,{dest:+b.dataset.dest}));return;
  }
  const option=shown[0]?.c,fee=t.special==='buy'?t.slot:option?.tolls?.length||0;
  const tile=combo===123?board.islands[opts.dest]:t;
  const buildFee=shown.some(({c})=>c.build)&&tile?.recipe&&!tile.owners?.includes(board.turn)?(tile.owners?.length||0)*(board.players.length===2?2:1):0;
  if(myTurn()&&(fee||buildFee||option?.fuel?.length))notes+='<button id="settle">지불 카드·재료 선택</button>';
  modal(mixTileName(board,t,i),'<p>'+mixTileDetail(board,t,i)+'</p>'+notes+'<div class="actions">'+shown.map(({c,j})=>'<button data-option="'+j+'">'+mixLabel(board,c,t)+(c.kind==='refresh'?'':previewBag(p.bag,c.bag))+'</button>').join('')+'</div>'+(!shown.length?'<p>'+(!myTurn()?seatName(g.turn)+'의 차례입니다.':'현재 비용이나 재료 조건을 충족하지 않습니다.')+'</p>':''));
  if(el('mixPath'))el('mixPath').onclick=()=>mixRoute(board,i,opts);
  if(el('settle'))el('settle').onclick=()=>mixPayment(board,i,opts,fee,buildFee,option?.fuel?.length||0);
  el('body').querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{
    if(!myTurn())return refuseCenturyTurn();
    const option=+b.dataset.option,c=choices[option];
    if(c.kind==='refresh'){if(total(c.bag)>capacity(p))discard({},c.bag,capacity(p),a=>startRefresh(a.discard));else startRefresh();return;}
    const a={edition,combo,kind:c.kind,i,option,...opts,...(mixRefresh?{refresh:true,refreshDiscard:mixRefreshDiscard}:{})};
    const limit=capacity(p)+(c.prize==='cargo'?3:0);
    if(total(c.bag)>limit)discard(a,c.bag,limit);else advance(a);
  });
}
function mixPayment(board,i,opts,fee,buildFee,fuelCount){
  const p=board.players[board.turn],available=[...p.used,...p.hand],fuel=[],pay=[],buildPay=[];
  const spendingBag=p.bag.slice(),site=mixSites(board)[i];
  if(board.combo===123&&site.special==='move'){
    p.won.filter(c=>c[2]===1&&c[3]===site.help).forEach(c=>spendingBag[c[4]]++);
  }
  function draw(){
    const phase=fuel.length<fuelCount?'fuel':pay.length<fee?'pay':buildPay.length<buildFee?'build':null;
    if(!phase){openMix(i,{...opts,fuel,pay,buildPay});return;}
    const remaining=spendingBag.slice();[...pay,...buildPay].forEach(k=>remaining[k]--);
    const buttons=phase==='fuel'?available.map((card,j)=>'<button data-k="'+j+'">'+cardText(card)+'</button>').join(''):remaining.map((n,k)=>'<button data-k="'+k+'" '+(n?'':'disabled')+'>'+info.goods[k]+' '+n+'</button>').join('');
    modal(phase==='fuel'?'항해에 쓸 카드':phase==='pay'?'지불할 재료':'건설에 쓸 재료','<div class="actions">'+buttons+'</div><button id="defaultPay">자동 지불로 돌아가기</button>');
    if(phase==='build'){
      const skip=document.createElement('button');skip.textContent='건설비 선택 건너뛰기';
      skip.onclick=()=>openMix(i,{...opts,fuel,pay,buildPay:[]});el('body').append(skip);
    }
    el('defaultPay').onclick=()=>openMix(i,opts);el('body').querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=+b.dataset.k;if(phase==='fuel')fuel.push(...available.splice(k,1));else (phase==='pay'?pay:buildPay).push(k);draw();});
  }draw();
}


function mixRoute(board,i,opts){
  const start=board.players[board.turn].boat,route=[...(opts.path??seaPath(board,start,i))];
  function draw(){
    const last=route.at(-1)??start;
    modal('항로 직접 선택','<p>'+[start,...route].map(k=>mixTileName(board,board.tiles[k],k)).join(' → ')+'</p><div class="actions">'+board.tiles.map((t,k)=>neighbors(board,last,k)?'<button data-step="'+k+'">'+mixTileName(board,t,k)+'</button>':'').join('')+'</div><button id="undoStep">한 칸 취소</button><button id="finishPath">이곳에서 행동</button>');
    el('body').querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{if(route.length<64)route.push(+b.dataset.step);draw();});
    el('undoStep').onclick=()=>{route.pop();draw();};el('finishPath').onclick=()=>openMix(last,{path:route});
  }draw();
}
