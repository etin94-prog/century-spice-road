// Lines the playable PS2 stage layouts up with the tiles painted in dist/art/cept-maps.
//
// The published layouts are schematic: a regular grid (grid.json) that only roughly follows the picture.
// This finds the painted 2:1 tiles in each 600x400 picture and writes, into dist/cept-layouts.js,
//   position  the centre of each tile in percent of the picture,
//   half      half a tile's width in percent of the picture width,
//   fit       per tile: 2 the picture shows the tile, 1 it shows a frame in another colour, 0 it shows nothing.
// hints.json holds the few things that had to be pointed out by hand: tiles (picture pixels, see fit-lib.js)
// and, where scenery looks like tiles, the tile size.
//
// usage: serve dist over http (PORT=8099 node cept-server.cjs), install playwright somewhere on NODE_PATH, then
//   BASE=http://127.0.0.1:8099 node tools/cept-layout-fit/fit.cjs [--write] [stage ...]
// Without --write it only prints what it found.
const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const dist=path.join(__dirname,'..','..','dist'),file=path.join(dist,'cept-layouts.js');
const stages=require(path.join(dist,'cept-stage-data.js')),layouts=require(file);
const grid=require('./grid.json'),hints=require('./hints.json');
const args=process.argv.slice(2),write=args.includes('--write'),only=args.filter(a=>/^\d+$/.test(a)).map(Number);
const base=process.env.BASE||'http://127.0.0.1:8099';
const round=v=>Math.round(v*1000)/1000;
(async()=>{
  const browser=await chromium.launch(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{});
  const page=await browser.newPage();
  await page.goto(base+'/cept.html');
  await page.addScriptTag({path:path.join(__dirname,'fit-lib.js')});
  const count=[0,0,0];
  for(const layout of layouts){
    if(only.length&&!only.includes(layout.stage))continue;
    const stage=stages[layout.stage-1];
    const {size,...tiles}=hints[layout.stage]||{};
    const r=await page.evaluate(([m,h])=>fitStage(m,h),[{...stage,...layout,grid:grid[layout.stage-1],size},tiles]);
    const c=[0,0,0];r.fit.forEach(f=>{c[f]++;count[f]++;});
    console.log(String(layout.stage).padStart(2),stage.name.padEnd(24),'tiles',String(r.fit.length).padStart(2),'| painted',String(c[2]).padStart(2),'frame only',String(c[1]).padStart(2),'not painted',String(c[0]).padStart(2),'| tile',r.cell[0].toFixed(1)+'px');
    Object.assign(layout,{position:r.place.map(([x,y])=>[round(x/6),round(y/4)]),half:round(r.cell[0]/6),fit:r.fit.join('')});
  }
  await browser.close();
  console.log('painted',count[2],'frame only',count[1],'not painted',count[0]);
  if(write){
    fs.writeFileSync(file,'const CepterLayouts=[\r\n'+layouts.map(l=>JSON.stringify(l)).join(',\r\n')+'\r\n];\r\nif(typeof module!=="undefined")module.exports=CepterLayouts;\r\n');
    console.log('written',file);
  }
})().catch(e=>{console.error(e);process.exit(1);});
