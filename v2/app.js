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
const dashboardStatus = document.getElementById('dashboardStatus');

let authMode = 'login';
let supabaseClient = null;
let currentUser = null;

const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const dateBR = (value) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`)) : '—';
const dateLong = (value) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : '—';
const monthName = (value) => value ? new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${value}T12:00:00`)).replace('.', '').toUpperCase() : '—';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

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
  currentUser = user;
  authScreen.hidden = true;
  appShell.hidden = false;
  const email = user?.email || 'Usuário autenticado';
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0] || 'Usuário';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'FP';
  profileEmail.textContent = email;
  profileName.textContent = name;
  profileAvatar.textContent = initials;
  welcomeTitle.textContent = `Olá, ${name.split(/\s+/)[0]} 👋`;
  loadDashboard(user).catch((error) => {
    dashboardStatus.textContent = `Não foi possível carregar todos os dados: ${friendlyAuthError(error)}`;
    console.error(error);
  });
}

function showAuth() {
  currentUser = null;
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

function monthBounds() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const next = new Date(year, now.getMonth() + 1, 1);
  const nextYear = next.getFullYear();
  const nextMonth = String(next.getMonth() + 1).padStart(2, '0');
  return { start: `${year}-${month}-01`, end: `${nextYear}-${nextMonth}-01` };
}

function renderShiftList(shifts) {
  const target = document.getElementById('shiftList');
  if (!shifts.length) {
    target.innerHTML = '<p class="muted">Você não possui próximos plantões cadastrados.</p>';
    return;
  }
  target.innerHTML = shifts.map((shift) => `
    <div class="shift-row">
      <div class="date-chip"><strong>${new Date(`${shift.date}T12:00:00`).getDate()}</strong><span>${monthName(shift.date)}</span></div>
      <div class="row-main"><strong>${escapeHtml(shift.location_name || 'Local não informado')}</strong><span>${escapeHtml(shift.start_time?.slice(0, 5) || '—')} · ${Number(shift.duration || 0)}h</span></div>
      <div class="row-value">${money(shift.value ?? shift.value12)}</div>
      <span class="status confirmed">Agendado</span>
    </div>`).join('');
}

function renderReceivables(receivables) {
  const target = document.getElementById('receivableList');
  if (!receivables.length) {
    target.innerHTML = '<p class="muted">Nenhum recebimento futuro cadastrado.</p>';
    return;
  }
  target.innerHTML = receivables.slice(0, 5).map((item) => `
    <div><span>${dateBR(item.expected_date)}</span><strong>${escapeHtml(item.description || 'Recebimento')}</strong><b>${money(item.amount)}</b></div>`).join('');
}

function renderSpaces(spaces) {
  const target = document.getElementById('spaceGrid');
  if (!spaces.length) {
    target.innerHTML = '<p class="muted">Você ainda não participa de espaços compartilhados.</p>';
    return;
  }
  const icons = { viagem: '✈️', residencia: '🏠', casa: '🏠', clinica: '🏥', equipe: '👥', evento: '🎉', congresso: '📚' };
  target.innerHTML = spaces.slice(0, 6).map(({ space, role }) => {
    const key = String(space.space_type || '').toLowerCase();
    const icon = icons[key] || '◈';
    return `<div class="space-card"><span>${icon}</span><div><strong>${escapeHtml(space.name)}</strong><small>${escapeHtml(role || 'member')} · ${space.description ? escapeHtml(space.description) : 'Espaço compartilhado'}</small></div></div>`;
  }).join('');
}

function renderDashboard({ shifts, monthShifts, receivables, spaces, expenses, splits }) {
  const projection = monthShifts.reduce((sum, shift) => sum + Number(shift.value ?? shift.value12 ?? 0), 0);
  const monthReceived = receivables.filter((item) => item.status === 'received' || item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthPending = receivables.filter((item) => !['received', 'paid'].includes(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const progress = projection > 0 ? Math.min(100, Math.round((monthReceived / projection) * 100)) : 0;
  const hours = monthShifts.reduce((sum, shift) => sum + Number(shift.duration || 0), 0);
  const next = [...receivables].sort((a, b) => String(a.expected_date).localeCompare(String(b.expected_date))).find((item) => !['received', 'paid'].includes(item.status));
  const pay = splits.filter((split) => Number(split.amount || 0) - Number(split.settled_amount || 0) > 0).reduce((sum, split) => sum + Math.max(0, Number(split.amount || 0) - Number(split.settled_amount || 0)), 0);
  const receive = expenses.reduce((sum, expense) => sum + (expense.paid_by === currentUser.id ? Number(expense.amount || 0) : 0), 0);
  const net = receive - pay;

  document.getElementById('monthProjection').textContent = money(projection);
  document.getElementById('monthReceived').textContent = money(monthReceived);
  document.getElementById('monthPending').textContent = money(monthPending);
  document.getElementById('monthProgress').style.width = `${progress}%`;
  document.getElementById('monthTrend').textContent = projection ? `${progress}% recebido` : 'Sem dados';
  document.getElementById('nextReceivableValue').textContent = next ? money(next.amount) : money(0);
  document.getElementById('nextReceivableLabel').textContent = next ? `${dateLong(next.expected_date)} · ${next.description || 'Recebimento'}` : 'Nenhum recebimento previsto';
  document.getElementById('monthShiftCount').textContent = String(monthShifts.length);
  document.getElementById('monthShiftHours').textContent = `${hours} horas registradas`;
  document.getElementById('sharedBalance').textContent = `${net >= 0 ? '+' : '-'} ${money(Math.abs(net))}`;
  document.getElementById('sharedBalanceLabel').textContent = `${spaces.length} espaço${spaces.length === 1 ? '' : 's'} ativo${spaces.length === 1 ? '' : 's'}`;
  document.getElementById('sharedPay').textContent = money(pay);
  document.getElementById('sharedReceive').textContent = money(receive);
  document.getElementById('sharedNet').textContent = `${net >= 0 ? '+' : '-'} ${money(Math.abs(net))}`;
  dashboardStatus.textContent = `Dados atualizados agora · ${monthShifts.length} plantão${monthShifts.length === 1 ? '' : 'ões'} neste mês`;
  renderShiftList(shifts);
  renderReceivables(receivables);
  renderSpaces(spaces);
}

async function loadDashboard(user) {
  if (!supabaseClient || !user) return;
  dashboardStatus.textContent = 'Carregando seus dados...';
  const today = new Date().toISOString().slice(0, 10);
  const { start, end } = monthBounds();

  const [shiftsResult, monthShiftsResult, receivablesResult, spacesResult, expensesResult, splitsResult] = await Promise.all([
    supabaseClient.from('shifts').select('id,date,start_time,location_name,duration,value,value12').eq('user_id', user.id).gte('date', today).order('date', { ascending: true }).order('start_time', { ascending: true }).limit(8),
    supabaseClient.from('shifts').select('id,date,start_time,location_name,duration,value,value12').eq('user_id', user.id).gte('date', start).lt('date', end),
    supabaseClient.from('receivables').select('id,description,amount,expected_date,received_date,status,payment_method').eq('user_id', user.id).order('expected_date', { ascending: true }).limit(50),
    supabaseClient.from('space_members').select('space_id,role,status,spaces(id,name,space_type,description)').eq('user_id', user.id).eq('status', 'active'),
    supabaseClient.from('expenses').select('id,space_id,paid_by,amount,description,expense_date').eq('paid_by', user.id).limit(100),
    supabaseClient.from('expense_splits').select('expense_id,user_id,amount,settled_amount').eq('user_id', user.id).limit(100)
  ]);

  const firstError = [shiftsResult, monthShiftsResult, receivablesResult, spacesResult, expensesResult, splitsResult].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const spaces = (spacesResult.data || []).filter((item) => item.spaces).map((item) => ({ space: item.spaces, role: item.role }));
  renderDashboard({
    shifts: shiftsResult.data || [],
    monthShifts: monthShiftsResult.data || [],
    receivables: receivablesResult.data || [],
    spaces,
    expenses: expensesResult.data || [],
    splits: splitsResult.data || []
  });
}

async function initializeAuth() {
  try {
    if (!window.supabase || !window.FINANCPLANTOES_SUPABASE) throw new Error('A configuração do Supabase não foi carregada.');
    const { url, publishableKey } = window.FINANCPLANTOES_SUPABASE;
    supabaseClient = window.supabase.createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data.session?.user) showApp(data.session.user); else showAuth();
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) showApp(session.user); else showAuth();
    });
  } catch (error) {
    showAuth();
    setMessage(`Erro ao conectar ao Supabase: ${friendlyAuthError(error)}`, 'error');
  }
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) return setMessage('A conexão com o Supabase ainda não está pronta. Recarregue a página.', 'error');
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) return setMessage('Informe e-mail e senha.', 'error');
  authSubmit.disabled = true;
  setMessage(authMode === 'signup' ? 'Criando sua conta...' : 'Entrando...');
  try {
    if (authMode === 'signup') {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session?.user) setMessage('Conta criada. Entrando...', 'success');
      else setMessage('Conta criada. Verifique seu e-mail para confirmar o cadastro.', 'success');
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
