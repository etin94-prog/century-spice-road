'use strict';
// Mouse/pen tilt for cards marked .tt-tilt: the card leans toward the pointer and
// the sheen follows it. Touch is left alone (taps must not move targets), and so
// is anyone who asked for reduced motion.
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let current = null, frame = 0, last = null;
  function reset(card) {
    if (!card) return;
    card.removeAttribute('data-tt-active');
    card.style.removeProperty('--tt-rx');
    card.style.removeProperty('--tt-ry');
    card.style.removeProperty('--tt-gx');
  }
  function apply() {
    frame = 0;
    if (!current || !last) return;
    const r = current.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = Math.min(1, Math.max(0, (last.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (last.clientY - r.top) / r.height));
    current.style.setProperty('--tt-ry', ((x - .5) * 10).toFixed(2) + 'deg');
    current.style.setProperty('--tt-rx', ((.5 - y) * 8).toFixed(2) + 'deg');
    current.style.setProperty('--tt-gx', (100 - x * 100).toFixed(1) + '%');
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !fine.matches || still.matches) return;
    const card = event.target.closest?.('.tt-tilt');
    if (card !== current) {
      reset(current);
      current = card;
      if (card) card.setAttribute('data-tt-active', '');
    }
    last = event;
    if (current && !frame) frame = requestAnimationFrame(apply);
  }, {passive: true});
  document.addEventListener('pointerleave', () => { reset(current); current = null; }, true);
  addEventListener('blur', () => { reset(current); current = null; });
})();
