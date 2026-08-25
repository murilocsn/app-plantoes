import { getSupabase } from './core/supabase.js';

const TABLE = 'settings';

export async function getSettings() {
  const { data, error } = await getSupabase().from(TABLE).select('*').maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveSettings(settings) {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .upsert(settings, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateMonthlyGoal(userId, monthlyGoal) {
  if (!userId) throw new Error('O user_id é obrigatório.');
  return saveSettings({ user_id: userId, monthly_goal: Number(monthlyGoal) || 0 });
}
