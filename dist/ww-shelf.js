import { title, catalog, group, href } from './ww-data.js';
const panel = document.querySelector('#worldwide'),
  shelf = panel.querySelector('.ww-list'),
  extra = panel.querySelector('.ww-extra');
const query = panel.querySelector('input[type=search]'),
  category = panel.querySelector('select'),
  count = panel.querySelector('output');
const groups = ['전체', '보드', '카드·패', '스포츠·액션', '퍼즐', '추가 게임'];
for (const name of groups) category.add(new Option(name, name));
const cards = catalog.map(([, english], i) => {
  const id = i + 1,
    link = document.createElement('a'),
    photo = document.createElement('img'),
    name = document.createElement('h2');
  link.href = href(id);
  link.dataset.group = group(id);
  link.dataset.id = id;
  photo.src = 'art/worldwide/game-' + id + '.webp';
  photo.alt = '';
  photo.loading = 'lazy';
  name.textContent = title(id);
  const original = document.createElement('small');
  original.lang = 'en';
  original.textContent = english;
  link.append(photo, name, original);
  shelf.append(link);
  return link;
});
function filter() {
  const term = query.value.trim().toLowerCase(),
    g = category.value;
  let n = 0;
  for (const card of cards) {
    const show =
      (g === '전체' || g === card.dataset.group) &&
      (card.textContent.toLowerCase().includes(term) || String(card.dataset.id) === term);
    card.hidden = !show;
    if (show) n++;
  }
  let added = 0;
  for (const card of extra.querySelectorAll('a')) {
    card.hidden =
      !(g === '전체' || g === '추가 게임') || !card.textContent.toLowerCase().includes(term);
    if (!card.hidden) added++;
  }
  extra.hidden = !added;
  panel.querySelector('.extra-title').hidden = !added;
  count.textContent = '수록작 ' + n + ' / 51' + (added ? '　추가 ' + added : '');
  panel.querySelector('.ww-empty').hidden = n + added !== 0;
}
query.addEventListener('input', filter);
category.addEventListener('change', filter);
filter();
