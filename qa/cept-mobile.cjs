const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined});
  try{
    for(const [edition,width,height] of [['ps2',320,568],['ps2',360,740],['saturn',390,844],['dc',844,390],['ps1',740,360]]){
      const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('https://**',r=>r.abort());
      const url=pathToFileURL(path.resolve(__dirname,'../dist/cept.html'));
      url.searchParams.set('edition',edition);await page.goto(url.href);
      await page.locator('#editor summary').tap();
      await page.waitForFunction(()=>document.querySelectorAll('.catalog-entry').length===24);
      await page.tap('#nextCards');assert.match(await page.locator('#cardResults').innerText(),/25–48/);
      await page.selectOption('#cardScope','deck');assert.ok(await page.locator('.catalog-entry').count()>0);
      let holyWord;
      if(edition==='ps2'&&width===320){
        holyWord=await page.evaluate(()=>{
          const id=C.cards.findIndex(c=>!c.catalogOnly&&c.effect==='word1');
          return {id,name:C.cards[id].name};
        });
        await page.selectOption('#cardScope','usable');
        await page.locator('#cardSearch').fill(holyWord.name);
        await page.locator('.catalog-open').filter({hasText:holyWord.name}).tap();
        const ability=page.locator('#catalogAbility');
        assert.match(await ability.innerText(),/고정값은 1입니다/);
        holyWord.text=await ability.evaluate(p=>p.firstChild.textContent.trim());
        await page.locator('#closeCard').tap();
      }
      await page.locator('#editor summary').tap();
      await page.locator('#config .match-start .primary').tap();
      if(holyWord){
        const opening=await page.evaluate(id=>{
          const p=s.players[0],previous={hand:p.hand,cash:p.cash};
          p.hand=[id,C.cards.findIndex(c=>c.effect==='word6')];
          p.cash=Math.max(p.cash,200);render();return previous;
        },holyWord.id);
        await page.locator('#seats .seat').first().tap();
        await page.locator('#hand .card').first().tap();
        assert.equal(await page.locator('#detail > span').first().innerText(),holyWord.text);
        await page.locator('#map .pawn-action').tap();
        await page.locator('[data-open=cast]').tap();
        const spellChoice=page.locator('#turnPicker');
        await spellChoice.locator('.turn-picker-card').first().tap();
        assert.equal(await spellChoice.locator('.turn-picker-detail > span').first().innerText(),holyWord.text);
        await spellChoice.getByRole('button',{name:'닫기',exact:true}).tap();
        await spellChoice.waitFor({state:'detached'});
        await page.evaluate(previous=>{
          Object.assign(s.players[0],previous);
          focusCard=-1;render();setActionMenu(false);
        },opening);
      }
      const soundButton=page.locator('#openSound'),sound=page.locator('#musicPanel');
      assert.ok((await soundButton.boundingBox()).width>=44);
      await soundButton.tap();
      assert.ok(await sound.isVisible());
      for(const slider of await sound.locator('input[type=range]').all())assert.ok((await slider.boundingBox()).height>=44);
      await page.waitForFunction(()=>audio.currentTime>0&&!audio.paused&&/cept-field-[1-3]\.mp3$/.test(audio.src));
      await page.evaluate(()=>{
        const play=playEffect,create=soundContext.createOscillator.bind(soundContext);
        window.testEffectCues=[];
        window.testEffectStarts=0;
        playEffect=name=>{window.testEffectCues.push(name);play(name);};
        soundContext.createOscillator=()=>{
          const oscillator=create(),start=oscillator.start.bind(oscillator);
          oscillator.start=when=>{start(when);window.testEffectStarts++;};
          return oscillator;
        };
      });
      const effectsSwitch=sound.locator('#effectsOn');
      await effectsSwitch.tap();
      assert.equal(await page.evaluate(()=>effectBus.gain.value),0);
      await effectsSwitch.tap();
      await page.waitForFunction(()=>window.testEffectCues.includes('card')&&window.testEffectStarts>0);
      assert.ok(await effectsSwitch.isChecked());
      assert.ok(await page.evaluate(()=>effectBus.gain.value>0));
      const effectSlider=await sound.locator('#effectVolume').boundingBox();
      await page.touchscreen.tap(effectSlider.x+effectSlider.width*.3,effectSlider.y+effectSlider.height/2);
      const volume=await page.evaluate(()=>({
        input:Number($('effectVolume').value),gain:effectBus.gain.value,
        saved:JSON.parse(localStorage.getItem(audioKey)).effectVolume
      }));
      assert.ok(volume.input>10&&volume.input<45);
      assert.ok(Math.abs(volume.gain-volume.input/100)<.001);
      assert.equal(volume.saved,volume.input);
      await sound.getByText('배경음악',{exact:true}).tap();
      assert.equal(await page.evaluate(()=>audio.paused&&audio.muted),true);
      await sound.getByText('배경음악',{exact:true}).tap();
      await page.waitForFunction(()=>audio.currentTime>0&&!audio.paused);
      await sound.getByRole('button',{name:'닫기'}).tap();
      assert.equal(await sound.isVisible(),false);
      await page.locator('#seats .seat').first().tap();
      assert.ok(await page.locator('#handPanel').evaluate(panel=>panel.open));
      await page.locator('#handSeatInfo').tap();
      assert.match(await page.locator('#seatStats').innerText(),/이번 주회 남은 요새/);
      await page.locator('#seatDialog button').tap();
      await page.locator('#seats .seat').first().tap();
      assert.equal(await page.locator('#handPanel').evaluate(panel=>panel.open),false);
      const hand=page.locator('#handPanel summary');
      const metrics=await page.evaluate(()=>({
        hand:document.querySelector('#handPanel summary').getBoundingClientRect().bottom,
        roll:document.querySelector('[data-action=roll]').getBoundingClientRect().bottom,
        width:document.documentElement.scrollWidth
      }));
      assert.ok(metrics.width<=width,edition+' overflow '+JSON.stringify(metrics));
      assert.ok(metrics.hand<=height&&metrics.roll<=height,edition+' controls '+JSON.stringify(metrics));
      await page.setViewportSize({width:height,height:width});
      await page.waitForFunction(()=>document.querySelector('#mapViewport').getBoundingClientRect().height>0);
      const rotated=await page.locator('[data-action=roll]').boundingBox();
      assert.ok(rotated.y+rotated.height<=width,edition+' rotated controls');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.setViewportSize({width,height});
      await hand.tap();
      await page.locator('#mapRoll').tap({trial:true});
      await page.locator('#hand .card').last().tap();await page.getByRole('button',{name:'카드 상세',exact:true}).tap();
      assert.ok(await page.locator('#cardDialog').isVisible());await page.click('#closeCard');await hand.tap();
      await page.tap('#mapViews summary');await page.tap('#mapViews [data-zoom="2.8"]');
      await page.tap('#mapViews summary');await page.tap('#mapHome');
      await page.evaluate(()=>{s.players[0].word=1;});
      // The character rolls at once when rolling is the only choice; otherwise it opens its action menu.
      const onlyRoll=await page.evaluate(()=>C.choices(s).length===1);
      await page.locator('#map .pawn-action').tap();
      if(!onlyRoll){
        assert.equal(await page.locator('#matchActionsToggle').getAttribute('aria-expanded'),'true');
        assert.ok(await page.locator('#buttons [data-action],#buttons [data-open]').first().isVisible());
        await page.locator('#mapRoll').tap();
      }
      await page.locator('.route-option').first().waitFor();
      const at=await page.evaluate(()=>C.routePreview(s,C.choices(s)[0]).at);
      await page.locator(edition==='ps2'?'.route-arrow':'.route-option').first().tap();await page.waitForFunction(expected=>s.players[0].pos===expected,at);
      await page.locator('#game:not([inert])').waitFor();
      assert.ok(await page.evaluate(()=>window.testEffectCues.includes('roll')));
      const expected=await page.evaluate(()=>{
        const p=s.players[0],map=C.board(s);
        const at=s.tiles.findIndex(t=>typeof t.type==='number'),tile=s.tiles[at];
        const id=C.presets.fire.find(id=>C.cards[id].kind==='creature');
        Object.assign(tile,{owner:0,unit:{id,hp:C.cards[id].hp},level:1});
        p.pos=at;p.cash=3000;s.visited=[at];s.turn=0;s.phase='land';s.battle=null;pending=false;render();
        const choice=C.choices(s).filter(a=>a[0]==='level').at(-1);
        return {cost:C.levelCost(tile,choice[2]),tile:at,level:choice[2]};
      });
      await page.locator('[data-open=level]').tap();
      const levels=page.locator('#turnPicker');
      await levels.locator('.turn-picker-cards button').last().tap();
      assert.ok((await levels.locator('.turn-picker-detail').innerText()).includes('잔액 '+(3000-expected.cost)+'G'));
      await levels.locator('.primary').tap();
      assert.equal(await page.evaluate(at=>s.tiles[at].level,expected.tile),expected.level);
      if(edition==='ps2'){
        await page.evaluate(()=>{
          cancelMapEffect();stopWalk();clearTimeout(timer);
          s=C.start(4,4,5000,'ps2-35');pending=false;
          Object.assign(s.players[0],{pos:C.board(s).links[17][0],previous:null,cash:25,hand:[]});
          s.phase='fork';s.remaining=1;C.play(s,['route',17]);seenMove=s.lastMove.sequence;render();
        });
        await page.locator('[data-open=buyCard]').tap();
        const shelf=page.locator('#turnPicker .turn-picker-cards button'),buy=page.locator('#turnPicker > .primary');
        assert.equal(await shelf.count(),4);
        await shelf.nth(1).tap();assert.equal(await buy.isDisabled(),true);
        assert.match(await buy.innerText(),/35G 부족/);
        await shelf.nth(3).tap();assert.equal(await buy.isDisabled(),false);
        assert.match(await buy.innerText(),/25G에 구매 · 잔액 0G/);
        assert.ok((await buy.boundingBox()).height>=44);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await buy.tap();
        assert.deepEqual(await page.evaluate(()=>[s.turn,s.players[0].cash,s.players[0].hand.map(id=>C.combo.key(C.cards[id]))]),[1,0,['watershield']]);
        await page.evaluate(()=>{
          cancelMapEffect();stopWalk();clearTimeout(timer);
          s=C.start(4,4,5000,'ps2-1',C.presets.fire,C.presets.fire,0,'teams');pending=false;
          const id=C.cards.findIndex(c=>C.combo.key(c)==='goblin');
          for(let i=0;i<4;i++)Object.assign(s.tiles[i+1],{owner:i,unit:{id,hp:20}});
          s.players[0].hand=[C.cards.findIndex(c=>c.effect==='bolt')];render();
        });
        await page.locator('#matchActionsToggle').tap();
        await page.tap('button[data-action=cast]');
        const options=page.locator('button[data-action=targetLand]');
        await options.first().waitFor();assert.equal(await options.count(),2);
        assert.match(await options.nth(1).innerText(),/적 영지.*셉터 4.*HP 20\/30 → 0.*격파/);
        assert.ok((await options.nth(1).boundingBox()).height>=44);
        await options.nth(1).tap();
        assert.equal(await page.evaluate(()=>s.tiles[4].unit),null);
        const wanted=await page.evaluate(()=>{
          cancelMapEffect();stopWalk();clearTimeout(timer);
          s=C.start(2,2,5000,'ps2-1');pending=false;
          const find=n=>C.cards.findIndex(c=>C.combo.key(c)===n),p=s.players[0];
          p.hand=[find('foresight')];p.book=['goblin','skeleton','fate','manna','banshee','holygrail'].map(find);
          render();return find('fate');
        });
        await page.locator('#matchActionsToggle').tap();
        await page.tap('button[data-action=cast]');
        const draw=page.locator('[data-open=foresightCard]');
        await draw.waitFor();await draw.tap();
        const picker=page.locator('#turnPicker');
        assert.equal(await picker.locator('.turn-picker-card .card-face').count(),6);
        await picker.locator('.turn-picker-card').nth(3).tap();
        await picker.getByRole('button',{name:'북에서 가져올 카드 확정'}).tap();
        assert.deepEqual(await page.evaluate(()=>[s.phase,s.players[0].hand,s.players[0].book.length]),['roll',[wanted],5]);
      }
      await page.evaluate(()=>{
        cancelMapEffect();stopWalk();clearTimeout(timer);
        const game=C.start(2,2,4000,C.edition==='ps2'?'ps2-1':C.edition+'-1',C.presets.fire);
        const at=game.tiles.findIndex(t=>t.type===0),inv=C.presets.fire.find(id=>C.cards[id].kind==='creature');
        const guard=C.presets.fire.find(id=>C.cards[id].kind==='creature'&&C.cards[id].element===0);
        Object.assign(game.tiles[at],{owner:1,level:2,unit:{id:guard,hp:C.cards[guard].hp}});
        game.players[0].pos=at;game.battle={at,inv,atkItem:null,defItem:null};game.phase='attack';
        s=game;pending=false;render();
      });
      assert.match(await page.locator('.battle-caption').innerText(),/지형 HP \+20/);
      await page.waitForFunction(()=>audio.currentTime>0&&!audio.paused&&/cept-battle-[1-3]\.mp3$/.test(audio.src));
      await page.locator('[data-action=bare]').tap();
      await page.getByRole('button',{name:'내 차례 확인'}).tap();
      await page.locator('[data-action=bare]').tap();await page.locator('.battle-log summary').tap();
      assert.match(await page.locator('.battle-outcome').innerText(),/수비 성공|침략 승리|양측 격파|영지 비움/);
      assert.ok(await page.locator('.battle-log ol li').count()>0);
      assert.ok(await page.evaluate(()=>window.testEffectCues.some(name=>/^battle(Win|Loss|Draw)$/.test(name))));
      if(edition==='ps2'&&width===320){
        await page.setViewportSize({width:844,height:390});
        await page.evaluate(()=>{
          cancelMapEffect();stopWalk();clearTimeout(timer);
          s=C.start(4,4,5000,'ps2-1');pending=false;
          const p=s.players[0],find=n=>C.cards.findIndex(c=>C.combo.key(c)===n);
          const lands=s.tiles.flatMap((t,i)=>typeof t.type==='number'?[i]:[]).slice(0,4);
          lands.forEach((at,i)=>{s.tiles[at].owner=i===3?1:0;s.tiles[at].unit={id:find('goblin'),hp:30};});
          p.pos=lands[3];p.cash=3000;p.hand=['goblin','fighter','knight'].map(find);
          s.phase='land';s.visited=lands;render();
        });
        const layout=await page.evaluate(()=>{
          const elements=[...document.querySelectorAll('#buttons button,#buttons select')];
          const boxes=elements.filter(e=>!e.hidden).map(e=>e.getBoundingClientRect());
          return {controls:boxes.length,overlap:boxes.some((a,i)=>boxes.slice(i+1).some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)),
            overflow:document.documentElement.scrollWidth>innerWidth};
        });
        assert.ok(layout.controls>=4);assert.equal(layout.overlap,false);assert.equal(layout.overflow,false);
        // The action menu opens beside the cepter without covering it. Nothing is a drop-down; long lists open a sheet.
        const menu=await page.evaluate(()=>{
          const box=e=>e.getBoundingClientRect(),panel=box(document.querySelector('.match-actions')),pawn=box(document.querySelector('#map .pawn-action'));
          return {selects:document.querySelectorAll('#buttons select').length,openers:document.querySelectorAll('#buttons [data-open]').length,
            covered:pawn.left<panel.right&&pawn.right>panel.left&&pawn.top<panel.bottom&&pawn.bottom>panel.top,
            inside:panel.left>=0&&panel.right<=innerWidth&&panel.top>=0&&panel.bottom<=innerHeight};
        });
        assert.equal(menu.selects,0);assert.ok(menu.openers>=2,JSON.stringify(menu));
        assert.equal(menu.covered,false,JSON.stringify(menu));assert.equal(menu.inside,true,JSON.stringify(menu));
        await page.locator('#map .pawn-action').tap();
        assert.equal(await page.locator('#buttons').isVisible(),false);
        await page.locator('#map .pawn-action').tap();
        await page.locator('[data-open=invade]').tap();
        const sheet=page.locator('#turnPicker');
        await sheet.locator('.turn-picker-card').first().tap();
        const confirm=await sheet.locator('.primary').boundingBox();
        assert.ok(confirm.y>=0&&confirm.y+confirm.height<=390,'choice sheet confirm '+JSON.stringify(confirm));
        assert.match(await sheet.locator('.turn-picker-detail').innerText(),/통행료/);
        await page.touchscreen.tap(422,20);
        await sheet.waitFor({state:'detached'});
        // A hand card opens a bubble above itself with the actions for that card.
        await page.locator('#seats .seat').first().tap();
        await page.locator('#hand .card').first().tap();
        const bubble=page.locator('#detail.card-popup');
        assert.ok(await bubble.getByRole('button',{name:'영지 침략',exact:true}).isVisible());
        assert.ok(await page.evaluate(()=>{
          const box=document.querySelector('#detail').getBoundingClientRect(),tray=document.querySelector('#handPanel').getBoundingClientRect();
          return box.top>=0&&box.bottom<=tray.top&&box.left>=0&&box.right<=innerWidth;
        }),'card bubble sits above the tray');
        await page.touchscreen.tap(30,150);
        await page.waitForFunction(()=>!document.querySelector('#detail').childElementCount);
        await page.locator('#seats .seat').first().tap();
        assert.equal(await page.locator('#handPanel').evaluate(panel=>panel.open),false);
        const tracks=await page.evaluate(()=>{
          const first=currentTrack;
          audio.dispatchEvent(new Event('ended'));return [first,currentTrack,audio.loop];
        });
        assert.notEqual(tracks[0],tracks[1]);assert.equal(tracks[2],false);
      }
      assert.deepEqual(errors,[]);
      console.log(edition,width+'x'+height,'hand / roll bottom',Math.round(metrics.hand),Math.round(metrics.roll));
      await page.close();
    }
    const gateUrl=pathToFileURL(path.resolve(__dirname,'../dist/cept.html'));
    gateUrl.searchParams.set('edition','revolt');
    for(const [width,height] of [[320,568],[375,812],[844,390]]){
      const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
      await page.route('https://**',r=>r.abort());
      await page.goto(gateUrl.href);
      await page.selectOption('#mapChoice','revolt-1');
      await page.locator('#config .match-start .primary').tap();
      await page.evaluate(()=>{
        const player=s.players[0];
        player.hand=[C.cards.findIndex(c=>c.effect==='remission')];
        player.cash=500;
        render();
      });
      const cast=page.locator('#buttons [data-action=cast]');
      if(!await cast.isVisible())await page.locator('#matchActionsToggle').tap();
      await cast.tap();
      await page.getByRole('button',{name:/^6번 북쪽 게이트/}).tap();
      await page.locator('#center button.primary').tap();
      assert.deepEqual(await page.evaluate(()=>s.players[0].flags),[5]);
      assert.equal(await page.locator('#mapViewport').evaluate(el=>el.classList.contains('pannable')),true);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      console.log('revolt',width+'x'+height,'gate tap and camera restoration OK');
      await page.close();
    }
    const beginsUrl=pathToFileURL(path.resolve(__dirname,'../dist/cept.html'));
    beginsUrl.searchParams.set('edition','begins');
    for(const [width,height] of [[320,568],[844,390]]){
      const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('https://**',r=>r.abort());
      await page.goto(beginsUrl.href);
      const tower=await page.evaluate(()=>{
        const id=C.cards.findIndex(c=>!c.catalogOnly&&C.combo.key(c)==='towershield');
        return {id,name:C.cards[id].name};
      });
      await page.locator('#editor summary').tap();
      await page.selectOption('#cardScope','usable');
      await page.locator('#cardSearch').fill(tower.name);
      await page.locator('.catalog-open').getByText(tower.name,{exact:true}).tap();
      const summary=await page.locator('#catalogAbility').evaluate(p=>p.firstChild.textContent);
      assert.match(summary,/일반 공격과 두루마리 피해를 절반/);
      await page.locator('#closeCard').tap();
      await page.locator('#editor summary').tap();
      await page.locator('#config .match-start .primary').tap();
      await page.evaluate(defense=>{
        const id=name=>C.cards.findIndex(c=>!c.catalogOnly&&C.combo.key(c)===name);
        const at=1,unit=id('fighter'),enemy=id('goblin');
        s=C.start(2,2,5000,'begins-1');pending=false;
        Object.assign(s.tiles[at],{owner:0,type:'무속성',unit:{id:unit,hp:C.cards[unit].hp}});
        s.turn=1;s.players[1].pos=at;s.players[0].cash=1000;
        s.players[0].hand=[defense,id('magicshield')];
        s.phase='defend';s.battle={at,inv:enemy,atkItem:id('nuclearfusion'),defItem:null};
        render();
      },tower.id);
      await page.locator('[data-open=equip]').tap();
      const picker=page.locator('#turnPicker');
      await picker.locator('.turn-picker-card').filter({hasText:tower.name}).tap();
      assert.equal(await picker.locator('.turn-picker-detail > span').first().innerText(),summary);
      const confirm=await picker.locator('.primary').boundingBox();
      assert.ok(confirm.y>=0&&confirm.y+confirm.height<=height);
      await picker.locator('.primary').tap();
      await page.waitForFunction(()=>s.phase==='result');
      assert.equal(await page.evaluate(()=>s.battle.startHP[1]-s.battle.strikes[0].hp[1]),25);
      assert.deepEqual(errors,[]);
      console.log('begins',width+'x'+height,'Korean armor and scroll damage from mobile battle OK');
      await page.close();
    }
    for(const [width,height] of [[320,568],[375,812],[844,390]]){
      const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('https://**',r=>r.abort());
      await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/cept.html')).href);
      await page.locator('#config .match-start .primary').tap();
      const temple=()=>page.evaluate(()=>{
        s=C.start(2,2,5000,'market');pending=false;
        const p=s.players[0];p.pos=s.tiles.findIndex(t=>t.type==='신전');
        p.cash=75;p.symbols[2]=4;s.prices[2]=12;s.prices[5]=23;
        s.phase='temple';s.remaining=0;render();
      });
      const trades=page.locator('#turnPicker'),confirm=trades.locator(':scope > .primary');
      await temple();
      assert.equal(await page.locator('#buttons select').count(),0);
      await page.locator('[data-open=buySymbol]').tap();
      await trades.getByRole('button',{name:/동부 수/}).tap();
      assert.equal(await trades.locator('.symbol-count').innerText(),'1장');
      await trades.getByRole('button',{name:'수량 1장 늘리기'}).tap();
      assert.equal(await trades.locator('.symbol-amount').innerText(),'지불 46G');
      assert.equal(await trades.locator('.symbol-result').innerText(),'거래 후 마력 29G · 보유 2장');
      await trades.getByRole('button',{name:'최대 수량 선택'}).tap();
      assert.equal(await trades.locator('.symbol-count').innerText(),'3장');
      assert.equal(await trades.getByRole('button',{name:'수량 1장 늘리기'}).isDisabled(),true);
      const touch=await trades.evaluate(dialog=>[...dialog.querySelectorAll('button')].map(b=>b.getBoundingClientRect()).every(r=>r.width>=44&&r.height>=44));
      assert.equal(touch,true);
      const bounds=await confirm.boundingBox();
      assert.ok(bounds.y>=0&&bounds.y+bounds.height<=height);
      await page.keyboard.press('Escape');await trades.waitFor({state:'detached'});
      assert.deepEqual(await page.evaluate(()=>[s.players[0].cash,s.players[0].symbols[5]]),[75,0]);
      const opener=page.locator('[data-open=buySymbol]');
      assert.equal(await opener.evaluate(b=>b===document.activeElement),true);
      await opener.tap();await trades.getByRole('button',{name:/동부 수/}).tap();
      await trades.getByRole('button',{name:'최대 수량 선택'}).tap();
      await confirm.tap();
      assert.deepEqual(await page.evaluate(()=>[s.phase,s.players[0].cash,s.players[0].symbols[5]]),['land',6,3]);
      await temple();await page.locator('[data-open=sellSymbol]').tap();
      await trades.getByRole('button',{name:'수량 1장 늘리기'}).tap();
      assert.equal(await trades.locator('.symbol-amount').innerText(),'수령 24G');
      await confirm.tap();
      assert.deepEqual(await page.evaluate(()=>[s.players[0].cash,s.players[0].symbols[2]]),[99,2]);
      await page.evaluate(()=>{
        s.phase='sell';s.debtor=0;s.debtResume='land';
        s.players[0].cash=-25;s.players[0].symbols[2]=4;s.prices[2]=10;render();
      });
      await page.locator('[data-open=liquidate]').tap();
      await trades.getByRole('button',{name:'최대 수량 선택'}).tap();
      assert.equal(await trades.locator('.symbol-result').innerText(),'거래 후 마력 5G · 보유 1장');
      await confirm.tap();
      assert.deepEqual(await page.evaluate(()=>[s.phase,s.players[0].cash,s.players[0].symbols[2]]),['land',5,1]);
      await temple();
      await page.locator('[data-open=buySymbol]').tap();
      await page.evaluate(()=>{s.phase='land';});
      await confirm.tap();
      await trades.waitFor({state:'detached'});
      assert.equal(await page.evaluate(()=>s.players[0].cash),75);
      assert.deepEqual(errors,[]);
      console.log('ps2 '+width+'x'+height+': mobile symbol buy, sell, debt liquidation, focus and stale confirmation OK');
      await page.close();
    }
    const sagaPage=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    const sagaUrl=pathToFileURL(path.resolve(__dirname,'../dist/cept.html'));
    sagaUrl.searchParams.set('edition','saga');
    await sagaPage.route('https://**',r=>r.abort());
    await sagaPage.goto(sagaUrl.href);
    await sagaPage.selectOption('#mapChoice','saga-original-crosswind');
    assert.match(await sagaPage.locator('#stagePreview figcaption').innerText(),/32칸 · 2지역 · 요새 3곳/);
    await sagaPage.locator('#config .match-start .primary').tap();
    assert.equal(await sagaPage.locator('#map .tile').count(),32);
    await sagaPage.locator('#mapViews summary').tap();
    await sagaPage.locator('#mapViews [data-zoom="1"]').tap();
    await sagaPage.getByRole('button',{name:/^8번 강제 전송진/}).tap();
    assert.match(await sagaPage.locator('#center').innerText(),/1지역.*강제 전송진.*통과하거나 멈추면 19번으로 이동/s);
    await sagaPage.evaluate(()=>{
      s.phase='fork';s.remaining=2;s.visited=[];
      Object.assign(s.players[0],{pos:6,previous:5});inspect=-1;render();
    });
    await sagaPage.locator('.route-option').filter({hasText:'8번 방향'}).tap();
    assert.deepEqual(await sagaPage.evaluate(()=>[s.players[0].pos,s.remaining,s.phase]),[18,1,'fork']);
    await sagaPage.locator('#game:not([inert])').waitFor();
    await sagaPage.evaluate(()=>{
      s=C.start(2,2,5000,'saga-original-crosswind');pending=false;inspect=-1;
      const p=s.players[0];p.pos=1;p.cash=1000;
      p.hand=[C.cards.findIndex(c=>!c.unlisted&&C.combo.key(c)==='minotaur')];
      s.phase='land';render();
    });
    const summon=sagaPage.locator('#buttons [data-action=summon]');
    assert.match(await summon.innerText(),/모프 → 화/);
    await summon.tap();
    assert.equal(await sagaPage.evaluate(()=>s.tiles[1].type),0);
    await sagaPage.evaluate(()=>{
      s=C.start(2,2,5000,'saga-original-crosswind');pending=false;inspect=-1;
      const id=name=>C.cards.findIndex(c=>!c.unlisted&&C.combo.key(c)===name),p=s.players[0];
      Object.assign(p,{pos:10,previous:9,hand:[id('goblin'),id('goblin')],book:[id('minotaur')]});
      s.phase='fork';s.remaining=1;render();
    });
    const fountain=sagaPage.locator('.route-option').filter({hasText:'12번 방향'});
    assert.match(await fountain.innerText(),/분수.*손패 교체/);
    await fountain.tap();
    await sagaPage.locator('#game:not([inert])').waitFor();
    assert.match(await sagaPage.locator('#center').innerText(),/분수 · 손패 2장 교체 · 1장 뽑음/);
    assert.deepEqual(await sagaPage.evaluate(()=>s.players[0].hand.map(id=>C.combo.key(C.cards[id]))),['minotaur']);
    console.log('saga 844x390: two-area board, mandatory portal, morph summon and Fountain redraw by touch OK');
    await sagaPage.close();
    const trapPage=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    const trapUrl=pathToFileURL(path.resolve(__dirname,'../dist/cept.html'));
    trapUrl.searchParams.set('edition','revolt');
    await trapPage.route('https://**',r=>r.abort());
    await trapPage.goto(trapUrl.href);
    await trapPage.selectOption('#mapChoice','revolt-original-trapway');
    await trapPage.locator('#config .match-start .primary').tap();
    assert.equal(await trapPage.locator('#map .tile').count(),19);
    await trapPage.evaluate(()=>{
      Object.assign(s.players[0],{pos:2,previous:1,cash:303});
      Object.assign(s,{phase:'fork',die:6,rollSum:6,remaining:1});
      render();
    });
    const trapRoute=trapPage.locator('.route-option').filter({hasText:'17번 방향'});
    assert.match(await trapRoute.innerText(),/트랩 −60G/);
    await trapRoute.tap();
    await trapPage.locator('#game:not([inert])').waitFor();
    assert.match(await trapPage.locator('#center').innerText(),/마력 트랩 −60G · 이 칸 적립 60G/);
    assert.equal(await trapPage.getByRole('button',{name:/^17번 마력 트랩 · 적립 60G/}).count(),1);
    assert.deepEqual(await trapPage.evaluate(()=>[s.players[0].cash,s.tiles[16].trapMagic]),[243,60]);
    console.log('revolt 844x390: trap path loss, post-move notice and tile pot balance by touch OK');
    await trapPage.close();
    for(const [width,height] of [[320,568],[844,390]]){
      const towerPage=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
      await towerPage.route('https://**',r=>r.abort());
      await towerPage.goto(trapUrl.href);
      await towerPage.selectOption('#mapChoice','revolt-original-watchpost');
      await towerPage.locator('#config .match-start .primary').tap();
      await towerPage.evaluate(()=>{
        const goblin=C.cards.findIndex(c=>C.combo.key(c)==='goblin'&&!c.catalogOnly);
        Object.assign(s,{phase:'fork',die:1,rollSum:1,remaining:1});
        Object.assign(s.players[0],{pos:17,previous:16,cash:600,hand:[goblin]});
        render();
      });
      const towerRoute=towerPage.locator('.route-option').filter({hasText:'19번 방향'});
      assert.match(await towerRoute.innerText(),/사령탑.*원격 소환/);
      await towerRoute.tap();
      await towerPage.locator('[data-action=towerAim]').tap();
      assert.match(await towerPage.locator('#center').innerText(),/목표 영지를 터치/);
      await towerPage.locator('#map .tile').nth(8).tap();
      await towerPage.locator('#handPanel[open] .card.ready').tap();
      assert.match(await towerPage.locator('#center').innerText(),/9번 영지/);
      assert.ok(await towerPage.locator('#map .tile').nth(8).evaluate(tile=>tile.classList.contains('chosen')));
      await towerPage.locator('#detail').getByRole('button',{name:'크리처 소환'}).tap();
      assert.deepEqual(await towerPage.evaluate(()=>[s.players[0].pos,s.tiles[8].owner,s.tiles[8].unit.fatigued]),[18,0,true]);
      console.log('revolt '+width+'x'+height+': tower route, highlighted target, and illustrated hand summon by touch OK');
      await towerPage.close();
    }
    for(const [width,height] of [[320,568],[844,390]]){
      const switchPage=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
      await switchPage.route('https://**',r=>r.abort());
      await switchPage.goto(trapUrl.href);
      await switchPage.selectOption('#mapChoice','revolt-original-switchyard');
      await switchPage.locator('#config .match-start .primary').tap();
      await switchPage.evaluate(()=>{
        Object.assign(s,{phase:'fork',die:1,rollSum:1,remaining:1});
        Object.assign(s.players[0],{pos:0,previous:15,dir:1});
        render();
      });
      const route=switchPage.locator('.route-option').filter({hasText:'2번 방향'});
      assert.match(await route.innerText(),/분기 스위치.*3번/);
      await route.tap();
      assert.match(await switchPage.locator('#center').innerText(),/분기 스위치.*변경/);
      assert.match(await switchPage.locator('[data-action=switchFlip]').innerText(),/17번/);
      await switchPage.locator('[data-action=switchFlip]').tap();
      assert.equal(await switchPage.getByRole('button',{name:/^2번 분기 스위치 · 17번 방향 · 4라운드/}).count(),1);
      assert.equal(await switchPage.getByRole('button',{name:/^8번 분기 스위치 · 21번 방향 · 4라운드/}).count(),1);
      assert.equal(await switchPage.evaluate(()=>s.phase),'land');
      console.log('revolt '+width+'x'+height+': switch preview, manual flip and synchronized route signs by touch OK');
      await switchPage.close();
    }
    for(const [width,height] of [[320,568],[844,390]]){
      const gemPage=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
      await gemPage.route('https://**',r=>r.abort());
      await gemPage.goto(trapUrl.href);
      await gemPage.selectOption('#mapChoice','revolt-original-gem-route');
      await gemPage.locator('#config .match-start .primary').tap();
      await gemPage.evaluate(()=>{
        Object.assign(s,{phase:'fork',die:2,rollSum:2,remaining:2});
        Object.assign(s.players[0],{pos:8,previous:7,cash:600});
        s.prices[0]=55;s.players[1].symbols[0]=2;
        render();
      });
      const route=gemPage.locator('.route-option').filter({hasText:'10번 방향'});
      assert.match(await route.innerText(),/속성석 거래 후 1칸/);
      await route.tap();
      await gemPage.locator('[data-open=stealGem]').tap();
      const trade=gemPage.locator('#turnPicker[open]');
      await trade.getByRole('button',{name:'최대 수량 선택'}).tap();
      assert.match(await trade.locator('.symbol-amount').innerText(),/지불 164G · 상대 수령 110G/);
      assert.match(await trade.locator('.symbol-result').innerText(),/거래 후 마력 436G · 보유 2개 · 시세 55G/);
      await trade.getByRole('button',{name:'상대 보유분 매입 확정'}).tap();
      assert.deepEqual(await gemPage.evaluate(()=>[s.players[0].pos,s.players[0].cash,s.players[0].symbols[0],s.players[1].symbols[0]]),[10,436,2,0]);
      console.log('revolt '+width+'x'+height+': gem store pause, trade quote, opponent payout and resume by touch OK');
      await gemPage.close();
    }
    const archerPage=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    await archerPage.route('https://**',r=>r.abort());
    await archerPage.goto(pathToFileURL(path.resolve(__dirname,'../dist/cept.html')).href);
    const archer=await archerPage.evaluate(()=>{
      const id=C.cards.findIndex(c=>C.combo.key(c)==='archer');
      return {id,name:C.cards[id].name};
    });
    await archerPage.locator('#editor summary').tap();
    await archerPage.selectOption('#cardScope','usable');
    await archerPage.locator('#cardSearch').fill(archer.name);
    await archerPage.locator('.catalog-open').getByText(archer.name,{exact:true}).tap();
    const archerDetail=await archerPage.locator('#catalogAbility').evaluate(p=>p.firstChild.textContent);
    assert.match(archerDetail,/영지 능력 30G.*적 크리처.*10 피해/);
    await archerPage.locator('#closeCard').tap();
    await archerPage.locator('#editor summary').tap();
    await archerPage.locator('#config .match-start .primary').tap();
    await archerPage.evaluate(id=>{
      s=C.start(2,2,5000,'classic');pending=false;
      const goblin=C.cards.findIndex(c=>C.combo.key(c)==='goblin');
      s.phase='land';s.players[0].pos=0;s.players[0].cash=1000;
      Object.assign(s.tiles[1],{owner:0,type:3,unit:{id,hp:C.cards[id].hp}});
      Object.assign(s.tiles[2],{owner:1,type:3,unit:{id:goblin,hp:30}});
      render();
    },archer.id);
    const ability=archerPage.locator('[data-action=ability]');
    assert.equal(await ability.locator('.decision-preview').innerText(),archerDetail);
    await ability.tap();
    await archerPage.locator('[data-action=abilityLand]').tap();
    assert.deepEqual(await archerPage.evaluate(()=>[s.players[0].cash,s.tiles[2].unit.hp]),[970,20]);
    console.log('ps2 844x390: Korean Archer description and territory command cost and damage OK');
    await archerPage.close();
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
