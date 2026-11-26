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
  if(id>42)return cardSeal(id);
  return figure(id<8?18+id:4+id-13,Cepter.cards[id].name);
}
function cardSeal(id){
  const c=Cepter.cards[id];
  if(c.firstArt){
    const img=document.createElement('img');img.className='card-face';img.alt=c.catalog.name;img.width=400;img.height=500;
    img.src='https://culdceptcentral.com/images/cards_sm/ceps1/'+c.firstArt+'.jpg';
    img.onerror=()=>{img.onerror=null;if(c.hasArt)img.src=id>42?'art/cept-catalog/'+c.catalog.path+'.webp':'art/cept-card-'+id+'.webp';};
    return img;
  }
  if(c.hasArt===false){const face=document.createElement('span');face.className='custom-face';face.textContent=c.catalog.name;return face;}
  if(id>=13){
    const img=document.createElement('img');
    img.className='card-face';img.src=id>42?'art/cept-catalog/'+c.catalog.path+'.webp':'art/cept-card-'+id+'.webp';
    img.alt=c.name+' 카드';img.width=400;img.height=500;img.decoding='async';
    return img;
  }
  const face=figure(id<8?18+id:[26,27,28,28,29][id-8],c.name);
  face.classList.add('custom-face');return face;
}