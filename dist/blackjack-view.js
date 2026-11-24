'use strict';
const $=id=>document.getElementById(id),key='worldwide-blackjack-v1';
let g=Blackjack.table(),timer,saveFailed=false;
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&Array.isArray(saved.bots)&&Array.isArray(saved.hands)&&Array.isArray(saved.shoe)&&['bet','insurance','play','bots','dealer','result'].includes(saved.phase))g=saved;}catch{}
const suits=['♠','♥','♣','♦'],ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const points=[[20,9],[80,9],[20,36],[80,36],[20,64],[80,64],[20,91],[80,91],[50,50],[50,25],[50,75],[50,9],[50,91]];
const layouts=[[8],[11,12],[11,8,12],[0,1,6,7],[0,1,8,6,7],[0,1,2,3,6,7],[0,1,2,3,6,7,9],[0,1,2,3,6,7,9,10],[0,1,2,3,4,5,6,7,8],[0,1,2,3,4,5,6,7,9,10]];
function card(id,animate=false){
  if(id===null)return '<span class="card back" role="img" aria-label="딜러의 뒷면 카드"></span>';
  const rank=Blackjack.rank(id),suit=id/13|0,sign=suits[suit],face=ranks[rank],corner=face+'<small>'+sign+'</small>';
  const center=rank<10?'<span class="pips">'+layouts[rank].map(i=>'<i style="left:'+points[i][0]+'%;top:'+points[i][1]+'%">'+sign+'</i>').join('')+'</span>':'<span class="center">'+['♞','♛','♚'][rank-10]+'</span>';
  return '<span role="img" aria-label="'+['스페이드','하트','클로버','다이아'][suit]+' '+face+'" class="card '+(suit%2?'red ':'')+(animate?'dealIn':'')+'"><span aria-hidden="true"><span class="corner">'+corner+'</span>'+center+'<span class="corner end">'+corner+'</span></span></span>';
}
const labels={hit:'히트 · 한 장',stand:'스탠드',double:'더블',split:'스플릿',insure:'보험 가입',decline:'보험 패스'};
function button(id,label,primary=false){return '<button data-action="'+id+'" class="'+(primary?'primary':'')+'">'+label+'</button>';}
function draw(changed=false){
  clearTimeout(timer);
  if(changed)try{localStorage.setItem(key,JSON.stringify(g));saveFailed=false;}catch{saveFailed=true;}
  const bet=g.phase==='bet',end=g.phase==='result',open=['dealer','result'].includes(g.phase);
  $('balance').textContent='내 칩 '+g.chips;$('dealer').innerHTML=g.dealer.length?g.dealer.map((id,i)=>card(i===1&&!open?null:id,changed&&i===g.dealer.length-1)).join(''):card(null);
  $('dealerScore').textContent=g.dealer.length?Blackjack.score(open?g.dealer:g.dealer.slice(0,1)).total:'';
  function hand(h,title,active){return '<div class="hand '+(active?'selected':'')+'"><div class="label">'+title+' · '+Blackjack.score(h.cards).total+'점 · '+h.bet+'칩'+(h.result?' · '+h.result:'')+'</div><div class="cards">'+h.cards.map((id,i)=>card(id,changed&&i===h.cards.length-1)).join('')+'</div></div>';}
  $('hands').innerHTML=g.hands.map((h,i)=>hand(h,g.hands.length>1?'내 손패 '+(i+1):'내 손패',g.phase==='play'&&g.index===i)).join('');
  $('others').innerHTML=g.bots.map((b,i)=>b.hand?hand(b.hand,'AI '+(i+1),g.phase==='bots'&&g.botIndex===i):'<small>AI '+(i+1)+' · '+b.chips+'칩</small>').join('');
  const finished=end&&(g.round===5||g.chips<2);
  let text=bet?'베팅 금액을 선택하세요.':g.phase==='insurance'?'딜러 A · 보험 '+(g.stake/2)+'칩':g.phase==='play'?'내 차례':g.phase==='bots'?'AI '+(g.botIndex+1)+' 차례':g.phase==='dealer'?'딜러 차례':'이번 손 '+(g.net>0?'+':'')+g.net+'칩';
  if(finished){const totals=[g,...g.bots].map((p,i)=>({name:i?'AI '+i:'나',chips:p.chips})).sort((a,b)=>b.chips-a.chips);text+=' · 최종 '+totals.map(p=>p.name+' '+p.chips).join(' / ');}
  $('message').textContent=Math.max(1,g.round+(bet?1:0))+'/5 · '+text+(saveFailed?' · 저장 불가':'');
  const amounts=[...new Set([2,10,20,50,100,g.stake])].filter(v=>v<=g.chips).sort((a,b)=>a-b);
  $('controls').innerHTML=bet?(!g.round?'<label>참가 <select id="count">'+[1,2,3,4].map(n=>'<option '+(n===g.bots.length+1?'selected':'')+' value="'+n+'">'+(n===1?'나 혼자':'나 + AI '+(n-1))+'</option>').join('')+'</select></label>':'')+amounts.map(v=>'<button class="chip" data-bet="'+v+'" aria-pressed="'+(g.stake===v)+'">'+v+'</button>').join('')+button('deal',g.stake+'칩 딜',true):end?button('next',finished?'새 테이블':'다음 베팅',true):Blackjack.actions(g).map(a=>button(a,labels[a],a==='stand'||a==='decline')).join('');
  if($('count'))$('count').onchange=e=>{const stake=g.stake;g=Blackjack.table(+e.target.value);g.stake=stake;draw(true);};
  if(['bots','dealer'].includes(g.phase)&&!$('help').open)timer=setTimeout(()=>{Blackjack.dealerStep(g);draw(true);},450);
}
$('controls').onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.bet&&g.phase==='bet')g.stake=+b.dataset.bet;
  else if(b.dataset.action==='deal')Blackjack.deal(g);
  else if(b.dataset.action==='next'&&g.phase==='result'){
    if(g.round>=5||g.chips<2)g=Blackjack.table(g.bots.length+1);
    else{g.phase='bet';g.stake=Math.min(g.stake,2*Math.floor(g.chips/2));g.hands=[];g.dealer=[];g.bots.forEach(b=>b.hand=null);}
  }else Blackjack.play(g,b.dataset.action);
  draw(true);
};
$('rules').onclick=()=>{clearTimeout(timer);$('help').showModal();};$('dismiss').onclick=()=>$('help').close();$('help').onclose=()=>draw();
draw();
