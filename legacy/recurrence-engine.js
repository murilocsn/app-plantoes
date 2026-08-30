(() => {
  let busy = false;
  const add = (date, frequency, interval) => {
    const d = new Date(`${date}T12:00:00`);
    if (frequency === 'daily') d.setDate(d.getDate() + interval);
    else if (frequency === 'weekly') d.setDate(d.getDate() + 7 * interval);
    else if (frequency === 'biweekly') d.setDate(d.getDate() + 14 * interval);
    else d.setMonth(d.getMonth() + interval);
    return d.toISOString().slice(0, 10);
  };

  const expectedPaymentDate = (shiftDate, location) => {
    const date = new Date(`${shiftDate}T12:00:00Z`), day = date.getUTCDate();
    let month = date.getUTCMonth(), year = date.getUTCFullYear();
    const start = Number(location?.reference_start_day ?? 1), end = Number(location?.reference_end_day ?? 28);
    if (start <= end) { if (day > end) month += 1; else if (day < start) month -= 1; }
    else if (day < start) month -= 1;
    const paymentMonth = new Date(Date.UTC(year, month + Number(location?.payment_due_months_after ?? 1), 1));
    const lastDay = new Date(Date.UTC(paymentMonth.getUTCFullYear(), paymentMonth.getUTCMonth() + 1, 0)).getUTCDate();
    paymentMonth.setUTCDate(Math.min(Number(location?.payment_due_day ?? 10), lastDay));
    return paymentMonth.toISOString().slice(0, 10);
  };

  async function syncRecurrences() {
    if (busy || typeof db === 'undefined' || !db || typeof user === 'undefined' || !user || typeof cache === 'undefined') return;
    busy = true;
    try {
      for (const rec of (cache.recurrences || [])) {
        if (rec.active === false) continue;
        const base = (cache.shifts || []).filter(s => s.recurrence_id === rec.id).sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
        if (!base) continue;
        const { data: existing, error } = await db.from('shifts').select('id,date').eq('user_id', user.id).eq('recurrence_id', rec.id).order('date');
        if (error) continue;
        const dates = new Set((existing || []).map(s => s.date));
        let date = base.date, count = existing?.length || 0, guard = 0;
        while (guard++ < 5000) {
          if (rec.occurrences && count >= rec.occurrences) break;
          const next = add(date, rec.frequency, Number(rec.interval_value || 1));
          if (rec.end_date && next > rec.end_date) break;
          if (!next) break;
          if (dates.has(next)) { date = next; continue; }
          const id = crypto.randomUUID();
          const shift = { ...base, id, user_id: user.id, date: next, recurrence_id: rec.id, status: 'scheduled' };
          delete shift.created_at; delete shift.updated_at;
          const { error: insertError } = await db.from('shifts').insert(shift);
          if (insertError) break;
          const location = (cache.locations || []).find(item => item.id === base.location_id);
          await db.from('receivables').insert({ user_id: user.id, shift_id: id, location_id: base.location_id || null, description: `Plantão · ${base.location_name || 'Local'}`, amount: Number(base.value ?? base.value12 ?? 0), expected_date: expectedPaymentDate(next, location), status: 'pending' });
          dates.add(next); count++; date = next;
        }
      }
    } finally { busy = false; }
  }

  window.syncRecurrences = syncRecurrences;
  const observeAuth = () => {
    const shell = document.getElementById('appShell');
    if (!shell) return;
    const observer = new MutationObserver(() => {
      if (!shell.hidden && typeof user !== 'undefined' && user) syncRecurrences();
    });
    observer.observe(shell, { attributes: true, attributeFilter: ['hidden'] });
    if (!shell.hidden && typeof user !== 'undefined' && user) syncRecurrences();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeAuth, { once: true }); else observeAuth();
})();
