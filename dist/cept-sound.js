const audio=$('soundtrack'),audioKey='cept-audio-v1';
const soundFields=['musicOn','effectsOn','musicVolume','effectVolume','stageMusic'];
let soundContext,effectBus,seenActionSound=0,retryMusic=false;
$('openSound').onclick=()=>$('musicPanel').showModal();
$('closeSound').onclick=()=>$('musicPanel').close();
try{
  const saved=JSON.parse(localStorage.getItem(audioKey)||'{}');
  for(const id of soundFields){
    const field=$(id),v=saved[id];
    if(field.type==='checkbox'&&typeof v==='boolean')field.checked=v;
    if(field.type==='range'&&Number.isFinite(v))field.value=v;
  }
}catch{}
function saveAudioSettings(){
  const values=Object.fromEntries(soundFields.map(id=>[id,$(id).type==='checkbox'?$(id).checked:Number($(id).value)]));
  try{localStorage.setItem(audioKey,JSON.stringify(values));}catch{}
}
let duckUntil=-Infinity,duckFrame=0,musicFade=1,fadeFrame=0;
function updateMusicLevel(){
  const release=Math.min(1,Math.max(0,(performance.now()-duckUntil)/360));
  const effects=$('effectsOn').checked?Number($('effectVolume').value)/100:0;
  const depth=Math.min(.7,effects*1.2);
  audio.volume=Math.max(0,Math.min(1,Number($('musicVolume').value)/100*(1-depth*(1-release))*musicFade));
}
// Scene changes cross through silence: the old track fades out, the new one fades in.
function fadeMusic(target,ms,done){
  cancelAnimationFrame(fadeFrame);
  const from=musicFade,start=performance.now();
  function step(now){
    const t=Math.min(1,(now-start)/Math.max(1,ms));
    musicFade=from+(target-from)*t*t*(3-2*t);updateMusicLevel();
    if(t<1)fadeFrame=requestAnimationFrame(step);else{fadeFrame=0;done?.();}
  }
  fadeFrame=requestAnimationFrame(step);
}
function duckMusic(seconds){
  duckUntil=Math.max(duckUntil,performance.now()+seconds*1000);
  updateMusicLevel();
  if(duckFrame)return;
  function refresh(){
    updateMusicLevel();
    duckFrame=performance.now()<duckUntil+360?requestAnimationFrame(refresh):0;
  }
  duckFrame=requestAnimationFrame(refresh);
}
function setLevels(){
  updateMusicLevel();
  audio.muted=!$('musicOn').checked;
  $('musicLevel').value=$('musicVolume').value+'%';
  $('effectLevel').value=$('effectVolume').value+'%';
  if(effectBus)effectBus.gain.value=$('effectsOn').checked?Number($('effectVolume').value)/100:0;
}
function startMusic(){
  if(!$('musicOn').checked||!audio.src)return;
  const src=audio.src;
  audio.play().then(()=>{retryMusic=false;$('audioStatus').textContent='';}).catch(e=>{
    if(audio.src!==src||e.name==='AbortError')return;
    retryMusic=e.name==='NotAllowedError';
    if(!retryMusic)$('audioStatus').textContent='배경음악을 불러올 수 없습니다.';
  });
}
function unlockSound(){
  let resume;
  const Context=window.AudioContext||window.webkitAudioContext;
  if(Context&&$('effectsOn').checked){
    if(!soundContext){soundContext=new Context();effectBus=soundContext.createGain();effectBus.connect(soundContext.destination);setLevels();}
    if(soundContext.state!=='running')resume=soundContext.resume().catch(()=>{});
  }
  if(retryMusic)startMusic();
  return resume;
}
function previewEffect(){
  const resume=unlockSound();
  if(resume)resume.then(()=>playEffect('card'));
  else playEffect('card');
}
document.addEventListener('click',unlockSound,true);
document.addEventListener('touchend',unlockSound,{capture:true,passive:true});
document.addEventListener('keydown',unlockSound,true);
for(const id of ['musicVolume','effectVolume','musicOn','effectsOn']){
  $(id).addEventListener('input',()=>{
    setLevels();saveAudioSettings();
    if(id==='effectsOn'&&$('effectsOn').checked)previewEffect();
    if(id==='musicOn'){
      if(!$('musicOn').checked){audio.pause();retryMusic=false;}
      else{if($('stageMusic').checked&&s)syncStageMusic();if(audio.paused)startMusic();}
    }
  });
}
$('effectVolume').addEventListener('change',previewEffect);
setLevels();
// Frequencies are swept from start to end, with each voice fading before it stops.
const cues={
  roll:['triangle',[[0,830,320,.07],[.10,910,360,.07],[.20,1030,410,.07],[.30,920,390,.07],[.44,1110,510,.09],[.59,740,1110,.16]]],
  step:['sine',[[0,145,54,.085]]],
  warp:['sine',[[0,250,1200,.16],[.15,1100,430,.22]]],
  summon:['triangle',[[0,196,294,.18],[.09,294,392,.19],[.18,392,784,.3]]],
  cast:['sine',[[0,415,880,.21],[.085,620,1240,.24]]],
  heal:['sine',[[0,523,659,.18],[.12,784,1046,.26]]],
  bolt:['sawtooth',[[0,930,80,.18]]],shatter:['square',[[0,1250,420,.07],[.07,740,150,.11]]],
  invade:['triangle',[[0,196,147,.16],[.12,165,82,.23]]],
  slash:['sawtooth',[[0,540,85,.12]]],fang:['triangle',[[0,210,60,.11],[.07,150,44,.1]]],
  leap:['triangle',[[0,190,690,.18],[.19,450,120,.13]]],
  crush:['sine',[[0,136,34,.28],[.12,75,30,.24]]],
  volley:['triangle',[[0,930,465,.095],[.09,1050,525,.11]]],
  ember:['sawtooth',[[0,180,640,.15],[.12,600,110,.21]]],
  wave:['sine',[[0,390,980,.17],[.14,760,240,.22]]],
  battleStart:['sawtooth',[[0,98,196,.16],[.12,147,294,.16],[.24,196,392,.2],[.4,262,523,.34]]],
  battleWin:['triangle',[[0,392,494,.16],[.16,523,659,.16],[.32,784,784,.27]]],
  battleLoss:['triangle',[[0,440,350,.17],[.15,330,247,.18],[.31,220,165,.25]]],
  battleDraw:['sine',[[0,330,311,.23],[.21,349,330,.27]]],
  hit:['triangle',[[0,120,35,.14]]],block:['square',[[0,660,410,.09]]],
  charge:['sine',[[0,160,520,.3]]],gale:['sine',[[0,620,1500,.14],[.08,1300,360,.2]]],
  critical:['sawtooth',[[0,90,28,.3],[.02,1400,220,.16],[.06,180,40,.26]]],death:['sawtooth',[[0,70,48,.5],[.1,330,82,.45],[.42,1100,60,.22]]],
  reflect:['sine',[[0,495,990,.12],[.07,740,1480,.15]]],
  coin:['sine',[[0,990,990,.08],[.07,1485,1485,.18]]],
  card:['triangle',[[0,460,690,.055]]],
  victory:['triangle',[[0,392,392,.14],[.14,494,494,.14],[.28,587,587,.14],[.42,784,784,.35]]]
};
function playEffect(name){
  if(!soundContext||soundContext.state!=='running'||!$('effectsOn').checked||!Number($('effectVolume').value))return;
  const cue=cues[name]||cues[({word:'cast',fly:'warp',gain:'coin',magic:'cast'})[name]];
  if(!cue)return;
  duckMusic(Math.max(...cue[1].map(([delay,,,duration])=>delay+duration)));
  for(const [delay,from,to,duration] of cue[1])effectTone(cue[0],soundContext.currentTime+delay,from,to,duration,.16);
}
function effectTone(wave,start,from,to,duration,volume,ended){
  const osc=soundContext.createOscillator(),gain=soundContext.createGain();
  osc.type=wave;osc.frequency.setValueAtTime(from,start);osc.frequency.exponentialRampToValueAtTime(to,start+duration);
  gain.gain.setValueAtTime(.001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
  osc.connect(gain);gain.connect(effectBus);osc.start(start);osc.stop(start+duration+.01);
  osc.onended=()=>{osc.disconnect();gain.disconnect();ended?.(osc);};
  return osc;
}
function syncActionSound(state){
  if(state.actionSound&&state.actionSound.sequence!==seenActionSound){seenActionSound=state.actionSound.sequence;playEffect(state.actionSound.cue);}
}

// The numbered local clips were recorded for the original PS2 card index.
const creatureVoiceIds=new Map(Object.entries({
  giantrat:13,wolf:14,goblin:15,fighter:16,gascloud:17,kobold:18,dragonfly:19,
  pillarofflame:20,minotaur:21,woodfolk:22,wallofstone:23,tigerbeetle:24,dwarf:25,pan:26,
  skeleton:83,giantamoeba:147,kingtortoise:153,lizardman:157,marfolk:160,merfolk:160,pirate:165,wallofice:174,
  giantbat:224,harpy:229,hornet:231,hurricane:232,sprite:252
}));
const creatureClips=new Map();
function creatureVoice(id){
  if(C.edition==='ps2'&&id>=0&&id<=7)return id;
  return creatureVoiceIds.get(C.combo.key(C.cards[id]));
}
function loadCreatureVoice(id){
  if(id==null)return null;
  if(!creatureClips.has(id)){
    const load=fetch('art/cept-name-'+id+'.mp3').then(r=>{
      if(!r.ok)throw Error('Missing creature voice');
      return r.arrayBuffer();
    }).then(data=>soundContext.decodeAudioData(data)).catch(()=>null);
    creatureClips.set(id,load);
  }
  return creatureClips.get(id);
}
let voiceRequest=0,playingVoices=[];
const forgetVoice=source=>{playingVoices=playingVoices.filter(node=>node!==source);};
function creatureCue(card,start){
  const slug=C.combo.key(card)||card.name;
  let tone=0;
  for(const letter of slug)tone=(Math.imul(tone,31)+letter.codePointAt(0))>>>0;
  const element=card.elements?.[0]??card.element;
  const wave=['triangle','sine','triangle','square'][element]||'sine';
  const pitch=[170,208,110,248][element]||152;
  const first=pitch+(tone%45),last=first+34+(tone>>>7)%80;
  playingVoices.push(effectTone(wave,start,first,last,.12,.10,forgetVoice),
    effectTone(wave,start+.10,last,first*.75+(tone>>>15)%60,.18,.09,forgetVoice));
  return .4;
}
function cancelCreatureVoice(){
  voiceRequest++;
  for(const source of playingVoices)source.stop();
  playingVoices=[];
}
async function announceCreatures(ids){
  cancelCreatureVoice();
  const request=voiceRequest;
  if(!effectBus||soundContext.state!=='running'||!$('effectsOn').checked||!Number($('effectVolume').value))return;
  const creatures=ids.filter(id=>C.cards[id]?.kind==='creature');
  const clips=await Promise.all(creatures.map(id=>loadCreatureVoice(creatureVoice(id))));
  if(request!==voiceRequest||$('game').hidden||!$('effectsOn').checked||!Number($('effectVolume').value))return;
  let start=soundContext.currentTime+.07;
  for(const [i,clip] of clips.entries()){
    if(!clip){start+=creatureCue(C.cards[creatures[i]],start);continue;}
    const source=soundContext.createBufferSource();source.buffer=clip;source.connect(effectBus);
    playingVoices.push(source);source.start(start);start+=clip.duration+.12;
    source.onended=()=>{source.disconnect();forgetVoice(source);};
  }
  if(playingVoices.length)duckMusic(start-soundContext.currentTime);
}
$('effectsOn').addEventListener('input',()=>{if(!$('effectsOn').checked)cancelCreatureVoice();});
$('setup').addEventListener('click',cancelCreatureVoice);
