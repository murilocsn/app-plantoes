(() => {
  const redirectToLogin = () => {
    if (!location.pathname.endsWith('/index.html') && !location.pathname.endsWith('/')) {
      location.replace('index.html#/login');
    }
  };

  async function verify() {
    const db = window.FINANCPLANTOES_DB;
    if (!db) {
      redirectToLogin();
      return;
    }

    // getUser() validates the identity with Supabase Auth. Do not use the
    // locally stored session user as the authorization boundary.
    const { data, error } = await db.auth.getUser();
    if (error || !data?.user) {
      await db.auth.signOut({ scope: 'local' }).catch(() => {});
      redirectToLogin();
      return;
    }

    window.FINANCPLANTOES_AUTH_USER = data.user;
    document.documentElement.dataset.authenticated = 'true';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verify, { once: true });
  } else {
    verify();
  }
})();
