// Sprite positions follow the six-column, five-row figure atlas.
const standingFigures=[
  'cepter','mage','knight','ranger',
  'rat','wolf','goblin','fighter','gas','kobold','dragonfly','flame',
  'minotaur','woodfolk','wall','beetle','dwarf','pan',
  'ash-hound','furnace','otter','tide','root','bear','falcon','lion'
];
function figure(index,label){
  const model = standingFigures[index];
  if(model){
    const image = document.createElement('img');
    image.className = 'cept-figure standing-model';
    image.src = 'art/cept-standing-'+model+'.webp';
    image.alt = label || '';
    return image;
  }
  const node=document.createElement('span');
  node.className='cept-figure';
  node.style.backgroundPosition=(index%6)*20+'% '+Math.floor(index/6)*25+'%';
  if(label){node.setAttribute('role','img');node.setAttribute('aria-label',label);}
  else node.setAttribute('aria-hidden','true');
  return node;
}
function creatureFigure(id){
  const card=Cepter.cards[id];
  if(id<8)return figure(18+id,card.name);
  if(id>=13&&id<=26)return figure(4+id-13,card.name);
  const image=document.createElement('img');
  image.className='cept-figure standing-model generated-model';
  image.src=originalCreatureImage(Cepter.combo.key(card)||card.name,card.element);
  image.alt=card.name;
  return image;
}
const cardFrameCache=new Map(),cardPortraits=new Map();
const cardElementNames={fire:'화',water:'수',earth:'지',air:'풍',neutral:'무속성',dual:'이중 속성'};
const cardColors={
  fire:['#2d1721','#a33b3b','#ffc27d'],water:['#14263e','#256d89','#aee9f4'],
  earth:['#1c2c24','#567142','#e7eca2'],air:['#282039','#755295','#e8ccff'],
  neutral:['#2b2830','#6d6378','#eedab8'],dual:['#25303a','#605c89','#fbce99'],
  item:['#302518','#896537','#ffe0a1'],spell:['#1c2941','#435589','#d4dafa']
};
function cardAppearance(card){
  const category=card.kind==='creature'?(card.catalog?.category||['fire','water','earth','air'][card.element]||'neutral'):card.kind;
  const type=card.kind==='creature'?(cardElementNames[category]||'무속성'):card.kind==='item'?'아이템':'주문';
  const stats=card.kind==='creature'?'ST '+card.st+'  /  HP '+card.hp:'';
  return {name:card.name,type,stats,colors:cardColors[category]||cardColors.neutral};
}
function cardFrame(id,appearance,portrait){
  if(!portrait&&cardFrameCache.has(id))return cardFrameCache.get(id);
  const {name,type,stats,colors:[dark,tone,trim]}=appearance,card=Cepter.cards[id];
  const canvas=document.createElement('canvas');canvas.width=240;canvas.height=300;
  const ctx=canvas.getContext('2d');
  const fill=ctx.createLinearGradient(0,0,240,300);
  fill.addColorStop(0,tone);fill.addColorStop(.65,dark);
  ctx.fillStyle=fill;ctx.fillRect(0,0,240,300);
  ctx.strokeStyle=trim;ctx.lineWidth=2;ctx.strokeRect(7,7,226,286);
  ctx.globalAlpha=.35;ctx.strokeRect(13,13,214,274);ctx.globalAlpha=1;
  ctx.textAlign='center';ctx.textBaseline='middle';
  function text(label,y,size,width,color){
    ctx.font='700 '+size+'px system-ui,sans-serif';
    while(ctx.measureText(label).width>width&&size>14){size--;ctx.font='700 '+size+'px system-ui,sans-serif';}
    ctx.fillStyle=color;ctx.fillText(label,120,y,width);
  }
  function shape(points,color,weight=0){
    ctx.beginPath();ctx.moveTo(...points[0]);for(const point of points.slice(1))ctx.lineTo(...point);
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
    if(weight){ctx.lineWidth=weight;ctx.strokeStyle=trim;ctx.stroke();}
  }
  text(type,32,21,192,trim);
  ctx.fillStyle='#111725';ctx.fillRect(17,53,206,147);
  ctx.strokeStyle=tone;ctx.lineWidth=2;ctx.strokeRect(17,53,206,147);
  ctx.save();ctx.translate(120,126);
  ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(0,0,58,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=1;
  if(portrait){
    const scale=Math.min(158/portrait.naturalWidth,130/portrait.naturalHeight);
    const w=portrait.naturalWidth*scale,h=portrait.naturalHeight*scale;
    ctx.drawImage(portrait,-w/2,64-h,w,h);
  }else if(card.kind==='creature'){
    shape([[-42,-18],[-34,-45],[-15,-30],[15,-30],[34,-45],[42,-18],[34,22],[0,44],[-34,22]],tone,2);
    shape([[-29,-9],[-8,-5],[-17,5]],trim);
    shape([[29,-9],[8,-5],[17,5]],trim);
    shape([[-11,18],[11,18],[0,28]],trim);
  }else if(card.kind==='item'){
    shape([[-32,-40],[0,-47],[32,-40],[30,20],[0,46],[-30,20]],tone,2);
    shape([[0,-30],[10,-8],[27,0],[10,9],[0,30],[-10,9],[-27,0],[-10,-8]],trim);
  }else{
    shape([[0,-48],[14,-14],[48,0],[14,14],[0,48],[-14,14],[-48,0],[-14,-14]],tone,2);
    shape([[0,-23],[8,-8],[23,0],[8,8],[0,23],[-8,8],[-23,0],[-8,-8]],trim);
  }
  ctx.restore();
  text(name,222,22,198,'#fff4dc');
  text(stats||type,251,19,195,trim);
  text(card.cost+' G',274,17,192,'#fff4dc');
  const src=canvas.toDataURL();cardFrameCache.set(id,src);return src;
}
function cardSeal(id){
  const card=Cepter.cards[id],appearance=cardAppearance(card);
  const img=document.createElement('img');img.className='card-face';img.width=400;img.height=500;img.decoding='async';
  img.alt=[appearance.name,appearance.type,appearance.stats].filter(Boolean).join(' · ');
  const fallback=()=>{
    img.onerror=null;img.dataset.cardArt='frame';img.src=cardFrame(id,appearance);
    if(card.kind!=='creature')return;
    if(!cardPortraits.has(id)){
      const portrait=new Image();
      portrait.src=originalCreatureImage(Cepter.combo.key(card)||card.name,card.element);
      cardPortraits.set(id,portrait.decode().then(()=>cardFrame(id,appearance,portrait)).catch(()=>null));
    }
    cardPortraits.get(id).then(src=>{
      if(src){img.src=src;img.dataset.cardPortrait='ready';}
    });
  };
  // Modern faces use the edition's own printed values in an original local frame.
  if(card.editionArt||card.hasArt===false||id<13)fallback();
  else{
    img.dataset.cardArt='local';img.onerror=fallback;
    img.src=id>42?'art/cept-catalog/'+card.catalog.path+'.webp':'art/cept-card-'+id+'.webp';
  }
  return img;
}
