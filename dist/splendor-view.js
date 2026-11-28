"use strict";
const el=id=>document.getElementById(id),levels=['Easy','Medium','Hard','Hell'],review={open:false};
const mySeat=()=>online?.seat??0;
const myTurn=()=>!g.over&&flightActor===null&&g.turn===mySeat()&&(!online||online.ready&&online.connected&&!online.pending);
const name=i=>i===mySeat()?'나':online&&i<online.config?.humans?'친구 '+(i+1):'AI '+(i+1);
const gem=(i,n='')=>'<span class="gem g'+i+'" title="'+gemNames[i]+'" aria-label="'+gemNames[i]+' '+n+'">'+gemSigns[i]+n+'</span>';
const chips=vs=>vs.map((v,i)=>v?gem(i,v):'').join(' ');
let g=newGame(),timer,flightActor=null,flight=null,flightTimer;
const movingTokens=new Set();
function modal(title,body){if(!online)stopAI();el('title').textContent=title;el('body').innerHTML=body;if(!el('modal').open)el('modal').showModal();}
function close(){el('modal').close();}
function stopAI(){clearTimeout(timer);}
function schedule(){stopAI();if(online){scheduleRoomAI();return;}if(!g.over&&g.turn&&flightActor===null&&!el('modal').open)timer=setTimeout(()=>advance(chooseMove(g)),pace(650));}
const soloKey='splendor-solo-v1';
let saveStatus='새 대국';
function save(){
  if(online)return;
  resumed=true;
  try{localStorage.setItem(soloKey,JSON.stringify(g));saveStatus='이 기기에 자동 저장';}
  catch{saveStatus='저장 공간 사용 불가 · 이번 대국만 플레이';}
}
function card(id,action){
  const c=catalog[id];
  const title=c.ability?specialText[c.ability]:gemNames[c.color];
  const fort=g.forts?.[id];
  const ribbon=fort?name(fort.seat)+' 성채 '+fort.n:({pair:'복제',chain1:'복제 +Ⅰ',chain2:'무료 Ⅱ',gold:'황금 ×2',sacrifice:'할인 반납'}[c.ability]||title);
  return '<button class="card tt-card tt-tilt tier'+c.tier+(c.ability?' special':'')+'" data-'+action+'="'+id+'" style="--art:url(art/guild/'+id+'.webp)" aria-label="'+(c.tier+1)+'단계 '+title+' 개발 카드 '+c.vp+'점"><span class="face"><b class="vp'+(c.vp?'':' nil')+'">'+c.vp+'<small>점</small></b>'+(c.color>=0?gem(c.color,c.ability==='double'?2:''):'')+'</span>'+(c.ability||fort?'<small class="ability">'+ribbon+'</small>':'')+'<span class="cost">'+chips(c.cost)+'</span></button>';
}
// A face-down draw pile: printed back, thickness that thins as it runs out, remaining count.
function drawPile(t,mark){
  const n=g.decks[t].length;
  return '<button class="deck tt-card tier'+t+(n?n<=5?' low':'':' empty')+'" data-deck="'+t+'"><b class="mark">'+mark+'</b><small>'+n+'장</small></button>';
}
function bind(attr,fn){document.querySelectorAll('[data-'+attr+']').forEach(b=>b.onclick=()=>fn(Number(b.getAttribute('data-'+attr))));}
function seatTableau(p, i){
  const piles=Array.from({length:6},()=>[]);
  for(const id of p.cards){
    const color=guildColor(p,id);
    piles[color<0?5:color].push(id);
  }
  const stacks=piles.map((ids,color)=>{
    if(color===5&&!ids.length)return '<span class="pile emptySpecial" aria-hidden="true"></span>';
    const count=color===5?ids.length:p.bonus[color];
    const label=color===5?'특수 카드 '+count+'장':gemNames[color]+' 할인 '+count+' · '+ids.length+'장';
    const cards=ids.map((id,j)=>'<i aria-hidden="true" style="--pos:'+ (ids.length===1?0:j/(ids.length-1))+';background-image:url(art/guild/'+id+'.webp)"></i>').join('');
    return '<span class="pile g'+color+'" title="'+label+'" aria-label="'+label+'"><span class="layers">'+cards+'</span><strong>'+gemSigns[color]+count+'</strong></span>';
  }).join('');
  const wallet=p.tokens.map((n,color)=>'<span class="gem g'+color+(n?'':' zero')+'" aria-label="'+gemNames[color]+' 토큰 '+n+'개">'+gemSigns[color]+n+'</span>').join('');
  return '<button data-seat="'+i+'" class="'+((flightActor??g.turn)===i?'current':'')+'"><span class="seatHead"><b>'+name(i)+' · '+score(p)+'점</b><small>예약 '+p.held.length+'</small></span><span class="piles" aria-label="구매 카드와 영구 할인">'+stacks+'</span><span class="wallet" aria-label="보유 토큰">'+wallet+'</span></button>';
}
function render(){
  announcePlayerTurn(myTurn());
  el('status').textContent=g.over?'대국 종료':(g.last?'마지막 라운드':g.round+'라운드')+' · '+name(flightActor??g.turn)+' 차례';
  el('seats').innerHTML=g.players.map(seatTableau).join('');
  el('market').innerHTML=[2,1,0].map(t=>'<div class="row">'+drawPile(t,['Ⅰ','Ⅱ','Ⅲ'][t])+g.market[t].map(id=>card(id,'card')).join('')+'</div>').join('');
  el('patrons').innerHTML=g.nobles.map(n=>'<span class="patron guildPatron nobleTile tt-card" style="--scene:url(art/guild-'+Math.floor(n/5)+'-'+(n%5)+'.webp)"><b>3점</b><span class="nobleCost">'+chips(patrons[n])+'</span></span>').join('')||'모두 방문했습니다';
  if(g.mode){
    el('status').textContent=guildNames[g.mode]+' · '+el('status').textContent;
    if(g.mode==='orient'){
      document.querySelectorAll('#market .row').forEach((row,j)=>{
        const t=5-j;
        row.insertAdjacentHTML('beforeend',g.market[t].map(id=>card(id,'card')).join('')+drawPile(t,'동방'));
      });
    }
    if(g.cities)el('patrons').innerHTML=g.cities.map(i=>'<div class="patron guildPatron tt-card" style="--scene:url(art/guild-'+Math.floor(i/5)+'-'+(i%5)+'.webp)"><b>'+cityFaces[i].vp+'점</b> '+chips(cityFaces[i].cost)+(cityFaces[i].wild?' · 다른 한 색 '+cityFaces[i].wild:'')+'</div>').join('');
    if(g.mode==='posts')el('patrons').innerHTML+='<p>내 문장　'+(g.players[mySeat()]?.posts||[]).map(i=>guildPowers[i]).join(' · ')+'</p>';
  }
  document.body.classList.toggle('orient',g.mode==='orient');
  document.querySelector('.objectives').setAttribute('aria-label',g.cities?'도시 승리 조건':'귀족 방문 조건');
  el('bank').innerHTML=g.bank.map((v,i)=>'<button data-bank="'+i+'" style="--n:'+Math.min(v,7)+'" aria-label="'+gemNames[i]+' '+v+'개">'+gem(i,v)+'</button>').join('');
  const pass=el('passTurn');
  pass.hidden=!(g.mode&&myTurn()&&canGuildPass(g));
  pass.onclick=()=>prepare({kind:'take',i:0,take:[]});
  el('reserved').textContent='내 예약 카드 · '+g.players[mySeat()]?.held.length+'장';
  el('latestMove').textContent=g.log.length?name(g.log[0].actor)+' · '+g.log[0].msg:'대국 기록';
  if(!online)el('save').textContent=saveStatus;
  bind('card',id=>cardMenu(id,false));bind('seat',inventory);bind('deck',t=>{if(!myTurn())refuse(turnNote());else if(!g.decks[t].length)refuse('덱이 비었습니다.');else prepare({kind:'blind',i:t});});
  bind('bank',i=>{if(myTurn())takeMenu(i<5&&g.bank[i]?[i]:[]);else refuse(turnNote());});
}
function inventory(i){
  const p=g.players[i];modal(name(i)+' · '+score(p)+'점','<p>보석　'+(chips(p.tokens)||'없음')+'</p><p>영구 할인　'+(chips(p.bonus)||'없음')+'</p><p>귀족 '+p.nobles.length+'명 · 개발 카드 '+p.cards.length+'장</p><div class="cards">'+p.cards.map(id=>card(id,'owned')).join('')+'</div><h2>예약 '+p.held.length+'장</h2>'+(i===mySeat()?'<div class="cards">'+p.held.map(id=>card(id,'held')).join('')+'</div>':''));
  if(p.privateNobles?.length)el('body').insertAdjacentHTML('beforeend','<p>예약 귀족　'+p.privateNobles.map(n=>chips(patrons[n])).join(' / ')+'</p>');
  if(p.city!=null)el('body').insertAdjacentHTML('beforeend','<p>도시 획득 · '+cityFaces[p.city].vp+'점 조건 달성</p>');
  if(p.posts?.length)el('body').insertAdjacentHTML('beforeend','<p>'+p.posts.map(i=>guildPowers[i]).join(' · ')+'</p>');
  bind('held',id=>cardMenu(id,true));
}
function cardMenu(id,held){
  if(g.mode){
    const c=catalog[id],kind=held?'held':'buy',can=!!guildTurn(g,{kind,i:id},true);
    const reserve=!held&&!!guildTurn(g,{kind:'reserve',i:id},true);
    modal(guildBadge(g.players[mySeat()],id),'<p>'+ (c.ability==='sacrifice'?'반납할 영구 보너스':'구매 비용')+'　'+chips(c.cost)+'</p>'+(myTurn()?'<button id="buy" '+(can?'':'disabled')+'>구매</button> '+(!held?'<button id="reserve" '+(reserve?'':'disabled')+'>예약</button>':''):''));
    if(el('buy'))el('buy').onclick=()=>prepare({kind,i:id});if(el('reserve'))el('reserve').onclick=()=>prepare({kind:'reserve',i:id});return;
  }
  const c=catalog[id],p=g.players[g.turn],bill=payment(p,c);
  modal(gemNames[c.color]+' 개발 카드 · '+c.vp+'점','<p>구매 비용　'+chips(c.cost)+'</p><p>영구 할인　'+gem(c.color,1)+'</p>'+(myTurn()?'<p>할인 후 지불　'+(chips(bill)||'무료')+'</p><button class="primary" id="buy" '+(bill[5]>p.tokens[5]?'disabled':'')+'>구매</button> '+(!held?'<button id="reserve" '+(p.held.length>=3?'disabled':'')+'>예약'+(g.bank[5]?' + 황금':'')+'</button>':''):''));
  if(el('buy'))el('buy').onclick=()=>prepare({kind:held?'held':'buy',i:id,pay:bill});
  if(el('reserve'))el('reserve').onclick=()=>prepare({kind:'reserve',i:id});
}
function takeMenu(selected){
  const options=takeOptions(g.bank);
  const fits=(arr,opt)=>arr.every((v,j)=>arr.slice(0,j+1).filter(k=>k===v).length<=opt.filter(k=>k===v).length);
  const complete=options.find(opt=>opt.length===selected.length&&fits(selected,opt));
  modal('보석 가져오기','<p>서로 다른 세 색 또는 은행에 4개 이상 있는 한 색에서 2개를 고르세요.</p><div class="choices">'+g.bank.slice(0,5).map((v,i)=>'<button data-pick="'+i+'" '+(options.some(o=>fits([...selected,i],o))?'':'disabled')+'>'+gem(i,v)+'</button>').join('')+'</div><p>선택　'+(selected.length?'<span class="picked">'+selected.map(i=>gem(i)).join(' ')+'</span>':'없음')+'</p><button id="reset">다시 선택</button> <button class="primary" id="take" '+(complete?'':'disabled')+'>가져오기</button>');
  bind('pick',i=>takeMenu([...selected,i]));el('reset').onclick=()=>takeMenu([]);el('take').onclick=()=>prepare({kind:'take',i:0,take:complete});
}
// Say why a tap did nothing instead of failing silently; the line returns to the turn status.
function turnNote(){return g.over?'대국이 끝났습니다.':'지금은 '+name(g.turn)+' 차례입니다.';}
function refusal(a){const p=g.players[mySeat()];if((a.kind==='blind'||a.kind==='reserve')&&p.held.length>=3)return '예약은 3장까지입니다.';if(a.kind==='buy'||a.kind==='held')return '보석이 부족합니다.';return '지금은 할 수 없는 행동입니다.';}
function refuse(msg){const s=el('status'),prev=s.textContent;s.textContent=msg;s.dataset.refused='';clearTimeout(refuse.timer);refuse.timer=setTimeout(()=>{delete s.dataset.refused;if(s.textContent===msg)s.textContent=prev;},2600);}
function prepare(a){
  if(g.mode){
    const result=guildTurn(g,a);if(!myTurn())return;if(!result){refuse(refusal(a));return;}
    if(result.prompt){
      modal(result.prompt.title,'<div class="choices">'+result.prompt.labels.map((s,i)=>'<button data-choice="'+i+'">'+s+'</button>').join('')+'</div>');
      bind('choice',i=>prepare({...a,choices:[...a.choices||[],i]}));
    }else{
      modal('행동 확인','<p>'+result.board.log[0].msg+'</p><button class="primary" id="confirm">확정</button>');
      el('confirm').onclick=()=>{if(myTurn()){close();if(online)submitOnline(a);else advance(a);}};
    }
    return;
  }
  const v=preview(g,a);if(!v){refuse(refusal(a));return;}
  const drop=a.drop??zeros(),p=g.players[g.turn],bill=a.pay;
  const canSwap=bill&&p.tokens[5]>0&&sum(bill)>0;
  function submit(){if(!myTurn())return;close();if(online)submitOnline(a);else advance(a);}
  if(!v.excess&&v.visits.length<2&&!canSwap&&a.kind!=='blind'){submit();return;}
  const due=bill&&catalog[a.i].cost.map((x,i)=>Math.max(0,x-p.bonus[i]));
  modal('행동 확인',(a.kind==='blind'?'<p>'+ (a.i+1)+'단계 덱 맨 위 카드를 비공개로 예약합니다.</p>':'')+
    (canSwap?'<p>지불　'+chips(bill)+'</p><div class="choices">'+bill.slice(0,5).map((n,i)=>n&&bill[5]<p.tokens[5]?'<button data-gold="'+i+'">'+gem(i)+' → '+gem(5)+'</button>':'').join('')+due.map((n,i)=>bill[i]<Math.min(n,p.tokens[i])?'<button data-color="'+i+'">'+gem(5)+' → '+gem(i)+'</button>':'').join('')+'</div>':'')+
    (v.excess?'<p>반납할 보석 '+(v.excess-sum(drop))+'개　<span class="picked">'+chips(drop)+'</span></p><div class="choices">'+v.tokens.map((n,i)=>'<button data-drop="'+i+'" '+(n<=drop[i]||sum(drop)>=v.excess?'disabled':'')+'>'+gem(i,n-drop[i])+'</button>').join('')+'<button id="reset">초기화</button></div>':'')+
    (v.visits.length>1?'<p>방문할 귀족을 고르세요.</p>'+v.visits.map(n=>'<button data-noble="'+n+'" aria-pressed="'+(a.noble===n)+'">'+chips(patrons[n])+'</button>').join(''):'')+
    '<p><button class="primary" id="confirm" '+(sum(drop)!==v.excess||v.visits.length>1&&a.noble==null?'disabled':'')+'>확정</button></p>');
  bind('drop',i=>{drop[i]++;prepare({...a,drop});});bind('noble',n=>prepare({...a,noble:n}));
  bind('gold',i=>{bill[i]--;bill[5]++;prepare(a);});bind('color',i=>{bill[i]++;bill[5]--;prepare(a);});
  if(el('reset'))el('reset').onclick=()=>prepare({...a,drop:zeros()});el('confirm').onclick=submit;
}
function captureMove(actor,a,animate){
  if(!animate)return null;
  const selector=a.kind==='take'?'[data-bank="'+a.take[0]+'"]':a.kind==='blind'?'[data-deck="'+a.i+'"]':a.kind==='held'?'[data-seat="'+actor+'"]':'[data-card="'+a.i+'"]';
  const node=document.querySelector(selector);if(!node)return null;
  const before=g.players[actor].tokens.slice();
  let face=node.cloneNode(true);
  if(a.kind==='held'){
    const container=document.createElement('div');container.innerHTML=card(a.i,'played');
    face=container.firstElementChild;
  }
  if(a.kind==='take')face.innerHTML=a.take.map(i=>gem(i)).join('');
  return {rect:node.getBoundingClientRect(),node:face,before};
}
function recordMove(){} // The engine records the same description during live play and replay.
let contactTimer;
function finish(){
  clearTimeout(contactTimer);
  clearTimeout(flightTimer);flight?.remove();flight=null;
  for(const token of movingTokens)token.remove();movingTokens.clear();
  flightActor=null;render();
  if(g.over)results();else schedule();
}
function advance(a,remote=false,sub=false){
  const actor=g.turn,motion=captureMove(actor,a,true);
  if(!apply(g,a))return;
  if(g.over)endingCues.add(g);
  if(sub)g.log[0].msg='AI 대행 · '+g.log[0].msg;
  if(online&&el('modal').open)close();
  stopAI();clearTimeout(flightTimer);flight?.remove();flight=null;
  for(const token of movingTokens)token.remove();movingTokens.clear();
  flightActor=actor;
  const sound=a.kind==='take'?'gem':['reserve','blind'].includes(a.kind)?'buy':'play';
  clearTimeout(contactTimer);save();render();
  if(!motion||matchMedia('(prefers-reduced-motion:reduce)').matches){actionSound(sound);finish();return;}
  const dest=document.querySelector('[data-seat="'+actor+'"]').getBoundingClientRect();
  const r=motion.rect,f=motion.node;flight=f;f.classList.add('flying');f.setAttribute('aria-hidden','true');f.tabIndex=-1;
  Object.assign(f.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});document.body.append(f);
  const mid='translate('+(innerWidth/2-r.x-r.width/2)+'px,'+(innerHeight/2-r.y-r.height/2)+'px) scale(1.12)';
  const duration=pace(2900);
  contactTimer=setTimeout(()=>actionSound(sound),duration*.15);
  f.animate([{transform:'none'},{transform:mid+' perspective(600px) rotateX(12deg) translateY(-6px)',offset:.11},{transform:mid,offset:.15},{transform:mid,offset:.84},{transform:'translate('+(dest.x+dest.width/2-r.x-r.width/2)+'px,'+(dest.y-r.y)+'px) scale(.35)',opacity:.3}],{duration,fill:'forwards'});
  motion.before.forEach((count,i)=>{
    const delta=g.players[actor].tokens[i]-count;if(!delta)return;
    const bank=document.querySelector('[data-bank="'+i+'"]').getBoundingClientRect();
    const start=delta>0?bank:dest,end=delta>0?dest:bank;
    const token=document.createElement('span');token.className='flying';token.innerHTML=gem(i,(delta>0?'+':'−')+Math.abs(delta));
    const x=start.left+start.width/2,y=start.top+start.height/2;
    Object.assign(token.style,{left:x+'px',top:y+'px',zIndex:'6'});document.body.append(token);movingTokens.add(token);
    token.animate([{opacity:0,transform:'translate(0,0)'},{opacity:1,transform:'translate(0,0)',offset:.26},
      {opacity:1,transform:'translate('+(innerWidth/2+(i-2.5)*26-x)+'px,'+(innerHeight/2+18-y)+'px)',offset:.62},
      {opacity:0,transform:'translate('+(end.left+end.width/2-x)+'px,'+(end.top+end.height/2-y)+'px)'}],{duration,fill:'forwards'});
  });
  flightTimer=setTimeout(finish,duration);
}
document.addEventListener('click',e=>{if(flightActor!==null&&!el('modal').open){e.stopImmediatePropagation();finish();}},true);
function results(){soundAtResults(g);modal('최종 순위',rankings(g).map(r=>'<p class="ranking"><b>'+r.rank+'위 · '+name(r.i)+' · '+r.points+'점</b>　'+(r.city?'도시 획득 · ':'')+'개발 카드 '+r.cards+'장</p>').join('')+'<button id="again">새 대국</button>');el('again').onclick=online?createOnline:setup;}
function setup(preferredMode){
  if(online){roomMenu();return;}
  let mode=guildModes.includes(preferredMode)?preferredMode:(g.mode||'base'),count=g.players.length;const roles=[1,2,3].map(i=>g.players[i]?.level||'Medium');
  function draw(){modal('스플렌더 · 대국 설정','<label class="seat">게임 모드<select id="mode">'+guildModes.map(k=>'<option value="'+k+'" '+(k===mode?'selected':'')+'>'+guildNames[k]+'</option>').join('')+'</select></label><p>'+(guildRules[mode]||'보석을 모으고 개발 카드를 구매해 명성 15점을 달성하세요.')+'</p><div class="choices">'+[2,3,4].map(n=>'<button data-count="'+n+'" aria-pressed="'+(count===n)+'">'+n+'인</button>').join('')+'</div>'+roles.slice(0,count-1).map((l,j)=>'<label class="seat">AI '+(j+2)+'<select id="level'+j+'">'+levels.map(v=>'<option '+(v===l?'selected':'')+'>'+v+'</option>').join('')+'</select></label>').join('')+'<p><button class="primary" id="new">AI 대국 시작</button> <button id="friend">친구 초대 대전</button></p>');
    el('mode').onchange=e=>{mode=e.target.value;draw();};bind('count',n=>{count=n;draw();});roles.slice(0,count-1).forEach((_,j)=>el('level'+j).onchange=e=>roles[j]=e.target.value);
    function syncMode(){
      const url=new URL(location.href);
      if(url.searchParams.has('mode')){
        url.searchParams.set('mode',g.mode||'base');
        history.replaceState(history.state,'',url);
      }
    }
    function start(){g=newGame(roles.slice(0,count-1),Math.random,mode);syncMode();close();save();render();schedule();}
    el('new').onclick=()=>{
      if(!resumed||g.over){start();return;}
      modal('현재 대국을 교체할까요?','<p>'+guildNames[g.mode||'base']+' · '+g.round+'라운드가 이 기기에 저장되어 있습니다.</p><button id="continueGame" class="primary">현재 대국 이어하기</button> <button id="replaceGame">새 대국으로 교체</button>');
      el('continueGame').onclick=()=>{syncMode();close();};el('replaceGame').onclick=start;
    };el('friend').onclick=()=>createOnline(mode);
  }draw();
}
el('setupTop').onclick=setup;el('close').onclick=close;el('modal').onclose=schedule;
el('reserved').onclick=()=>inventory(mySeat());const nativeFull=()=>document.fullscreenElement||document.webkitFullscreenElement;
function updateFull(){const on=!!nativeFull()||document.body.classList.contains('tableFull');el('full').textContent=on?'전체화면 종료':'전체화면';el('full').setAttribute('aria-pressed',String(on));}
el('full').onclick=async()=>{
  const root=document.documentElement;
  if(nativeFull()||document.body.classList.contains('tableFull')){
    try{if(nativeFull())await (document.exitFullscreen||document.webkitExitFullscreen).call(document);screen.orientation?.unlock?.();}catch{}
    document.body.classList.remove('tableFull','rotateHint');
  }else{
    try{await (root.requestFullscreen||root.webkitRequestFullscreen).call(root);}catch{document.body.classList.add('tableFull');}
    try{await screen.orientation.lock('landscape');}catch{document.body.classList.add('rotateHint');}
  }
  updateFull();
};
function fullChanged(){if(!nativeFull())document.body.classList.remove('rotateHint');updateFull();}
document.addEventListener('fullscreenchange',fullChanged);document.addEventListener('webkitfullscreenchange',fullChanged);
el('guide').onclick=()=>g.mode?modal('스플렌더 · '+guildNames[g.mode],'<p>'+guildRules[g.mode]+'</p>'+(g.mode==='posts'?'<p>빨강 3·흰색 1 → 구매 후 보석 / 흰색 2 → 쌍 보석 보상 / 파랑 3·검정 1 → 황금 강화 / 초록 5·귀족 1 → 5점 / 검정 3 → 문장 점수</p>':'')):modal('스플렌더 기본판','<p>내 차례에 보석을 가져오거나, 카드를 사거나, 카드를 예약하세요. 은행의 보석을 누르면 색을 고를 수 있습니다.</p><p>카드 오른쪽 위 보석은 이후 구매에 계속 적용되는 할인입니다. 귀족이 요구하는 할인을 갖추면 3점을 얻습니다. 예약은 3장, 보유 토큰은 10개까지입니다.</p><p>15점이 나오면 같은 횟수로 차례를 마칩니다. 동점이면 구매한 개발 카드가 적은 사람이 앞서고, 그 수도 같으면 공동 순위입니다.</p>');
el('latestMove').onclick=()=>g.over?results():modal('대국 기록',g.log.map(r=>'<p>'+name(r.actor)+' · '+r.msg+'</p>').join('')||'첫 차례입니다.');
const room=roomIdFromUrl();let resumed=false;
if(!room){
  try{
    const data=JSON.parse(localStorage.getItem(soloKey));
    if(data?.edition===4&&Array.isArray(data.players)&&data.players[data.turn]){
      g=data;resumed=true;saveStatus='이 기기에 자동 저장';
    }
  }catch{saveStatus='저장된 대국을 읽을 수 없음';}
}
const requestedMode=new URLSearchParams(location.search).get('mode');
render();if(room)enterOnline(room);else if(guildModes.includes(requestedMode)&&(!resumed||requestedMode!==(g.mode||'base')))setup(requestedMode);else if(g.over)results();else if(!resumed)setup();else schedule();
