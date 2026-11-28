// Faces in the atlas follow m/p/s/z order; keep the tile identity available to assistive tech.
export function decorateTile(el, code) {
  if (!code || !/^[mpsz][0-9]/.test(code)) return el;
  const row = 'mpsz'.indexOf(code[0]);
  const rank = Number(code[1]) || 5;
  el.classList.add('engraved-tile');
  el.style.setProperty('--tile-x', (rank - 1) * 12.5 + '%');
  el.style.setProperty('--tile-y', row * 100 / 3 + '%');
  if (code[1] === '0') el.classList.add('red-five');
  return el;
}
