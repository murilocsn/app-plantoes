/**
 * Supabase client boundary.
 *
 * The current application may still initialize Supabase in index.html.
 * New modules should import this boundary instead of creating another client.
 * Keep project URL and anon key out of this file until the existing runtime
 * configuration has been migrated deliberately.
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
  if (!client) {
    throw new Error('Supabase ainda não foi configurado. Chame configureSupabase() primeiro.');
  }
  return client;
}

export function hasSupabase() {
  return Boolean(client);
}
