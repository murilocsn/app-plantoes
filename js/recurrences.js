import { getSupabase } from './core/supabase.js';

const TABLE = 'recurrences';

export async function listRecurrences({ active = null } = {}) {
  let query = getSupabase().from(TABLE).select('*').order('start_date', { ascending: true });
  if (active !== null) query = query.eq('active', active);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getRecurrence(id) {
  if (!id) throw new Error('O id da recorrência é obrigatório.');
  const { data, error } = await getSupabase().from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createRecurrence(recurrence) {
  const { data, error } = await getSupabase().from(TABLE).insert(recurrence).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateRecurrence(id, changes) {
  if (!id) throw new Error('O id da recorrência é obrigatório.');
  const { data, error } = await getSupabase().from(TABLE).update(changes).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteRecurrence(id) {
  if (!id) throw new Error('O id da recorrência é obrigatório.');
  const { error } = await getSupabase().from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
