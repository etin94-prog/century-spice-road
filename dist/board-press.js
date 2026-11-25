'use strict';

// Press feedback never captures the pointer or dispatches a game action.
(() => {
  const pieces = [
    'button.card', '.handBtn', '.chip', '.casino', '.tile', '.catalog-open',
    '[data-kind]', '[data-hand-index]', '[data-site]', '[data-island]',
    '[data-card]', '[data-bank]', '[data-deck]', '[data-held]', '[data-noble]',
    '#hand button', '#controls button', '#action', '#board [role="button"]'
  ].join(',');
  let press;
  function clear() {
    press?.piece.removeAttribute('data-table-pressed');
    press = undefined;
  }
  const options = {capture:true, passive:true};
  document.addEventListener('pointerdown', event => {
    clear();
    if (!event.isPrimary || event.pointerType !== 'touch') return;
    const piece = event.target.closest?.(pieces);
    if (!piece || piece.closest(':disabled,[aria-disabled="true"],[inert]')) return;
    press = {piece, id:event.pointerId, x:event.clientX, y:event.clientY};
    piece.setAttribute('data-table-pressed', '');
  }, options);
  document.addEventListener('pointermove', event => {
    if (press?.id === event.pointerId &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) clear();
  }, options);
  for (const type of ['pointerup','pointercancel','scroll','visibilitychange']) {
    document.addEventListener(type, clear, options);
  }
  window.addEventListener('blur', clear);
})();
