// Player-facing summaries of the implemented rules, keyed by effect rather than printed card name.
const describeCepterSpell=(()=>{
  const text={
    one:'이번 차례에 1칸 이동합니다.',
    zap:'고른 크리처에게 10 피해를 줍니다.',
    revoltLifeForce:'대상 셉터의 크리처와 아이템 사용 마력이 0G가 됩니다. 그 셉터가 주문을 쓰면 해당 주문과 이 인챈트가 해제됩니다.',
    revoltFear:'대상 셉터의 최대 HP가 가장 낮은 크리처를 손패로 돌려보냅니다. 손패가 10장이면 파괴됩니다. 현재 최저치가 동률인 대상은 선택할 수 없습니다.',
    hyperactive:'5라운드 동안 고른 크리처가 활력을 얻습니다. 영지 명령이나 비술을 사용해도 피로해지지 않습니다.',
    homeground:'속성이 맞지 않는 내 점유 영지가 네 곳 이상이면 크리처의 속성에 맞춥니다. 조건을 채우지 못하면 북에 돌아갑니다.',
    senseofwild:'한 장 뽑습니다. 크리처라면 배치할 수 있는 무작위 빈 영지에 소환합니다. 빈 영지가 없으면 손패에 남습니다.',
    uniformity:'3라운드 동안 대상 셉터가 받을 수 있는 영지 통행료를 200G로 고정합니다.',
    clusterburst:'지도에서 가장 많이 배치된 한 속성의 크리처 모두에 20 피해를 줍니다. 무속성도 포함합니다. 최다 속성이 동률이면 효과가 발생하지 않습니다.',
    clairvoyance:'대상 셉터의 손패를 확인합니다. 그 손패의 주문 사용 마력 합계의 절반을 얻습니다.',
    outrage:'대상 크리처를 인접한 적 영지로 이동시켜 침략하게 합니다.',
    thrustblow:'대상 크리처를 인접한 빈 영지로 옮깁니다.',
    revoltTemptation:'고른 크리처의 비술을 빌립니다. 그 크리처가 피로해도 사용할 수 있고 비술 비용은 들지 않습니다.',
    bountyhunt:'대상 크리처는 영지 명령으로 이동하거나 교체할 수 없습니다. 무기로 격파한 셉터가 300G를 얻습니다.',
    release:'4라운드 동안 내 크리처 카드에 적힌 지형과 아이템 사용 제한을 무시합니다.',
    asteroid:'영지 레벨을 1 내립니다. 애스터로이드 한 장을 합성에 쓰면 영지 레벨을 1로 내립니다.',
    diselement:'크리처의 지형 보너스를 없애고 한 장 뽑습니다. 크리처를 합성에 쓰면 피로한 크리처 모두에 적용됩니다.',
    dominantgrowth:'이 영지를 레벨업하거나 속성을 변경하면 크리처의 최대 HP +20. 최대 100입니다.',
    revoltErosion:'고른 셉터의 손패에서 두 장 이상 있는 카드 종류를 모두 파괴합니다. 주문을 합성하면 모든 셉터의 손패에 따로 적용됩니다.',
    assemblecards:'화·수·지·풍 크리처가 모두 손패에 있으면 500G를 얻습니다. 조건을 채우지 못하면 두 장 뽑습니다.',
    flatland:'내 레벨 2 영지가 다섯 곳 이상이면 그 영지들을 레벨 3으로 올립니다. 조건을 채우지 못하면 북에 돌아갑니다.',
    longline:'내 영지 네 곳 이상이 길을 따라 연달아 있으면 500G를 얻습니다. 조건을 채우지 못하면 두 장 뽑습니다.',
    tinyarmy:'내 최대 HP 30 이하 크리처가 다섯 마리 이상이면 각각 최대 HP +10과 500G를 얻습니다. 조건을 채우지 못하면 북에 돌아갑니다.',
    tyranny:'최대 HP가 30 이하인 모든 크리처를 마비시킵니다.',
    metamorphosis:'적 손패의 아이템이나 주문 한 장을 선택합니다. 모두의 북과 손패에서 그 카드와 같은 카드를 홀리 워드 6으로 바꿉니다.',
    sneakhand:'아이템을 두 장 이상 가진 적의 손패에서 아이템 한 장을 빼앗습니다.',
    revoltExchange:'내 영지의 크리처와 내 손패의 크리처를 맞바꿉니다.',
    fluxion:'보유 마력이 나보다 많은 적 셉터를 고릅니다. 상대 보유 마력의 30%를 빼앗습니다.',
    thunderclap:'속성 영지 보유나 희생 카드 같은 소환 조건이 있는 크리처에게 30 피해를 줍니다.',
    suddenimpact:'고른 레벨 4 영지를 레벨 3으로 내립니다.',
    quietude:'1라운드 동안 모든 셉터가 주문 차례에 주문이나 비술을 사용할 수 없습니다.',
    rayofpurge:'모든 셉터의 손패에서 인챈트 주문을 파괴합니다.',
    formportal:'가장 가까운 게이트로 이동하고 이번 차례 주사위를 굴리지 않습니다.',
    beginsbistair:'북 위에서 화 크리처 또는 무기 카드만 합계 두 장을 찾아 뽑습니다.',
    beginsiksear:'북 위에서 수 크리처 또는 방어구 카드만 합계 두 장을 찾아 뽑습니다.',
    beginsselenear:'북 위에서 지 크리처 또는 도구 카드만 합계 두 장을 찾아 뽑습니다.',
    beginsterrair:'북 위에서 풍 크리처 또는 두루마리 카드만 합계 두 장을 찾아 뽑습니다.',
    sagaiksear:'내 수·풍 영지가 합계 5곳 이상이면 카드 6장을 뽑습니다.',
    sagaterrair:'내 수·풍 영지가 합계 5곳 이상이면 고른 영지를 레벨 1로 낮춥니다.',
    fear:'대상 셉터의 최대 HP가 가장 낮은 크리처를 손패로 돌려보냅니다. 손패가 6장이면 파괴됩니다. 현재 최저치가 동률인 대상은 선택할 수 없습니다.',
    walltransform:'고른 크리처를 같은 속성의 방어형 크리처로 변신시킵니다. 무속성 및 화·수·지·풍 크리처를 고를 수 있습니다.',
    sagaliquidform:'고른 크리처의 전투 ST와 HP를 각각 10~70 사이의 무작위 값으로 바꿉니다.',
    sagapolymorph:'고른 크리처를 N·S·R 등급의 다른 크리처로 무작위 변신시킵니다. 소유자와 영지 레벨은 유지됩니다.',
    beginspolymorph:'고른 크리처를 E 등급을 제외한 다른 크리처로 무작위 변신시킵니다. 기존 인챈트는 사라집니다.',
    temptation:'자신이나 다른 셉터 크리처의 영지 능력을 빌립니다. 능력에 붙은 비용은 내지 않으며 효과는 주문을 쓴 셉터에게 적용됩니다.',
    blacksmith:'고른 셉터의 손패 한 장을 골라 무작위 무기나 방어구로 바꿉니다. 자신도 대상으로 고를 수 있습니다.',
    reform:'적 손패에서 고른 아이템 또는 주문과 같은 카드를 모든 셉터의 손패와 북에서 마나로 바꿉니다.',
    beginspoisonmind:'고른 적의 북 맨 위 카드 최대 6장을 보고, 그중 한 장을 골라 파괴합니다.',
    discord:'지도에서 가장 많이 배치된 크리처 한 종류를 무작위로 골라, 그 크리처를 모두 고블린으로 바꿉니다.',
    metalform:'고른 크리처가 일반 공격을 무효화합니다. 이 효과가 걸린 동안 방어구를 착용할 수 없습니다.',
    footrace:'모든 셉터의 다음 두 번 주사위 눈을 굴리는 순간의 순위 × 2로 고정합니다.',
    unholygrasp:'대상이 가장 많이 가진 호부를 최대 10개 없앱니다. 사용자는 없앤 호부의 현재 가치만큼 마력을 얻습니다.',
    shadowleap:'1~5칸 거리의 영지로 이동합니다. 주사위를 생략하며 이 이동 뒤에는 영지 명령을 내릴 수 없습니다.',
    armageddon:'최대 HP가 40 이상인 모든 크리처에 30 피해를 줍니다. 피해가 들어가고 레벨이 보호되지 않으면 해당 영지의 레벨을 1 낮춥니다.',
    beginstempest:'기본 ST가 40 이하인 모든 크리처에 20 피해를 줍니다.',
    scarestorm:'기본 ST가 30 이하인 모든 크리처에게 마비를 부여합니다.',
    disbelief:'모든 셉터가 자기가 가진 호부 한 장당 5G를 잃습니다.',
    beginsculdra:'모든 셉터의 보유 마력을 평균값으로 맞추고 다음 주사위를 6으로 고정합니다. 모든 크리처의 HP를 완전히 회복합니다.',
    immobilize:'모든 크리처에게 이동 제한을 겁니다. 해당 크리처는 영지 명령으로 이동할 수 없습니다.',
    sagabistair:'내 화·지 영지가 합계 5곳 이상이면 고른 크리처에게 40 피해를 줍니다.',
    sagaselenear:'내 화·지 영지가 합계 5곳 이상이면 500G를 얻습니다.',
    capture:'고른 적 셉터의 손패에서 장비 하나를 골라 내 손패로 가져옵니다.',
    theft:'고른 적 셉터의 손패에서 주문 하나를 골라 내 손패로 가져옵니다.',
    bravesong:'고른 셉터의 크리처는 4라운드 동안 전투 ST가 20 오릅니다.',
    toughsong:'고른 셉터의 크리처는 4라운드 동안 전투 HP가 20 오릅니다.',
    sagagift:'고른 셉터가 100G를 얻고 카드 한 장을 뽑습니다.',
    hunterssong:'고른 셉터는 4라운드 동안 전투에서 상대 크리처를 격파할 때마다 200G를 얻습니다.',
    mesozoicsong:'3라운드 동안 고른 셉터의 크리처는 전투에서 티라노사우루스(ST 50, HP 60)로 변신합니다.',
    sinkingsong:'3라운드 동안 고른 셉터의 크리처가 전투에서 주는 피해를 절반으로 줄입니다.',
    conspiracy:'성에 도착할 때까지 지도에 소환 마력이 더 높은 크리처가 있으면 크리처 소환 마력이 0G가 됩니다. 속성과 희생 조건은 그대로 적용됩니다.',
    forfeit:'셉터를 고른 뒤 한 지역의 한 속성을 선택합니다. 그 셉터가 보유한 해당 호부를 모두 현재 시세만큼 마력으로 돌립니다.',
    sagadisaster:'최대 HP가 60 이상인 모든 크리처의 현재 HP를 절반으로 줄입니다.',
    holyasylum:'선택한 크리처의 HP와 최대 HP는 주문과 영지 능력으로 변하지 않습니다. 이 영지의 레벨은 내려가지 않습니다.',
    holdcurse:'8라운드 동안 대상 셉터의 인챈트가 있는 영지는 단일 대상 인챈트 주문과 영지 능력으로 다시 지정할 수 없습니다.',
    lunaticlight:'크리처의 기본 ST와 현재 HP를 맞바꿉니다. 최대 HP도 교환 뒤의 HP가 됩니다.',
    sagaRevolt:'인챈트가 걸렸고 최대 HP가 30 이하인 모든 크리처의 최대 HP를 40으로 바꿉니다.',
    sagatimetide:'선택한 지역의 모든 크리처의 ST, HP와 최대 HP를 카드에 적힌 값으로 되돌립니다.',
    reflection:'고른 크리처는 전투에서 두루마리를 제외한 공격 피해를 모두 반사합니다.',
    sagaselection:'영지 능력이 있는 모든 크리처에게 20 피해를 줍니다.',
    rouetsoleil:'마력이 2G 이상인 적 셉터 한 명을 무작위로 골라 보유 마력의 절반을 빼앗습니다.',
    sagafloat:'고른 셉터의 주사위 결과를 2라운드 동안 5로 고정합니다.',
    innocence:'고른 셉터는 2라운드 동안 통행료를 내지 않고 적 영지를 침략할 수 없습니다.',
    sagadrought:'고른 셉터가 소유한 영지의 레벨은 3라운드 동안 오르거나 내려가지 않습니다.',
    zeromn:'호부 가격 절반, 전체 피해, 내 영지 인챈트 해제, 순위 보상, 내 크리처 회복, 통행료 면제, 카드 마력 비용 면제 중 하나를 고릅니다.',
    intrusion:'고른 적 영지를 손패에서 소환 조건이 없는 크리처로 침략합니다. 크리처 소환 마력은 따로 내지 않습니다.',
    trade:'내 영지를 하나 고른 뒤 같은 레벨의 적 영지를 선택해 두 영지의 소유권을 맞바꿉니다.',
    trespass:'2라운드 동안 다른 셉터가 완주 보너스를 받을 때마다 같은 금액을 얻습니다.',
    comet:'고른 적 영지의 레벨을 2 내립니다. 최저 레벨은 1입니다.',
    crusherstorm:'모든 셉터의 손패에서 아이템 카드를 전부 파괴합니다.',
    desolation:'레벨 3인 모든 영지의 레벨을 1 내립니다.',
    elevation:'고른 레벨 1 영지를 레벨 2로 올립니다.',
    erosion:'모든 셉터의 손패를 합쳐 같은 카드가 둘 이상 있으면 해당 카드를 전부 파괴합니다.',
    fame:'내 영지 중 최고 레벨 × 100G를 얻습니다.',
    frostneedle:'고른 화·지 크리처에게 30 피해를 줍니다.',
    venomousboil:'고른 수·풍 크리처에게 30 피해를 줍니다.',
    refresh:'고른 지역의 모든 크리처의 HP를 최대치까지 회복시킵니다.',
    holyblight:'고른 지역에 있는 모든 무속성 크리처에게 20 피해를 줍니다.',
    hustle:'고른 크리처의 전투 ST와 HP를 30씩 올립니다.',
    bulimia:'고른 크리처가 전투에서 생존하면 주인의 손패 한 장을 무작위로 파괴합니다.',
    fatbody:'고른 크리처의 최대 HP를 20 올리고 기본 ST를 20 낮춥니다.',
    six:'이번 차례에 6칸 이동합니다.',
    cash:'마력 100G를 얻습니다.',
    heal:'고른 크리처의 HP를 최대치까지 회복시킵니다.',
    shatter:'적 셉터의 손패에서 아이템이나 주문 한 장을 골라 파괴합니다.',
    acidrain:'방어 전용 크리처 모두에게 30 피해를 줍니다.',
    antielement:'고른 크리처가 전투에서 영지의 속성 보너스를 받지 못합니다.',
    antimagic:'고른 셉터를 대상으로 하는 주문이나 영지 능력을 한 번 막습니다. 인챈트 해제는 막지 못합니다.',
    aports:'다른 셉터를 모두 내가 있는 칸으로 이동시킵니다. 이번 차례의 주사위를 건너뜁니다.',
    aurora:'모든 호부의 개당 가격을 20% 올립니다.',
    avalanche:'레벨 5 영지의 크리처 모두에게 30 피해를 줍니다.',
    backward:'고른 셉터가 다음 이동에서 진행 방향을 뒤집습니다.',
    banishingray:'고른 무 속성 크리처를 파괴합니다.',
    barricade:'고른 영지의 통행료가 3라운드 동안 30% 오릅니다.',
    barrier:'고른 셉터는 5라운드 동안 주문과 영지 능력의 대상이 되지 않습니다. 인챈트 해제는 적용됩니다.',
    bindingmist:'고른 크리처를 마비시킵니다. 마비 상태에서는 공격, 장비 사용, 영지 능력 사용이 제한됩니다.',
    bistair:'내 화 영지당 10의 피해를 고른 적 크리처에게 줍니다.',
    blackout:'고른 적 셉터는 2라운드 동안 통행료를 받을 수 없습니다.',
    camouflage:'고른 크리처가 어느 속성 영지에서든 지형 보너스를 받습니다.',
    catastrophe:'모든 크리처에게 각자의 최대 HP 절반에 해당하는 피해를 줍니다. 홀수 피해량은 올림합니다.',
    changeling:'고른 적의 북에서 카드 두 장까지 무작위로 골라 고블린으로 바꿉니다.',
    chaospanic:'모든 셉터가 다음 이동에서 진행 방향을 뒤집습니다.',
    chariot:'내 크리처 하나를 두 칸 떨어진 영지로 이동시킵니다. 사용한 주문은 북으로 돌아갑니다.',
    corruption:'고른 적은 자신이 보유한 호부 한 개당 마력 10G를 잃습니다.',
    cramp:'고른 지역의 크리처 모두의 ST를 20 낮춥니다. 최저 0입니다.',
    darkcraft:'호부 보유량이 가장 많은 셉터는 가장 많이 보유한 속성의 호부를 30% 잃습니다. 공동 최다 보유자도 적용됩니다.',
    deathcloud:'모든 풍 속성 크리처에게 20 피해를 줍니다.',
    demonictrade:'내 영지의 크리처를 모두 고블린으로 바꾼 뒤, 맵의 고블린 한 마리당 100G를 얻습니다.',
    desertstorm:'고른 지역의 영지 레벨을 2라운드 동안 바꿀 수 없습니다.',
    despair:'고른 적 셉터는 2라운드 동안 새로 뽑은 카드를 버립니다.',
    dimensiondoor:'고른 셉터를 무작위 영지로 이동시킵니다. 이번 차례의 주사위를 건너뜁니다.',
    disbelief:'모든 셉터가 각자 보유한 호부 한 개당 마력 5G를 잃습니다.',
    disease:'고른 크리처는 전투 중 ST와 HP가 각각 20 감소합니다.',
    dispelmagic:'고른 셉터에게 적용된 인챈트를 해제합니다.',
    drainmagic:'고른 적이 가진 현재 마력의 30%를 빼앗습니다.',
    dreamterrain:'내가 성을 지날 때까지 다른 셉터가 통행료를 받을 때마다 그 절반을 추가로 얻습니다.',
    drought:'고른 영지의 레벨을 바꿀 수 없게 합니다.',
    dullness:'고른 영지의 전투에서는 양쪽 모두 아이템과 지원 크리처를 사용할 수 없습니다.',
    earthshaker:'레벨 변화가 가능한 모든 영지를 한 단계 내립니다. 최저 레벨은 1입니다.',
    echo:'내 현재 마력이 고른 적의 마력 절반으로 바뀝니다.',
    elementalrage:'영지와 속성이 맞지 않는 크리처의 현재 HP를 절반으로 줄입니다.',
    energyflash:'레벨 1 영지에 있는 모든 크리처를 파괴합니다.',
    erasure:'모든 셉터와 영지의 인챈트를 한꺼번에 해제합니다.',
    escape:'현재 지역에서 가장 가까운 빈 영지로 이동합니다. 이번 차례의 주사위를 건너뜁니다.',
    evilblast:'고른 적 크리처에게 30 피해를 줍니다.',
    exile:'추가 소환 조건 없이 낼 수 있고 인챈트가 걸린 크리처를 골라 주인의 손패로 돌려보냅니다. 손패가 가득 차면 맵에서만 제거됩니다.',
    exorcism:'고른 지역에서 인챈트가 걸린 크리처의 인챈트를 해제하고 최대 HP와 현재 HP를 각각 10 올립니다.',
    fairylight:'고른 셉터는 자기 차례가 시작될 때 손패 한 장당 10G를 얻습니다. 성을 지나면 끝납니다.',
    feast:'모든 셉터가 각자 보유한 영지 한 곳당 50G를 얻습니다.',
    refuge:'손패 한 장을 제물로 사용해 80G를 얻고, 사용한 리퓨지를 손패로 되돌립니다.',
    find:'북에서 카드 한 장을 뽑습니다. 사용한 주문을 손패로 되돌립니다.',
    fireexplosion:'모든 수 속성 크리처에게 20 피해를 줍니다.',
    fog:'고른 영지의 통행료를 절반으로 낮춥니다.',
    foresight:'내 북의 맨 위에서 최대 여섯 장을 확인하고 그중 한 장을 손패에 넣습니다.',
    forestleap:'현재 지역에서 가장 가까운 지 영지로 이동합니다. 이번 차례의 주사위를 건너뜁니다.',
    goblinslair:'내가 멈춘 곳이 빈 영지라면 고블린을 놓습니다. 사용한 주문을 손패로 되돌립니다.',
    grace:'고른 셉터가 가진 호부의 총가치 중 15%에 해당하는 마력을 내가 얻습니다.',
    gravity:'모든 셉터의 고정값은 1입니다 고정합니다.',
    greed:'고른 영지의 통행료는 1.5배가 되고, 그 영지의 크리처는 전투 중 HP가 10 감소합니다.',
    growthbody:'고른 크리처의 최대 HP와 현재 HP를 각각 10 올립니다.',
    haste:'고른 셉터가 2라운드 동안 굴리는 주사위 눈을 6~8로 제한합니다.',
    haunt:'고른 적 셉터를 2라운드 동안 AI가 조종합니다.',
    icestorm:'모든 화 속성 크리처에게 20 피해를 줍니다.',
    incineration:'누적된 크리처 사망 수만큼 한 마리당 20G를 얻은 뒤 집계를 초기화합니다.',
    insectswarm:'고른 지역에서 현재 HP가 최대치보다 낮은 크리처 모두에게 20 피해를 줍니다.',
    invisibility:'내 영지에 주문이나 영지 능력의 대상을 지정할 수 없게 합니다. 내가 다시 주문을 쓰면 끝나며 인챈트 해제는 적용됩니다.',
    judgment:'고른 셉터가 3분의 2 확률로, 내가 3분의 1 확률로 현재 마력의 80%를 잃습니다.',
    lakeleap:'현재 지역에서 가장 가까운 수 영지로 이동합니다. 이번 차례의 주사위를 건너뜁니다.',
    landprotection:'고른 영지를 주문과 영지 능력의 대상으로 지정할 수 없게 합니다. 인챈트 해제는 적용됩니다.',
    landtransfer:'내 영지 한 곳의 소유권과 크리처를 포기하고 현재 영지 가치만큼 마력을 얻습니다. 사용한 주문은 북으로 돌아갑니다.',
    lifeforce:'고른 셉터는 3라운드 동안 크리처와 아이템 비용을 절반으로 내고, 주문을 쓸 수 없습니다.',
    lifestream:'내 모든 크리처의 HP를 최대치까지 회복시킵니다.',
    lightcraft:'모든 셉터가 북을 처음 구성으로 되돌리고, 현재 손패를 전부 버린 뒤 다섯 장을 뽑습니다.',
    locust:'고른 영지의 레벨을 한 단계 내립니다. 최저 레벨은 1입니다.',
    massgrowth:'모든 크리처의 최대 HP와 현재 HP를 최대 5씩 올립니다. 이 효과로 최대 HP가 80을 넘지 않습니다.',
    massphantasm:'고른 지역의 모든 크리처에 판타즘을 부여해 주문과 영지 능력으로 HP가 변하지 않게 합니다.',
    meteor:'고른 영지의 레벨을 1로 낮춥니다.',
    mindseeker:'고른 적의 북 맨 위에서 최대 여섯 장 중 한 장의 위치를 골라 파괴합니다.',
    mine:'고른 영지에 처음 멈춘 셉터가 현재 마력의 절반을 잃습니다.',
    mistletoe:'2라운드 동안 누구든 이동 주사위 합계로 5~7을 내면 내가 50G를 얻습니다.',
    mountainleap:'현재 지역에서 가장 가까운 화 영지로 이동합니다. 이번 차례의 주사위를 건너뜁니다.',
    mutation:'고른 크리처의 최대 HP와 현재 HP를 최대 20씩 올리고 독을 부여합니다. 이 효과로 최대 HP가 80을 넘지 않습니다.',
    pain:'고른 적이 현재 마력에서 최대 100G를 잃습니다.',
    parasite:'고른 크리처의 주인이 그 크리처의 전투가 끝날 때마다 100G를 잃습니다.',
    peace:'고른 영지는 침략할 수 없고 통행료도 발생하지 않습니다.',
    permission:'내가 이번 주회에서 지나야 할 모든 요새의 통과 기록을 채웁니다.',
    phantasm:'고른 크리처의 현재 HP와 최대 HP는 주문이나 영지 능력으로 변하지 않습니다.',
    plague:'고른 지역의 모든 크리처에게 독을 부여합니다.',
    plainleap:'현재 지역에서 가장 가까운 풍 영지로 이동합니다. 이번 차례의 주사위를 건너뜁니다.',
    polymorph:'고른 크리처를 다른 종류의 무작위 크리처로 바꿉니다.',
    pressure:'모든 호부의 개당 가격을 30% 내립니다.',
    prophecy:'크리처, 아이템, 주문 중 하나를 골라 내 북에서 그 종류의 카드 한 장을 손패에 넣습니다.',
    punisher:'인챈트가 걸린 크리처 모두에게 20 피해를 줍니다.',
    quicksand:'2라운드 안에 처음으로 이 영지를 지나는 셉터를 멈춰 세웁니다. 발동하면 효과가 끝납니다.',
    quintessence:'고른 영지를 복합 속성 영지로 바꿉니다.',
    raisedead:'가장 최근에 파괴된 크리처 카드를 손패에 넣습니다. 사용한 주문은 북으로 돌아갑니다.',
    rayoflaw:'모든 셉터의 손패에서 기본 사용 비용이 100G 이상인 카드를 파괴합니다.',
    regeneration:'고른 크리처는 전투 중 HP가 20 늘고, 살아남으면 전투 종료 시 HP를 최대치까지 회복합니다.',
    reincarnation:'현재 손패를 모두 버리고 버린 수만큼 북에서 카드를 뽑습니다.',
    reinforce:'고른 지역의 모든 크리처의 ST를 최대 10씩 올립니다. 이 효과로 ST가 80을 넘지 않습니다.',
    relief:'내 영지 두 곳의 크리처를 서로 바꾸고 두 크리처의 인챈트를 해제합니다. 사용한 주문은 북으로 돌아갑니다.',
    removecurse:'고른 영지와 그 크리처의 인챈트를 해제합니다.',
    replace:'고른 영지의 크리처를 영지 주인의 손패에 있는 크리처와 교체합니다.',
    revelation:'2라운드 동안 내 위치와 관계없이 보유한 모든 영지에 명령할 수 있습니다.',
    miraclecall:'내 북에서 에보 카드 한 장을 뽑습니다. 남은 에보 카드가 없으면 카드 두 장을 뽑습니다.',
    revival:'고른 셉터의 남은 북을 처음 구성으로 되돌려 다시 섞습니다.',
    ruin:'나와 고른 적 셉터의 손패에서 주문 카드를 전부 파괴합니다.',
    rust:'고른 적 셉터의 손패에서 아이템을 전부 파괴합니다.',
    scourge:'인챈트가 걸린 모든 셉터가 현재 마력의 30%를 잃습니다.',
    sculpture:'고른 지역에서 최대 HP가 30 이하인 크리처를 석상으로 바꿉니다.',
    selenear:'내가 보유한 지 영지 한 곳당 100G를 얻습니다.',
    senility:'고른 크리처는 전투가 끝나면 파괴됩니다.',
    shine:'모든 호부의 개당 가격이 2라운드 동안 50% 오릅니다.',
    shrink:'고른 적 크리처의 최대 HP를 10 낮춥니다. 현재 HP는 새 최대치를 넘을 수 없습니다.',
    silence:'고른 적 셉터는 2라운드 동안 크리처 카드를 소환하거나 교체에 쓸 수 없습니다.',
    simulacrum:'고른 크리처가 전투 중 일반 공격을 무효화합니다. 그 주인은 막은 피해 1당 3G를 잃습니다.',
    sink:'고른 영지를 수 속성으로 바꿉니다.',
    slow:'고른 셉터가 2라운드 동안 굴리는 주사위 눈을 1~3으로 제한합니다.',
    sonicwave:'선제 능력이 있는 모든 크리처에게 20 피해를 줍니다.',
    soulhunt:'고른 크리처가 주문이나 영지 능력으로 파괴되면 내가 그 크리처의 최대 HP 1당 5G를 얻습니다.',
    soulsteal:'3라운드 동안 크리처가 파괴될 때마다 내가 50G를 얻습니다.',
    spartoi:'무작위 빈 영지에 내 스켈레톤을 소환합니다.',
    spiritwalk:'고른 크리처에게 이동 명령을 내릴 때 같은 지역의 빈 영지를 선택할 수 있습니다.',
    squeeze:'고른 셉터의 손패에서 한 장을 파괴하고 그 셉터에게 150G를 지급합니다.',
    subsidence:'고른 적의 최고 레벨 영지 중 하나를 한 단계 내립니다. 최저 레벨은 1입니다.',
    suppression:'고른 셉터의 손패에서 주문 하나를 선택합니다. 모든 셉터의 손패와 현재 북에서 같은 카드를 제거합니다.',
    telegnosis:'다음 라운드까지 내 위치와 관계없이 보유한 모든 영지에 명령할 수 있습니다. 사용한 주문은 북으로 돌아갑니다.',
    telekinesis:'고른 크리처를 인접한 영지 한 곳으로 이동시킵니다.',
    temperance:'고른 크리처의 최대 HP를 30으로 맞춥니다. 현재 HP는 새 최대치를 넘을 수 없습니다.',
    tempest:'모든 크리처에게 20 피해를 줍니다.',
    thornfetter:'고른 크리처에게 일반 이동 명령을 내릴 수 없고, 전투를 마친 뒤 HP가 20 줄어듭니다.',
    thunderstorm:'모든 지 속성 크리처에게 20 피해를 줍니다.',
    torture:'고른 적은 자기 차례가 시작될 때 손패의 주문 한 장당 20G를 잃습니다. 성을 지나면 끝납니다.',
    triumph:'다음 주회 보너스가 1.5배가 됩니다. 성을 지나면 효과가 끝납니다.',
    turntothewall:'고른 크리처를 같은 속성의 지정된 방어 전용 크리처로 바꿉니다.',
    upheaval:'고른 영지를 화 속성으로 바꿉니다.',
    vitality:'고른 크리처는 전투 중 ST와 HP가 각각 20 증가합니다.',
    vortex:'고른 영지의 전투에서 양쪽의 전투 능력과 효과를 봉쇄합니다.',
    magicshelter:'방마벽을 걸어 단일 주문의 대상에서 보호하고 방어형으로 취급합니다.',
    energyfield:'마력 결계가 일반 공격을 무효화합니다. 크리처가 전투를 마치면 상대 셉터가 그 주인에게서 100G를 빼앗습니다.',
    waste:'고른 적은 성을 지날 때까지 크리처와 아이템의 사용 비용을 두 배로 냅니다.',
    weakness:'고른 크리처의 기본 ST를 0으로 바꿉니다.',
    weathering:'고른 영지를 풍 속성으로 바꿉니다.',
    wildgrowth:'고른 영지를 지 속성으로 바꿉니다.',
    windofhope:'내 북에서 두 장을 뽑습니다.',
    wing:'고른 크리처는 전투 중 ST가 20 오르고 선제를 얻습니다.',
    wizardeye:'고른 셉터의 북 맨 위에서 최대 여섯 장을 엿봅니다. 사용한 주문을 손패로 되돌립니다.',
    wordofrecall:'고른 셉터를 성으로 이동시킵니다. 이번 차례의 주사위를 건너뜁니다.',
    alarm:'내 모든 크리처의 피로를 해제합니다.',
    burninghail:'모든 수·풍 속성 크리처에게 20 피해를 줍니다.',
    freezecyclone:'모든 화·지 속성 크리처에게 20 피해를 줍니다.',
    globalinsectswarm:'현재 HP가 최대치보다 낮은 크리처 모두에게 20 피해를 줍니다.',
    fatigueddisaster:'피로 상태이고 최대 HP가 50 이상인 모든 크리처에게 30 피해를 줍니다.',
    elementalwrath:'영지와 속성이 맞지 않는 크리처 모두에게 20 피해를 줍니다.',
    redivision:'모든 셉터의 현재 마력을 합산해 같은 몫으로 나눕니다. 나머지는 버립니다.',
    stealgem:'적 셉터가 보유한 속성석 한 개를 무작위로 가져옵니다. 보석 상점이 없는 지도에서는 마력 80G를 가져옵니다.',
    obliterate:'모든 셉터가 속성석 보유량 × 70G를 잃습니다. 보석 상점이 없는 지도에서는 모두 보유 마력의 10%를 잃습니다.',
    gift:'내 순위에 50G를 곱한 만큼 마력을 얻고, 순위와 같은 수의 카드를 북에서 뽑습니다.',
    purify:'셉터와 영지에 걸린 인챈트를 지우고 제거한 효과 종류마다 50G를 얻습니다.',
    revoltphantasm:'지도 위 모든 크리처에 판타즘을 부여해 주문과 영지 능력으로 HP가 변하지 않게 합니다.',
    stoneblast:'땅 또는 바람 속성 크리처 한 마리에게 30 피해를 줍니다.',
    shininggeyser:'고른 적 크리처에게 30 피해를 줍니다. 제물로 즉발 주문을 내면 피해가 40으로 늘어납니다.',
    blazesplash:'화 또는 수 속성 크리처 한 마리에게 30 피해를 줍니다.',
    dreadblast:'점유한 영지와 속성이 맞지 않는 크리처 한 마리에게 30 피해를 줍니다.',
    deathmiasma:'선제 또는 원호를 가진 모든 크리처에게 20 피해를 줍니다.',
    penalize:'지도에 배치된 모든 에보 드래곤에 마비를 부여합니다.',
    holybanishment:'영지와 속성이 다른 크리처를 소유자의 손패로 돌려보냅니다.',
    liquidform:'고른 크리처의 전투 ST와 HP를 각각 10~70으로 정하는 인챈트를 걸고 카드 한 장을 뽑습니다.',
    pacifism:'모든 셉터의 침략을 2라운드 동안 제한합니다.',
    remoteswitch:'모든 분기 스위치의 방향을 바꿉니다. 스위치가 없는 지도에서는 카드 1장을 뽑습니다. 사용한 카드는 북으로 돌아갑니다.',
    remission:'아직 지나지 않은 게이트 한 곳을 골라 통과 기록을 채웁니다. 미통과 게이트가 두 곳 이상이어야 합니다.',
    restore:'고른 크리처의 피로를 해제하고 HP를 최대치까지 회복시킵니다.',
    revoltlandtransfer:'내 영지 한 곳의 소유권과 크리처를 포기하고 현재 영지 가치의 70%를 마력으로 얻습니다.',
    fireshift:'고른 내 영지를 화 속성으로 바꿉니다.',
    watershift:'고른 내 영지를 수 속성으로 바꿉니다.',
    earthshift:'고른 내 영지를 지 속성으로 바꿉니다.',
    airshift:'고른 내 영지를 풍 속성으로 바꿉니다.',
    magmashift:'고른 레벨 3 이하 영지를 화에서 지 또는 지에서 화로 바꿉니다.',
    stormshift:'고른 레벨 3 이하 영지를 수에서 풍 또는 풍에서 수로 바꿉니다.'
  };
  const fixed={holyword0:0,word1:1,holyword2:2,holyword3:3,word6:6,holyword8:8,holywordx:10};
  function describe(C,card){
    if(card.kind!=='spell'||card.catalogOnly)return;
    if(C.edition==='revolt'&&card.effect==='exile')return '추가 소환 조건 없이 낼 수 있고 인챈트가 걸린 크리처를 주인의 손패로 돌려보냅니다. 이미 10장이면 파괴합니다.';
    if(C.edition==='revolt'&&card.effect==='holybanishment')return '영지와 속성이 다른 크리처를 주인의 손패로 돌려보냅니다. 이미 10장이면 파괴합니다.';
    const e=card.effect,edition=C.edition;
    if(e==='handheldSoltis')return '200G를 얻습니다. 속성이 일치하는 크리처를 둔 레벨 3 이상 영지를 화·수·지·풍별로 하나 이상 보유하면 1,000G를 추가로 얻습니다.';
    if(edition==='3ds'&&e==='polymorph')return '고른 크리처를 N·S·R 등급의 다른 크리처로 무작위 변신시킵니다. 영지 소유자와 속성·레벨은 유지됩니다.';
    if(['dc','ps1','saturn'].includes(edition)){
      if(e==='polymorph'&&edition==='dc')return '고른 크리처를 N·S·R 등급의 다른 크리처로 변신시킵니다. 크리처의 강화와 인챈트는 초기화됩니다. 영지 소유자와 속성·레벨은 유지됩니다.';
      if(e==='reincarnation')return '현재 손패를 모두 버리고 북에서 여섯 장을 뽑습니다.';
      if(e==='raisedead')return '가장 최근에 파괴된 크리처 카드를 손패에 넣습니다.';
      if(e==='firstBarricade')return '고른 지역에 있는 내 영지의 통행료가 3라운드 동안 30% 오릅니다.';
      if(e==='firstHolyblight')return '맵에 배치된 모든 불사족 크리처에 20 피해를 줍니다.';
      if(e==='judgment'&&edition!=='dc'){
        const odds=edition==='ps1'?4:6;
        return '고른 적은 '+odds+'분의 '+(odds-1)+' 확률로, 나는 '+odds+'분의 1 확률로 현재 마력의 80%를 잃습니다.';
      }
      if(e==='babble'&&edition!=='dc')return '고른 적이 3라운드 동안 상점과 신전에 들어갈 수 없습니다.';
      if(e==='firstMindseeker')return '고른 적의 북 맨 위 카드 한 장을 내 손패로 가져옵니다.';
      if(e==='magicdie')return '고른 셉터가 3라운드 동안 이동 주사위를 굴리면 5 또는 6이 나옵니다.';
      if(e==='mindblast')return '고른 적이 성을 지나기 전까지 차례가 시작될 때마다 5G를 잃습니다.';
      if(e==='unsummon')return '고른 크리처를 영지에서 철수시켜 주인의 손패로 되돌립니다.';
      if(e==='poisonmist')return '고른 크리처에게 쇠약을 부여합니다. 전투 후 최대 HP의 절반만큼 피해를 입습니다.';
      if(e==='solitude')return '고른 크리처는 전투 중 인접 영지의 지원으로 공격력이 오르지 않습니다.';
      if(e==='swapspell')return '고른 셉터와 내 손패를 모두 교환합니다.';
      if(e==='snatch')return '고른 적의 손패에서 무작위 카드 한 장을 가져옵니다.';
      if(e==='jump')return '가장 가까운 내 영지로 이동하고 이번 차례의 주사위를 건너뜁니다.';
      if(e==='lifeforce'&&edition==='ps1')return '고른 셉터가 성을 지날 때까지 크리처 사용 마력이 절반이 되고 주문은 사용할 수 없습니다.';
      if(e==='firstRecover')return '고른 크리처의 현재 HP를 최대 HP까지 회복합니다.';
      if(e==='timebomb')return '현재 칸에 시한폭탄을 설치합니다. 3라운드 뒤 이 칸과 인접 칸의 셉터는 보유 마력의 절반을 잃습니다.';
      if(e==='balance')return '모든 셉터가 시전 시점의 개인 순위 × 현재 주회 × 30G를 얻습니다.';
      if(e==='alchemy')return '다른 셉터의 손패 전체에서 무작위로 고른 카드 한 장의 복사본을 얻습니다.';
      if(e==='dimensiondoor'&&edition==='saturn')return '고른 적을 무작위로 다른 영지 칸에 이동시키고 이번 차례의 주사위를 건너뜁니다.';
      if(e==='chaosstream')return '다음 라운드부터 모든 셉터의 진행 순서를 무작위로 바꿉니다.';
      if(e==='landtax')return '모든 셉터가 자신이 보유한 영지 한 곳당 20G를 잃습니다.';
      if(e==='meteorstorm')return '무작위로 고른 땅 다섯 곳의 영지 레벨을 1로 낮춥니다.';
      if(e==='evilblast'&&edition==='saturn')return '고른 크리처에게 30 피해를 줍니다.';
      if(e==='changeling'&&edition!=='dc')return '고른 적의 북에서 무작위로 최대 세 장을 고블린으로 바꿉니다.';
      if(e==='wizardeye'&&edition!=='dc')return '고른 셉터의 북 맨 위에서 최대 여섯 장을 엿봅니다.';
      if(e==='weakness'&&edition==='saturn')return '고른 크리처의 기본 ST를 절반으로 낮춥니다.';
    }
    if(edition==='dc'){
      if(e==='grace')return '고른 셉터가 가진 호부 총가치의 20%를 마력으로 얻습니다.';
      if(e==='pressure')return '모든 지역의 호부 가격을 20% 낮춥니다.';
      if(e==='mistletoe')return '2라운드 동안 누구든 이동 주사위로 5~7을 내면 내가 100G를 얻습니다.';
      if(e==='soulhunt')return '고른 크리처가 맵에서 파괴되면 내가 그 크리처의 최대 HP 1당 10G를 얻습니다.';
      if(e==='darkcraft')return '모든 셉터가 보유한 호부 하나당 5G를 잃습니다. 사용한 주문은 북으로 돌아갑니다.';
      if(e==='lightcraft')return '맵의 모든 크리처에 HP 고정을 부여하고 이 주문을 북으로 돌려보냅니다.';
      if(e==='dcWallTransform')return '고른 크리처를 같은 속성의 지정 방어형으로 바꿉니다. 기본 ST와 HP는 새 크리처의 수치를 쓰고 인챈트는 유지합니다.';
      if(e==='magicfountain')return '고른 영지에 처음 멈춘 셉터가 500G를 받습니다.';
    }
    if(edition==='begins'&&e==='revoltphantasm')return '모든 크리처에 HP 고정을 부여합니다. 주문의 효과로 현재 HP와 최대 HP가 변하지 않습니다.';
    if(edition==='begins'&&e==='shrink')return '고른 적 크리처의 기본 ST, 현재 HP, 최대 HP를 각각 10 낮춥니다.';
    if(edition==='begins'&&e==='meteor')return '고른 영지의 레벨을 2 낮춥니다. 연쇄가 없으면 레벨 1이 됩니다.';
    if(edition==='begins'&&e==='quintessence')return '레벨 4 이하인 고른 영지를 복합 속성 영지로 바꿉니다.';
    if(edition==='begins'&&e==='telegnosis')return '1라운드 동안 위치와 관계없이 내 모든 영지에 명령할 수 있습니다. 사용한 주문은 북으로 돌아갑니다.';
    if(edition==='begins'&&e==='fly')return '이 차례에 주사위 2개를 굴려 합만큼 이동합니다. 주사위 제한은 두 눈에 모두 적용됩니다.';
    if(e==='massgrowth'&&card.synthesis==='item')return '모든 크리처의 최대 HP를 5 올립니다. 최대 100까지 적용됩니다. 제물로 아이템을 내면 내 크리처에게만 적용됩니다.';
    if(Object.hasOwn(fixed,e))return '고른 셉터의 다음 이동 주사위 눈을 고정합니다. 고정값은 '+fixed[e]+'입니다.';
    if(edition==='saga'){
      if(e==='shrink')return '고른 적 크리처의 기본 ST와 최대 HP를 10씩 낮춥니다.';
      if(e==='mutation')return '고른 크리처의 최대 HP를 최대 100까지 20 올리고 독을 부여합니다.';
      if(e==='massgrowth')return '모든 크리처의 최대 HP를 최대 100까지 5 올립니다.';
      if(e==='reinforce')return '고른 지역의 모든 크리처의 기본 ST를 최대 100까지 10 올립니다.';
      if(e==='dispelmagic')return '고른 셉터의 저주를 해제합니다. 사용한 주문은 북으로 돌아갑니다.';
    }
    if(['dc','ps1'].includes(edition)&&e==='corruption')return '고른 적은 보유 호부 한 개당 마력 5G를 잃습니다.';
    if(edition==='dc'&&e==='foresight')return '내 북의 맨 위에서 최대 네 장을 확인하고 그중 한 장을 손패에 넣습니다.';
    if(['ps1','saturn'].includes(edition)){
      if(e==='barrier')return '고른 셉터는 '+(edition==='ps1'?6:3)+'라운드 동안 주문의 대상이 되지 않습니다. 인챈트 해제는 적용됩니다.';
      if(e==='haste')return '고른 셉터의 주사위 눈을 3라운드 동안 6~8로 제한합니다.';
      if(e==='chariot')return '내 크리처 하나를 두 칸 떨어진 영지로 이동시킵니다.';
      if(e==='growthbody')return '내 크리처 하나의 최대 HP를 10 올립니다.';
      if(e==='landtransfer')return '내 영지 한 곳을 포기하고 현재 영지 가치만큼 마력을 얻습니다.';
    }
    if(edition==='3ds'&&['antielement','drought','fog','heal','weakness'].includes(e))return text[e]+' 카드 한 장을 뽑습니다.';
    if(edition==='3ds'&&['camouflage','dispelmagic','removecurse'].includes(e))return text[e]+' 사용한 주문은 북으로 돌아갑니다.';
    if(['ps1','saturn'].includes(edition)&&e==='acidrain')return '모든 식물 종족 크리처에게 20 피해를 줍니다.';
    if(['ps1','saturn'].includes(edition)&&e==='slow')return '고른 셉터가 3라운드 동안 굴리는 주사위 눈을 1~3으로 제한합니다.';
    if(e==='firstPressure')return '고른 지역의 모든 호부 가격을 20% 내립니다.';
    if(e==='firstGrace')return '내가 가진 호부 총가치의 10%만큼 마력을 얻습니다.';
    const firstStorm={firstIceStorm:'화',firstFireExplosion:'수',firstThunderstorm:'지',firstDeathCloud:'풍'}[e];
    if(firstStorm)return '고른 지역의 모든 '+firstStorm+' 속성 크리처에게 각자 최대 HP의 30%에 해당하는 피해를 줍니다.';
    if(edition==='3ds'&&e==='aetherflash')return '6라운드 동안 모든 셉터의 크리처 소환 비용을 90G로 고정하고 영지 및 제물 조건을 무시합니다.';
    if(edition==='3ds'&&e==='pilgrim')return '신전이 있는 지도에서는 즉시 호부를 한 번 거래합니다. 신전이 없으면 카드 한 장을 뽑습니다.';
    if(edition==='3ds'&&e==='bind')return '고른 셉터를 한 라운드 동안 행동할 수 없게 하고 그 셉터에게 150G를 줍니다.';
    if(edition==='3ds'&&e==='invisibility')return '6라운드 동안 내 영지를 주문과 영지 능력의 단일 대상으로 고를 수 없습니다. 인챈트 제거 효과는 적용됩니다.';
    if(edition==='3ds'&&e==='reflection')return '고른 크리처의 전투 ST를 0으로 만들고 일반 공격 피해를 반사합니다.';
    if(edition==='3ds'&&e==='thornfetter')return '고른 크리처의 일반 영지 이동을 막고 전투가 끝날 때마다 최대 HP를 20 낮춥니다.';
    if(edition==='3ds'&&e==='scourge')return '인챈트가 걸린 모든 셉터가 현재 마력의 40%를 잃습니다.';
    if(edition==='3ds'&&e==='soulsteal')return '4라운드 동안 크리처가 파괴될 때마다 내가 50G를 얻습니다.';
    if(edition==='3ds'&&e==='meteor')return '고른 영지의 레벨을 2 낮춥니다. 연쇄가 없는 영지는 레벨 1로 내립니다.';
    if(edition==='3ds'&&e==='growthbody')return '고른 크리처의 최대 HP를 최대 100까지 10 올립니다.';
    if(edition==='3ds'&&e==='massgrowth')return '모든 크리처의 최대 HP를 최대 100까지 5 올립니다.';
    if(edition==='3ds'&&e==='quintessence')return '레벨 4 이하인 고른 영지를 복합 속성 영지로 바꿉니다.';
    if(edition==='3ds'&&e==='charity')return '현재 순위와 같은 수의 카드를 뽑습니다.';
    if(edition==='3ds'&&e==='landtransfer')return '내 영지 한 곳을 포기하고 현재 영지 가치만큼 마력을 얻습니다.';
    if(edition==='3ds'&&e==='mutation')return '크리처의 최대 HP를 최대 100까지 20 올리고 독을 부여합니다. 전투 종료 시 독이 최대 HP의 절반만큼 피해를 줍니다.';
    if(edition==='3ds'&&e==='turnover')return '기본 ST가 30 이하인 모든 크리처는 ST +20, 50 이상인 모든 크리처는 ST −20이 됩니다.';
    if(edition==='3ds'&&e==='earthshaker')return '최대 HP가 40 이상인 크리처가 배치된 모든 영지의 레벨을 1 낮춥니다. 최저 Lv.1.';
    if(edition==='saga'&&e==='mindseeker')return '고른 적의 북 맨 위 카드 6장을 보고 그중 한 장을 파괴합니다.';
    if(edition==='revolt'&&e==='vortex')return '대상 크리처의 영지에서 전투 능력과 장비 효과를 무효화하고 카드 한 장을 뽑습니다.';
    if(edition==='revolt'&&e==='mindseeker')return '적의 북 맨 위 카드 최대 6장을 보고 한 장을 파괴한 뒤, 내 북에서 한 장을 뽑습니다.';
    if(edition==='begins'){
      if(e==='mutation')return '고른 크리처의 최대 HP를 최대 100까지 20 올리고 독을 부여합니다. 독은 전투가 끝날 때 최대 HP의 절반만큼 피해를 줍니다.';
      if(e==='removecurse')return '고른 크리처의 인챈트를 해제합니다. 사용한 주문을 북에 넣고 남은 카드를 섞습니다.';
      if(e==='escape'||['mountainleap','lakeleap','forestleap','plainleap'].includes(e))
        return '가장 가까운 '+({escape:'빈',mountainleap:'화',lakeleap:'수',forestleap:'지',plainleap:'풍'}[e])+' 영지로 이동하고 주사위를 건너뜁니다.';
      if(['camouflage','chariot','relief','telegnosis'].includes(e))return text[e].replace(' 사용한 주문은 북으로 돌아갑니다.','')+' 사용한 주문을 북에 넣고 남은 카드를 섞습니다.';
      if(e==='haste'||e==='slow')return '고른 셉터가 다음 두 번 굴리는 주사위 눈을 '+(e==='haste'?'5~7':'1~3')+'로 제한합니다.';
      if(e==='silence')return '고른 적은 2라운드 동안 크리처를 소환·교체하거나 원군으로 사용할 수 없습니다.';
      if(e==='triumph')return '성을 지날 때까지 유지됩니다. 그때 주회를 완주하면 주회 보너스가 1.3배가 됩니다.';
      if(e==='colorfrombeyond')return '모든 영지 크리처의 기본 ST를 30 낮춥니다. 기본 ST는 0 아래로 내려가지 않습니다.';
      if(e==='revoltlandtransfer')return '내 영지 한 곳을 포기하고 현재 영지 가치의 80%를 마력으로 얻습니다.';
      if(e==='growthbody'||e==='massgrowth')return (e==='growthbody'?'고른 크리처의 현재 HP와 최대 HP를 10':'모든 크리처의 현재 HP와 최대 HP를 5씩')+' 올립니다. 최대 HP 상한은 100입니다.';
      if(e==='greed')return '고른 영지의 통행료를 1.5배로 바꾸고 카드 한 장을 뽑습니다.';
      if(['antielement','disease','drought','fog','vitality','weakness'].includes(e))return text[e]+' 카드 한 장을 뽑습니다.';
    }
    if(edition==='begins'&&e==='replace')return '내 영지의 크리처 한 마리를 골라 손패의 다른 크리처와 교체합니다.';
    if(C.edition==='revolt'&&C.combo.worlds[e])return '전장 저주 · 6라운드. '+C.combo.worlds[e].description;
    switch(e){
      case 'dreamterrain':if(['revolt','begins','3ds'].includes(edition))return '5라운드 동안 다른 셉터가 통행료를 받을 때마다 그 절반을 얻습니다. 내가 낸 통행료에도 적용됩니다.';break;
      case 'quicksand':if(edition==='revolt')return '2라운드 안에 이 영지를 통과하려는 첫 셉터를 멈춰 세웁니다. 주사위 눈에 맞춰 도착하면 효과가 남습니다.';break;
      case 'greed':if(edition==='revolt'||edition==='3ds')return '고른 영지의 통행료를 1.5배로 바꾸고 카드 한 장을 뽑습니다.';break;
      case 'growthbody':if(edition==='revolt')return '고른 크리처의 최대 HP를 최대 100까지 10 올립니다.';break;
      case 'haste':if(edition==='3ds')return '고른 셉터의 주사위 눈을 2라운드 동안 5~7로 제한합니다.';if(edition==='revolt')return '고른 셉터가 다음 두 번 굴리는 주사위 합을 6~8로 제한합니다.';break;
      case 'disease':case 'vitality':
        if(edition==='revolt'||edition==='3ds')return '고른 크리처의 전투 ST와 HP를 각각 20 '+(e==='disease'?'낮추고':'높이고')+' 카드 한 장을 뽑습니다.';break;
      case 'manna':return '(완료한 주회 수 + 1) × '+(card.magicPerLap||50)+'G를 얻습니다.';
      case 'fly':return edition==='ps1'?'자신에게 걸린 기존 셉터 인챈트를 덮어쓰고 이번 차례에 주사위를 2개 굴립니다.':edition==='revolt'?'이번 차례에 주사위를 3개 굴립니다.':'이번 차례에 주사위를 2개 굴립니다.';
      case 'bolt':return '고른 '+(['ps1','saturn'].includes(edition)?'':'적 ')+'크리처에게 20 피해를 줍니다.';
      case 'landdrain':return '고른 적의 보유 영지 한 곳당 '+(edition==='saga'?20:30)+'G를 빼앗습니다.';
      case 'reincarnation':if(['revolt','begins','3ds'].includes(edition))return '현재 손패를 모두 버리고 버린 수보다 한 장 더 뽑습니다.';break;
      case 'upheaval':case 'sink':case 'wildgrowth':case 'weathering':
        if(edition==='3ds')return '고른 레벨 3 이하 영지를 '+({upheaval:'화',sink:'수',wildgrowth:'지',weathering:'풍'}[e])+' 속성으로 바꿉니다.';break;
      case 'quintessence':if(edition==='revolt')return '고른 레벨 4 이하 영지를 복합 속성으로 바꿉니다.';break;
    }
    return text[e]||C.spellDescriptions?.[e];
  }
  return (C,card)=>{
    const summary=describe(C,card);
    return summary&&card.doublecast?summary+' 효과 처리 뒤 이 차례에 주문을 더 쓸 수 있습니다.':summary;
  };
})();
if(typeof module!=='undefined')module.exports=describeCepterSpell;
