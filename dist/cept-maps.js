const CepterMaps=(()=>{
  const ring=[[1,1],[1,2],[1,3],[1,4],[1,5],[2,5],[3,5],[4,5],[5,5],[5,4],[5,3],[5,2],[5,1],[4,1],[3,1],[2,1]];
  function map(name,position,types,forts,base,die,edges,areas,bonus=200){
    const links=position.map(()=>[]);
    for(const [a,b] of edges){links[a].push(b);links[b].push(a);}
    return {name,position,types,forts,base,die,links,areas,bonus,rows:Math.max(...position.map(p=>p[0])),cols:Math.max(...position.map(p=>p[1]))};
  }
  const loop=n=>Array.from({length:n},(_,i)=>[i,(i+1)%n]);
  const types=['성',0,1,2,'북쪽 요새',3,0,1,2,3,0,1,'남쪽 요새',2,3,0];
  const classic=map('두 요새의 회랑',ring,types,[4,12],80,6,loop(16),types.map(()=>0));
  const market=map('쌍문 신전 · 창작 지도',[...ring,[2,3],[3,3],[4,3]], [...types,1,'신전',2],[4,12],100,6,
    [...loop(16),[2,16],[16,17],[17,18],[18,10]], [...ring,[2,3],[3,3],[4,3]].map(([,col])=>col>=4?1:0));
  const dunnanPositions=[[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[2,6],[3,6],[4,6],[5,6],[5,5],[5,4],[5,3],[5,2],[5,1],[4,1],[3,1],[2,1]];
  const dunnan=map('듀난',dunnanPositions,['성',2,2,2,2,3,3,3,3,'남쪽 요새',0,0,0,0,1,1,1,1],[9],80,6,loop(18),Array(18).fill(0));
  dunnan.fortBonus=100;
  // These routes belong to the local campaign.
  const campaignMaps={
    'campaign-reef':map('유리여울',ring,['성',1,1,'무속성','북쪽 요새',3,3,1,1,2,2,3,'남쪽 요새',0,0,2],[4,12],90,6,loop(16),ring.map(()=>0)),
    'campaign-watch':map('바람 감시령',ring,['성',3,3,2,'북쪽 요새',2,0,'복합',3,3,0,0,'남쪽 요새',1,1,2],[4,12],100,6,[...loop(16),[3,11],[7,15]],ring.map(()=>0),240),
    'campaign-lantern':map('등불 군도',[...ring,[2,3],[3,3],[4,3]],
      ['성',1,3,3,'북쪽 요새',0,0,2,2,1,3,3,'남쪽 요새',2,0,1,1,'신전',2],[4,12],110,7,
      [...loop(16),[2,16],[16,17],[17,18],[18,10],[6,17],[14,17]],
      [...ring,[2,3],[3,3],[4,3]].map(([,col])=>col>3?1:0),260),
  };
  campaignMaps['campaign-lantern'].areaCount=2;
  const stages=typeof module==='undefined'?CepterStages:require('./cept-stage-data.js');
  const maps={classic,dunnan,market,...campaignMaps};
  const layouts=typeof module==='undefined'?CepterLayouts:require('./cept-layouts.js');
  // PS2 story battle goals, in archive map order. Other maps use the free-match goal.
  const storyGoals=[5000,6000,6000,8000,8000,8000,9000,9000,9000,8000,9000,9000,9000,9000,10000,12000];
  function playable(stage){
    const links=stage.position.map(()=>[]);
    for(const [a,b] of stage.edges){links[a].push(b);links[b].push(a);}
    const checkpoints=stage.forts.filter((n,i,forts)=>forts.findIndex(k=>stage.types[k]===stage.types[n])===i);
    const castles=stage.types.flatMap((type,i)=>type==='성'?[i]:[]);
    return {...stage,storyGoal:storyGoals[stage.stage-1],links,checkpoints,castles,base:80,bonus:200,fortBonus:stage.stage===1?100:50};
  }
  for(const stage of stages){
    maps['legacy-ps2-'+stage.stage]=playable(stage);
    maps['ps2-'+stage.stage]=playable({...stage,...layouts[stage.stage-1]});
  }
  return maps;
})();
if(typeof module!=='undefined')module.exports=CepterMaps;
