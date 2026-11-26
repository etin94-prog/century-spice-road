const CepterEditions=(()=>{
  const data=typeof module==='undefined'?CepterEditionData:require('./cept-edition-data');
  const names={ps2:'컬드셉트 2 · PS2',dc:'컬드셉트 세컨드 · DC',saturn:'컬드셉트 · 새턴',ps1:'컬드셉트 익스팬션 · PS1'};
  const categories={en:'neutral',ef:'fire',ew:'water',ee:'earth',ea:'air',iw:'weapon',ia:'armor',it:'tool',is:'scroll',si:'sflash',mi:'mflash',sc:'senchant',mc:'menchant',sa:'공격 주문',sd:'방어 주문',sm:'이동 주문',so:'기타 주문'};
  const land={ef:'R',ew:'B',ee:'G',ea:'Y',cd:'+[]',nf:'R',nw:'B',ne:'G',na:'Y',nn:'N'};
  const equipment={xw:'Weapon',xa:'Armor',xt:'Tool',xs:'Scroll'};
  const tiles={castle:'성',fire:0,water:1,earth:2,air:3,neutral:'무속성',multi:'복합',temple:'신전',shrine:'성소',shop:'카드 상점',fortune:'점술관',bridge:'다리',teleport:'전송진','fort-north':'북쪽 요새','fort-south':'남쪽 요새','fort-east':'동쪽 요새','fort-west':'서쪽 요새'};
  const economy={"ps1":{"roca":[6000,400,300,6,100],"sneph":[7000,440,350,7,100],"mt-karin":[7000,600,400,7,80],"gosa":[8000,450,350,8,80],"kelder":[8000,600,400,8,80],"talio":[8000,600,500,9,80],"gilman":[10000,600,500,8,80],"bisteam":[8000,500,400,8,80],"nabath":[10000,500,400,8,100],"abyss":[12000,800,600,10,90]},"saturn":{"roca":[6000,400,300,6],"sneph":[7000,450,350,7],"mt-karin":[7000,600,400,7],"gosa":[8000,450,350,7],"kelder":[8000,600,400,8],"talio":[8000,600,500,9],"bisteam":[8000,500,400,8],"gilman":[10000,600,500,8],"nabath":[10000,500,400,8]}};
  function boards(edition,original){
    const result={};
    for(const [index,m] of data.maps[edition].entries()){
      const types=m.types.map(t=>tiles[t]),forts=types.flatMap((t,i)=>String(t).endsWith('요새')?[i]:[]);
      const grid=m.loc.map(([x,y])=>[Math.floor(y/2)-x,Math.ceil(y/2)+x]);
      const minRow=Math.min(...grid.map(p=>p[0])),minCol=Math.min(...grid.map(p=>p[1]));
      const position=grid.map(([r,c])=>[r-minRow+1,c-minCol+1]);
      const links=grid.map(([r,c])=>grid.flatMap(([u,v],i)=>Math.abs(r-u)+Math.abs(c-v)===1?[i]:[]));
      const other=edition==='dc'&&Object.values(original).find(v=>v.source?.endsWith('/'+m.slug));
      const same=other&&types.length===other.types.length&&types.every((t,i)=>t===other.types[i]&&links[i].length===other.links[i].length&&links[i].every(j=>other.links[i].includes(j)));
      const [goal,startCash,lapBonus,die,landPrice]=economy[edition]?.[m.slug]||[];
      const id=edition+'-'+(index+1);
      result[id]={...m,types,links,forts,checkpoints:forts.filter((j,i)=>forts.findIndex(k=>types[k]===types[j])===i),
        castles:types.flatMap((t,i)=>t==='성'?[i]:[]),position,cols:Math.max(...position.map(v=>v[1])),rows:Math.max(...position.map(v=>v[0])),
        areas:same?other.areas:types.map(()=>0),areaCount:same?other.areaCount:1,startCash,bonus:lapBonus||200,base:landPrice||80,die:die||Number(m.die)||other?.die||6,storyGoal:goal||other?.storyGoal,
        graph:true,...(same?{stage:index+1,image:other.image,half:other.half,position:other.position,fortBonus:other.fortBonus}:{}),section:m.section,next:m.section==='story'&&data.maps[edition][index+1]?.section==='story'?edition+'-'+(index+2):null};
    }
    return result;
  }
  function configure(edition,cards,presets){
    const index=new Map(cards.flatMap((c,i)=>c.catalog?[[c.catalog.path.split('/').pop(),i]]:[]));
    for(const c of cards){c.unlisted=true;}
    for(const [i,r] of data.cards[edition].entries()){
      const slug=r.name.toLowerCase().replace(/[^a-z0-9]/g,''),id=index.get(slug),base=cards[id];
      const category=categories[r.type],kind=r.type[0]==='e'?'creature':r.type[0]==='i'?'item':'spell';
      const path=base?.catalog.path||((kind==='creature'?category:kind+'s')+'/'+slug);
      const traits={'援護':'support','再生':'regenerate','先制':'first','後手':'last','防御型':'stationary'};
      const clauses=r.ability.split(' ; ');
      const basicCreature=kind==='creature'&&clauses.every(v=>v==='-'||traits[v]);
      const basicGear=kind==='item'&&clauses.every(v=>/^(ST|HP)[+-]\d+$/.test(v)||v==='先制');
      const simple=basicCreature||basicGear;
      const first=edition!=='dc';
      const variant=first&&['dragon','pan','hornet','holyword1','holyword6','magicbolt','steamgear','golem','sorcerer','manticore','armadillo','coati','darkelf','elf','knight','samurai','deathgaze','goldengoose','wallofice','giantspider','giantsnake','stonehail','cure'].includes(slug);
      const compatible=!!base&&!base.catalogOnly&&(r.shared||variant);
      const name=base?.name||r.name.replace(/([a-z])([A-Z])/g,'$1 $2');
      const element=['fire','water','earth','air'].indexOf(category);
      const format=(arr,lookup)=>arr.map(k=>lookup[k]).filter(Boolean).join(',');
      const catalog={name:base?.catalog.name||name,path,category,rarity:r.rarity,number:i+1,source:'https://card.culdcept.net/'+({dc:'2nd',saturn:'1st',ps1:'1ex'}[edition])+'/'+encodeURIComponent(r.name)+'/',stats:(kind==='creature'?'ST '+r.st+' · HP '+r.hp+' · ':'')+r.cost+'G',
        ability:r.shared&&base?base.catalog.ability:r.ability,additionalCost:format(r.req,land),placement:format(r.land,land),equipment:format(r.ban,equipment),race:r.race};
      const c={...(compatible?base:{}),name,catalog,element,kind,category,cost:r.cost,ban:r.ban.map(k=>equipment[k].toLowerCase()),catalogOnly:!(compatible||variant||simple),unlisted:false,hasArt:!!base,firstArt:r.image};
      if(kind==='creature'){c.st=r.st;c.hp=r.hp;delete c.landBan;}
      if(kind==='creature')for(const clause of clauses)if(traits[clause])c[traits[clause]]=true;
      if(basicGear){
        c.st=Number(r.ability.match(/ST([+-]\d+)/)?.[1]||0);
        c.hp=Number(r.ability.match(/HP([+-]\d+)/)?.[1]||0);
        c.first=clauses.includes('先制');
      }
      if(first&&slug==='wallofice'){c.stationary=true;c.battleHP=edition==='ps1'?20:0;}
      if(first&&slug==='giantspider'){c.paralyze=true;c.statusRaces=['rh','rb'];}
      if(first&&slug==='giantsnake'){c.poison=true;c.statusRaces=['rh','rb','rd'];}
      if(first&&slug==='stonehail'){c.st=30;c.hp=0;c.critical=3;}
      if(first&&slug==='cure')c.effect='heal';
      if(basicCreature&&!r.shared)c.basicBattle=true;
      if(first&&slug==='sorcerer')c.support=true;
      if(first)c.criticalRace={knight:'rd',darkelf:'rh',elf:'ru'}[slug];
      if(first&&['pan','hornet'].includes(slug))c.statusRaces=['rh','rb','rd'];
      if(id===undefined)cards.push(c);else cards[id]=c;
    }
    for(const c of cards)if(c.unlisted)c.catalogOnly=true;
    function build(preferred){
      const pool=cards.flatMap((c,i)=>!c.catalogOnly?[i]:[]),deck=[];
      for(const id of preferred)if(deck.length<50&&pool.includes(id)&&deck.filter(n=>n===id).length<4)deck.push(id);
      const rest=pool.filter(id=>!deck.includes(id)).sort((a,b)=>cards[a].cost-cards[b].cost);
      for(let copy=0;copy<4&&deck.length<50;copy++)for(const id of rest){if(deck.length===50)break;deck.push(id);}
      return deck;
    }
    const lookup=new Map(cards.flatMap((c,i)=>c.unlisted?[]:[[c.catalog.path.split('/').pop(),i]]));
    const water='fighter goblin skeleton wolf giantamoeba kingtortoise lizardman marfolk wallofice giantbat harpy hornet hurricane sprite chainmail firebolt leatherarmor longsword mace cure fly holyword1 holyword6 magicbolt manna shatter'.split(' ');
    const waterDeck=water.flatMap(n=>Array(['firebolt','cure'].includes(n)?1:2).fill(lookup.get(n)));
    presets.fire=build(presets.fire);presets.intro=build(waterDeck);
    if(edition!=='dc'){
      const common='goblin wolf fighter mace leatherarmor magicbolt cure shatter manna fly holyword1 holyword6'.split(' ');
      const fire='kobold minotaur pillarofflame gascloud dragonfly',earth='tigerbeetle wereboar wallofstone woodfolk dwarf';
      const water='marfolk kingtortoise wallofice giantamoeba lizardman',air='giantbat eidolon hurricane gremlin harpy';
      for(const [key,groups] of Object.entries({fire:[fire,earth,'giantrat firebolt'],intro:[water,air,'hobgoblin freeze'],fireAir:[fire,air,'giantspider windcutter'],waterEarth:[water,earth,'giantsnake stonehail']})){
        presets[key]=[...common,...groups.join(' ').split(' ')].flatMap(n=>[lookup.get(n),lookup.get(n)]).concat(lookup.get('longsword'),lookup.get('wingedboots'));
      }
    }
    if(edition!=='dc')for(const [name,counts] of Object.entries(data.books)){
      const ids=Object.entries(counts).flatMap(([key,n])=>Array(n).fill(lookup.get(key)));
      presets[name]=build([...ids,...presets.fire]);
    }
  }
  return {names,boards,configure};
})();
if(typeof module!=='undefined')module.exports=CepterEditions;
