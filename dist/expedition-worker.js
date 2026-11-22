importScripts('expedition-data.js','expedition-engine.js?v=voyage-2','expedition-ai.js?v=voyage-2');
self.onmessage=({data})=>self.postMessage(chooseMove(data));
