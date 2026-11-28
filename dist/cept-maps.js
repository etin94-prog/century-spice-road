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
  const sanctuaryLoop=[[1,1],[1,2],[1,3],[1,4],[2,4],[3,4],[4,4],[4,3],[4,2],[4,1],[3,1],[2,1]];
  const sanctuaryTypes=[
    '성',0,'신전','북쪽 요새',1,'성소',2,3,'무속성',0,2,1,
    1,2,0,'성소','동쪽 요새',3,'무속성',1,2,'신전',0,3,
    0,3,2,1,'성소',3,2,0,'남쪽 요새',1,'신전','무속성',
    '다리','다리','다리','다리','다리','다리'
  ];
  const sanctuary=map('저녁별 고원 · 창작 지도',[
    ...sanctuaryLoop,...sanctuaryLoop.map(([row,col])=>[row,col+6]),...sanctuaryLoop.map(([row,col])=>[row+6,col+3]),
    [2,5],[2,6],[5,4],[6,4],[5,7],[6,7]
  ],sanctuaryTypes,[3,16,32],90,7,[
    ...[0,12,24].flatMap(offset=>loop(12).map(([a,b])=>[a+offset,b+offset])),
    [4,36],[36,37],[37,23],[6,38],[38,39],[39,24],[21,40],[40,41],[41,27]
  ],[...Array(36).keys()].map(i=>Math.floor(i/12)).concat(0,1,0,2,1,2),260);
  sagaPractice['saga-original-eveningstar']={...sanctuary,areaCount:3,section:'arena',graph:true,startCash:250,
    fortBonus:100,defaultGoal:8000,castles:[0],checkpoints:sanctuary.forts,shrineKinds:{5:'light',15:'dark',28:'light'}};
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
  const lanternMarket=map('등불 교역장 · 창작 지도',[...ring,[2,3],[3,3],[3,2],[4,2],[4,3]],
    ['성',0,1,'카드 상점','동쪽 게이트',2,3,1,0,'점술관',1,3,'서쪽 게이트',0,1,3,0,2,'카드 상점',2,3],
    [4,12],100,12,[...loop(16),[2,16],[16,17],[17,18],[18,19],[19,20],[20,10]],Array(21).fill(0));
  revoltPractice['revolt-original-lantern-market']={...lanternMarket,areaCount:1,section:'arena',graph:true,startCash:250,
    castles:[0],checkpoints:[0,4,12],gates:{0:0,4:4,12:12},gateNames:{0:'북쪽 게이트',4:'동쪽 게이트',12:'서쪽 게이트'},
    // Original sets of four offers. Nintendo's Revolt manual §37 specifies 20G for one card when stopping.
    cardShops:{3:['phlogiston','squirrine','magmahammer','windofhope'],18:['aqualing','cornfolk','stormspear','manna']}};
  revoltPractice['revolt-original-lantern-morph']={...revoltPractice['revolt-original-lantern-market'],
    name:'등불 교역장 · 풀 모프 · 창작 지도',types:lanternMarket.types.map(type=>typeof type==='number'?'모프':type)};
  const fordRing=ring.map(([row,col])=>[row+1,col+1]);
  const ford=map('돌등 여울 · 창작 지도',[
    ...fordRing,[1,2],[1,3],[1,4],[7,6],[7,5],[7,4],[3,4],[4,4],[5,4]
  ],[
    '성',1,0,2,'동쪽 요새',3,0,1,'무속성',2,3,1,'서쪽 요새',0,2,3,
    2,'신전',1,0,'성소',3,1,'점술관',2
  ],[4,12],90,8,[
    ...loop(16),[0,16],[16,17],[17,18],[18,2],
    [8,19],[19,20],[20,21],[21,10],[2,22],[22,23],[23,24],[24,10]
  ],Array(25).fill(0),240);
  const beginsPractice={'begins-original-ford':{...ford,areaCount:1,section:'arena',graph:true,startCash:250,
    fortBonus:200,defaultGoal:6000,castles:[0],checkpoints:ford.forts}};
  beginsPractice['begins-original-ford-morph']={...beginsPractice['begins-original-ford'],
    name:'돌등 여울 · 모프 · 창작 지도',
    types:ford.types.map((type,at)=>[2,6,8,14,18,22,24].includes(at)?'모프':type)};
  const tradeRoute=map('달빛 교역로 · 창작 지도',[
    ...ring,...ring.map(([row,col])=>[row,col+7]),[2,6],[2,7],[4,6],[4,7]
  ],[
    '성',0,'카드 상점',2,3,1,0,2,'동쪽 요새',3,0,1,'신전',2,3,1,
    0,1,2,3,1,2,0,3,'서쪽 요새',2,'점술관',3,0,'신전','카드 상점',1,
    '성소',1,2,'성소'
  ],[8,24],90,8,[
    ...loop(16),...loop(16).map(([a,b])=>[a+16,b+16]),
    [5,32],[32,33],[33,31],[7,34],[34,35],[35,29]
  ],Array(36).fill(0));
  beginsPractice['begins-original-moontrade']={...tradeRoute,areaCount:1,section:'arena',graph:true,startCash:250,
    fortBonus:200,defaultGoal:8000,castles:[0],checkpoints:tradeRoute.forts,
    cardShops:{2:['spear','chainmail','manna','holyword6'],30:['leatherarmor','skeleton','fly','windofhope']}};
  const handheldBend=map('솔바람 굽이 · 창작 지도',[...ring,[2,3],[3,3],[3,4],[4,4]],
    ['성',0,1,0,3,1,2,2,1,3,1,0,'남쪽 요새',2,3,0,1,2,3,0],
    [12],100,6,[...loop(16),[2,16],[16,17],[17,18],[18,19],[19,7]],Array(20).fill(0),200);
  const handheldMarket=map('물결 장터 · 창작 지도',[...ring,[2,2],[3,2],[3,3],[3,4],[4,4]],
    ['성',1,0,2,'북쪽 요새',3,1,1,2,3,0,1,'남쪽 요새',0,2,3,1,'신전',3,2,0],
    [4,12],100,8,[...loop(16),[1,16],[16,17],[17,18],[18,19],[19,20],[20,7]],Array(21).fill(0),250);
  const farRing=ring.map(([row,col])=>[row+1,col+6]);
  const twoShore=[...ring,...farRing,[3,6],[4,6]];
  const handheldShore=map('쌍안 해협 · 창작 지도',twoShore,
    ['성',1,2,0,'북쪽 요새',3,0,1,3,0,2,2,0,1,3,1,2,0,2,0,'동쪽 요새',3,1,0,1,3,2,3,0,2,1,3,1,'신전'],
    [4,20],100,9,[...loop(16),...loop(16).map(([a,b])=>[a+16,b+16]),[6,32],[32,31],[7,33],[33,30]],
    twoShore.map(([,col])=>Number(col>6)),250);
  const alderPass=map('단풍 고개 · 창작 지도',[
    [1,1],[1,2],[1,3],[1,4],[1,5],[2,5],[3,5],[4,5],[4,4],[4,3],[4,2],[4,1],[3,1],[2,1],
    [2,2],[2,3],[3,3]
  ],['성',0,1,2,'북쪽 요새',3,0,1,2,3,0,1,2,3,1,2,0],
  [4],90,6,[...loop(14),[13,14],[14,15],[15,16],[16,9]],Array(17).fill(0));
  const palmCanals=map('종려 수로 · 창작 지도',[
    ...sanctuaryLoop,...sanctuaryLoop.map(([r,c])=>[r,c+5]),[1,5],[4,5]
  ],[
    '성',1,0,2,3,'신전',1,3,0,'서쪽 요새',2,1,
    3,2,1,'동쪽 요새',0,1,2,'신전',3,1,0,2,
    0,3
  ],[9,15],100,8,[
    ...loop(12),...loop(12).map(([a,b])=>[a+12,b+12]),
    [3,24],[24,12],[6,25],[25,21]
  ],[...Array(12).fill(0),...Array(12).fill(1),0,1],250);
  const terracedValleys=map('세 고개 분지 · 창작 지도',[
    ...sanctuaryLoop,...sanctuaryLoop.map(([r,c])=>[r,c+5]),...sanctuaryLoop.map(([r,c])=>[r+5,c]),
    [2,5],[4,5],[5,2],[5,4]
  ],[
    '성',2,0,3,1,'북쪽 요새',2,0,3,1,0,2,
    3,1,3,2,0,'동쪽 요새',1,'신전',0,3,1,2,
    1,0,2,3,0,2,'남쪽 요새',1,'신전',3,2,0,
    3,1,2,0
  ],[5,17,30],100,8,[
    ...[0,12,24].flatMap(offset=>loop(12).map(([a,b])=>[a+offset,b+offset])),
    [4,36],[36,23],[6,37],[37,21],[8,38],[38,25],[6,39],[39,27]
  ],[...Array(12).fill(0),...Array(12).fill(1),...Array(12).fill(2),0,1,0,2],260);
  const handheldPractice={
    '3ds-original-bend':{...handheldBend,areaCount:1,section:'arena',graph:true,startCash:200,fortBonus:100,defaultGoal:6000},
    '3ds-original-market':{...handheldMarket,areaCount:1,section:'arena',graph:true,startCash:250,fortBonus:100,defaultGoal:7000},
    '3ds-original-shore':{...handheldShore,areaCount:2,section:'arena',graph:true,startCash:250,fortBonus:120,defaultGoal:8000},
    '3ds-original-alder-pass':{...alderPass,areaCount:1,section:'arena',graph:true,startCash:200,fortBonus:100,defaultGoal:5000},
    '3ds-original-palm-canals':{...palmCanals,areaCount:2,section:'arena',graph:true,startCash:250,fortBonus:120,defaultGoal:8000},
    '3ds-original-terraced-valleys':{...terracedValleys,areaCount:3,section:'arena',graph:true,startCash:300,fortBonus:100,defaultGoal:9000}
  };
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
    revoltPractice:{value:revoltPractice},
    beginsPractice:{value:beginsPractice},
    handheldPractice:{value:handheldPractice}
  });
  return maps;
})();
if(typeof module!=='undefined')module.exports=CepterMaps;
