// Summaries describe the implemented abilities, including edition-specific differences.
const CepterCreatureText=(()=>{
  const battle={
    ambermosquito:'전투에 들어가면 티라노사우루스 또는 자이언트 랫으로 변신합니다.',
    archbishop:'장비가 파괴되거나 빼앗기지 않습니다.',
    abyssalmonarch:'전투가 시작되면 상대의 무기 또는 도구를 파괴합니다. 속성이 다른 영지에서도 방어 시 지형 HP 보너스를 받습니다.',
    terragoetia:'전투 중 상대 크리처의 공격 성공 시 능력을 막습니다. 상대 장비의 효과는 적용됩니다.',
    aerogoetia:'영지 이동으로 떨어진 적의 풍 영지에 침략할 수 있습니다.',
    flamegoetia:'내 북의 남은 카드가 상대보다 많으면 전투 ST와 HP가 각각 20 오릅니다.',
    astralqueen:'맵에 배치된 무속성 크리처 한 마리당 전투 HP가 5 오릅니다.',
    baldanders:'전투에 들어가면 무작위 크리처로 변신합니다.',
    livingclaw:'일반 공격을 명중시킨 크리처에게 마비를 부여합니다. 장비로 사용해도 발동합니다.',
    livingmirror:'두루마리 공격을 반사합니다. 장비로 사용해도 발동합니다.',
    livingscroll:'장비 없이 공격하거나 다른 크리처의 장비로 쓰이면 두루마리 피해 20을 줍니다.',
    bandit:'일반 공격으로 준 피해량의 두 배에 해당하는 마력을 상대에게서 빼앗습니다.',
    basaltidol:'맵에 있으면 전투 종료나 패배로 발동하는 크리처 능력을 봉쇄합니다.',
    battlegearalpha:'배틀 기어 β를 지원으로 사용하면 번들 기어로 합체합니다. 단일 대상 주문과 영지 능력의 대상이 되지 않습니다.',
    battlegearbeta:'배틀 기어 α를 지원으로 사용하면 번들 기어로 합체합니다. 두루마리 공격을 무효화합니다.',
    berserker:'일반 공격으로 피해를 주면 자신이 혼란에 빠집니다.',
    borgess:'전투에 참여하지 않은 채 맵에 있으면 무속성 크리처의 전투 HP를 20 올립니다.',
    brassidol:'맵에 있으면 모든 셉터가 턴 시작 드로우에서 카드 한 장을 더 뽑습니다.',
    cleric:'일반 공격으로 피해를 준 무속성 상대를 80% 확률로 즉사시킵니다.',
    colossus:'주회 보너스로 HP를 회복하지 않습니다. 단일 지속 주문과 같은 유형의 영지 능력의 대상이 되지 않습니다.',
    coaloid:'내 화 영지 한 곳당 전투 ST와 HP가 10 오릅니다. 주문이나 영지 능력으로 파괴되면 화 영지 한 곳당 50G를 얻습니다.',
    hellpyron:'전투에 참여하지 않은 채 배치되어 있으면 화·지 크리처의 전투 ST를 10 올립니다.',
    clayidol:'맵에 있으면 모든 크리처가 주문과 영지 능력으로 받는 피해가 10 줄어듭니다.',
    crayidol:'맵에 있으면 모든 크리처가 주문과 영지 능력으로 받는 피해가 10 줄어듭니다.',
    decoy:'일반 공격 피해를 상대에게 반사합니다.',
    doppelganger:'전투에 들어가면 상대와 같은 종류의 크리처로 변신합니다.',
    ebonyidol:'맵에 있으면 모든 크리처의 영지 능력 사용을 막습니다.',
    goldidol:'맵에 있으면 모든 크리처의 영지 보유 및 손패 희생 소환 조건이 면제됩니다.',
    graniteidol:'맵에 있으면 셉터를 대상으로 하는 단일 즉시 주문과 해당 영지 능력을 막습니다.',
    hornedchameleon:'수비 중 속성이 달라도 영지에서 지형 HP 보너스를 받습니다.',
    ironidol:'맵에 있으면 보통 주사위 눈이 4~6으로 제한됩니다.',
    ivoryidol:'맵에 있으면 S 등급 카드의 마력 비용은 1.5배, R·E 등급은 2배가 됩니다.',
    jadeidol:'맵에 있으면 주문과 영지 능력으로 영지 속성을 바꾸거나 레벨을 내리는 효과를 막습니다.',
    leadidol:'맵에 있으면 영지 명령에서 크리처 이동과 교체를 사용할 수 없습니다.',
    gemoid:'주문과 영지 능력으로 HP와 최대 HP가 변하지 않습니다. 통행료를 받지 않습니다.',
    spudfolk:'전투에서 상대에게 패배하면 지도에 배치된 화 크리처 한 마리당 10G를 얻습니다.',
    pangolin:'전투에서 50% 확률로 지형과 장비 보정을 받기 전 HP가 30이 됩니다.',
    spinyagama:'일반 공격 피해의 절반을 공격자에게 반사합니다.',
    seismodon:'전투에서 상대에게 파괴되면 교전 영지 레벨을 1 내립니다. 최저 1입니다.',
    brontides:'전투에 참여하지 않은 채 배치되어 있으면 화·지 크리처의 전투 HP를 10 올립니다.',
    garuda:'전투 ST와 HP는 지도에 배치된 풍 크리처 수 × 10입니다.',
    lamia:'손패에서 배치되면 스피릿 워크가 적용되어 같은 지역의 빈 영지로 이동할 수 있습니다.',
    revenant:'일반 공격으로 피해를 주면 마비시킵니다. 교전 영지에 지속 효과가 있으면 그 전투 동안 뱀파이어로 변신합니다.',
    leoknight:'전투 ST는 상대의 영지 수 × 10, 전투 HP는 내 영지 수 × 10입니다.',
    littlegray:'일반 공격 후 살아 있는 상대를 50% 확률로 무작위 빈 영지로 보냅니다. 빈 영지가 없으면 그 상대가 파괴됩니다.',
    livingshield:'일반 크리처처럼 배치하거나 전투에서 지원용으로 장착할 수 있습니다.',
    livingspear:'일반 크리처처럼 배치하거나 전투에서 지원용으로 장착할 수 있습니다.',
    livingsword:'일반 크리처처럼 배치하거나 전투에서 지원용으로 장착할 수 있습니다.',
    lunatichare:'양쪽이 생존하면 전투 종료 시 상대의 ST와 HP를 서로 바꿉니다.',
    marbleidol:'맵에 있으면 같은 종류의 크리처가 이미 배치되어 있는 동안 그 크리처를 다시 소환할 수 없습니다.',
    migoal:'수·지 속성 상대에게 강타하고 화·풍 속성 상대의 일반 공격을 무효화합니다.',
    mysticegg:'전투 시작 시 장착물을 소모해 장착물의 종류에 따라 정해진 크리처로 변신합니다.',
    ninja:'두루마리로 공격하면 강타가 적용됩니다.',
    sanctumguard:'상대를 격파하고 생존하면 교전 영지와 같은 속성의 호부를 5개 얻습니다.',
    silveridol:'맵에 있으면 모든 수비 크리처가 선제를 얻습니다.',
    squonk:'상대를 격파하고 생존하면 내 손패로 돌아옵니다. 손패에 빈자리가 필요합니다.',
    statue:'주회 보너스를 받을 때 HP가 회복되지 않습니다.',
    steamgear:'이 크리처가 있는 영지의 통행료는 일반 영지의 절반입니다.',
    tetramorph:'교전에 참여하지 않은 채 맵에 있으면 침략 크리처의 전투 HP를 20 낮춥니다.',
    thief:'장비 없이 전투에 들어가면 상대 장비를 빼앗아 대신 사용합니다.',
    trojanhorse:'일반 공격이 상대의 지형 HP 보너스를 관통합니다.',
    werewolf:'일반 공격 후 살아 있는 상대를 60% 확률로 울프로 바꿉니다.',
    wraith:'일반 공격으로 피해를 준 상대를 50% 확률로 즉사시킵니다. 전투가 끝나면 자신도 파괴됩니다.',
    zombie:'전투를 끝낼 때 HP가 20 줄어듭니다.',
    bundlegear:'배틀 기어 α와 β가 지원으로 합체해 생성됩니다. 단일 대상 주문과 영지 능력의 대상이 되지 않고 두루마리 공격을 무효화합니다.',
    ares:'교전에 참여하지 않은 채 맵에 있으면 침략 크리처의 전투 ST를 20 올립니다.',
    baal:'전투가 끝나면 내 손패에서 카드 한 장을 무작위로 파괴합니다.',
    bard:'일반 공격 후 상대가 살아남으면 자신이 무작위 빈 영지로 이동합니다. 빈 영지가 없으면 파괴됩니다.',
    bia:'상대가 크리처를 지원 장비로 사용하면 전투 ST와 HP가 각각 30 오릅니다.',
    burningtitan:'내 영지가 5곳 이상이면 전투 ST와 HP가 각각 30 낮아집니다.',
    kasha:'교전 영지에 인챈트가 걸려 있으면 전투 ST와 HP가 각각 20 오릅니다.',
    aspidochelone:'현재 라운드만큼 전투 ST와 HP가 오릅니다.',
    weretiger:'25라운드부터 전투 ST와 HP가 각각 20 낮아집니다.',
    barrowwight:'일반 공격 후 상대가 살아남으면 수면을 부여해 통행료를 받지 못하게 합니다.',
    boggart:'내 영지의 통행료가 두 배가 됩니다. 주문이나 영지 능력으로 파괴되면 손패로 돌아갑니다.',
    caitsith:'단일 대상 주문과 영지 능력의 대상이 되지 않습니다. 기본 ST 40 이상인 상대의 일반 공격을 무효화합니다.',
    catoblepas:'장비 없이 전투해 생존하면 전투 종료 시 살아 있는 상대에게 그 상대의 기본 ST만큼 피해를 줍니다.',
    chimera:'주회 보너스를 받을 때 기본 ST가 최대 10씩 오릅니다. 상한은 80입니다.',
    conjurer:'두루마리로 공격하면 강타가 적용됩니다.',
    dragon:'침략할 때 전투 ST가 20 오르고 전투 HP가 20 낮아집니다.',
    efreet:'두루마리로 공격하면 강타가 적용됩니다. 생존하면 전투 종료 시 받은 일반 공격 피해만큼 마력을 잃습니다.',
    firegiant:'수 속성 상대에게 강타합니다.',
    flamelord:'전투에 참여하지 않은 채 맵에 있으면 화 속성 크리처의 전투 HP를 10 올립니다. 자신이 전투에서 살아남으면 100G를 잃습니다.',
    gladiator:'화·수·지·풍 속성 상대에게 강타합니다.',
    golem:'전투에서 살아남으면 기본 ST와 HP가 각각 10 줄어듭니다.',
    hellhound:'수 속성 상대에게 주는 일반 공격 피해가 절반으로 줄어듭니다.',
    larvae:'내 북에 남은 카드가 상대보다 3장 이상 많으면 전투 ST와 HP가 각각 20 오릅니다.',
    lavaworm:'수 속성 상대의 지형 HP 보너스를 관통합니다.',
    manes:'방어 영지의 크리처에 인챈트가 걸려 있으면 전투 HP가 20 오릅니다.',
    manticore:'전투 ST와 HP를 각각 내 남은 손패 수 × 10으로 맞춥니다.',
    mephistopheles:'주문이나 영지 능력으로 파괴되면 사용한 셉터가 200G를 잃습니다.',
    oldwillow:'화 영지에 배치하면 이곳을 지나는 적 셉터를 멈춰 세웁니다.',
    peri:'단일 대상 주문과 영지 능력의 대상이 되지 않습니다. 내 북에 남은 카드가 상대보다 3장 이상 적으면 전투 ST와 HP가 각각 20 오릅니다.',
    phoenix:'전투에서 격파되면 내 손패로 돌아옵니다.',
    pyrallis:'내 화 영지 하나당 전투 ST가 10 오릅니다. 내 수 영지가 있으면 전투 HP가 20 줄어듭니다.',
    pyrodrake:'장비를 사용하지 않으면 전투 ST와 HP가 각각 20 오릅니다.',
    gelatinouswall:'전투에서 생존하면 받은 일반 공격 피해 1당 5G를 얻습니다.',
    seahag:'손패에서 배치되면 그리드가 걸립니다. 통행료는 1.5배가 되고 전투 HP는 10 낮아집니다.',
    sirgawain:'20라운드부터 전투 ST와 HP가 각각 30 오릅니다.',
    salamander:'화 속성 상대의 일반 공격 피해를 흡수해 HP를 회복합니다.',
    sonascetic:'지원 크리처의 전투 능력을 사용합니다.',
    sorcerer:'두루마리로 공격하면 강타합니다. 장비가 없을 때도 공격력 20의 두루마리 공격을 합니다.',
    sulfurousballoon:'격파되면 상대의 HP를 30 낮춥니다. 전투용 HP 보너스를 제외하고 계산합니다.',
    valkyria:'상대를 격파하고 생존하면 기본 ST가 최대 10 오릅니다. 상한은 80입니다.',
    willothewisp:'일반 공격으로 피해를 주면 전투 보너스를 제외한 내 남은 HP의 두 배만큼 상대 마력을 빼앗습니다.',
    amazon:'장비 없이 일반 공격으로 피해를 주면 이번 주회 번호 × 20G를 상대에게서 빼앗습니다.',
    anubias:'전투 HP를 이번 경기에서 파괴된 크리처 수 × 5로 맞춥니다.',
    behemoth:'전투가 끝나면 내 손패에서 카드 한 장을 무작위로 파괴합니다.',
    bloodypudding:'크리처를 지원에 사용하면 지원 카드의 HP만큼 내 최대 HP를 올립니다. 상한은 80입니다.',
    bunyip:'지형 HP 보너스를 관통하는 일반 공격을 무효화합니다.',
    charon:'일반 공격을 무효화하고, 막은 피해 1당 마력 2G를 잃습니다.',
    dagon:'전투에 참여하지 않은 채 맵에 있으면 수 속성 크리처의 전투 HP를 10 올립니다. 자신이 전투에서 생존하면 100G를 잃습니다.',
    drool:'전투 ST를 내 수 영지 수 × 10으로 맞춥니다. 일반 공격은 상대의 지형 HP 보너스를 관통합니다.',
    fate:'전투에서 격파되면 손패에 빈자리가 있을 때 카드 한 장을 뽑습니다.',
    fungonoid:'전투에서 생존하면 최대 HP가 최대 10 오릅니다. 상한은 80입니다.',
    grendel:'기본 ST가 20 이하인 상대에게 강타합니다.',
    grindylow:'기본 ST가 30 이하인 상대의 일반 공격을 무효화합니다.',
    hydra:'화 영지 이외에서 전투를 끝내고 생존하면 HP를 최대치까지 회복합니다.',
    kelpie:'수 영지에 배치하면 이곳을 지나는 적 셉터를 멈춰 세웁니다.',
    kraken:'무속성 상대의 일반 공격을 무효화합니다. 내 화 영지가 있으면 전투 HP가 20 줄어듭니다.',
    leviathan:'상대를 격파하고 생존하면 교전 영지를 수 영지로 바꿉니다. 속성 변경을 막는 효과가 있으면 바뀌지 않습니다.',
    lilith:'전투 ST를 내 남은 손패 수 × 10으로 맞춥니다.',
    lung:'전투 ST와 HP를 각각 내가 가진 수 호부 수와 동일하게 맞춥니다.',
    madclown:'전투에 참여하지 않은 채 맵에 있으면 내 크리처의 전투 HP를 10 올립니다.',
    medusa:'일반 공격으로 피해를 주고 살아 있는 상대를 석상으로 바꿉니다.',
    mujina:'전투 ST와 HP를 각각 상대의 현재 손패 수 × 10으로 맞춥니다.',
    nymph:'화 속성 상대의 일반 공격을 무효화합니다. 일반 공격 후 살아 있는 상대의 최대 HP가 30 이하면 40% 확률로 손패에 넣습니다. 빈자리가 필요합니다.',
    remora:'전투가 끝나면 상대 셉터의 손패에서 카드 한 장을 무작위로 파괴합니다.',
    seabonze:'이 크리처가 참여한 전투에서는 양쪽의 장비와 크리처 능력이 봉쇄됩니다.',
    stormgiant:'화 속성 상대에게 강타합니다.',
    suiko:'전투가 끝나고 이 크리처와 수비 크리처가 생존하면 수비 크리처에 바이탈리티를 부여합니다.',
    undine:'전투 HP를 내 수 영지 수 × 20으로 맞춥니다. 수 속성 상대의 일반 공격을 무효화합니다.',
    vision:'지형 보너스 적용 전 전투 HP를 30으로 맞춥니다.',
    vodyanoi:'수비하면서 일반 공격으로 피해를 준 상대를 80% 확률로 즉사시킵니다.',
    wizard:'두루마리로 공격하면 강타합니다.',
    yeti:'화 속성 상대의 일반 공격을 무효화합니다. 화 속성 상대에게 일반 공격으로 피해를 준 뒤 60% 확률로 즉사시킵니다.',
    angostura:'일반 공격으로 피해를 준 상대의 최대 HP가 30 이하면 80% 확률로 즉사시킵니다.',
    armadillo:'지형 보너스를 적용하기 전 전투 HP를 홀수 라운드에는 60, 짝수 라운드에는 30으로 맞춥니다.',
    basilisk:'일반 공격으로 피해를 준 상대를 50% 확률로 즉사시킵니다. 생존하면 교전 영지 레벨을 한 단계 내립니다.',
    blynx:'같은 지역의 빈 영지로 이동할 수 있습니다. 단일 대상 주문과 영지 능력의 대상이 되지 않습니다.',
    carbuncle:'두루마리 공격을 반사합니다. 드래곤플라이를 지원에 쓰면 카번플라이로 합체합니다.',
    cerberus:'같은 전투에서 두 번 연속으로 공격할 수 있습니다.',
    coati:'맵에 배치된 지 속성 크리처 한 마리당 전투 ST가 5 오릅니다.',
    cockatrice:'일반 공격으로 피해를 주고 살아 있는 상대를 스톤 월로 바꿉니다.',
    darkelf:'풍 속성 상대에게 강타합니다.',
    darkmaster:'전투에 참여하지 않은 채 맵에 있으면 지 속성 크리처의 전투 HP를 10 올립니다. 자신이 전투에서 생존하면 100G를 잃습니다.',
    deathquito:'일반 공격으로 피해를 주면 상대 셉터의 손패에서 무작위 카드 한 장을 파괴합니다.',
    deathgaze:'두루마리 공격을 무효화합니다. 전투에서 상대를 격파하고 생존하면 80% 확률로 그와 같은 종류의 카드를 상대 북에서 제거합니다.',
    dryad:'같은 지역의 빈 지 영지로 이동할 수 있습니다.',
    gargoyle:'수비에 참가하면 장비 보정을 적용하기 전에 전투 ST를 50으로 맞춥니다.',
    ghoul:'일반 공격 후 살아 있는 상대를 마비시킵니다. 상대를 격파하고 생존하면 HP를 회복합니다.',
    gigantherium:'방어 영지의 크리처에 인챈트가 걸려 있으면 전투 HP가 20 낮아집니다.',
    gnome:'이 크리처가 있는 영지의 통행료가 1.5배가 됩니다.',
    grimalkin:'단일 대상 주문과 영지 능력의 대상이 되지 않습니다.',
    greenmold:'생존하면 전투가 끝날 때 HP를 최대치까지 회복합니다.',
    healer:'생존하면 전투가 끝날 때 HP를 최대치까지 회복합니다.',
    hugespider:'일반 공격 후 살아 있는 상대를 마비시킵니다.',
    hunbaba:'일반 공격 후 살아 있는 상대에게 독을 부여합니다. 교전에 참여하지 않은 채 맵에 있으면 풍 속성 크리처의 전투 ST를 10 낮춥니다.',
    leshy:'어느 한쪽이라도 생존하면 교전 영지 레벨을 한 단계 올립니다. 상한은 5입니다.',
    mandrake:'전투 종료 시 전투 HP가 1~20이면 양쪽 크리처가 파괴됩니다.',
    mudman:'맵에 배치된 지 속성 크리처 한 마리당 전투 HP가 5 오릅니다.',
    mummy:'전투에서 격파되면 내 이번 주회 번호 × 50G를 얻습니다.',
    opalidol:'맵에 있으면 전투에서 생존한 모든 크리처가 재생합니다.',
    odradek:'주문과 영지 능력으로 현재 HP와 최대 HP가 변하지 않습니다.',
    raksas:'상대를 격파하고 생존하면 상대가 가장 많이 보유한 속성의 호부를 30% 줄입니다.',
    sage:'장비가 파괴되거나 빼앗기지 않습니다.',
    taotieh:'상대를 격파하고 생존하면 기본 ST와 최대 HP가 각각 최대 10 오릅니다. 상한은 80입니다.',
    trenchworm:'풍 속성 상대의 지형 HP 보너스를 관통합니다.',
    vampire:'일반 공격으로 준 피해량만큼 HP를 회복합니다.',
    wereboar:'침략할 때 전투 ST가 30 오릅니다.',
    carbunfly:'카벙클과 드래곤플라이의 합체로 생성됩니다. 두루마리를 반사하며 격파되면 카벙클로 돌아옵니다.',
    gooba:'구바 퀸의 영지 능력으로 빈 영지에 생성됩니다.',
    beelzebub:'전투에 참여하지 않은 채 맵에 있으면 풍 속성 크리처의 전투 HP를 10 올립니다. 자신이 전투에서 생존하면 100G를 잃습니다.',
    centaur:'전투 후 사용한 장비를 내 북으로 돌려보냅니다.',
    chonchon:'장비를 사용하지 않으면 전투 HP가 20 오릅니다. 양쪽이 생존하면 수비 크리처에 안티 엘리먼트를 부여합니다.',
    cornfolk:'전투에서 격파되거나 주문 및 영지 능력으로 파괴되면 200G를 얻습니다.',
    dhampir:'지 속성 상대의 일반 공격을 무효화합니다. 지 속성 상대에게 일반 공격으로 피해를 준 뒤 60% 확률로 즉사시킵니다.',
    elf:'지 속성 상대에게 강타합니다.',
    giantrattler:'장비 없이 전투하고 양쪽이 생존하면 수비 크리처에 디지즈를 부여합니다.',
    gouda:'전투 ST와 HP를 각각 맵에 배치된 풍 속성 크리처 수 × 10으로 맞춥니다.',
    gremlin:'전투가 시작되면 상대 장비를 파괴합니다.',
    holyllama:'같은 지역의 빈 풍 영지로 이동할 수 있습니다.',
    igneousfatui:'일반 공격으로 피해를 준 상대를 80% 확률로 즉사시킵니다.',
    knight:'최대 HP가 50 이상인 상대에게 강타합니다.',
    leprechaun:'전투가 시작되면 내 장비를 상대에게 넘겨 대신 사용하게 합니다.',
    leveler:'생존하면 교전 영지의 레벨을 한 단계 내립니다. 풍 영지는 바뀌지 않습니다.',
    mastermonk:'장비가 없으면 전투 ST가 30 오르고 전투 HP가 30 낮아집니다.',
    mermecoleo:'격파되면 드래곤플라이로 변합니다.',
    nightfiend:'교전 영지의 레벨 × 20만큼 전투 ST가 오릅니다.',
    nightmare:'일반 공격이 상대의 지형 HP 보너스를 관통합니다.',
    nike:'일반 공격으로 피해를 주면 상대를 마비시킵니다.',
    nue:'교전에 참여하지 않은 채 맵에 있으면 침략 크리처의 전투 ST를 10 낮춥니다.',
    paladin:'무속성 상대에게 강타합니다.',
    pegasus:'단일 대상 주문과 영지 능력의 대상이 되지 않고 두루마리 공격을 무효화합니다.',
    powdereater:'이동할 때 원래 영지에 복제본을 남깁니다.',
    pushpull:'같은 전투에서 두 번 연속으로 공격할 수 있습니다.',
    quetzalcoatl:'전투에 참여하지 않은 채 맵에 있으면 선제 능력이 있는 크리처의 전투 ST를 10 올립니다.',
    roadrunner:'영지 명령으로 이동할 때 두 칸 떨어진 영지를 고를 수 있습니다.',
    soulcollector:'이번 경기에서 파괴된 크리처 한 마리당 전투 ST가 5 오릅니다.',
    spectre:'장비와 지형 보너스를 적용하기 전 ST와 HP를 각각 10~70 사이에서 무작위로 정합니다.',
    sphinx:'교전에 참여하지 않은 채 맵에 있으면 지 속성 크리처의 전투 HP를 10 낮춥니다.',
    succubus:'일반 공격으로 피해를 주면 상대의 기본 ST를 0으로 바꿉니다.',
    trampleweed:'배치된 영지의 레벨을 바꿀 수 없게 합니다.',
    virus:'전투에 참여하지 않은 채 맵에 있으면 모든 크리처의 전투 HP를 10 낮춥니다.',
    wendigo:'장비 없이 전투하고 양쪽이 생존하면 수비 크리처에 포그를 부여합니다.',
    witch:'두루마리로 공격하면 강타합니다.',
    wyvern:'같은 지역의 빈 풍 영지로 이동할 수 있습니다.',
    crimsonvine:'일반 공격으로 준 피해량만큼 HP를 회복합니다.',
    flammefleur:'전투 ST는 내 화·지 영지 수 × 10입니다. 상대에게 피해를 주지 못하고 생존하면 전투 종료 시 상대를 격파합니다.',
    fontaciel:'전투 HP는 내 수·풍 영지 수 × 10입니다.',
    jackolantern:'일반 공격으로 피해를 주면 전투 보너스를 제외한 내 남은 HP의 두 배만큼 상대 마력을 빼앗습니다.',
    magmaavatar:'전투 ST와 HP는 각각 내 화·지 영지 수 × 15입니다.',
    stormavatar:'전투 ST와 HP는 각각 내 수·풍 영지 수 × 15입니다.',
    warlock:'단일 대상 주문과 영지 능력의 대상이 되지 않습니다. 두루마리로 공격하면 강타합니다.'
  };
  const territory={
    metalbug:'HP가 줄어든 크리처 한 마리를 파괴한 뒤 자신도 파괴됩니다.',
    sakuya:'고른 내 영지의 레벨이 3 이하라면 지 속성으로 바꿉니다.',
    archbishop:'고른 영지의 크리처에 걸린 인챈트를 해제합니다.',
    astralqueen:'맵의 모든 크리처에게 카무플라주를 부여합니다.',
    clockworkowl:'고른 셉터가 다음 이동 때 진행 방향을 새로 고릅니다.',
    dancingdoll:'모든 호부의 개당 가격을 20% 내립니다.',
    goldentotem:'내가 300G를 얻고 이 크리처는 파괴됩니다.',
    tetramorph:'영지와 속성이 다른 적 크리처 하나에게 20 피해를 줍니다.',
    conjurer:'고른 빈 영지에 바알을 소환하고 이 크리처는 파괴됩니다.',
    domovikha:'고른 영지에 랜드 프로텍션을 부여합니다.',
    domovoi:'고른 크리처에게 판타즘을 부여합니다.',
    fanatic:'고른 크리처와 이 크리처에게 각각 20 피해를 줍니다.',
    heatimp:'고른 적이 가장 많이 가진 속성의 호부를 40% 줄이고 이 크리처는 파괴됩니다.',
    sharazad:'모든 셉터의 인챈트를 해제합니다.',
    algasphere:'자신의 최대 HP와 현재 HP를 최대 10씩 올립니다. 최대 HP 상한은 80입니다.',
    banshee:'모든 크리처에게 각자 최대 HP의 25%에 해당하는 피해를 줍니다.',
    bookworm:'고른 적의 손패에서 카드 한 장을 골라 파괴합니다.',
    fate:'내 북에서 한 장을 뽑습니다.',
    hyde:'고른 크리처를 마비시킵니다.',
    barometz:'이번 주회 번호 × 30G를 얻습니다.',
    goobaqueen:'고른 빈 영지에 구바를 소환합니다.',
    healer:'고른 크리처의 HP를 최대 30 회복시킵니다.',
    quakebeast:'인접 영지의 레벨을 한 단계 내린 후 이 크리처는 파괴됩니다.',
    spittingcobra:'고른 크리처에게 독을 부여합니다.',
    archer:'고른 적 크리처에게 10 피해를 줍니다.',
    holyllama:'고른 셉터의 다음 이동 주사위 눈을 6으로 고정합니다.',
    windimp:'고른 적의 현재 마력을 절반으로 줄인 후 이 크리처는 파괴됩니다.',
    witch:'고른 적의 손패에 있는 주문과 장비 한 장당 20G를 빼앗습니다.',
    fontaciel:'내 모든 크리처의 최대 HP와 현재 HP를 최대 5씩 올립니다. 최대 HP 상한은 100입니다.',
    gogma:'고른 레벨 1 영지를 레벨 3으로 올립니다.',
    warlock:'고른 셉터에게 안티 매직을 부여합니다.'
  };
  const beginsBattle={
    werewolf:'일반 공격으로 피해를 준 상대가 살아 있으면 울프로 바꿉니다.',
    cockatrice:'일반 공격으로 피해를 준 상대가 살아 있으면 월 오브 스톤으로 바꿉니다.',
    odradek:'주문으로 현재 HP와 최대 HP를 바꿀 수 없습니다.',
    leveller:'전투에서 생존하면 풍 속성이 아닌 교전 영지의 레벨을 1 낮춥니다.',
    basilisk:'일반 공격으로 피해를 준 상대를 40% 확률로 즉사시킵니다. 생존하면 교전 영지의 레벨을 1 낮춥니다.',
    golem:'전투에서 살아남으면 기본 ST가 10 줄어듭니다.',
    greatfossil:'이 영지의 통행료는 0G입니다. 전투에서 파괴되면 티라노사우루스로 되살아납니다.',
    colossus:'주회를 완주해도 HP가 회복되지 않습니다.',
    centaur:'전투에서 생존하면 사용한 아이템을 북에 넣고 남은 카드를 섞습니다.',
    wereboar:'전투 중 ST가 30 오릅니다.',
    roadrunner:'이동 명령으로 한 칸 또는 두 칸 떨어진 영지에 갈 수 있습니다.',
    gigantherium:'전투하는 크리처 중 하나에 인챈트가 있으면 전투 HP가 20 줄어듭니다.',
    sandman:'주문으로 현재 HP와 최대 HP를 바꿀 수 없습니다.',
    manticore:'전투 ST와 HP는 내 손패 수 × 10입니다.',
    lunatichare:'생존하면 상대의 기본 ST와 HP를 바꿉니다. 카드로 돌아갈 때까지 바뀐 능력치가 유지됩니다.',
    jackalope:'주문으로 파괴되면 같은 영지에서 험바바로 부활합니다.',
    humbaba:'교전에 참여하지 않고 지도에 있으면 풍 속성 크리처의 전투 ST를 10 낮춥니다.',
    aspidochelone:'전투 ST와 HP에 현재 라운드 수를 더합니다.',
    taotieh:'상대를 격파하고 생존하면 기본 ST·현재 HP·최대 HP가 20씩 오릅니다. 기본 ST와 최대 HP 상한은 100입니다.',
    sphinx:'전투에 참여하지 않은 채 배치되어 있으면 지 크리처의 전투 HP를 10 낮춥니다. 일반 공격이 명중하면 상대에게 수면을 부여합니다.',
    wendigo:'일반 공격이 명중하면 상대 크리처에 안개를 걸어 통행료를 줄입니다.',
    avenger:'내 총마력 순위에 10을 곱한 만큼 전투 ST와 HP가 오릅니다.',
    camazotz:'상대 기본 ST만큼 전투 ST가 오릅니다. 승리하면 상대가 가장 많이 가진 종류의 호부를 30% 잃게 합니다.',
    juggernaut:'상대 기본 ST가 40 이상이면 강타하고 방어형 상대에게 명중하면 즉사시킵니다. 완주 보상으로 HP가 회복되지 않습니다.',
    mattocktail:'상대를 격파하고 생존하면 교전 영지 레벨을 1 올립니다. 최고 레벨은 5입니다.',
    nezha:'일반 공격은 지형 HP 보너스를 관통합니다. 내 영지가 상대보다 두 곳 이상 적으면 전투 ST +30. 승리하면 최대 HP가 최대 100까지 10 오릅니다.',
    amabie:'양쪽이 살아남으면 빈 수 영지로 이동합니다. 빈 수 영지가 없으면 파괴됩니다.',
    otohime:'교전에 참여하지 않은 채 배치되어 있으면 방어 측 전투 HP +10. 양쪽이 생존하면 상대에게 노쇠를 부여합니다.',
    kudzufolk:'전투에서 격파될 때 내 영지가 네 곳 이하라면 그린 몰드로 부활합니다.',
    landurchin:'상대 크리처의 영지 이동 명령으로 침략받지 않습니다.',
    shamblingvine:'내 지 영지 한 곳당 전투 ST가 10 오릅니다. 전투하는 크리처 중 하나에 인챈트가 있으면 전투 HP가 20 오릅니다.',
    deathworm:'상대의 일반 공격 무효화와 반사를 무시합니다.',
    doomreaper:'이번 대국에서 파괴된 크리처 한 마리당 전투 ST가 5 오릅니다. 침략 전투가 끝나면 100G를 얻습니다.'
  };
  const firstRules={
    dragon:'침략할 때 전투 ST가 10, 수비할 때 전투 HP가 10 오릅니다.',
    golem:'전투에서 살아남으면 기본 ST가 10 줄어듭니다.',
    manticore:'전투 ST를 현재 HP와 동일하게 맞춥니다.',
    coati:'맵에 배치된 야수형 크리처 한 마리당 전투 ST가 5 오릅니다.',
    darkelf:'인간형 상대에게 강타합니다.',
    elf:'불사형 상대에게 강타합니다.',
    knight:'용형 상대에게 강타합니다.',
    samurai:'일반 공격으로 피해를 준 인간형 상대를 30% 확률로 즉사시킵니다.',
    deathgaze:'두루마리 공격을 무효화합니다. 전투에서 상대를 격파하고 생존하면 60% 확률로 그와 같은 종류의 카드를 상대 북에서 제거합니다.',
    sorcerer:'크리처를 지원 장비로 사용할 수 있습니다. 두루마리로 공격하면 강타가 적용됩니다.'
  };
  const elements=['화','수','지','풍'],races={rh:'인간형',rb:'야수형',rd:'용형',ru:'불사형'};
  const targets=ids=>ids.map(i=>elements[i]||'무').join('·')+' 속성';
  const revoltBattle={
    hellpyron:'전투에 참여하지 않은 헬 파이론이 지도에 있으면 화·지 크리처의 전투 ST +10.',
    pyromancer:'장비 없이 두루마리로 30 피해를 줍니다. 상대 일반 공격에 맞고 생존하면 기본 ST 20, 최대 HP 30으로 바뀝니다.',
    knighterrant:'지 속성 크리처를 제물로 버리면 아머드 팔라딘으로 변합니다. 일반 공격 피해의 절반을 반사하고 자신은 피해를 받지 않습니다.',
    armedpaladin:'배치된 화·지 크리처 한 마리마다 전투 ST 10을 얻습니다. 두루마리 공격은 무효화합니다.',
    lavakin:'현재 라운드 수만큼 전투 ST가 줄고 전투 HP가 오릅니다.',
    otohime:'전투에 참여하지 않은 오토히메가 지도에 있으면 방어 측 전투 HP +10. 전투 후 살아남은 상대에게 노쇠를 겁니다.',
    lordofbane:'전투에 참여하지 않은 로드 오브 베인이 지도에 있으면 수·풍 크리처의 전투 ST +10.',
    sulfurousballoon:'전투에서 격파되면 상대의 기본 HP에 40 피해를 줍니다.',
    nessie:'수 영지에서 싸우면 영지 레벨 × 10만큼 전투 HP가 오릅니다.',
    soulcollector:'이번 대국에서 지금까지 파괴된 크리처 한 마리마다 전투 ST +5.',
    hiveworker:'지도에 배치된 하이브 워커 한 마리마다 전투 ST·HP +10.',
    chimera:'주회 보너스를 받을 때마다 기본 ST가 10 오릅니다. 최대 100.',
    lonebeast:'전투 HP에 자신의 기본 ST를 더합니다. 교전 영지에 인접한 내 영지가 있으면 일반 공격이 강타합니다.',
    earthspirit:'이 영지의 레벨이나 속성을 영지 명령으로 바꾸면 최대 HP +10. 최대 100.',
    dunetitan:'이 영지의 레벨이나 속성을 영지 명령으로 바꾸면 최대 HP −10. 최저 10.',
    legendarypharos:'주회 보너스를 받아도 HP를 회복하지 않습니다.',
    rocktitan:'전투에서 살아남으면 전투 종료 시 기본 ST와 최대 HP가 각각 10 줄어듭니다.',
    greatfossil:'통행료를 받지 않습니다. 전투에서 격파되면 티라노사우루스로 살아납니다.',
    duskdweller:'전투에서 승리하면 기본 ST와 최대 HP가 각각 10 오릅니다. 최대 100.',
    devastator:'침략 전투에서 살아남으면 교전 영지 레벨을 1 내립니다. 최저 Lv.1.',
    shadowgeist:'일반 공격으로 피해를 주면 상대의 기본 ST를 0으로 만듭니다.',
    saint:'무속성 상대에게 일반 공격으로 피해를 주면 즉사시킵니다.'
  };
  const handheldTerritory={
    fanatic:'고른 크리처에게 20 피해를 주고 이 크리처의 HP도 10 줄어듭니다.',
    algasphere:'자신의 최대 HP와 현재 HP를 최대 20씩 올립니다. 최대 HP 상한은 100입니다.',
    goldentotem:'200G를 얻고 이 크리처는 파괴됩니다.',
    mystic:'고른 크리처의 최대 HP와 현재 HP를 최대 10씩 올립니다. 최대 HP 상한은 100입니다.',
    necromancer:'마지막으로 파괴된 크리처를 손패에 추가합니다.',
    sleipnir:'내 크리처 한 마리를 한 칸 또는 두 칸 이동시킵니다. 목적지가 적 영지면 침략합니다.',
    witch:'고른 적의 손패에 있는 주문과 장비 한 장당 30G를 빼앗습니다.'
  };
  function territorySummary(C,card){
    const art=C.secretArt?.(card);
    if(art)return '비술 '+art.cost+'G · '+art.label+'. 주사위를 굴리기 전에 사용합니다.';
    if(C.edition==='revolt')return;
    const key=C.combo.key(card),saga={fay:'고른 크리처의 기본 ST를 최대 100까지 20 올립니다.',tokebi:'내 영지 한 곳을 포기하고 영지 가치만큼 마력을 얻습니다.',
      hypnosloth:'고른 셉터의 다음 주사위를 1로 고정합니다.',lichenoid:'고른 크리처의 최대 HP를 최대 100까지 10 올립니다.',
      spinyagama:'사이즈모돈으로 진화합니다.',seismodon:'브론타이즈로 진화합니다.',
      spudfolk:'지도에 배치된 지 크리처 한 마리당 20G를 얻습니다.',
      sylph:'가루다로 진화합니다. 진화한 크리처는 영지에 남습니다.',
      lamia:'고른 크리처의 기본 ST를 20 내립니다. 최저 0입니다.',
      hellpyron:'누적된 크리처 파괴 1건당 50G를 얻고 파괴 수를 0으로 초기화합니다.',
      deathscythe:'머미로 진화합니다. 진화한 크리처는 영지에 남습니다.',
      fortress:'고른 크리처에게 피해 10을 줍니다.',helltic:'고른 크리처에게 피해 20을 줍니다.',
      burnacle:'고른 영지에 안개를 걸어 통행료를 절반으로 줄입니다.',
      creepingflame:'이 크리처를 인접한 영지 한 곳으로 이동합니다. 상대 영지라면 침략합니다.',
      rockshell:'이 영지의 침략을 막고 통행료를 0G로 바꿉니다.',sakuya:'내 영지 한 곳을 지 속성으로 바꿉니다.'};
    const begins={goldentotem:'400G를 얻고 이 크리처는 파괴됩니다.',sakuya:'내 영지 한 곳을 지 속성으로 바꿉니다.',fay:'고른 크리처의 기본 ST를 최대 100까지 20 올립니다.',
      algasphere:'자신의 HP와 최대 HP를 20 올립니다. 최대 HP는 100까지 오릅니다.',
      burnacle:'고른 영지의 통행료를 절반으로 줄입니다.',sanguivore:'고른 크리처의 최대 HP를 10 낮춥니다.',
      amabie:'고른 크리처의 HP와 최대 HP를 10 올립니다. 최대 HP는 100까지 오릅니다.',
      beacontower:'자신에게 모든 내 영지 개발 효과를 겁니다. 다음 차례에 지나지 않은 내 영지에도 명령할 수 있습니다.',
      swampspawn:'고른 셉터가 다음 두 번 굴리는 주사위 눈을 1~3으로 제한합니다.',
      landurchin:'고른 크리처가 영지 명령으로 이동하지 못하게 합니다.'};
    const effect=(C.edition==='begins'?begins[key]:C.edition==='3ds'?handheldTerritory[key]:C.edition==='saga'?saga[key]:null)||territory[key],cost=C.territoryAbilityCost(card);
    if(effect&&cost!=null)return '영지 능력 '+cost+'G · '+effect;
  }
  function describe(C,card){
    if(card.kind!=='creature'||card.catalogOnly)return;
    const key=C.combo.key(card),firstEdition=C.edition==='ps1'||C.edition==='saturn';
    const pieces=[];
    if(card.first)pieces.push('선제');
    if(card.last)pieces.push('후공');
    if(card.stationary)pieces.push('방어 전용. 손패에서 침략하거나 영지 이동에 사용할 수 없습니다.');
    if(card.itemCreature)pieces.push('아이템 크리처. 장비로 사용하면 이 카드의 기본 ST·HP를 더합니다.');
    if(card.supportElements?.length)pieces.push('지원. '+card.supportElements.map(e=>C.elements[e]||'무').join('·')+' 속성 크리처를 장비로 사용할 수 있습니다.');
    else if(card.support&&!(firstEdition&&key==='sorcerer'))pieces.push('지원. 장비를 고를 때 크리처를 사용할 수 있습니다.');
    if(card.regenerate&&!['greenmold','healer'].includes(key))pieces.push('생존하면 전투가 끝날 때 HP를 최대치까지 회복합니다.');
    if(C.edition==='3ds'&&key==='shadefolk')pieces.push('전투 ST는 상대 크리처와 같은 속성의 배치 크리처 수 × 10입니다. 설욕 시 상대 셉터의 마력 30%를 빼앗습니다.');
    if(C.edition==='3ds'&&key==='catoblepas')pieces.push('설욕 시 전투 영지의 레벨을 1 내립니다.');
    if(C.edition==='3ds'&&key==='raksas')pieces.push('설욕 시 상대 셉터가 가장 많이 보유한 종류의 호부 30%를 빼앗습니다.');
    if(card.freeToll&&key!=='gemoid')pieces.push('이 영지의 통행료는 0G입니다. 전투에서 파괴되면 티라노사우루스로 부활합니다.');
    if(C.edition==='3ds'&&key==='ixtol')pieces.push('일반 공격이 무효화되거나 반사되고 살아남으면 상대를 파괴합니다. 승리하면 기본 ST가 최대 100까지 10 오릅니다.');
    if(C.edition==='3ds'&&key==='kodama')pieces.push('일반 공격이 무효화되거나 반사되고 살아남으면 상대 최대 HP를 30 낮춥니다.');
    if(C.edition==='3ds'&&key==='mystic')pieces.push('일반 공격으로 피해를 준 상대의 최대 HP가 60 이상이면 70% 확률로 즉사시킵니다.');
    if(card.scrollCritical&&!battle[key]?.includes('두루마리'))pieces.push('두루마리 공격이 강타합니다.');
    if(C.edition==='revolt'&&key==='amphibianwarrior')pieces.push('수·풍 영지에서 싸우면 전투 ST +20. 주문으로 기본 HP가 변하지 않습니다.');
    if(['revolt','begins'].includes(C.edition)&&key==='apsaras')pieces.push('Lv.3 이상 영지에서 싸우면 일반 공격을 무효화합니다.');
    if(card.synergy)pieces.push('감응. '+C.elements[card.synergy.element]+' 크리처가 지도에 있으면 전투 ST +'+card.synergy.st+(card.synergy.hp?' · HP +'+card.synergy.hp:'')+'.');
    if(['revolt','begins'].includes(C.edition)&&key==='pulgasari')pieces.push('장비 사용 시 전투 ST +20. 상대가 장비를 쓴 전투에서 살아남으면 최대 HP +10. 최대 100.');
    if(C.edition==='revolt'&&key==='madharlequin')pieces.push('지도에 배치돼 있으면 내 다른 크리처가 싸울 때 인접한 내 영지 한 곳당 ST·HP +20.');
    if(['revolt','3ds'].includes(C.edition)&&key==='firedrake')pieces.push('지도에 배치된 화 크리처 한 마리마다 전투 ST +5.');
    if(C.edition==='revolt'&&key==='uriel')pieces.push('저주가 걸린 상대에게 강타합니다.');
    if(C.edition==='revolt'&&key==='dwarvenminer')pieces.push('이 영지의 통행료를 1.5배로 올립니다.');
    if(card.immediate)pieces.push('즉시. 이 크리처가 소환되거나 교체돼 배치된 영지에 교체를 제외한 영지 명령을 사용할 수 있습니다.');
    if(C.edition==='saga'&&key==='wolverine')pieces.push('이 영지의 통행료를 1.5배로 올립니다.');
    if(card.vigorous)pieces.push('활력. 영지 명령이나 비술 사용 후 피로 상태가 되지 않습니다.');
    if(card.half)pieces.push('받는 일반 공격 피해가 절반으로 줄어듭니다.');
    if(card.doubleAttack)pieces.push((C.edition==='revolt'&&key==='tetrarm'?'일반·두루마리':'일반')+' 공격을 연속으로 두 번 합니다. 같은 효과는 중첩되지 않습니다.');
    if(!card.evo&&card.spellWard&&key!=='pegasus')pieces.push('지정 주문과 영지 능력의 대상이 되지 않습니다.');
    if(!card.evo&&card.neutralizeScroll&&key!=='pegasus')pieces.push('두루마리 공격을 무효화합니다.');
    if(card.blocksFirst)pieces.push('선제 능력이 있는 크리처의 일반 공격을 무효화합니다.');
    if(card.blocksSmall)pieces.push('최대 HP 30 이하인 상대의 일반 공격을 무효화합니다.');
    if(card.criticalMHP)pieces.push('최대 HP '+card.criticalMHP+' 이하인 상대를 일반 공격하면 강타합니다.');
    if(C.edition==='3ds'&&key==='camazotz')pieces.push('상대 기본 ST만큼 전투 ST가 오릅니다. 적을 격파하면 상대가 가장 많이 보유한 한 종류의 호부를 30% 파괴합니다.');
    if(C.edition==='3ds'&&key==='myrmecoleo')pieces.push('전투에서 격파되면 드래곤플라이로 변해 부활합니다.');
    if(C.edition==='3ds'&&key==='generalguan')pieces.push('배치된 최대 HP 50 이상 크리처 한 마리마다 전투 ST +5.');
    if(card.invadeST)pieces.push('침략할 때 전투 ST +'+card.invadeST);
    if(card.blocksLarge)pieces.push('최대 HP가 40 이상인 상대의 일반 공격을 무효화합니다.');
    if(C.edition==='revolt'&&card.innateScroll==='base')pieces.push('장비 없이 공격하면 기본 ST만큼 두루마리 피해를 줍니다.');
    if(C.edition==='begins'&&card.innateScroll)pieces.push('금술. 장비 없이 공격하면 두루마리 피해 '+card.innateScroll+'을 줍니다.');
    if(card.scrollCriticalElements?.length)pieces.push(card.scrollCriticalElements.map(e=>C.elements[e]).join('·')+' 속성 상대에게 두루마리 강타가 적용됩니다.');
    if(card.evo){
      if(card.spellWard)pieces.push('주문과 비술의 대상으로 지정할 수 없습니다.');
      if(card.protectGear)pieces.push('장비가 파괴되거나 빼앗기지 않습니다.');
      if(card.neutralizeScroll)pieces.push('두루마리 공격을 무효화합니다.');
      if(card.innateScroll)pieces.push('장비 없이 공격하면 두루마리 피해 '+card.innateScroll+'을 줍니다.');
      if(card.drainST)pieces.push('일반 공격으로 피해를 주면 상대의 기본 ST를 0으로 낮춥니다.');
      if(card.tollFactor)pieces.push('이 영지의 통행료를 '+card.tollFactor+'배로 올립니다.');
      if(card.evoLegacy)pieces.push(card.evoLegacy==='draw'?'전투에서 파괴되면 카드 한 장을 뽑습니다.':'전투에서 파괴되면 100G를 얻습니다.');
      const scaling={
        landST:'전투 ST는 내 영지 수 × 10입니다.',landHP:'전투 HP는 내 영지 수 × 10입니다.',
        roundST:'전투 ST에 현재 라운드를 더합니다.',roundHP:'전투 HP에 현재 라운드를 더합니다.',
        elementST:'전투 ST에 같은 속성의 배치 크리처 수 × 5를 더합니다.',elementHP:'전투 HP에 같은 속성의 배치 크리처 수 × 5를 더합니다.',
        ageST:'전투 ST에 AGE × 4를 더합니다.',ageHP:'전투 HP에 AGE × 4를 더합니다.'
      };
      if(card.evoBattle)pieces.push(scaling[card.evoBattle]);
    }
    if(card.battleST)pieces.push('전투 ST '+(card.battleST>0?'+':'')+card.battleST);
    if(card.battleHP)pieces.push('전투 HP '+(card.battleHP>0?'+':'')+card.battleHP);
    if(card.criticalElements?.length)pieces.push(targets(card.criticalElements)+' 상대에게 강타합니다.');
    if(card.pierceElements?.length)pieces.push(targets(card.pierceElements)+' 상대의 지형 HP 보너스를 관통합니다.');
    if(card.reflectElements?.length)pieces.push(targets(card.reflectElements)+' 상대의 일반 공격을 반사합니다.');
    if(card.neutralizes?.length)pieces.push(targets(card.neutralizes)+' 상대의 일반 공격을 무효화합니다.');
    if(card.reflectNormal)pieces.push('일반 공격을 상대에게 반사합니다.');
    if(card.neutralizeNormal)pieces.push('일반 공격을 무효화합니다.');
    const status=card.poison?'독':card.confuse?'혼란':card.paralyze?'마비':null;
    if(status){
      const racesOnly=card.statusRaces?.map(r=>races[r]).join('·');
      pieces.push((racesOnly?racesOnly+' 상대에게':'상대에게')+' 일반 공격으로 피해를 주면 '+status+' 상태를 부여합니다.');
    }
    const special=C.edition==='3ds'&&key==='powdereater'?'영지 이동 명령으로 이동할 때 원래 영지에도 분신을 남깁니다. 주문으로 이동하면 분신이 생기지 않습니다.':
      (C.edition==='revolt'||C.edition==='3ds'&&['chimera','pyromancer','sulfurousballoon'].includes(key))&&revoltBattle[key]?revoltBattle[key]:
      (C.edition==='begins'||C.edition==='3ds'&&['jackalope','humbaba','golem','leveller'].includes(key))&&beginsBattle[key]?beginsBattle[key]:
      C.edition==='begins'&&key==='fate'?'전투에서 격파되면 카드 한 장을 뽑습니다.':
      C.edition==='begins'&&key==='darkmaster'?'지도에 배치되어 전투에 참여하지 않으면 지 크리처의 전투 ST를 10 올립니다. 자신이 전투에 생존하면 100G를 지불합니다.':
      C.edition==='begins'&&key==='beelzebub'?'지도에 배치되어 전투에 참여하지 않으면 풍 크리처의 전투 ST를 10 올립니다. 자신이 전투에 생존하면 100G를 지불합니다.':
      ['begins','saga'].includes(C.edition)&&key==='bloodypudding'?'지원 크리처를 쓰면 그 카드의 HP만큼 자신의 최대 HP가 오릅니다. 최대 HP는 100까지 오릅니다.':
      C.edition==='revolt'&&key==='fate'?'전투에서 격파됐을 때 손패가 10장 미만이면 카드 한 장을 뽑습니다.':
      C.edition==='revolt'&&key==='hellgrammite'?'전투에서 격파되면 서펀트 플라이로 변해 살아납니다.':
      C.edition==='revolt'&&key==='serpentfly'?'수 영지에서도 지형 HP 보너스를 받습니다.':
      C.edition==='revolt'&&key==='thunderspawn'?'내 수 영지 한 곳당 전투 ST가 10 오릅니다. 영지와 크리처의 속성이 다른 적 영지로 원거리 침략할 수 있습니다.':
      C.edition==='revolt'&&key==='kaiserpenguin'?'전투 시작 시 상대가 사용한 도구, 두루마리 또는 지원 크리처를 파괴합니다.':
      C.edition==='begins'&&key==='barong'?'점유 중인 영지의 속성 변경과 레벨 하락을 막습니다. 전투에서 격파되면 손패로 돌아갑니다.':
      C.edition==='begins'&&key==='onyx'?'최대 HP 40 이상인 상대에게 강타합니다.':
      C.edition==='begins'&&key==='redcap'?'배치된 고블린 한 마리당 자신의 전투 ST와 HP가 20씩 오릅니다. 자신이 전투에 참여하지 않으면 고블린의 전투 ST를 20 올립니다.':
      C.edition==='begins'&&key==='paleglobster'?'전투 ST와 HP에 교전 영지 레벨 × 10을 더합니다. 주문에 의해 HP나 최대 HP가 바뀌지 않습니다.':
      C.edition==='begins'&&key==='ambermosquito'?'전투에서 티라노사우루스와 자이언트 래트 중 하나로 같은 확률로 변신합니다. 생존하면 원래 모습으로 돌아옵니다.':
      C.edition==='begins'&&key==='yowie'?'무속성 상대에게 강타합니다. 이 영지의 통행료는 지불할 때 기본값의 0.5~2.5배로 정해집니다.':
      C.edition==='begins'&&key==='baldanders'?'전투 중 다른 크리처로 무작위 변신합니다. E 등급은 제외되며 생존하면 원래 모습으로 돌아옵니다.':
      C.edition==='begins'&&key==='cleric'?'일반 공격이 명중하면 무속성 상대를 즉사시킵니다.':
      C.edition==='begins'&&key==='samurai'?'일반 공격이 명중하면 기본 ST 40 이상인 상대를 70% 확률로 즉사시킵니다.':
      C.edition==='begins'&&key==='chimera'?'완주 보상을 받을 때마다 기본 ST를 10 올립니다. 최대 100까지 오릅니다.':
      C.edition==='begins'&&key==='powdereater'?'영지 명령으로 이동하면 원래 영지에도 복제본을 남깁니다. 주문에 의한 이동에는 발동하지 않습니다.':
      C.edition==='begins'&&key==='behemoth'?'전투에서 살아남으면 내 손패 한 장을 무작위로 파괴합니다.':
      C.edition==='begins'&&key==='mothman'?'지도에 배치된 무속성 크리처 한 마리당 전투 ST가 5 오릅니다.':
      C.edition==='begins'&&key==='bandit'?'공격이 명중하면 준 피해의 두 배만큼 상대 마력을 빼앗습니다. 상대 마력이 부족하면 부채가 생깁니다.':
      C.edition==='begins'&&key==='baal'?'전투에서 살아남으면 내 손패 한 장을 무작위로 파괴합니다.':
      C.edition==='begins'&&key==='gelatinouswall'?'전투에서 살아남으면 받은 피해 1당 5G를 얻습니다.':
      C.edition==='begins'&&key==='willothewisp'?'공격이 명중하면 남은 전투 HP의 두 배만큼 상대 마력을 빼앗습니다. 상대 마력이 부족하면 부채가 생깁니다.':
      ['revolt','begins'].includes(C.edition)&&key==='triton'?'아이템을 사용하고 생존하면 전투가 끝날 때 카드 한 장을 뽑습니다.':
      C.edition==='begins'&&key==='valkyrie'?'승리하면 기본 ST가 최대 100까지 10 오릅니다.':
      C.edition==='revolt'&&key==='halfling'?'모든 속성 영지에서 지형 HP 보너스를 받습니다.':
      C.edition==='revolt'&&key==='cactuswall'?'수·풍 속성 상대와 싸울 때 전투 HP가 50 오릅니다.':
      C.edition==='revolt'&&key==='tigerweta'?'전투 영지에 인접한 내 영지가 있으면 전투 ST와 HP가 20씩 오릅니다.':
      C.edition==='revolt'&&key==='mummy'?'전투에서 격파되면 이번 주회 번호 × 40G를 얻습니다.':
      C.edition==='revolt'&&key==='creepingcoin'?'전투가 끝나거나 전투 및 주문으로 파괴되면 100G를 얻습니다.':
      C.edition==='revolt'&&key==='scylla'?'상대의 공격 성공 시 효과가 발동하지 않습니다. 생존하면 전투가 끝날 때 상대 크리처의 영지 통행료를 무효화합니다.':
      C.edition==='revolt'&&key==='phoenix'?'전투에서 격파되면 손패에 돌아옵니다. 이미 10장이면 파괴됩니다.':
      C.edition==='revolt'&&key==='amazon'?'장비 없이 일반 공격으로 피해를 주면 이번 주회 번호 × 30G를 상대에게서 빼앗습니다.':
      firstEdition?(firstRules[key]||battle[key]):battle[key];
    if(card.remoteVacantElements?.length)pieces.push('어느 지역이든 빈 '+targets(card.remoteVacantElements)+' 영지로 이동할 수 있습니다.');
    if(card.remoteVacant)pieces.push('어느 지역의 빈 영지로든 이동할 수 있습니다.');
    if(!card.basicBattle&&!card.revenge&&special&&!card.remoteVacant&&!card.remoteVacantElements)pieces.push(special);
    if(!firstEdition&&C.edition!=='begins'&&key==='samurai')pieces.push(C.edition==='revolt'?'일반 공격으로 피해를 준 상대의 기본 ST가 40 이상이면 70% 확률로 즉사시킵니다.':'일반 공격으로 피해를 준 상대의 최대 HP가 30 이하면 60% 확률로 즉사시킵니다.');
    const landAbility=territorySummary(C,card);
    if(landAbility)pieces.push(landAbility);
    return pieces.length?pieces.join(' · '):'기본 ST와 HP로 전투합니다.';
  }
  return {describe,territorySummary};
})();
if(typeof module!=='undefined')module.exports=CepterCreatureText;
