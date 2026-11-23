// Play two independent human seats, plus two native AI workers, through settlement.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const edition=Number(process.argv[2]),humans=Number(process.argv[3]||2);
assert([2,3,12,13,123].includes(edition)&&[2,3,4].includes(humans));
const seats=Number(process.env.QA_SEATS||4);
assert(seats>=humans&&seats<=4);
const base=process.env.GAME_URL||'https://etin94-prog.github.io/century-spice-road/';
async function run(){
 const b=await chromium.launch({channel:process.env.QA_BROWSER||'msedge',args:['--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows']});
 try{
  const pages=[],errors=[];
  for(let i=0;i<humans;i++){
   const p=await b.newPage({isMobile:true,hasTouch:true,reducedMotion:'reduce',viewport:{width:i%2?740:844,height:i%2?360:390}});
   p.on('pageerror',e=>errors.push(e.message));pages.push(p);
  }
  const h=pages[0];await h.goto(new URL('expedition.html?'+(edition>3?'combo':'edition')+'='+edition,base).href);await h.locator('#friend').tap();
  const link=await h.locator('#invite').inputValue();for(const p of pages.slice(1)){await p.goto(link);await p.locator('#invite').waitFor();}
  await h.waitForFunction(n=>online.people===n,humans);await h.locator('#roomTotal').selectOption(String(seats));await h.locator('#beginTable').tap();
  await Promise.all(pages.map((p,i)=>p.waitForFunction(i=>online?.ready&&mySeat()===i,i)));
  if(process.argv.includes('--refresh')){
   assert([13,123].includes(edition));
   await h.waitForFunction(()=>myTurn());await h.locator('[data-tab="cards"]').tap();
   const i=await h.evaluate(()=>g.tiles.findIndex(t=>t.special==='refresh'));
   await h.locator('[data-site="'+i+'"]').tap();await h.locator('[data-option="0"]').tap();
   for(const p of pages)await p.waitForFunction(()=>mixRefresh&&online.refreshRevision===0);
   const original=await h.evaluate(()=>mixPreview().market);
   await h.reload();await h.waitForFunction(()=>myTurn()&&mixRefresh);
   for(const p of pages)assert.deepEqual(await p.evaluate(()=>mixPreview().market),original);
   await h.locator('#rest').tap();await h.locator('[data-option="0"]').tap();
   for(const p of pages)await p.waitForFunction(()=>online.count===1&&!mixRefresh);
   console.log('Shared market refresh survived reload',edition);
  }
  for(let j=0;j<500;j++){
   await h.waitForFunction(()=>g.over||g.turn<online.config.humans&&!review.open&&!online.pending);
   const state=await h.evaluate(()=>({n:online.count,turn:g.turn,over:g.over}));if(state.over)break;
   for(const p of pages)await p.waitForFunction(n=>online.count===n&&!review.open,state.n);
   const boards=await Promise.all(pages.map(p=>p.evaluate(()=>JSON.stringify(g))));
   assert(boards.every(x=>x===boards[0]));
   const p=pages[state.turn];await p.waitForFunction(()=>myTurn());
   const a=await p.evaluate(()=>chooseMove(g,'Medium'));
   if(a.kind==='rest')await p.locator('#rest').tap();
   else{
    if(edition>3){
     if(a.refresh){
       await p.locator('[data-tab="cards"]').tap();
       const i=await p.evaluate(()=>g.tiles.findIndex(t=>t.special==='refresh'));
       await p.locator('[data-site="'+i+'"]').tap();await p.locator('[data-option="0"]').tap();
       while(await p.locator('dialog[open] [data-drop]:enabled').count())await p.locator('dialog[open] [data-drop]:enabled').first().tap();
     }
     const target=await p.evaluate(a=>{
       const board=mixPreview(),t=mixSites(board)[a.i],c=mixOptions(board,a.i)[a.option];
       return {tab:['market','buy','play','route','refresh','swap'].includes(t.special)?'cards':'board',dest:t.special==='move'?c.dest:null};
     },a);
     if(a.kind==='recover')await p.locator('#rest').tap();
     else{
      await p.locator('[data-tab="'+target.tab+'"]').tap();
      await p.locator('[data-site="'+a.i+'"]').tap();
      if(target.dest!==null)await p.locator('[data-dest="'+target.dest+'"]').tap();
     }
    }else await p.locator('[data-site="'+a.i+'"]').tap();
    await p.locator('[data-option="'+a.option+'"]').tap();
    if(await p.locator('dialog[open] [data-drop]').count()){
     const remaining=parseInt(await p.locator('dialog[open] #body p').first().innerText(),10);
     assert(Number.isInteger(remaining)&&remaining>0);
     for(let k=0;k<remaining;k++)await p.locator('dialog[open] [data-drop]:enabled').first().tap();
    }
   }
   await h.waitForFunction(n=>online.count>n,state.n);if(j%25===0)console.log('edition',edition,'moves',state.n);
  }
  await Promise.all(pages.map(p=>p.locator('.rank').first().waitFor()));
  const finals=await Promise.all(pages.map(p=>p.evaluate(()=>({n:online.count,ranks:expRanks(g),board:g}))));
  require('./audit-final.cjs')(finals[0].board,seats,finals[0].ranks);
  for(const p of pages){
    const labels=await p.evaluate(()=>expRanks(g).map((r,j)=>(j+1)+'위 · '+seatName(r.i)+' · '+r.points+'점'));
    assert.deepEqual(await p.locator('.rank b').allTextContents(),labels);
  }
  assert(finals[0].board.over);assert.equal(finals[0].ranks.length,seats);finals.forEach(r=>assert.deepEqual(r,finals[0]));assert.deepEqual(errors,[]);
  console.log('FINAL',edition,humans,finals[0].n,finals[0].ranks);
 }finally{await b.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
