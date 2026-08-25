// Chave publicável: a segurança dos dados é aplicada pelas políticas RLS do Supabase.
window.FINANCPLANTOES_SUPABASE={url:'https://onqbnogccjfgihmmxrid.supabase.co',publishableKey:'sb_publishable_gvs6MsolBL25CTzxkjssew_xhNYup8S'};

// Stability guard: getSession() followed by Supabase's initial SIGNED_IN event
// must not initialize the whole dashboard twice.
if (window.supabase?.createClient && !window.__FINANCPLANTOES_SUPABASE_PATCHED__) {
  const originalCreateClient = window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient = (...args) => {
    const client = originalCreateClient(...args);
    const originalGetSession = client.auth.getSession.bind(client.auth);
    const originalOnAuthStateChange = client.auth.onAuthStateChange.bind(client.auth);
    let lastSessionUserId = null;
    client.auth.getSession = async (...getArgs) => {
      const result = await originalGetSession(...getArgs);
      lastSessionUserId = result?.data?.session?.user?.id || null;
      return result;
    };
    client.auth.onAuthStateChange = (callback) => originalOnAuthStateChange((event, session) => {
      const id = session?.user?.id || null;
      if (event === 'INITIAL_SESSION' || (event === 'SIGNED_IN' && id && id === lastSessionUserId)) {
        if (event === 'SIGNED_IN') lastSessionUserId = id;
        return;
      }
      lastSessionUserId = id;
      return callback(event, session);
    });
    return client;
  };
  window.__FINANCPLANTOES_SUPABASE_PATCHED__ = true;
}
