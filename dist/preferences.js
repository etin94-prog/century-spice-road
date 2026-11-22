"use strict";
const preferences={speed:1,music:25,sound:55};
const preferenceKey='century-presentation';
try{
  const saved=JSON.parse(localStorage.getItem(preferenceKey))||{};
  if([0.65,1,1.6,2.3].includes(saved.speed))preferences.speed=saved.speed;
  for(const key of ['music','sound'])if(Number.isFinite(saved[key]))preferences[key]=Math.max(0,Math.min(100,saved[key]));
}catch{}
const pace=ms=>ms/preferences.speed;
let audioEngine,musicBus,soundBus,beat=0;
function mixAudio(){
  if(!audioEngine)return;
  musicBus.gain.setTargetAtTime(preferences.music/100,audioEngine.currentTime,.025);
  soundBus.gain.setTargetAtTime(preferences.sound/100,audioEngine.currentTime,.025);
}
function note(bus,midi,start,duration,strength,wave='triangle'){
  const source=audioEngine.createOscillator(),env=audioEngine.createGain();
  source.type=wave;source.frequency.value=440*2**((midi-69)/12);
  env.gain.setValueAtTime(.0001,start);
  env.gain.exponentialRampToValueAtTime(strength,start+.013);
  env.gain.exponentialRampToValueAtTime(.0001,start+duration);
  source.connect(env);env.connect(bus);source.start(start);source.stop(start+duration+.02);
  source.onended=()=>{source.disconnect();env.disconnect();};
}
const melody=[62,null,69,67,65,null,64,62,57,null,62,64,65,69,null,67,65,null,72,69,67,65,64,null,60,64,67,null,64,62,null,null];
function musicBeat(){
  if(audioEngine.state!=='running'||document.hidden||!preferences.music)return;
  const i=beat++%melody.length,t=audioEngine.currentTime+.02;
  if(melody[i])note(musicBus,melody[i],t,.69,.16);
  if(i%4===0){note(musicBus,[50,45,53,48][Math.floor(i/8)],t,1.25,.13,'sine');note(musicBus,38,t,.13,.12,'sine');}
}
function unlockAudio(){
  const Engine=window.AudioContext||window.webkitAudioContext;
  if(!Engine||document.hidden)return;
  if(!audioEngine){
    audioEngine=new Engine();musicBus=audioEngine.createGain();soundBus=audioEngine.createGain();
    musicBus.connect(audioEngine.destination);soundBus.connect(audioEngine.destination);mixAudio();
    setInterval(musicBeat,420);
  }
  if(audioEngine.state!=='running')audioEngine.resume().catch(()=>{});
}
document.addEventListener('click',unlockAudio,true);
document.addEventListener('visibilitychange',()=>{
  if(!audioEngine)return;
  if(document.hidden)audioEngine.suspend().catch(()=>{});else unlockAudio();
});
function actionSound(kind){
  if(!audioEngine||audioEngine.state!=='running'||!preferences.sound)return;
  const tones={play:[62,69],buy:[57,64],order:[69,74,81],rest:[64,57]}[kind];
  tones.forEach((pitch,i)=>note(soundBus,pitch,audioEngine.currentTime+.01+i*.085,.19,.23,kind==='order'?'sine':'triangle'));
}
function openPreferences(){
  const sliders=[['music','배경음악'],['sound','효과음']].map(([key,label])=>
    '<label class="volume">'+label+' <output id="'+key+'Value">'+preferences[key]+'%</output><input id="'+key+'" type="range" min="0" max="100" value="'+preferences[key]+'"></label>').join('');
  modal('연출과 소리','<label class="speedChoice">카드 진행 속도 <select id="speed">'+[[.65,'느리게'],[1,'보통'],[1.6,'빠르게'],[2.3,'매우 빠르게']].map(([v,label])=>'<option value="'+v+'" '+(preferences.speed===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+sliders);
  for(const key of ['speed','music','sound'])el(key).oninput=e=>{
    preferences[key]=Number(e.target.value);
    try{localStorage.setItem(preferenceKey,JSON.stringify(preferences));}catch{}
    if(key!=='speed'){el(key+'Value').value=preferences[key]+'%';mixAudio();}
  };
  el('sound').onchange=()=>actionSound('buy');
}
document.getElementById('options').onclick=openPreferences;
