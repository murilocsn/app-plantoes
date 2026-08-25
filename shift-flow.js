(() => {
  const originalOpenForm = window.openForm;
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const today = () => new Date().toISOString().slice(0,10);

  function showShiftModal(old = null) {
    const locations = (cache?.locations || []).filter(l => l.active !== false);
    const selected = old ? locations.find(l => l.id === old.location_id) : null;
    const currentStatus = old?.status || 'scheduled';
    const body = `<div class="modal-grid">
      <label>Data<input name="date" type="date" value="${esc(old?.date || today())}" required></label>
      <label>Horário de início<input name="start_time" type="time" value="${esc(old?.start_time?.slice(0,5) || '')}" required></label>
      <label>Local<select name="location_id" required><option value="">Selecione o local</option>${locations.map(l => `<option value="${esc(l.id)}" ${l.id===selected?.id?'selected':''}>${esc(l.name)}</option>`).join('')}</select></label>
      <label>Duração (horas)<input name="duration" type="number" min="1" max="48" step="0.5" value="${old?.duration || 12}" required></label>
      <label>Valor do plantão<input name="value" type="number" min="0" step="0.01" value="${old?.value ?? old?.value12 ?? 0}" required></label>
      <label>Status<select name="status"><option value="scheduled" ${currentStatus==='scheduled'?'selected':''}>Agendado</option><option value="completed" ${currentStatus==='completed'?'selected':''}>Concluído</option><option value="cancelled" ${currentStatus==='cancelled'?'selected':''}>Cancelado</option></select></label>
      <label class="wide">Observações<textarea name="notes" maxlength="1000" placeholder="Observações opcionais">${esc(old?.notes || '')}</textarea></label>
      ${old ? '' : `<fieldset class="wide"><legend>Recorrência</legend><label class="inline-check"><input name="repeat" type="checkbox"> Repetir este plantão</label><div class="repeat-fields"><label>Frequência<select name="frequency"><option value="weekly">Semanal</option><option value="biweekly">Quinzenal</option><option value="monthly">Mensal</option><option value="daily">Diária</option></select></label><label>Intervalo<input name="interval_value" type="number" min="1" max="365" value="1"></label><label>Data final<input name="end_date" type="date"></label><label>Quantidade<input name="occurrences" type="number" min="2" max="500" placeholder="Opcional"></label></div><small class="muted">Informe uma data final ou uma quantidade de ocorrências.</small></fieldset>`}</div>`;

    const modalRoot = $('modalRoot');
    modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><p class="eyebrow">${old?'EDITAR':'NOVO'} PLANTÃO</p><h3>${old?'Editar plantão':'Adicionar plantão'}</h3></div><button class="close-btn" type="button" id="shiftClose">×</button></div><form id="shiftFlowForm">${body}<div class="modal-actions"><button class="secondary" type="button" id="shiftCancel">Cancelar</button><button class="primary" type="submit" id="shiftSave">${old?'Salvar alterações':'Adicionar plantão'}</button></div></form></div></div>`;
    $('shiftClose').onclick = window.closeModal;
    $('shiftCancel').onclick = window.closeModal;

    const repeat = modalRoot.querySelector('[name="repeat"]');
    const repeatFields = modalRoot.querySelector('.repeat-fields');
    const syncRepeat = () => { if(repeatFields) repeatFields.style.opacity = repeat?.checked ? '1' : '0.5'; };
    repeat?.addEventListener('change', syncRepeat); syncRepeat();

    $('shiftFlowForm').onsubmit = async (event) => {
      event.preventDefault();
      const save = $('shiftSave'); save.disabled = true; save.textContent = old ? 'Salvando...' : 'Adicionando...';
      try {
        const f = new FormData(event.currentTarget);
        const date = String(f.get('date') || '').trim();
        const startTime = String(f.get('start_time') || '').trim();
        const locationId = String(f.get('location_id') || '').trim();
        const duration = Number(f.get('duration'));
        const value = Number(f.get('value'));
        const location = locations.find(l => l.id === locationId);

        if(!date) throw new Error('Informe a data do plantão.');
        if(!startTime) throw new Error('Informe o horário de início.');
        if(!location) throw new Error('Selecione um local de trabalho ativo.');
        if(!Number.isFinite(duration) || duration <= 0 || duration > 48) throw new Error('A duração deve estar entre 1 e 48 horas.');
        if(!Number.isFinite(value) || value < 0) throw new Error('Informe um valor válido para o plantão.');

        const row={date,start_time:startTime,location_id:location.id,location_name:location.name,duration,value,value12:value,notes:String(f.get('notes')||'').trim()||null,status:String(f.get('status')||'scheduled')};
        if(old){
          const {error}=await db.from('shifts').update(row).eq('id',old.id).eq('user_id',user.id); if(error) throw error;
          const {error:receivableError}=await db.from('receivables').update({location_id:row.location_id,description:`Plantão · ${row.location_name}`,amount:row.value}).eq('shift_id',old.id).eq('user_id',user.id).neq('status','received'); if(receivableError) throw receivableError;
        }else{
          const shiftId=crypto.randomUUID(); row.id=shiftId; row.user_id=user.id;
          const {error:shiftError}=await db.from('shifts').insert(row); if(shiftError) throw shiftError;
          const expected=new Date(`${date}T12:00:00`); expected.setDate(expected.getDate()+30);
          const {error:receivableError}=await db.from('receivables').insert({user_id:user.id,shift_id:shiftId,location_id:location.id,description:`Plantão · ${location.name}`,amount:value,expected_date:expected.toISOString().slice(0,10),status:'pending'});
          if(receivableError){await db.from('shifts').delete().eq('id',shiftId).eq('user_id',user.id);throw receivableError;}
          if(f.get('repeat')==='on'){
            const occurrences=f.get('occurrences')?Number(f.get('occurrences')):null;
            const endDate=String(f.get('end_date')||'').trim()||null;
            const frequency=String(f.get('frequency')||'weekly');
            const interval=Number(f.get('interval_value')||1);
            if(!occurrences&&!endDate) throw new Error('Para repetir o plantão, informe a data final ou a quantidade de ocorrências.');
            if(occurrences&&(occurrences<2||occurrences>500)) throw new Error('A quantidade de ocorrências deve estar entre 2 e 500.');
            if(endDate&&endDate<=date) throw new Error('A data final da recorrência deve ser posterior ao primeiro plantão.');
            if(interval<1||interval>365) throw new Error('O intervalo deve estar entre 1 e 365.');
            const recurrenceId=crypto.randomUUID();
            const {error:recurrenceError}=await db.from('recurrences').insert({id:recurrenceId,user_id:user.id,frequency,interval_value:interval,start_date:date,end_date:endDate,occurrences,active:true});
            if(recurrenceError){await db.from('receivables').delete().eq('shift_id',shiftId).eq('user_id',user.id);await db.from('shifts').delete().eq('id',shiftId).eq('user_id',user.id);throw recurrenceError;}
            const {error:linkError}=await db.from('shifts').update({recurrence_id:recurrenceId}).eq('id',shiftId).eq('user_id',user.id); if(linkError) throw linkError;
            if(window.syncRecurrences) await window.syncRecurrences();
          }
        }
        window.closeModal(); await loadAll();
      }catch(error){alert(friendly(error));}
      finally{save.disabled=false;save.textContent=old?'Salvar alterações':'Adicionar plantão';}
    };
  }

  window.openForm=function(type,id='',spaceId=''){if(type==='shift')return showShiftModal(id?(cache.shifts||[]).find(s=>s.id===id):null);return originalOpenForm(type,id,spaceId)};
  ['newShiftButton','mobileNewShift','addShiftTop'].forEach(id=>{const button=$(id);if(button)button.onclick=()=>showShiftModal()});
})();
