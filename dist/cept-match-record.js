// A replay contains public observations. It does not store inputs into hidden hands.
const CepterMatchRecord=(()=>{
  const tileState=t=>[t.type,t.owner,t.level,t.unit?.id??null,t.unit?.hp??null,t.unit?.mhp??null,t.unit?.st??null,t.unit?.enchant??null];
  function frame(s,total){
    const f={
      round:s.round,turn:s.turn,phase:s.phase,die:s.die||0,winner:s.winner,
      players:s.players.map((p,i)=>[p.pos,p.cash,total(s,i)]),
    };
    if(s.switchRound!=null){f.switchRound=s.switchRound;f.switchSide=!!s.switchSide;}
    // A tied round limit has no winner; the record names the seats that shared first place.
    if(s.phase==='over'&&s.leaders?.length>1)f.leaders=s.leaders.slice();
    return f;
  }
  function begin(s,total,board){
    s.replay={version:1,edition:s.edition,map:s.mapId,layout:s.layoutRevision||0,
      title:board(s).name,names:s.players.map(p=>p.name),teams:s.teams?.slice()||null,
      initial:s.tiles.map(tileState),opening:frame(s,total),steps:[]};
  }
  function before(s){
    if(!s.replay)return null;
    return {tiles:s.tiles.map(tileState),move:s.lastMove?.sequence,effect:s.mapEffect?.sequence,log:s.logSequence||0};
  }
  function append(s,prior,action,seat,timedOut,total){
    if(!prior)return;
    const tiles=s.tiles.flatMap((t,i)=>{
      const next=tileState(t);return next.some((v,j)=>v!==prior.tiles[i][j])?[[i,next]]:[];
    });
    const step={...frame(s,total),seat,action,tiles};
    if(timedOut)step.timeout=true;
    if(s.lastMove&&s.lastMove.sequence!==prior.move)step.path=s.lastMove.path.slice();
    if(s.mapEffect&&s.mapEffect.sequence!==prior.effect)step.effect=[s.mapEffect.tile,s.mapEffect.label];
    const added=(s.logSequence||0)-prior.log;
    if(added>0)step.notes=s.log.slice(0,added).reverse();
    if(s.phase==='result'&&s.battle?.finalHP){
      const b=s.battle;
      step.battle={at:b.at,forms:b.forms||[b.inv,b.guard],finalForms:b.finalForms,items:[b.atkItem,b.defItem],
        startHP:b.startHP,finalHP:b.finalHP,strikes:b.strikes,lines:b.lines,won:b.won};
      if(b.settled)step.battle.settled=b.settled;
    }
    s.replay.steps.push(step);
  }
  return {begin,before,append};
})();
if(typeof module!=='undefined')module.exports=CepterMatchRecord;
