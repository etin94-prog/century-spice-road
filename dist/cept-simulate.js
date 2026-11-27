if(new URLSearchParams(location.search).get('edition')==='3ds')importScripts('cept-edition-data-2012.js');
importScripts('cept-archive-data.js','cept-books.js','cept-cards.js','cept-stage-data.js','cept-layouts.js','cept-maps.js','cept-catalog-data.js','cept-combo-rules.js','cept-edition-data.js','cept-edition-data-modern.js','cept-editions.js','cept-shops.js','cept-extra-spells.js','cept-saga-shrines.js','cept-extra-battle.js','cept-match-record.js','cept-engine.js');
self.onmessage=({data})=>{
  const {count,humans,target,map,player,opponent,aiLevel,alliance,roundLimit,suddenDeath}=data;
  const wins=Array(count).fill(0),finished=Array(count).fill(0);
  for(let sample=1;sample<=160;sample++){
    for(let seat=0;seat<count;seat++){
      const s=Cepter.start(count,humans,target,map,player,opponent,aiLevel,alliance,roundLimit);
      Cepter.configureMatch(s,{suddenDeath});
      if(seat){
        // Rotate whole seats, including their decks and decision policies. The opening draw belongs to seat zero.
        s.players[0].book.push(s.players[0].hand.pop());
        s.players.unshift(...s.players.splice(count-seat));
        s.players[0].hand.push(s.players[0].book.pop());
      }
      for(let step=0;s.phase!=='over'&&step<9000;step++)Cepter.play(s,Cepter.ai(s));
      // A tied round limit is a finished match that nobody won.
      if(s.phase==='over'){finished[seat]++;if(Cepter.outcome(s).winners.includes(seat))wins[seat]++;}
    }
    if(sample%40===0)postMessage({wins,finished,sample,done:sample===160});
  }
};
