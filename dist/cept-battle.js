const battleBeat=950;
const attackVariants={
  leap:'ninja samurai knight griffon pegasus wyvern dragonfly',
  crush:'colossus cyclops golem stonegolem giantmole firegiant stormgiant steamgear',
  volley:'archer amazon darkelf elf lilith',
  fang:'evodragon dragon hydra cerberus hellhound tyrannosaurus grendel manticore wereboar'
};
const weaponMotions={bow:'volley',crossbow:'volley',sling:'volley',morningstar:'crush',mace:'crush',batteringram:'crush',
  lanceofodin:'leap',spear:'leap',trident:'leap',livingspear:'leap',clawoftheghoul:'fang'};
function attackMotion(id,item){
  const card=C.cards[id],gear=C.cards[item],key=C.combo.key(card);
  if(gear?.category==='scroll'||!gear&&card.innateScroll)return 'magic';
  if(gear?.category==='weapon')return weaponMotions[C.combo.key(gear)]||'slash';
  const style=Object.entries(attackVariants).find(([,names])=>names.split(' ').includes(key))?.[0];
  if(style)return style;
  if(card.stationary||card.st===0)return 'magic';
  return ['ember','wave','crush','volley'][card.element]||'slash';
}
// Wind-up, strike and recoil. Offsets keep the hit on the impact beat (290ms into a 560ms move).
function fighterMotion(kind,direction){
  const shift=percent=>'translateX('+direction*percent+'%)';
  const poses={
    slash:[shift(-9)+' rotate('+direction*-10+'deg) scale(1.02)',shift(34)+' rotate('+direction*9+'deg) scale(1.08)',shift(20)+' rotate('+direction*4+'deg)'],
    fang:[shift(-8)+' scale(.9)',shift(40)+' scale(1.18)',shift(24)+' scale(1.05)'],
    leap:[shift(-4)+' translateY(4%) scale(.96)',shift(30)+' translateY(-22%) scale(1.1)',shift(22)+' translateY(0)'],
    crush:['translateY(-14%) scale(1.12,.9)',shift(24)+' translateY(6%) scale(.94,1.12)',shift(14)],
    volley:[shift(-12)+' rotate('+direction*-6+'deg)',shift(6)+' scale(1.05)',shift(2)],
    magic:['scale(.94)','scale(1.14)','scale(1.04)']
  };
  const [ready,strike,recoil]=poses[kind]||poses.magic;
  return [
    {transform:'none',offset:0},
    {transform:ready,offset:.3,easing:'cubic-bezier(.5,0,.75,0)'},
    {transform:strike,offset:.52,easing:'cubic-bezier(.2,.8,.3,1)'},
    {transform:recoil,offset:.7,easing:'cubic-bezier(.3,0,.2,1)'},
    {transform:'none',offset:1}
  ];
}
const motionOK=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
// Sparks fly out from the struck card; the colour follows the attack.
function battleSparks(frame,kind){
  if(!motionOK())return;
  const burst=el('i',null,'battle-sparks '+kind);
  for(let i=0;i<10;i++){
    const spark=el('b');const angle=i/10*Math.PI*2+Math.random()*.4,reach=38+Math.random()*34;
    spark.style.setProperty('--dx',(Math.cos(angle)*reach).toFixed(1)+'px');
    spark.style.setProperty('--dy',(Math.sin(angle)*reach).toFixed(1)+'px');
    burst.append(spark);
  }
  frame.append(burst);setTimeout(()=>burst.remove(),700);
}
function battleReplayDuration(b){
  return b.strikes&&!matchMedia('(prefers-reduced-motion: reduce)').matches?1100+b.strikes.length*battleBeat:0;
}
function renderBattle(center,state){
  const b=state.battle,tile=state.tiles[b.at],result=state.phase==='result';
  const guard=b.guard??tile.unit.id,ids=result&&b.forms?b.forms:[b.inv,guard],items=[b.atkItem,b.defItem];
  const key=[state.round,state.turn,b.at,...ids,state.phase,result?b.finalHP.join():null].join('/');
  if(center.firstElementChild?.dataset.battleKey===key)return;
  const stage=el('section',null,'battle-stage');
  stage.dataset.battleKey=key;stage.dataset.terrain=tile.type;
  const entering=state.phase==='attack';
  stage.classList.toggle('battle-entry',entering);
  const caption=el('small',(b.at+1)+'번 영지 · '+(C.elements[tile.type]||tile.type)+' Lv.'+tile.level);
  const versus=el('div',null,'battle-pair'),status=el('div',null,'battle-caption');
  status.setAttribute('role','status');
  const base=[b.invHP??C.cards[b.inv].hp,b.guardHP??tile.unit.hp];
  const fighters=ids.map((id,i)=>{
    const cell=el('div',null,'battle-side'),frame=el('div',null,'battle-face');
    const illustration=cardSeal(id);frame.append(illustration);
    const pocket=el('div',null,'battle-pocket');pocket.setAttribute('aria-label','아이템 선택 대기');
    const title=el('strong',(i?'수비':'침략')+' · '+C.cards[id].name);
    const meter=el('meter');meter.min=0;meter.max=Math.max(1,base[i],b.startHP?.[i]||0);
    const bar=el('div',null,'battle-hp'),fill=el('i'),lag=el('i',null,'lag');bar.append(lag,fill);bar.setAttribute('aria-hidden','true');
    const value=el('span',null,'battle-hp-value'),power=el('small',null,'battle-st');
    const unit=i?tile.unit:state.tiles[b.from]?.unit;
    power.textContent='ST '+(result?C.cards[id].st:unit?.st??C.cards[id].st);
    const update=hp=>{
      meter.max=Math.max(meter.max,hp);meter.value=hp;value.textContent='HP '+hp;
      const share=Math.max(0,Math.min(100,100*hp/meter.max))+'%';
      fill.style.width=share;lag.style.width=share;bar.classList.toggle('low',hp<=meter.max*.3);
    };
    update(base[i]);frame.append(pocket);
    const stats=el('div',null,'battle-stats');stats.append(power,value);
    cell.append(title,frame,stats,bar,meter);versus.append(cell);
    return {cell,frame,pocket,power,title,illustration,update};
  });
  stage.append(caption,versus,status);center.replaceChildren(stage);
  if(!result){
    const ground=C.battleGround(state,b);
    status.textContent='장비 선택 전 · 수비 지형 HP +'+ground.hp;
    status.append(el('small','인접 지원 ST · 침략 +'+ground.attack+' / 수비 +'+ground.defense,'battle-support'));
    if(entering){
      const banner=el('div',null,'battle-versus');banner.append(el('b','VS'));
      banner.setAttribute('aria-hidden','true');stage.append(banner);
      if(motionOK())fighters.forEach((f,i)=>{
        const from=i?1:-1;
        f.cell.animate([{transform:'translateX('+from*70+'%) rotate('+from*12+'deg) scale(.7)',opacity:0},
          {transform:'translateX('+from*-4+'%) rotate('+from*-2+'deg) scale(1.04)',opacity:1,offset:.7},{transform:'none',opacity:1}],
          {duration:620,delay:i*120,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});
      });
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
    fighters.forEach((f,i)=>{
      const final=b.settled?.forms?.[i]??b.finalForms?.[i];
      if(final!=null&&final!==ids[i]){
        f.illustration.replaceWith(cardSeal(final));
        f.title.textContent=(i?'수비':'침략')+' · '+C.cards[final].name;
        f.power.textContent='ST '+C.cards[final].st;
      }
      if(b.settled?.st?.[i]!=null)f.power.textContent='ST '+b.settled.st[i];
      f.update(b.settled?.hp?.[i]??b.finalHP[i]);f.frame.classList.toggle('defeated',b.finalHP[i]===0);
    });
    status.textContent=b.lines.at(-1);stage.dataset.phase='complete';
    const draw=b.finalHP.every(hp=>hp===0);
    const empty=!b.won&&!draw&&b.finalHP[1]===0;
    const outcome=draw?'양측 격파':b.won?'침략 승리':empty?'영지 비움':'수비 성공';
    const victorySeat=b.won||empty?(b.attackerSeat??state.turn):b.defenderSeat;
    const viewer=room?room.seat:state.players.filter(p=>!p.ai).length===1?state.players.findIndex(p=>!p.ai):-1;
    const involved=viewer===(b.attackerSeat??state.turn)||viewer===b.defenderSeat;
    const victory=involved&&C.allied(state,victorySeat,viewer);
    const title=involved&&!draw?(victory?'승리':'패배')+' · '+outcome:outcome;
    status.prepend(el('strong',title,'battle-outcome '+(draw?'draw':b.won?'conquest':'defended')));
    fighters.forEach((f,i)=>{
      const sideWon=i===(b.won||empty?0:1);
      f.cell.prepend(el('span',draw?'격파':sideWon?'승리':'패배','battle-side-outcome '+(sideWon&&!draw?'won':'')));
      f.cell.classList.toggle('victor',sideWon&&!draw);f.cell.classList.toggle('vanquished',draw||!sideWon);
    });
    playEffect(draw?'battleDraw':involved&&!victory?'battleLoss':'battleWin');
    const details=el('details',null,'battle-log');details.append(el('summary','전투 내역'));
    const list=el('ol');for(const line of b.lines.slice(0,-1))list.append(el('li',line));
    if(list.children.length){details.append(list);status.append(details);}
  };
  if(!battleReplayDuration(b)){playEffect(b.strikes?.at(-1)?.effect||'hit');reveal();finish();return;}
  stage.dataset.phase='replay';status.textContent='전투 준비';
  later(180,()=>{reveal();status.textContent=[...items.map(id=>C.cards[id]?.name),b.landHP?'지형 보너스 +'+b.landHP+' HP':''].filter(Boolean).join(' · ')||'아이템 없이 전투';});
  b.strikes.forEach((strike,index)=>{
    const attacker=fighters[strike.side],defender=fighters[1-strike.side];
    const time=850+index*battleBeat;
    const previous=b.strikes[index-1];
    const actionLabel=!previous?'선공':previous.side===strike.side?'연속 공격':'반격';
    later(time,()=>{
      const left=strike.side===0;
      status.textContent=actionLabel+' · '+C.cards[ids[strike.side]].name;
      attacker.cell.classList.add('striking');later(560,()=>attacker.cell.classList.remove('striking'));
      attacker.frame.animate(fighterMotion(attack,left?1:-1),{duration:560});
      playEffect(attack);
      if(['volley','magic','ember','wave'].includes(attack)){
        const shot=el('i',null,'battle-shot '+attack);shot.classList.toggle('from-right',!left);
        versus.append(shot);later(450,()=>shot.remove());
      }
      const fx=el('i',null,'battle-impact '+attack);
      defender.frame.append(fx);later(650,()=>fx.remove());
    });
    const attack=attackMotion(ids[strike.side],items[strike.side]);
    later(time+290,()=>{
      playEffect(strike.effect||'hit');
      if(strike.notes.length)status.textContent=strike.notes.join(' · ');
      if(strike.effect==='reflect'||strike.effect==='block'){
        const shield=el('i',null,'battle-impact ward');defender.frame.append(shield);
        later(650,()=>shield.remove());
      }
      const before=previous?.hp??b.startHP;
      fighters.forEach((f,i)=>{
        f.update(strike.hp[i]);
        if(strike.hp[i]<before[i]){
          const lost=before[i]-strike.hp[i],heavy=lost>=30||!strike.hp[i];
          f.frame.animate([{filter:'brightness(2.4) saturate(.4)',transform:'translateX(0) rotate(0)'},
            {transform:'translateX('+(i?6:-6)+'%) rotate('+(i?4:-4)+'deg)',offset:.25},
            {transform:'translateX('+(i?-3:3)+'%) rotate('+(i?-1.5:1.5)+'deg)',offset:.55},
            {filter:'brightness(1)',transform:'none'}],{duration:380,easing:'ease-out'});
          battleSparks(f.frame,attack);
          if(motionOK()){
            stage.animate([{transform:'none'},{transform:'translate('+(heavy?7:4)+'px,'+(heavy?-5:-2)+'px)'},
              {transform:'translate(-'+(heavy?6:3)+'px,'+(heavy?4:2)+'px)'},{transform:'none'}],{duration:heavy?320:220,easing:'ease-out'});
            const flash=el('i',null,'battle-flash'+(heavy?' heavy':''));stage.append(flash);later(420,()=>flash.remove());
          }
          const damage=el('i','−'+lost,'battle-damage'+(heavy?' heavy':''));
          f.frame.append(damage);later(900,()=>damage.remove());
        }else if(strike.hp[i]>before[i]){
          const gain=el('i','+'+(strike.hp[i]-before[i]),'battle-damage heal');f.frame.append(gain);later(900,()=>gain.remove());
        }
        if(!strike.hp[i])f.frame.classList.add('defeated');
      });
    });
  });
  later(battleReplayDuration(b),finish);
}
