'use strict';
const $=id=>document.getElementById(id), glyph=['⚀','⚁','⚂','⚃','⚄','⚅'];
const colors=['#ef8d78','#70c2ed','#eabc54','#aa9beb'],levels=['Easy','Medium','Hard','Hell'];
const key='vegas-solo-v1',name=i=>i===(online?.seat??0)?'나':online&&i<online.config?.humans?'친구 '+(i+1):'AI '+(i+1),money=n=>'$'+(n*10000).toLocaleString('en-US');
let game,timer,storageError=false;
try{const saved=!roomIdFromUrl()&&JSON.parse(localStorage.getItem(key));if(saved?.players?.length>=2&&saved.players.length<=4&&saved.casinos?.length===6)game=saved;}catch{}
function save(){try{localStorage.setItem(key,JSON.stringify(game));storageError=false;}catch{storageError=true;}}
function modal(title,body){clearTimeout(timer);$('title').textContent=title;$('body').innerHTML=body;if(!$('modal').open)$('modal').showModal();$('close').hidden=!game;}
function setup(){
  if(online){roomMenu();return;}
  const roles=game?game.players.slice(1).map(p=>p.level):['Medium'];let n=roles.length+1;
  function draw(){
    modal('라스베가스 · 대국 설정','<label>참가 인원<select id="count">'+[2,3,4].map(k=>'<option '+(k===n?'selected':'')+'>'+k+'</option>').join('')+'</select></label>'+Array.from({length:n-1},(_,j)=>'<label>'+name(j+1)+' 난이도<select data-level="'+j+'">'+levels.map(l=>'<option '+(l===(roles[j]||'Medium')?'selected':'')+'>'+l+'</option>').join('')+'</select></label>').join('')+'<button id="start">AI 대국 시작</button><button id="friend">친구 초대 대전</button><a class="setupBack" href="./#vegas">게임 선택으로</a>');
    $('friend').onclick=()=>createOnline();
    $('count').onchange=e=>{n=Number(e.target.value);draw();};
    document.querySelectorAll('[data-level]').forEach(el=>el.onchange=()=>roles[Number(el.dataset.level)]=el.value);
    $('start').onclick=()=>{if(game&&game.phase!=='over'&&!confirm('진행 중인 대국을 새 대국으로 교체할까요?'))return;
      game=Vegas.start(Array.from({length:n-1},(_,j)=>roles[j]||'Medium'));$('modal').close();changed();};
  }draw();
}
function changed(){save();render();}
function schedule(){
  clearTimeout(timer);
  if(online){scheduleVegasRoom();return;}
  if(!game||$('modal').open||!game.turn||!['roll','place'].includes(game.phase))return;
  timer=setTimeout(()=>{if(game.phase==='roll')Vegas.roll(game);else Vegas.place(game,Vegas.choose(game));changed();},700);
}
function results(){
  const rows=Vegas.ranking(game);let rank=0;
  modal('최종 순위',rows.map((r,j)=>{if(!j||r.cash!==rows[j-1].cash||r.notes!==rows[j-1].notes)rank=j+1;return '<p><b>'+rank+'위 · '+name(r.i)+'</b>　'+money(r.cash)+' · 지폐 '+r.notes+'장</p>';}).join('')+'<button id="again">새 대국</button>');$('again').onclick=setup;
}
function render(){
  if(online){if(!online.initialized)return;game=g.board;}
  $('table').hidden=false;
  const settled=['settled','over'].includes(game.phase);
  $('round').textContent=game.round+' / 4 라운드';
  $('status').textContent=settled?(game.phase==='over'?'대국 종료':'라운드 정산'+(online?' · '+name(g.turn)+' 진행':'')):name(game.turn)+' 차례 · '+(game.phase==='roll'?'굴리기':'카지노 선택');
  $('casinos').innerHTML=game.casinos.map((c,f)=>{
    const held=c.counts.map((n,i)=>n?'<span class="owner" style="--seat:'+colors[i]+'">'+name(i)+' '+n+'</span>':'').join('');
    const payout=c.winners.map((i,j)=>name(i)+' '+money(c.notes[j])).join(' · ');
    const qty=game.roll.filter(v=>v===f).length,active=(online?myTurn()&&g.turn===game.turn:!game.turn)&&game.phase==='place'&&qty;
    return '<button class="casino" data-face="'+f+'" '+(active?'':'disabled')+'><b>'+glyph[f]+' 카지노 '+(f+1)+(active?' · '+qty+'개 놓기':'')+'</b><span>'+c.notes.map(v=>'<em>'+money(v)+'</em>').join('')+'</span><span>'+held+'</span>'+(settled?'<small>'+ (payout||'미지급')+'</small>':'')+'</button>';
  }).join('');
  document.querySelectorAll('[data-face]').forEach(el=>el.onclick=()=>{if(online){if(myTurn())submitOnline({kind:'place',i:Number(el.dataset.face)});return;}if(!game.turn){Vegas.place(game,Number(el.dataset.face));changed();}});
  $('seats').innerHTML=game.players.map((p,i)=>'<div class="seat '+(!settled&&i===game.turn?'active':'')+'" style="--seat:'+colors[i]+'"><b>'+name(i)+(levels.includes(p.level)?' · '+p.level:'')+'</b><br>남은 주사위 '+p.left+'</div>').join('');
  $('dice').textContent=game.roll.slice().sort().map(v=>glyph[v]).join(' ');
  $('dice').setAttribute('aria-label','굴린 눈 '+game.roll.map(v=>v+1).join(', '));
  $('last').textContent=(storageError?'저장 공간 사용 불가 · ':'')+(online?g.log[0]?.msg||'':game.message);
  const a=$('action');a.hidden=!settled&&(game.turn!==0||game.phase!=='roll');
  if(online)a.hidden=game.phase!=='over'&&!(game.phase==='settled'&&myTurn());
  a.textContent=game.phase==='over'?'최종 순위':settled?'다음 라운드':'주사위 굴리기';
  a.onclick=()=>{if(game.phase==='over'){results();return;}if(online){if(myTurn()&&settled)submitOnline({kind:'next',i:0});return;}if(settled)Vegas.next(game);else Vegas.roll(game);changed();};
  schedule();
}
$('close').onclick=()=>$('modal').close();
$('modal').onclose=schedule;
$('modal').oncancel=e=>{if(!game)e.preventDefault();};
$('guide').onclick=()=>modal('플레이 방법','<p>남은 주사위를 모두 굴리고 눈 하나를 고르세요. 그 눈이 나온 주사위는 전부 같은 번호 카지노에 놓습니다.</p><p>모두 배치를 마치면 카지노별로 정산합니다. 같은 개수를 놓은 사람은 모두 제외하고, 남은 사람이 개수 순서대로 가장 큰 지폐부터 한 장씩 받습니다.</p><p>4라운드 합계가 가장 크면 우승합니다. 동점이면 지폐가 많은 사람이 앞서고, 장수도 같으면 공동 순위입니다.</p>');
$('setupTop').onclick=setup;
if(roomIdFromUrl()){if(roomIdFromUrl().startsWith('ce000005'))enterOnline(roomIdFromUrl());else location.replace('index.html'+location.search);}else if(game)render();else setup();
