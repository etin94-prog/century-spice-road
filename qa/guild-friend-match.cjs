const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.GAME_URL;
assert(base,'Set GAME_URL to the deployed or emulated game.');

// Runs inside each phone, after render and before another seat can move.
function observe(){
  window.revisions=[];
  const advanceTurn=advance;
  function sample(){
    const issues=[];
    for(const card of document.querySelectorAll('#market [data-card]')){
      const r=card.getBoundingClientRect();
      if(r.width<44||r.height<44||r.right>innerWidth+1||r.bottom>innerHeight+1)issues.push('card bounds');
      for(const child of card.querySelectorAll('.gem,.ability,.face b')){
        const c=child.getBoundingClientRect();
        if(c.right>r.right+1||c.bottom>r.bottom+1||c.left<r.left-1)issues.push('label clipped');
      }
    }
    // Compare the visible board from each seat's perspective. The sidebar's
    // own coat-of-arms summary is intentionally personal.
    const normalize=str=>str.replace(/나|친구 [1-4]|AI [1-4]/g,v=>v==='나'?'좌석 '+(mySeat()+1):'좌석 '+v.at(-1));
    revisions.push({board:JSON.stringify(g),activity:normalize(el('latestMove').textContent),market:normalize(el('market').innerText),seats:normalize(el('seats').innerText),
      objectives:[...el('patrons').querySelectorAll('.patron')].map(e=>e.innerText),issues:[...new Set(issues)],
      width:Math.round(el('market').querySelector('[data-card]').getBoundingClientRect().width)});
  }
  sample();
  advance=(...args)=>{const result=advanceTurn(...args);sample();return result;};
}
async function touch(p,a){
  const tap=s=>p.locator(s).tap();
  if(a.kind==='take'){
    await tap('[data-bank="'+a.take[0]+'"]');
    for(const i of a.take.slice(1))await tap('[data-pick="'+i+'"]');
    await tap('#take');
  }else{
    if(a.kind==='held')await tap('#reserved');
    await tap('[data-'+(a.kind==='held'?'held':'card')+'="'+a.i+'"]');
    await tap(a.kind==='reserve'?'#reserve':'#buy');
  }
  for(const i of a.choices)await tap('[data-choice="'+i+'"]');
  await tap('#confirm');
}
async function match(browser,mode){
  const pages=[],errors=[];
  try{
    for(const [width,height] of [[667,375],[844,390]]){
      const p=await browser.newPage({viewport:{width,height},screen:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
      p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));pages.push(p);
    }
    const [h,v]=pages;await h.goto(new URL('splendor.html',base).href);
    await h.locator('#mode').selectOption(mode);await h.locator('#friend').tap();await v.goto(await h.locator('#invite').inputValue());
    await h.waitForFunction(()=>online.people===2);await h.locator('#roomTotal').selectOption('4');await h.locator('#beginTable').tap();
    await Promise.all(pages.map(async(p,i)=>{
      await p.waitForFunction(i=>online?.ready&&online.connected&&mySeat()===i,i);
      await p.locator('#full').tap();assert(await p.evaluate(()=>!!document.fullscreenElement));
      assert.deepEqual(await p.evaluate(()=>[online.config.humans,g.players.length,g.players[2].level,g.players[3].level]),[2,4,'Medium','Medium']);
      await p.evaluate(observe);
    }));
    for(let k=0;k<400;k++){
      await h.waitForFunction(()=>g.over||g.turn<2&&!online.pending);
      const {turn,n,over}=await h.evaluate(()=>({turn:g.turn,n:online.count,over:g.over}));if(over)break;
      const p=pages[turn];await p.waitForFunction(n=>online.count===n&&myTurn(),n);
      await touch(p,await p.evaluate(()=>chooseMove(g,'Hell')));await h.waitForFunction(n=>online.count>n,n);
    }
    await Promise.all(pages.map(p=>p.locator('.ranking').first().waitFor()));
    const traces=await Promise.all(pages.map(p=>p.evaluate(()=>revisions)));
    assert.equal(traces[0].length,traces[1].length);
    for(let i=0;i<traces[0].length;i++)for(const key of ['board','activity','seats','market','objectives'])
      assert.deepEqual(traces[0][i][key],traces[1][i][key],mode+' '+i+' '+key);
    const finals=await Promise.all(pages.map(p=>p.evaluate(()=>({ranks:rankings(g),rows:[...document.querySelectorAll('.ranking')].map(e=>e.innerText.replace(/나|친구 [1-4]|AI [1-4]/g,v=>v==='나'?'좌석 '+(mySeat()+1):'좌석 '+v.at(-1)))}))));
    assert.deepEqual(finals[0],finals[1]);assert.equal(finals[0].rows.length,4);assert.deepEqual(errors,[]);
    const effects=await h.evaluate(()=>({cities:g.players.filter(p=>p.city!=null).length,posts:g.players.flatMap(p=>p.posts||[]).length,orient:g.players.flatMap(p=>p.cards).filter(i=>i>=90).length,forts:Object.keys(g.forts||{}).length}));
    assert(traces[0].some(r=>{const g=JSON.parse(r.board);return mode==='cities'?g.players.some(p=>p.city!=null):mode==='posts'?g.players.some(p=>p.posts.length):mode==='orient'?g.players.some(p=>p.cards.some(id=>id>=90)):Object.keys(g.forts).length;}));
    console.log(JSON.stringify({mode,turns:traces[0].length-1,ranks:finals[0].ranks,effects,layout:traces.map(t=>({minWidth:Math.min(...t.map(r=>r.width)),issues:[...new Set(t.flatMap(r=>r.issues))]}))}));
    for(const t of traces)assert.deepEqual([...new Set(t.flatMap(r=>r.issues))],[],mode+' market layout');
  }finally{await Promise.all(pages.map(p=>p.context().close()));}
}
(async()=>{const b=await chromium.launch({channel:'msedge',args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  try{const modes=process.argv.slice(2);const results=await Promise.allSettled((modes.length?modes:['cities','posts','orient','forts']).map(m=>match(b,m)));
  for(const r of results)if(r.status==='rejected'){console.error(r.reason);process.exitCode=1;}}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
