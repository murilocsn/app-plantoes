(() => {
  function load(src, attr) {
    if (document.querySelector(`script[${attr}]`)) return;
    const s = document.createElement('script');
    s.src = src;
    s.setAttribute(attr, '1');
    document.body.appendChild(s);
  }
  function init() {
    load('finance-actions-core.js?v=20260825-05', 'data-finance-core');
    load('logout.js?v=20260825-05', 'data-finance-logout');
  }
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
  init();
})();
