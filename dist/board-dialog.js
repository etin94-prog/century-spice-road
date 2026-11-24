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
