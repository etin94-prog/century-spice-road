"use strict";
// Printed card faces for the Catan table: resource cards, development and
// progress cards, and face-down piles. All art is drawn here as inline SVG
// symbols (one shared sprite), so a card costs a <use> and no image request.
const CatanCards=(()=>{
  const ns='http://www.w3.org/2000/svg';
  const ear='<g id="ccEar"><ellipse rx="3.1" ry="8" fill="#f7d265" stroke="#a5752a" stroke-width=".9"/><path d="M-2.4-4.5 0-2.6 2.4-4.5M-2.9-.6 0 1.4 2.9-.6M-2.5 3.4 0 5.2 2.5 3.4" stroke="#b8862f" stroke-width=".75" fill="none"/></g>';
  const coin=(x,y)=>`<ellipse cx="${x}" cy="${y+1.8}" rx="10.5" ry="3.8" fill="#9c6a1c"/><ellipse cx="${x}" cy="${y}" rx="10.5" ry="3.8" fill="#efc456" stroke="#9a6b1a" stroke-width=".8"/>`;
  const resources=[
    // 0 lumber: pine ridge and a stack of cut logs
    `<linearGradient id="ccg0" x2="0" y2="1"><stop offset="0" stop-color="#b9d68f"/><stop offset=".5" stop-color="#6c9a4c"/><stop offset="1" stop-color="#34592c"/></linearGradient>
     <rect width="60" height="60" fill="url(#ccg0)"/><path d="M0 33Q14 25 30 30T60 27V60H0Z" fill="#2c5329" opacity=".6"/>
     <path d="M16 6 24 19H20.5L26 29H21.5L27.5 40H4.5L10.5 29H6L11.5 19H8Z" fill="#1d4527"/><path d="M16 6 24 19H20.5L26 29H21.5L27.5 40H16Z" fill="#163a20"/><rect x="14.6" y="39" width="3" height="6" fill="#5b3a1e"/>
     <path d="M45 12 51 22H48.5L53 31H49.5L54 39H36L40.5 31H37L41.5 22H39Z" fill="#24502c"/><rect x="43.6" y="38" width="2.8" height="5" fill="#5b3a1e"/>
     <ellipse cx="38" cy="56" rx="20" ry="3" fill="#0003"/>
     <path d="M22 44H36V57H22Z" fill="#8a5a2b"/><path d="M28.5 33.3H38V46H28.5Z" fill="#9a6532"/>
     ${[[30,50.5],[42.5,50.5],[36.25,39.7]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6.2" fill="#e0b777" stroke="#74461f" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="3.4" fill="none" stroke="#b07b42" stroke-width=".9"/><circle cx="${x}" cy="${y}" r=".9" fill="#8a5a2b"/>`).join('')}`,
    // 1 brick: a kiln-fired stack against an evening sky
    `<linearGradient id="ccg1" x2="0" y2="1"><stop offset="0" stop-color="#f7c58f"/><stop offset=".55" stop-color="#d9844f"/><stop offset="1" stop-color="#8f3f25"/></linearGradient>
     <rect width="60" height="60" fill="url(#ccg1)"/><circle cx="46" cy="13" r="6" fill="#fde7b5" opacity=".8"/><path d="M0 40Q20 33 38 37T60 34V60H0Z" fill="#7d3a22" opacity=".45"/>
     <ellipse cx="30" cy="56.5" rx="24" ry="2.6" fill="#0004"/>
     ${[[4,6.5,49],[3,12.5,42],[2,18.5,35],[1,24.5,28]].map(([n,x0,y])=>Array.from({length:n},(_,k)=>{const x=x0+k*12;return `<rect x="${x}" y="${y}" width="11.4" height="6.6" rx=".8" fill="#ad4429" stroke="#5e2213" stroke-width=".8"/><rect x="${x+.8}" y="${y+.6}" width="9.8" height="1.6" fill="#e48b5c"/>`;}).join('')).join('')}`,
    // 2 wool: a sheep on a spring meadow
    `<linearGradient id="ccg2" x2="0" y2="1"><stop offset="0" stop-color="#e8f4c6"/><stop offset=".5" stop-color="#a9cf78"/><stop offset="1" stop-color="#5f9140"/></linearGradient>
     <rect width="60" height="60" fill="url(#ccg2)"/><path d="M0 30Q18 22 34 28T60 24V60H0Z" fill="#7fb055" opacity=".6"/>
     <ellipse cx="30" cy="51.5" rx="19" ry="3" fill="#0003"/>
     ${[19,24.5,34,39.5].map(x=>`<rect x="${x}" y="40" width="2.8" height="11" rx="1" fill="#3a3230"/>`).join('')}
     ${[[19,31,8],[28,26,9.5],[37,30,8.5],[23,38,8],[34,38,8.5],[14,36,6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fffaf0" stroke="#cbbfa6" stroke-width="1"/>`).join('')}
     <circle cx="28" cy="32" r="9" fill="#fffaf0"/><ellipse cx="47" cy="28" rx="5.2" ry="6.6" fill="#3a3230" transform="rotate(18 47 28)"/><ellipse cx="43" cy="22.5" rx="3.2" ry="1.6" fill="#3a3230" transform="rotate(-25 43 22.5)"/><circle cx="48.5" cy="26.5" r="1" fill="#f3ead6"/>`,
    // 3 grain: a tied sheaf in a ripe field
    `<linearGradient id="ccg3" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".55" stop-color="#eec258"/><stop offset="1" stop-color="#b9812c"/></linearGradient>
     <rect width="60" height="60" fill="url(#ccg3)"/><path d="M0 44Q30 38 60 44V60H0Z" fill="#a8742a" opacity=".5"/><ellipse cx="30" cy="55" rx="16" ry="2.6" fill="#0003"/>
     <g stroke="#93702a" stroke-width="1.4" fill="none">${[[-14,18],[-8,13],[-3,10],[3,10],[8,13],[14,18],[0,8]].map(([dx,y])=>`<path d="M30 46Q${30+dx*.35} 32 ${30+dx} ${y+8}"/>`).join('')}${[-6,-3,0,3,6].map(dx=>`<path d="M30 40L${30+dx} 54"/>`).join('')}</g>
     ${[[-14,18,-30],[-8,13,-18],[-3,10,-7],[3,10,7],[8,13,18],[14,18,30],[0,8,0]].map(([dx,y,a])=>`<use href="#ccEar" transform="translate(${30+dx} ${y}) rotate(${a})"/>`).join('')}
     <rect x="24.5" y="38" width="11" height="4" rx="1" fill="#9b3d22" stroke="#5e2213" stroke-width=".7"/>`,
    // 4 ore: a broken rock pile under a snow peak
    `<linearGradient id="ccg4" x2="0" y2="1"><stop offset="0" stop-color="#d4dde6"/><stop offset=".5" stop-color="#8d9aa8"/><stop offset="1" stop-color="#46525e"/></linearGradient>
     <rect width="60" height="60" fill="url(#ccg4)"/><path d="M0 38 13 22 22 31 35 11 49 28 60 21V60H0Z" fill="#56626e"/><path d="M35 11 30 18 34 17.4 37 20.5 40 16.5Z" fill="#f1f4f6"/><path d="M35 11 49 28 60 21V60H40Z" fill="#46515c"/>
     <ellipse cx="30" cy="56" rx="26" ry="3" fill="#0004"/>
     <path d="M5 55 11 41 24 36 31 46 27 56Z" fill="#7b8693"/><path d="M11 41 24 36 20 44Z" fill="#b9c3cd"/><path d="M20 44 31 46 27 56Z" fill="#5f6976"/>
     <path d="M25 57 31 42 44 37 55 48 51 57Z" fill="#69737f"/><path d="M31 42 44 37 40 47Z" fill="#a8b3be"/><path d="M40 47 55 48 51 57Z" fill="#525c67"/>
     <path d="M37 45 40 40.5 43 45 40 49Z" fill="#cfe6f4" stroke="#7fa3bb" stroke-width=".6"/><path d="M15 47 17 44 19 47 17 50Z" fill="#cfe6f4" stroke="#7fa3bb" stroke-width=".6"/>`,
    // 5 cloth: an unrolled bolt of striped cloth
    `<linearGradient id="ccg5" x2="0" y2="1"><stop offset="0" stop-color="#cdb5ea"/><stop offset=".5" stop-color="#8a6bc0"/><stop offset="1" stop-color="#4b3680"/></linearGradient>
     <rect width="60" height="60" fill="url(#ccg5)"/><ellipse cx="30" cy="55" rx="22" ry="3" fill="#0004"/>
     <path d="M14 26H46L49 50Q40 46 31 50T12 50Z" fill="#ecc75e" stroke="#9a6f1f" stroke-width=".8"/><path d="M13.4 33H46.6M12.8 40H47.6" stroke="#b0462f" stroke-width="2.2"/><path d="M13.2 36H47M12.6 43.5H48" stroke="#3f5f9a" stroke-width="1"/>
     <rect x="13" y="10" width="34" height="17" fill="#e9c15a" stroke="#9a6f1f" stroke-width=".8"/><path d="M13 15H47M13 21H47" stroke="#b0462f" stroke-width="2"/>
     <ellipse cx="13" cy="18.5" rx="4.6" ry="8.5" fill="#c99a32" stroke="#8a5f17" stroke-width=".8"/><ellipse cx="13" cy="18.5" rx="2.2" ry="4.2" fill="none" stroke="#8a5f17" stroke-width=".7"/><ellipse cx="47" cy="18.5" rx="4.6" ry="8.5" fill="#f2d27a" stroke="#9a6f1f" stroke-width=".8"/>`,
    // 6 paper: an inked scroll
    `<linearGradient id="ccg6" x2="0" y2="1"><stop offset="0" stop-color="#cfe6f0"/><stop offset=".5" stop-color="#7fb0c6"/><stop offset="1" stop-color="#3d6c84"/></linearGradient>
     <rect width="60" height="60" fill="url(#ccg6)"/><ellipse cx="30" cy="55" rx="22" ry="3" fill="#0004"/>
     <rect x="13" y="12" width="34" height="37" fill="#f6eaca" stroke="#a68a52" stroke-width=".8"/>
     <g stroke="#5d4c33" stroke-width="1.3" stroke-linecap="round">${[[19,41,20],[19,37,25],[19,42,30],[19,33,35],[19,39,40]].map(([a,b,y])=>`<path d="M${a} ${y}H${b}"/>`).join('')}</g>
     <rect x="9" y="7" width="42" height="7.5" rx="3.75" fill="#e3cf9f" stroke="#8f7240" stroke-width=".9"/><rect x="9" y="46" width="42" height="7.5" rx="3.75" fill="#e3cf9f" stroke="#8f7240" stroke-width=".9"/><circle cx="46" cy="43" r="3" fill="#a8362a"/>`,
    // 7 coin: stacked coins and one standing piece
    `<linearGradient id="ccg7" x2="0" y2="1"><stop offset="0" stop-color="#9fbf97"/><stop offset=".5" stop-color="#557a58"/><stop offset="1" stop-color="#26402c"/></linearGradient>
     <rect width="60" height="60" fill="url(#ccg7)"/><ellipse cx="30" cy="55" rx="25" ry="3" fill="#0004"/>
     ${[50,46.5,43,39.5,36].map(y=>coin(19,y)).join('')}${[50,46.5,43].map(y=>coin(41,y)).join('')}
     <circle cx="38" cy="25" r="10" fill="#b37b22"/><circle cx="36.5" cy="24" r="10" fill="#f3cd60" stroke="#9a6b1a" stroke-width=".9"/><circle cx="36.5" cy="24" r="6.6" fill="none" stroke="#b5832a" stroke-width="1"/><path d="M36.5 19.5 40.4 21.75V26.25L36.5 28.5 32.6 26.25V21.75Z" fill="#d9a63e" stroke="#9a6b1a" stroke-width=".7"/>`
  ];
  const star='20,7 23.23,15.55 32.36,15.98 25.23,21.7 27.64,30.52 20,25.5 12.36,30.52 14.77,21.7 7.64,15.98 16.77,15.55';
  // Development cards (knight, point, road building, discovery, monopoly) and the three progress tracks.
  const emblems={
    knight:['#8f3a2a','#c9634a','<path d="M20 5 33 10V20Q33 31 20 36 7 31 7 20V10Z" fill="#b8452e" stroke="#4d1a10" stroke-width="1.4"/><path d="M20 5V36Q7 31 7 20V10Z" fill="#9c3624"/><path d="M11.5 17.5 20 24.5 28.5 17.5" stroke="#f3e2b8" stroke-width="3.2" fill="none" stroke-linejoin="round"/>'],
    point:['#7a5a17','#d6a83c',`<circle cx="20" cy="20" r="15" fill="none" stroke="#3f6a34" stroke-width="2" stroke-dasharray="4 2.2"/><polygon points="${star}" fill="#f0c24e" stroke="#7a5512" stroke-width="1.2" stroke-linejoin="round"/>`],
    road:['#5b4a35','#8e7756','<path d="M3 30Q20 24 37 30V37H3Z" fill="#7aa255"/><path d="M15.5 4H24.5L35 38H5Z" fill="#6b5a49" stroke="#3b2f24" stroke-width="1"/><path d="M20 7V12M20 16V22M20 26V34" stroke="#f4e3b2" stroke-width="2"/>'],
    plenty:['#3f6a34','#6f9a4c','<path d="M13 15Q20 11 27 15L31 33Q20 38 9 33Z" fill="#c99d5e" stroke="#6c4a22" stroke-width="1.2"/><path d="M13.5 15.5Q20 19 26.5 15.5" fill="none" stroke="#6c4a22" stroke-width="1"/><rect x="15" y="9" width="10" height="4" rx="1.5" fill="#9b3d22"/><path d="M31 6 32.3 9.7 36 11 32.3 12.3 31 16 29.7 12.3 26 11 29.7 9.7Z" fill="#fff2b8"/>'],
    monopoly:['#4e3576','#8a6bc0','<path d="M7 29 9 12 15.5 19.5 20 9 24.5 19.5 31 12 33 29Z" fill="#e8b947" stroke="#6f4e12" stroke-width="1.2" stroke-linejoin="round"/><rect x="7" y="29" width="26" height="5" rx="1" fill="#c9952f" stroke="#6f4e12" stroke-width="1"/><circle cx="20" cy="22.5" r="2.4" fill="#b0462f"/>'],
    trade:['#7a5a17','#d6a83c','<path d="M20 7V32M10 12H30" stroke="#5a3d14" stroke-width="2"/><path d="M10 12 5 23H15ZM30 12 25 23H35Z" fill="none" stroke="#5a3d14" stroke-width="1.2"/><path d="M4.5 23Q10 28 15.5 23ZM24.5 23Q30 28 35.5 23Z" fill="#e8b947" stroke="#6f4e12"/><rect x="13" y="32" width="14" height="3.5" rx="1" fill="#5a3d14"/>'],
    science:['#2f5d33','#4e9a52','<path d="M16 6H24M17.5 6V15L8 32Q7 35 10.5 35H29.5Q33 35 32 32L22.5 15V6" fill="#e8f2e2" stroke="#244a29" stroke-width="1.4" stroke-linejoin="round"/><path d="M11.5 27H28.5L31 32.5Q31.4 34 29.5 34H10.5Q8.6 34 9 32.5Z" fill="#59b6a0"/><circle cx="18" cy="30" r="1.4" fill="#e8f2e2"/><circle cx="23" cy="28.5" r="1" fill="#e8f2e2"/>'],
    politics:['#25466f','#3f6fb0','<path d="M9 35V14H13V17H17V14H23V17H27V14H31V35Z" fill="#d9d2c0" stroke="#33302a" stroke-width="1.2"/><path d="M17.5 35V27Q20 24 22.5 27V35Z" fill="#33302a"/><path d="M20 14V4" stroke="#33302a" stroke-width="1.2"/><path d="M20 4H28L26 6.5 28 9H20Z" fill="#b0462f"/>']
  };
  const devKinds=['knight','point','road','plenty','monopoly'],trackKinds=['trade','science','politics'];
  function sprite(){
    if(document.getElementById('ccSprite'))return;
    const svg=document.createElementNS(ns,'svg');
    svg.id='ccSprite';svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
    svg.innerHTML='<defs>'+ear+
      '<pattern id="ccHex" width="10" height="17.32" patternUnits="userSpaceOnUse"><path d="M5 0 10 2.89V8.66L5 11.55 0 8.66V2.89ZM0 14.43 5 17.32" fill="none" stroke="#e9d6a4" stroke-opacity=".28" stroke-width=".8"/></pattern></defs>'+
      resources.map((body,r)=>`<symbol id="ccRes${r}" viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice">${body}</symbol>`).join('')+
      Object.entries(emblems).map(([k,[,,body]])=>`<symbol id="ccEm-${k}" viewBox="0 0 40 40">${body}</symbol>`).join('')+
      '<symbol id="ccBack" viewBox="0 0 50 70" preserveAspectRatio="xMidYMid slice"><rect width="50" height="70" fill="#174c4e"/><rect width="50" height="70" fill="url(#ccHex)"/><rect x="3.5" y="3.5" width="43" height="63" rx="3" fill="none" stroke="#e9d6a4" stroke-width="1.2"/><path d="M25 22 35 27.8V39.2L25 45 15 39.2V27.8Z" fill="#103a3c" stroke="#e9d6a4" stroke-width="1.4"/><circle cx="25" cy="33.5" r="4" fill="#e9b949"/></symbol>';
    document.body.prepend(svg);
  }
  const art=(id,cls)=>`<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;
  function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
  function faceHTML(art,name,n,extra=''){
    // `extra` (the "new" sticker) sits on the card, outside the clipped face, so it never covers the art.
    return `<span class="ccFace tt-card tt-tilt"${n>1?` data-stack="${Math.min(3,n-1)}"`:''}><span class="ccArt">${art}</span><span class="ccName"${name.replace(/\s/g,'').length>3?' data-long':''}><span>${name}</span></span></span>${extra}`+(n==null?'':`<b class="ccCount" aria-hidden="true">${n}</b>`);
  }
  // A resource card (or a stack of them). `n` is the count held; null hides the badge.
  function resource(r,name,n,tag='div'){
    sprite();
    const card=el(tag,'ccCard',faceHTML(art('ccRes'+r,'ccPic'),name,n));
    card.dataset.res=r;
    if(n===0)card.classList.add('ccEmpty');
    if(tag==='div'){card.setAttribute('role','img');card.setAttribute('aria-label',n==null?name:name+' '+n+'장');}
    return card;
  }
  function emblemCard(kind,title,n,{fresh=0,label}={}){
    sprite();
    const [ink,band]=emblems[kind];
    const card=el('div','ccCard ccDev',faceHTML(art('ccEm-'+kind,'ccEmblem'),title,n,fresh?'<i class="ccFresh" aria-hidden="true">새</i>':''));
    card.style.setProperty('--cc-ink',ink);card.style.setProperty('--cc-band',band);
    card.setAttribute('role','img');card.setAttribute('aria-label',label||title+' '+n+'장');
    return card;
  }
  // A face-down pile with its thickness and remaining count. An empty pile (or an
  // empty hidden hand) is drawn as a dashed place on the table, without a back or badge.
  // `caption` is only shown for the hidden hand, where the pile stands for cards in hand.
  function pile(count,label,tint,caption=''){
    sprite();
    const card=el('div','ccCard ccPile',count
      ?`<span class="ccFace ccBack tt-pile">${art('ccBack','ccPic')}</span><b class="ccCount" aria-hidden="true">${count}</b>`
      :'<span class="ccSlot"></span>');
    if(caption)card.append(el('small','',caption));
    if(card.lastChild.tagName==='SMALL')card.lastChild.setAttribute('aria-hidden','true');
    if(tint)card.style.setProperty('--cc-band',tint);
    card.setAttribute('role','img');card.setAttribute('aria-label',label+' '+count+'장'+(caption?'':' 남음'));
    return card;
  }
  // The hand of one player, one card per resource type. Counts that grew since the
  // last render of the same seat play the landing motion once.
  let last=null;
  function hand(box,counts,names,seat){
    const prev=last&&last.seat===seat?last.counts:null;
    const row=counts.map((n,r)=>{
      const card=resource(r,names[r],n);
      if(prev&&n>prev[r])card.classList.add('ccLanding');
      return card;
    });
    last={seat,counts:[...counts]};
    box.setAttribute('aria-label','보유 자원 · '+counts.map((n,r)=>names[r]+' '+n).join(', '));
    box.replaceChildren(...row);
  }
  function forget(){last=null;}
  return {resource,emblemCard,pile,hand,forget,devKinds,trackKinds,sprite};
})();
