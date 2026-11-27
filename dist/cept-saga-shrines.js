/* Saga shrine events. Positions are managed by the board; events resolve only on a real stop. */
const CepterSagaShrines=(()=>{
  const events={
    light:['fortune','hope','celebration','tax','compassion','resistance','tollUp','deduction','clemency','foreknowledge','felicity','reward','eminent'],
    dark:['disaster','disease','tollDown','blackout','inflation','break','fear','silence','curse','panic','theft','separation'],
    neutral:['prosperity','labor','harvest','treaty','purifying','peace','purging','service','feast','bounty','voice','mud','wings','decision']
  };
  const elemental=['damage','weaken','strengthen','heal','decline','glory'];
  const names={fortune:'행운',hope:'희망',celebration:'축하',tax:'영지 수입',compassion:'자비',resistance:'마법 방어',
    tollUp:'통행료 증가',deduction:'비용 감면',clemency:'통행료 면제',foreknowledge:'예지',felicity:'호부의 은총',reward:'주회 보상',eminent:'마력 징수',
    disaster:'재해',disease:'쇠약',tollDown:'통행료 감소',blackout:'통행료 정지',inflation:'비용 상승',break:'장비 금지',fear:'침략 금지',
    silence:'침묵',curse:'마비의 저주',panic:'호부 폭락',theft:'장비·주문 분실',separation:'크리처 분실',prosperity:'격려',
    labor:'노동의 결실',harvest:'수확',treaty:'요새 통과',purifying:'셉터 정화',peace:'영지 정화',purging:'속성 폭풍',
    service:'요새 보너스',feast:'주회 보너스',bounty:'자연의 선물',voice:'영지 명령 확대',mud:'느린 이동',wings:'빠른 이동',decision:'선택의 문'};
  const details={bounty:'한 지역에서 각 속성 호부를 5개씩 받습니다.',feast:'다음 주회 보너스가 50% 늘어납니다.',
    labor:'모든 셉터가 100G를 받습니다.',mud:'다음 주사위는 1~3입니다.',peace:'모든 크리처와 영지에 걸린 효과를 해제합니다.',
    service:'다음 요새 보너스가 50% 늘어납니다.',treaty:'이번 주회의 모든 요새를 통과한 것으로 처리합니다.',
    voice:'이번 턴에 내 영지 어디에서나 명령할 수 있습니다.',wings:'다음 주사위는 6~8입니다.'};
  const stats={disaster:-5,disease:-5,prosperity:5,compassion:20,damage:-5,weaken:-5,strengthen:5,heal:20};
  const statuses={tollUp:['sagaTollUp',1],tollDown:['sagaTollDown',1],blackout:['blackout',1],inflation:['sagaInflation',2],
    deduction:['sagaDeduction',2],break:['sagaBreak',2],fear:['sagaFear',2],silence:['silence',2],voice:['enlightenment',1],
    mud:['slow',2],wings:['haste',2]};
  function rules(cards,{fx,combo,board,draw,note}){
    const sample=pool=>pool.length?pool[Math.floor(Math.random()*pool.length)]:undefined;
    const own=(s,seat)=>s.tiles.filter(t=>t.owner===seat&&t.unit);
    const symbolValue=(s,p)=>p.symbols.reduce((sum,n,i)=>sum+n*s.prices[i],0);
    function area(s){return sample([...new Set(s.tiles.filter(t=>typeof t.type==='number').map(t=>t.area))])??0;}
    function adjust(p,amount){p.cash+=amount;return (amount>=0?'+':'−')+Math.abs(amount)+'G';}
    function updateCreatures(s,types,action){
      let affected=0;
      for(const t of s.tiles){
        if(!t.unit||!types.some(type=>combo.hasElement(cards[t.unit.id],type)))continue;
        if(action==='damage'||action==='disaster'){
          const amount=fx.damageAmount(s,t,-stats[action]);
          if(amount){fx.harm(s,t,-stats[action]);affected++;}
        }else if(action==='heal'||action==='compassion'){
          const hp=t.unit.hp;
          if(!fx.immuneHP(t))t.unit.hp=Math.min(fx.max(t.unit),hp+stats[action]);
          if(hp!==t.unit.hp)affected++;
        }else{
          const old=fx.strength(t.unit);
          t.unit.st=Math.max(0,Math.min(100,old+stats[action]));
          if(t.unit.st!==old)affected++;
        }
      }
      return affected+'체';
    }
    function prices(s,factor,allow=()=>true){
      s.prices=s.prices.map((v,i)=>allow(i)?Math.max(1,Math.floor(v*factor)):v);
    }
    function status(s,p,kind,rounds){
      fx.clearCepter(p);p.status=kind;p.statusUntil=s.round+rounds;
    }
    function resolve(s,event,element){
      const p=s.players[s.turn];
      if(element!=null){
        const type=['화','수','지','풍'][element];
        if(event==='decline'){prices(s,.9,i=>i%4===element);return type+' 호부 · 전체 지역 −10%';}
        if(event==='glory'){const region=area(s);prices(s,1.1,i=>i===region*4+element);return (region+1)+'지역 '+type+' 호부 +10%';}
        const labels={damage:'HP −5',weaken:'ST −5',strengthen:'ST +5',heal:'HP +20'};
        return type+' 크리처 '+labels[event]+' · '+updateCreatures(s,[element],event);
      }
      if(statuses[event]){status(s,p,...statuses[event]);return names[event];}
      if(Object.hasOwn(stats,event))return names[event]+' · '+updateCreatures(s,sample([[0,2],[1,3]]),event);
      switch(event){
        case 'fortune':return '행운 · '+adjust(p,200);
        case 'hope':draw(p,s);draw(p,s);return '희망 · 카드 2장';
        case 'celebration':return '축하 · '+adjust(p,Math.floor(symbolValue(s,p)/10));
        case 'tax':return '영지 수입 · '+adjust(p,own(s,s.turn).length*30);
        case 'reward':return '주회 보상 · '+adjust(p,(p.lap+1)*50);
        case 'eminent':{
          const amount=s.players.reduce((sum,q)=>{
            if(q===p)return sum;
            const n=Math.floor(Math.max(0,q.cash)/10);q.cash-=n;return sum+n;
          },0);
          return '마력 징수 · '+adjust(p,amount);
        }
        case 'resistance':fx.clearCepter(p);p.antiMagic=true;break;
        case 'clemency':fx.clearCepter(p);delete s.shrineClemencyUsed;p.sagaClemency=true;break;
        case 'foreknowledge':if(p.book.length){s.shrineForesight=true;s.phase='foresightCard';}break;
        case 'felicity':p.symbols[area(s)*4+sample([0,1,2,3])]+=10;break;
        case 'bounty':{const i=area(s)*4;for(let e=0;e<4;e++)p.symbols[i+e]+=5;break;}
        case 'labor':s.players.forEach(q=>adjust(q,100));return '노동의 결실 · 모든 셉터 +100G';
        case 'harvest':s.players.forEach((q,i)=>adjust(q,own(s,i).length*30));break;
        case 'treaty':p.flags=(board(s).checkpoints||board(s).forts).slice();break;
        case 'purifying':s.players.forEach(fx.clearCepter);break;
        case 'peace':
          for(const t of s.tiles){if(t.unit)combo.clear(t.unit);delete t.enchant;}
          break;
        case 'purging':
          for(const t of s.tiles){
            if(!t.unit)continue;
            const c=cards[t.unit.id];
            if(!combo.matchesTerrain(c,t.type)&&!(t.type==='무속성'&&combo.hasElement(c,-1)))fx.harm(s,t,Math.ceil(t.unit.hp/2));
          }
          break;
        case 'service':fx.clearCepter(p);p.sagaService=true;break;
        case 'feast':fx.clearCepter(p);p.sagaFeast=true;break;
        case 'curse':
          for(const t of own(s,s.turn)){combo.clear(t.unit);t.unit.enchant='paralysis';t.unit.expires=s.round+1;}
          break;
        case 'panic':prices(s,.9);break;
        case 'theft':case 'separation':{
          const indices=q=>q.hand.flatMap((id,i)=>(cards[id].kind==='creature')===(event==='separation')?[i]:[]);
          const victim=sample(s.players.filter(q=>indices(q).length));
          if(victim){victim.hand.splice(sample(indices(victim)),1);return names[event]+' · '+victim.name;}
          return names[event]+' · 대상 없음';
        }
      }
      return names[event];
    }
    function after(s){
      if(s.phase==='land'&&s.players[s.turn].hand.length>6){s.discardReturn='land';s.phase='discard';}
    }
    function announce(s,event,element){
      const at=s.players[s.turn].pos;
      const title=board(s).shrineKinds?.[at]==='light'?'빛의 성소':board(s).shrineKinds?.[at]==='dark'?'어둠의 성소':'성소';
      s.shrineNotice=title+' · '+resolve(s,event,element);note(s,s.shrineNotice);after(s);
    }
    function arrive(s,kind){
      if(kind==='elemental'){
        announce(s,sample(elemental),sample([0,1,2,3]));return;
      }
      // Both dedicated shrines can draw from each alignment. Favor the shrine's alignment.
      const favored=events[kind];
      const event=sample([...events.light,...events.dark,...events.neutral,...favored,...favored]);
      if(event!=='decision'){announce(s,event);return;}
      const pool=['bounty','feast','labor','mud','peace','service','treaty','voice','wings'];
      s.shrineChoices=Array.from({length:7},()=>pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
      s.phase='shrineChoice';s.shrineNotice='성소 · 선택의 문';note(s,s.shrineNotice);
    }
    function choose(s,event){
      delete s.shrineChoices;s.phase='land';announce(s,event);
    }
    function score(s,event){
      switch(event){
        case 'labor':return 20;
        case 'harvest':return own(s,s.turn).length*10;
        case 'treaty':return (board(s).checkpoints.length-s.players[s.turn].flags.length)*15;
        case 'wings':return 25;
        case 'mud':return -10;
        case 'bounty':return 30;
        default:return 0;
      }
    }
    return {arrive,choose,score,after};
  }
  return {rules,names,details};
})();
if(typeof module!=='undefined')module.exports=CepterSagaShrines;
