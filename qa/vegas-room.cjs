const assert=require('node:assert/strict');
const {chromium}=require('playwright');
async function run(){
  const browser=await chromium.launch(process.env.CI?{}:{channel:'msedge'});
  try{
    const phones=await Promise.all([667,844].map(width=>browser.newPage({viewport:{width,height:375},hasTouch:true,isMobile:true})));
    const [host,guest]=phones,errors=[];
    for(const p of phones){
      await p.addInitScript(()=>{
        const delay=window.setTimeout;
        window.setTimeout=(fn,ms,...args)=>delay(fn,ms===950||ms===1300?80:ms,...args);
      });
      p.setDefaultTimeout(35000);p.on('pageerror',e=>errors.push(e.message));
    }
    await host.goto(process.env.GAME_URL||'http://127.0.0.1:8088/vegas.html?emulator=1');
    await host.locator('#friend').tap();
    await guest.goto(await host.locator('#invite').inputValue());
    await host.waitForFunction(()=>online.people===2);
    await host.locator('#roomLevel2').selectOption('Easy');
    await host.locator('#roomLevel3').selectOption('Hell');
    await host.locator('#beginTable').tap();
    await Promise.all(phones.map((p,i)=>p.waitForFunction(i=>online?.ready&&online.connected&&online.seat===i,i)));
    assert.deepEqual(await guest.evaluate(()=>g.players.map(p=>p.level)),[null,'친구','Easy','Hell']);
    // Recompute every payout on each phone, including the prefix replayed
    // when the guest reloads. Copy snapshots before the next deal clears them.
    function trackSettlements(){
      window.settlements={};
      const applyStep=apply;
      apply=(state,action)=>{
        const prev=state.board.phase,ok=applyStep(state,action);
        if(ok&&state===g&&prev==='place'&&['settled','over'].includes(state.board.phase)){
          settlements[state.board.round]=structuredClone({casinos:state.board.casinos,bills:state.players.map(p=>p.bills)});
        }
        return ok;
      };
    }
    await Promise.all(phones.map(p=>p.evaluate(trackSettlements)));
    let rejoined=false;
    for(let moves=0;moves<350;moves++){
      await host.waitForFunction(()=>g.over||g.turn<2&&expected(g)!=='pass'&&!online.pending);
      const {turn,n,over}=await host.evaluate(()=>({turn:g.turn,n:online.count,over:g.over}));
      if(over)break;
      await guest.waitForFunction(n=>online.count===n,n);
      const states=await Promise.all(phones.map(p=>p.evaluate(()=>({board:g.board,turn:g.turn}))));
      assert.deepEqual(states[0],states[1]);
      const board=states[0].board;

      if(board.round>=2&&!rejoined){
        const previous=await guest.evaluate(()=>settlements);
        await guest.reload();await guest.waitForFunction(n=>online?.seat===1&&online.connected&&online.count===n,n);
        assert.deepEqual(await guest.evaluate(()=>g.board),board);await guest.evaluate(trackSettlements);await guest.evaluate(past=>Object.assign(settlements,past),previous);rejoined=true;
      }
      const p=phones[turn];
      if(board.phase==='settled')await p.locator('#action').tap();
      else await p.locator('.casino:enabled').first().tap();
      await host.waitForFunction(n=>online.count>n,n);
    }
    await Promise.all(phones.map(p=>p.waitForFunction(()=>g.over)));
    const finals=await Promise.all(phones.map(async p=>{
      await p.locator('#action').tap();
      assert.equal(await p.locator('#body p').count(),4);
      return p.evaluate(()=>({round:g.board.round,board:g.board,ranks:Vegas.ranking(g.board),settlements,
        rows:[...document.querySelectorAll('#body p')].map(e=>e.textContent.replace(/나|친구 [1-4]|AI [1-4]/g,v=>'좌석 '+(v==='나'?online.seat+1:v.at(-1))))}));
    }));
    assert.equal(Object.keys(finals[0].settlements).length,4);assert.equal(finals[0].round,4);assert.deepEqual(finals[0],finals[1]);assert(rejoined);assert.deepEqual(errors,[]);
    console.log('Two mobile seats, Easy/Hell, rejoin, four rounds and final standings OK',finals[0].ranks);
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
