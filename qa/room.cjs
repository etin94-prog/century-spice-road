// Set GAME_URL to a deployed game or a local Firebase emulator URL.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const humans = Number(process.argv[2] || 3);
assert([3, 4].includes(humans));
const url = process.env.GAME_URL || 'https://etin94-prog.github.io/century-spice-road/';
async function takeTurn(p) {
  const action=await p.evaluate(()=>chooseMove(g,'Medium'));
  const selector=action.kind==='rest'?'#rest':'[data-kind="'+action.kind+'"][data-i="'+action.i+'"]';
  await p.locator(selector).tap();
  if(!await p.locator('#modal[open] #confirm').count())return;
  const pick=(field,value)=>p.locator('[data-pick="'+field+'"][data-val="'+value+'"]').tap();
  for(const spice of action.steps||[])await pick('steps',spice);
  if(action.n>1)await pick('n',action.n);
  while(await p.locator('[data-pick="pay"]').count()){
    const count=await p.evaluate(()=>draft.pay.length);
    await pick('pay',action.pay[count]);
  }
  while(await p.locator('[data-pick="drop"]').count()){
    const paid=await p.evaluate(()=>draft.drop);
    await pick('drop',action.drop.findIndex((count,i)=>count>paid[i]));
  }
  await p.locator('#confirm').tap();
}
async function run() {
  const browser = await chromium.launch({channel:process.env.QA_BROWSER || 'msedge',
    args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  try {
    const pages = [], errors = [];
    for (let i=0; i<humans; i++) {
      const context = await browser.newContext({viewport:{width:i%2?740:844,height:i%2?360:390},isMobile:true,hasTouch:true});
      const page = await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      pages.push(page);
    }
    const host = pages[0];
    await host.goto(url);
    await host.locator('#friend').tap();
    const invite = await host.locator('#invite').inputValue();
    for (const guest of pages.slice(1)) {
      await guest.goto(invite);
      await guest.locator('#invite').waitFor();
    }
    await host.waitForFunction(n=>online.people===n,humans);
    await host.locator('#beginTable').tap();
    await Promise.all(pages.map((p,i)=>p.waitForFunction(seat=>online?.ready&&online.connected&&mySeat()===seat,i)));
    if(process.argv.includes('--recovery')){
      const guest=pages[1],context=guest.context();
      await host.locator('[data-seat="1"]').tap();
      const sections=host.locator('#collection section');
      assert.equal(await sections.first().locator('.card').count(),0);
      assert((await sections.first().innerText()).includes('2장'));
      await host.locator('#close').tap();
      await guest.close();
      await host.waitForFunction(()=>awaySeat(1));
      await takeTurn(host);
      await host.waitForFunction(()=>online.count===1&&!review.open&&flightActor===null);
      await host.locator('#setupTop').tap();
      await host.locator('#matchSub1').selectOption('Hell');
      await host.waitForFunction(()=>online.settings?.[1]?.from===2);
      await host.locator('#close').tap();
      await host.waitForFunction(()=>online.count===2);
      await takeTurn(pages[2]);
      await host.waitForFunction(()=>online.count===4&&!review.open&&flightActor===null);
      await takeTurn(host);
      await host.waitForFunction(()=>online.count===6);
      const rows=await host.evaluate(async()=>{
        const snap=await roomService.get(roomRef(roomService,online.id,'moves'));
        return [snap.child('t1').val().subLevel,snap.child('t5').val().subLevel];
      });
      assert.deepEqual(rows,['Medium','Hell']);
      pages[1]=await context.newPage();
      await pages[1].goto(invite);
      await pages[1].waitForFunction(()=>online.connected&&mySeat()===1&&online.count===6);
      await takeTurn(pages[2]);
      await host.waitForFunction(()=>online.count===8&&!review.open&&flightActor===null);
      await takeTurn(host);
      await pages[1].waitForFunction(()=>online.count===9&&myTurn()&&!review.open);
      await takeTurn(pages[1]);
      await host.waitForFunction(()=>online.count===10);
      assert(await host.evaluate(async()=>!(await roomService.get(roomRef(roomService,online.id,'moves/t9'))).val().substitute));
      console.log('Guest restored. Substitute levels Medium then Hell, next personal turn played directly.');
      return;
    }
    if(humans===3) {
      await host.locator('#setupTop').tap();
      await host.locator('#matchSub0').selectOption('Hard');
      await host.waitForFunction(()=>online.settings?.[0]?.level==='Hard');
      await host.locator('#close').tap();
      await host.evaluate(()=>roomService.goOffline(roomService.database));
      await pages[1].waitForFunction(()=>online.count===1,null,{timeout:90000});
      const revision=await pages[1].evaluate(async()=>{
        const snap=await roomService.get(roomRef(roomService,online.id,'moves/t0'));
        return [snap.val().substitute,snap.val().subLevel];
      });
      assert.deepEqual(revision,[true,'Hard']);
      await host.reload();
      await host.waitForFunction(()=>mySeat()===0&&online.connected&&online.count===1);
      console.log('Host seat restored after one Hard substitute move');
    }
    for(let turns=0; ; turns++) {
      assert(turns<500,'round limit');
      await host.waitForFunction(()=>g.over||g.turn<online.config.humans&&!online.pending&&!review.open&&flightActor===null);
      const state=await host.evaluate(()=>({turn:g.turn,over:g.over,n:online.count}));
      if(state.over)break;
      await Promise.all(pages.map(p=>p.waitForFunction(n=>online.count===n&&!review.open&&flightActor===null,state.n)));
      const before=await Promise.all(pages.map(p=>p.evaluate(()=>JSON.stringify(g))));
      assert(before.every(board=>board===before[0]),'board mismatch');
      await takeTurn(pages[state.turn]);
      await host.waitForFunction(n=>online.count>n,state.n);
      if(turns%32===0)console.log(humans+' human seats',state.n+' moves');
    }
    await Promise.all(pages.map(p=>p.locator('.ranking').first().waitFor()));
    const finals=await Promise.all(pages.map(p=>p.evaluate(()=>({moves:online.count,state:g,
      rows:[...document.querySelectorAll('.ranking')].map(n=>n.innerText.replace(/나|친구 [1-4]|AI [1-4]/,s=>s==='나'?String(mySeat()+1):s.at(-1)))}))));
    for(const result of finals)assert.deepEqual(result,finals[0]);
    assert.equal(finals[0].rows.length,4);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({humans,moves:finals[0].moves,round:finals[0].state.round,rows:finals[0].rows}));
  } finally {await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});

