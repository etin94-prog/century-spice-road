// Pictures for the battle stage. Everything listed here is optional: without an entry the stage draws its own
// scenery and effects.
//   backdrops  the land a battle is fought on, by tile type: 0 fire, 1 water, 2 earth, 3 wind, or a special tile's name.
//   sprites    a sheet of animation frames that replaces the drawn effect of the same name (see cept-battle-fx.js):
//              {src, frames, cols, fps, scale, blend, mirror}. Frames run left to right, top to bottom.
//   props      the weapon or limb that strikes the card, drawn upright with the grip at the bottom and the point at
//              the top, on a transparent ground: sword, greatsword, dagger, axe, club, mace, hammer, spear, fist, hand, claw.
//   itemBack   the back of an item card while it waits face down.
const CepterBattleArt={
  backdrops:{
    0:'art/cept-battle/land-fire.webp',
    1:'art/cept-battle/land-water.webp',
    2:'art/cept-battle/land-earth.webp',
    3:'art/cept-battle/land-wind.webp',
    '무속성':'art/cept-battle/land-neutral.webp',
    '복합':'art/cept-battle/land-multi.webp'
  },
  sprites:{
    slash:{src:'art/cept-battle/fx-slash.webp',frames:12,cols:4,fps:24,blend:'lighter'},
    leap:{src:'art/cept-battle/fx-leap.webp',frames:12,cols:4,fps:24,blend:'lighter'},
    claw:{src:'art/cept-battle/fx-claw.webp',frames:12,cols:4,fps:24,blend:'lighter'},
    fang:{src:'art/cept-battle/fx-fang.webp',frames:12,cols:4,fps:24,blend:'lighter'},
    crush:{src:'art/cept-battle/fx-crush.webp',frames:12,cols:4,fps:24,blend:'source-over',mirror:false},
    volley:{src:'art/cept-battle/fx-volley.webp',frames:12,cols:4,fps:24,blend:'lighter'},
    ember:{src:'art/cept-battle/fx-ember.webp',frames:12,cols:4,fps:24,blend:'lighter',mirror:false},
    wave:{src:'art/cept-battle/fx-wave.webp',frames:12,cols:4,fps:24,blend:'lighter'},
    gale:{src:'art/cept-battle/fx-gale.webp',frames:12,cols:4,fps:24,blend:'lighter'},
    magic:{src:'art/cept-battle/fx-magic.webp',frames:12,cols:4,fps:24,blend:'lighter',mirror:false},
    bolt:{src:'art/cept-battle/fx-bolt.webp',frames:12,cols:4,fps:24,blend:'lighter',mirror:false},
    death:{src:'art/cept-battle/fx-death.webp',frames:12,cols:4,fps:24,blend:'lighter'}
  },
  props:{
    sword:'art/cept-battle/prop-sword.webp',
    greatsword:'art/cept-battle/prop-greatsword.webp',
    dagger:'art/cept-battle/prop-dagger.webp',
    axe:'art/cept-battle/prop-axe.webp',
    club:'art/cept-battle/prop-club.webp',
    mace:'art/cept-battle/prop-mace.webp',
    hammer:'art/cept-battle/prop-hammer.webp',
    spear:'art/cept-battle/prop-spear.webp',
    fist:'art/cept-battle/prop-fist.webp',
    hand:'art/cept-battle/prop-hand.webp',
    claw:'art/cept-battle/prop-claw.webp'
  },
  itemBack:'art/cept-battle/item-back.webp'
};
if(typeof module!=='undefined')module.exports=CepterBattleArt;
