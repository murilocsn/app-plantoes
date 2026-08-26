(() => {
  const $ = id => document.getElementById(id);
  const db = () => window.FINANCPLANTOES_DB || window.db;
  const getUser = async () => { const c=db(); if(!c) throw new Error('Supabase não conectado.'); const {data,error}=await c.auth.getSession(); if(error) throw error; if(!data.session?.user) throw new Error('Sessão expirada.'); return data.session.user; };
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>new Date().toISOString().slice(0,10);
  const addDays=(date,n)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
  const durationEnd=(start,duration)=>{if(!start)return '';const [h,m]=start.split(':').map(Number);const total=h*60+m+Number(duration)*60;const t=((total%1440)+1440)%1440;return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`};

  async function logout(){const c=db();if(c) await c.auth.signOut();location.reload();}
  function wireTop(){
    ['topLogoutButton','logoutButton'].forEach(id=>$(id)?.addEventListener('click',e=>{e.preventDefault();logout()}));
    const top=$('topLogoutButton'), sidebar=document.querySelector('.sidebar .logout-button, .sidebar #logoutButton');
    if(top) top.style.display='inline-flex'; if(sidebar) sidebar.style.display='none';
    ['newShiftButton','mobileNewShift','addShiftTop'].forEach(id=>{const b=$(id);if(b){b.onclick=e=>{e.preventDefault();window.openShiftFlow?.()}}});
    const rec=$('addRecurrence');if(rec)rec.onclick=e=>{e.preventDefault();openRecurring();};
  }

  async function openRecurring(){
    try{
      const c=db(),u=await getUser();
      const {data:locs,error}=await c.from('locations').select('id,name,value12').eq('user_id',u.id).eq('active',true).order('name');
      if(error)throw error;if(!locs?.length)throw new Error('Cadastre e ative um local antes de criar um plantão.');
      const root=$('modalRoot');
      root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><p class="eyebrow">RECORRÊNCIA</p><h3>Plantão recorrente</h3><p class="muted">O plantão será repetido no mesmo dia da semana e horário.</p></div><button class="close-btn" type="button" id="rvClose">×</button></div><form id="rvForm"><div class="modal-grid">
        <label>Primeira data<input name="date" type="date" value="${today()}" required></label>
        <label>Horário de início<input name="start_time" type="time" required></label>
        <label>Local<select name="location_id" required><option value="">Selecione</option>${locs.map(l=>`<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('')}</select></label>
        <label>Duração<select name="duration" required><option value="6">6 horas</option><option value="12" selected>12 horas</option><option value="18">18 horas</option><option value="24">24 horas</option></select></label>
        <label>Horário de término<input name="end_time" type="time" readonly></label>
        <label>Valor do plantão<input name="value" type="number" min="0" step="0.01" required></label>
        <fieldset class="wide"><legend>Como repetir?</legend>
          <label>Frequência<select name="pattern"><option value="weekly">Toda semana — mesmo dia</option><option value="biweekly">A cada 2 semanas — mesmo dia</option><option value="monthly">Todo mês — mesma data</option></select></label>
          <label>Encerrar por<select name="limitType"><option value="count">Quantidade de plantões</option><option value="date">Data final</option></select></label>
          <label id="countWrap">Quantidade<input name="occurrences" type="number" min="2" max="500" value="4"></label>
          <label id="dateWrap" style="display:none">Data final<input name="end_date" type="date"></label>
          <p class="muted wide" id="rvExplanation">Ex.: toda semana significa repetir a cada 7 dias, sempre no mesmo dia da semana.</p>
        </fieldset>
      </div><div class="modal-actions"><button class="secondary" type="button" id="rvCancel">Cancelar</button><button class="primary" type="submit" id="rvSave">Criar recorrência</button></div></form></div></div>`;
      const f=$('rvForm'),start=f.elements.start_time,dur=f.elements.duration,end=f.elements.end_time,pattern=f.elements.pattern,limit=f.elements.limitType,count=f.elements.occurrences,countWrap=$('countWrap'),dateWrap=$('dateWrap'),date=f.elements.date,endDate=f.elements.end_date;
      const syncEnd=()=>end.value=durationEnd(start.value,dur.value);start.addEventListener('input',syncEnd);dur.addEventListener('change',syncEnd);syncEnd();
      const syncLimit=()=>{countWrap.style.display=limit.value==='count'?'block':'none';dateWrap.style.display=limit.value==='date'?'block':'none'};limit.addEventListener('change',syncLimit);syncLimit();
      pattern.addEventListener('change',()=>{$('rvExplanation').textContent=pattern.value==='weekly'?'Toda semana = a cada 7 dias, no mesmo dia e horário.':pattern.value==='biweekly'?'A cada 2 semanas = a cada 14 dias, no mesmo dia e horário.':'Todo mês = mesma data do mês, respeitando a duração do calendário.'});
      $('rvClose').onclick=$('rvCancel').onclick=()=>window.closeModal?.();
      f.onsubmit=async e=>{
        e.preventDefault();const b=$('rvSave');b.disabled=true;b.textContent='Criando...';
        try{
          const fd=new FormData(f),first=String(fd.get('date')),startTime=String(fd.get('start_time')),loc=locs.find(x=>x.id===fd.get('location_id')),duration=Number(fd.get('duration')),value=Number(fd.get('value')),pat=String(fd.get('pattern')),limitType=String(fd.get('limitType'));
          if(!loc)throw new Error('Selecione um local.');if(![6,12,18,24].includes(duration))throw new Error('A duração deve ser 6, 12, 18 ou 24 horas.');if(!startTime)throw new Error('Informe o horário de início.');if(!Number.isFinite(value)||value<0)throw new Error('Informe um valor válido.');
          let occurrences=limitType==='count'?Number(fd.get('occurrences')):null,endDt=limitType==='date'?String(fd.get('end_date')||''):null;if(limitType==='count'&&(occurrences<2||occurrences>500))throw new Error('A quantidade deve estar entre 2 e 500.');if(limitType==='date'&&(!endDt||endDt<=first))throw new Error('A data final deve ser posterior à primeira data.');
          const step=pat==='weekly'?7:pat==='biweekly'?14:null;const dates=[first];if(step){if(occurrences){for(let i=1;i<occurrences;i++)dates.push(addDays(first,step*i));}else{let d=first,guard=0;while(guard++<500&&addDays(d,step)<=endDt){d=addDays(d,step);dates.push(d)}}}else if(occurrences){for(let i=1;i<occurrences;i++){const d=new Date(`${first}T12:00:00`);d.setMonth(d.getMonth()+i);dates.push(d.toISOString().slice(0,10));}}else{let d=new Date(`${first}T12:00:00`),guard=0;while(guard++<500){d.setMonth(d.getMonth()+1);const x=d.toISOString().slice(0,10);if(x>endDt)break;dates.push(x)}}
          const recurrenceId=crypto.randomUUID(),groupId=crypto.randomUUID();
          const rr=await c.from('recurrences').insert({id:recurrenceId,user_id:u.id,frequency:pat,interval_value:1,start_date:first,end_date:endDt||null,occurrences:dates.length,active:true});if(rr.error)throw rr.error;
          for(const d of dates){const sid=crypto.randomUUID();const shift={id:sid,user_id:u.id,date:d,start_time:startTime,location_id:loc.id,location_name:loc.name,duration,value,value12:value,notes:null,status:'scheduled',recurrence_id:recurrenceId,recurring_group_id:groupId};const sr=await c.from('shifts').insert(shift);if(sr.error)throw sr.error;const expected=new Date(`${d}T12:00:00`);expected.setDate(expected.getDate()+30);const er=await c.from('receivables').insert({user_id:u.id,shift_id:sid,location_id:loc.id,description:`Plantão · ${loc.name}`,amount:value,expected_date:expected.toISOString().slice(0,10),status:'pending'});if(er.error)throw er.error;}
          window.closeModal?.();await window.loadAll?.();window.renderCalendar?.();alert(`${dates.length} plantões criados com sucesso.`);
        }catch(err){alert(window.friendly?.(err)||err.message||'Não foi possível criar a recorrência.');}finally{b.disabled=false;b.textContent='Criar recorrência'}
      };
    }catch(err){alert(err.message||'Não foi possível abrir a recorrência.');}
  }

  async function deleteRecurringAware(id){
    const c=db(),u=await getUser();const {data:s,error}=await c.from('shifts').select('id,date,location_name,recurrence_id,recurring_group_id').eq('id',id).eq('user_id',u.id).maybeSingle();if(error)throw error;if(!s)throw new Error('Plantão não encontrado.');
    let ids=[id];
    if(s.recurrence_id||s.recurring_group_id){const q=c.from('shifts').select('id').eq('user_id',u.id);const r=s.recurring_group_id?await q.eq('recurring_group_id',s.recurring_group_id):await q.eq('recurrence_id',s.recurrence_id);if(r.error)throw r.error;const all=r.data||[];if(all.length>1){const onlyThis=confirm('Este plantão faz parte de uma recorrência.\n\nOK = excluir SOMENTE este plantão.\nCancelar = escolher se deseja excluir toda a recorrência.');if(onlyThis)ids=[id];else if(confirm(`Excluir os ${all.length} plantões desta recorrência?`))ids=all.map(x=>x.id);else return;}}
    if(!confirm(`Confirmar exclusão de ${ids.length===1?'este plantão':'estes '+ids.length+' plantões'}?`))return;
    const re=await c.from('receivables').delete().in('shift_id',ids).eq('user_id',u.id).neq('status','received');if(re.error)throw re.error;const sr=await c.from('shifts').delete().in('id',ids).eq('user_id',u.id);if(sr.error)throw sr.error;await window.loadAll?.();window.renderCalendar?.();alert('Plantão excluído.');
  }
  window.openRecurringShift=openRecurring;window.deleteShift= id=>deleteRecurringAware(id);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireTop,{once:true});else wireTop();
})();