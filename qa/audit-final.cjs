const assert=require('node:assert/strict');

// Cross-check settlement from the physical components, independently of the UI scorer.
module.exports=function auditFinal(board,seats,ranks){
  const mode=board.combo||board.edition||1;
  const sum=values=>values.reduce((a,b)=>a+b,0);
  assert(board.over);assert.equal(board.turn,0);assert.equal(board.players.length,seats);
  const target=mode===1?(seats===4?5:6):[2,12].includes(mode)?4:8;
  assert.equal(Math.max(...board.players.map(p=>p.won.length)),target);
  const scores=board.players.map((p,i)=>{
    assert(p.bag.every(n=>Number.isInteger(n)&&n>=0));
    assert(sum(p.bag)<=10+3*(p.bonus||[]).filter(b=>b==='cargo').length);
    let points=sum(p.bag.slice(1))+sum(p.won.map(c=>mode===1?c.vp:c[1]));
    if(mode===1)return points+p.gold*3+p.silver;
    if([2,12,123].includes(mode)){
      const islands=board.islands||board.tiles;
      const values=mode===2?Array(4).fill([0,1,2,2,3]):mode===12?Array(4).fill([1,2,2,3]):[[1,1,2],[1,1,3],[1,2,3],[1,2,3]];
      p.tracks.forEach((built,suit)=>{
        assert.equal(built,islands.filter(t=>t.suit===suit&&t.owners?.includes(i)).length);
        points+=sum(values[suit].slice(0,built));
      });
    }
    const icons=[0,0,0,0];
    if([3,13,123].includes(mode)){
      const placed=sum(board.tiles.filter(t=>t.occupant?.seat===i).map(t=>t.occupant.n));
      assert.equal(p.ready+placed+sum((p.route||[]).map(r=>r.workers)),p.crew);
      assert(p.crew<=12&&p.ready>=0);
      for(const c of p.won)icons[c[2]]++;
      for(const tile of p.explored){
        if(tile==='points')points+=3;
        if(tile.startsWith('icon'))icons[Number(tile.slice(-1))]++;
      }
    }
    for(const tile of p.bonus){
      if(typeof tile==='number'){points+=tile;continue;}
      if(tile==='upgrade')points+=2;
      if(tile==='harvest')points+=1;
      if(tile==='fixed')points+=3;
      if(tile==='four')points+=4;
      if(tile==='crew')points+=Math.floor(p.crew/2);
      if(tile==='cards')points+=2*Math.floor((p.discards.length+p.route.length)/2);
      if(tile.startsWith('icon'))points+=2*icons[Number(tile.slice(-1))];
      if(/^(pair|triple)/.test(tile)){
        const needed=tile.replace(/\D/g,'').split('').map(Number),left=icons.slice();
        for(;;){
          for(const icon of needed)left[icon]--;
          if(left.some(n=>n<0))break;
          points+=needed.length===2?3:needed.includes(3)?5:4;
        }
      }
    }
    return points;
  });
  const expected=scores.map((points,i)=>({i,points})).sort((a,b)=>b.points-a.points||b.i-a.i);
  assert.deepEqual(ranks.map(({i,points})=>({i,points})),expected);
};
