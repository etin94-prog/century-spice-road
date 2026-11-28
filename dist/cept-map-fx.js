let seenMapEffect=0,mapPlayback=null;

function cancelMapEffect(){
  if(!mapPlayback)return;
  clearTimeout(mapPlayback.end);
  clearInterval(mapPlayback.spin);
  mapPlayback.layer.remove();
  $('game').classList.remove('showing-map-effect');
  $('game').inert=false;
  mapPlayback=null;
}

function presentMapEffect(event){
  if(!event||event.sequence===seenMapEffect)return !!mapPlayback;
  cancelMapEffect();
  stopWalk();
  seenMapEffect=event.sequence;
  const map=$('map'),tiles=map.querySelectorAll('.tile'),target=tiles[event.tile];
  if(!target)return false;
  playEffect(event.type);
  if(event.type==='summon')announceCreatures([s.tiles[event.tile]?.unit?.id]);
  if(event.type==='invade'&&s.battle)announceCreatures([s.battle.inv,s.tiles[s.battle.at]?.unit?.id]);
  const rolling=event.type==='roll',quiet=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer=el('div',null,'map-effect '+event.type),fx=el('div',null,'map-burst');
  layer.setAttribute('role','status');
  // The isometric tile is translated left by half its width; offsetLeft is its center.
  const point=t=>[t.offsetLeft,t.offsetTop+t.offsetHeight*.50];
  const [x,y]=point(target),[sx,sy]=point(tiles[event.source]||target);
  const anchor=el('div',null,'map-fx-anchor');
  anchor.style.left=x+'px';anchor.style.top=y+'px';
  const title=el('small',event.title||''),label=el('strong',event.label,'map-fx-label');
  let spin;
  if(rolling){
    const dice=el('div',null,'map-dice');
    const faces=event.faces.map(value=>{const face=el('b',value,'map-die');const rim=el('span',null,'dice-setting');rim.append(face);dice.append(rim);return face;});
    dice.setAttribute('aria-hidden','true');
    layer.append(dice,el('span','이동 '+event.label+'칸','roll-result'));
    if(!quiet){
      let tick=0;
      spin=setInterval(()=>{
        tick++;
        faces.forEach((face,i)=>{face.textContent=tick<9?(event.zeroBased?0:1)+(tick+i)%event.sides:event.faces[i];});
        if(tick===9){clearInterval(spin);layer.classList.add('settled');}
      },65);
    }else layer.classList.add('settled');
  }else{
    anchor.append(fx);layer.append(anchor);
    // The summoned card spins down onto its land.
    const summoned=event.type==='summon'?s.tiles[event.tile]?.unit?.id:null;
    if(summoned!=null&&!quiet){const card=cardSeal(summoned);card.alt='';card.classList.add('map-fx-card');anchor.append(card);}
    for(const hit of event.hits||[]){
      if(!tiles[hit.at])continue;
      const [hx,hy]=point(tiles[hit.at]),marker=el('strong','−'+hit.damage,'map-damage');
      marker.style.left=hx+'px';marker.style.top=hy+'px';
      marker.setAttribute('aria-label',(hit.at+1)+'번 영지 '+hit.damage+' 피해'+(hit.defeated?' · 격파':''));
      layer.append(marker);
    }
    if(event.type==='invade'||event.type==='heal'||event.type==='word'){
      const sigil=el('i',event.type==='invade'?'⚔':event.type==='heal'?'+':event.label.split(' ').at(-1),'map-sigil');
      sigil.setAttribute('aria-hidden','true');anchor.append(sigil);
    }
    const badge=el('div',null,'map-fx-badge');badge.append(title,label);
    badge.style.left='clamp(59px,'+x+'px,calc(100% - 59px))';
    badge.style.top='max(36px,'+(y-12)+'px)';layer.append(badge);
    if(!quiet&&(sx!==x||sy!==y)){
      const spark=el('i',null,'map-projectile');layer.append(spark);
      spark.animate([{left:sx+'px',top:sy+'px',opacity:1},{left:x+'px',top:y+'px',opacity:1}],{duration:320,easing:'ease-in'});
    }
  }
  if(rolling)$('mapViewport').append(layer);
  else{focusMapTile(event.tile);map.append(layer);}
  $('game').classList.add('showing-map-effect');$('game').inert=true;
  if(!quiet&&!C.isComputer(s,s.turn)&&(!room||room.seat===s.turn)&&matchMedia('(max-width:900px), (pointer:coarse)').matches)$('mapViewport').scrollIntoView({block:'nearest',inline:'nearest'});
  const end=setTimeout(()=>{cancelMapEffect();render();},quiet?420:rolling?1190:960);
  mapPlayback={layer,end,spin};
  return true;
}
