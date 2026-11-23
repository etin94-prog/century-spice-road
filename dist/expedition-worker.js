importScripts('cards.js','expedition-data.js','expedition-engine.js?v=combined','combinations.js','combination-ai.js','expedition-ai.js?v=combined');
self.onmessage=({data})=>self.postMessage(chooseMove(data));
