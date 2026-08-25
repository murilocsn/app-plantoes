import { getSupabase } from './core/supabase.js';

const TABLE = 'shifts';

function scopedQuery() {
  return getSupabase().from(TABLE);
}

/**
 * Data-access layer for shifts.
 * The current UI can adopt these functions incrementally without changing
 * the existing database schema.
 */
export async function listShifts({ from = null, to = null, order = 'date', ascending = true } = {}) {
  let query = scopedQuery().select('*').order(order, { ascending });
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getShift(id) {
  if (!id) throw new Error('O id do plantão é obrigatório.');
  const { data, error } = await scopedQuery().select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createShift(shift) {
  const { data, error } = await scopedQuery().insert(shift).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateShift(id, changes) {
  if (!id) throw new Error('O id do plantão é obrigatório.');
  const { data, error } = await scopedQuery().update(changes).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteShift(id) {
  if (!id) throw new Error('O id do plantão é obrigatório.');
  const { error } = await scopedQuery().delete().eq('id', id);
  if (error) throw error;
}

export async function listShiftsByLocation(locationId) {
  if (!locationId) return [];
  const { data, error } = await scopedQuery()
    .select('*')
    .eq('location_id', locationId)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listRecurringShifts(recurringGroupId) {
  if (!recurringGroupId) return [];
  const { data, error } = await scopedQuery()
    .select('*')
    .eq('recurring_group_id', recurringGroupId)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
