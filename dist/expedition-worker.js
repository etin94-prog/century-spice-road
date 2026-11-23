importScripts('cards.js','expedition-data.js','expedition-engine.js?v=mobile-audit','combinations.js?v=mobile-audit','combination-ai.js','expedition-ai.js?v=combined');
self.onmessage=({data})=>self.postMessage(chooseMove(data));
