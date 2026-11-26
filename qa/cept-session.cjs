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
console.log('Clock expiry, replay privacy, team overtime, campaign progression and replay settings OK');
