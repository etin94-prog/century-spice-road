'use strict';
// Firebase authorizes each log revision for the next clockwise seat. Empty seats
// in the dice rotation acknowledge a pass without changing the Las Vegas board.
let g={edition:5},flightActor=null;
const review={open:false},el=id=>document.getElementById(id),pace=ms=>ms;
function close(){el('modal').close();}
function stopAI(){clearTimeout(timer);}
function myTurn(){return Boolean(online?.ready&&online.connected&&!online.pending&&!g.over&&g.turn===online.seat);}
function roomRoll(state){
  Vegas.roll(state.board,()=>{
    state.rng=(Math.imul(state.rng,1664525)+1013904223)>>>0;
    return state.rng/4294967296;
  });
}
function newGame(roles,random){
  const board=Vegas.start(roles,random);
  const state={edition:5,board,players:board.players,turn:0,over:false,log:[],rng:Math.floor(random()*4294967296)};
  roomRoll(state);return state;
}
function expected(state){
  if(state.board.phase==='settled')return 'next';
  return state.board.turn===state.turn?'place':'pass';
}
function apply(state,a){
  if(state.over||expected(state)!==a.kind||!Number.isInteger(a.i))return false;
  const board=state.board;
  if(a.kind==='place'){
    if(!board.roll.includes(a.i))return false;
    const count=board.roll.filter(n=>n===a.i).length;
    Vegas.place(board,a.i);
    board.message=(state.turn+1)+'번 좌석 · 카지노 '+(a.i+1)+'에 '+count+'개 배치';
    state.log=[{msg:board.message}];
    state.over=board.phase==='over';
  }else{
    if(a.i!==0)return false;
    if(a.kind==='next'){Vegas.next(board);state.log=[{msg:board.round+'라운드 시작'}];}
  }
  if(board.phase==='roll')roomRoll(state);
  state.turn=(state.turn+1)%state.players.length;
  return true;
}
function chooseMove(state){
  const kind=expected(state);
  return {kind,i:kind==='place'?Vegas.choose({...state.board,players:state.players}):0};
}
function advance(action){
  if(apply(g,action))render();
}
function captureMove(){return null;}
function recordMove(){}
function scheduleVegasRoom(){
  if(!online.ready||!online.connected)return;
  if(myTurn()&&expected(g)==='pass'){
    timer=setTimeout(()=>{if(myTurn()&&expected(g)==='pass')submitOnline({kind:'pass',i:0});},20);
  }
  scheduleRoomAI();
}
