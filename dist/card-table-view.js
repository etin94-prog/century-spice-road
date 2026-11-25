'use strict';
const $=id=>document.getElementById(id);
const poker=new URLSearchParams(location.search).get('game')!=='hula';
const engine=poker?Poker:Hula,title=poker?'Texas Hold’em':'훌라',key='worldwide-'+(poker?'holdem':'hula')+'-v1';
let game,timer,selected=[];
try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.players?.length>=2&&saved.players.length<=4&&saved.round>=1)game=saved;}catch{}
const short=id=>ranks[CardTable.rank(id)-1]+suits[CardTable.suit(id)];
const showCards=cards=>cards.map(id=>card(id)).join('');
function btn(action,text,enabled=true,primary=false){return '<button data-act="'+action+'" '+(enabled?'':'disabled')+' class="'+(primary?'primary':'')+'">'+text+'</button>';}
function modal(heading,html){
  clearTimeout(timer);$('title').textContent=heading;$('body').innerHTML=html;
  $('close').hidden=!game;if(!$('modal').open)$('modal').showModal();
}
function setup(){
  modal(title+' · 대국 설정','<label>참가 인원<select id="count">'+[2,3,4].map(n=>'<option value="'+n+'" '+((game?.players.length||4)===n?'selected':'')+'>나 + AI '+(n-1)+'</option>').join('')+'</select></label><p>'+(poker?'200칩씩 시작 · 블라인드 5 / 10':'한 사람당 7장 · 정통 턴제')+' · 5판</p>'+btn('start','로컬 대국 시작',true,true)+'<a class="setupBack" href="./#worldwide">게임 선택으로</a>');
}
const pokerRules='<p>52장 한 덱을 사용합니다. 내 카드 2장과 공용 카드 5장 중 가장 강한 5장 조합이 이깁니다. 공용 카드만 사용할 수도 있습니다.</p><p>프리플롭과 플롭은 10칩, 턴과 리버는 20칩씩 올리는 고정 리밋입니다. 한 거리에서 베트와 레이즈를 합쳐 최대 4회입니다. 레이즈는 전액을 낼 수 있을 때 가능하며, 콜 금액이 부족하면 남은 칩만 올인합니다.</p><p>동점은 팟을 분할하고 나머지 칩은 버튼 왼쪽부터 받습니다. 올인한 사람은 자신이 기여한 범위의 팟만 겨룹니다. 5판 또는 내 칩 소진이나 한 명만 남으면 종료합니다.</p>';
const hulaRules='<p>내 차례에는 더미에서 한 장 받거나 직전 버림패로 땡큐 등록을 하고, 원하는 만큼 등록·붙이기 후 한 장을 버립니다. 손을 비우면 훌라입니다.</p><p>같은 숫자 3장 이상, 같은 무늬의 연속 3장 이상, 또는 7 한 장을 등록할 수 있습니다. A는 낮거나 높게 쓰되 K-A-2로 잇지 않습니다. 7 한 장에는 같은 무늬의 이웃 숫자를 붙입니다. 내가 한 번 등록한 뒤에는 누구의 조합에나 붙일 수 있습니다.</p><p>이 테이블은 내 차례에만 땡큐를 허용합니다. 받기 전, 이미 등록했고 손패 합계가 2인 7점·3인 10점·4인 15점 이하면 스톱할 수 있습니다. 스톱이나 더미 소진 시 A=1부터 K=13까지 합산해 최저점자가 이깁니다. 동점은 공동 승리이며, 별도 배수 없이 5판의 승수를 겨룹니다.</p>';
function finished(){return game.round>=5||(poker&&(game.players[0].chips===0||game.players.filter(p=>p.chips).length<2));}
function changed(){
  selected=[];renderCardMove(render);
  try{localStorage.setItem(key,JSON.stringify(game));}catch{$('msg').textContent+=' · 기기 저장 불가';}
}
function commit(action,event){
  if (!engine.play(game,action)) return;
  confirmCardTouch(event);
  changed();
}
function resultSummary(){
  if(!poker)return game.reason+' · '+game.winners.map(CardTable.seat).join(' / ')+' 승리';
  const sums=game.players.map((_,i)=>game.report.filter(r=>r.id===i).reduce((n,r)=>n+r.n,0));
  return sums.flatMap((n,i)=>n?[CardTable.seat(i)+' '+n+'칩 수령']:[]).join(' · ');
}
function schedule(){
  clearTimeout(timer);
  if(game&&game.phase!=='result'&&game.turn>0&&!$('modal').open)timer=setTimeout(()=>commit(engine.ai(game)),550);
}
function render(){
  const g=game,end=g.phase==='result',mine=g.players[0],local=!end&&g.turn===0;
  $('name').textContent=title;$('balance').textContent=poker?'내 칩 '+mine.chips:'내 승수 '+mine.wins;
  $('round').textContent='ROUND '+g.round+' / 5';$('msg').textContent=end?resultSummary():poker?CardTable.seat(g.turn)+' 차례':g.last||'내 차례에 카드를 받으세요.';
  $('opponents').innerHTML=g.players.slice(1).map((p,j)=>{
    const i=j+1,visible=end&&(!poker||g.showdown)&&!p.fold;
    return '<div class="opponent '+(!end&&g.turn===i?'active':'')+'"><b>'+CardTable.seat(i)+(poker&&g.button===i?' · D':'')+'</b><div class="miniCards">'+(visible?showCards(p.cards):poker?p.cards.map(()=>card(null,false,'상대 홀 카드')).join(''):'손패 '+p.cards.length+'장')+'</div><small>'+(poker?p.chips+'칩 · '+(p.last||'대기')+(visible?' · '+Poker.evaluate([...p.cards,...g.board]).category:''):end?Hula.points(p.cards)+'점':p.open?'등록함':'미등록')+'</small></div>';
  }).join('');
  document.querySelector('.localSeat').classList.toggle('active',local);
  if(poker){
    $('street').textContent=end?(g.showdown?'쇼다운':'핸드 종료'):Poker.streets[g.street];
    $('pot').textContent='팟 '+g.players.reduce((s,p)=>s+p.paid,0)+'칩';
    $('boardCards').innerHTML=showCards(g.board)+'<span class="slot" aria-hidden="true"></span>'.repeat(5-g.board.length);
    $('myCards').innerHTML=showCards(mine.cards);$('handScore').textContent=(g.button===0?'D · ':'')+(mine.fold?'폴드':g.board.length?Poker.evaluate([...mine.cards,...g.board]).category:'');
    $('controls').innerHTML=local?Poker.actions(g).map(a=>btn(a,{fold:'폴드',call:'콜 '+Math.min(mine.chips,g.price-mine.bet),check:'체크',raise:(g.price?'레이즈':'베트')+' +'+Poker.unit(g)}[a],true,a==='check'||a==='call')).join(''):'';
  }else{
    $('street').textContent=end?g.reason:CardTable.seat(g.turn)+(g.phase==='draw'?' · 받기':' · 등록 / 버리기');
    $('pot').textContent='더미 '+g.deck.length+'장';
    const top=g.discard.at(-1);
    $('boardCards').innerHTML='<div class="discardPile">버림패 '+(top===undefined?'없음':card(top))+'</div>'+g.groups.map((m,i)=>{
      const label=CardTable.seat(m.owner)+' · '+m.cards.slice().sort((a,b)=>CardTable.rank(a)-CardTable.rank(b)).map(short).join(' ');
      const valid=local&&g.phase==='arrange'&&mine.open&&selected.length===1&&Hula.fits(m.cards,selected[0]);
      return valid?btn('attach-'+i,label+'에 붙이기'):'<span class="groupCard">'+label+'</span>';
    }).join('');
    $('myCards').innerHTML=mine.cards.slice().sort((a,b)=>a-b).map(id=>'<button class="handBtn" data-id="'+id+'" aria-pressed="'+selected.includes(id)+'" '+(local&&g.phase==='arrange'?'':'disabled')+'>'+card(id)+'</button>').join('');
    $('handScore').textContent=Hula.points(mine.cards)+'점 · '+(mine.open?'등록함':'미등록');
    $('controls').innerHTML=!local?'':g.phase==='draw'?btn('draw','한 장 받기',true,true)+(Hula.thanks(g).length?btn('thanks','땡큐'):'')+(Hula.canStop(g)?btn('stop','스톱'):''):btn('meld','등록',Hula.meld(selected))+btn('discard','선택한 카드 버리기',selected.length===1,true);
  }
  if(end){
    if(finished()){
      const scores=g.players.map((p,i)=>({i,n:poker?p.chips:p.wins})).sort((a,b)=>b.n-a.n);
      $('msg').textContent+=' · 최종 '+scores.map((p,i)=>{
        const rank=scores.findIndex(other=>other.n===p.n)+1;
        const tied=scores[i-1]?.n===p.n||scores[i+1]?.n===p.n;
        return (tied?'공동 ':'')+rank+'위 '+CardTable.seat(p.i)+' '+p.n+(poker?'칩':'승');
      }).join(' / ');
    }
    $('controls').innerHTML=btn('next',finished()?'새 테이블':'다음 판',true,true);
  }
  schedule();
}
document.addEventListener('click',e=>{
  const cardBtn=e.target.closest('[data-id]');
  if(cardBtn){const id=+cardBtn.dataset.id;selected=selected.includes(id)?selected.filter(c=>c!==id):[...selected,id];redrawHandSelection(cardBtn,render);return;}
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act;
  if(a==='start'){game=engine.start(+$('count').value);$('modal').close();changed();return;}
  if(!game)return;
  if(a==='next'&&game.phase==='result'){if(finished())setup();else{engine.deal(game);changed();}return;}
  if(game.turn!==0||game.phase==='result')return;
  if(poker){commit(a,e);return;}
  if(a==='thanks'){
    const sets=Hula.thanks(game);
    modal('땡큐 · 등록할 조합',sets.map((s,i)=>btn('thank-'+i,s.map(short).join(' '))).join(''));return;
  }
  if(a.startsWith('thank-')){const set=Hula.thanks(game)[Number(a.slice(6))];if(set){$('modal').close();commit({kind:'thanks',cards:set.filter(id=>id!==game.discard.at(-1))},e);}return;}
  if(a.startsWith('attach-'))commit({kind:'attach',group:Number(a.slice(7)),cards:selected},e);
  else commit({kind:a,cards:selected},e);
});
$('guide').onclick=()=>modal(title+' · 테이블 규칙',poker?pokerRules:hulaRules);
$('close').onclick=()=>$('modal').close();$('modal').onclose=schedule;$('modal').oncancel=e=>{if(!game)e.preventDefault();};
document.body.className=poker?'poker':'hula';document.title=title+' · 51 Worldwide Games';$('name').textContent=title;
if(game)render();else setup();
