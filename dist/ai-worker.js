importScripts('game.js','strategy.js');
self.onmessage=({data})=>self.postMessage(chooseMove(data));
