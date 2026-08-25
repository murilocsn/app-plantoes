const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('financplantoes-theme');
if (savedTheme === 'dark' || savedTheme === 'light') root.dataset.theme = savedTheme;

function syncThemeButton() {
  const dark = root.dataset.theme === 'dark';
  if (themeToggle) themeToggle.innerHTML = dark ? '☀ <span>Tema claro</span>' : '☾ <span>Tema escuro</span>';
}

themeToggle?.addEventListener('click', () => {
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

const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmit = document.getElementById('authSubmit');
const authMessage = document.getElementById('authMessage');
const authTitle = document.getElementById('authTitle');
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const logoutButton = document.getElementById('logoutButton');
const profileEmail = document.getElementById('profileEmail');
const profileName = document.getElementById('profileName');
const profileAvatar = document.getElementById('profileAvatar');
const welcomeTitle = document.getElementById('welcomeTitle');

let authMode = 'login';
let supabaseClient = null;

function setMessage(message = '', type = '') {
  authMessage.textContent = message;
  authMessage.className = `auth-message${type ? ` ${type}` : ''}`;
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === 'signup';
  loginTab.classList.toggle('active', !signup);
  signupTab.classList.toggle('active', signup);
  authTitle.textContent = signup ? 'Criar sua conta' : 'Entrar na sua conta';
  authSubmit.textContent = signup ? 'Criar conta' : 'Entrar';
  authPassword.autocomplete = signup ? 'new-password' : 'current-password';
  setMessage('');
}

loginTab.addEventListener('click', () => setAuthMode('login'));
signupTab.addEventListener('click', () => setAuthMode('signup'));

function showApp(user) {
  authScreen.hidden = true;
  appShell.hidden = false;
  const email = user?.email || 'Usuário autenticado';
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0] || 'Usuário';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'FP';
  profileEmail.textContent = email;
  profileName.textContent = name;
  profileAvatar.textContent = initials;
  welcomeTitle.textContent = `Olá, ${name.split(/\s+/)[0]} 👋`;
}

function showAuth() {
  appShell.hidden = true;
  authScreen.hidden = false;
}

function friendlyAuthError(error) {
  const message = error?.message || 'Não foi possível concluir a operação.';
  const translations = {
    'Invalid login credentials': 'E-mail ou senha inválidos.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
    'User already registered': 'Este e-mail já está cadastrado. Tente entrar.',
    'Password should be at least 6 characters.': 'A senha precisa ter pelo menos 6 caracteres.'
  };
  return translations[message] || message;
}

async function initializeAuth() {
  try {
    if (!window.supabase || !window.FINANCPLANTOES_SUPABASE) {
      throw new Error('A configuração do Supabase não foi carregada.');
    }

    const { url, publishableKey } = window.FINANCPLANTOES_SUPABASE;
    supabaseClient = window.supabase.createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data.session?.user) showApp(data.session.user);
    else showAuth();

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) showApp(session.user);
      else showAuth();
    });
  } catch (error) {
    showAuth();
    setMessage(`Erro ao conectar ao Supabase: ${friendlyAuthError(error)}`, 'error');
  }
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    setMessage('A conexão com o Supabase ainda não está pronta. Recarregue a página.', 'error');
    return;
  }

  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) {
    setMessage('Informe e-mail e senha.', 'error');
    return;
  }

  authSubmit.disabled = true;
  setMessage(authMode === 'signup' ? 'Criando sua conta...' : 'Entrando...');

  try {
    if (authMode === 'signup') {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session?.user) {
        setMessage('Conta criada. Entrando...', 'success');
      } else {
        setMessage('Conta criada. Verifique seu e-mail para confirmar o cadastro.', 'success');
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session?.user) setMessage('Login realizado.', 'success');
    }
  } catch (error) {
    setMessage(friendlyAuthError(error), 'error');
  } finally {
    authSubmit.disabled = false;
  }
});

logoutButton.addEventListener('click', async () => {
  if (!supabaseClient) return;
  logoutButton.disabled = true;
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  } catch (error) {
    window.alert(`Não foi possível sair: ${friendlyAuthError(error)}`);
  } finally {
    logoutButton.disabled = false;
  }
});

initializeAuth();
