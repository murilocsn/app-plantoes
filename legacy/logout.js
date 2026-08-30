(() => {
  async function signOut() {
    try {
      if (typeof db !== 'undefined' && db) {
        const { error } = await db.auth.signOut();
        if (error) throw error;
      } else if (window.supabase && window.FINANCPLANTOES_SUPABASE) {
        const cfg = window.FINANCPLANTOES_SUPABASE;
        const client = window.supabase.createClient(cfg.url, cfg.publishableKey);
        const { error } = await client.auth.signOut();
        if (error) throw error;
      }
      if (typeof window.showAuth === 'function') window.showAuth();
    } catch (error) {
      alert(error?.message || 'Não foi possível sair da conta.');
    }
  }

  function ensureTopLogout() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('logoutTopButton')) return;
    const button = document.createElement('button');
    button.id = 'logoutTopButton';
    button.type = 'button';
    button.className = 'secondary logout-top-button';
    button.textContent = 'Sair';
    button.title = 'Sair da conta';
    button.addEventListener('click', signOut);
    topbar.appendChild(button);
  }

  function bindExisting() {
    document.querySelectorAll('#logoutButton, [data-action="logout"]').forEach(button => {
      if (button.dataset.logoutBound === '1') return;
      button.dataset.logoutBound = '1';
      button.addEventListener('click', signOut);
    });
  }

  function init() {
    ensureTopLogout();
    bindExisting();
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
  window.addEventListener('pageshow', init);
})();
