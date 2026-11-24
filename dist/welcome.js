const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

function showGame(game) {
  const selected = tabs.find(tab => tab.getAttribute('aria-controls') === game) || tabs[0];
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  }
}

tabs.forEach((tab, index) => {
  tab.onclick = () => {
    const game = tab.getAttribute('aria-controls');
    history.replaceState(null, '', '#' + game);
    showGame(game);
  };
  tab.onkeydown = event => {
    const next = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  };
});
window.addEventListener('hashchange', () => showGame(location.hash.slice(1)));
showGame(location.hash.slice(1));
