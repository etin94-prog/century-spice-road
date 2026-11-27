/* Keep the board control reachable even when a turn redraws its DOM node. */
const boardDialog=document.getElementById('modal');
let boardFocus=null;
function rememberBoardControl(event){
  const target=event.target.closest('button,a,select,[tabindex="0"]');
  if(!target||target.closest('dialog'))return;
  const attr=[...target.attributes].filter(a=>a.name.startsWith('data-'));
  const selector=target.id?'#'+CSS.escape(target.id):attr.map(a=>'['+a.name+'="'+CSS.escape(a.value)+'"]').join('');
  boardFocus={target,selector};
}
document.addEventListener('focusin',rememberBoardControl);
document.addEventListener('pointerdown',rememberBoardControl,true);
boardDialog.addEventListener('close',()=>{
  if(boardDialog.open||!boardFocus||document.activeElement!==document.body)return;
  const {target,selector}=boardFocus;
  const control=target.isConnected?target:selector&&document.querySelector(selector);
  (control||document.getElementById('setupTop'))?.focus({preventScroll:true});
});
const turnNotice=document.createElement('span');
turnNotice.setAttribute('role','status');
turnNotice.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
document.body.append(turnNotice);
let previouslyPlayable=false;
function announcePlayerTurn(playable){
  if(Boolean(playable)===previouslyPlayable)return;
  previouslyPlayable=Boolean(playable);
  turnNotice.textContent=previouslyPlayable?'내 차례입니다.':'';
}

let refusalTimer, refusalTarget, refusalOriginal, refusalMessage;
function refuseBoardMove(message){
  clearTimeout(refusalTimer);
  if(refusalTarget?.isConnected&&refusalTarget.textContent===refusalMessage){
    refusalTarget.textContent=refusalOriginal;
    delete refusalTarget.dataset.boardRefused;
  }
  const boardStatus=document.getElementById('status');
  const body=document.getElementById('body');
  if(boardDialog.open){
    refusalTarget=body.querySelector('.boardRefusal');
    if(!refusalTarget){
      refusalTarget=document.createElement('p');
      refusalTarget.className='boardRefusal';
      refusalTarget.setAttribute('role','status');
      body.prepend(refusalTarget);
    }
  }else refusalTarget=boardStatus.querySelector('.turn')||boardStatus;
  refusalOriginal=refusalTarget.textContent;
  refusalMessage=message;
  refusalTarget.dataset.boardRefused='';
  refusalTarget.textContent=message;
  refusalTimer=setTimeout(()=>{
    if(refusalTarget.textContent===message)refusalTarget.textContent=refusalOriginal;
    delete refusalTarget.dataset.boardRefused;
  },2600);
}
function refuseCenturyTurn(){
  const message=g.over?'대국이 끝났습니다.':
    online&&!online.ready?'친구가 입장할 때까지 기다려 주세요.':
    online&&!online.connected?'대국에 다시 연결하고 있습니다.':
    online?.pending?'이전 행동을 반영하고 있습니다.':
    flightActor!==null?'이전 행동이 끝난 뒤 다시 선택해 주세요.':
    seatName(g.turn)+' 차례입니다.';
  refuseBoardMove(message);
}
