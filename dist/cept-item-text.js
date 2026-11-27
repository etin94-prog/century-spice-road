// Player-facing item text. Read stat changes and generic traits from the edition's battle data.
const describeCepterItem=(()=>{
  const ability={
    orb:'상대의 일반 공격 무효화와 반사를 무시합니다.',
    pierceEarth:'지 속성 상대의 지형 HP 보너스를 관통합니다.',
    airslasher:'풍 속성 상대에게 강타합니다.',
    amberring:'풍 속성 상대의 지형 HP 보너스를 관통합니다.',
    aurablade:'장착한 크리처의 최대 HP만큼 전투 ST를 올립니다.',
    banditsglove:'일반 공격으로 피해를 주면 피해량의 두 배에 해당하는 마력을 빼앗습니다.',
    bladeofculdra:'일반 공격으로 피해를 주면 상대 셉터가 손패를 전부 버리고 북에서 여섯 장을 새로 뽑습니다.',
    batteringram:'방어 전용 상대에게 일반 공격이 명중하면 즉사시킵니다.',
    bellofchaos:'전투가 시작되면 상대 장비와 같은 카드를 모두의 손패와 현재 북에서 제거합니다.',
    belloflaw:'전투가 시작되면 상대 손패에서 비용이 가장 높은 카드 한 장을 파괴합니다. 이 장비는 전투 후 북으로 돌아갑니다.',
    buckler:'기본 ST가 30 이하인 상대의 일반 공격을 무효화합니다.',
    chameleonarmor:'지형 보너스 적용 전 전투 HP를 교전 영지 레벨 × 20으로 맞춥니다.',
    changingsalve:'전투가 시작되면 장착한 크리처의 ST와 HP를 서로 바꿉니다.',
    clawoftheghoul:'일반 공격으로 피해를 주면 상대를 마비시킵니다.',
    coinofpiety:'상대를 격파하고 생존하면 교전 영지와 같은 속성의 호부를 10개 얻습니다.',
    corrosiveknife:'장착한 크리처가 생존한 전투에서 상대가 재생했으면 상대를 격파합니다.',
    deathchoker:'일반 공격은 지형 HP 보너스를 관통합니다. 전투가 끝나면 장착한 크리처가 파괴됩니다.',
    doomneedle:'양쪽이 생존하면 상대에게 노쇠를 부여해 다음 전투 종료 시 파괴되게 합니다.',
    metamorphosebelt:'전투 중 그라스 스트라이더(ST 40, HP 40)로 변신합니다. 선제 공격과 상대의 남은 손패 한 장당 전투 ST +10을 얻으며, 생존 시 원래 형태로 돌아옵니다.',
    neutralcloak:'장착한 크리처는 전투 중 무속성이 됩니다.',
    cursedseal:'장착한 크리처가 상대에게 격파되면 상대 크리처의 기본 HP 절반만큼 피해를 줍니다.',
    tombstone:'장착한 크리처가 상대에게 격파되면 손패가 여섯 장이 될 때까지 카드를 뽑습니다.',
    daggerofmite:'현재 순위에 20을 곱한 만큼 전투 ST를 올립니다.',
    death:'두루마리. 공격 시 상대 크리처를 60% 확률로 즉사시킵니다. 전투 종료 시 장착한 크리처는 40% 확률로 파괴됩니다.',
    dragonhelm:'화·풍 속성 상대에게 강타하며, 수·지 속성 상대의 일반 공격을 무효화합니다.',
    dynamite:'전투 종료 시 장착한 크리처가 파괴됩니다.',
    earthamulet:'장착한 크리처가 지 속성이면 일반 공격이 강타합니다.',
    eternalmail:'장착한 크리처가 전투에서 생존하면 이 장비가 북으로 돌아갑니다.',
    fireamulet:'장착한 크리처가 화 속성이면 일반 공격이 강타합니다. 생존하면 전투 종료 시 HP를 최대치까지 회복합니다.',
    flametongue:'수 속성 상대에게 강타합니다.',
    gemoflife:'전투 종료 시 장착한 크리처의 전투 HP가 1~20이면 양쪽 크리처가 파괴됩니다.',
    forceanklet:'내 손패 한 장당 전투 HP가 10 오릅니다.',
    forcebracelet:'내 손패 한 장당 전투 ST가 10 오릅니다.',
    gremlinclaw:'전투 시작 시 상대의 무기, 두루마리 또는 도구를 파괴합니다.',
    gremlintooth:'전투 시작 시 상대의 방어구, 도구 또는 지원 크리처를 파괴합니다.',
    gremlinamulet:'전투가 시작되면 상대 장비를 파괴합니다. 지원 크리처에도 적용됩니다.',
    heartfibula:'상대를 격파하고 생존하면 장착한 크리처의 최대 HP가 최대 20 증가합니다. 상한은 80입니다.',
    hellblaze:'기본 ST가 20 이하인 상대에게 두루마리 강타가 적용됩니다.',
    holygrail:'두루마리와 일반 공격을 무효화합니다. 일반 공격을 막으면 막은 피해량의 두 배에 해당하는 마력을 잃습니다.',
    hourglass:'상대의 선제를 무시하고 먼저 공격합니다.',
    icicle:'화 속성 상대에게 강타합니다.',
    iksear:'내 수 영지 한 곳당 전투 HP가 20 오릅니다.',
    knightshield:'기본 ST가 40 이상인 상대의 일반 공격을 무효화합니다.',
    lunastone:'양쪽이 살아남으면 전투 종료 시 상대의 ST와 HP를 서로 바꿉니다.',
    magmaarmor:'배치된 화 크리처 한 마리당 전투 ST +10, 지 크리처 한 마리당 전투 HP +10.',
    stormarmor:'배치된 풍 크리처 한 마리당 전투 ST +10, 수 크리처 한 마리당 전투 HP +10.',
    soulray:'생존하고 손패에 자리가 있으면 전투 후 이 두루마리가 돌아옵니다.',
    magicshield:'두루마리 공격을 무효화합니다.',
    magussmirror:'두루마리 공격을 반사합니다.',
    markerflag:'일반 침략 전투를 마친 뒤 현재 영지의 행동 선택으로 돌아갑니다.',
    mujinamask:'상대 셉터의 손패 한 장당 전투 HP가 10 오릅니다.',
    necroscarab:'장착한 크리처가 격파되면 좀비로 변합니다.',
    neutralamulet:'장착한 크리처가 전투 중 무속성이 됩니다. 전투 후 이 장비는 북으로 돌아갑니다.',
    offeringdoll:'상대를 격파하고 생존하면 교전 지역에서 장착한 크리처와 같은 속성의 호부 가격이 30% 오릅니다.',
    petrifystone:'전투 ST를 0으로 맞추고 지형 보너스 적용 전 전투 HP를 80으로 맞춥니다.',
    phoenixamulet:'장착한 크리처가 격파되면 주인의 손패로 돌아옵니다.',
    powerbracelet:'장착한 크리처의 전투 ST가 두 배가 됩니다.',
    prismaticwand:'양쪽 크리처의 속성이 다르면 전투 ST와 HP가 각각 40 오릅니다.',
    proteanring:'장착한 크리처가 전투 중 다른 무작위 크리처로 변합니다.',
    rainbowpiece:'두루마리를 무효화합니다. 장착한 크리처가 살아남으면 교전 영지의 인챈트를 해제합니다.',
    rathunter:'일반 공격으로 피해를 주고 상대가 살아 있으면 자이언트 랫으로 바꿉니다.',
    ringofthesuccubus:'일반 공격으로 피해를 주면 상대의 기본 ST를 0으로 바꿉니다.',
    ringofthevampire:'일반 공격으로 준 피해량만큼 HP를 회복합니다.',
    rockbiter:'지 속성 상대에게 강타합니다.',
    rubyring:'화 속성 상대의 지형 HP 보너스를 관통합니다.',
    sapphirering:'수 속성 상대의 지형 HP 보너스를 관통합니다.',
    shadowarmor:'교전 영지 레벨을 7에서 뺀 뒤 10을 곱한 만큼 전투 HP를 올립니다.',
    silverplow:'전투 후 교전 영지의 레벨을 한 단계 올립니다. 레벨 변경을 막는 효과가 적용 중이면 올라가지 않습니다.',
    sleep:'두루마리. 상대를 수면 상태로 만들어 통행료를 받지 못하게 합니다.',
    smoketorch:'두루마리와 지형 HP 보너스를 관통하는 일반 공격을 무효화합니다.',
    spikeshield:'일반 공격 피해의 절반을 상대에게 반사합니다.',
    stinkbottle:'전투가 시작되면 상대의 도구나 지원 크리처를 파괴합니다. 이 장비는 전투 후 북으로 돌아갑니다.',
    talisman:'전투가 시작되면 상대 장비를 파괴합니다. 일반 공격을 무효화하며, 장착한 크리처와 방어 측이 생존하면 방어 영지에 랜드 프로텍션을 부여합니다.',
    tearinghalo:'장착한 크리처가 유속성이면 두루마리 강타가 적용됩니다.',
    terrair:'내 풍 영지 한 곳당 전투 ST가 20 오릅니다.',
    thehand:'전투가 시작되면 상대 장비를 빼앗아 대신 사용합니다.',
    towershield:'일반 공격 피해를 절반으로 줄입니다.',
    trapezon:'장착한 크리처가 전투 중 바알로 변합니다.',
    venom:'전투 종료 시 살아 있는 상대의 최대 HP 절반에 해당하는 피해를 줍니다.',
    vorpalsword:'최대 HP가 40 이상인 상대에게 강타합니다.',
    wateramulet:'장착한 크리처가 수 속성이면 일반 공격이 강타합니다.',
    windamulet:'장착한 크리처가 풍 속성이면 일반 공격이 강타합니다. 상대를 격파하고 생존하면 최대 HP가 최대 10 증가합니다. 상한은 80입니다.',
    wingedboots:'전투 후 이 장비는 북으로 돌아갑니다.'
  };
  const {protectedItem}=typeof module==='undefined'?CepterExtraBattle:require('./cept-extra-battle.js');
  const shields={fireshield:0,watershield:1,earthshield:2,windshield:3};
  const scrollCritical={freeze:0,firebolt:1,windcutter:2,stonehail:3};
  const aliases={knightsshield:'knightshield',spikedshield:'spikeshield'};
  const elements=['화','수','지','풍'];
  const list=ids=>ids.map(i=>elements[i]||'무').join('·')+' 속성';
  return (C,card)=>{
    if(card.kind!=='item'||card.catalogOnly)return;
    const key=C.combo.key(card),name=aliases[key]||key,firstEdition=C.edition==='ps1'||C.edition==='saturn';
    const pieces=[],scroll=card.category==='scroll',fixedST=['reflect','nullify'].includes(card.effect);
    const signed=(label,n)=>label+' '+(n>0?'+':'−')+Math.abs(n);
    if(C.edition==='3ds'&&key==='holygrail')pieces.push('두루마리와 일반 공격을 무효화합니다. 일반 공격을 막으면 막은 피해량 × 3G의 마력을 잃습니다.');
    if(C.edition==='3ds'&&key==='tearinghalo')pieces.push('장착 크리처가 유속성이면 두루마리 공격이 강타합니다.');
    if(C.edition==='3ds'&&key==='mindripper')pieces.push('설욕 시 전투 상대 셉터의 손패에서 무작위로 두 장을 파괴합니다.');
    if(C.edition==='3ds'&&key==='soulcorrupter')pieces.push('설욕 시 상대 셉터가 가장 많이 보유한 종류의 호부 30%를 빼앗습니다.');
    if(C.edition==='3ds'&&key==='powercrown')pieces.push('상대 크리처의 기본 ST만큼 전투 HP를 얻습니다. 설욕 시 상대를 그레이트 포실로 바꿉니다.');
    if(C.edition==='3ds'&&key==='lifestealer')pieces.push('일반 공격이 무효화되거나 반사되고 살아남으면 상대 최대 HP를 30 낮춥니다.');
    if(fixedST)pieces.push('전투 ST를 0으로 맞춥니다.');
    if(!scroll&&(card.st||card.hp))pieces.push('전투 중 '+[card.st&&signed('ST',card.st),card.hp&&signed('HP',card.hp)].filter(Boolean).join(' · '));
    if(scroll&&card.st)pieces.push('두루마리 공격력 '+card.st);
    if(card.scrollCriticalElements?.length)pieces.push(list(card.scrollCriticalElements)+' 상대에게 두루마리 강타가 적용됩니다.');
    if(Object.hasOwn(scrollCritical,name))pieces.push(list([scrollCritical[name]])+' 상대에게 두루마리 강타가 적용됩니다.');
    if(card.first&&name!=='hourglass')pieces.push('선제');
    if(card.last)pieces.push('후공');
    if(card.effect==='reflect'||card.reflectNormal)pieces.push('일반 공격을 반사합니다.');
    if(card.effect==='nullify'||card.neutralizeNormal)pieces.push('일반 공격을 무효화합니다.');
    if(card.doubleAttack)pieces.push('일반 공격을 연속으로 두 번 합니다. 같은 효과는 중첩되지 않습니다.');
    if(card.criticalOwnElements?.length)pieces.push('장착한 크리처가 '+list(card.criticalOwnElements)+'이면 일반 공격이 강타합니다.');
    if(card.criticalElements?.length)pieces.push(list(card.criticalElements)+' 상대에게 강타합니다.');
    if(card.pierceElements?.length)pieces.push(list(card.pierceElements)+' 상대의 지형 HP 보너스를 관통합니다.');
    if(card.reflectElements?.length)pieces.push(list(card.reflectElements)+' 상대의 일반 공격을 반사합니다.');
    if(card.neutralizes?.length)pieces.push(list(card.neutralizes)+' 상대의 일반 공격을 무효화합니다.');
    if(Object.hasOwn(shields,name)){
      const el=list([shields[name]]);
      pieces.push(el+' 상대의 일반 공격을 무효화합니다. 장착한 크리처가 '+el+'이면 모든 일반 공격을 무효화합니다.');
    }
    if(name==='necroscarab'&&C.edition==='saga')pieces.push('장착한 크리처가 상대에게 격파되면 스켈레톤으로 변합니다.');
    if(name==='boomerang'&&!firstEdition)pieces.push(['saga','begins'].includes(C.edition)?'생존하고 손패에 자리가 있으면 전투 후 이 장비가 돌아옵니다.':'전투 후 손패에 빈자리가 있으면 이 장비가 돌아옵니다.');
    if(name==='goldengoose')pieces.push('장착한 크리처가 격파되면 최대 HP 1당 '+(firstEdition?5:10)+'G를 얻습니다.');
    if(name==='towershield'&&card.halveScroll)pieces.push('일반 공격과 두루마리 피해를 절반으로 줄입니다.');
    else if(!(C.edition==='3ds'&&key==='holygrail'||C.edition==='saga'&&name==='necroscarab')&&(ability[card.effect]||ability[name]))pieces.push(ability[card.effect]||ability[name]);
    if(card.protectItem||protectedItem(name))pieces.push('장비 파괴와 탈취의 영향을 받지 않습니다.');
    return pieces.length?pieces.join(' · '):undefined;
  };
})();
if(typeof module!=='undefined')module.exports=describeCepterItem;
