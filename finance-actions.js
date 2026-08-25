(() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  function addActionButtons() {
    const receivableList = $('receivableList');
    if (receivableList) {
      receivableList.querySelectorAll('.mini-item').forEach((row, idx) => {
        if (row.querySelector('[data-fin-action="receive"]')) return;
        const active = (cache?.receivables || []).filter(r=>r.status!=='cancelled').slice(0,10)[idx];
        if (!active) return;
        const actions = document.createElement('span'); actions.className='toolbar finance-inline-actions';
        if (active.status !== 'received') {
          const b=document.createElement('button'); b.type='button'; b.className='link-button'; b.textContent='Recebi'; b.dataset.finAction='receive'; b.dataset.id=active.id; actions.appendChild(b);
        }
        const b2=document.createElement('button'); b2.type='button'; b2.className='link-button danger-text'; b2.textContent='Excluir'; b2.dataset.finAction='delete-receivable'; b2.dataset.id=active.id; actions.appendChild(b2);
        row.appendChild(actions);
      });
    }

    const shiftList = $('shiftList');
    if (shiftList) {
      shiftList.querySelectorAll('.list-row').forEach((row, idx) => {
        if (row.querySelector('[data-fin-action="delete-shift"]')) return;
        const active=(cache?.shifts||[]).filter(s=>s.date>=new Date().toISOString().slice(0,10)).slice(0,12)[idx];
        if(!active) return;
        const actions=document.createElement('span'); actions.className='toolbar finance-inline-actions';
        const b=document.createElement('button'); b.type='button'; b.className='link-button danger-text'; b.textContent='Excluir'; b.dataset.finAction='delete-shift'; b.dataset.id=active.id; actions.appendChild(b); row.appendChild(actions);
      });
    }

    const expenseList = $('expenseList');
    if (expenseList) {
      expenseList.querySelectorAll('.mini-item').forEach((row, idx) => {
        if (row.querySelector('[data-fin-action="settlement"]')) return;
        const personal=(cache?.personalExpenses||[]).slice(0,5);
        const shared=(cache?.sharedExpenses||[]).slice(0,5);
        const combined=[...personal.map(e=>({type:'personal',...e})),...shared.map(e=>({type:'shared',...e}))].slice(0,10);
        const active=combined[idx]; if(!active || active.type!=='shared') return;
        const b=document.createElement('button'); b.type='button'; b.className='link-button'; b.textContent='Acertos'; b.dataset.finAction='settlement'; b.dataset.id=active.id; row.appendChild(b);
      });
    }
  }

  async function markReceived(id) {
    const item=(cache.receivables||[]).find(r=>r.id===id); if(!item) return;
    const paymentMethod=prompt('Forma de pagamento (PIX, transferência, dinheiro etc.):', item.payment_method || 'PIX'); if(paymentMethod===null) return;
    const notes=prompt('Observação opcional:', item.notes || '') ?? item.notes || null;
    const {error}=await db.from('receivables').update({status:'received',received_date:new Date().toISOString().slice(0,10),payment_method:paymentMethod.trim()||null,notes}).eq('id',id).eq('user_id',user.id);
    if(error) return alert(error.message||'Não foi possível marcar como recebido.');
    await loadAll();
  }

  async function deleteReceivable(id) {
    const item=(cache.receivables||[]).find(r=>r.id===id); if(!item) return;
    if(!confirm(`Excluir o recebível “${item.description}” de ${fmt(item.amount)}?`)) return;
    const {error}=await db.from('receivables').delete().eq('id',id).eq('user_id',user.id);
    if(error) return alert(error.message||'Não foi possível excluir o recebível.');
    await loadAll();
  }

  async function deleteShiftSafe(id) {
    const s=(cache.shifts||[]).find(x=>x.id===id); if(!s) return;
    if(!confirm(`Excluir o plantão de ${s.date} em ${s.location_name}? O recebível ligado também será excluído.`)) return;
    const {error:receivableError}=await db.from('receivables').delete().eq('shift_id',id).eq('user_id',user.id);
    if(receivableError) return alert(receivableError.message||'Não foi possível excluir o recebível do plantão.');
    const {error}=await db.from('shifts').delete().eq('id',id).eq('user_id',user.id);
    if(error) return alert(error.message||'Não foi possível excluir o plantão.');
    await loadAll();
  }

  async function openSettlements(expenseId) {
    const {data:expense,error:expenseError}=await db.from('expenses').select('id,description,amount,paid_by,space_id').eq('id',expenseId).single();
    if(expenseError) return alert(expenseError.message);
    const {data:splits,error:splitError}=await db.from('expense_splits').select('*').eq('expense_id',expenseId);
    if(splitError) return alert(splitError.message);
    const {data:members,error:memberError}=await db.from('space_members').select('user_id,role,status').eq('space_id',expense.space_id).eq('status','active');
    if(memberError) return alert(memberError.message);
    const memberLabel = (id) => id===user.id ? 'Você' : `Membro ${String(id).slice(0,8)}`;
    const rows=(splits||[]).filter(s=>s.user_id!==expense.paid_by).map(s=>`<div class="mini-item"><span><strong>${esc(memberLabel(s.user_id))}</strong><small>Deve ${fmt(s.amount)} · ${s.payment_status==='confirmed'?'Pagamento confirmado':s.payment_status==='reported'?'Pagamento informado':'Em aberto'}</small></span><span class="toolbar">${s.payment_status==='unpaid'&&s.user_id===user.id?`<button class="link-button" data-fin-action="report-payment" data-id="${s.id}">Informar pagamento</button>`:''}${s.payment_status==='reported'&&expense.paid_by===user.id?`<button class="link-button" data-fin-action="confirm-payment" data-id="${s.id}">Confirmar recebimento</button>`:''}</span></div>`).join('');
    const root=$('modalRoot'); root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><p class="eyebrow">ACERTOS</p><h3>${esc(expense.description)}</h3></div><button class="close-btn" type="button" id="settleClose">×</button></div><div class="modal-grid"><div class="wide"><p>Total da despesa <strong>${fmt(expense.amount)}</strong></p>${rows||'<p class="muted">Nenhum devedor pendente.</p>'}</div></div><div class="modal-actions"><button class="secondary" type="button" id="settleCancel">Fechar</button></div></div></div>`;
    $('settleClose').onclick=closeModal; $('settleCancel').onclick=closeModal;
  }

  async function reportPayment(id){
    if(!confirm('Informar que você realizou este pagamento? O valor só será abatido quando o credor confirmar o recebimento.')) return;
    const {error}=await db.from('expense_splits').update({payment_status:'reported',payment_reported_at:new Date().toISOString(),payment_reported_by:user.id}).eq('id',id).eq('user_id',user.id);
    if(error) return alert(error.message||'Não foi possível informar o pagamento.');
    closeModal(); await loadAll();
  }

  async function confirmPayment(id){
    if(!confirm('Confirmar que recebeu este pagamento? O valor será abatido da dívida.')) return;
    const {data:split}=await db.from('expense_splits').select('amount').eq('id',id).single();
    if(!split) return;
    const {error}=await db.from('expense_splits').update({payment_status:'confirmed',settled_amount:Number(split.amount),payment_confirmed_at:new Date().toISOString(),payment_confirmed_by:user.id}).eq('id',id);
    if(error) return alert(error.message||'Não foi possível confirmar o recebimento.');
    closeModal(); await loadAll();
  }

  document.addEventListener('click', async (e) => {
    const b=e.target.closest('[data-fin-action]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    try {
      const action=b.dataset.finAction, id=b.dataset.id;
      if(action==='receive') await markReceived(id);
      else if(action==='delete-receivable') await deleteReceivable(id);
      else if(action==='delete-shift') await deleteShiftSafe(id);
      else if(action==='settlement') await openSettlements(id);
      else if(action==='report-payment') await reportPayment(id);
      else if(action==='confirm-payment') await confirmPayment(id);
    } catch(err){ alert(err?.message||'Não foi possível concluir a operação.'); }
  });

  const style=document.createElement('style'); style.textContent='.finance-inline-actions{margin-left:auto;gap:6px;display:inline-flex;align-items:center}.finance-inline-actions .link-button{font-size:12px}.modal .mini-item{gap:10px}'; document.head.appendChild(style);
  const observer=new MutationObserver(()=>addActionButtons());
  document.addEventListener('DOMContentLoaded',()=>{ addActionButtons(); if($('receivableList'))observer.observe($('receivableList'),{childList:true}); if($('shiftList'))observer.observe($('shiftList'),{childList:true}); if($('expenseList'))observer.observe($('expenseList'),{childList:true}); });
})();
