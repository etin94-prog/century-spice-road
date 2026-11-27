// Revolt Evo workshop. Its two local training cards can be added to the current book.
const evoWorkshop=C.evo?el('details',null,'evo-workshop'):null;
const evoStorage='cept-evo-revolt-v1';
let evoSlot=0,evoStatus='';
function readEvoProfile(){
  try{
    const saved=JSON.parse(localStorage.getItem(evoStorage));
    if(saved?.recipes?.length===2&&saved.recipes.every(r=>Number.isInteger(r.sp)&&C.evo.valid(r))&&
       Array.isArray(saved.rewarded)&&saved.rewarded.every(key=>typeof key==='string'))return saved;
  }catch{}
  return {recipes:[C.evo.fresh(),C.evo.fresh()],rewarded:[]};
}
let evoProfile=C.evo?readEvoProfile():null;
function replaceEvoIds(deck){
  return deck.map(id=>{
    const c=C.cards[id];
    return c?.evo?C.evo.encode(evoProfile.recipes[c.evoSlot],c.evoSlot)??id:id;
  });
}
function saveEvoProfile(){
  draftEvos=replaceEvoIds(draftEvos);
  if(customBook)customBook=replaceEvoIds(customBook);
  try{
    localStorage.setItem(evoStorage,JSON.stringify(evoProfile));
    if(customBook)localStorage.setItem(bookKey,JSON.stringify(customBook));
  }catch{evoStatus='이 창에서만 육성 결과를 사용할 수 있습니다.';}
}
function rewardEvos(game,room){
  const winners=C.outcome(game).winners,key=room?.id||game.evoMatch;
  if(!key||!winners.length)return [];
  const ids=room?(winners.includes(room.seat)?game.players[room.seat].evoRewardBook||[]:[]):
    winners.flatMap(seat=>game.players[seat].ai?[]:game.players[seat].template||[]);
  if(!ids.some(id=>C.cards[id]?.evo))return [];
  if(evoProfile.rewarded.includes(key))return [];
  const latest=readEvoProfile();
  if(latest.rewarded.includes(key)){evoProfile=latest;return [];}
  evoProfile=latest;
  const earned=[];
  for(const [slot,recipe] of evoProfile.recipes.entries()){
    if(recipe.age>=10||!ids.includes(C.evo.encode(recipe,slot)))continue;
    evoProfile.recipes[slot]=C.evo.won(recipe);earned.push(slot);
  }
  if(earned.length){
    evoProfile.rewarded.push(key);saveEvoProfile();renderEvoEditor();
  }
  return earned;
}
function renderEvoEditor(){
  if(!evoWorkshop)return;
  const recipe=evoProfile.recipes[evoSlot],id=C.evo.encode(recipe,evoSlot);
  const children=[el('summary','에보 드래곤 육성')];
  const tabs=el('div',null,'evo-tabs');
  for(const slot of [0,1]){
    const tab=btn('드래곤 '+(slot+1),()=>{evoSlot=slot;evoStatus='';renderEvoEditor();});
    tab.setAttribute('aria-pressed',String(slot===evoSlot));tabs.append(tab);
  }
  const summary=el('p','AGE '+recipe.age+' · SP '+recipe.sp+' · ST '+recipe.st+' · HP '+recipe.hp+' · '+C.evo.summonCost(recipe)+'G','evo-stats');
  summary.setAttribute('aria-live','polite');
  const elements=['무','화','수','지','풍'];
  const conditions=[recipe.land?elements[recipe.element+1]+' 영지 '+recipe.land+'곳':null,recipe.discard?'카드 1장 버리기':null].filter(Boolean);
  const state=el('p',elements[recipe.element+1]+'속성 · '+(conditions.join(' · ')||'추가 소환 조건 없음'),'evo-conditions');
  const apply=(kind,param)=>{
    const next=C.evo.apply(recipe,kind,param);
    if(!next)return;
    evoProfile.recipes[evoSlot]=next;
    evoStatus=C.evo.encode(next,evoSlot)==null?'현재 소환 비용이 음수입니다. 비용이 0G 이상일 때 북에 넣을 수 있습니다.':'육성 변경을 저장했습니다.';
    saveEvoProfile();renderEvoEditor();tallyBook();
  };
  const grid=el('div',null,'evo-parts');
  const picker=(label,options,kind)=>{
    const wrap=el('div',null,'evo-part'),caption=el('label',label),select=el('select');
    select.add(new Option('고르기',''));select.setAttribute('aria-label',label);
    for(const [value,name,preview] of options){
      const option=new Option(name,value);option.disabled=!preview;select.add(option);
    }
    const confirm=btn(label+' 적용',()=>apply(kind,kind==='growth'?select.value:Number(select.value)));
    confirm.disabled=true;select.onchange=()=>{confirm.disabled=!select.value;};
    caption.append(select);wrap.append(caption,confirm);grid.append(wrap);
  };
  picker('성장 파츠',C.evo.growth.map(part=>[part[0],part[1]+' · '+C.evo.growthCost(recipe.st,recipe.hp,part)+'SP',C.evo.apply(recipe,'growth',part[0])]),'growth');
  picker('속성 파츠',elements.slice(1).map((label,i)=>[i,label+'속성 · 2SP · +30G',C.evo.apply(recipe,'element',i)]),'element');
  picker('능력 파츠',C.evo.abilities.flatMap((part,i)=>part?[[i,part[0]+' · '+part[2]+'SP · '+(part[3]>=0?'+':'')+part[3]+'G',C.evo.apply(recipe,'ability',i)]]:[]),'ability');
  const commands=el('div',null,'evo-tabs');
  const command=(label,kind,param)=>{
    const button=btn(label,()=>apply(kind,param));
    button.disabled=!C.evo.apply(recipe,kind,param);commands.append(button);
  };
  command('영지 조건 추가 · 1SP','land');
  command('제물 조건 추가 · 1SP','discard');
  if(recipe.element>=0)command('속성 제거','removeElement');
  if(recipe.land)command('영지 조건 제거','removeLand');
  if(recipe.discard)command('제물 조건 제거','removeDiscard');
  for(const i of recipe.abilities)command(C.evo.abilities[i][0]+' 제거','removeAbility',i);
  const note=el('p','능력 슬롯 '+recipe.abilities.length+'/'+C.evo.slots(recipe.age)+' · AGE 3·6에 개방','muted');
  const ready=draftEvos.some(card=>C.cards[card]?.evoSlot===evoSlot);
  const edit=btn(ready?'북에서 빼기':'북에 넣기',()=>{
    draftEvos=draftEvos.filter(card=>C.cards[card]?.evoSlot!==evoSlot);
    if(!ready&&id!=null)draftEvos.push(id);
    evoStatus='일반 카드 수량을 조정해 총 50장을 맞춘 뒤 북을 저장하세요.';
    renderEvoEditor();tallyBook();
  },'primary');
  edit.disabled=!ready&&id==null;
  const status=el('p',evoStatus);status.setAttribute('role','status');
  children.push(tabs,summary,state,grid,note,commands,edit,status);
  evoWorkshop.replaceChildren(...children);
}
if(evoWorkshop){
  $('bookRows').before(evoWorkshop);
  renderEvoEditor();
}

