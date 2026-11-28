// The battle stage. Two cards face each other on the land they fight over; items turn face up, the numbers settle,
// each blow is played out with the effect of the creature or its weapon, and a beaten card is destroyed by what killed it.
// Fast play shortens every beat.
// battlePace stretches or tightens the whole replay; 1 is the normal pace.
let battlePace=1;
const battleSpeed=()=>battlePace*(typeof fastPlay!=='undefined'&&fastPlay?.6:1);
const attackVariants={
  leap:'ninja samurai knight griffon pegasus wyvern dragonfly paladin gladiator valkyrie',
  crush:'colossus cyclops golem stonegolem giantmole firegiant stormgiant steamgear ogre troll minotaur behemoth',
  volley:'archer amazon darkelf elf lilith centaur',
  fang:'evodragon dragon hydra cerberus hellhound tyrannosaurus grendel manticore wereboar seaserpent kraken',
  claw:'wolf giantrat ghoul zombie harpy werewolf tigerbeetle sabertooth panther bear giantbat caitsith lion sphinx',
  gale:'hurricane sprite sylph thunderbeak roc',
  magic:'sorcerer wizard lich mage witch necromancer'
};
const weaponMotions={bow:'volley',crossbow:'volley',sling:'volley',shuriken:'volley',morningstar:'crush',mace:'crush',batteringram:'crush',goldenhammer:'crush',
  lanceofodin:'leap',spear:'leap',trident:'leap',livingspear:'leap',claymore:'leap',swordofthefalcon:'leap',clawoftheghoul:'claw',flametongue:'ember',rockbiter:'crush',airslasher:'gale'};
function attackMotion(id,item){
  const card=C.cards[id],gear=C.cards[item],key=C.combo.key(card);
  if(gear?.category==='scroll'||!gear&&card.innateScroll)return 'magic';
  if(gear?.category==='weapon')return weaponMotions[C.combo.key(gear)]||'slash';
  const style=Object.entries(attackVariants).find(([,names])=>names.split(' ').includes(key))?.[0];
  if(style)return style;
  if(card.stationary||card.st===0)return 'magic';
  return ['ember','wave','crush','gale'][card.element]||'slash';
}
// How a card goes when this kind of blow finishes it.
const battleEndings={slash:'halves',leap:'split',claw:'strips',fang:'strips',crush:'launch',volley:'topple',ember:'burn',wave:'wilt',gale:'launch',magic:'fade',bolt:'fade',death:'void'};
const battleRanged=['volley','ember','wave','gale','magic','bolt','death'];
// A scroll's light takes the colour of what it calls down.
const scrollTints={firebolt:'ember',hellblaze:'ember',nuclearfusion:'bolt',freeze:'wave',stonehail:'crush',windcutter:'gale',tearinghalo:'bolt',death:'death'};
const battleSounds={slash:'slash',leap:'leap',claw:'fang',fang:'fang',crush:'crush',volley:'volley',ember:'ember',wave:'wave',gale:'gale',magic:'cast',bolt:'bolt',death:'death'};
const motionOK=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
// When each beat of the replay happens, in milliseconds from the start.
function battlePlan(b){
  const k=battleSpeed(),strikes=b.strikes||[],geared=b.atkItem!=null||b.defItem!=null;
  let t=(150+(geared?1150:320))*k;
  const plan={reveal:150*k,stats:t,strikes:[],end:0};
  t+=760*k;
  strikes.forEach((strike,index)=>{
    const before=strikes[index-1]?.hp??b.startHP;
    const kills=strike.hp.map((hp,side)=>hp===0&&before[side]>0);
    const length=(1320+(strike.critical?260:0)+(kills.some(Boolean)?600:0))*k;
    plan.strikes.push({start:t,impact:t+620*k,length,kills,before});t+=length;
  });
  plan.end=t+260*k;
  return plan;
}
// Nothing is left to wait for once the replay on screen has been skipped or has finished.
function battleReplayDuration(b){
  if(!b.strikes||!motionOK()||document.querySelector('.battle-stage')?.dataset.phase==='complete')return 0;
  return battlePlan(b).end;
}
function battleCount(node,from,to,ms,prefix){
  if(!motionOK()||from===to||ms<=0){node.textContent=prefix+to;return;}
  const start=performance.now();
  node.classList.add(to>from?'rising':'falling');
  (function step(now){
    if(node.dataset.settled)return;
    const t=Math.min(1,(now-start)/ms),value=Math.round(from+(to-from)*(1-(1-t)*(1-t)));
    node.textContent=prefix+value;
    if(t<1&&node.isConnected)requestAnimationFrame(step);else node.classList.remove('rising','falling');
  })(start);
}
// Marks a blow leaves on a card that survives it.
function battleScar(canvas,kind,weight){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,rand=(a,b)=>a+Math.random()*(b-a);
  const x=rand(w*.3,w*.7),y=rand(h*.3,h*.65),size=w*(.22+.1*weight);
  const line=(points,width,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();};
  const cut=(ax,ay,bx,by)=>{line([[ax,ay],[bx,by]],w*.022,'#120a0ccc');line([[ax+1,ay-1],[bx+1,by-1]],w*.006,'#fff3d8aa');};
  if(kind==='slash'||kind==='leap'){const a=kind==='leap'?rand(1.2,1.9):rand(-.5,.5);cut(x-Math.cos(a)*size*1.5,y-Math.sin(a)*size*1.5,x+Math.cos(a)*size*1.5,y+Math.sin(a)*size*1.5);}
  else if(kind==='claw')for(let i=-1;i<=1;i++)cut(x+i*size*.42-size*.3,y-size,x+i*size*.42+size*.3,y+size);
  else if(kind==='fang'){for(const side of [-1,1])for(let i=0;i<5;i++){ctx.fillStyle='#140a10cc';ctx.beginPath();ctx.arc(x-size+size*.5*i,y+side*size*.5-side*Math.sin(Math.PI*i/4)*size*.22,w*.022,0,7);ctx.fill();}}
  else if(kind==='volley')for(let i=0;i<3;i++){const px=x+rand(-size,size),py=y+rand(-size,size);ctx.fillStyle='#0c0a0ccc';ctx.beginPath();ctx.arc(px,py,w*.02,0,7);ctx.fill();line([[px,py],[px-w*.07,py+w*.04]],w*.008,'#d9c38a');}
  else if(['ember','magic','bolt','death'].includes(kind)){
    const g=ctx.createRadialGradient(x,y,0,x,y,size*1.5);g.addColorStop(0,kind==='ember'?'#1a0c06e6':'#1a1030d9');g.addColorStop(.6,kind==='ember'?'#3a1608aa':'#30205088');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,size*1.5,0,7);ctx.fill();
  }else{
    for(let i=0;i<6;i++){const a=i/6*6.283+rand(-.3,.3),len=size*rand(.7,1.4),mid=[x+Math.cos(a+.3)*len*.5,y+Math.sin(a+.3)*len*.5];
      line([[x,y],mid,[x+Math.cos(a)*len,y+Math.sin(a)*len]],w*.012,'#140c0ccc');line([[x+1,y],[mid[0]+1,mid[1]]],w*.004,'#fff3d888');}
  }
}
// Breaks a beaten card apart in the way its ending calls for.
function battleDestroy(fighter,ending,away,speed){
  const {face,art}=fighter,pieces=el('div',null,'duel-pieces'),ms=780*speed;
  pieces.style.width=art.offsetWidth+'px';pieces.style.height=art.offsetHeight+'px';
  pieces.style.left=art.offsetLeft+'px';pieces.style.top=art.offsetTop+'px';
  const piece=(clip,frames,options={})=>{
    const copy=art.cloneNode(true);copy.removeAttribute('id');copy.alt='';copy.className='duel-piece';
    if(clip)copy.style.clipPath='polygon('+clip.map(([px,py])=>px+'% '+py+'%').join(',')+')';
    pieces.append(copy);
    copy.animate(frames,{duration:ms*(options.length||1),delay:ms*(options.delay||0),easing:options.easing||'cubic-bezier(.4,0,.9,.6)',fill:'both'});
  };
  const spin=()=>(Math.random()-.5)*50;
  if(ending==='halves'){
    piece([[0,0],[100,0],[100,46],[0,54]],[{transform:'none',opacity:1},{transform:'translate('+away*-5+'%,-4%) rotate('+away*-2+'deg)',opacity:1,offset:.25},{transform:'translate('+away*-34+'%,-70%) rotate('+away*-24+'deg)',opacity:0}]);
    piece([[0,54],[100,46],[100,100],[0,100]],[{transform:'none',opacity:1},{transform:'translate('+away*4+'%,3%)',opacity:1,offset:.25},{transform:'translate('+away*22+'%,90%) rotate('+away*18+'deg)',opacity:0}]);
  }else if(ending==='split'){
    piece([[0,0],[54,0],[46,100],[0,100]],[{transform:'none',opacity:1},{transform:'translate(-5%,1%) rotate(-2deg)',opacity:1,offset:.25},{transform:'translate(-60%,70%) rotate(-32deg)',opacity:0}]);
    piece([[54,0],[100,0],[100,100],[46,100]],[{transform:'none',opacity:1},{transform:'translate(5%,1%) rotate(2deg)',opacity:1,offset:.25},{transform:'translate(60%,70%) rotate(32deg)',opacity:0}]);
  }else if(ending==='strips'){
    const count=7;
    for(let i=0;i<count;i++){
      const a=100*i/count,b=100*(i+1)/count;
      piece([[a,0],[b,0],[b,100],[a,100]],[{transform:'none',opacity:1},{transform:'translate('+(i-count/2)*4+'%,'+(8+Math.random()*8)+'%) rotate('+spin()*.2+'deg)',opacity:1,offset:.3},
        {transform:'translate('+(i-count/2)*9+'%,'+(110+Math.random()*40)+'%) rotate('+spin()+'deg)',opacity:0}],{delay:i*.05});
    }
  }else if(ending==='launch')piece(null,[{transform:'none',opacity:1},{transform:'translate('+away*14+'%,-12%) rotate('+away*14+'deg) scale(.96)',opacity:1,offset:.18},{transform:'translate('+away*150+'%,-120%) rotate('+away*400+'deg) scale(.3)',opacity:0}],{easing:'cubic-bezier(.2,.6,.6,1)'});
  else if(ending==='topple')piece(null,[{transform:'perspective(600px) rotateX(0)',opacity:1},{transform:'perspective(600px) rotateX(-18deg) translateY(-3%)',opacity:1,offset:.25},{transform:'perspective(600px) rotateX(86deg) translateY(30%)',opacity:0}],{easing:'cubic-bezier(.5,0,.9,.5)'});
  else if(ending==='wilt')piece(null,[{transform:'none',opacity:1,filter:'none'},{transform:'skewX('+away*-8+'deg) scaleY(.94) translateY(4%)',opacity:1,filter:'saturate(.6) brightness(.9)',offset:.4},{transform:'skewX('+away*-28+'deg) scaleY(.3) translateY(140%)',opacity:0,filter:'saturate(.2) brightness(.6)'}]);
  else if(ending==='burn'){
    // The card chars from the bottom up.
    const rows=8;
    for(let i=0;i<rows;i++){
      const a=100*i/rows,b=100*(i+1)/rows;
      piece([[0,a],[100,a],[100,b],[0,b]],[{filter:'none',opacity:1,transform:'none'},{filter:'sepia(1) saturate(4) hue-rotate(-18deg) brightness(1.5)',opacity:1,transform:'none',offset:.45},{filter:'brightness(.15)',opacity:0,transform:'translateY(-16%) scaleX(.9)'}],{delay:(rows-1-i)*.085,length:.55,easing:'ease-in'});
    }
  }else if(ending==='fade'){
    for(const [shift,delay] of [[0,0],[away*9,.08],[away*18,.16]])
      piece(null,[{transform:'none',opacity:shift?.55:1,filter:'none'},{transform:'translateX('+shift+'%) scale(1.03)',opacity:shift?.4:.8,filter:'brightness(1.8) blur(1px)',offset:.4},{transform:'translateX('+shift*2.2+'%) scale(1.1)',opacity:0,filter:'brightness(3) blur(5px)'}],{delay,easing:'ease-out'});
  }else if(ending==='void')piece(null,[{transform:'none',opacity:1,filter:'none'},{transform:'scale(.9) rotate('+away*12+'deg)',opacity:1,filter:'brightness(.7) hue-rotate(40deg)',offset:.3},{transform:'scale(.02) rotate('+away*540+'deg)',opacity:0,filter:'brightness(.2) hue-rotate(90deg)'}],{easing:'cubic-bezier(.6,0,.9,.4)'});
  else if(ending==='ripple')piece(null,[{transform:'none',opacity:1,filter:'none'},{transform:'skewX(6deg) scaleY(1.03)',opacity:.9,filter:'hue-rotate(60deg)',offset:.2},{transform:'skewX(-7deg) scaleY(.97)',opacity:.8,offset:.4},{transform:'skewX(6deg) scaleY(1.04)',opacity:.55,offset:.6},{transform:'skewX(-5deg) scale(1.08)',opacity:0,filter:'hue-rotate(120deg) blur(3px)'}],{easing:'linear'});
  else{
    // Shatter: a jittered grid of triangles thrown outward.
    const cols=3,rows=4,grid=[];
    for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++)grid.push([c===0?0:c===cols?100:100*c/cols+(Math.random()-.5)*14,r===0?0:r===rows?100:100*r/rows+(Math.random()-.5)*12]);
    const at=(c,r)=>grid[r*(cols+1)+c];
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)for(const tri of [[at(c,r),at(c+1,r),at(c,r+1)],[at(c+1,r),at(c+1,r+1),at(c,r+1)]]){
      const cx=(tri[0][0]+tri[1][0]+tri[2][0])/3-50,cy=(tri[0][1]+tri[1][1]+tri[2][1])/3-50,reach=1.6+Math.random()*1.6;
      piece(tri,[{transform:'none',opacity:1},{transform:'translate('+cx*.25+'%,'+cy*.2+'%) rotate('+spin()*.3+'deg)',opacity:1,offset:.18},
        {transform:'translate('+(cx*reach+away*30)+'%,'+(cy*reach+70)+'%) rotate('+spin()*6+'deg) scale(.7)',opacity:0}],{delay:Math.random()*.08});
    }
  }
  face.append(pieces);art.classList.add('broken');
  setTimeout(()=>{pieces.remove();art.classList.remove('broken');face.classList.add('defeated');},ms*1.08+40);
}
function renderBattle(center,state){
  const b=state.battle,tile=state.tiles[b.at],result=state.phase==='result';
  const guard=b.guard??tile.unit.id,ids=result&&b.forms?b.forms:[b.inv,guard],items=[b.atkItem,b.defItem];
  const key=[state.round,state.turn,b.at,...ids,state.phase,result?b.finalHP.join():null].join('/');
  if(center.firstElementChild?.dataset.battleKey===key)return;
  center.firstElementChild?.battleFx?.stop();
  const stage=el('section',null,'battle-stage arena');
  stage.dataset.battleKey=key;stage.dataset.terrain=tile.type;
  const entering=state.phase==='attack',animated=motionOK(),speed=battleSpeed();
  stage.classList.toggle('battle-entry',entering);
  const art=typeof CepterBattleArt==='undefined'?null:CepterBattleArt;
  const backdrop=el('div',null,'duel-backdrop');
  if(art?.backdrops?.[tile.type])backdrop.style.backgroundImage='url("'+art.backdrops[tile.type]+'")';
  backdrop.append(el('i',null,'duel-horizon'),el('i',null,'duel-ground'));
  const land=el('small',(b.at+1)+'번 영지 · '+(C.elements[tile.type]||tile.type)+' Lv.'+tile.level,'duel-land');
  const field=el('div',null,'duel-field'),status=el('div',null,'battle-caption');
  status.setAttribute('role','status');
  const fx=animated&&typeof CepterBattleFx!=='undefined'?CepterBattleFx.mount(stage):null;
  stage.battleFx=fx;
  const seats=[b.attackerSeat??state.turn,b.defenderSeat??tile.owner];
  const base=[b.invHP??b.invUnit?.hp??C.cards[b.inv].hp,b.guardHP??tile.unit.hp];
  const fighters=ids.map((id,i)=>{
    const side=el('div',null,'duel-side '+(i?'defender':'attacker')),face=el('div',null,'duel-card');
    side.style.setProperty('--seat',typeof colors==='undefined'?'#e0b454':colors[seats[i]]||'#e0b454');
    const illustration=cardSeal(id);
    const scar=el('canvas',null,'duel-scar');scar.width=200;scar.height=250;scar.setAttribute('aria-hidden','true');
    const pocket=el('div',null,'duel-item');pocket.setAttribute('aria-label','아이템 선택 대기');
    const cover=el('i',null,'duel-item-back');
    if(art?.itemBack)cover.style.background='url("'+art.itemBack+'") center/cover';
    pocket.append(cover);
    face.append(illustration,scar);
    const plate=el('div',null,'duel-plate'),title=el('strong',null,'duel-name');
    const name=el('span',C.cards[id].name);
    title.append(el('i',i?'수비':'침략','duel-role'),name);
    const meter=el('meter');meter.min=0;meter.max=Math.max(1,base[i],b.startHP?.[i]||0);
    const bar=el('div',null,'duel-hp'),fill=el('i'),lag=el('i',null,'lag');bar.append(lag,fill);bar.setAttribute('aria-hidden','true');
    const unit=i?tile.unit:state.tiles[b.from]?.unit??b.invUnit;
    const stats=el('div',null,'duel-stats'),power=el('span',null,'duel-st'),value=el('span',null,'duel-hp-value');
    const chips=el('div',null,'duel-chips');
    let st=result?C.cards[id].st:unit?.st??C.cards[id].st,hp=base[i];
    const fighter={side,face,pocket,name,chips,art:illustration,scar,
      setST(next,ms=0){battleCount(power,st,next,ms,'ST ');st=next;},
      setHP(next,ms=0){
        meter.max=Math.max(meter.max,next);meter.value=next;battleCount(value,hp,next,ms,'HP ');hp=next;
        const share=Math.max(0,Math.min(100,100*next/meter.max))+'%';
        fill.style.width=share;lag.style.width=share;bar.classList.toggle('low',next<=meter.max*.3);
      },
      // Stops any number still counting and shows where it ends.
      settle(){
        for(const node of [power,value]){node.dataset.settled='1';node.classList.remove('rising','falling');}
        power.textContent='ST '+st;value.textContent='HP '+hp;
        requestAnimationFrame(()=>{delete power.dataset.settled;delete value.dataset.settled;});
      },
      chip(text,kind){const chip=el('span',text,'duel-chip '+(kind||''));chips.append(chip);return chip;},
      say(text,kind){
        if(!animated)return;
        const word=el('b',text,'duel-callout '+(kind||''));side.append(word);
        setTimeout(()=>word.remove(),1150);
      }};
    power.textContent='ST '+st;fighter.setHP(hp);
    stats.append(power,value);plate.append(title,stats,bar,chips);
    side.append(face,pocket,plate,meter);field.append(side);
    return fighter;
  });
  const banners=el('div',null,'duel-banners');banners.setAttribute('aria-hidden','true');
  stage.append(backdrop);
  if(fx)stage.append(fx.layers[0]);
  stage.append(land,field);
  if(fx)stage.append(fx.layers[1]);
  stage.append(banners,status);center.replaceChildren(stage);
  if(fx){fx.fit();fx.ambient(tile.type);}
  if(!result){
    const ground=C.battleGround(state,b);
    status.textContent='장비 선택 전 · 수비 지형 HP +'+ground.hp;
    status.append(el('small','인접 지원 ST · 침략 +'+ground.attack+' / 수비 +'+ground.defense,'battle-support'));
    if(ground.hp)fighters[1].chip('지형 HP +'+ground.hp,'land');
    if(ground.attack)fighters[0].chip('지원 ST +'+ground.attack,'support');
    if(ground.defense)fighters[1].chip('지원 ST +'+ground.defense,'support');
    if(state.phase==='defend')fighters[0].pocket.classList.add('set');
    if(entering){
      const versus=el('div',null,'battle-versus');versus.append(el('b','VS'));
      versus.setAttribute('aria-hidden','true');stage.append(versus);
      if(fx){
        fighters.forEach((f,i)=>{
          const from=i?1:-1;
          f.side.animate([{transform:'translate('+from*90+'%,'+from*-14+'%) rotate('+from*16+'deg) scale(.6)',opacity:0},
            {transform:'translate('+from*-5+'%,0) rotate('+from*-3+'deg) scale(1.05)',opacity:1,offset:.68},{transform:'translate('+from*2+'%,0) rotate('+from*1+'deg)',offset:.84},{transform:'none',opacity:1}],
            {duration:680,delay:i*140,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});
          setTimeout(()=>{
            if(!stage.isConnected)return;
            const at=fx.spot(f.face);
            fx.ring(at.x,at.y+at.h*.42,at.w*.9,'#fff1c8',{squash:.3,width:5,life:.5,front:false});
            fx.particles(at.x,at.y+at.h*.45,{count:14,speed:[60,220],angle:[Math.PI,Math.PI*2],gravity:300,colors:['#fff1c8','#d8b878','#8a7450'],life:[.3,.7],front:false});
            field.animate([{transform:'none'},{transform:'translateY(3px)'},{transform:'translateY(-2px)'},{transform:'none'}],{duration:200});
          },470+i*140);
        });
        setTimeout(()=>{
          if(!stage.isConnected)return;
          const middle=fx.spot(versus);
          fx.star(middle.x,middle.y,stage.clientWidth*.42,['#ffffff','#ffd98a'],{rays:14,life:.5,front:false});
          fx.ring(middle.x,middle.y,stage.clientWidth*.55,'#ffe2a0',{width:8,life:.6});
          fx.particles(middle.x,middle.y,{count:30,speed:[160,520],shape:'streak',colors:['#ffffff','#ffe2a0','#ff9440'],life:[.3,.7]});
        },840);
      }
    }
    return;
  }
  const plan=battlePlan(b);
  const later=(ms,fn)=>setTimeout(()=>{if(stage.isConnected&&!stage.dataset.skipped)fn();},ms);
  const reveal=instant=>fighters.forEach((f,i)=>{
    const item=C.cards[items[i]];
    if(item){
      const shown=cardSeal(items[i]);shown.alt='';
      f.pocket.replaceChildren(shown);f.pocket.classList.add('revealed');f.pocket.title=item.name;f.pocket.setAttribute('aria-label',item.name);
      if(!instant){
        // The item flies to the middle of the stage, turns face up there, and returns to its card.
        const from=fx.spot(f.pocket),big=Math.min(2.6,stage.clientWidth*.3/from.w),dx=stage.clientWidth*(i?.66:.34)-from.x,dy=stage.clientHeight*.42-from.y;
        const held='translate('+dx+'px,'+dy+'px) scale('+big+')',wait=i*170*speed;
        f.side.classList.add('revealing');setTimeout(()=>f.side.classList.remove('revealing'),1100*speed+wait);
        f.pocket.animate([{transform:'rotateY(180deg)'},{transform:held+' rotateY(180deg)',offset:.26},{transform:held+' rotateY(0)',offset:.42},{transform:held+' rotateY(0)',offset:.76},{transform:'none'}],
          {duration:1000*speed,delay:wait,easing:'cubic-bezier(.3,.7,.3,1)',fill:'backwards'});
        later(wait+400*speed,()=>{
          const x=stage.clientWidth*(i?.66:.34),y=stage.clientHeight*.42;
          fx.star(x,y,from.w*big*.9,CepterBattleFx.palettes.gold,{rays:10,life:.4,front:false});fx.ring(x,y,from.w*big,'#ffe2a0',{width:5,life:.5,front:false});
          fx.particles(x,y,{count:14,speed:[80,260],colors:CepterBattleFx.palettes.gold,life:[.3,.7],shape:'plus',size:[2,4]});
          f.say(item.name,'gear');playEffect('card');
        });
      }
      f.chip(item.name,'gear');
    }else f.pocket.hidden=true;
  });
  const settle=instant=>fighters.forEach((f,i)=>{
    f.setST([b.attackST,b.defendST][i],instant?0:520*speed);f.setHP((b.startHP||base)[i],instant?0:520*speed);
    if(i&&b.landHP)f.chip('지형 HP +'+b.landHP,'land');
  });
  const finish=()=>{
    if(stage.dataset.phase==='complete')return;
    fighters.forEach((f,i)=>{
      const final=b.settled?.forms?.[i]??b.finalForms?.[i];
      if(final!=null&&final!==ids[i]){
        const next=cardSeal(final);f.art.replaceWith(next);f.art=next;
        f.name.textContent=C.cards[final].name;
        f.setST(C.cards[final].st);
      }
      if(b.settled?.st?.[i]!=null)f.setST(b.settled.st[i]);
      f.setHP(b.settled?.hp?.[i]??b.finalHP[i]);f.settle();
      if(b.finalHP[i]===0&&!f.face.querySelector('.duel-pieces'))f.face.classList.add('defeated');
    });
    status.textContent=b.lines.at(-1);stage.dataset.phase='complete';stage.querySelector('.battle-skip')?.remove();
    const draw=b.finalHP.every(hp=>hp===0);
    const empty=!b.won&&!draw&&b.finalHP[1]===0;
    const outcome=draw?'양측 격파':b.won?'침략 승리':empty?'영지 비움':'수비 성공';
    const victorySeat=b.won||empty?(b.attackerSeat??state.turn):b.defenderSeat;
    const viewer=room?room.seat:state.players.filter(p=>!p.ai).length===1?state.players.findIndex(p=>!p.ai):-1;
    const involved=viewer===(b.attackerSeat??state.turn)||viewer===b.defenderSeat;
    const victory=involved&&C.allied(state,victorySeat,viewer);
    const title=involved&&!draw?(victory?'승리':'패배')+' · '+outcome:outcome;
    const kind=draw?'draw':b.won?'conquest':'defended';
    status.prepend(el('strong',title,'battle-outcome '+kind));
    fighters.forEach((f,i)=>{
      const sideWon=i===(b.won||empty?0:1);
      f.side.prepend(el('span',draw?'격파':sideWon?'승리':'패배','duel-verdict '+(sideWon&&!draw?'won':'')));
      f.side.classList.toggle('victor',sideWon&&!draw);f.side.classList.toggle('vanquished',draw||!sideWon);
      f.side.classList.remove('striking');
    });
    if(fx){
      const banner=el('div',null,'duel-result '+kind+(involved&&!victory&&!draw?' lost':''));
      banner.append(el('b',outcome),el('span',draw?'영지가 비었습니다':b.won?'영지 점령':empty?'수비 크리처 격파':'영지를 지켜냈습니다'));
      banners.append(banner);setTimeout(()=>banner.remove(),2300);
      const winner=fighters.find(f=>f.side.classList.contains('victor'));
      if(winner)requestAnimationFrame(()=>{if(stage.isConnected)fx.triumph(fx.spot(winner.face),involved&&!victory?'#9ad0ff':'#ffd45c');});
    }
    playEffect(draw?'battleDraw':involved&&!victory?'battleLoss':'battleWin');
    const details=el('details',null,'battle-log');details.append(el('summary','전투 내역'));
    const list=el('ol');for(const line of b.lines.slice(0,-1))list.append(el('li',line));
    if(list.children.length){details.append(list);status.append(details);}
  };
  if(!fx||!battleReplayDuration(b)){playEffect(b.strikes?.at(-1)?.effect||'hit');reveal(true);settle(true);finish();return;}
  stage.dataset.phase='replay';status.textContent='전투 준비';
  // A tap on the stage jumps to the result.
  const skip=el('small','탭하면 결과로','battle-skip');stage.append(skip);
  stage.addEventListener('click',()=>{
    if(stage.dataset.phase!=='replay')return;
    stage.dataset.skipped='1';skip.remove();fx.clear();
    for(const animation of stage.getAnimations({subtree:true}))animation.cancel();
    for(const node of stage.querySelectorAll('.duel-damage,.duel-callout,.duel-pieces,.duel-flash,.duel-focus'))node.remove();
    for(const f of fighters){f.art.classList.remove('broken');f.chips.replaceChildren();f.side.classList.remove('striking');f.settle();}
    stage.classList.remove('finisher');
    reveal(true);settle(true);finish();
    // Whoever acts next, a computer or fast play, no longer waits for the replay.
    render();
  });
  later(plan.reveal,()=>{
    reveal(false);playEffect('card');
    status.textContent=[...items.map(id=>C.cards[id]?.name),b.landHP?'지형 보너스 +'+b.landHP+' HP':''].filter(Boolean).join(' · ')||'아이템 없이 전투';
  });
  later(plan.stats,()=>{
    settle(false);playEffect('gain');
    for(const f of fighters){const at=fx.spot(f.face);fx.ring(at.x,at.y+at.h*.5,at.w*.7,'#ffe2a0',{squash:.3,width:3,life:.5,front:false});}
    if(b.strikes[0]?.side===1)later(260*speed,()=>fighters[1].say('선제 공격','first'));
  });
  const shake=(strength,ms)=>field.animate([{transform:'none'},{transform:'translate('+strength+'px,'+-strength*.7+'px)'},{transform:'translate('+-strength*.9+'px,'+strength*.6+'px)'},
    {transform:'translate('+strength*.5+'px,'+strength*.3+'px)'},{transform:'none'}],{duration:ms,easing:'ease-out'});
  const flash=heavy=>{const light=el('i',null,'duel-flash'+(heavy?' heavy':''));stage.append(light);setTimeout(()=>light.remove(),460);};
  const number=(f,text,kind)=>{const digit=el('i',text,'duel-damage '+(kind||''));f.face.append(digit);setTimeout(()=>digit.remove(),1150);};
  b.strikes.forEach((strike,index)=>{
    const beat=plan.strikes[index],attacker=fighters[strike.side],defender=fighters[1-strike.side];
    const previous=b.strikes[index-1],before=beat.before;
    const fatal=strike.notes.some(note=>note.includes('즉사'));
    const kind=fatal?'death':strike.scroll?'magic':attackMotion(ids[strike.side],items[strike.side]);
    const ranged=battleRanged.includes(kind),stopped=['block','reflect','heal','miss'].includes(strike.effect);
    const actionLabel=!previous?'선공':previous.side===strike.side?'연속 공격':'반격';
    later(beat.start,()=>{
      status.textContent=actionLabel+' · '+C.cards[ids[strike.side]].name;
      attacker.side.classList.add('striking');later(beat.length-80,()=>attacker.side.classList.remove('striking'));
      attacker.say(actionLabel,'turn');
      fx.charge(fx.spot(attacker.face),kind,.34*speed);
      playEffect('charge');
    });
    later(beat.start+220*speed,()=>{
      const from=fx.spot(attacker.face),to=fx.spot(defender.face),dx=to.x-from.x,dy=to.y-from.y,lean=Math.sign(dx||1);
      const move=(share,extra)=>'translate('+dx*share+'px,'+dy*share+'px) '+extra;
      attacker.face.animate(ranged?[{transform:'none'},{transform:move(-.06,'scale(1.08) rotate('+lean*-6+'deg)'),offset:.3},{transform:move(.05,'scale(1.12) rotate('+lean*4+'deg)'),offset:.5},{transform:move(.02,'scale(1.04)'),offset:.7},{transform:'none'}]:
        kind==='leap'?[{transform:'none'},{transform:move(-.05,'translateY(6%) scale(.94)'),offset:.2},{transform:move(.3,'translateY(-34%) scale(1.14) rotate('+lean*-8+'deg)'),offset:.4},{transform:move(.56,'scale(1.1) rotate('+lean*10+'deg)'),offset:.5},{transform:move(.5,'rotate('+lean*6+'deg)'),offset:.64},{transform:'none'}]:
        kind==='crush'?[{transform:'none'},{transform:move(.1,'translateY(-20%) scale(1.2,.92)'),offset:.3},{transform:move(.52,'translateY(4%) scale(.94,1.14)'),offset:.5},{transform:move(.46,'scale(1.04)'),offset:.64},{transform:'none'}]:
        [{transform:'none'},{transform:move(-.1,'rotate('+lean*-9+'deg) scale(1.03)'),offset:.24},{transform:move(.6,'rotate('+lean*11+'deg) scale(1.1)'),offset:.5},{transform:move(.52,'rotate('+lean*6+'deg) scale(1.06)'),offset:.64},{transform:'none'}],
        {duration:800*speed,easing:'cubic-bezier(.3,.1,.3,1)'});
      playEffect(battleSounds[kind]||'slash');
      if(!ranged)later(160*speed,()=>fx.rush(from,to,kind));
      else if(['ember','wave','gale'].includes(kind))later(140*speed,()=>fx.shot(from,to,kind,.26*speed));
    });
    later(beat.impact,()=>{
      const at=fx.spot(defender.face),source=fx.spot(attacker.face),direction=Math.sign(at.x-source.x||1);
      if(strike.notes.length)status.textContent=strike.notes.join(' · ');
      playEffect(strike.effect==='hit'?(strike.critical?'critical':'hit'):strike.effect==='miss'?'step':strike.effect||'hit');
      if(strike.effect==='block'){fx.ward(at);defender.say('무효','ward');}
      else if(strike.effect==='reflect'){fx.reflect(at,source);defender.say('반사','ward');}
      else if(strike.effect==='heal'){fx.mend(at);defender.say('흡수','mend');}
      else if(strike.effect==='miss')attacker.say('빗나감','miss');
      else fx.strike(kind,at,direction,kind==='magic'?CepterBattleFx.palettes[scrollTints[C.combo.key(C.cards[items[strike.side]]||{})]]:undefined);
      if(strike.critical){fx.critical(at);attacker.say('강타!','critical');}
      if(fatal)attacker.say('즉사','fatal');
      if(strike.notes.some(note=>note.includes('관통')))attacker.say('관통','pierce');
      fighters.forEach((f,i)=>{
        const lost=before[i]-strike.hp[i],target=i===1-strike.side;
        if(lost>0){
          const dies=beat.kills[i],weight=Math.min(2,lost/30)+(strike.critical?.5:0)+(dies?.4:0),heavy=weight>=1||dies,spot=fx.spot(f.face);
          f.setHP(strike.hp[i],(dies?240:420)*speed);
          const push=target?direction:-direction;
          f.face.animate([{filter:'brightness(3) saturate(.3)',transform:'none'},{filter:'brightness(1.6)',transform:'translate('+push*(6+weight*5)+'%,'+-weight*2+'%) rotate('+push*(3+weight*3)+'deg)',offset:.22},
            {filter:'none',transform:'translate('+push*-3+'%,0) rotate('+push*-2+'deg)',offset:.55},{filter:'none',transform:'none'}],{duration:(360+weight*90)*speed,easing:'ease-out'});
          fx.impact(spot,target&&!stopped?kind:'reflect',weight);
          // Lighter blows land once for every ten points of damage.
          if(target&&!stopped&&['volley','ember','wave','magic'].includes(kind)){
            const hits=Math.min(7,Math.ceil(lost/10));
            for(let n=1;n<hits;n++)later(n*70*speed,()=>fx.star(spot.x+(Math.random()-.5)*spot.w*.7,spot.y+(Math.random()-.5)*spot.h*.7,spot.w*.3,CepterBattleFx.palettes[kind],{rays:6,life:.2}));
          }
          shake(heavy?9:5,heavy?340:230);flash(heavy);
          number(f,'−'+lost,(heavy?'heavy ':'')+(strike.critical&&target?'critical':''));
          if(!dies){f.scar.classList.add('shown');battleScar(f.scar,target&&!stopped?kind:'crush',Math.min(1,weight));}
        }else if(lost<0){number(f,'+'+-lost,'heal');fx.mend(fx.spot(f.face));f.setHP(strike.hp[i],420*speed);}
        if(beat.kills[i]){
          // The stage holds its breath on the blow that ends the fight.
          const ending=target&&!stopped?battleEndings[kind]||'shatter':strike.notes.some(note=>note.includes('독'))?'ripple':'shatter';
          stage.classList.add('finisher');
          const focus=el('i',null,'duel-focus');stage.append(focus);
          later(300*speed,()=>{
            stage.classList.remove('finisher');focus.remove();
            const spot=fx.spot(f.face),palettes=CepterBattleFx.palettes;
            battleDestroy(f,ending,i?1:-1,speed);
            fx.shatter(spot,ending==='burn'?palettes.ember:ending==='void'?palettes.death:ending==='fade'?palettes.magic:palettes.ash);
            playEffect('shatter');shake(11,420);flash(true);
            f.say('격파','fallen');
          });
        }
      });
    });
  });
  later(plan.end,finish);
}
if(typeof CepterBattleFx!=='undefined')CepterBattleFx.preload();
