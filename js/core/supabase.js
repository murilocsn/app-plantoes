/**
 * Supabase client boundary.
 *
 * The legacy/static application initializes the browser client in
 * supabase-config.js. New modules use this boundary so Auth is configured in
 * exactly one place and the publishable key remains the only frontend key.
 */

let client = null;

export function configureSupabase(supabaseClient) {
  if (!supabaseClient) {
    throw new Error('Um cliente Supabase válido é obrigatório.');
  }
  client = supabaseClient;
  return client;
}

export function getSupabase() {
  if (client) return client;

  if (globalThis.FINANCPLANTOES_DB) {
    client = globalThis.FINANCPLANTOES_DB;
    return client;
  }

  const cfg = globalThis.FINANCPLANTOES_SUPABASE;
  if (cfg && globalThis.supabase?.createClient) {
    client = globalThis.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return client;
  }

  throw new Error('Supabase ainda não foi configurado.');
}

export function hasSupabase() {
  return Boolean(client || globalThis.FINANCPLANTOES_DB || globalThis.FINANCPLANTOES_SUPABASE);
}
