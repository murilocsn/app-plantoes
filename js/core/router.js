import { getCurrentUser, onAuthStateChange } from './auth.js';

/**
 * Lightweight client-side router for the static PWA.
 *
 * Routes are intentionally hash-based so the app keeps working on static
 * hosting without server-side rewrite rules. Authentication is enforced by
 * Supabase Auth + RLS; this module only controls which view is presented.
 */
const ROUTES = {
  login: { public: true, view: null },
  app: { public: false, view: 'calendar' },
  calendar: { public: false, view: 'calendar' },
  locations: { public: false, view: 'locations' },
  report: { public: false, view: 'report' }
};

function normalizeRoute(hash = window.location.hash) {
  const value = hash.replace(/^#\/?/, '').trim().toLowerCase();
  return ROUTES[value] ? value : 'app';
}

function setAuthScreen(showAuth) {
  const auth = document.getElementById('auth-screen');
  const app = document.getElementById('app');
  if (auth) auth.style.display = showAuth ? 'flex' : 'none';
  if (app) app.style.display = showAuth ? 'none' : 'flex';
}

function activateView(viewName) {
  if (!viewName) return;
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === `view-${viewName}`);
  });

  document.querySelectorAll('.navbtn').forEach((button) => {
    const active = button.dataset.view === viewName;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

export async function navigate(route) {
  const target = ROUTES[route] ? route : 'app';
  const user = await getCurrentUser();

  if (!user && !ROUTES[target].public) {
    if (window.location.hash !== '#/login') window.location.hash = '#/login';
    setAuthScreen(true);
    return 'login';
  }

  if (user && target === 'login') {
    if (window.location.hash !== '#/app') window.location.hash = '#/app';
    setAuthScreen(false);
    activateView('calendar');
    return 'app';
  }

  setAuthScreen(!user);
  if (user) activateView(ROUTES[target].view);
  return target;
}

export async function initRouter() {
  const handleRoute = () => {
    navigate(normalizeRoute()).catch((error) => {
      console.error('[router] Falha ao resolver rota:', error);
      setAuthScreen(true);
    });
  };

  window.addEventListener('hashchange', handleRoute);
  onAuthStateChange(() => handleRoute());
  handleRoute();

  return () => window.removeEventListener('hashchange', handleRoute);
}

export function goTo(route) {
  window.location.hash = `#/${route}`;
}

export { ROUTES };
