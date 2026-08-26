(() => {
  const db = () => window.FINANCPLANTOES_DB || null;
  const getUser = async () => { const c=db(); if(!c) throw new Error('Supabase não conectado.'); const r=await c.auth.getSession(); if(r.error) throw r.error; if(!r.data.session?.user) throw new Error('Sessão não encontrada.'); return r.data.session.user; };
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const roleLabel={admin:'Administrador',finance:'Financeiro',member:'Membro',viewer:'Visualizador'};
  async function openMembers(spaceId){
    const c=db(),u=await getUser();
    const space=await c.from('spaces').select('id,name,owner_id').eq('id',spaceId).maybeSingle();
    if(space.error) throw space.error; if(!space.data) throw new Error('Espaço não encontrado.');
    const members=await c.from('space_members').select('id,user_id,role,status,joined_at').eq('space_id',spaceId).eq('status','active').order('joined_at');
    if(members.error) throw members.error;
    const invitations=await c.from('space_invitations').select('id,invited_email,invited_user_id,proposed_role,status,expires_at,created_at').eq('space_id',spaceId).order('created_at',{ascending:false});
    if(invitations.error) throw invitations.error;
    const root=document.getElementById('modalRoot');
    const owner=space.data.owner_id===u.id;
    const pending=(invitations.data||[]).filter(i=>i.status==='pending');
    root.innerHTML=`<div class="modal-backdrop"><div class="modal workspace-window"><div class="modal-head"><div><p class="eyebrow">ESPAÇO</p><h3>Membros · ${esc(space.data.name)}</h3><p class="muted">Convide usuários cadastrados pelo e-mail da conta. Após aceitar, eles passam a participar do espaço e aparecem nas despesas compartilhadas.</p></div><button class="close-btn" type="button" onclick="closeModal()">×</button></div>
      <div class="detail-card"><strong>Membros ativos (${members.data?.length||0})</strong><div id="spaceMembersList" class="mini-list">${(members.data||[]).map(m=>`<div><span>${esc(m.user_id===u.id?'Você':m.user_id)}</span><small>${esc(roleLabel[m.role]||m.role)}</small></div>`).join('')||'<p class="muted">Nenhum membro além do proprietário.</p>'}</div></div>
      ${owner?`<form id="inviteMemberForm" class="detail-card"><strong>Convidar participante</strong><div class="modal-grid"><label>E-mail do usuário cadastrado<input name="email" type="email" autocomplete="email" placeholder="usuario@email.com" required></label><label>Permissão<select name="role"><option value="member">Membro</option><option value="finance">Financeiro</option><option value="admin">Administrador</option><option value="viewer">Visualizador</option></select></label></div><p class="muted">O convite será enviado ao usuário que possui este e-mail. O acesso só será liberado depois que ele aceitar.</p><button class="primary" type="submit">Enviar convite</button></form>`:''}
      <div class="detail-card"><strong>Convites pendentes (${pending.length})</strong><div class="mini-list">${pending.map(i=>`<div><span>${esc(i.invited_email||'Usuário convidado')}</span><small>${esc(roleLabel[i.proposed_role]||i.proposed_role||'Membro')} · aguardando aceite</small></div>`).join('')||'<p class="muted">Nenhum convite pendente.</p>'}</div></div>
      <div class="modal-actions"><button class="primary" type="button" onclick="closeModal()">Fechar</button></div></div></div>`;
    document.getElementById('inviteMemberForm')?.addEventListener('submit',async e=>{
      e.preventDefault(); const b=e.submitter;b.disabled=true;
      try{const f=new FormData(e.currentTarget),email=String(f.get('email')||'').trim().toLowerCase(),role=String(f.get('role')||'member');
        if(!email) throw new Error('Informe o e-mail do usuário.');
        if(email===String(u.email||'').toLowerCase()) throw new Error('Você já pertence a este espaço.');
        const existing=await c.from('space_invitations').select('id,status').eq('space_id',spaceId).eq('invited_email',email).eq('status','pending').maybeSingle();
        if(existing.error) throw existing.error; if(existing.data) throw new Error('Já existe um convite pendente para este e-mail.');
        const inv=await c.from('space_invitations').insert({id:crypto.randomUUID(),space_id:spaceId,invited_by:u.id,invited_email:email,proposed_role:role,status:'pending',expires_at:new Date(Date.now()+7*86400000).toISOString()});
        if(inv.error) throw inv.error;
        alert('Convite criado. O usuário deverá entrar no aplicativo com esse e-mail e aceitar o convite.');
        await openMembers(spaceId);
      }catch(x){alert(x.message||'Não foi possível enviar o convite.');b.disabled=false;}
    });
  }
  async function showInvitations(){
    const c=db(),u=await getUser(),email=String(u.email||'').toLowerCase();
    const r=await c.from('space_invitations').select('id,space_id,invited_email,proposed_role,status,expires_at,spaces(id,name,space_type)').eq('status','pending').or(`invited_user_id.eq.${u.id},invited_email.eq.${email}`).order('created_at',{ascending:false});
    if(r.error) throw r.error;
    const root=document.getElementById('modalRoot');
    root.innerHTML=`<div class="modal-backdrop"><div class="modal workspace-window"><div class="modal-head"><div><p class="eyebrow">CONVITES</p><h3>Convites para espaços</h3></div><button class="close-btn" type="button" onclick="closeModal()">×</button></div><div class="mini-list">${(r.data||[]).map(i=>`<div class="detail-card"><strong>${esc(i.spaces?.name||'Espaço')}</strong><span>${esc(roleLabel[i.proposed_role]||'Membro')}</span><button class="primary" type="button" onclick="acceptSpaceInvite('${i.id}','${i.space_id}')">Aceitar convite</button><button class="link-button danger-text" type="button" onclick="declineSpaceInvite('${i.id}')">Recusar</button></div>`).join('')||'<p class="muted">Nenhum convite pendente para esta conta.</p>'}</div><div class="modal-actions"><button class="primary" onclick="closeModal()">Fechar</button></div></div></div>`;
  }
  window.acceptSpaceInvite=async(invId,spaceId)=>{try{const c=db(),u=await getUser();const inv=await c.from('space_invitations').select('id,space_id,invited_email,proposed_role,status,expires_at').eq('id',invId).maybeSingle();if(inv.error)throw inv.error;if(!inv.data||inv.data.status!=='pending')throw new Error('Este convite não está mais disponível.');if(inv.data.expires_at&&new Date(inv.data.expires_at)<new Date())throw new Error('Este convite expirou.');const m=await c.from('space_members').upsert({space_id:spaceId,user_id:u.id,role:inv.data.proposed_role||'member',status:'active',joined_at:new Date().toISOString()},{onConflict:'space_id,user_id'});if(m.error)throw m.error;const a=await c.from('space_invitations').update({status:'accepted',responded_at:new Date().toISOString(),invited_user_id:u.id}).eq('id',invId);if(a.error)throw a.error;alert('Convite aceito. Você agora participa deste espaço e poderá dividir despesas com os demais integrantes.');closeModal();await window.loadAll?.();}catch(x){alert(x.message||'Não foi possível aceitar o convite.');}};
  window.declineSpaceInvite=async invId=>{try{const c=db(),u=await getUser();const r=await c.from('space_invitations').update({status:'declined',responded_at:new Date().toISOString(),invited_user_id:u.id}).eq('id',invId).eq('status','pending');if(r.error)throw r.error;await showInvitations();}catch(x){alert(x.message||'Não foi possível recusar o convite.');}};
  window.openSpaceMembers=openMembers; window.openSpaceInvitations=showInvitations;
  document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='.space-member-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.invite-card{margin-top:12px}';document.head.appendChild(style);});
})();