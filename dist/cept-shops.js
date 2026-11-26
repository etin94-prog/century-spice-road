// PS2 Official Perfect Guide pp. 247, 249, 253, 255, 257 and 259.
// Indices refer to tiles in the traced PS2 layouts. Prices are printed card costs.
const CepterShops = {
  'ps2-34': { // Gosa
    5: ['magicbolt', 'dispelmagic', 'blackorb', 'chainmail'], // West
    37: ['skeleton', 'feast', 'rayoflaw', 'longsword'] // East
  },
  'ps2-35': { // Kelder
    12: ['fireexplosion', 'quintessence', 'corruption', 'firebolt'], // West
    17: ['removecurse', 'antielement', 'marfolk', 'watershield'] // East
  },
  'ps2-37': { // Gilman Island
    32: ['sharazad', 'holyword3', 'skeleton', 'fireamulet'], // West
    52: ['holyword1', 'teleport', 'windofhope', 'icicle'] // East
  },
  'ps2-38': { // Bisteam
    49: ['holyword6', 'lifestream', 'pressure', 'glaive']
  },
  'ps2-39': { // Nabath
    39: ['holyword1', 'mistletoe', 'teleport', 'foresight']
  },
  'ps2-40': { // Abyss
    16: ['haste', 'magicbolt', 'shatter', 'scalearmor'], // North
    38: ['holywordx', 'landtransfer', 'crayidol', 'battleaxe'] // South
  }
};
if(typeof module!=='undefined')module.exports=CepterShops;
