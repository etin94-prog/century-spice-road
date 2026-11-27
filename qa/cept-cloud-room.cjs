const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createServer}=require('../cept-server.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');

async function main(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cept-cloud-qa-'));
  const server=createServer(dir);
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined});
  try{
    await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
    const publicSite=process.argv.includes('--public');
    const base=publicSite?'https://etin94-prog.github.io/century-spice-road/cept.html?ceptQA=1':
      'http://127.0.0.1:'+server.address().port+'/cept.html?emulator=1';
    const clockMode=process.argv.includes('--clock');
    const cases=clockMode?[[2,'ps2']]:process.argv.includes('--recover-only')?[[4,'ps2']]:process.argv.includes('--begins-only')?[[4,'begins']]:[[2,'saturn'],[3,'dc'],[4,'ps2'],[4,'begins']];
    for(const [humans,edition] of cases){
      const pages=[],errors=[];
      for(let i=0;i<humans;i++){
        const p=await browser.newPage({viewport:i%2?{width:740,height:360}:{width:360,height:740},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
        p.on('pageerror',e=>errors.push(e.message));pages.push(p);
      }
      const host=pages[0];await host.goto(base+'&edition='+edition);
      await host.selectOption('#humans',String(humans));
      if(clockMode)await host.selectOption('#inputLimit','15');
      if(publicSite)await host.selectOption('#roundLimit','20');
      await host.tap('#hostRoom');
      try{await host.locator('#roomWait input').waitFor({timeout:30000});}
      catch(e){throw Error('Room creation: '+await host.locator('#roomHelp').innerText(),{cause:e});}
      const invite=await host.inputValue('#roomWait input'),hostBook=await host.evaluate(()=>chosenBook());
      const custom=humans===4?await host.evaluate(()=>C.presets.fire.slice().reverse()):null;
      if(custom)await pages.at(-1).addInitScript(({deck,key})=>localStorage.setItem(key,JSON.stringify(deck)),{deck:custom,key:'cept-book-v1'+(edition==='begins'?'-begins':'')});
      await Promise.all(pages.slice(1).map(p=>p.goto(invite)));
      if(custom){
        await pages[1].getByRole('button',{name:'이 북으로 참가'}).waitFor();
        const duplicate=await pages[1].evaluate(async()=>{
          const {getAuth}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js');
          const {getDatabase,ref,update}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js');
          const uid=getAuth().currentUser.uid,id=new URL(location.href).searchParams.get('ceptRoom');
          try{await update(ref(getDatabase(),'ceptRooms/'+id),{'seats/s1':uid,'seats/s2':uid});return false;}
          catch(e){return String(e.code||e.message).toLowerCase().includes('permission');}
        });
        assert.equal(duplicate,true);
        if(edition==='begins'){
          const shortBookRejected=await pages[1].evaluate(async()=>{
            const {getAuth}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js');
            const {getDatabase,ref,update}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js');
            const uid=getAuth().currentUser.uid,id=new URL(location.href).searchParams.get('ceptRoom');
            const book=JSON.stringify(C.presets.intro.slice(1));
            try{await update(ref(getDatabase(),'ceptRooms/'+id),{'seats/s1':uid,'openingBooks/s1':book});return false;}
            catch(e){return String(e.code||e.message).toLowerCase().includes('permission');}
          });
          assert.equal(shortBookRejected,true);
        }
      }
      const expectedBooks=new Map();
      await Promise.all(pages.slice(1).map(async(p,i)=>{
        await p.getByRole('button',{name:'이 북으로 참가'}).waitFor();
        const key=custom&&p===pages.at(-1)?'custom':humans===3&&i===1?'host':i%2===0?'intro':'fire';
        await p.locator('#roomWait select').selectOption(key);
        const deck=key==='host'?hostBook:await p.evaluate(k=>openingBook(k),key);
        expectedBooks.set(p,deck);
      }));
      await Promise.all(pages.slice(1).map(p=>p.getByRole('button',{name:'이 북으로 참가'}).tap()));
      try{await Promise.all(pages.map(p=>p.waitForFunction(()=>room?.started)));}
      catch(e){for(const p of pages)console.error(await p.evaluate(()=>[room?.seat,document.getElementById('notice').textContent,document.getElementById('roomWait').innerText]));throw e;}
      const bySeat=[];
      for(const p of pages){
        const seat=await p.evaluate(()=>room.seat);bySeat[seat]=p;
        assert.equal(await p.evaluate(()=>s.players.filter(q=>q.ai).length),4-humans);
        assert.ok(await p.evaluate(()=>s.players.every((q,i)=>!q.book&&(i===room.seat||!q.hand.length))));
      }
      assert.equal(bySeat.filter(Boolean).length,humans);
      const opening=await host.evaluate(async()=>{
        const {getDatabase,ref,get}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js');
        const db=getDatabase(),root='ceptRooms/'+room.id;
        const snapshot=(await get(ref(db,root))).val();
        return {books:JSON.parse(snapshot.state).players.map(q=>q.template),hasOpeningBooks:!!snapshot.openingBooks};
      });
      assert.equal(opening.hasOpeningBooks,false);
      for(let seat=1;seat<humans;seat++)assert.deepEqual(opening.books[seat],expectedBooks.get(bySeat[seat]));
      const spectator=bySeat[1];
      if(edition==='begins'){
        assert.equal(opening.books.every(deck=>deck.length===40),true);
        assert.deepEqual(await spectator.evaluate(()=>s.players.map(p=>p.bookCount)),[34,35,35,35]);
        await spectator.reload();await spectator.waitForFunction(()=>room?.seat===1&&room.started);
        assert.deepEqual(await spectator.evaluate(()=>s.players.map(p=>p.hand.length)),[0,5,0,0]);
        await Promise.all(pages.map(p=>p.context().close()));
        assert.deepEqual(errors,[]);
        console.log('Begins cloud four-seat 40-card opening books and private reconnect OK');
        continue;
      }
      if(clockMode){
        const [revision,deadline]=await spectator.evaluate(()=>[room.revision,s.deadlineAt]);
        assert.ok(deadline>Date.now(),'Clock was armed on the opening decision');
        await spectator.waitForFunction(rev=>room.revision>rev&&s.phase!=='spell',revision,{timeout:25000});
        assert.ok(await host.evaluate(()=>s.deadlineAt>Date.now()));
        await Promise.all(pages.map(p=>p.context().close()));
        assert.deepEqual(errors,[]);
        console.log('Firebase host timed out the opening decision and the guest received the new turn state');
        continue;
      }
      await spectator.locator('#handPanel summary').tap();await spectator.locator('#hand .card').first().tap();
      assert.equal(await spectator.locator('#detail .hand-actions button').count(),1);
      assert.equal(await spectator.locator('#detail .hand-actions button').textContent(),'카드 상세');
      assert.equal(await spectator.locator('#buttons [data-action]').count(),0);
      await host.tap('[data-action=roll]');
      for(let n=0;n<20;n++){
        await host.waitForFunction(()=>!room.busy&&!document.getElementById('game').inert&&s.phase!=='spell'||s.turn!==0);
        if(await host.evaluate(()=>s.turn!==0))break;
        const before=await host.evaluate(()=>room.revision);
        await host.locator('.route-option,[data-action=pass],[data-action=leaveTemple],button[data-action=fortuneDraw]').first().tap();
        await host.waitForFunction(rev=>room.revision>rev,before);
      }
      let guest=bySeat[1];await guest.locator('[data-action=roll]').waitFor();
      await guest.reload();await guest.waitForFunction(()=>room?.seat===1&&room.started);
      // Only the host computes full game state. A valid guest seat has no read access to it.
      const denied=await guest.evaluate(async()=>{
        const {getDatabase,ref,get}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js');
        const db=getDatabase(),base='ceptRooms/'+room.id;
        const canRead=async p=>{try{await get(ref(db,base+p));return true;}catch{return false;}};
        return Promise.all(['/state','/views/s0','/views/s1','/openingBooks/s1'].map(canRead));
      });
      assert.deepEqual(denied,[false,false,true,false]);
      const afterStart=await guest.evaluate(async()=>{
        const {getDatabase,ref,set}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js');
        const target=ref(getDatabase(),'ceptRooms/'+room.id+'/openingBooks/s'+room.seat);
        try{await set(target,JSON.stringify(C.presets.fire));return false;}
        catch(e){return String(e.code||e.message).toLowerCase().includes('permission');}
      });
      assert.equal(afterStart,true);
      const revision=await guest.evaluate(()=>room.revision);
      await host.goto('about:blank');
      await guest.waitForFunction(()=>document.getElementById('roomConnection').textContent.includes('방장 연결 대기'));
      await guest.tap('[data-action=roll]');
      await host.goto(invite);
      await Promise.all(pages.map(p=>p.waitForFunction(rev=>room?.revision>rev,revision)));
      const snapshots=await Promise.all(pages.map(p=>p.evaluate(()=>[room.revision,s.turn,s.phase,s.die,s.players.map(q=>q.cash)])));
      snapshots.forEach(s=>assert.deepEqual(s,snapshots[0]));assert.deepEqual(errors,[]);
      console.log(edition,humans+' humans + '+(4-humans)+' AI: touch, simultaneous join, private hands, queued roll, host/guest restore OK');
      if(humans===4){
        const old=guest;
        const issue=async()=>{
          await host.locator('#matchMenu summary').tap();
          await host.getByRole('button',{name:'좌석 복구',exact:true}).tap();
          await host.locator('#matchInfo select').selectOption('1');
          await host.getByRole('button',{name:'일회용 링크 발급'}).tap();
          const field=host.getByRole('textbox',{name:'일회용 좌석 복구 링크'});
          try{await field.waitFor({timeout:15000});}
          catch(e){throw Error(await host.locator('#matchInfoBody').innerText(),{cause:e});}
          const url=await field.inputValue();
          await host.keyboard.press('Escape');
          return url;
        };
        const forbidden=await old.evaluate(()=>CepterCloudRoom.issueRecovery(room.id,1).then(()=>false,()=>true));
        assert.equal(forbidden,true);
        const before=await host.evaluate(async()=>{
          const {getDatabase,ref,get}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js');
          return (await get(ref(getDatabase(),'ceptRooms/'+room.id+'/state'))).val();
        });
        const expired=await issue();
        await host.evaluate(async()=>{
          const {getDatabase,ref,set}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js');
          await set(ref(getDatabase(),'ceptRooms/'+room.id+'/recoveryTickets/s1/expires'),Date.now()-60000);
        });
        const probe=await browser.newPage({viewport:{width:320,height:568},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
        const denyLink=async url=>{
          await probe.goto('about:blank');
          await probe.goto(url);
          await probe.getByRole('button',{name:'기존 좌석 복구'}).tap();
          await probe.getByText('이 링크는 만료되었거나',{exact:false}).waitFor();
        };
        await denyLink(expired);
        const superseded=await issue(),link=await issue();
        await denyLink(superseded);
        const sameRoomSeat=await bySeat[2].evaluate(async url=>{
          try{await CepterCloudRoom.claimRecovery(room.id,new URLSearchParams(new URL(url).hash.slice(1)).get('recoverSeat'));return false;}
          catch(e){return e.message.includes('다른 좌석');}
        },link);
        assert.equal(sameRoomSeat,true);
        guest=await browser.newPage({viewport:{width:320,height:568},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
        guest.on('pageerror',e=>errors.push(e.message));
        await guest.goto(link);
        await guest.getByRole('button',{name:'기존 좌석 복구'}).tap();
        try{await guest.waitForFunction(()=>room?.started&&room.seat===1,undefined,{timeout:25000});}
        catch(e){throw Error(await guest.locator('#roomWait').innerText(),{cause:e});}
        assert.equal(new URL(guest.url()).hash,'');
        const after=await host.evaluate(async()=>{
          const {getDatabase,ref,get}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js');
          return (await get(ref(getDatabase(),'ceptRooms/'+room.id+'/state'))).val();
        });
        assert.equal(after,before);
        await old.getByText('이 기기의 좌석 연결이 종료되었습니다.',{exact:false}).waitFor();
        assert.equal(await old.locator('#game').isVisible(),false);
        await old.reload();
        await old.getByText('이 기기의 좌석 연결이 종료되었습니다.',{exact:false}).waitFor();
        assert.equal(await old.evaluate(async()=>{
          const {getDatabase,ref,get}=await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js');
          const db=getDatabase(),id=new URL(location.href).searchParams.get('ceptRoom');
          try{await get(ref(db,'ceptRooms/'+id+'/views/s1'));return false;}
          catch(e){return /permission|denied/i.test(e.code||e.message);}
        }),true);
        await denyLink(link);
        await probe.context().close();
        await guest.goto('about:blank');await guest.goto(link);
        await guest.getByRole('button',{name:'기존 좌석 복구'}).tap();
        await guest.waitForFunction(()=>room?.started&&room.seat===1);
        await guest.reload();
        await guest.waitForFunction(()=>room?.started&&room.seat===1);
        bySeat[1]=guest;pages[pages.indexOf(old)]=guest;
        await old.context().close();
        console.log('Four cloud seats: one-time transfer, expiry, replacement, former seat revocation, and preserved match OK');
        let actions=0;
        while(actions++<2500){
          const [phase,actor,rev]=await host.evaluate(()=>[s.phase,C.actor(s),room.revision]);
          if(phase==='over')break;
          const active=bySeat[actor];
          await active.waitForFunction(n=>room.revision===n&&!room.busy,rev,{polling:25});
          await active.evaluate(async()=>{
            const legal=room.choices;
            const proposed=s.phase==='fortune'?legal[0]:C.ai(s);
            const action=legal.find(a=>JSON.stringify(a)===JSON.stringify(proposed))||legal[0];
            await roomAction(action);
          });
          await host.waitForFunction(n=>room.revision>n,rev,{polling:25});
        }
        assert.ok(actions<2500);
        await Promise.all(pages.map(p=>p.waitForFunction(()=>s.phase==='over')));
        const scores=await Promise.all(pages.map(p=>p.evaluate(()=>[room.revision,s.winner,...s.players.map((_,i)=>C.total(s,i))])));
        scores.forEach(score=>assert.deepEqual(score,scores[0]));assert.deepEqual(errors,[]);
        for(const p of [host,guest]){
          assert.equal(await p.evaluate(()=>s.replayAvailable),true);
          await p.getByRole('button',{name:'전체 경기 리플레이'}).tap();
          await p.locator('.replay-screen').waitFor();
        }
        console.log('Four cloud seats completed',actions-1,'more actions; identical winner and scores:',scores[0]);
      }
      await Promise.all(pages.map(p=>p.context().close()));
    }
  }finally{await browser.close();await new Promise(ok=>server.close(ok));fs.rmdirSync(dir);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
