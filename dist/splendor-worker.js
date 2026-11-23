importScripts('splendor-data.js','splendor-engine.js');
onmessage=e=>postMessage(chooseMove(e.data));
