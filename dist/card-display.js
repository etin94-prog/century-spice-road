'use strict';

(() => {
  const root = document.documentElement;
  const full = document.getElementById('cardFull');
  const wide = document.getElementById('cardWide');
  const fullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;
  let expanded = false;
  let landscape = false;
  let pending = false;

  function paint() {
    root.classList.toggle('card-expanded', expanded || Boolean(fullscreen()));
    root.classList.toggle('card-landscape', landscape);
    full.setAttribute('aria-pressed', String(expanded || Boolean(fullscreen())));
    wide.setAttribute('aria-pressed', String(landscape));
  }

  async function toggleFull() {
    if (pending) return;
    pending = true;
    try {
      if (fullscreen()) {
        expanded = false;
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        await exit?.call(document);
      } else if (expanded) {
        expanded = false;
      } else {
        const request = root.requestFullscreen || root.webkitRequestFullscreen;
        try {
          await request?.call(root);
        } catch {
          // Embedded browsers can deny fullscreen even when the API is present.
        }
        expanded = !fullscreen();
      }
    } catch {
      // Keep the actual browser state if a fullscreen exit is rejected.
    } finally {
      pending = false;
      paint();
    }
  }

  full.addEventListener('click', toggleFull);
  wide.addEventListener('click', () => {
    landscape = !landscape;
    paint();
    document.querySelector('main').scrollTop = 0;
  });
  document.addEventListener('fullscreenchange', paint);
  document.addEventListener('webkitfullscreenchange', paint);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    if (expanded) expanded = false;
    else if (landscape) landscape = false;
    paint();
  });
})();
