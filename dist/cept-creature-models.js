// Draw original standing figures for creatures without a dedicated sprite.
const creatureModelCache=new Map();
const creaturePalettes=[
  ['#982f25','#e16b36','#ffd16a'],['#235d88','#389da9','#9fe8ed'],
  ['#4b5f31','#829447','#edf097'],['#594783','#9473b5','#f2caef'],
  ['#4c5268','#9195a6','#f0dfbc']
];
const creatureShapes=[
  ['drake',/dragon|drake|wyvern|hydra|pyrallis|quetzalcoatl|lung|nessie/],
  ['serpent',/worm|wurm|snake|cobra|eel|rattler|leviathan|basilisk|leech|drainroper|angostura/],
  ['raptor',/phoenix|owl|griffon|cockatrice|harpy|garuda|siren|simurgh|thunderbeak|roadrunner|chonchon|pegasus/],
  ['insect',/mosquito|spider|beetle|hornet|weevil|larvae|mothman|carbunfly|myrmecoleo|mermecoleo/],
  ['plant',/willow|woodfolk|mold|weed|mandrake|flower|fung|dryad|leshy|barometz|vine|odradek|mantrap|cornfolk/],
  ['totem',/idol|totem|statue|wall|colossus|golem|stone|gargoyle/],
  ['gear',/gear|juggernaut|living(?:shield|spear|sword)|trojanhorse|ormechead/],
  ['wisp',/wisp|wraith|shade|ghost|spectre|banshee|eidolon|vision|soulcollector|hurricane|balloon|genie|nightmare/],
  ['mire',/pudding|sphere|ooze|amoeba|egg|slime|gooba|virus|powdereater/],
  ['deep',/kraken|octop|deepspawn|charybdis|anubias|crustacea|dagon|sea(?:bonze|monk)/],
  ['fish',/leviathan|shark|megarodon|megalodon|remora|kelpie|marfolk|grindylow|suiko|vodyanoi|undine|nymph/],
  ['shell',/tortoise|armadillo|shell|cray|slug|cockroach/],
  ['beast',/hare|llama|leo|lion|cat|lynx|hound|cerberus|manticore|behemoth|boar|yeti|coati|chimera|hedgehog|centaur|chupacabra|bandicoot|animal|bandersnatch|nue|sphinx|chameleon|tyrannosaurus|quetzal/],
  ['bone',/skeleton|zombie|mummy|ghoul|deathgaze|barrowwight|dullahan|lich/],
  ['giant',/giant|cyclops|troll|grendel|titan|hunbaba|quakebeast|taotieh|gigantherium/],
  ['fiend',/imp|demon|lord|efreet|baal|bal(?:danders|rog)|ares|b[eo]elzebub|mephistopheles|ashura|succubus|nightfiend|raksas|wendigo|vampire|gremlin/],
  ['mystic',/wizard|mage|bard|queen|conjurer|sorcerer|witch|prophet|bishop|cleric|fate|healer|sage|monk|druid|sharazad|master/]
];

function originalCreatureImage(key,element){
  const palette=creaturePalettes[element]||creaturePalettes[4];
  const cacheKey=key+':'+element;
  if(creatureModelCache.has(cacheKey))return creatureModelCache.get(cacheKey);
  let hash=2166136261;
  for(const letter of key)hash=Math.imul(hash^letter.codePointAt(0),16777619);
  hash>>>=0;
  const [dark,base,light]=palette;
  const accent='hsl('+((hash%3600000)/10000)+' 72% 77%)';
  const shape=creatureShapes.find(([,pattern])=>pattern.test(key))?.[0]||'guard';
  const crest=hash>>>7&3,build=hash>>>2&3,mark=hash>>>12&7;
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=104;
  const ctx=canvas.getContext('2d');
  const ink='#231d30';
  ctx.lineJoin='round';ctx.lineCap='round';
  const shade=ctx.createLinearGradient(16,10,77,95);
  shade.addColorStop(0,light);shade.addColorStop(.35,base);shade.addColorStop(1,dark);
  function fill(color,edge){
    ctx.fillStyle=color;ctx.fill();
    if(edge){ctx.lineWidth=edge;ctx.strokeStyle=ink;ctx.stroke();}
  }
  function oval(x,y,w,h,color,edge=2.5){
    ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,Math.PI*2);fill(color,edge);
  }
  function poly(points,color,edge=2.5){
    ctx.beginPath();ctx.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);
    ctx.closePath();fill(color,edge);
  }
  function curve(color,width,x,y,x1,y1,x2,y2,endX,endY){
    ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x1,y1,x2,y2,endX,endY);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  function eye(x,y){
    oval(x,y,4.4,3,ink,0);oval(x+1,y-.5,2.3,1.8,accent,0);
  }
  function wings(){
    poly([43,61,16,55,4,24,25,32,39,42],dark);
    poly([42,58,19,49,10,30,28,39],base,1.5);
    poly([59,60,82,52,92,14,67,33,55,43],shade);
    curve(light,2,63,48,72,43,81,31,87,23);
  }
  function boots(x,y){
    oval(x-9,y-7,6,12,dark);oval(x+10,y-8,6,12,base);
    oval(x-10,y,9,5,ink,1.4);oval(x+12,y,9,5,dark);
  }
  function emblem(x,y){
    const w=4+(mark&3);
    poly([x,y-w,x+w,y,x,y+w,x-w,y],accent,1.25);
    if(mark&4)oval(x,y,2,2,light,0);
  }
  oval(49,93,31,6,'#15122188',0);
  if(shape==='drake'||shape==='raptor'){
    wings();boots(52,88);
    curve(ink,10,44,72,14,92,10,63,18,57);
    curve(base,6,44,72,14,92,10,63,18,57);
    oval(50,67,17+build,19,shade);
    poly([49,48,50,26,61,17,78,23,82,37,65,43,62,54],shade);
    if(shape==='raptor')poly([68,31,91,37,76,44,67,39],accent,2);
    else poly([53,29,48,11+crest*2,60,18,70,9+crest,70,25],light,2);
    eye(68,30);emblem(51,64);
  }else if(shape==='serpent'){
    curve(ink,22,21,80,3,91,66,99,63,73);
    curve(dark,16,21,80,3,91,66,99,63,73);
    curve(ink,26,65,77,72,58,28,55,45,38);
    curve(shade,21,65,77,72,58,28,55,45,38);
    if(crest>1)poly([40,49,23,40,29,21,50,17,64,23,67,44,53,51],dark);
    oval(50,33,15+build,13,shade);poly([51,35,71,34,66,43,52,46],base);
    eye(56,31);emblem(60,69);
  }else if(shape==='insect'||shape==='shell'){
    for(const x of [20,29,62,71]){
      poly([x,72,x-4,83,x-8,88,x+1,89,x+8,75],dark,1.5);
    }
    if(shape==='insect'){
      curve(ink,4,49,51,43,31,35,27,31,30);
      curve(ink,4,58,49,62,25,75,27,77,29);
      if(crest&1)wings();
    }
    oval(43,66,25+build,20,shade);
    curve(light,3,22,68,27,49,51,48,60,59);
    curve(dark,4,38,48,34,58,51,71,55,81);
    oval(65,67,13,12,base);eye(68,64);emblem(41,64);
  }else if(shape==='plant'||shape==='totem'||shape==='gear'){
    poly([28,87,32,43,27,33,44,19+crest*3,61,20,71,33,65,49,71,87,50,95],shade);
    poly([27,48,13,39,14,63,25,76,34,63],dark);
    poly([64,45,77,34,83,44,78,65,66,75],base);
    if(shape==='plant'){
      poly([32,42,14,32,19,15,36,19,39,6,52,14,63,9,75,20,69,36,50,43],shade);
      curve(light,2,23,23,25,22,38,23,42,34);
    }else if(shape==='gear'){
      for(const x of [31,67]){oval(x,57,9,9,dark);oval(x,57,4,4,accent,0);}
      poly([39,28,39,15,46,15,46,21,53,21,53,15,60,15,60,28],base,2);
    }else{
      poly([24,36,47,16,70,33,60,45,42,48],shade);
      poly([26,83,73,81,76,88,71,94,26,94,21,89],base);
    }
    eye(46,49);eye(62,47);emblem(50,71);
  }else if(shape==='wisp'||shape==='mire'||shape==='deep'||shape==='fish'){
    const floating=shape==='wisp';
    if(shape==='deep')for(let i=0;i<5;i++){
      const x=17+i*15;
      curve(ink,11,47,66,x,87,x+9,94,x-7,89);
      curve(shade,7,47,66,x,87,x+9,94,x-7,89);
    }
    if(shape==='fish')poly([38,62,15,43,9,69,24,82,42,73],shade);
    if(floating)poly([41,51,17,61,12,90,30,78,37,90,49,80,60,89,70,76,80,86,76,61,63,47],dark);
    const y=floating?45:65;
    oval(50,y,22+build,shape==='mire'?20:24,shade);
    if(floating)poly([34,37,37,20,47,25,51,12+crest*3,65,28,70,42],shade);
    if(shape==='fish')poly([43,54,41,26+crest*3,61,40,63,54],base);
    eye(49,y-3);eye(63,y-5);emblem(53,y+11);
    if(shape==='mire')for(let i=0;i<3;i++)oval(28+i*11,y+3+i*4,2+(mark&3),2,light,0);
  }else if(shape==='beast'){
    for(const x of [29,43,59,72])boots(x,88);
    curve(ink,10,29,67,20,73,9,68,10,48);
    curve(base,6,29,67,20,73,9,68,10,48);
    oval(45,66,28,17+build,shade);
    poly([51,53,51,31-crest*3,62,38,73,25+crest*2,78,46,83,56,74,68,62,68],shade);
    oval(76,60,11,7,dark);eye(69,50);emblem(46,63);
  }else{
    const wide=shape==='giant'?24:17+build;
    boots(47,88);
    if(shape==='fiend'&&crest>1)wings();
    oval(31,63,8,15,dark);oval(69,64,8,14,shade);
    oval(47,67,wide,19,shape==='bone'?light:shade);
    if(shape==='mystic'){
      poly([37,57,59,56,73,87,26,87],shade);
      curve(ink,6,76,91,77,71,82,50,80,36);oval(80,33,7,7,accent);
    }else{
      const height=18+(mark&3)*4;
      poly([76,75,71,68,76,68-height,84,58-height,84,70-height,78,76],accent,2);
    }
    oval(50,40,17+build,17,shape==='bone'?light:shade);
    if(shape==='fiend')poly([38,39,27,17+crest*2,40,25,52,24,64,12+crest*2,68,36],dark);
    if(shape==='mystic')poly([32,37,45,14+crest*2,54,19,69,34,75,38],dark);
    if(shape==='guard')poly([33,42,35,25,51,18+crest*2,67,28,69,41,60,37,44,39],dark);
    if(shape==='giant')eye(53,40);
    else{eye(48,40);eye(62,39);}
    emblem(48,65);
  }
  const image=canvas.toDataURL('image/png');creatureModelCache.set(cacheKey,image);
  return image;
}