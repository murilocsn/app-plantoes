import { getSupabase } from './core/supabase.js';

const TABLE = 'payments';

function scopedQuery() {
  return getSupabase().from(TABLE);
}

export async function listPayments({ status = null, from = null, to = null } = {}) {
  let query = scopedQuery().select('*').order('due_date', { ascending: true, nullsFirst: false });
  if (status) query = query.eq('status', status);
  if (from) query = query.gte('due_date', from);
  if (to) query = query.lte('due_date', to);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createPayment(payment) {
  const { data, error } = await scopedQuery().insert(payment).select('*').single();
  if (error) throw error;
  return data;
}

export async function updatePayment(id, changes) {
  if (!id) throw new Error('O id do pagamento é obrigatório.');
  const { data, error } = await scopedQuery().update(changes).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function markPaymentAsPaid(id, paidDate = new Date().toISOString().slice(0, 10)) {
  return updatePayment(id, { status: 'paid', paid_date: paidDate });
}

export async function deletePayment(id) {
  if (!id) throw new Error('O id do pagamento é obrigatório.');
  const { error } = await scopedQuery().delete().eq('id', id);
  if (error) throw error;
}

export function summarizePayments(payments = []) {
  return payments.reduce((summary, payment) => {
    const amount = Number(payment.amount) || 0;
    summary.total += amount;
    if (payment.status === 'paid') summary.paid += amount;
    if (payment.status === 'pending') summary.pending += amount;
    if (payment.status === 'overdue') summary.overdue += amount;
    if (payment.status === 'cancelled') summary.cancelled += amount;
    return summary;
  }, { total: 0, paid: 0, pending: 0, overdue: 0, cancelled: 0 });
}
