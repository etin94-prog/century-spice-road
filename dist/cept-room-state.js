// Both room transports publish the same seat-specific view of a match.
const CepterRoomState = (() => {
  function view(engine,game,seat){
    const {replay,...current}=game;
    const state=structuredClone(current);
    if(game.phase==='over'&&replay)state.replay=replay;
    for(const [i,player] of state.players.entries()){
      player.bookCount=player.book.length;
      if(engine.evo&&game.phase==='over'&&i===seat)player.evoRewardBook=(player.template||[]).filter(id=>engine.cards[id]?.evo);
      delete player.book;delete player.template;delete player.recycleTemplate;
      if(i===seat)continue;
      delete player.peek;
      const choosingCard=state.turn===seat&&state.spellTarget===i&&['shatter','suppression','squeeze','bookWorm'].includes(state.phase);
      if(!choosingCard)player.hand=[];
    }
    if(state.phase==='defend'&&seat!==(state.battle.attackerSeat??state.turn))state.battle.atkItem=null;
    return {game:state,choices:engine.actor(game)===seat?engine.choices(game):[]};
  }
  function runAI(engine,game,now=Date.now()){
    let steps=0;
    while(game.phase!=='over'&&engine.isComputer(game,engine.actor(game))){
      if(++steps>2000||!engine.play(game,engine.ai(game),now))throw Error('AI 진행 오류');
    }
    return steps;
  }
  return {view,runAI};
})();
if(typeof module!=='undefined')module.exports=CepterRoomState;
