importScripts('cept-cards.js','cept-stage-data.js','cept-layouts.js','cept-maps.js','cept-catalog-data.js','cept-engine.js');
self.onmessage=({data})=>{
  const {count,humans,target,map,player,opponent}=data;
  let wins=0,finished=0;
  for(let attempts=1;attempts<=160;attempts++){
    const s=Cepter.start(count,humans,target,map,player,opponent);
    for(let step=0;s.winner<0&&step<9000;step++)Cepter.play(s,Cepter.ai(s));
    if(s.winner>=0){finished++;if(s.winner===0)wins++;}
    if(attempts%40===0)postMessage({wins,finished,attempts,done:attempts===160});
  }
};
