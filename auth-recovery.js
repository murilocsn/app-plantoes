// Auth recovery layer: keeps login working even if the main dashboard modules initialize out of order.
(function(){
  const SUPABASE_URL='https://onqbnogccjfgihmmxrid.supabase.co';
  const SUPABASE_KEY='sb_publishable_gvs6MsolBL25CTzxkjssew_xhNYup8S';
  let client=null;
  function getClient(){
    if(client) return client;
    if(window.FINANCPLANTOES_DB) return client=window.FINANCPLANTOES_DB;
    if(window.supabase?.createClient) return client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return null;
  }
  function message(text,type){const el=document.getElementById('authMessage');if(el){el.textContent=text;el.className='message '+(type||'');}}
  function showApp(user){
    const auth=document.getElementById('authScreen'), app=document.getElementById('appShell');
    if(auth) auth.hidden=true; if(app) app.hidden=false;
    const name=user?.user_metadata?.full_name||user?.user_metadata?.name||user?.email?.split('@')[0]||'Usuário';
    const n=document.getElementById('profileName'),e=document.getElementById('profileEmail'),a=document.getElementById('profileAvatar'),w=document.getElementById('welcomeTitle');
    if(n)n.textContent=name;if(e)e.textContent=user?.email||'';if(a)a.textContent=name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();if(w)w.textContent=`Olá, ${name.split(/\s+/)[0]} 👋`;
    window.FINANCPLANTOES_USER=user;
  }
  async function recover(){
    const sb=getClient();
    if(!sb){message('Não foi possível carregar a conexão com o Supabase. Recarregue a página.','error');return;}
    const {data,error}=await sb.auth.getSession();
    if(error){message(error.message,'error');return;}
    if(data?.session?.user) showApp(data.session.user);
  }
  function bind(){
    const form=document.getElementById('authForm');
    if(!form || form.dataset.authRecovery==='1') return;
    form.dataset.authRecovery='1';
    form.addEventListener('submit',async function(ev){
      ev.preventDefault();ev.stopImmediatePropagation();
      const email=document.getElementById('authEmail')?.value?.trim();
      const password=document.getElementById('authPassword')?.value||'';
      const submit=document.getElementById('authSubmit');
      if(!email||!password){message('Informe e-mail e senha.','error');return;}
      const sb=getClient();
      if(!sb){message('Supabase não carregado. Recarregue a página.','error');return;}
      if(submit)submit.disabled=true;message('Entrando...','');
      try{
        const {data,error}=await sb.auth.signInWithPassword({email,password});
        if(error) throw error;
        showApp(data.user);
        // Let the existing app initialize its own state from the persisted Supabase session.
        setTimeout(()=>location.reload(),120);
      }catch(err){message(err?.message==='Invalid login credentials'?'E-mail ou senha inválidos.':(err?.message||'Não foi possível entrar.'),'error');if(submit)submit.disabled=false;}
    },true);
    recover();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();