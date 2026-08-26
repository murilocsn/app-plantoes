(() => {
  const $=id=>document.getElementById(id); const db=()=>window.FINANCPLANTOES_DB||window.db;
  const getUser=async()=>{const c=db();if(!c)throw new Error('Supabase não conectado.');const {data,error}=await c.auth.getSession();if(error)throw error;if(!data.session?.user)throw new Error('Sessão expirada.');return data.session.user};
  const today=()=>new Date().toISOString().slice(0,10);
  async function logout(){try{const c=db();if(!c)throw new Error('Supabase não conectado.');const {error}=await c.auth.signOut();if(error)throw error;location.href='index.html'}catch(e){alert(e.message||'Não foi possível sair.')}}
  function cleanLogout(){
    const keep=$('topLogoutButton');
    document.querySelectorAll('.sidebar .logout-button,.sidebar [data-action="logout"]').forEach(el=>el.remove());
    document.querySelectorAll('.topbar button').forEach(el=>{if(el!==keep && ((el.textContent||'').trim().toLowerCase()==='sair' || el.classList.contains('logout-top-button')))el.remove()});
    document.querySelectorAll('[data-action="logout"]').forEach(el=>{if(el!==keep){el.onclick=logout}});
    if(keep){keep.onclick=logout;keep.type='button';keep.setAttribute('aria-label','Sair da conta')}
  }
  function bindTop(){
    cleanLogout();
    ['newShiftButton','mobileNewShift','addShiftTop'].forEach(id=>{const b=$(id);if(b){b.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();if(typeof window.openShiftFlow==='function')window.openShiftFlow();else if(typeof window.openForm==='function')window.openForm('shift')}}});
    const rec=$('addRecurrence');if(rec)rec.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();if(typeof window.openRecurringShift==='function')window.openRecurringShift();};
  }
  function fixDashboardCopy(){
    const el=$('dashboardStatus');if(!el)return;
    const original=el.textContent||'';
    const match=original.match(/^(\d+) plantão(?:ões)? neste mês · (\d+) locais?$/i);
    if(!match)return;
    const shifts=Number(match[1]),locations=Number(match[2]);
    el.textContent=`${shifts} ${shifts===1?'plantão':'plantões'} neste mês · ${locations} ${locations===1?'local':'locais'}`;
  }
  function addProjectCredit(){
    const panel=document.querySelector('.auth-panel');if(!panel||panel.querySelector('.project-credit'))return;
    const p=document.createElement('p');p.className='project-credit muted';p.innerHTML='<strong>FinancPlantões</strong><br>Projeto idealizado e desenvolvido por Murilo Neder.<br>Organização de plantões, recebimentos e despesas compartilhadas.';
    p.style.cssText='margin-top:18px;font-size:12px;line-height:1.5;text-align:center';panel.appendChild(p);
  }
  const observeDashboard=()=>{fixDashboardCopy();addProjectCredit()};
  const boot=()=>{
    bindTop();
    observeDashboard();
    new MutationObserver(()=>{cleanLogout();fixDashboardCopy();addProjectCredit()}).observe(document.body,{childList:true,subtree:true,characterData:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();