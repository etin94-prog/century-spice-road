'use strict';
const $=id=>document.getElementById(id),key='worldwide-blackjack-v1';
let g=Blackjack.table(),timer,saveFailed=false;
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&Array.isArray(saved.bots)&&Array.isArray(saved.hands)&&Array.isArray(saved.shoe)&&['bet','insurance','play','bots','dealer','result'].includes(saved.phase))g=saved;}catch{}
const labels={hit:'히트 · 한 장',stand:'스탠드',double:'더블',split:'스플릿',insure:'보험 가입',decline:'보험 패스'};
function button(id,label,primary=false){return '<button data-action="'+id+'" class="'+(primary?'primary':'')+'">'+label+'</button>';}
let painted=new Map();
function updateWithAudio(action, isDeal=false){
  const previousPhase=g.phase;
  const cardCount=()=>g.dealer.length+g.hands.reduce((sum,hand)=>sum+hand.cards.length,0)
    +g.bots.reduce((sum,bot)=>sum+(bot.hand?.cards.length||0),0);
  const before=cardCount();
  if(action()===false)return false;
  const gained=cardCount()-before;
  if(gained>0)cardAudio.cue('deal',isDeal?Math.min(gained,4):gained);
  else if(previousPhase!=='dealer'&&g.phase==='dealer')cardAudio.cue('land');
  if(previousPhase!=='result'&&g.phase==='result'){
    const rival=Math.max(...g.bots.map(bot=>bot.chips));
    const margin=(g.round===5||g.chips<2)&&g.bots.length?g.chips-rival:g.net;
    cardAudio.result(margin>0?'win':margin<0?'loss':'draw');
  }
  draw(true);
  return true;
}
function draw(changed=false){
  clearTimeout(timer);
  if(changed)try{localStorage.setItem(key,JSON.stringify(g));saveFailed=false;}catch{saveFailed=true;}
  const bet=g.phase==='bet',end=g.phase==='result',open=['dealer','result'].includes(g.phase);
  const nextPaint=new Map();
  function spread(key,ids){
    nextPaint.set(key,ids.slice());
    const old=painted.get(key)||[];
    return ids.map((id,i)=>card(id,changed&&id!==old[i])).join('');
  }
  document.body.dataset.phase=g.phase;
  $('balance').textContent=g.chips;
  $('dealer').innerHTML=spread('house',g.dealer.length?g.dealer.map((id,i)=>i===1&&!open?null:id):[null]);
  $('dealerScore').textContent=g.dealer.length?Blackjack.score(open?g.dealer:g.dealer.slice(0,1)).total:'';
  function hand(h,title,active,key){
    const value=Blackjack.score(h.cards);
    return '<div class="hand '+(active?'selected':'')+'"><div class="handTitle"><b>'+title+'</b><strong>'+value.total+'<small>점</small></strong></div><div class="cards">'+spread(key,h.cards)+'</div><div class="handMeta"><span>'+h.bet+'칩</span>'+(h.result?'<b>'+h.result+'</b>':'')+'</div></div>';
  }
  $('hands').innerHTML=g.hands.map((h,i)=>hand(h,g.hands.length>1?'내 손패 '+(i+1):'내 손패',g.phase==='play'&&g.index===i,'mine'+i)).join('');
  $('others').innerHTML=bet?'':g.bots.map((b,i)=>b.hand?hand(b.hand,'AI '+(i+1),g.phase==='bots'&&g.botIndex===i,'bot'+i):'<small>AI '+(i+1)+' · '+b.chips+'칩</small>').join('');
  painted=nextPaint;
  const finished=end&&(g.round===5||g.chips<2);
  let text=bet?'베팅 금액을 선택하세요.':g.phase==='insurance'?'딜러 A · 보험 '+(g.stake/2)+'칩':g.phase==='play'?'내 차례':g.phase==='bots'?'AI '+(g.botIndex+1)+' 차례':g.phase==='dealer'?'딜러 차례':'이번 손 '+(g.net>0?'+':'')+g.net+'칩';
  $('standings').hidden=!finished;
  if(finished){
    const totals=[g,...g.bots].map((p,i)=>({name:i?'AI '+i:'나',chips:p.chips})).sort((a,b)=>b.chips-a.chips);
    let rank=1;
    $('standings').innerHTML=totals.map((p,i)=>{
      if(i&&p.chips!==totals[i-1].chips)rank=i+1;
      return '<span><b>'+rank+'위</b> '+p.name+' · '+p.chips+'칩</span>';
    }).join('');
    text+=' · 최종 순위';
  }
  $('round').textContent='ROUND '+Math.max(1,g.round+(bet?1:0))+' / 5';
  $('message').textContent=text+(saveFailed?' · 저장 불가':'');
  const amounts=[...new Set([2,10,20,50,100,g.stake])].filter(v=>v<=g.chips).sort((a,b)=>a-b);
  $('betArea').hidden=!bet;
  $('wager').textContent=g.stake+' 칩';
  $('chips').innerHTML=bet?amounts.map((v,i)=>'<button class="chip tone'+i+'" data-bet="'+v+'" aria-label="'+v+'칩 베팅" aria-pressed="'+(g.stake===v)+'"><b>'+v+'</b></button>').join(''):'';
  $('seating').innerHTML=bet&&!g.round?'<label>참가자 <select id="count">'+[1,2,3,4].map(n=>'<option '+(n===g.bots.length+1?'selected':'')+' value="'+n+'">'+(n===1?'나 혼자':'나 + AI '+(n-1))+'</option>').join('')+'</select></label>':'';
  $('controls').innerHTML=bet?button('deal',g.stake+'칩 딜',true):end?button('next',finished?'새 테이블':'다음 베팅',true):Blackjack.actions(g).map(a=>button(a,labels[a],a==='stand'||a==='decline')).join('');
  if($('count'))$('count').onchange=e=>{const stake=g.stake;g=Blackjack.table(+e.target.value);g.stake=stake;draw(true);};
  if(['bots','dealer'].includes(g.phase)&&!$('help').open)timer=setTimeout(()=>{updateWithAudio(()=>Blackjack.dealerStep(g));},450);
}
$('chips').onclick=$('controls').onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.bet&&g.phase==='bet')g.stake=+b.dataset.bet;
  else if(b.dataset.action==='deal'){if(updateWithAudio(()=>Blackjack.deal(g),true))confirmCardTouch(e);return;}
  else if(b.dataset.action==='next'&&g.phase==='result'){
    cardAudio.stopVoice();
    if(g.round>=5||g.chips<2)g=Blackjack.table(g.bots.length+1);
    else{g.phase='bet';g.stake=Math.min(g.stake,2*Math.floor(g.chips/2));g.hands=[];g.dealer=[];g.bots.forEach(b=>b.hand=null);}
  }else{if(updateWithAudio(()=>Blackjack.play(g,b.dataset.action)))confirmCardTouch(e);return;}
  if(b.dataset.bet)cardAudio.cue('chip');
  draw(true);
  if(b.dataset.bet)$('chips').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
};
$('rules').onclick=()=>{clearTimeout(timer);$('help').showModal();};$('dismiss').onclick=()=>$('help').close();$('help').onclose=()=>draw();
draw();
