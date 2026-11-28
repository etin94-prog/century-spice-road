'use strict';
const $=id=>document.getElementById(id),key='worldwide-tichu-v1';
const who=['나','왼쪽 상대','맞은편 파트너','오른쪽 상대'];
const special=['마작','개','봉황','용'],symbols=['雀','犬','鳳','龍'];
const rankName=n=>({11:'J',12:'Q',13:'K',14:'A'}[n]||String(n));
const compact=c=>c>=52?special[c-52]:ranks[c%13]+suits[Math.floor(c/13)]+'︎';
const show=id=>id<52?card(id):'<span class="card tSpecial s'+id+'" role="img" aria-label="'+special[id-52]+'"><b>'+symbols[id-52]+'</b><small>'+special[id-52]+'</small></span>';
let g,sel=[],timer,skipBomb=false;
try{const data=JSON.parse(localStorage.getItem(key));if(data?.p?.length===4&&['grand','exchange','play','dragon','result'].includes(data.phase))g=data;}catch{}
function btn(a,text,on=true){return '<button data-a="'+a+'" '+(on?'':'disabled')+'>'+text+'</button>';}
function modal(title,html){clearTimeout(timer);$('title').textContent=title;$('body').innerHTML=html;$('close').hidden=!g;if(!$('modal').open)$('modal').showModal();}
function done(){return Math.max(...g.totals)>=1000&&g.totals[0]!==g.totals[1];}
function save(){try{localStorage.setItem(key,JSON.stringify(g));}catch{$('msg').textContent+=' · 저장 불가';}}
function changed(cue,count){
  if(cue)cardAudio.cue(cue,count);
  if(g.phase==='result'){
    const [own,opponent]=done()?g.totals:g.delta;
    cardAudio.result(own>opponent?'win':own<opponent?'loss':'draw');
  }
  sel=[];skipBomb=false;renderCardMove(render);save();
}
function prep(){modal('티츄 · 팀 대전','<p>나와 맞은편 AI가 한 팀으로 두 상대 AI와 겨룹니다. 목표는 1,000점입니다.</p>'+btn('start','4인 대국 시작')+'<a class="setupBack" href="./#worldwide">게임 선택으로</a>');}
const help='<p>8장을 본 뒤 그랜드 티츄(±200점)를, 첫 카드를 내기 전에는 스몰 티츄(±100점)를 선언할 수 있습니다. 선언한 사람이 첫 번째로 손을 비워야 성공합니다. 14장 중 왼쪽·파트너·오른쪽에게 한 장씩 교환합니다.</p><p>마작을 받은 사람이 선입니다. 싱글, 페어, 트리플, 풀하우스, 연속 페어, 5장 이상 스트레이트를 낼 수 있습니다. 같은 형태와 장수의 더 높은 조합으로 받거나 패스하세요.</p><p>마작은 1이며 숫자 하나를 소원으로 부를 수 있습니다. 차례에 그 숫자의 실제 카드를 합법적으로 낼 수 있으면 반드시 냅니다. 개는 선을 파트너에게 넘깁니다. 봉황은 일반 조합의 와일드이며 싱글로는 직전 카드보다 ½ 높습니다. 용은 최고 싱글이며 이긴 트릭은 상대에게 줍니다.</p><p>포 카드와 같은 무늬 스트레이트는 폭탄입니다. 장수, 그다음 최고 숫자 순으로 비교합니다. 내 차례 밖에도 폭탄 기회를 선택할 수 있습니다.</p><p>5는 5점, 10과 K는 10점, 용은 +25점, 봉황은 −25점입니다. 꼴찌는 획득 트릭을 1등에게, 남은 손패를 상대 팀에게 줍니다. 같은 팀이 1·2등이면 카드 점수 대신 200점입니다.</p>';
function moves(){return g.phase==='play'?Tichu.legal(g,0):[];}
function matches(options){return options.filter(m=>m.cards.length===sel.length&&m.cards.every(c=>sel.includes(c)));}
function isBombWindow(){return g.phase==='play'&&g.turn!==0&&!skipBomb&&moves().length>0;}
function schedule(){
  clearTimeout(timer);if(!g||$('modal').open)return;
  if(g.phase==='dragon'&&g.turn!==0){timer=setTimeout(()=>{const targets=[(g.turn+1)%4,(g.turn+3)%4];Tichu.gift(g,targets.sort((a,b)=>g.p[b].hand.length-g.p[a].hand.length)[0]);changed('land');},500);return;}
  if(g.phase!=='play'||isBombWindow())return;
  // AI may interrupt opposing plays, even when another seat is due to act.
  if(g.top){for(let k=1;k<=4;k++){const i=(g.leader+k)%4;if(!i||i===g.turn||i%2===g.leader%2)continue;
    const bomb=Tichu.legal(g,i)[0];if(bomb&&(g.p[i].hand.length===bomb.cards.length||g.p[g.leader].hand.length<=2)){
      timer=setTimeout(()=>{if(Tichu.play(g,i,bomb))changed('land');},600);return;
    }
  }}
  if(g.turn!==0)timer=setTimeout(()=>{
    const i=g.turn,m=Tichu.ai(g,i);
    if(m)Tichu.play(g,i,m,m.cards.includes(Tichu.M)?14:0);else Tichu.pass(g,i);
    changed(m ? 'land' : undefined);
  },500);
}
function render(){
  clearTimeout(timer);const phase=g.phase,options=moves(),windowOpen=isBombWindow(),local=g.turn===0||windowOpen;
  $('round').textContent='ROUND '+g.round;$('balance').textContent='우리 '+g.totals[0]+' · 상대 '+g.totals[1];
  $('opponents').innerHTML=[1,2,3].map(i=>'<div class="opponent '+(g.turn===i&&phase==='play'?'active':'')+'"><b>'+who[i]+'</b><small>'+g.p[i].hand.length+'장'+(g.p[i].call?' · 티츄 '+g.p[i].call:'')+(g.order.includes(i)?' · '+(g.order.indexOf(i)+1)+'등':'')+'</small></div>').join('');
  const phaseNames={grand:'그랜드 티츄',exchange:'교환할 카드',play:g.top?who[g.leader]+' · '+Tichu.labels[g.top.type]:who[g.turn]+' 선',dragon:'용 트릭 전달',result:'라운드 정산'};
  $('street').textContent=phaseNames[phase];$('pot').textContent=g.wish?'소원 '+rankName(g.wish):'';
  $('boardCards').innerHTML=phase==='result'?'<strong>우리 '+g.delta[0]+'점 · 상대 '+g.delta[1]+'점</strong>':phase==='exchange'?['왼쪽','파트너','오른쪽'].map((t,j)=>'<span class="gift">'+t+' '+(sel[j]===undefined?'선택':show(sel[j]))+'</span>').join(''):g.top?g.top.cards.map(show).join(''):'';
  $('detail').textContent=phase==='result'?g.order.map((i,j)=>(j+1)+'등 '+who[i]).join(' · '):phase==='play'&&!g.p[0].played?'받은 카드　'+g.p[0].received.map(x=>who[x.from]+' '+compact(x.c)).join(' · '):'';
  const canSelect=phase==='exchange'||phase==='play'&&local;
  $('myCards').innerHTML=g.p[0].hand.slice().sort((a,b)=>Tichu.rank(a)-Tichu.rank(b)||a-b).map((c,i,all)=>'<button class="handBtn" style="--o:'+(i-(all.length-1)/2)+'" data-id="'+c+'" aria-pressed="'+sel.includes(c)+'" '+(canSelect&&(phase!=='exchange'||sel.length<3||sel.includes(c))?'':'disabled')+'>'+show(c)+'</button>').join('');
  $('handScore').textContent=g.p[0].hand.length+'장'+(phase==='exchange'?' · 선택 '+sel.length+'/3':'')+(g.p[0].call?' · 티츄 '+g.p[0].call:'');
  $('msg').textContent=phase==='grand'?'처음 8장을 보고 선언하세요.':phase==='exchange'?'왼쪽 → 파트너 → 오른쪽 순서로 한 장씩 선택하세요.':phase==='dragon'?who[g.turn]+'의 용 전달':phase==='result'?(done()?(g.totals[0]>g.totals[1]?'우리 팀 승리':'상대 팀 승리'):'라운드 종료'):windowOpen?'상대 차례 · 폭탄을 내거나 진행하세요.':who[g.turn]+' 차례'+(g.last?' · '+g.last:'');
  let controls='';
  if(phase==='grand')controls=btn('grand','그랜드 선언')+btn('continue','6장 더 받기');
  if(phase==='exchange')controls=btn('exchange','3장 교환',sel.length===3);
  if(phase==='play'&&local){
    const found=matches(options);
    if(sel.includes(Tichu.M))controls+='<select id="wish" aria-label="마작 소원"><option value="0">소원 없음</option>'+Array.from({length:13},(_,j)=>'<option value="'+(j+2)+'">'+rankName(j+2)+'</option>').join('')+'</select>';
    if(found.length>1)controls+='<select id="shape" aria-label="봉황 조합 선택">'+found.map((m,j)=>'<option value="'+j+'">'+Tichu.labels[m.type]+' · '+rankName(m.high)+'</option>').join('')+'</select>';
    controls+=btn('suggest','가능한 패')+btn('play',windowOpen?'폭탄 내기':'선택한 패 내기',!!found.length);
    if(windowOpen)controls+=btn('skip','진행');else if(g.top)controls+=btn('pass','패스',!Tichu.required(g,0));
  }
  if(['play','exchange'].includes(phase)&&!g.p[0].played&&!g.p[0].call)controls+=btn('small','스몰 티츄');
  if(phase==='dragon'&&g.turn===0)controls=btn('gift1','왼쪽 상대에게')+btn('gift3','오른쪽 상대에게');
  if(phase==='result')controls=btn('next',done()?'새 대국':'다음 라운드');
  $('controls').innerHTML=controls;schedule();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.id!==undefined){const c=Number(b.dataset.id);if(sel.includes(c))sel=sel.filter(v=>v!==c);else if(g.phase!=='exchange'||sel.length<3)sel.push(c);redrawHandSelection(b,render);return;}
  const a=b.dataset.a;if(!a)return;
  if(a==='start'){cardAudio.stopVoice();g=Tichu.start();$('modal').close();changed('deal',4);return;}
  let ok=false;
  if(a==='grand'||a==='continue')ok=Tichu.grand(g,a==='grand');
  if(a==='exchange')ok=Tichu.exchange(g,sel);
  if(a==='small')ok=Tichu.small(g,0);
  if(a==='pass')ok=Tichu.pass(g,0);
  if(a==='skip'){skipBomb=true;sel=[];render();return;}
  if(a==='suggest'){const opts=moves(),at=opts.findIndex(m=>m.cards.length===sel.length&&m.cards.every(c=>sel.includes(c)));sel=opts.length?opts[(at+1)%opts.length].cards.slice():[];render();return;}
  if(a==='play'){const m=matches(moves())[Number($('shape')?.value||0)];if(m)ok=Tichu.play(g,0,m,Number($('wish')?.value||0));}
  if(a.startsWith('gift'))ok=Tichu.gift(g,Number(a.slice(4)));
  if(a==='next'){cardAudio.stopVoice();if(done()){prep();return;}Tichu.deal(g);ok=true;}
  if(ok){
    if (['exchange','play','gift1','gift3'].includes(a)) confirmCardTouch(e);
    const isDeal=['grand','continue','exchange','next'].includes(a);
    const isLand=a==='play'||a.startsWith('gift');
    changed(isDeal?'deal':isLand?'land':undefined,isDeal?3:1);
  }
});
$('guide').onclick=()=>modal('티츄 규칙',help);$('close').onclick=()=>$('modal').close();$('modal').onclose=schedule;$('modal').oncancel=e=>{if(!g)e.preventDefault();};
$('name').textContent='Tichu';document.body.className='tichu';if(g)render();else prep();
