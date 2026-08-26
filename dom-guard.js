// Compatibility guard loaded before app.js.
// It never overrides DOM APIs. It only restores legacy elements that the
// dashboard renderer still expects while Financeiro, Despesas and Espacos
// live on their own pages.
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

  // Legacy dashboard targets still referenced by the current app.js.
  ensure('receivableList');
  ensure('expenseList');
  ensure('reportSummary');

  // Older logout binding expected this id. Keep it as an invisible
  // compatibility target; the visible logout remains topLogoutButton.
  ensure('logoutButton', 'button');
  const legacyLogout = document.getElementById('logoutButton');
  if (legacyLogout) {
    legacyLogout.type = 'button';
    legacyLogout.tabIndex = -1;
    legacyLogout.setAttribute('aria-hidden', 'true');
    legacyLogout.style.display = 'none';
  }

  // Spaces is now a standalone page. Keep the legacy DOM target available
  // for app.js, but never show the old dashboard section.
  const hide = document.createElement('style');
  hide.id = 'dashboard-workspace-visibility';
  hide.textContent = '#spaces{display:none!important}#receivables,#expenses,#reports{display:none!important}';
  document.head.appendChild(hide);
})();
