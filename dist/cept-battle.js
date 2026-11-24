const battleBeat=950;
function battleReplayDuration(b){
  return b.strikes&&!matchMedia('(prefers-reduced-motion: reduce)').matches?1100+b.strikes.length*battleBeat:0;
}
function renderBattle(center,state){
  const b=state.battle,tile=state.tiles[b.at],result=state.phase==='result';
  const guard=b.guard??tile.unit.id,ids=[b.inv,guard],items=[b.atkItem,b.defItem];
  const key=[state.round,state.turn,b.at,...ids,state.phase,result?b.finalHP.join():null].join('/');
  if(center.firstElementChild?.dataset.battleKey===key)return;
  const stage=el('section',null,'battle-stage');
  stage.dataset.battleKey=key;stage.dataset.terrain=tile.type;
  const entering=state.phase==='attack';
  stage.classList.toggle('battle-entry',entering);
  const caption=el('small',(b.at+1)+'번 영지 · '+C.elements[tile.type]+' Lv.'+tile.level);
  const versus=el('div',null,'battle-pair'),status=el('div',null,'battle-caption');
  status.setAttribute('role','status');
  const base=[b.invHP??C.cards[b.inv].hp,b.guardHP??tile.unit.hp];
  const fighters=ids.map((id,i)=>{
    const cell=el('div',null,'battle-side'),frame=el('div',null,'battle-face');
    const illustration=cardSeal(id);frame.append(illustration);
    const pocket=el('div',null,'battle-pocket');pocket.setAttribute('aria-label','아이템 선택 대기');
    const title=el('strong',(i?'수비':'침략')+' · '+C.cards[id].name);
    const meter=el('meter');meter.min=0;meter.max=Math.max(1,base[i],b.startHP?.[i]||0);
    const value=el('span'),power=el('small');
    power.textContent='ST '+C.cards[id].st;
    const update=hp=>{meter.value=hp;value.textContent='HP '+hp;};
    update(base[i]);frame.append(pocket);cell.append(title,frame,power,value,meter);versus.append(cell);
    return {cell,frame,pocket,power,update};
  });
  stage.append(caption,versus,status);center.replaceChildren(stage);
  if(!result){
    status.textContent=hints[state.phase];
    if(entering){
      const banner=el('div',C.cards[b.inv].name+'  VS  '+C.cards[guard].name,'battle-versus');
      banner.setAttribute('aria-hidden','true');stage.append(banner);
    }
    return;
  }
  const later=(ms,fn)=>setTimeout(()=>{if(stage.isConnected)fn();},ms);
  const reveal=()=>fighters.forEach((f,i)=>{
    const item=C.cards[items[i]];
    if(item){f.pocket.replaceChildren(cardSeal(items[i]));f.pocket.classList.add('revealed');f.pocket.title=item.name;f.pocket.setAttribute('aria-label',item.name);}
    else f.pocket.hidden=true;
    f.power.textContent='ST '+[b.attackST,b.defendST][i];
    f.update((b.startHP||base)[i]);
  });
  const finish=()=>{
    fighters.forEach((f,i)=>{f.update(b.finalHP[i]);f.frame.classList.toggle('defeated',b.finalHP[i]===0);});
    status.textContent=b.lines.at(-1);stage.dataset.phase='complete';
  };
  if(!battleReplayDuration(b)){reveal();finish();return;}
  stage.dataset.phase='replay';status.textContent='전투 준비';
  later(180,()=>{reveal();status.textContent=[...items.map(id=>C.cards[id]?.name),b.landHP?'지형 보너스 +'+b.landHP+' HP':''].filter(Boolean).join(' · ')||'아이템 없이 전투';});
  b.strikes.forEach((strike,index)=>{
    const attacker=fighters[strike.side],defender=fighters[1-strike.side];
    const time=850+index*battleBeat,gear=C.cards[items[strike.side]];
    later(time,()=>{
      const left=strike.side===0;
      status.textContent=(index?'반격':'선공')+' · '+C.cards[ids[strike.side]].name;
      attacker.frame.animate([{transform:'scale(1)'},{transform:'translateX('+(left?9:-9)+'%) scale(1.09)'},{transform:'scale(1)'}],{duration:420});
      const beast=[0,2,5,7,13,14,24].includes(ids[strike.side]);
      const attack=gear?.category==='scroll'?'magic':!gear&&beast?'fang':'slash';
      const fx=el('i',null,'battle-impact '+attack);
      defender.frame.append(fx);later(650,()=>fx.remove());
    });
    later(time+290,()=>{
      status.textContent=strike.notes.join(' · ');
      if(strike.effect==='reflect'||strike.effect==='block'){
        const shield=el('i',null,'battle-impact ward');defender.frame.append(shield);
        later(650,()=>shield.remove());
      }
      const before=index?b.strikes[index-1].hp:b.startHP;
      fighters.forEach((f,i)=>{
        f.update(strike.hp[i]);
        if(strike.hp[i]<before[i])f.frame.animate([{filter:'brightness(1.9)',translate:'-3% 0'},{translate:'3% 0'},{filter:'brightness(1)',translate:'0'}],{duration:300});
        if(!strike.hp[i])f.frame.classList.add('defeated');
      });
    });
  });
  later(battleReplayDuration(b),finish);
}
