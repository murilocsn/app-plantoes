(() => {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('script[data-finance-actions]')) return;
    const script=document.createElement('script');
    script.src='finance-actions.js?v=20260825-01';
    script.async=false;
    script.dataset.financeActions='1';
    document.body.appendChild(script);
  });
})();
