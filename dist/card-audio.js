'use strict';

const cardAudio = (() => {
  const key = 'worldwide-card-audio-v1';
  const volume = {music:22, effects:65, voice:85};
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    for (const name of Object.keys(volume)) {
      if (Number.isFinite(saved?.[name])) volume[name] = Math.min(100, Math.max(0, saved[name]));
    }
  } catch {}
  const music = [
    [48, [60, 64, 67, 71]], [45, [60, 64, 67, 71]],
    [41, [57, 60, 64, 67]], [43, [59, 62, 65, 69]]
  ];
  const melody = [0,2,1,3,2,1,3,2];
  const results = {win:[72,76,79], loss:[67,63,60], draw:[65,69,65]};
  const clips = {};
  let context, noise, timer, beat = 0, ready, voiceSource, resultId = 0;
  let buses;

  function mix() {
    if (!context) return;
    for (const name of Object.keys(volume)) {
      buses[name].gain.setTargetAtTime(volume[name]/100, context.currentTime, .02);
    }
  }
  function tone(bus, pitch, time, duration, level, type = 'sine') {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((pitch - 69) / 12);
    envelope.gain.setValueAtTime(.001, time);
    envelope.gain.linearRampToValueAtTime(level, time + .012);
    envelope.gain.exponentialRampToValueAtTime(.001, time + duration);
    oscillator.connect(envelope).connect(bus);
    oscillator.start(time);
    oscillator.stop(time + duration);
  }
  const arrangement = typeof worldwideMusic === 'undefined' ? null : worldwideMusic;
  let nextBeat = 0;
  function musicBeat() {
    if (context.state !== 'running' || document.hidden || !volume.music) return;
    if (arrangement) {
      const now = context.currentTime;
      if (nextBeat < now) nextBeat = now + .014;
      while (nextBeat < now + .12) {
        arrangement.render(beat++, nextBeat, (pitch, time, duration, level, wave) =>
          tone(buses.music, pitch, time, duration, level, wave));
        nextBeat += arrangement.interval;
      }
      return;
    }
    const [root, chord] = music[Math.floor(beat/8) % music.length];
    const step = beat++ % 8;
    const now = context.currentTime + .015;
    if (step === 0 || step === 4) tone(buses.music, root, now, .85, .23);
    tone(buses.music, chord[melody[step]], now, .45, .16, 'triangle');
  }
  function loadVoice(result) {
    if (!clips[result]) {
      clips[result] = fetch('audio/card-' + result + '.mp3')
        .then(response => {
          if (!response.ok) throw Error('Voice clip unavailable');
          return response.arrayBuffer();
        }).then(bytes => context.decodeAudioData(bytes)).catch(() => null);
    }
    return clips[result];
  }
  function unlock(event) {
    if (!event.isTrusted || document.hidden) return;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return;
    if (!context) {
      context = new AudioEngine();
      buses = Object.fromEntries(Object.keys(volume).map(name => {
        const bus = context.createGain();
        bus.gain.value = volume[name]/100;
        bus.connect(context.destination);
        return [name, bus];
      }));
      noise = context.createBuffer(1, Math.ceil(context.sampleRate * .12), context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i=0; i<samples.length; i++) samples[i] = Math.random() * 2 - 1;
      if (volume.voice) Object.keys(results).forEach(loadVoice);
    }
    startMusic();
    if (context.state === 'running' || ready) return;
    ready = context.resume().catch(() => {}).finally(() => { ready = null; });
  }
  function startMusic() {
    if (timer || !volume.music || document.hidden) return;
    nextBeat = 0;
    timer = setInterval(musicBeat, arrangement ? 60 : 335);
  }
  function whenReady(play) {
    if (document.hidden) return;
    if (context?.state === 'running') play();
    else if (ready) ready.then(() => {
      if (!document.hidden && context.state === 'running') play();
    });
  }
  function paper(time, land) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(land ? 1750 : 3400, time);
    filter.frequency.exponentialRampToValueAtTime(land ? 660 : 1400, time + .055);
    envelope.gain.setValueAtTime(land ? .45 : .26, time);
    envelope.gain.exponentialRampToValueAtTime(.001, time + (land ? .065 : .105));
    source.connect(filter).connect(envelope).connect(buses.effects);
    source.start(time);
    if (land) tone(buses.effects, 43, time, .085, .22);
  }
  const impacts = {
    racket: [[62,.066,.16,'triangle'],[88,.035,.07,'sine']],
    bounce: [[47,.085,.14,'sine']], bat: [[50,.13,.21,'triangle'],[85,.044,.16,'triangle']],
    putt: [[73,.06,.12,'sine']], iron: [[77,.1,.16,'triangle'],[99,.055,.08,'sine']],
    cup: [[76,.13,.14,'sine'],[88,.22,.08,'sine']],
  };
  function cue(kind, count = 1) {
    if (!volume.effects) return;
    whenReady(() => {
      const now = context.currentTime + .008;
      if (Object.hasOwn(impacts, kind)) {
        impacts[kind].forEach(([pitch, duration, gain, wave], i) =>
          tone(buses.effects, pitch, now + i*.014, duration, gain, wave));
      } else if (kind === 'chip') {
        tone(buses.effects, 90, now, .06, .15, 'triangle');
      } else {
        for (let i=0; i<Math.min(count, 4); i++) paper(now + i*.054, kind === 'land');
      }
    });
  }
  function stopVoice() {
    if (voiceSource) voiceSource.stop();
    voiceSource = null;
    resultId++;
  }
  function result(outcome) {
    stopVoice();
    const id = resultId;
    whenReady(() => {
      if (id !== resultId) return;
      const now = context.currentTime;
      if (volume.effects) results[outcome].forEach((pitch,i) => {
        tone(buses.effects, pitch, now + .24 + i*.095, .21, .15, 'triangle');
      });
      if (!volume.voice) return;
      loadVoice(outcome).then(buffer => {
        if (!buffer || id !== resultId || document.hidden || !volume.voice || context.state !== 'running') return;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(buses.voice);
        voiceSource = source;
        source.onended = () => { if (voiceSource === source) voiceSource = null; };
        source.start(Math.max(context.currentTime, now + .57));
      });
    });
  }

  const settings = document.getElementById('cardAudioSettings');
  const panel = document.getElementById('cardAudioDialog');
  settings.onclick = () => panel.showModal();
  panel.addEventListener('input', event => {
    const name = event.target.name;
    if (!Object.hasOwn(volume,name)) return;
    volume[name] = Number(event.target.value);
    panel.querySelector('#card-' + name + '-value').value = volume[name] + '%';
    if (!volume.voice) stopVoice();
    try { localStorage.setItem(key, JSON.stringify(volume)); } catch {}
    mix();
    if (!volume.music) { clearInterval(timer); timer = null; } else if (context) startMusic();
  });
  for (const name of Object.keys(volume)) {
    panel.querySelector('[name="' + name + '"]').value = volume[name];
    panel.querySelector('#card-' + name + '-value').value = volume[name] + '%';
  }
  panel.querySelector('[data-audio-preview]').onclick = () => result('win');
  document.addEventListener('pointerup', unlock, true);
  document.addEventListener('keydown', unlock, true);
  document.addEventListener('click', unlock, true);
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) {
      clearInterval(timer);
      timer = null;
      stopVoice();
      context.suspend().catch(() => {});
    } else {
      context.resume().catch(() => {});
      startMusic();
    }
  });
  return {cue, result, stopVoice};
})();
