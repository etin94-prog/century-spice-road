/* Begins shrine outcomes observed in-game.
   Sources: https://culdcept-db.com/data/shrines.js
   and https://www.youtube.com/watch?v=5ImigSsCRIY&t=4960s.
   The pool contains the documented outcomes implemented here. The retail weights are unpublished. */
const CepterBeginsShrines=(()=>{
  function rules(cards,{fx,combo,board,draw,note,total,refillBook,setStatus,escape}){
    const sample=items=>items.length?items[Math.floor(Math.random()*items.length)]:undefined;
    const units=s=>s.tiles.filter(t=>t.unit);
    const gain=(p,amount)=>{p.cash+=amount;return '+'+amount+'G';};
    const foes=s=>s.players.filter((_,seat)=>!combo.allied(s,s.turn,seat));
    const rank=(s,seat)=>{
      const score=total(s,seat);
      return 1+s.players.filter((_,i)=>(!s.teams||s.teams.indexOf(s.teams[i])===i)&&total(s,i)>score).length;
    };
    const enchant=(t,e)=>{combo.clear(t.unit);t.unit.enchant=e;};
    // Shrine damage is a board effect rather than a caster's spell.
    const hurt=(s,t,amount)=>{
      t.unit.hp-=amount;
      if(t.unit.hp<=0)fx.destroy(s,t,null);
    };
    const heal=(t,amount)=>{t.unit.hp=Math.min(fx.max(t.unit),t.unit.hp+amount);};
    const growth=(t,amount,recover=false)=>{
      t.unit.mhp=Math.min(100,fx.max(t.unit)+amount);
      if(recover)heal(t,amount);
    };
    const outcomes=[
      ['축복',(s,p)=>{
        let received=0;
        for(const rival of foes(s)){
          const amount=Math.floor(Math.max(0,rival.cash)/10);
          rival.cash-=amount;received+=amount;
        }
        return gain(p,received);
      }],
      ['주회 보상',(s,p)=>gain(p,(p.lap+1)*50)],
      ['축연',s=>{s.players.forEach(p=>gain(p,100));return '모든 셉터 +100G';}],
      ['작은 행운',(_,p)=>gain(p,200)],
      ['자비',(s,p)=>gain(p,rank(s,s.turn)*100)],
      ['균형',s=>{
        const awards=s.players.map((p,i)=>(rank(s,i)*p.lap+1)*50);
        s.players.forEach((p,i)=>gain(p,awards[i]));
        return '순위와 주회에 따른 마력 지급';
      }],
      ['존경',(s,p)=>{setStatus(s,p,'triumph');return '다음 주회 보너스 ×1.3';}],
      ['가속',(s,p)=>{setStatus(s,p,'haste');p.diceLimitRolls=1;return '다음 주사위 5~7';}],
      ['가속의 기운',s=>{
        for(const other of s.players){fx.clearCepter(other);other.word=8;}
        return '모든 셉터 다음 주사위 8';
      }],
      ['계시',(s,p)=>{
        setStatus(s,p,'enlightenment');
        p.enchantDeadline=(s.round-1)*s.players.length+s.turn+1;
        return '이번 차례에 모든 내 영지에 명령 가능';
      }],
      ['마법 장벽',(s,p)=>{setStatus(s,p,'barrier',2);return '2라운드 대상 지정 방어';}],
      ['통행료 증가',(s,p)=>{setStatus(s,p,'sagaTollUp',1);return '1라운드 내 영지 통행료 ×1.3';}],
      ['감세',(s,p)=>{setStatus(s,p,'sagaTollDown',1);return '1라운드 내 영지 통행료 ×0.7';}],
      ['행운',s=>{
        const enemy=units(s).filter(t=>!combo.allied(s,t.owner,s.turn));
        const highest=Math.max(0,...enemy.map(t=>t.level));
        const sleeping=sample(enemy.filter(t=>t.level===highest));
        if(!sleeping)return '대상 영지 없음';
        enchant(sleeping,'sleep');return (s.tiles.indexOf(sleeping)+1)+'번 영지 통행료 정지';
      }],
      ['휴가',s=>{
        const high=units(s).filter(t=>t.level===5);
        high.forEach(t=>enchant(t,'paralysis'));
        return '레벨 5 영지 '+high.length+'곳 마비';
      }],
      ['주문 해제',s=>{s.players.forEach(fx.clearCepter);return '모든 셉터 인챈트 해제';}],
      ['해주',s=>{
        for(const t of s.tiles){if(t.unit)combo.clear(t.unit);delete t.enchant;}
        return '모든 영지 인챈트 해제';
      }],
      ['황금 씨앗',s=>{units(s).forEach(t=>heal(t,30));return '모든 크리처 HP +30';}],
      ['생명의 물결',s=>{
        units(s).filter(t=>t.owner===s.turn).forEach(t=>{t.unit.hp=fx.max(t.unit);});
        return '내 크리처 전체 회복';
      }],
      ['집단 성장',s=>{units(s).forEach(t=>growth(t,10));return '모든 크리처 최대 HP +10';}],
      ['거대한 성장',s=>{
        const t=sample(units(s));if(!t)return '대상 영지 없음';
        growth(t,20,true);return (s.tiles.indexOf(t)+1)+'번 영지 HP와 최대 HP +20';
      }],
      ['사악한 일격',s=>{
        const t=sample(units(s));if(!t)return '대상 영지 없음';
        hurt(s,t,30);return (s.tiles.indexOf(t)+1)+'번 영지 HP −30';
      }],
      ['검은 독',s=>{units(s).forEach(t=>hurt(s,t,10));return '모든 크리처 HP −10';}],
      ['내란',s=>{
        const field=units(s);const counts=[0,0,0,0];
        for(const t of field){const e=cards[t.unit.id].element;if(e>=0)counts[e]++;}
        const peak=Math.max(...counts);
        if(!peak)return '대상 크리처 없음';
        const element=sample(counts.flatMap((n,e)=>n===peak?[e]:[]));
        field.filter(t=>cards[t.unit.id].element===element).forEach(t=>hurt(s,t,10));
        return ['화','수','지','풍'][element]+' 크리처 HP −10';
      }],
      ['환생',(s,p)=>{
        p.hand=[];for(let n=0;n<6;n++)draw(p,s);
        return '손패를 버리고 6장 뽑기';
      }],
      ['북 복구',(s,p)=>{
        delete p.recycleTemplate;p.book=refillBook(p);
        for(const other of s.players)if(other.peek?.seat===s.turn)delete other.peek;
        return '시작 북 구성으로 복구';
      }],
      ['희망',(s,p)=>{draw(p,s);draw(p,s);return '카드 2장 뽑기';}],
      ['연쇄 부식',s=>{
        for(const other of s.players)if(other.hand.length)other.hand.splice(Math.floor(Math.random()*other.hand.length),1);
        return '각 셉터 무작위 손패 1장 파괴';
      }],
      ['파괴 폭풍',s=>{
        for(const other of s.players)other.hand=other.hand.filter(id=>cards[id].kind!=='item');
        return '모든 셉터의 손패 아이템 파괴';
      }],
      ['네 개의 서명',(s,p)=>{
        const m=board(s);p.flags=[...(m.checkpoints||m.forts)];
        return '모든 요새를 경유한 것으로 처리';
      }],
      ['잠의 징조',s=>{
        const rival=sample(foes(s));if(!rival)return '대상 셉터 없음';
        setStatus(s,rival,'blackout',1);
        return rival.name+' · 1라운드 통행료 봉인';
      }],
      ['카드 도난',s=>{
        const leader=sample(s.players.filter((_,seat)=>rank(s,seat)===1));
        const index=sample(leader.hand.flatMap((id,i)=>cards[id].kind!=='creature'?[i]:[]));
        if(index==null)return '1위 손패에 주문·아이템 없음';
        leader.hand.splice(index,1);
        return leader.name+' · 주문 또는 아이템 1장 파괴';
      }],
      ['저지대의 융기',s=>{
        const ranks=s.players.map((_,seat)=>rank(s,seat)),bottom=Math.max(...ranks);
        const t=sample(units(s).filter(tile=>ranks[tile.owner]===bottom&&tile.level<5&&!fx.blockedLevel(s,tile)));
        if(!t)return '레벨을 올릴 영지 없음';
        t.level++;
        return (s.tiles.indexOf(t)+1)+'번 영지 Lv.'+t.level;
      }],
      ['지가 급등',s=>{
        const t=sample(s.tiles.filter(t=>t.owner<0&&combo.territoryType(t.type)&&t.level<5&&!fx.blockedLevel(s,t)));
        if(!t)return '레벨을 올릴 빈 영지 없음';
        t.level=Math.min(5,t.level+2);
        return (s.tiles.indexOf(t)+1)+'번 빈 영지 Lv.'+t.level;
      }],
      ['탈출',s=>{
        const at=escape(s);
        return at==null?'빈 영지 없음':(at+1)+'번 빈 영지로 이동';
      }]
    ];
    function arrive(s){
      const [name,effect]=sample(outcomes);
      s.shrineNotice='성소 · '+name+' · '+effect(s,s.players[s.turn]);
      note(s,s.shrineNotice);
    }
    return {arrive};
  }
  return {rules};
})();
if(typeof module!=='undefined')module.exports=CepterBeginsShrines;