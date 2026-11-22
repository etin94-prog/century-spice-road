importScripts('expedition-data.js','expedition-engine.js','expedition-ai.js');
self.onmessage=({data})=>self.postMessage(chooseMove(data));
