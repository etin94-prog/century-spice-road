const assert=require('node:assert/strict');
const C=require('../dist/cept-engine');
for(let element=0;element<4;element++){
 const s=C.start(2,2),p=s.players[0];
 const own=(i,owner,type,area)=>Object.assign(s.tiles[i],{owner,type,area,level:1,base:100,unit:owner<0?null:{id:0,hp:30}});
 own(1,0,element,0);own(2,1,element,0);own(3,0,element,1);own(4,0,(element+1)%4,0);own(5,-1,element,0);
 assert.equal(C.value(s,s.tiles[1]),100);
 p.pos=5;p.hand=[0];s.phase='land';assert.ok(C.play(s,['summon',0]));
 assert.equal(C.chain(s,s.tiles[1]),2);assert.equal(C.value(s,s.tiles[1]),150);assert.equal(C.toll(s,s.tiles[1]),30);
 assert.match(s.chainNotice,/2연쇄/);
 for(let i=6;i<=9;i++){own(i,0,element,0);assert.equal(C.value(s,s.tiles[1]),[180,200,220,220][i-6]);}
 for(let i=6;i<=9;i++)own(i,-1,element,0);
 s.turn=0;s.phase='sell';p.cash=-1;assert.ok(C.play(s,['sell',5]));assert.match(s.chainNotice,/연쇄 해제/);
 assert.equal(C.toll(s,s.tiles[1]),20);assert.equal(C.value(s,s.tiles[5]),100);
 for(const type of ['복합','무속성']){own(1,0,type,0);own(5,0,type,0);assert.equal(C.chain(s,s.tiles[1]),1);}
}
console.log('Four elements: ownership, area boundaries, multipliers, capture/release notices and non-element lands OK');
