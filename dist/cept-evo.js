// Revolt Breed cards are serialized as immutable numeric card IDs, like the other cards in a book.
// The recipe encoding is shared by the local engine, invite-room hosts, worker and replay viewer.
const CepterEvo=(()=>{
  const growth=[
    ['stMini','ST +5',5,0,0],['stUp','ST +10',10,0,2],['stHyper','ST +20',20,0,4],['stDown','ST −10',-10,0,1],
    ['hpMini','HP +5',0,5,1],['hpUp','HP +10',0,10,3],['hpHyper','HP +20',0,20,5],['hpDown','HP −10',0,-10,2],
    ['double','ST·HP +10',10,10,5],['mega','ST·HP +20',20,20,9],
    ['blocker','ST −10 · HP +10',-10,10,3],['attacker','ST +10 · HP −10',10,-10,3]
  ];
  const abilities=[null,
    ['선제','start',5,20,{first:true}],['후공','start',5,-20,{last:true}],
    ['장비 보호','start',5,10,{protectGear:true}],
    ['전투 ST +20','battle',5,20,{battleST:20}],['전투 HP +20','battle',5,20,{battleHP:20}],
    ['전속성 지원','battle',10,30,{support:true}],
    ['두루마리 강타','attack',5,20,{scrollCritical:true}],
    ['화·지 강타','attack',8,10,{criticalElements:[0,2]}],
    ['수·풍 강타','attack',8,10,{criticalElements:[1,3]}],
    ['두루마리 무효','defense',8,20,{neutralizeScroll:true}],
    ['화·지 무효','defense',10,20,{neutralizes:[0,2]}],
    ['수·풍 무효','defense',10,20,{neutralizes:[1,3]}],
    ['마비 공격','hit',6,30,{paralyze:true}],
    ['방어 전용','map',5,-40,{stationary:true}],
    ['주문 대상 면역','map',8,30,{spellWard:true}],
    ['재생','end',5,10,{regenerate:true}],
    ['마법탄','start',5,20,{innateScroll:30}],
    ['영지의 힘','battle',5,20,{evoBattle:'landST'}],['영지의 방어','battle',5,20,{evoBattle:'landHP'}],
    ['시간의 힘','battle',5,20,{evoBattle:'roundST'}],['시간의 방어','battle',5,20,{evoBattle:'roundHP'}],
    ['동속성의 힘','battle',8,20,{evoBattle:'elementST'}],['동속성의 방어','battle',8,20,{evoBattle:'elementHP'}],
    ['나이의 힘','battle',10,30,{evoBattle:'ageST'}],['나이의 방어','battle',10,30,{evoBattle:'ageHP'}],
    ['ST 드레인','hit',5,20,{drainST:true}],
    ['통행료 상승','map',5,20,{tollFactor:1.5}],
    ['카드 유산','end',5,10,{evoLegacy:'draw'}],['마력 유산','end',5,20,{evoLegacy:'cash'}],
    ['화·지 관통','attack',8,20,{pierceElements:[0,2]}],['수·풍 관통','attack',8,20,{pierceElements:[1,3]}]
  ];
  const areas=['neutral','fire','water','earth','air'],colors='RBGY';
  const original={base:1_000_000_000,radices:[2,11,5,17,16,3,2,17,17]};
  const extended={base:2_000_000_000,radices:[2,11,5,17,16,3,2,128,128]};
  const fresh=()=>({age:0,sp:5,element:-1,st:20,hp:30,land:0,discard:0,abilities:[]});
  const statBounds=(st,hp)=>st>=0&&st<=80&&hp>=5&&hp<=80;
  function growthCost(st,hp,[,,ds,dh,sp]){
    const modifier=ds&&dh?Math.floor(Math.max(st,hp)/10)-1:ds?Math.floor(st/10):Math.floor(hp/10)-1;
    return sp+modifier;
  }
  const minimum=new Map([['20/30',0]]);
  const frontier=[[20,30]];
  for(let i=0;i<frontier.length;i++){
    const [st,hp]=frontier[i],spent=minimum.get(st+'/'+hp);
    for(const part of growth){
      const [, ,ds,dh]=part,attack=st+ds,health=hp+dh,key=attack+'/'+health;
      if(!statBounds(attack,health))continue;
      const cost=spent+growthCost(st,hp,part);
      if(cost<(minimum.get(key)??Infinity)){minimum.set(key,cost);frontier.push([attack,health]);}
    }
  }
  const slots=age=>age>=6?2:age>=3?1:0;
  const budget=age=>5+age*5;
  function summonCost({st,hp,element,land,discard,abilities:parts}){
    return st-20+2*(hp-30)+(element>=0?30:0)-30*(land+discard)+parts.reduce((sum,i)=>sum+abilities[i][3],0);
  }
  function valid(recipe){
    if(!recipe||![recipe.age,recipe.element,recipe.st,recipe.hp,recipe.land,recipe.discard].every(Number.isInteger))return false;
    const {age,element,st,hp,land,discard,abilities:parts}=recipe;
    if(age<0||age>10||element< -1||element>3||!statBounds(st,hp)||st%5||hp%5||land<0||discard<0||discard>1||land+discard>2||land&&element<0||
       !Array.isArray(parts)||parts.length>slots(age)||parts.some(i=>!Number.isInteger(i)||!abilities[i])||
       new Set(parts.map(i=>abilities[i][1])).size!==parts.length)return false;
    const spent=minimum.get(st+'/'+hp)+(element>=0?2:0)+land+discard+parts.reduce((sum,i)=>sum+abilities[i][2],0);
    return spent<=budget(age)&&(recipe.sp==null||Number.isInteger(recipe.sp)&&recipe.sp>=0&&recipe.sp<=budget(age)-spent);
  }
  function encode(recipe,slot){
    if((slot!==0&&slot!==1)||!valid(recipe)||summonCost(recipe)<0)return null;
    const [first=0,second=0]=[...recipe.abilities].sort((a,b)=>a-b);
    const values=[slot,recipe.age,recipe.element+1,recipe.st/5,recipe.hp/5-1,recipe.land,recipe.discard,first,second];
    const {base,radices}=first>=17||second>=17?extended:original;
    return base+values.reduce((value,n,i)=>value*radices[i]+n,0);
  }
  function decode(id){
    if(!Number.isSafeInteger(id)||id<original.base)return null;
    const {base,radices}=id>=extended.base?extended:original;
    let value=id-base;
    const chunks=[];
    for(let i=radices.length-1;i>=0;i--){chunks.unshift(value%radices[i]);value=Math.floor(value/radices[i]);}
    const [slot,age,element,st,hp,land,discard,first,second]=chunks;
    if(value||second&&second<=first||!first&&second)return null;
    const recipe={age,element:element-1,st:st*5,hp:(hp+1)*5,land,discard,abilities:[first,second].filter(Boolean)};
    return encode(recipe,slot)===id?{...recipe,slot}:null;
  }
  const baseCard={kind:'creature',ban:[],evo:true,hasArt:false};
  function card(recipe){
    const {element,st,hp,slot,land,discard}=recipe,cost=summonCost(recipe);
    const name='에보 드래곤 '+(slot+1),category=areas[element+1];
    const additionalCost=[...Array(land).fill(colors[element]),...(discard?['+[]']:[])].join(',');
    const traits=recipe.abilities.map(i=>abilities[i][4]);
    return {...baseCard,...Object.assign({},...traits),name,element,category,st,hp,cost,
      catalog:{name,category,path:category+'/evodragon',ability:recipe.abilities.map(i=>abilities[i][0]).join(' · ')||'-',
        rarity:'E',additionalCost,stats:'ST '+st+' · HP '+hp+' · '+cost+'G'},
      evoSlot:slot,evoAge:recipe.age};
  }
  function catalog(cards){
    const cache=new Map();
    return new Proxy(cards,{get(target,prop,receiver){
      if(typeof prop!=='string'||prop.length!==10||!/^[1-4]\d{9}$/.test(prop))return Reflect.get(target,prop,receiver);
      const id=Number(prop);
      if(!cache.has(id)){
        const recipe=decode(id);
        if(!recipe)return undefined;
        if(cache.size>=128)cache.delete(cache.keys().next().value);
        cache.set(id,card(recipe));
      }
      return cache.get(id);
    }});
  }
  // Older room rules allow a 50-integer envelope with at most four digits per value.
  // Use an otherwise invalid card ID to signal the packed representation.
  const roomBookMarker=9999,roomRadix=10_000n;
  function packBook(book){
    let bits=1n;
    for(const id of book){
      const evo=id>=original.base;
      if(evo?!decode(id):!Number.isInteger(id)||id<0||id>1023)return null;
      bits=(bits<<BigInt(evo?34:11))|(BigInt(id)<<1n)|(evo?1n:0n);
    }
    const payload=Array(50).fill(0);
    payload[0]=roomBookMarker;
    for(let i=49;i>0;i--){payload[i]=Number(bits%roomRadix);bits/=roomRadix;}
    return bits===0n?payload:null;
  }
  function unpackBook(payload){
    if(!Array.isArray(payload)||payload[0]!==roomBookMarker)return payload;
    if(payload.length!==50||payload.some(n=>!Number.isInteger(n)||n<0||n>9999))return null;
    let bits=payload.slice(1).reduce((sum,n)=>sum*roomRadix+BigInt(n),0n);
    const book=[];
    for(let i=0;i<50;i++){
      const width=(bits&1n)?34n:11n;
      book.unshift(Number((bits&((1n<<width)-1n))>>1n));
      bits>>=width;
    }
    return bits===1n?book:null;
  }
  function spend(recipe,next,sp){
    const result={...recipe,...next,sp:recipe.sp-sp};
    return valid(result)?result:null;
  }
  function apply(recipe,kind,value){
    if(!valid(recipe)||recipe.sp==null)return null;
    if(kind==='growth'){
      const part=growth.find(([id])=>id===value);
      if(!part)return null;
      return spend(recipe,{st:recipe.st+part[2],hp:recipe.hp+part[3]},growthCost(recipe.st,recipe.hp,part));
    }
    if(kind==='element'&&recipe.element===-1&&value>=0&&value<=3)return spend(recipe,{element:value},2);
    if(kind==='land')return spend(recipe,{land:recipe.land+1},1);
    if(kind==='discard'&&!recipe.discard)return spend(recipe,{discard:1},1);
    if(kind==='ability'&&abilities[value])return spend(recipe,{abilities:[...recipe.abilities,value]},abilities[value][2]);
    if(kind==='removeElement'&&!recipe.land&&recipe.element>=0)return spend(recipe,{element:-1},0);
    if(kind==='removeLand'&&recipe.land)return spend(recipe,{land:recipe.land-1},0);
    if(kind==='removeDiscard'&&recipe.discard)return spend(recipe,{discard:0},0);
    if(kind==='removeAbility'&&recipe.abilities.includes(value))return spend(recipe,{abilities:recipe.abilities.filter(i=>i!==value)},0);
    return null;
  }
  function won(recipe){
    return recipe.age<10?{...recipe,age:recipe.age+1,sp:recipe.sp+5}:recipe;
  }
  return {fresh,valid,encode,decode,card,catalog,apply,won,growth,growthCost,abilities,slots,summonCost,packBook,unpackBook};
})();
if(typeof module!=='undefined')module.exports=CepterEvo;

