importScripts('game.js?v=mobile-audit','strategy.js?v=mobile-beta-26');
self.onmessage=({data})=>self.postMessage(chooseMove(data));
