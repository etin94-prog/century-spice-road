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
  const eastRing=ring.map(([row,col])=>[row,col+6]);
  const crosswindTypes=[
    '성','모프',2,0,'북쪽 요새','전송진',1,'강제 전송진',3,3,0,'분수','남쪽 요새',2,'신전',0,
    '점술관',0,2,1,'동쪽 요새',3,1,'신전',2,0,3,'강제 전송진','모프','전송진',3,0
  ];
  const crosswind=map('쌍류의 관문 · 창작 지도',[...ring,...eastRing],crosswindTypes,[4,12,20],100,7,
    [...loop(16),...loop(16).map(([a,b])=>[a+16,b+16])],crosswindTypes.map((_,at)=>Number(at>=16)),250);
  const sagaPractice={'saga-original-crosswind':{...crosswind,areaCount:2,section:'arena',graph:true,startCash:250,fortBonus:100,
    castles:[0],checkpoints:crosswind.forts,transit:{5:24,7:18,27:2,29:8}}};
  const trapway=map('메아리 수로 · 창작 지도',[...ring,[2,3],[3,3],[4,3]],
    ['성',0,1,2,'동쪽 게이트',1,0,3,2,'마력 트랩',0,3,'서쪽 게이트',2,3,1,'마력 트랩',2,1],
    [4,12],100,12,[...loop(16),[2,16],[16,17],[17,18],[18,10]],Array(19).fill(0));
  const revoltPractice={'revolt-original-trapway':{...trapway,areaCount:1,section:'arena',graph:true,startCash:200,
    castles:[0],checkpoints:[0,4,12],gates:{0:0,4:4,12:12},gateNames:{0:'북쪽 게이트',4:'동쪽 게이트',12:'서쪽 게이트'}}};
  const watchpost=map('서풍 초소 · 창작 지도',[...ring,[2,2],[3,2],[3,3],[3,4],[4,4]],
    ['성',0,1,0,'동쪽 게이트',2,3,1,0,1,0,3,'서쪽 게이트',2,3,1,3,0,'사령탑',2,1],
    [4,12],100,12,[...loop(16),[1,16],[16,17],[17,18],[18,19],[19,20],[20,7]],Array(21).fill(0));
  revoltPractice['revolt-original-watchpost']={...watchpost,areaCount:1,section:'arena',graph:true,startCash:250,
    castles:[0],checkpoints:[0,4,12],gates:{0:0,4:4,12:12},gateNames:{0:'북쪽 게이트',4:'동쪽 게이트',12:'서쪽 게이트'}};
  const switchyard=map('갈래바람 회랑 · 창작 지도',[...ring,[2,2],[3,2],[3,3],[4,3],[4,4]],
    ['성','분기 스위치',1,3,'동쪽 게이트',2,0,'분기 스위치',2,3,1,0,'서쪽 게이트',1,3,2,1,2,0,3,2],
    [4,12],100,12,[...loop(16),[1,16],[16,17],[17,18],[18,19],[19,20],[20,7]],Array(21).fill(0));
  revoltPractice['revolt-original-switchyard']={...switchyard,areaCount:1,section:'arena',graph:true,startCash:250,
    pathSwitches:{1:[0,2,16],7:[6,8,20]},castles:[0],checkpoints:[0,4,12],gates:{0:0,4:4,12:12},
    gateNames:{0:'북쪽 게이트',4:'동쪽 게이트',12:'서쪽 게이트'}};
  const gemRoute=map('청람 교역로 · 창작 지도',[...ring,[3,4],[3,3],[3,2]],
    ['성',1,1,3,'동쪽 게이트',0,0,1,3,'보석 상점',2,1,'서쪽 게이트',2,3,0,3,'보석 상점',2],
    [4,12],100,12,[...loop(16),[6,16],[16,17],[17,18],[18,14]],Array(19).fill(0));
  revoltPractice['revolt-original-gem-route']={...gemRoute,areaCount:1,section:'arena',graph:true,gemStore:true,startCash:300,
    castles:[0],checkpoints:[0,4,12],gates:{0:0,4:4,12:12},gateNames:{0:'북쪽 게이트',4:'동쪽 게이트',12:'서쪽 게이트'}};
  const circleCourt=map('별빛 제단 · 창작 지도',[...ring,[3,2],[3,3],[3,4],[2,3],[4,3]],
    ['성',0,1,1,'동쪽 게이트',3,0,2,1,3,0,1,'서쪽 게이트',2,3,0,2,'마법진',1,'마법진',3],
    [4,12],100,12,[...loop(16),[14,16],[16,17],[17,18],[18,6],[2,19],[19,17],[17,20],[20,10]],Array(21).fill(0));
  revoltPractice['revolt-original-circle-court']={...circleCourt,areaCount:1,section:'arena',graph:true,startCash:250,
    castles:[0],checkpoints:[0,4,12],gates:{0:0,4:4,12:12},gateNames:{0:'북쪽 게이트',4:'동쪽 게이트',12:'서쪽 게이트'}};
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
  Object.defineProperties(maps,{
    sagaPractice:{value:sagaPractice},
    revoltPractice:{value:revoltPractice}
  });
  return maps;
})();
if(typeof module!=='undefined')module.exports=CepterMaps;
