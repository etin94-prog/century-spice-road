const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('../dist/cept-engine');
const archive=require('../dist/cept-archive-data');
const catalog=C.cards.flatMap((card,id)=>card.catalog?[id]:[]);
const ids=kind=>catalog.filter(id=>C.cards[id].kind===kind);
const creatures=ids('creature'),items=ids('item'),spells=ids('spell');
const key=id=>C.combo.key(C.cards[id]);
const byName=new Map(catalog.map(id=>[key(id),id]));
const find=name=>byName.get(name);
const fighter=find('fighter'),market='market';
const counts={creaturePairs:0,creatureGear:0,gearPairs:0,spellPairs:0,spellCreatures:0,spellItems:0,blockedSpells:0,recipes:0};
const originalRandom=Math.random;
const effectsPath=process.argv.find(arg=>arg.startsWith('--effects='))?.slice('--effects='.length);
const effectsFile=effectsPath?fs.openSync(effectsPath,'w'):null;
const effectCounts={cases:0,battleResolutions:0,spellActions:0,blockedSpellActions:0,decisions:{},changed:{}};
let pending=[];
let context='';

function flushEffects(){
  if(!pending.length)return;
  fs.writeFileSync(effectsFile,pending.join('\n')+'\n');
  pending=[];
}
function outputEffect(row){
  pending.push(JSON.stringify(row));
  if(pending.length===512)flushEffects();
}
function snapshot(s){
  const {players,tiles,battle,log,logSequence,...match}=s;
  return {players:players.map(p=>JSON.stringify(p)),tiles:tiles.map(t=>JSON.stringify(t)),match:JSON.stringify(match)};
}
function changes(from,to){
  const changed=new Set();
  const diff=(before,after,group,path=[])=>{
    if(JSON.stringify(before)===JSON.stringify(after))return [];
    if(before&&after&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after)){
      return [...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(field=>diff(before[field],after[field],group,[...path,field]));
    }
    changed.add([group,...path].join('.'));
    return [[path,before??null,after??null]];
  };
  const delta={};
  for(const group of ['players','tiles']){
    const entries=to[group].flatMap((after,index)=>{
      const before=from[group][index];
      return before===after?[]:[[index,diff(JSON.parse(before),JSON.parse(after),group)]];
    });
    if(entries.length)delta[group]=entries;
  }
  if(from.match!==to.match)delta.match=diff(JSON.parse(from.match),JSON.parse(to.match),'match');
  for(const field of changed)effectCounts.changed[field]=(effectCounts.changed[field]||0)+1;
  return delta;
}

function place(s,at,id,owner,type=C.cards[id].element){
  Object.assign(s.tiles[at],{type:type<0?'무속성':type,owner,unit:{id,hp:C.cards[id].hp}});
}
function state(){
  const s=C.start(4,4,12000,market,C.presets.fire,C.presets.fire,0,'duel');
  s.players.forEach(p=>{p.cash=25000;p.hand=[];});
  return s;
}
function act(s,action){
  assert.ok(action,'No legal action in '+s.phase);
  assert.ok(C.play(s,action),'Rejected '+JSON.stringify(action)+' in '+s.phase);
}
function coherent(s){
  assert.ok(s.players.every(p=>Number.isFinite(p.cash)&&p.hand.every(id=>!!C.cards[id])&&p.book.every(id=>!!C.cards[id])));
  assert.ok(s.tiles.every(t=>Number.isInteger(t.level)&&t.level>=1&&t.level<=5&&
    (t.unit!=null?t.owner>=0&&t.owner<s.players.length&&!!C.cards[t.unit.id]&&Number.isFinite(t.unit.hp):t.owner<0)));
  assert.ok(s.prices.every(p=>Number.isFinite(p)&&p>=1));
}
function fight(attacker,defender,attackGear,defendGear,mode){
  const s=state();
  place(s,1,defender,1,mode===0?'무속성':C.cards[defender].element);
  s.tiles[1].level=mode===0?1:5;
  s.players[0].pos=1;s.phase='attack';
  s.battle={at:1,inv:attacker,atkItem:null,defItem:null};
  if(attackGear!=null)s.players[0].hand=[attackGear];
  if(defendGear!=null)s.players[1].hand=[defendGear];
  const before=effectsFile===null?null:snapshot(s);
  for(const [seat,gear] of [attackGear,defendGear].entries()){
    const equipped=C.choices(s).some(a=>a[0]==='equip');
    if(gear!=null&&!equipped)return false;
    act(s,equipped?['equip',0]:['bare']);
  }
  assert.equal(s.phase,'result');const b=s.battle;
  for(const field of ['startHP','finalHP','forms','finalForms'])assert.equal(b[field].length,2,field);
  assert.ok([b.attackST,b.defendST,b.landHP,...b.startHP,...b.finalHP].every(Number.isFinite));
  assert.ok(b.strikes.every(a=>[0,1].includes(a.side)&&a.hp.every(h=>Number.isFinite(h)&&h>=0)));
  if(b.won)assert.equal(s.tiles[1].owner,0);
  coherent(s);
  let record;
  if(before){
    const {attackST,defendST,landHP,startHP,finalHP,forms,finalForms,strikes,lines,won,noToll,settled}=b;
    assert.ok([...settled.hp,...settled.st].every(n=>Number.isFinite(n)&&n>=0));
    const result=changes(before,snapshot(s));
    const battle={attackST,defendST,landHP,startHP,finalHP,forms:forms.map(key),finalForms:finalForms.map(key),strikes,lines,won,noToll,settled};
    record={case:context,attackGear:attackGear==null?null:key(attackGear),defendGear:defendGear==null?null:key(defendGear),battle,result};
  }
  const cash=record?s.players.map(p=>p.cash):null;
  const toll=record&&!b.won&&!b.noToll&&!b.markerFlag?C.owedToll(s,s.tiles[1]):0;
  act(s,['continue']);coherent(s);
  assert.ok(s.phase==='over'||C.choices(s).length);
  if(record){
    const cashDelta=s.players.map((p,i)=>p.cash-cash[i]);
    assert.deepEqual(cashDelta,toll?[-toll,toll,0,0]:[0,0,0,0]);
    record.afterResult={phase:s.phase,toll,cashDelta};
    effectCounts.battleResolutions++;
    effectCounts.cases++;
    outputEffect(record);
  }
  return true;
}
function cast(s,id,{land,item}={}){
  const p=s.players[s.turn];
  p.hand.unshift(id);s.phase='spell';
  if(!C.choices(s).some(([k,x])=>k==='cast'&&x===0)){
    counts.blockedSpells++;
    if(effectsFile!==null)effectCounts.blockedSpellActions++;
    return {spell:key(id),legal:false};
  }
  const before=effectsFile===null?null:snapshot(s);
  const decisions=[];
  act(s,['cast',0]);
  // Only the spell decision and its continuations. Free board moves are a separate test.
  const onward=new Set(['sacrifice','spellTarget','teleMove','squeeze','shatter','suppression','mindseeker',...Object.keys(C.spellActions)]);
  for(let guard=0;onward.has(s.phase);guard++){
    assert.ok(guard<12,'Spell continuation loop in '+s.phase);
    const choices=C.choices(s);
    const action=choices.find(([kind,index,card])=>{
      if(kind==='targetLand')return index===land;
      if(item==null)return false;
      if(kind==='targetPlayer')return index===1;
      if(kind==='breakCard')return s.players[s.spellTarget].hand[index]===item;
      if(kind==='eraseDraw')return s.players[s.spellTarget].book.at(-1-index)===item;
      if(kind==='foresightCard')return card===item;
      return kind==='prophecyKind'&&index==='item';
    })||choices[0];
    act(s,action);
    if(before){
      decisions.push(action);
      effectCounts.decisions[action[0]]=(effectCounts.decisions[action[0]]||0)+1;
    }
  }
  coherent(s);
  assert.ok(s.phase==='over'||C.choices(s).length);
  if(before){
    effectCounts.spellActions++;
    return {spell:key(id),legal:true,decisions,result:changes(before,snapshot(s))};
  }
}

function spellEffect(actions){
  if(effectsFile===null)return;
  const recorded=actions.filter(Boolean);
  effectCounts.cases++;
  outputEffect({case:context,actions:recorded});
}
function spellState(creature=find('goblin'),item=items[0],owner=1,focusItem=false){
  const s=state();
  place(s,1,fighter,0,0);place(s,2,creature,owner);
  place(s,4,find('dryad'),1,2);s.tiles[4].level=5;
  place(s,9,find('kelpie'),2,1);place(s,12,find('wyvern'),3,3);
  s.players.forEach(p=>{
    p.hand=[fighter,item,spells[0]];p.symbols[0]=8;
    if(focusItem)p.book[p.book.length-1]=item;
  });
  return s;
}

try{
  if(effectsFile!==null)outputEffect({schema:1,edition:C.edition,profiles:[.0001,.9999],cards:catalog.map(id=>[id,key(id)])});
  assert.deepEqual([creatures.length,items.length,spells.length],[231,103,158]);
  assert.equal(archive.combos.length,108);assert.equal(C.combo.recipes.length,108);
  for(const [i,recipe] of C.combo.recipes.entries()){
    context='recipe '+(i+1);
    const archived=archive.combos[i][1].map(path=>path.split('/').at(-1));
    assert.ok(archived.every(name=>recipe.flat().includes(name)));
    assert.ok(C.validBook(C.practiceBook(i)));
    counts.recipes++;
  }
  for(const [mode,random] of [.0001,.9999].entries()){
    Math.random=()=>random;
    for(const a of creatures)for(const d of creatures){
      context='creature '+key(a)+' / '+key(d)+' profile '+mode;
      assert.ok(fight(a,d,null,null,mode));counts.creaturePairs++;
    }
    for(const a of creatures)for(const gear of [...items,...creatures]){
      context='gear '+key(a)+' / '+key(gear)+' profile '+mode;
      if(fight(a,fighter,gear,null,mode))counts.creatureGear++;
      if(fight(fighter,a,null,gear,mode))counts.creatureGear++;
    }
    for(const a of items)for(const d of items){
      context='item '+key(a)+' / '+key(d)+' profile '+mode;
      assert.ok(fight(fighter,fighter,a,d,mode));counts.gearPairs++;
    }
    for(const a of spells)for(const d of spells){
      context='spell '+key(a)+' then '+key(d)+' profile '+mode;
      const s=spellState();
      const first=cast(s,a);
      let second;
      if(s.phase!=='over'){s.turn=0;second=cast(s,d);}
      spellEffect([first,second]);
      counts.spellPairs++;
    }
    for(const a of spells){
      for(const d of creatures){
        context='spell/creature '+key(a)+' / '+key(d)+' profile '+mode;
        spellEffect([cast(spellState(d,undefined,mode===0?1:0),a,{land:2})]);counts.spellCreatures++;
      }
      for(const d of items){
        context='spell/item '+key(a)+' / '+key(d)+' profile '+mode;
        spellEffect([cast(spellState(undefined,d,1,true),a,{item:d})]);counts.spellItems++;
      }
    }
  }
  console.log(JSON.stringify(counts));
  if(effectsFile!==null){
    assert.equal(effectCounts.cases,counts.creaturePairs+counts.creatureGear+counts.gearPairs+counts.spellPairs+counts.spellCreatures+counts.spellItems);
    assert.equal(effectCounts.blockedSpellActions,counts.blockedSpells);
    outputEffect({summary:effectCounts});
    flushEffects();
    console.log(JSON.stringify(effectCounts));
  }
}catch(error){
  error.message=context+' · '+error.message;
  throw error;
}finally{
  Math.random=originalRandom;
  if(effectsFile!==null)fs.closeSync(effectsFile);
}
