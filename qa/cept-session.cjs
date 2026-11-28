const assert=require('node:assert/strict');
const C=require('../dist/cept-engine');
const Campaign=require('../dist/cept-campaign');
const room=require('../dist/cept-room-state');
const map='classic',deck=C.presets.intro;
{
  const game=C.configureMatch(C.start(4,4,3000,map,deck),{inputSeconds:15,recordReplay:true});
  assert.equal(C.armClock(game,1000),true);
  assert.equal(game.deadlineAt,16000);
  assert.equal(C.armClock(game,5000),false);
  assert.equal(C.expire(game,15999),false);
  assert.equal(C.play(game,['roll'],16000),false);
  assert.equal(C.expire(game,16000),true);
  assert.equal(game.deadlineAt,31000);
  assert.deepEqual(game.replay.steps.map(f=>[f.seat,f.action,f.timeout]),[[0,'roll',true]]);
  assert.equal(room.view(C,game,0).game.replay,undefined);
  const exported=JSON.parse(JSON.stringify(game.replay));
  assert.equal(exported.opening.players[0].length,3);
  assert.equal(JSON.stringify(exported).includes('"hand"'),false);
  assert.equal(JSON.stringify(exported).includes('"book"'),false);
  game.phase='over';game.winner=0;
  assert.deepEqual(room.view(C,game,2).game.replay,game.replay);
}
{
  const game=C.configureMatch(C.start(4,4,3000,map,deck,deck,0,'teams-12',20),{suddenDeath:true,recordReplay:true});
  Object.assign(game,{round:20,turn:3,phase:'land'});
  assert.ok(C.play(game,['pass']));
  assert.equal(game.round,21);assert.equal(game.turn,0);assert.equal(game.winner,-1);
  assert.equal(game.overtime,true);assert.equal(game.endReason,undefined);
  Object.assign(game,{turn:3,phase:'land'});
  game.players[1].cash++;
  assert.ok(C.play(game,['pass']));
  assert.equal(game.phase,'over');assert.deepEqual(game.leaders,[0]);assert.equal(game.winner,0);
  assert.equal(game.replay.steps.length,2);
}
{
  // A shared top total at the round limit has no winner in any seat layout.
  const finishLimit=game=>{
    Object.assign(game,{round:game.roundLimit,turn:game.players.length-1,phase:'land'});
    assert.ok(C.play(game,['pass']));return game;
  };
  const limited=(alliance,mapId=map,humans=4,target=7000)=>
    C.configureMatch(C.start(4,humans,target,mapId,deck,deck,0,alliance,20),{recordReplay:true});
  const duel=finishLimit(limited('duel'));
  assert.equal(duel.phase,'over');assert.equal(duel.endReason,'roundLimit');
  assert.equal(duel.winner,-1);assert.deepEqual(duel.leaders,[0,1,2,3]);
  assert.deepEqual(C.outcome(duel),{over:true,tie:true,leaders:[0,1,2,3],winners:[]});
  const last=duel.replay.steps.at(-1);
  assert.equal(last.winner,-1);assert.deepEqual(last.leaders,[0,1,2,3]);
  assert.equal(duel.actionSound.cue,'victory');
  assert.equal(C.play(duel,['pass']),false);

  const partial=limited('duel');partial.players[0].cash-=100;partial.players[3].cash-=50;finishLimit(partial);
  assert.equal(partial.winner,-1);assert.deepEqual(partial.leaders,[1,2]);
  assert.deepEqual(C.outcome(partial).winners,[]);

  const solo=limited('duel');solo.players[2].cash++;finishLimit(solo);
  assert.equal(solo.winner,2);assert.deepEqual(solo.leaders,[2]);
  assert.deepEqual(C.outcome(solo),{over:true,tie:false,leaders:[],winners:[2]});
  assert.equal(solo.replay.steps.at(-1).winner,2);assert.equal(solo.replay.steps.at(-1).leaders,undefined);

  for(const [alliance,teams] of [['teams-12',[0,0,1,1]],['teams',[0,1,0,1]],['teams-14',[0,1,1,0]]]){
    const tied=finishLimit(limited(alliance));
    assert.deepEqual(tied.teams,teams);assert.equal(tied.winner,-1);
    assert.deepEqual(tied.leaders,[0,teams.indexOf(1)]);assert.deepEqual(C.outcome(tied).winners,[]);
    assert.deepEqual(tied.replay.steps.at(-1).leaders,tied.leaders);
    const ahead=limited(alliance),mate=teams.lastIndexOf(1);ahead.players[mate].cash++;finishLimit(ahead);
    assert.equal(ahead.winner,teams.indexOf(1));
    assert.deepEqual(C.outcome(ahead).winners,teams.flatMap((team,i)=>team?[i]:[]));
  }

  // PS2 story stage 16: a human who only shares first place has not cleared the map.
  const story=finishLimit(limited('auto','ps2-16',1,0));
  assert.equal(story.mapGoal,true);assert.equal(C.board(story).stage,16);
  assert.equal(story.winner,-1);assert.equal(C.outcome(story).winners.includes(0),false);
  const cleared=limited('auto','ps2-16',1,0);cleared.players[0].cash++;finishLimit(cleared);
  assert.deepEqual(C.outcome(cleared).winners,[0]);

  // Sudden death plays on until one side leads, then records that side.
  const sudden=C.configureMatch(C.start(4,4,7000,map,deck,deck,0,'duel',20),{suddenDeath:true,recordReplay:true});
  finishLimit(sudden);
  assert.equal(sudden.round,21);assert.equal(sudden.turn,0);assert.equal(sudden.overtime,true);assert.equal(sudden.winner,-1);
  assert.equal(sudden.leaders,undefined);assert.equal(C.outcome(sudden).over,false);
  Object.assign(sudden,{turn:3,phase:'land'});assert.ok(C.play(sudden,['pass']));
  assert.equal(sudden.round,22);assert.equal(sudden.turn,0);assert.notEqual(sudden.phase,'over');
  sudden.players[3].cash++;Object.assign(sudden,{turn:3,phase:'land'});assert.ok(C.play(sudden,['pass']));
  assert.equal(sudden.phase,'over');assert.equal(sudden.winner,3);assert.deepEqual(C.outcome(sudden).winners,[3]);
  assert.equal(sudden.replay.steps.at(-1).leaders,undefined);

  // A match saved before this rule kept the first tied seat as the winner.
  const legacy={...duel,winner:0};
  assert.deepEqual(C.outcome(legacy).winners,[]);assert.equal(C.outcome(legacy).tie,true);
  assert.equal(Campaign.complete(0,{...legacy,campaign:{chapter:0}}),0);

  // A goal victory is unaffected.
  const goal=C.start(4,4,3000,map,deck,deck,0,'teams-12');
  goal.phase='over';goal.winner=1;
  assert.deepEqual(C.outcome(goal),{over:true,tie:false,leaders:[],winners:[0,1]});
  assert.deepEqual(C.outcome(C.start(2,2,3000,map,deck)),{over:false,tie:false,leaders:[],winners:[]});

  // The web campaign does not advance on a shared first place.
  const chapter=Campaign.start(C,0,deck,{recordReplay:true});
  Object.assign(chapter,{round:chapter.roundLimit,turn:chapter.players.length-1,phase:'land'});
  assert.ok(C.play(chapter,['pass']));
  assert.equal(chapter.winner,-1);assert.deepEqual(chapter.leaders,[0,1]);
  assert.equal(Campaign.complete(0,chapter),0);
}
{
  const game=C.configureMatch(C.start(2,1,3000,map,deck),{inputSeconds:30});
  game.phase='land';C.armClock(game,100);
  assert.ok(C.play(game,['pass'],200));assert.equal(game.turn,1);
  assert.equal(game.deadlineAt,undefined);
  assert.ok(room.runAI(C,game,300)>0);assert.equal(game.deadlineAt,30300);
}
{
  let progress=0;
  for(const [i,chapter] of Campaign.chapters.entries()){
    const game=Campaign.start(C,i,deck,{recordReplay:true});
    assert.equal(game.mapId,chapter.map);assert.equal(game.players.length,chapter.seats);
    assert.equal(game.roundLimit,chapter.rounds);assert.equal(game.replay.names[1],chapter.rivals[0]);
    assert.equal(Campaign.complete(progress,game),progress);
    game.phase='over';game.winner=1;assert.equal(Campaign.complete(progress,game),progress);
    game.winner=0;game.leaders=[0,1];assert.equal(Campaign.complete(progress,game),progress);
    delete game.leaders;progress=Campaign.complete(progress,game);assert.equal(progress,i+1);
    assert.equal(Campaign.complete(progress,game),progress);
  }
}
{
  const B=C.createEdition('begins');
  function tollTrial(enabled=true,roundLimit=0){
    const game=B.configureMatch(B.start(2,2,6000,'begins-original-ford',undefined,undefined,0,'duel',roundLimit),
      {suddenDeath:enabled,recordReplay:true});
    const p=game.players[0];
    const unit=B.cards.findIndex(c=>!c.unlisted&&B.combo.key(c)==='fighter');
    Object.assign(game.tiles[2],{type:0,owner:1,level:5,unit:{id:unit,hp:40}});
    Object.assign(p,{pos:2,cash:0,hand:[]});
    game.phase='land';
    return game;
  }
  const exhausted=tollTrial();
  exhausted.players[1].cash=3100;
  assert.ok(B.play(exhausted,['pay']));
  assert.deepEqual([exhausted.phase,exhausted.endReason,exhausted.winner],['over','suddenDeath',1]);
  assert.deepEqual(B.outcome(exhausted).winners,[1]);
  assert.equal(exhausted.players[0].pos,2);
  assert.match(exhausted.replay.steps.at(-1).notes.join(' '),/목표 총마력의 절반.*마력 고갈/);
  const projected=room.view(B,exhausted,1).game;
  assert.deepEqual([projected.suddenDeathArmed,projected.endReason],[true,'suddenDeath']);

  const unsecured=tollTrial();
  assert.ok(B.play(unsecured,['pay']));
  assert.equal(unsecured.suddenDeathArmed,undefined);
  assert.equal(unsecured.players[0].pos,0);
  assert.notEqual(unsecured.phase,'over');
  const disabled=tollTrial(false,25);
  disabled.players[1].cash=3100;
  assert.ok(B.play(disabled,['pay']));
  assert.equal(disabled.suddenDeathArmed,undefined);
  assert.notEqual(disabled.phase,'over');

  const sell=tollTrial(),fighter=sell.tiles[2].unit.id;
  sell.players[1].cash=3100;
  Object.assign(sell.tiles[3],{owner:0,unit:{id:fighter,hp:40}});
  assert.ok(B.play(sell,['pay']));
  assert.equal(sell.phase,'sell');
  assert.ok(sell.suddenDeathArmed);
  // The trigger persists even after the leader later drops below half of the target.
  sell.players[1].cash=0;
  const saved=JSON.parse(JSON.stringify(sell));
  assert.ok(B.play(saved,['sell',3]));
  assert.equal(saved.endReason,'suddenDeath');
  const recovered=tollTrial();
  recovered.players[1].cash=3100;
  recovered.players[0].symbols[0]=50;
  recovered.prices[0]=30;
  assert.ok(B.play(recovered,['pay']));
  assert.equal(recovered.phase,'sell');
  const liquidation=B.choices(recovered).find(([kind])=>kind==='liquidate');
  assert.ok(B.play(recovered,liquidation));
  assert.ok(recovered.players[0].cash>=0&&recovered.phase!=='over');

  const equal=B.configureMatch(B.start(2,2,6000,'begins-original-ford',undefined,undefined,0,'duel',25),{suddenDeath:true});
  Object.assign(equal,{round:25,turn:1,phase:'land'});
  assert.ok(B.play(equal,['pass']));
  assert.deepEqual([equal.phase,equal.endReason,equal.overtime,B.outcome(equal).tie],['over','roundLimit',undefined,true]);
  const legacy=B.configureMatch(B.start(2,2,6000,'begins-original-ford',undefined,undefined,0,'duel',25),{suddenDeath:true});
  delete legacy.beginsSuddenDeath;
  Object.assign(legacy,{round:25,turn:1,phase:'land'});
  assert.ok(B.play(legacy,['pass']));
  assert.deepEqual([legacy.round,legacy.overtime],[26,true]);
}
{
  // The table shows the card drawn at the start of a turn. The record says whose it was and how many, never which card.
  const s=C.start(2,2,5000,map,deck,deck);
  s.phase='land';s.die=3;
  const before=s.players[1].hand.length;
  assert.ok(C.play(s,['pass']));
  assert.deepEqual(s.drawEvent,{seat:1,count:1,hand:before+1,sequence:1});
  assert.deepEqual(room.view(C,s,0).game.drawEvent,s.drawEvent);
  assert.deepEqual(room.view(C,s,0).game.players[1].hand,[]);
  s.phase='land';
  assert.ok(C.play(s,['pass']));
  assert.equal(s.drawEvent.seat,0);assert.equal(s.drawEvent.sequence,2);
  // A seventh card puts the turn into the discard step before anything else.
  const full=C.start(2,2,5000,map,deck,deck);
  while(full.players[1].hand.length<6)full.players[1].hand.push(full.players[1].book.pop());
  full.phase='land';full.die=3;
  assert.ok(C.play(full,['pass']));
  assert.equal(full.phase,'discard');assert.equal(full.drawEvent.hand,7);
  assert.ok(C.play(full,['discard',6]));
  assert.equal(full.phase,'spell');assert.equal(full.players[1].hand.length,6);
}
console.log('Clock expiry, replay privacy, team overtime, Begins bankruptcy sudden death, round-limit ties, campaign progression, replay settings and the turn-start draw OK');
