import { getSupabase } from './supabase.js';

/**
 * Authentication boundary for incremental migration from index.html.
 * No UI is coupled to these functions.
 */
export async function getCurrentUser() {
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw error;
  return data?.user ?? null;
}

export async function getSession() {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data?.session ?? null;
}

export function onAuthStateChange(callback) {
  return getSupabase().auth.onAuthStateChange(callback);
}
