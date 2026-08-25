const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('financplantoes-theme');
if (savedTheme === 'dark' || savedTheme === 'light') root.dataset.theme = savedTheme;

function syncThemeButton() {
  const dark = root.dataset.theme === 'dark';
  themeToggle.innerHTML = dark ? '☀ <span>Tema claro</span>' : '☾ <span>Tema escuro</span>';
}

themeToggle.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('financplantoes-theme', root.dataset.theme);
  syncThemeButton();
});

syncThemeButton();

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
    item.classList.add('active');
  });
});
