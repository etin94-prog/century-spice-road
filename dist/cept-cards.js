// PS2 Second Expansion, fire/earth starter book. IDs follow the original web set.
const CepterCards=(()=>{
  const unit=(name,element,st,hp,cost,props={})=>({kind:'creature',name,element,st,hp,cost,copies:2,...props});
  const gear=(name,category,st,hp,cost,copies=2,effect='')=>({kind:'item',name,category,st,hp,cost,copies,effect});
  const spell=(name,effect,cost,copies=2)=>({kind:'spell',name,effect,cost,copies});
  return [
    unit('자이언트 랫',-1,20,10,0,{first:true,ban:['scroll']}),
    unit('울프',-1,20,40,10,{ban:['scroll']}),unit('고블린',-1,20,30,0),unit('파이터',-1,40,40,40),
    unit('가스 클라우드',0,30,30,70,{half:true,ban:['armor']}),unit('코볼트',0,20,30,20),
    unit('드래곤플라이',0,30,20,20,{first:true,ban:['scroll']}),
    unit('필러 오브 플레임',0,30,50,30,{stationary:true,landBan:1,ban:['armor','scroll']}),
    unit('미노타우르',0,40,40,70),unit('우드포크',2,30,30,60,{support:true,ban:['weapon']}),
    unit('스톤 월',2,0,60,30,{stationary:true,landBan:3,ban:['armor','scroll']}),
    unit('타이거 비틀',2,20,30,20,{ban:['scroll']}),unit('드워프',2,30,50,70),unit('팬',2,30,40,60,{confuse:true}),
    gear('체인 메일','armor',0,30,10),gear('프리즈','scroll',30,0,40,1,'freeze'),
    gear('메이스','weapon',20,0,0),gear('레더 아머','armor',0,20,0),gear('롱 소드','weapon',30,0,10),
    spell('큐어','heal',10,1),spell('셔터','shatter',20),spell('플라이','fly',20),
    spell('매직 볼트','bolt',50),spell('마나','manna',0),spell('홀리 워드 1','word1',20),spell('홀리 워드 6','word6',10),
    gear('카운터 애뮬릿','tool',0,0,100,0,'reflect'),gear('블랙 오브','tool',0,0,30,0,'orb'),gear('에메랄드 링','tool',20,0,30,0,'pierceEarth'),gear('가시어스 폼','tool',0,0,70,0,'nullify')
  ];
})();
if(typeof module!=='undefined')module.exports=CepterCards;