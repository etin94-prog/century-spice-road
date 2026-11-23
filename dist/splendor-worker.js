importScripts('splendor-data.js','splendor-engine.js?v=guild-modules','splendor-expansions.js');
onmessage=e=>postMessage(chooseMove(e.data));
