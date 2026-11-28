'use strict';
// Original miniature scores. Each line supplies a tempo, tonic (MIDI), ensemble and an
// eight-eighth-note theme. Digits are scale degrees, dots are rests; the answer develops
// over an eight-bar phrase. Voices share the game's existing music gain and audio context.
const worldwideMusic = (() => {
  const parts = [
    [82,62,'mallet','0.245.21'], [100,60,'pluck','02.4.310'], [108,65,'club','4.20.356'],
    [92,57,'mallet','03.42.10'], [104,64,'glass','0.34.621'], [74,55,'strings','2.410.32'],
    [96,62,'glass','05.42.31'], [88,60,'club','24.350.1'], [112,65,'pluck','024.3.10'],
    [69,57,'silk','0.2.4532'], [106,62,'mallet','4.102.53'], [95,59,'glass','02.53.42'],
    [114,60,'club','03.54.21'], [90,55,'pluck','245.2.10'], [76,62,'strings','0.342.14'],
    [68,58,'strings','4.32.010'], [72,62,'silk','0.4.2351'], [89,64,'silk','2.403.21'],
    [81,57,'silk','05.42.10'], [80,60,'glass','4.210.35'], [115,64,'club','2.450.31'],
    [93,58,'lounge','4.3.2105'], [78,55,'lounge','2.45.310'], [101,62,'lounge','04.235.1'],
    [98,60,'pluck','2.46.532'], [134,62,'club','024.5310'], [71,65,'glass','0.420.13'],
    [102,57,'strings','0.35.210'], [117,64,'mallet','23.504.1'], [108,60,'club','4.230.15'],
    [72,62,'links','4..2.013'], [84,55,'lounge','2.3.5104'], [120,60,'club','0.2453.1'],
    [94,62,'pluck','0.534.21'], [97,57,'mallet','25.40.31'], [112,65,'clay','0.24.531'],
    [126,62,'club','03.502.4'], [72,64,'glass','2..410.3'], [128,57,'strings','0.302.45'],
    [116,60,'organ','024.5.42'], [132,64,'glass','0.54.312'], [142,57,'club','0245.310'],
    [64,65,'links','0..4.253'], [110,55,'strings','0.130.42'], [118,58,'strings','02.305.4'],
    [121,60,'mallet','43.201.5'], [106,65,'glass','024.6.53'], [83,62,'pluck','2.510.34'],
    [66,60,'silk','4.20.314'], [77,65,'lounge','0.243.51'], [73,57,'links','2..410.5'],
  ];
  const ensembles = {
    mallet:['sine',.42,[0,2,4,7,9,12,14], [0,3,4,0]],
    pluck:['triangle',.28,[0,2,4,5,7,9,11], [0,5,3,4]],
    club:['triangle',.38,[0,2,4,5,7,9,10], [0,3,1,4]],
    glass:['sine',.92,[0,2,4,7,9,12,14], [0,1,3,2]],
    strings:['triangle',1.18,[0,2,3,5,7,8,10], [0,2,5,4]],
    silk:['sine',.71,[0,2,5,7,9,12,14], [0,2,1,3]],
    lounge:['triangle',.63,[0,2,3,5,7,9,10], [0,3,1,4]],
    links:['sine',1.34,[0,2,4,6,7,9,11], [0,1,5,4]],
    clay:['triangle',.29,[0,2,4,5,7,9,11], [0,3,5,4]],
    organ:['sine',.85,[0,2,4,5,7,9,10], [0,3,0,4]],
  };
  const route = location.pathname.split('/').pop();
  const query = new URLSearchParams(location.search).get('game');
  const id = route === 'blackjack.html' ? 22 : route === 'card-table.html' && query === 'poker' ? 23 :
    route === 'world-table.html' ? Number(query) : 0;
  const part = parts[id - 1];
  if (!part) return null;
  const [tempo, tonic, ensemble, motif] = part;
  const [wave, sustain, scale, changes] = ensembles[ensemble];
  const interval = 30 / tempo;
  const degree = n => tonic + scale[n % 7] + 12 * Math.floor(n / 7);
  function render(tick, time, play) {
    const bar = Math.floor(tick / 8) % 8, pulse = tick % 8;
    const root = changes[Math.floor(bar / 2)];
    const note = motif[(pulse + (bar % 4 === 3 ? 2 : 0)) % 8];
    if (pulse === 0 || (pulse === 4 && ensemble !== 'links')) {
      play(degree(root + (pulse === 4 ? 4 : 0))-12, time, interval*1.75, .14, 'sine');
    }
    if (pulse === 2 || pulse === 6) {
      for (const n of [2,4]) play(degree(root+n),time,interval*(ensemble === 'clay' ? .33 : 1.4),.048,wave);
    }
    if (note !== '.') {
      const pitch = degree(Number(note)+root+(bar === 6 ? 2 : 0));
      const accent = pulse % 2 ? .108 : .145;
      play(pitch,time,interval*sustain,accent,wave);
      if (ensemble === 'organ') {
        play(pitch+12,time,interval*.8,.065,'sine');
        play(pitch+19,time,interval*.65,.032,'sine');
      } else if (ensemble === 'mallet' || ensemble === 'glass' || ensemble === 'links') {
        play(pitch+12,time,interval*.36,.036,'sine');
      }
    }
  }
  return { id, interval, render };
})();