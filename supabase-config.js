// Supabase client configuration for the GitHub Pages app.
// The publishable key is safe to expose in a browser; database access is protected by RLS.
window.FINANCPLANTOES_SUPABASE={url:'https://onqbnogccjfgihmmxrid.supabase.co',publishableKey:'sb_publishable_gvs6MsolBL25CTzxkjssew_xhNYup8S'};

if(window.supabase?.createClient){
  window.FINANCPLANTOES_DB=window.supabase.createClient(
    window.FINANCPLANTOES_SUPABASE.url,
    window.FINANCPLANTOES_SUPABASE.publishableKey,
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
  );
}
