import { getSupabase } from './core/supabase.js';

const TABLE = 'locations';

function scopedQuery() {
  return getSupabase().from(TABLE);
}

export async function listLocations() {
  const { data, error } = await scopedQuery().select('*').order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getLocation(id) {
  if (!id) throw new Error('O id do local é obrigatório.');
  const { data, error } = await scopedQuery().select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createLocation(location) {
  const { data, error } = await scopedQuery().insert(location).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateLocation(id, changes) {
  if (!id) throw new Error('O id do local é obrigatório.');
  const { data, error } = await scopedQuery().update(changes).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteLocation(id) {
  if (!id) throw new Error('O id do local é obrigatório.');
  const { error } = await scopedQuery().delete().eq('id', id);
  if (error) throw error;
}
