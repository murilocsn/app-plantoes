(() => {
  const cfg = window.FINANCPLANTOES_SUPABASE;
  let client = null;
  let currentUser = null;

  async function getClient() {
    if (!client) client = window.supabase.createClient(cfg.url, cfg.publishableKey);
    const { data } = await client.auth.getSession();
    currentUser = data?.session?.user || null;
    return client;
  }
  const money = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
  const dateBR = v => v ? new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${v}T12:00:00`)) : '—';
  const esc = v => String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  function workspace(title, subtitle, content) {
    const root = document.getElementById('modalRoot');
    root.innerHTML = `<div class="workspace-backdrop"><section class="workspace-window"><header class="workspace-head"><div><p class="eyebrow">FINANCPLANTÕES</p><h2>${title}</h2><p class="muted">${subtitle}</p></div><button class="close-btn" id="workspaceClose" type="button">×</button></header><div id="workspaceContent" class="workspace-content">${content}</div></section></div>`;
    root.querySelector('#workspaceClose').onclick = () => root.innerHTML='';
  }

  async function openFinance() {
    const c = await getClient();
    if (!currentUser) return;
    workspace('Financeiro','Altere o status dos recebimentos sem abrir o cadastro completo.','<p class="muted">Carregando...</p>');
    const { data, error } = await c.from('receivables').select('*').eq('user_id',currentUser.id).neq('status','cancelled').order('expected_date');
    if (error) return document.getElementById('workspaceContent').innerHTML = `<p class="danger-text">${esc(error.message)}</p>`;
    const pending = data.filter(r=>r.status!=='received').reduce((a,r)=>a+Number(r.amount),0);
    const received = data.filter(r=>r.status==='received').reduce((a,r)=>a+Number(r.amount),0);
    document.getElementById('workspaceContent').innerHTML = `<div class="finance-cards"><div><small>Pendente</small><strong>${money(pending)}</strong></div><div><small>Recebido</small><strong>${money(received)}</strong></div></div><div class="workspace-list">${data.length ? data.map(r=>`<article class="workspace-row"><div><strong>${esc(r.description)}</strong><small>${dateBR(r.expected_date)} · ${r.status==='received'?'Recebido':'Pendente'}</small></div><div class="workspace-row-end"><b>${money(r.amount)}</b>${r.status==='received'?`<button class="secondary small-action" data-receive="${r.id}">Editar recebimento</button>`:`<button class="primary small-action" data-receive="${r.id}">Marcar recebido</button>`}</div></article>`).join(''):'<p class="muted">Nenhum recebível cadastrado.</p>'}</div>`;
    document.querySelectorAll('[data-receive]').forEach(btn => btn.onclick = () => receiveForm(btn.dataset.receive, data.find(r=>r.id===btn.dataset.receive)));
  }

  function receiveForm(id, row) {
    const content = document.getElementById('workspaceContent');
    content.innerHTML = `<div class="receive-form"><h3>${esc(row.description)}</h3><p class="muted">Valor: ${money(row.amount)}</p><label>Data do recebimento<input id="receiveDate" type="date" value="${row.received_date||new Date().toISOString().slice(0,10)}"></label><label>Forma de pagamento<select id="receiveMethod"><option value="pix">PIX</option><option value="transfer">Transferência</option><option value="cash">Dinheiro</option><option value="card">Cartão</option><option value="other">Outro</option></select></label><label>Observação<textarea id="receiveNotes">${esc(row.notes||'')}</textarea></label><div class="modal-actions"><button class="secondary" id="receiveCancel">Cancelar</button><button class="primary" id="receiveSave">Confirmar recebimento</button></div></div>`;
    document.getElementById('receiveCancel').onclick = openFinance;
    document.getElementById('receiveSave').onclick = async e => {
      e.currentTarget.disabled=true;
      const c=await getClient();
      const {error}=await c.from('receivables').update({status:'received',received_date:document.getElementById('receiveDate').value,payment_method:document.getElementById('receiveMethod').value,notes:document.getElementById('receiveNotes').value||null}).eq('id',id).eq('user_id',currentUser.id);
      if(error){alert(error.message);e.currentTarget.disabled=false;return;}
      await openFinance();
      if(typeof window.loadAll==='function') window.loadAll();
    };
  }

  async function openExpenses() {
    const c=await getClient(); if(!currentUser)return;
    workspace('Despesas compartilhadas','Crie e acompanhe despesas por espaço e por participantes cadastrados.','<p class="muted">Carregando...</p>');
    const [spaces,members,profiles,expenses]=await Promise.all([
      c.from('spaces').select('id,name,space_type').order('name'),
      c.from('space_members').select('space_id,user_id,role,status').eq('status','active'),
      c.from('profiles').select('user_id,display_name').order('display_name'),
      c.from('expenses').select('*').order('expense_date',{ascending:false}).limit(50)
    ]);
    if(spaces.error||members.error||profiles.error||expenses.error){document.getElementById('workspaceContent').innerHTML=`<p class="danger-text">${esc((spaces.error||members.error||profiles.error||expenses.error).message)}</p>`;return;}
    const profileMap=Object.fromEntries((profiles.data||[]).map(p=>[p.user_id,p.display_name||'Usuário']));
    const mySpaces=(spaces.data||[]).filter(s=>(members.data||[]).some(m=>m.space_id===s.id&&m.user_id===currentUser.id));
    document.getElementById('workspaceContent').innerHTML=`<div class="workspace-toolbar"><button class="primary" id="newSharedExpense">+ Nova despesa compartilhada</button></div><div class="workspace-list">${(expenses.data||[]).filter(e=>mySpaces.some(s=>s.id===e.space_id)).map(e=>`<article class="workspace-row"><div><strong>${esc(e.description)}</strong><small>${money(e.amount)} · ${dateBR(e.expense_date)} · ${esc(mySpaces.find(s=>s.id===e.space_id)?.name||'Espaço')}</small></div><span class="muted">Pago por ${esc(profileMap[e.paid_by]||'Usuário')}</span></article>`).join('')||'<p class="muted">Nenhuma despesa compartilhada.</p>'}</div>`;
    document.getElementById('newSharedExpense').onclick=()=>sharedExpenseForm(c,mySpaces,members.data||[],profiles.data||[]);
  }

  function sharedExpenseForm(c,spaces,members,profiles) {
    const profileMap=Object.fromEntries(profiles.map(p=>[p.user_id,p.display_name||'Usuário']));
    document.getElementById('workspaceContent').innerHTML=`<div class="receive-form"><h3>Nova despesa compartilhada</h3><label>Espaço<select id="expenseSpace">${spaces.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label><label>Descrição<input id="expenseDescription" placeholder="Ex.: Mercado"></label><label>Valor<input id="expenseAmount" type="number" min="0.01" step="0.01"></label><label>Data<input id="expenseDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Quem pagou<select id="expensePayer">${profiles.filter(p=>members.some(m=>m.user_id===p.user_id&&m.status==='active')).map(p=>`<option value="${p.user_id}" ${p.user_id===currentUser.id?'selected':''}>${esc(profileMap[p.user_id])}</option>`).join('')}</select></label><fieldset><legend>Dividir entre</legend><div id="expenseParticipants">Selecione um espaço.</div></fieldset><div class="modal-actions"><button class="secondary" id="expenseBack">Cancelar</button><button class="primary" id="expenseSave">Salvar despesa</button></div></div>`;
    const participantBox=document.getElementById('expenseParticipants');
    function refreshParticipants(){const sid=document.getElementById('expenseSpace').value;const ids=members.filter(m=>m.space_id===sid&&m.status==='active').map(m=>m.user_id);participantBox.innerHTML=ids.map(id=>`<label class="participant"><input type="checkbox" value="${id}" checked> ${esc(profileMap[id]||'Usuário')}</label>`).join('')||'<p class="muted">Nenhum participante.</p>';}
    document.getElementById('expenseSpace').onchange=refreshParticipants;refreshParticipants();
    document.getElementById('expenseBack').onclick=openExpenses;
    document.getElementById('expenseSave').onclick=async e=>{e.currentTarget.disabled=true;const amount=Number(document.getElementById('expenseAmount').value);const participantIds=[...participantBox.querySelectorAll('input:checked')].map(x=>x.value);if(!document.getElementById('expenseDescription').value||!amount||!participantIds.length){alert('Preencha descrição, valor e participantes.');e.currentTarget.disabled=false;return;}const sid=document.getElementById('expenseSpace').value;const expenseId=crypto.randomUUID();const {error}=await c.from('expenses').insert({id:expenseId,space_id:sid,paid_by:document.getElementById('expensePayer').value,description:document.getElementById('expenseDescription').value,amount,expense_date:document.getElementById('expenseDate').value,split_method:'equal'});if(error){alert(error.message);e.currentTarget.disabled=false;return;}const share=Math.round((amount/participantIds.length)*100)/100;const rows=participantIds.map(uid=>({id:crypto.randomUUID(),expense_id:expenseId,user_id:uid,amount:share,percentage:100/participantIds.length,settled_amount:uid===document.getElementById('expensePayer').value?share:0,payment_status:uid===document.getElementById('expensePayer').value?'confirmed':'unpaid'}));const sr=await c.from('expense_splits').insert(rows);if(sr.error){await c.from('expenses').delete().eq('id',expenseId);alert(sr.error.message);e.currentTarget.disabled=false;return;}await openExpenses();};
  }

  function openRecurring() {
    if(typeof window.shiftForm!=='function') return;
    window.shiftForm();
    setTimeout(()=>{
      const form=document.getElementById('modalForm');
      if(!form)return;
      const check=form.querySelector('[name="repeat"]'); if(check){check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));}
      const end=form.querySelector('[name="end_date"]'); if(end&&!end.value){const d=new Date();d.setDate(d.getDate()+30);end.value=d.toISOString().slice(0,10);}
    },0);
  }

  function wire() {
    const recurrence=document.getElementById('addRecurrence');
    if(recurrence){const clone=recurrence.cloneNode(true);recurrence.replaceWith(clone);clone.addEventListener('click',openRecurring);}
    const financeNav=[...document.querySelectorAll('.nav-item,a')].find(a=>a.textContent.includes('Financeiro')); if(financeNav){financeNav.addEventListener('click',e=>{e.preventDefault();openFinance();});}
    const expenseNav=[...document.querySelectorAll('.nav-item,a')].find(a=>a.textContent.includes('Despesas')); if(expenseNav){expenseNav.addEventListener('click',e=>{e.preventDefault();openExpenses();});}
  }
  document.addEventListener('DOMContentLoaded',wire);
  window.openFinanceWorkspace=openFinance;
  window.openExpensesWorkspace=openExpenses;
})();
