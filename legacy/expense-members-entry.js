(() => {
  function addManager() {
    const select = document.getElementById('es');
    if (!select || document.getElementById('manageExpenseMembers')) return;
    const label = select.closest('label');
    if (!label) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'manageExpenseMembers';
    b.className = 'secondary';
    b.textContent = '👥 Gerenciar membros';
    b.style.marginTop = '8px';
    b.onclick = () => {
      const sid = select.value;
      if (!sid) return alert('Selecione um espaço primeiro.');
      if (typeof window.openSpaceMembers !== 'function') return alert('O módulo de membros não foi carregado.');
      window.openSpaceMembers(sid);
    };
    label.appendChild(b);
  }
  const boot = () => {
    addManager();
    new MutationObserver(addManager).observe(document.body, {childList:true, subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();