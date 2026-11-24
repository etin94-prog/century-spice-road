(()=>{
  const page=document.documentElement,full=document.getElementById('full'),wide=document.getElementById('wide');
  let fallback=false,landscape=false,busy=false;
  const native=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
  function paint(){
    page.classList.toggle('cept-full',fallback||native());
    page.classList.toggle('cept-wide',landscape);
    full.textContent=native()||fallback?'전체화면 종료':'전체화면';
    wide.textContent=landscape?'가로 모드 종료':'가로 모드';
    full.setAttribute('aria-pressed',String(native()||fallback));wide.setAttribute('aria-pressed',String(landscape));
  }
  function unlock(){try{screen.orientation?.unlock?.();}catch{}}
  async function enter(){
    try{const request=page.requestFullscreen||page.webkitRequestFullscreen;if(!request)throw Error();await request.call(page);}
    catch{fallback=true;}
  }
  async function leave(){
    fallback=false;landscape=false;unlock();
    if(native()){const exit=document.exitFullscreen||document.webkitExitFullscreen;try{await exit.call(document);}catch{}}
    paint();
  }
  full.onclick=async()=>{
    if(busy)return;busy=true;
    try{if(native()||fallback)await leave();else await enter();}finally{busy=false;paint();}
  };
  wide.onclick=async()=>{
    if(busy)return;busy=true;
    try{
      landscape=!landscape;
      if(landscape){
        if(!native()&&!fallback)await enter();
        try{await screen.orientation.lock('landscape');}catch{/* Portrait-only browsers use the rotated board layout. */}
      }else unlock();
    }finally{busy=false;paint();}
  };
  function changed(){if(!native()&&!fallback){landscape=false;unlock();}paint();}
  document.addEventListener('fullscreenchange',changed);document.addEventListener('webkitfullscreenchange',changed);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fallback)leave();});
  paint();
})();