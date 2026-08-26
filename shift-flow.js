(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const today = () => new Date().toISOString().slice(0,10);

  async function getContext() {
    const cfg = window.FINANCPLANTOES_SUPABASE;
    const client = window.FINANCPLANTOES_DB || (window.supabase?.createClient && cfg ? window.supabase.createClient(cfg.url, cfg.publishableKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null);
    if (!client) throw new Error('Supabase não conectado. Recarregue a página e tente novamente.');
    const {data:{session},error} = await client.auth.getSession();
    if(error) throw error;
    if(!session?.user) throw new Error('Sua sessão expirou. Faça login novamente.');
    return {client,user:session.user};
  }
  async function fetchLocations(client,userId){const {data,error}=await client.from('locations').select('id,name,value12,active').eq('user_id',userId).order('name');if(error)throw error;return(data||[]).filter(l=>l.active!==false)}
  async function fetchShift(client,userId,id){if(!id)return null;const {data,error}=await client.from('shifts').select('id,date,start_time,location_id,location_name,duration,value,value12,notes,status,recurrence_id').eq('id',id).eq('user_id',userId).maybeSingle();if(error)throw error;return data||null}
  async function deleteShift(id){if(!id)return;if(!window.confirm('Excluir este plantão?\n\nO plantão e o recebível pendente vinculado serão removidos. Esta ação não pode ser desfeita.'))return;try{const {client,user}=await getContext();const shift=await fetchShift(client,user.id,id);if(!shift)throw new Error('Plantão não encontrado ou você não tem permissão para excluí-lo.');const {error:receivableError}=await client.from('receivables').delete().eq('shift_id',id).eq('user_id',user.id).neq('status','received');if(receivableError)throw receivableError;const {error:shiftError}=await client.from('shifts').delete().eq('id',id).eq('user_id',user.id);if(shiftError)throw shiftError;if(typeof window.closeModal==='function')window.closeModal();if(typeof window.loadAll==='function')await window.loadAll();if(typeof window.renderCalendar==='function')window.renderCalendar();alert('Plantão excluído com sucesso.')}catch(error){alert(typeof window.friendly==='function'?window.friendly(error):(error?.message||'Não foi possível excluir o plantão.'))}}

  function calculateEnd(start,duration){
    if(!start || !Number.isFinite(Number(duration))) return '';
    const [h,m]=start.split(':').map(Number); if(!Number.isFinite(h)||!Number.isFinite(m)) return '';
    const total=(h*60+m)+Math.round(Number(duration)*60); const end=((total%1440)+1440)%1440;
    return `${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;
  }

  function showShiftModal(old,locations,client,user,forceRecurring=false){
    const selected=old?locations.find(l=>l.id===old.location_id):null;
    const currentStatus=old?.status||'scheduled';
    const repeatDefault=forceRecurring&&!old;
    const body=`<div class="modal-grid">
      <label>Data<input name="date" type="date" value="${esc(old?.date||today())}" required></label>
      <label>Horário de início<input name="start_time" type="time" value="${esc(old?.start_time?.slice(0,5)||'')}" required></label>
      <label>Local<select name="location_id" required><option value="">Selecione o local</option>${locations.map(l=>`<option value="${esc(l.id)}" ${l.id===selected?.id?'selected':''}>${esc(l.name)}</option>`).join('')}</select></label>
      <label>Duração (horas)<input name="duration" type="number" min="1" max="48" step="0.5" value="${old?.duration||12}" required></label>
      <label>Horário de término<input name="end_time" type="time" value="${esc(calculateEnd(old?.start_time?.slice(0,5),old?.duration||12))}" readonly aria-describedby="endTimeHelp"></label>
      <label>Valor do plantão<input name="value" type="number" min="0" step="0.01" value="${old?.value??old?.value12??0}" required></label>
      <label>Status<select name="status"><option value="scheduled" ${currentStatus==='scheduled'?'selected':''}>Agendado</option><option value="completed" ${currentStatus==='completed'?'selected':''}>Concluído</option><option value="cancelled" ${currentStatus==='cancelled'?'selected':''}>Cancelado</option></select></label>
      <label class="wide">Observações<textarea name="notes" maxlength="1000">${esc(old?.notes||'')}</textarea></label>
      ${old?'':`<fieldset class="wide"><legend>Recorrência</legend><label class="inline-check"><input name="repeat" type="checkbox" ${repeatDefault?'checked':''}> <span>Repetir este plantão</span></label><div class="repeat-fields"><label>Frequência<select name="frequency"><option value="weekly">Semanal</option><option value="biweekly">Quinzenal</option><option value="monthly">Mensal</option><option value="daily">Diária</option></select></label><label>Intervalo<input name="interval_value" type="number" min="1" max="365" value="1"></label><label>Data final<input name="end_date" type="date"></label><label>Quantidade<input name="occurrences" type="number" min="2" max="500" placeholder="Opcional"></label></div><small class="muted">Informe uma data final ou uma quantidade.</small></fieldset>`}
    </div>`;
    const root=$('modalRoot');
    root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><p class="eyebrow">${old?'EDITAR':'NOVO'} PLANTÃO</p><h3>${old?'Editar plantão':'Adicionar plantão'}</h3></div><button class="close-btn" type="button" id="shiftClose">×</button></div><form id="shiftFlowForm">${body}<p id="endTimeHelp" class="muted end-time-help">O término é calculado automaticamente pelo horário de início + duração.</p><div class="modal-actions"><button class="secondary" type="button" id="shiftCancel">Cancelar</button>${old?`<button class="danger" type="button" id="shiftDelete">Excluir</button>`:''}<button class="primary" type="submit" id="shiftSave">${old?'Salvar alterações':'Adicionar plantão'}</button></div></form></div></div>`;
    $('shiftClose').onclick=window.closeModal;$('shiftCancel').onclick=window.closeModal;if(old)$('shiftDelete').onclick=()=>deleteShift(old.id);
    const form=$('shiftFlowForm'),start=form.querySelector('[name="start_time"]'),duration=form.querySelector('[name="duration"]'),end=form.querySelector('[name="end_time"]');
    const syncEnd=()=>{end.value=calculateEnd(start.value,duration.value)};start.addEventListener('input',syncEnd);duration.addEventListener('input',syncEnd);syncEnd();
    const repeat=form.querySelector('[name="repeat"]'),fields=form.querySelector('.repeat-fields'),sync=()=>{if(fields){fields.style.display=repeat?.checked?'grid':'none';fields.style.opacity=repeat?.checked?'1':'0.5'}};repeat?.addEventListener('change',sync);sync();
    form.onsubmit=async event=>{
      event.preventDefault();const save=$('shiftSave');save.disabled=true;save.textContent=old?'Salvando...':'Adicionando...';
      try{const f=new FormData(event.currentTarget),date=String(f.get('date')||'').trim(),startTime=String(f.get('start_time')||'').trim(),locationId=String(f.get('location_id')||'').trim(),durationValue=Number(f.get('duration')),value=Number(f.get('value')),location=locations.find(l=>l.id===locationId);
        if(!date)throw new Error('Informe a data do plantão.');if(!startTime)throw new Error('Informe o horário de início.');if(!location)throw new Error('Selecione um local de trabalho ativo.');if(!Number.isFinite(durationValue)||durationValue<1||durationValue>48)throw new Error('A duração deve estar entre 1 e 48 horas.');if(!Number.isFinite(value)||value<0)throw new Error('Informe um valor válido para o plantão.');
        const row={date,start_time:startTime,location_id:location.id,location_name:location.name,duration:durationValue,value,value12:value,notes:String(f.get('notes')||'').trim()||null,status:String(f.get('status')||'scheduled')};
        if(old){const {error:shiftError}=await client.from('shifts').update(row).eq('id',old.id).eq('user_id',user.id);if(shiftError)throw shiftError;const {error:recError}=await client.from('receivables').update({location_id:row.location_id,description:`Plantão · ${row.location_name}`,amount:row.value}).eq('shift_id',old.id).eq('user_id',user.id).neq('status','received');if(recError)throw recError}
        else{const shiftId=crypto.randomUUID();const {error:shiftError}=await client.from('shifts').insert({...row,id:shiftId,user_id:user.id});if(shiftError)throw shiftError;const expected=new Date(`${date}T12:00:00`);expected.setDate(expected.getDate()+30);const {error:receivableError}=await client.from('receivables').insert({user_id:user.id,shift_id:shiftId,location_id:location.id,description:`Plantão · ${location.name}`,amount:value,expected_date:expected.toISOString().slice(0,10),status:'pending'});if(receivableError){await client.from('shifts').delete().eq('id',shiftId).eq('user_id',user.id);throw receivableError}
          if(f.get('repeat')==='on'){const occurrences=f.get('occurrences')?Number(f.get('occurrences')):null,endDate=String(f.get('end_date')||'').trim()||null,frequency=String(f.get('frequency')||'weekly'),interval=Number(f.get('interval_value')||1);if(!occurrences&&!endDate)throw new Error('Para repetir o plantão, informe a data final ou a quantidade de ocorrências.');if(occurrences&&(occurrences<2||occurrences>500))throw new Error('A quantidade de ocorrências deve estar entre 2 e 500.');if(endDate&&endDate<=date)throw new Error('A data final da recorrência deve ser posterior ao primeiro plantão.');if(interval<1||interval>365)throw new Error('O intervalo deve estar entre 1 e 365.');const recurrenceId=crypto.randomUUID();const {error:recurrenceError}=await client.from('recurrences').insert({id:recurrenceId,user_id:user.id,frequency,interval_value:interval,start_date:date,end_date:endDate,occurrences,active:true});if(recurrenceError){await client.from('receivables').delete().eq('shift_id',shiftId).eq('user_id',user.id);await client.from('shifts').delete().eq('id',shiftId).eq('user_id',user.id);throw recurrenceError}const {error:linkError}=await client.from('shifts').update({recurrence_id:recurrenceId}).eq('id',shiftId).eq('user_id',user.id);if(linkError)throw linkError;if(window.syncRecurrences)await window.syncRecurrences()}
        }
        window.closeModal();if(typeof window.loadAll==='function')await window.loadAll();if(typeof window.renderCalendar==='function')window.renderCalendar();
      }catch(error){alert(typeof window.friendly==='function'?window.friendly(error):(error?.message||'Não foi possível salvar o plantão.'))}finally{save.disabled=false;save.textContent=old?'Salvar alterações':'Adicionar plantão'}
    };
  }
  async function openShiftFlow(id='',forceRecurring=false){try{const {client,user}=await getContext();const locations=await fetchLocations(client,user.id);if(!locations.length){alert('Cadastre e ative pelo menos um local de trabalho antes de criar um plantão.');return}const old=await fetchShift(client,user.id,id);showShiftModal(old,locations,client,user,forceRecurring)}catch(error){alert(error?.message||'Não foi possível abrir o cadastro de plantão.')}}
  window.deleteShift=deleteShift;window.openRecurringShift=()=>openShiftFlow('',true);window.openForm=function(type,id='',spaceId=''){if(type==='shift')return openShiftFlow(id);return undefined};
  ['newShiftButton','mobileNewShift','addShiftTop'].forEach(id=>{const button=$(id);if(button)button.onclick=()=>openShiftFlow()});
  const recurrence=$('addRecurrence');if(recurrence)recurrence.onclick=()=>openShiftFlow('',true);
})();
