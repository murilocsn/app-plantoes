// Compatibility guard loaded before app.js.
// It never overrides DOM APIs. It restores legacy targets and protects
// navigation to the standalone Financeiro / Despesas / Espaços pages.
(() => {
  const ensure = (id, tag = 'div') => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement(tag);
      el.id = id;
      el.hidden = true;
      document.body.appendChild(el);
    }
    return el;
  };

  ['receivableList', 'expenseList', 'reportSummary'].forEach(id => ensure(id));
  ['addReceivable', 'addPersonalExpense', 'addSharedExpense', 'exportCsv'].forEach(id => ensure(id, 'button'));

  const legacyLogout = ensure('logoutButton', 'button');
  legacyLogout.type = 'button';
  legacyLogout.tabIndex = -1;
  legacyLogout.setAttribute('aria-hidden', 'true');
  legacyLogout.style.display = 'none';

  const hide = document.createElement('style');
  hide.id = 'dashboard-workspace-visibility';
  hide.textContent = '#spaces{display:none!important}#receivables,#expenses,#reports{display:none!important}';
  document.head.appendChild(hide);

  // Logout is handled in capture phase so it still works if another script
  // has stopped propagation or the dashboard is busy loading data.
  document.addEventListener('click', async event => {
    const button = event.target.closest?.('#topLogoutButton, #logoutButton, [data-action="logout"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      const client = window.FINANCPLANTOES_DB;
      if (client) await client.auth.signOut({ scope: 'local' });
    } catch (_) {
      // Local cleanup below is enough to leave the current device signed out.
    } finally {
      try {
        localStorage.removeItem('financplantoes-theme');
        Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
        Object.keys(sessionStorage).forEach(k => sessionStorage.removeItem(k));
      } catch (_) {}
      window.location.replace('index.html#/login');
    }
  }, true);

  // app.js historically intercepts all navigation anchors and scrolls to an
  // id. That is correct for dashboard anchors, but wrong for standalone
  // workspace pages. Capture those clicks before app.js sees them.
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    if (!/^(finance|expenses|spaces)\.html(?:\?.*)?$/.test(href)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.href = href;
  }, true);
})();