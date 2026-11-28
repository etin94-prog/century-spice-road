'use strict';
const $=id=>document.getElementById(id);
const poker=new URLSearchParams(location.search).get('game')!=='hula';
const engine=poker?Poker:Hula,title=poker?'23 · Texas Hold’em':'훌라',key='worldwide-'+(poker?'holdem':'hula')+'-v1';
let game,timer,selected=[],seen=0;
// The saved table is the only copy. If another tab, or this page restored from the
// back/forward cache, finds a save it did not write, it reloads instead of playing
// on a stale copy (which could settle the same hand twice).
let lastSaved=null;
try{lastSaved=localStorage.getItem(key);}catch{}
function fresh(){
  let now;try{now=localStorage.getItem(key);}catch{return true;}
  if(now===lastSaved)return true;
  clearTimeout(timer);location.reload();return false;
}
addEventListener('storage',e=>{if(e.key===key)fresh();});
addEventListener('pageshow',e=>{if(e.persisted)fresh();});
try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.players?.length>=2&&saved.players.length<=4&&saved.round>=1)game=saved;}catch{}
// Tables saved before the round setting ran five hands on 200 table chips each.
// A hold'em hand from then is dropped: its pot was never taken from the wallet.
if(poker&&game&&!Number.isInteger(game.players[0].buyin)){
  if(game.phase==='result')game.players.forEach(p=>{p.buyin=200;});
  else game=undefined;
}
if(game){
  if(![0,5,10,20].includes(game.limit))game.limit=5;
  seen=game.players[0].chips;
}
// In hold'em my stack is the shared wallet. What I win or lose is passed on as it
// happens; a balance changed elsewhere (blackjack, another device, a refill) is
// taken up between hands only, so a hand in progress keeps its own arithmetic.
function mirror(){
  if(!poker)return;
  const me=game.players[0];
  Wallet.set(Wallet.chips+me.chips-seen);seen=me.chips;
}
function absorb(){
  if(!poker||!game||game.phase!=='result')return false;
  const me=game.players[0],shift=Wallet.chips-me.chips;
  if(!shift)return false;
  me.chips+=shift;me.buyin+=shift;seen=me.chips;return true;
}
// During a hand the stack may never be larger than the wallet behind it (the
// wallet can drop at blackjack or on another device while this hand is saved).
function cap(){
  if(!poker||!game||game.phase==='result')return false;
  const me=game.players[0],cut=me.chips-Wallet.chips;
  if(cut<=0)return false;
  me.chips-=cut;me.buyin-=cut;seen=me.chips;return true;
}
let setupBlocked=false;
const limits=value=>'<label>판 수<select id="limit">'+[0,5,10,20].map(n=>'<option value="'+n+'" '+(n===value?'selected':'')+'>'+(n?n+'판 승부':'무제한')+'</option>').join('')+'</select></label>';
const short=id=>ranks[CardTable.rank(id)-1]+suits[CardTable.suit(id)];
const showCards=cards=>cards.map(id=>card(id)).join('');
function btn(action,text,enabled=true,primary=false){return '<button data-act="'+action+'" '+(enabled?'':'disabled')+' class="'+(primary?'primary':'')+'">'+text+'</button>';}
function modal(heading,html){
  clearTimeout(timer);$('title').textContent=heading;$('body').innerHTML=html;
  $('close').hidden=!game;if(!$('modal').open)$('modal').showModal();
}
function setup(){
  modal(title+' · 대국 설정','<label>참가 인원<select id="count">'+[2,3,4].map(n=>'<option value="'+n+'" '+((game?.players.length||4)===n?'selected':'')+'>나 + AI '+(n-1)+'</option>').join('')+'</select></label>'+limits(game?.limit??(poker?0:5))+'<p>'+(poker?'내 칩 '+Wallet.chips+' · AI 200칩씩 · 블라인드 5 / 10':'한 사람당 7장 · 정통 턴제')+'</p>'+(poker&&Wallet.chips<Wallet.LOW?((setupBlocked=Wallet.heldBy(key))?'<p>칩이 떨어졌습니다. 진행 중인 블랙잭 판을 먼저 끝내 주세요.</p>':btn('refill','무료 리필 '+Wallet.REFILL+'칩',true,true)):btn('start','로컬 대국 시작',true,true))+'<a class="setupBack" href="./#worldwide">게임 선택으로</a>');
}
const pokerRules='<p>52장 한 덱을 사용합니다. 내 카드 2장과 공용 카드 5장 중 가장 강한 5장 조합이 이깁니다. 공용 카드만 사용할 수도 있습니다.</p><p>프리플롭과 플롭은 10칩, 턴과 리버는 20칩씩 올리는 고정 리밋입니다. 한 거리에서 베트와 레이즈를 합쳐 최대 4회입니다. 레이즈는 전액을 낼 수 있을 때 가능하며, 콜 금액이 부족하면 남은 칩만 올인합니다.</p><p>동점은 팟을 분할하고 나머지 칩은 버튼 왼쪽부터 받습니다. 올인한 사람은 자신이 기여한 범위의 팟만 겨룹니다.</p><p>내 칩은 블랙잭과 함께 쓰는 공용 지갑이고, AI는 200칩으로 앉습니다. 무제한 테이블은 끝없이 이어지며 칩이 떨어진 AI는 200칩으로 다시 앉습니다. 5·10·20판 승부는 정한 판 수를 마치거나 한 명만 남으면 그동안의 손익으로 순위를 정합니다. 내 칩이 떨어지면 설정 화면에서 무료로 채웁니다.</p>';
const hulaRules='<p>내 차례에는 더미에서 한 장 받거나 직전 버림패로 땡큐 등록을 하고, 원하는 만큼 등록·붙이기 후 한 장을 버립니다. 손을 비우면 훌라입니다.</p><p>같은 숫자 3장 이상, 같은 무늬의 연속 3장 이상, 또는 7 한 장을 등록할 수 있습니다. A는 낮거나 높게 쓰되 K-A-2로 잇지 않습니다. 7 한 장에는 같은 무늬의 이웃 숫자를 붙입니다. 내가 한 번 등록한 뒤에는 누구의 조합에나 붙일 수 있습니다.</p><p>이 테이블은 내 차례에만 땡큐를 허용합니다. 받기 전, 이미 등록했고 손패 합계가 2인 7점·3인 10점·4인 15점 이하면 스톱할 수 있습니다. 스톱이나 더미 소진 시 A=1부터 K=13까지 합산해 최저점자가 이깁니다. 동점은 공동 승리이며, 별도 배수 없이 승수를 겨룹니다. 판 수는 설정에서 5·10·20판이나 무제한으로 고릅니다.</p>';
function finished(){
  if(game.limit&&game.round>=game.limit)return true;
  return poker&&(game.players[0].chips===0||(game.limit>0&&game.players.filter(p=>p.chips).length<2));
}
const tally=p=>poker?p.chips-p.buyin:p.wins;
function changed(){
  selected=[];mirror();absorb();renderCardMove(render);
  try{const text=JSON.stringify(game);localStorage.setItem(key,text);lastSaved=text;}catch{$('msg').textContent+=' · 기기 저장 불가';}
}
function commit(action,event){
  const previousBoard = poker ? game.board.length : 0;
  if (!engine.play(game,action)) return;
  if (poker) {
    if (game.board.length > previousBoard) cardAudio.cue('deal', game.board.length - previousBoard);
    else if (action === 'call' || action === 'raise') cardAudio.cue('chip');
  } else if (action.kind === 'draw') cardAudio.cue('deal');
  else if (action.kind !== 'stop') cardAudio.cue('land');
  if (game.phase === 'result') announceResult();
  confirmCardTouch(event);
  changed();
}
function announceResult(){
  let outcome;
  if (!poker && !finished()) {
    outcome = !game.winners.includes(0) ? 'loss' : game.winners.length === 1 ? 'win' : 'draw';
  } else {
    const scores = game.players.map(tally);
    if (poker && !finished()) {
      scores.fill(0);
      game.report.forEach(({id,n}) => {scores[id] += n;});
      scores.forEach((score,i) => {scores[i] = score - game.players[i].paid;});
      outcome = scores[0] > 0 ? 'win' : scores[0] < 0 ? 'loss' : 'draw';
    } else {
      const rival = Math.max(...scores.slice(1));
      outcome = scores[0] > rival ? 'win' : scores[0] < rival ? 'loss' : 'draw';
    }
  }
  cardAudio.result(outcome);
}
function resultSummary(){
  if(!poker)return game.reason+' · '+game.winners.map(CardTable.seat).join(' / ')+' 승리';
  const sums=game.players.map((_,i)=>game.report.filter(r=>r.id===i).reduce((n,r)=>n+r.n,0));
  return sums.flatMap((n,i)=>n?[CardTable.seat(i)+' '+n+'칩 수령']:[]).join(' · ');
}
function schedule(){
  clearTimeout(timer);
  if(game&&game.phase!=='result'&&game.turn>0&&!$('modal').open)timer=setTimeout(()=>{if(fresh())commit(engine.ai(game));},550);
}
function render(){
  const g=game,end=g.phase==='result',mine=g.players[0],local=!end&&g.turn===0;
  $('name').textContent=title;$('balance').textContent=poker?'내 칩 '+mine.chips:'내 승수 '+mine.wins;
  $('round').textContent='ROUND '+g.round+(g.limit?' / '+g.limit:' · 무제한');$('msg').textContent=end?resultSummary():poker?CardTable.seat(g.turn)+' 차례':g.last||'내 차례에 카드를 받으세요.';
  $('opponents').innerHTML=g.players.slice(1).map((p,j)=>{
    const i=j+1,visible=end&&(!poker||g.showdown)&&!p.fold;
    return '<div class="opponent '+(!end&&g.turn===i?'active':'')+'"><b>'+CardTable.seat(i)+(poker&&g.button===i?' · D':'')+'</b><div class="miniCards">'+(visible?showCards(p.cards):poker?p.cards.map(()=>card(null,false,'상대 홀 카드')).join(''):'<span class="fanBacks" aria-hidden="true">'+Array.from({length:Math.min(p.cards.length,7)},(_,k,n=Math.min(p.cards.length,7))=>'<span class="card back" style="--o:'+(k-(n-1)/2)+'"></span>').join('')+'</span>손패 '+p.cards.length+'장')+'</div><small>'+(poker?p.chips+'칩 · '+(p.last||'대기')+(visible?' · '+Poker.evaluate([...p.cards,...g.board]).category:''):end?Hula.points(p.cards)+'점':p.open?'등록함':'미등록')+'</small></div>';
  }).join('');
  document.querySelector('.localSeat').classList.toggle('active',local);
  if(poker){
    $('street').textContent=end?(g.showdown?'쇼다운':'핸드 종료'):Poker.streets[g.street];
    $('pot').textContent='팟 '+g.players.reduce((s,p)=>s+p.paid,0)+'칩';
    $('boardCards').innerHTML=cardPile(g.deck.length,'덱')+showCards(g.board)+'<span class="slot" aria-hidden="true"></span>'.repeat(5-g.board.length);
    $('myCards').innerHTML=showCards(mine.cards);$('handScore').textContent=(g.button===0?'D · ':'')+(mine.fold?'폴드':g.board.length?Poker.evaluate([...mine.cards,...g.board]).category:'');
    $('controls').innerHTML=local?Poker.actions(g).map(a=>btn(a,{fold:'폴드',call:'콜 '+Math.min(mine.chips,g.price-mine.bet),check:'체크',raise:(g.price?'레이즈':'베트')+' +'+Poker.unit(g)}[a],true,a==='check'||a==='call')).join(''):'';
  }else{
    $('street').textContent=end?g.reason:CardTable.seat(g.turn)+(g.phase==='draw'?' · 받기':' · 등록 / 버리기');
    $('pot').textContent='더미 '+g.deck.length+'장';
    const top=g.discard.at(-1);
    $('boardCards').innerHTML='<div class="discardPile">'+(g.deck.length?cardPile(g.deck.length,'더미'):'')+'버림패 '+(top===undefined?'<span class="slot" aria-hidden="true"></span>없음':'<span class="discardStack'+(g.discard.length>1?' deep':'')+'">'+card(top)+'</span>')+'</div>'+g.groups.map((m,i)=>{
      const label=CardTable.seat(m.owner)+' · '+m.cards.slice().sort((a,b)=>CardTable.rank(a)-CardTable.rank(b)).map(short).join(' ');
      const valid=local&&g.phase==='arrange'&&mine.open&&selected.length===1&&Hula.fits(m.cards,selected[0]);
      return valid?btn('attach-'+i,label+'에 붙이기'):'<span class="groupCard">'+label+'</span>';
    }).join('');
    $('myCards').innerHTML=mine.cards.slice().sort((a,b)=>a-b).map((id,i,all)=>'<button class="handBtn" style="--o:'+(i-(all.length-1)/2)+'" data-id="'+id+'" aria-pressed="'+selected.includes(id)+'" '+(local&&g.phase==='arrange'?'':'disabled')+'>'+card(id)+'</button>').join('');
    $('handScore').textContent=Hula.points(mine.cards)+'점 · '+(mine.open?'등록함':'미등록');
    $('controls').innerHTML=!local?'':g.phase==='draw'?btn('draw','한 장 받기',true,true)+(Hula.thanks(g).length?btn('thanks','땡큐'):'')+(Hula.canStop(g)?btn('stop','스톱'):''):btn('meld','등록',Hula.meld(selected))+btn('discard','선택한 카드 버리기',selected.length===1,true);
  }
  if(end){
    if(finished()){
      const scores=g.players.map((p,i)=>({i,n:tally(p)})).sort((a,b)=>b.n-a.n);
      $('msg').textContent+=' · 최종 '+scores.map((p,i)=>{
        const rank=scores.findIndex(other=>other.n===p.n)+1;
        const tied=scores[i-1]?.n===p.n||scores[i+1]?.n===p.n;
        return (tied?'공동 ':'')+rank+'위 '+CardTable.seat(p.i)+' '+(poker&&p.n>0?'+':'')+p.n+(poker?'칩':'승');
      }).join(' / ');
    }
    $('controls').innerHTML=(finished()?'':btn('setup','설정'))+btn('next',finished()?'새 테이블':'다음 판',true,true);
  }
  schedule();
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-id],[data-act]')&&!fresh())return;
  const cardBtn=e.target.closest('[data-id]');
  if(cardBtn){const id=+cardBtn.dataset.id;selected=selected.includes(id)?selected.filter(c=>c!==id):[...selected,id];redrawHandSelection(cardBtn,render);return;}
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act;
  if(a==='start'){cardAudio.stopVoice();cardAudio.cue('deal',4);const limit=+$('limit').value;seen=Wallet.chips;game=poker?Poker.start(+$('count').value,Wallet.chips,limit):Hula.start(+$('count').value);game.limit=limit;$('modal').close();changed();return;}
  if(a==='refill'){Wallet.refill(key);cardAudio.cue('chip');setup();return;}
  if(!game)return;
  if(a==='setup'&&game.phase==='result'){setup();return;}
  if(a==='next'&&game.phase==='result'){cardAudio.stopVoice();absorb();if(finished())setup();else{engine.deal(game);cardAudio.cue('deal',4);changed();}return;}
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
Wallet.onChange(()=>{
  // Only redraw; the table is saved by its own moves, never by a wallet change.
  if(absorb()||cap())render();
  // The blackjack hand that held the refill has ended.
  else if(setupBlocked&&!Wallet.heldBy(key)&&$('modal').open)setup();
});
if(game){absorb();cap();render();}else setup();
