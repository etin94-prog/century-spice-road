// Pictures for the battle stage. Everything listed here is optional: without an entry the stage draws its own
// scenery and effects.
//   backdrops  the land a battle is fought on, by tile type: 0 fire, 1 water, 2 earth, 3 wind, or a special tile's name.
//   sprites    a sheet of animation frames that replaces the drawn effect of the same name (see cept-battle-fx.js):
//              {src, frames, cols, fps, scale, blend, mirror}. Frames run left to right, top to bottom.
//   props      the weapon or limb that strikes the card, drawn upright with the grip at the bottom and the point at
//              the top, on a transparent ground: sword, greatsword, dagger, axe, club, mace, hammer, spear, fist, hand, claw.
//   itemBack   the back of an item card while it waits face down.
const CepterBattleArt={
  backdrops:{},
  sprites:{},
  props:{},
  itemBack:''
};
if(typeof module!=='undefined')module.exports=CepterBattleArt;
