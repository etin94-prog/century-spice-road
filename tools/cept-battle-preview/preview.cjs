// Captures the battle stage frame by frame so its effects and pictures can be checked by eye.
//
// usage: serve the repository (PORT=8099 node cept-server.cjs), install playwright somewhere on NODE_PATH, then
//   BASE=http://127.0.0.1:8099 node tools/cept-battle-preview/preview.cjs <WxH> <out folder> [edition] [attacker] [defender] [attacker item] [defender item]
// Cards are named by their combo key (knight, wallofstone, longsword, firebolt ...). Without names two cards are picked.
// env: PACE   how many times slower than normal the replay runs (default 4), so every beat is caught
//      FRAMES number of frames (default 36), EVERY milliseconds between them (default 400)
//      TERRAIN tile type to fight on: 0 fire, 1 water, 2 earth, 3 wind
// Frames are written as <out>/battle-NN.png, with entry.png and defend.png for the two screens before the fight.
const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const [size='390x844',out='battle-preview',edition='ps2',atk='',def='',atkItem='',defItem='']=process.argv.slice(2);
const [width,height]=size.split('x').map(Number);
const every=+(process.env.EVERY||400),frames=+(process.env.FRAMES||36),pace=+(process.env.PACE||4);
const base=process.env.BASE||'http://127.0.0.1:8099';
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{});
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/cept.html'+(edition==='ps2'?'':'?edition='+edition));
  await page.locator('#config .match-start .primary').tap();
  await page.waitForTimeout(600);
  const setup=await page.evaluate(([atk,def,atkItem,defItem,terrain])=>{
    const find=k=>k?C.cards.findIndex(c=>c&&C.combo.key(c)===k):-1;
    cancelMapEffect();stopWalk();clearTimeout(timer);
    const deck=s.players[0].template||C.presets.fire;
    s=C.configureMatch(C.start(2,2,7000,s.mapId,deck,deck,1,'duel',0),{recordReplay:true});
    const creatures=C.cards.flatMap((c,i)=>c&&c.kind==='creature'&&!c.catalogOnly?[i]:[]);
    let a=find(atk),d=find(def);if(a<0)a=creatures[3];if(d<0)d=creatures[7];
    const at=s.tiles.findIndex(t=>typeof t.type==='number'&&(terrain===''||t.type===+terrain));
    Object.assign(s.tiles[at],{owner:1,level:2,unit:{id:d,hp:C.cards[d].hp}});
    const p=s.players[0],ai=find(atkItem),di=find(defItem);
    p.cash=5000;s.players[1].cash=5000;p.hand=ai>=0?[a,ai]:[a];s.players[1].hand=di>=0?[di]:[];
    s.turn=0;p.pos=at;s.phase='land';s.die=3;handPanel.open=false;inspect=-1;pending=false;
    save();render();
    return C.cards[a].name+' vs '+C.cards[d].name;
  },[atk,def,atkItem,defItem,process.env.TERRAIN??'']);
  const step=want=>page.evaluate(want=>{
    const choices=C.choices(s),pick=choices.find(c=>want.includes(c[0]))||choices.find(c=>c[0]==='bare');
    if(pick){pending=false;act(pick);pending=false;render();}
    return s.phase;
  },want);
  if(await step(['invade'])!=='attack')throw new Error(setup+': the attacker cannot invade here');
  // The pawn walks to the land first; the stage appears when it arrives.
  await page.waitForSelector('.battle-stage');await page.waitForTimeout(1600);
  await page.screenshot({path:path.join(out,'entry.png')});
  await step(['equip']);await page.waitForTimeout(400);
  await page.screenshot({path:path.join(out,'defend.png')});
  await page.evaluate(pace=>{battlePace=pace;},pace);
  await step(['equip']);
  for(let i=0;i<frames;i++){
    const started=Date.now();
    await page.screenshot({path:path.join(out,'battle-'+String(i).padStart(2,'0')+'.png')});
    await page.waitForTimeout(Math.max(0,every-(Date.now()-started)));
  }
  const b=await page.evaluate(()=>({strikes:s.battle.strikes.map(x=>x.effect+(x.critical?' critical':'')+(x.scroll?' scroll':'')),lines:s.battle.lines}));
  console.log(setup,JSON.stringify(b));
  if(errors.length){console.log('page errors',[...new Set(errors)]);process.exitCode=1;}
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
