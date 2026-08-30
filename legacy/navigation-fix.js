(() => {
  function bind() {
    document.querySelectorAll('.mobile-nav a[href="#expenses"]').forEach(btn => {
      btn.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof window.openExpensesWorkspace === 'function') {
          window.openExpensesWorkspace();
        } else {
          alert('A janela de Despesas ainda não foi carregada. Recarregue a página.');
        }
        return false;
      };
    });
    document.querySelectorAll('.mobile-nav a[href="#receivables"]').forEach(btn => {
      btn.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof window.openFinanceWorkspace === 'function') window.openFinanceWorkspace();
        return false;
      };
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  window.bindWorkspaceNavigation = bind;
})();
