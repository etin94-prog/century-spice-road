// Shared chip wallet against the Firebase emulators:
//   node qa/serve.cjs &
//   firebase emulators:exec --only auth,database --project demo-century "node qa/wallet.cjs"
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.GAME_URL||'http://127.0.0.1:8088/';
const name='칩'+Date.now().toString(36).slice(-6),secret='qa-'+Math.random().toString(36).slice(2,10);

async function phone(browser){
  const context=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto(new URL('blackjack.html?emulator',base).href);
  await page.waitForFunction(()=>typeof Wallet==='object');
  return page;
}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('worldwide-wallet-v1')||'{}'));
const uploaded=page=>page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('worldwide-wallet-v1')||'{}');return s.token&&!s.dirty;});
const refused=(page,call,args)=>page.evaluate(async([call,args])=>{try{await Wallet[call](...args);return '';}catch(error){return error.message;}},[call,args]);

(async()=>{
  const browser=await chromium.launch({channel:process.env.QA_CHANNEL||'chromium'});
  try{
    // A guest's chips move into the new account through the dialog.
    const first=await phone(browser);
    await first.evaluate(()=>Wallet.set(1234));
    await first.tap('[data-wallet-open]');
    await first.fill('#walletName',name);await first.fill('#walletPass',secret);
    await first.tap('#walletForm button[value="register"]');
    await first.waitForFunction(()=>/만들었습니다/.test(document.getElementById('walletNote').textContent));
    assert.equal((await saved(first)).name,name);
    assert(await first.locator('#walletForm').isHidden(),'signed-in dialog hides the form');
    assert(!JSON.stringify(await saved(first)).includes(secret),'password is not stored on the device');
    await first.tap('#walletClose');

    // Winnings at the table reach the server.
    await first.evaluate(()=>Wallet.set(1500));await uploaded(first);
    assert.equal(await first.textContent('#balance'),'1500');

    // A second phone: wrong password, unknown ID and a taken ID are told apart.
    const second=await phone(browser);
    assert.match(await refused(second,'login',[name,secret+'x']),/비밀번호가 다릅니다/);
    assert.match(await refused(second,'login',[name+'x',secret]),/없는 아이디/);
    assert.match(await refused(second,'register',[name,'another-secret']),/이미 있는 아이디/);
    assert.match(await refused(second,'register',['a',secret]),/2~12자/);
    assert.equal((await saved(second)).token||'','', 'failed attempts do not sign in');
    assert.equal(await refused(second,'login',[name.toUpperCase(),secret]),'','ID is not case sensitive');
    await second.waitForFunction(()=>document.getElementById('balance').textContent==='1500');

    // Money changed on the second phone is what the first one sees next time.
    await second.evaluate(()=>Wallet.set(1700));await uploaded(second);
    await first.reload();
    await first.waitForFunction(()=>document.getElementById('balance').textContent==='1700');

    // Both phones stay open. Each uploads what it won or lost, never its whole
    // balance, so the first phone's old 1700 cannot erase the second one's win.
    await second.evaluate(()=>Wallet.set(2000));await uploaded(second);
    assert.equal(await first.evaluate(()=>Wallet.chips),1700);
    await first.evaluate(()=>Wallet.set(Wallet.chips+10));
    await first.waitForFunction(()=>Wallet.chips===2010);await uploaded(first);
    await second.evaluate(()=>Wallet.sync());
    assert.equal(await second.evaluate(()=>Wallet.chips),2010);
    // Two tabs of one phone share the device balance and upload a win once.
    const tab=await first.context().newPage();
    await tab.goto(new URL('card-table.html?game=hula&emulator',base).href);
    await tab.waitForFunction(()=>typeof Wallet==='object'&&Wallet.chips===2010);
    await first.evaluate(()=>Wallet.set(2030));
    await Promise.all([first.evaluate(()=>Wallet.sync()),tab.evaluate(()=>Wallet.sync())]);
    await uploaded(first);await second.evaluate(()=>Wallet.sync());
    assert.equal(await second.evaluate(()=>Wallet.chips),2030);
    await tab.close();

    // No free refill while a stake is on the table.
    await first.evaluate(()=>{Wallet.set(4);document.querySelector('[data-bet="2"]').click();document.querySelector('[data-action="deal"]').click();});
    if(await first.evaluate(()=>!['bet','result'].includes(g.phase))){
      assert.equal(await first.evaluate(()=>Wallet.refill()),await first.evaluate(()=>Wallet.chips),'refill is held during a hand');
      assert(await first.evaluate(()=>Wallet.chips<10));
    }
    await first.evaluate(()=>Wallet.set(2030));await uploaded(first);

    // An upload whose answer was lost (tab closed mid-request) is not counted twice:
    // the wallet already carries its id.
    await first.evaluate(()=>{const s=JSON.parse(localStorage.getItem('worldwide-wallet-v1'));s.pending={id:'0123456789abcdef',chips:s.chips+40,base:s.base};s.chips+=40;localStorage.setItem('worldwide-wallet-v1',JSON.stringify(s));});
    await first.reload();await first.evaluate(()=>Wallet.ready);await uploaded(first);
    assert.equal(await first.evaluate(()=>Wallet.chips),2070);
    await first.evaluate(()=>{const s=JSON.parse(localStorage.getItem('worldwide-wallet-v1'));s.pending={id:'0123456789abcdef',chips:s.chips,base:s.chips-40};s.base-=40;localStorage.setItem('worldwide-wallet-v1',JSON.stringify(s));});
    await first.reload();await first.evaluate(()=>Wallet.ready);await uploaded(first);
    assert.equal(await first.evaluate(()=>Wallet.chips),2070,'a replayed upload id is applied once');

    // A hand in play on one page holds the refill on the lobby too, and releases it
    // when the hand is over.
    const lobby=await first.context().newPage();
    await lobby.goto(new URL('index.html?emulator#worldwide',base).href);
    await lobby.waitForFunction(()=>typeof Wallet==='object');
    // Tabs of one browser share localStorage, which is not atomic across tabs, so
    // let the lobby's first sync finish before this tab settles a hand.
    await lobby.evaluate(()=>Wallet.ready);
    const bet=await first.evaluate(()=>{
      while(!['bet','result'].includes(g.phase)){if(g.phase==='insurance')Blackjack.play(g,'decline');else if(g.phase==='play')Blackjack.play(g,'stand');else Blackjack.dealerStep(g);}
      draw(true);document.querySelector('[data-action="next"]')?.click();
      document.querySelector('[data-action="deal"]').click();return g.phase;
    });
    if(!['bet','result'].includes(bet)){
      await lobby.waitForFunction(()=>Wallet.held);
      await first.evaluate(()=>{while(!['bet','result'].includes(g.phase)){if(g.phase==='insurance')Blackjack.play(g,'decline');else if(g.phase==='play')Blackjack.play(g,'stand');else Blackjack.dealerStep(g);}draw(true);});
      await lobby.waitForFunction(()=>!Wallet.held);
    }
    await lobby.close();
    await first.evaluate(()=>{document.querySelector('[data-action="next"]')?.click();Wallet.set(2070);});await uploaded(first);
    // Another device's upload in between does not make a retried upload count twice.
    await second.evaluate(()=>Wallet.sync());
    await first.evaluate(()=>{const s=JSON.parse(localStorage.getItem('worldwide-wallet-v1'));s.pending={id:'a1b2c3d4e5f60718',chips:s.chips+30,base:s.chips};s.chips+=30;localStorage.setItem('worldwide-wallet-v1',JSON.stringify(s));});
    await first.reload();await first.evaluate(()=>Wallet.ready);await uploaded(first);
    await second.evaluate(()=>Wallet.set(Wallet.chips+5));await uploaded(second);
    await first.evaluate(()=>{const s=JSON.parse(localStorage.getItem('worldwide-wallet-v1'));s.pending={id:'a1b2c3d4e5f60718',chips:s.chips,base:s.chips-30};s.base-=30;localStorage.setItem('worldwide-wallet-v1',JSON.stringify(s));});
    await first.reload();await first.evaluate(()=>Wallet.ready);await uploaded(first);
    assert.equal(await first.evaluate(()=>Wallet.chips),2105,'retried upload after another device wrote');
    await first.evaluate(()=>Wallet.set(2070));await uploaded(first);

    // A second tab of the same table follows the saved hand instead of replaying
    // its own stale copy.
    const twin=await first.context().newPage();
    await twin.goto(new URL('blackjack.html?emulator',base).href);
    await twin.waitForFunction(()=>typeof g==='object');
    const hands=await first.evaluate(()=>{
      while(!['bet','result'].includes(g.phase)){if(g.phase==='insurance')Blackjack.play(g,'decline');else if(g.phase==='play')Blackjack.play(g,'stand');else Blackjack.dealerStep(g);}
      draw(true);document.querySelector('[data-action="next"]')?.click();
      document.querySelector('[data-action="deal"]').click();return JSON.stringify(g.hands);
    });
    await twin.waitForFunction(h=>typeof g==='object'&&JSON.stringify(g.hands)===h,hands);
    await twin.close();
    await first.evaluate(()=>{while(!['bet','result'].includes(g.phase)){if(g.phase==='insurance')Blackjack.play(g,'decline');else if(g.phase==='play')Blackjack.play(g,'stand');else Blackjack.dealerStep(g);}draw(true);Wallet.set(2070);});
    await uploaded(first);

    // Logging out leaves the chips with the account and returns the guest balance
    // the device had before, so they cannot be copied into a new ID.
    await second.evaluate(()=>Wallet.sync());
    await second.evaluate(()=>Wallet.logout());
    assert.equal(await second.evaluate(()=>Wallet.chips),1000);
    await second.evaluate(()=>Wallet.set(5));
    await first.reload();await first.evaluate(()=>Wallet.ready);
    assert.equal(await first.evaluate(()=>Wallet.chips),2070);

    // The database refuses anyone who is not signed in, and never lists wallets.
    const token=(await saved(first)).token,host='http://127.0.0.1:9000/',ns='?ns=demo-century-default-rtdb';
    for(const path of ['wallets/'+token,'wallets','walletNames']){
      const response=await fetch(host+path+'.json'+ns);
      assert.equal(response.status,401,path+' is closed to anonymous REST');
    }
    console.log('Wallet account: register, login on a second phone, merged winnings from two phones and two tabs, held refill, logout and closed rules OK');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
