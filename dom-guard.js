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

  // Legacy render targets.
  ['receivableList', 'expenseList', 'reportSummary'].forEach(id => ensure(id));

  // Legacy action targets still bound by app.js. They remain hidden because
  // these functions now live on their dedicated workspace pages.
  ['addReceivable', 'addPersonalExpense', 'addSharedExpense', 'exportCsv'].forEach(id => ensure(id, 'button'));

  // Older logout binding expected this id. Keep it as an invisible
  // compatibility target; the visible logout remains topLogoutButton.
  const legacyLogout = ensure('logoutButton', 'button');
  legacyLogout.type = 'button';
  legacyLogout.tabIndex = -1;
  legacyLogout.setAttribute('aria-hidden', 'true');
  legacyLogout.style.display = 'none';

  // Spaces is now a standalone page. Keep the legacy DOM target available
  // for app.js, but never show the old dashboard section.
  const hide = document.createElement('style');
  hide.id = 'dashboard-workspace-visibility';
  hide.textContent = '#spaces{display:none!important}#receivables,#expenses,#reports{display:none!important}';
  document.head.appendChild(hide);
})();
