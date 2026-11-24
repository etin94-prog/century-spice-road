
"use strict";
const $=id=>document.getElementById(id);
const {resources:R,modes,cards}=Catan;
const description={sea:'본섬과 세 외딴섬 지도입니다. 목재와 양모 각 1장으로 배를 건조하고 새 섬마다 첫 정착 보너스 2점을 얻으세요. 열린 항로의 끝 배는 차례당 한 번 이동할 수 있습니다. 목표는 14점입니다.',knights:'마을 하나와 도시 하나로 시작합니다. 도시에서 얻은 직물·종이·화폐로 도시를 개선하고, 기사를 활성화해 야만인의 습격을 막으세요. 목표는 13점입니다.',classic:'자원을 교역하고 마을과 도시를 세워 먼저 10점을 달성하세요.',friendly:'공개 승점이 2점인 플레이어의 건물 주변에는 도둑을 놓을 수 없습니다. 목표는 10점입니다.',ports:'항구 건물 점수 3점부터 항구왕에 도전합니다. 단독으로 앞서면 보너스 2점을 얻으며, 목표는 11점입니다.'};
const colors=['#ef674e','#55a8ff','#fff2cb','#b47be4'];
const label={takeProgress:'가져올 진보 카드',dropProgress:'진보 카드 반납',pillage:'약탈당할 도시',reward:'수호 보상',returnProgress:'반납할 진보 카드',gold:'금광 자원 선택',loot:'가져올 카드',smith:'무료 기사 승급',harborTrade:'상업항 교환',ship:'배 건조',sail:'이동할 배',relocate:'새 항로 선택',cancel:'돌아가기',pirate:'해적 이동',recruit:'기사 모집',activate:'기사 활성화',promote:'기사 승급',march:'기사 이동',moveKnight:'이동할 곳',chase:'도둑 추방',wall:'성벽 건설',improve:'도시 개선',progress:'진보 카드 사용',water:'수로 자원 선택',alchemy:'연금술',retreat:'기사 후퇴',dismissKnight:'기사 반환',placeKnight:'기사 배치',gift:'자원 전달',road:'도로 건설',village:'마을 건설',city:'도시 건설',buy:'발전 카드 구입',roll:'주사위 굴리기',end:'차례 종료',robber:'도둑 이동',card:'발전 카드 사용',bank:'은행·항구 교역',offer:'플레이어 교환',accept:'수락',reject:'거절',gain:'자원 받기',take:'독점할 자원',discard:'자원 버리기',steal:'가져올 상대'};
const locationKinds=['pillage','village','road','city','robber','pirate','ship','sail','relocate','recruit','activate','promote','march','moveKnight','chase','wall','retreat','dismissKnight','placeKnight'];
const key='catan-table-v1';
let state=null,timer,selected=null,actions=[],waiting=false,saveFailed=false;
let loadNotice='';
try{
  const saved=Catan.readSave(localStorage.getItem(key));
  if(saved.kind==='ready')state=saved.game;
  if(saved.kind==='invalid')loadNotice='저장된 대국을 불러올 수 없습니다. 새 게임을 시작할 수 있습니다.';
}catch{loadNotice='기기 저장 공간을 읽을 수 없습니다.';}
function lobby(){
  clearTimeout(timer);$('game').hidden=true;$('settings').hidden=true;$('lobby').hidden=false;$('resume').hidden=!state||state.phase==='over';
  $('summary').textContent=[description[$('edition').value],loadNotice].filter(Boolean).join(' ');
  if(state)$('resume').textContent=modes[state.mode]+' 이어하기';
}
function seats(){const prior=$('humans').value;$('humans').replaceChildren();for(let i=1;i<=+$('count').value;i++)$('humans').add(new Option(i+'명 · AI '+(+$('count').value-i)+'명',i));if(prior&&+prior<=+$('count').value)$('humans').value=prior;}
function enter(){waiting=state.phase!=='over'&&!state.players[Catan.actor(state)].ai&&state.players.filter(p=>!p.ai).length>1;$('lobby').hidden=true;$('game').hidden=false;$('settings').hidden=false;render();}
$('settings').onclick=lobby;$('edition').onchange=lobby;$('count').onchange=seats;
$('config').onsubmit=e=>{e.preventDefault();if(state&&state.phase!=='over'&&!confirm('저장한 대국을 새 게임으로 교체할까요?'))return;state=Catan.start($('edition').value,+$('count').value,+$('humans').value);loadNotice='';save();enter();};
const requestedMode=new URLSearchParams(location.search).get('mode');
if(Object.hasOwn(modes,requestedMode))$('edition').value=requestedMode;
$('resume').onclick=enter;seats();lobby();
function save(){try{localStorage.setItem(key,JSON.stringify(state));saveFailed=false;}catch{saveFailed=true;}}
function act(a){
  const prior=Catan.actor(state);
  if(!Catan.play(state,a))return;
  selected=null;save();
  const next=Catan.actor(state);waiting=state.phase!=='over'&&next!==prior&&!state.players[next].ai&&state.players.filter(p=>!p.ai).length>1;render();
}
function button(txt,fn,cls=''){const b=document.createElement('button');b.type='button';b.textContent=txt;b.className=cls;b.onclick=fn;return b;}
function optionText([k,x,y,z]){
  switch(k){
    case 'bank':return `${R[x]} ${z}장 → ${R[y]} 1장`;
    case 'offer':return `${state.players[z].name}에게 ${R[x]} → ${R[y]}`;
    case 'dropProgress':return CatanCities.names[state.players[state.turn].progress[x].card];
    case 'reward':return CatanCities.tracks[x];
    case 'returnProgress':return CatanCities.names[state.players[state.respondent].progress[x].card];
    case 'takeProgress':return CatanCities.names[state.players[state.spyTarget].progress[x].card];
    case 'card':return cards[x];
    case 'harborTrade':return state.players[x].name+' · '+R[y];
    case 'placeKnight':return (x+1)+'번 · '+y+'급 기사';
    case 'smith':return (x+1)+'번 기사';
    case 'gold':case 'loot':case 'gift':case 'water':return R[x];
    case 'alchemy':return '빨간 주사위 '+y+' · 흰 주사위 '+z;
    case 'improve':return CatanCities.tracks[x]+' '+(state.players[state.turn].tracks[x]+1)+'단계'+(y!=null?' · 대도시 '+(y+1)+'번':'');
    case 'progress':return CatanCities.cardLabel(state,x,y,z,R);
    case 'gain':case 'take':case 'discard':return R[x];
    case 'steal':return state.players[x].name;
    default:return locationKinds.includes(k)?`${label[k]} · ${x+1}번`:label[k];
  }
}
function board(interactive){
  const s=state,px=v=>300+v.x*55,py=v=>277+v.y*55;
  const box=s.mode==='sea'?'-155 -150 910 850':'0 0 600 550';
  const bits=['<svg viewBox="'+box+'" aria-label="카탄 섬 지도">',islandRelief.defs];
  const mid=e=>({x:(s.nodes[e.a].x+s.nodes[e.b].x)/2,y:(s.nodes[e.a].y+s.nodes[e.b].y)/2});
  for(const [j,t] of s.tiles.entries()){
    const x=px(t),y=py(t),robbed=s.robber===j;
    bits.push(islandRelief.tile(t,x,y,robbed,s.merchant?.tile===j,t.res===8?'금광':R[t.res]||'사막',s.pirate===j));
  }
  for(const e of s.edges){
    const a=s.nodes[e.a],b=s.nodes[e.b];
    if(e.port!=null){
      const v=mid(e),length=Math.hypot(v.x,v.y),x=px(v)+v.x/length*25,y=py(v)+v.y/length*25;
      bits.push(`<path d="M${px(a)},${py(a)} L${x},${y} L${px(b)},${py(b)}" fill="none" stroke="#d8c396" stroke-width="2"/><rect x="${x-24}" y="${y-9}" width="48" height="18" rx="5" fill="#163d43"/><text x="${x}" y="${y}" fill="#fff2bc" font-size="10">${e.port<0?'일반 3:1':R[e.port]+' 2:1'}</text>`);
    }
    if(e.owner>=0&&e.ship){const v=mid(e);bits.push(`<path d="M${px(v)-10} ${py(v)-5}h20l-5 10h-10z" fill="${colors[e.owner]}" stroke="#173036" stroke-width="2"/>`);}
    if(e.owner>=0)bits.push(`<line x1="${px(a)}" y1="${py(a)}" x2="${px(b)}" y2="${py(b)}" stroke="#233235" stroke-width="10"/><line x1="${px(a)}" y1="${py(a)}" x2="${px(b)}" y2="${py(b)}" stroke="${colors[e.owner]}" stroke-width="6"/>`);
  }
  for(const v of s.nodes)if(v.owner>=0){
    const x=px(v),y=py(v),fill=colors[v.owner];
    bits.push(islandRelief.building(x,y,v.owner,fill,v.level>1));
  }
  for(const v of s.nodes){
    if(v.knight){const k=v.knight;bits.push(`<circle cx="${px(v)}" cy="${py(v)}" r="12" fill="${colors[k.owner]}" stroke="#24333a"/><text x="${px(v)}" y="${py(v)}" font-size="11">${k.active?'▲':'△'}${k.level}</text>`);}
    if(v.wall||v.metro!=null)bits.push(`<text x="${px(v)}" y="${py(v)-18}" fill="white" stroke="#203733" paint-order="stroke" stroke-width="3" font-size="12">${[v.wall?'성벽':'',v.metro!=null?'대도시':''].filter(Boolean).join('·')}</text>`);
  }
  if(interactive&&locationKinds.includes(selected))actions.forEach(([k,n],idx)=>{
    if(k!==selected)return;
    const v=['road','ship','sail','relocate'].includes(k)?mid(s.edges[n]):['robber','pirate'].includes(k)?s.tiles[n]:s.nodes[n];
    bits.push(`<g role="button" tabindex="0" data-index="${idx}" aria-label="${label[k]} ${n+1}번"><circle cx="${px(v)}" cy="${py(v)}" r="15" fill="transparent"/><circle class="spot" cx="${px(v)}" cy="${py(v)}" r="9"/><text x="${px(v)}" y="${py(v)}" font-size="9">${n+1}</text></g>`);
  });
  $('board').innerHTML=bits.join('')+'</svg>';
}
$('board').onclick=e=>{const target=e.target.closest('[data-index]');if(target)act(actions[+target.dataset.index]);};
$('board').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const t=e.target.closest('[data-index]');if(t){e.preventDefault();act(actions[+t.dataset.index]);}}};
function render(){
  clearTimeout(timer);
  const s=state,i=Catan.actor(s),p=s.players[i],over=s.phase==='over',interactive=!over&&!p.ai&&!waiting;
  const visible=over?i:interactive?i:s.players.filter(q=>!q.ai).length===1?0:-1;
  $('title').textContent=modes[s.mode];$('target').textContent='목표 '+Catan.target(s)+'점';$('variant').textContent=description[s.mode];
  const ck=s.mode==='knights';
  $('expansion').textContent=ck?'야만인 접근 '+s.invaders+'/7　·　'+(s.eventName||'첫 항해 전')+'　·　기사 방어력 '+s.nodes.reduce((a,n)=>a+(n.knight?.active?n.knight.level:0),0)+' / 도시 '+s.nodes.filter(n=>n.level===2).length:s.mode==='sea'?'본섬과 세 외딴섬　·　새 섬 첫 정착 +2점':'';
  const rules=$('variant').parentElement.querySelectorAll('p');
  rules[2].hidden=ck;
  rules[1].hidden=ck;
  rules[0].textContent='도로는 목재·벽돌 각 1장, 마을은 목재·벽돌·양모·곡식 각 1장, 도시는 곡식 2장과 광석 3장이 필요합니다.'+(ck?'':' 발전 카드는 양모·곡식·광석 각 1장입니다.');
  document.querySelector('.legend').textContent='낮은 집은 마을, 탑이 있는 건물은 도시　'+(ck?'▲ 활성 기사　△ 대기 기사':s.mode==='sea'?'배 모양 표식은 항로':'')+'　· 점선 원은 선택 가능';
  $('variant').textContent=description[s.mode]+(ck?' 기사 모집과 승급은 양모·광석 각 1장, 활성화는 곡식 1장입니다. 성벽은 벽돌 2장이며 손패 한도를 2장 늘립니다. 야만인이 7칸 전진하면 활성 기사 전력과 전체 도시 수를 비교합니다. 개선 4단계부터 대도시를 세워 2점을 얻습니다.':'');
  const prizes={road:'최장 도로',army:'최대 기사단',port:'항구왕'};
  $('scores').replaceChildren(...s.players.map((q,j)=>{
    const seat=document.createElement('span'),name=document.createElement('b');
    if(i===j)seat.className='current';
    name.style.color=colors[j];name.textContent=(j+1)+' · '+q.name;
    const awards=Object.entries(s.awards).filter(([,owner])=>owner===j).map(([k])=>prizes[k]);
    seat.append(name,'　'+Catan.points(s,j,visible===j||over)+'점',awards.length?' · '+awards.join(' · '):'');return seat;
  }));
  $('who').textContent=over?p.name+' 승리':p.name+' 차례';
  const o=s.offer;
  const hints={spy:'확인한 상대의 진보 카드 중 한 장을 고르세요.',pillage:'마을로 강등할 도시를 고르세요.',reward:'공동 방어 보상으로 받을 진보 카드 계열을 고르세요.',returnProgress:'보유 한도를 넘어 반납할 진보 카드를 고르세요.',gold:'금광에서 받을 자원을 고르세요.',smith:'무료로 승급할 기사를 고르세요.',loot:'상대에게서 가져올 카드를 고르세요.',sail:'배를 옮길 항로를 고르세요.',march:'기사를 보낼 교차점을 고르세요.',aqueduct:'수로로 받을 자원 한 장을 고르세요.',retreat:'밀려난 기사의 후퇴 지점을 고르세요.',dismiss:'반환할 기사를 고르세요.',place:'기사를 배치할 지점을 고르세요.',gift:'전달할 카드를 고르세요.',setupVillage:'첫 정착지를 지을 꼭짓점을 고르세요.',setupRoad:'방금 세운 마을에 연결할 도로를 고르세요.',turn:s.rolled?'건설·교역을 하거나 차례를 마치세요.':'주사위를 굴려 자원을 생산하세요.',robber:'도둑을 옮길 땅을 고르세요.',victim:'무작위 자원 1장을 가져올 상대를 고르세요.',discard:'버릴 자원 '+(s.discard[0]?.n||0)+'장을 고르세요.',freeRoad:'무료 도로를 놓을 위치를 고르세요.',monopoly:'상대에게서 모두 가져올 자원을 고르세요.',plenty:'은행에서 받을 자원을 고르세요.',offer:o?`${s.players[o.from].name}의 제안 · ${R[o.give]} 1장을 받고 ${R[o.want]} 1장을 줍니다.`:''};
  $('hint').textContent=(saveFailed?'자동 저장 불가 · ':'')+(over?'목표 승점에 도달했습니다.':waiting?'기기를 건네고 아래 버튼을 누르세요.':p.ai?'AI가 수를 고르고 있습니다.':(s.dice.length?'주사위 '+s.dice.join(' + ')+' · ':'')+hints[s.phase]);
  $('hand').innerHTML=visible<0?'차례를 확인하면 표시됩니다.':s.players[visible].hand.map((n,r)=>`<span>${R[r]} <b>${n}</b></span>`).join('');
  $('dev').textContent=visible<0?'':'발전 카드 · '+(cards.map((c,k)=>{const n=s.players[visible].dev[k]+s.players[visible].fresh[k];return n?c+' '+n:'';}).filter(Boolean).join(', ')||'없음');
  if(ck&&visible>=0){const q=s.players[visible];$('dev').textContent=q.tracks.map((n,k)=>CatanCities.tracks[k]+' '+n+'단계').join(' · ')+' / 진보 카드 '+(q.progress.map(c=>CatanCities.names[c.card]).join(', ')||'없음');}
  if(ck&&s.phase==='setupVillage'&&s.step>=s.players.length&&!waiting&&!p.ai)$('hint').textContent='두 번째 정착지에 도시를 세우세요.';
  $('log').replaceChildren(...s.log.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  const bar=$('controls');bar.replaceChildren();actions=interactive?Catan.choices(s):[];
  const kinds=[...new Set(actions.map(a=>a[0]))];
  if(!kinds.includes(selected))selected=kinds.length===1?kinds[0]:null;
  if(waiting)bar.append(button('내 차례 확인',()=>{waiting=false;render();},'primary'));
  if(over)bar.append(button('다시 플레이',lobby,'primary'));
  for(const k of kinds){
    const group=actions.filter(a=>a[0]===k);
    if(group[0].length===1){bar.append(button(label[k],()=>act(group[0]),k==='roll'?'primary':''));continue;}
    if(kinds.length>1)bar.append(button(label[k],()=>{selected=k;render();},selected===k?'active':''));
  }
  if(selected&&actions.some(a=>a[0]===selected&&a.length>1)){
    const group=document.createElement('div'),select=document.createElement('select');group.className='group';select.setAttribute('aria-label',label[selected]);
    actions.forEach((a,j)=>{if(a[0]===selected)select.add(new Option(optionText(a),j));});
    group.append(select,button('선택 확정',()=>act(actions[+select.value])));bar.append(group);
  }
  board(interactive);
  if(!over&&p.ai)timer=setTimeout(()=>act(Catan.ai(state)),480);
}
