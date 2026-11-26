const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',request=>request.abort());
    await page.clock.install();
    await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/cept.html')).href);
    const chapters=page.locator('#campaignPanel article button');
    assert.equal(await chapters.count(),5);
    assert.ok(await chapters.nth(1).isDisabled());
    await page.selectOption('#inputLimit','15');
    await chapters.first().tap();
    await page.locator('.input-clock').waitFor();
    assert.match(await page.locator('.input-clock').innerText(),/입력 1[45]초/);
    await page.clock.fastForward(15300);
    assert.deepEqual(await page.evaluate(()=>s.replay.steps.map(f=>[f.action,f.timeout])),[['roll',true]]);
    for(let i=0;i<5;i++){
      await page.evaluate(()=>{
        cancelMapEffect();stopWalk();clearTimeout(timer);
        const p=s.players[0];s.turn=0;s.phase='fork';s.remaining=1;
        p.pos=C.board(s).links[0][0];p.previous=null;p.cash=s.target;delete s.deadlineAt;
        act(['route',0]);
      });
      await page.waitForFunction(expected=>campaignProgress===expected,i+1);
      if(i===0){
        await page.getByRole('button',{name:'전체 경기 리플레이'}).tap();
        const replay=page.locator('.replay-screen');
        await replay.getByRole('button',{name:'다음',exact:true}).tap();
        assert.match(await replay.locator('p').first().innerText(),/시간 초과/);
        await replay.getByRole('button',{name:'다음',exact:true}).tap();
        assert.ok(await replay.locator('.replay-tile.on-route').count()>0);
        const downloaded=page.waitForEvent('download');
        await replay.getByRole('button',{name:'파일 저장',exact:true}).tap();
        assert.equal((await downloaded).suggestedFilename(),'cept-replay-classic.json');
        await replay.getByRole('button',{name:'닫기',exact:true}).tap();
      }
      if(i<4)await page.getByRole('button',{name:'다음 장',exact:true}).tap();
    }
    assert.match(await page.locator('.campaign-notice').innerText(),/캠페인 완료/);
    const saved=await page.evaluate(()=>JSON.stringify(s.replay));
    await page.reload();
    assert.equal(await page.locator('#campaignMaps option').count(),3);
    assert.match(await page.locator('#campaignPanel').innerText(),/모든 장 완료/);
    await page.locator('#replayLobby input').setInputFiles({name:'replay.json',mimeType:'application/json',buffer:Buffer.from(saved)});
    assert.match(await page.locator('.replay-screen h2').innerText(),/등불 군도/);
    assert.deepEqual(errors,[]);
    console.log('Campaign lock and all five chapter completions, timeout and replay download/import on mobile OK');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
