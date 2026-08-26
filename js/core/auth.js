import { getSupabase } from './supabase.js';

/**
 * Authentication boundary shared by the modular router and future views.
 * Server-side protection is provided by Supabase Auth + RLS; this module
 * handles the client session and verifies the JWT before trusting identity.
 */
export async function getCurrentUser() {
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw error;
  return data?.user ?? null;
}

export async function getClaims() {
  const { data, error } = await getSupabase().auth.getClaims();
  if (error) throw error;
  return data?.claims ?? null;
}

export async function getSession() {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data?.session ?? null;
}

export async function isAuthenticated() {
  try {
    return Boolean(await getClaims());
  } catch {
    return false;
  }
}

export function onAuthStateChange(callback) {
  return getSupabase().auth.onAuthStateChange(callback);
}
