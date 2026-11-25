importScripts('cept-archive-data.js','cept-books.js','cept-cards.js','cept-stage-data.js','cept-layouts.js','cept-maps.js','cept-catalog-data.js','cept-combo-rules.js','cept-engine.js');
self.onmessage=({data})=>{
  const {count,humans,target,map,player,opponent,aiLevel,alliance}=data;
  const wins=Array(count).fill(0),finished=Array(count).fill(0);
  for(let sample=1;sample<=160;sample++){
    for(let seat=0;seat<count;seat++){
      const s=Cepter.start(count,humans,target,map,player,opponent,aiLevel,alliance);
      if(seat){
        // Rotate whole seats, including their decks and decision policies. The opening draw belongs to seat zero.
        s.players[0].book.push(s.players[0].hand.pop());
        s.players.unshift(...s.players.splice(count-seat));
        s.players[0].hand.push(s.players[0].book.pop());
      }
      for(let step=0;s.winner<0&&step<9000;step++)Cepter.play(s,Cepter.ai(s));
      if(s.winner>=0){finished[seat]++;if(Cepter.allied(s,s.winner,seat))wins[seat]++;}
    }
    if(sample%40===0)postMessage({wins,finished,sample,done:sample===160});
  }
};
