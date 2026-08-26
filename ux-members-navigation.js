(() => {
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  function hideInitialFinancialSections() {
    ['receivables','expenses','reports'].forEach(id => { const el = $(id); if (el) el.hidden = true; });
  }

  function installMobileWorkspaceNavigation() {
    const nav = document.querySelector('.mobile-nav');
    if (!nav) return;
    nav.querySelectorAll('a').forEach(a => {
      const label = a.textContent.trim();
      if (!label.includes('Financeiro') && !label.includes('Despesas')) return;
      a.onclick = e => {
        e.preventDefault();
        if (label.includes('Financeiro')) window.openFinanceWorkspace?.();
        else window.openExpensesWorkspace?.();
      };
    });
  }

  function installAuthName() {
    const form = $('authForm'), email = $('authEmail');
    if (!form || !email || $('authFullName')) return;
    const label = document.createElement('label');
    label.id = 'authFullNameLabel';
    label.innerHTML = 'Nome completo<input id="authFullName" type="text" autocomplete="name" minlength="2" placeholder="Seu nome completo">';
    email.parentElement.before(label);
    const update = () => {
      const signup = $('signupTab')?.classList.contains('active');
      label.hidden = !signup;
      $('authFullName').required = !!signup;
    };
    $('loginTab')?.addEventListener('click', update);
    $('signupTab')?.addEventListener('click', update);
    update();
  }

  function installSignupCapture() {
    const form = $('authForm');
    if (!form || form.dataset.nameCapture) return;
    form.dataset.nameCapture = '1';
    document.addEventListener('submit', async e => {
      if (e.target !== form || !$('signupTab')?.classList.contains('active')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const name = $('authFullName')?.value.trim();
      const email = $('authEmail')?.value.trim();
      const password = $('authPassword')?.value || '';
      const submit = $('authSubmit');
      if (!name || name.length < 2) { if (window.msg) window.msg('Informe seu nome completo.','error'); else alert('Informe seu nome completo.'); return; }
      if (!email || !password) return;
      submit.disabled = true;
      try {
        const client = window.FINANCPLANTOES_DB;
        if (!client) throw new Error('Supabase não conectado.');
        const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) throw error;
        if (data.user && data.session) {
          await client.from('profiles').upsert({ user_id: data.user.id, display_name: name }, { onConflict: 'user_id' });
        }
        if (window.msg) window.msg(data.session ? 'Conta criada com sucesso.' : 'Conta criada. Confirme seu e-mail para entrar.','success');
      } catch (err) {
        if (window.msg) window.msg(err?.message || 'Não foi possível criar a conta.','error'); else alert(err?.message || 'Não foi possível criar a conta.');
      } finally { submit.disabled = false; }
    }, true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    hideInitialFinancialSections();
    installMobileWorkspaceNavigation();
    installAuthName();
    installSignupCapture();
  });
  window.hideInitialFinancialSections = hideInitialFinancialSections;
})();
