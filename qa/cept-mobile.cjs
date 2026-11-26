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
      await page.locator('#editor summary').tap();
      await page.locator('#config .match-start .primary').tap();
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
      assert.match(await page.locator('#seatStats').innerText(),/이번 주회 남은 요새/);
      await page.locator('#seatDialog button').tap();
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
      await page.locator('#map .pawn-action').tap();
      const pawnMenu=page.locator('#turnPicker');
      if(await pawnMenu.isVisible()){
        await pawnMenu.getByRole('button',{name:'주사위 굴리기',exact:true}).tap();
        await pawnMenu.getByRole('button',{name:'주사위 굴리기 확정',exact:true}).tap();
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
      const levels=page.locator('select[data-action=level]');
      await levels.selectOption({index:await levels.locator('option').count()-1});
      assert.ok((await levels.locator('xpath=ancestor::div[contains(@class,"command")][1]').innerText()).includes('잔액 '+(3000-expected.cost)+'G'));
      await page.locator('button[data-action=level]').tap();
      assert.equal(await page.evaluate(at=>s.tiles[at].level,expected.tile),expected.level);
      if(edition==='ps2'){
        await page.evaluate(()=>{
          cancelMapEffect();stopWalk();clearTimeout(timer);
          s=C.start(4,4,5000,'ps2-35');pending=false;
          Object.assign(s.players[0],{pos:C.board(s).links[17][0],previous:null,cash:25,hand:[]});
          s.phase='fork';s.remaining=1;C.play(s,['route',17]);seenMove=s.lastMove.sequence;render();
        });
        const shelf=page.locator('select[data-action=buyCard]'),buy=page.locator('button[data-action=buyCard]');
        assert.equal(await shelf.locator('option').count(),4);
        await shelf.selectOption({index:1});assert.equal(await buy.isDisabled(),true);
        assert.match(await buy.innerText(),/35G 부족/);
        await shelf.selectOption({index:3});assert.equal(await buy.isDisabled(),false);
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
        await page.tap('button[data-action=cast]');
        const options=page.locator('select[data-action=targetLand]');
        await options.selectOption({index:1});assert.equal(await options.locator('option').count(),2);
        assert.match(await page.locator('#buttons .decision-preview').innerText(),/적 영지.*셉터 4.*HP 20\/30 → 0.*격파/);
        assert.ok((await page.locator('button[data-action=targetLand]').boundingBox()).height>=44);
        await page.tap('button[data-action=targetLand]');
        assert.equal(await page.evaluate(()=>s.tiles[4].unit),null);
        const wanted=await page.evaluate(()=>{
          cancelMapEffect();stopWalk();clearTimeout(timer);
          s=C.start(2,2,5000,'ps2-1');pending=false;
          const find=n=>C.cards.findIndex(c=>C.combo.key(c)===n),p=s.players[0];
          p.hand=[find('foresight')];p.book=['goblin','skeleton','fate','manna','banshee','holygrail'].map(find);
          render();return find('fate');
        });
        await page.tap('button[data-action=cast]');
        const draw=page.locator('select[data-action=foresightCard]');
        await draw.waitFor();
        assert.equal(await draw.locator('option').count(),6);
        await page.locator('#buttons .command').filter({has:draw}).getByRole('button',{name:'그림으로 고르기'}).tap();
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
        assert.ok(layout.controls>=8);assert.equal(layout.overlap,false);assert.equal(layout.overflow,false);
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
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
