import { games, runTable } from './ww-core.js';
import { title, group } from './ww-data.js';
const id = Number(new URLSearchParams(location.search).get('game'));
const modules = [
  ['boards', [1, 2, 3, 4, 5, 7, 10, 15]],
  ['paths', [6, 8, 9, 11, 12]],
  ['races', [13, 14]],
  ['chess', [16]],
  ['kings', [17, 18]],
  ['east', [19]],
  ['riichi', [20]],
  ['cards', [21, 24, 25, 26, 27, 28, 29, 30]],
  ['precision', [31, 32, 33, 34, 35, 38]],
  ['arcade', [36, 37, 39, 40, 41, 42, 43, 44, 45, 46]],
  ['puzzles', [47, 48, 49, 50, 51]],
];
const entry = modules.find(([, ids]) => ids.includes(id));
if (!entry) {
  location.replace('./#worldwide');
} else {
  await import('./ww-' + entry[0] + '.js');
  const def = games.get(id),
    name = title(id),
    dialog = document.querySelector('#dialog');
  document.title = name + ' · 51 Worldwide Games';
  document.querySelector('#name').textContent = name;
  document.body.dataset.group = group(id);
  document.body.dataset.game = id;
  dialog.style.setProperty('--cover', 'url("art/worldwide/game-' + id + '.webp")');
  let controller;
  function start() {
    if (typeof cardAudio !== 'undefined') cardAudio.stopVoice();
    controller?.abort();
    controller = new AbortController();
    runTable(def, controller.signal);
  }
  function open(reset) {
    dialog.querySelector('h2').textContent = reset ? '새 판을 시작할까요?' : name;
    dialog.querySelector('p').textContent = reset ? '현재 판의 진행 기록이 사라집니다.' : def.rules;
    dialog.querySelector('.credits').hidden = reset;
    document.querySelector('#confirm').hidden = !reset;
    dialog.returnValue = '';
    dialog.showModal();
  }
  document.querySelector('#guide').onclick = () => open(false);
  document.querySelector('#restart').onclick = () => open(true);
  dialog.onclose = () => {
    if (dialog.returnValue === 'restart') start();
  };
  start();
}
