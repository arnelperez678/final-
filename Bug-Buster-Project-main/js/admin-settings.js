/* Admin preferences are local to this browser; server secrets stay server-side. */
(() => {
  'use strict';
  const PG=window.PG; if(!PG) return;
  const key='python-garden-admin-preferences';
  const fields=[...document.querySelectorAll('[data-save="true"]')].filter((el)=>el.type!=='password'&&!['db-host','db-port','db-name','api-key'].includes(el.id));
  function loadPrefs(){try{const saved=JSON.parse(localStorage.getItem(key)||'{}');fields.forEach((el)=>{if(Object.hasOwn(saved,el.id)){if(el.type==='checkbox')el.checked=!!saved[el.id];else el.value=saved[el.id];}});}catch(_){}}
  function savePrefs(){const saved={};fields.forEach((el)=>{saved[el.id]=el.type==='checkbox'?el.checked:el.value;});localStorage.setItem(key,JSON.stringify(saved));PG.toast('Preferences saved in this browser.');}
  document.querySelectorAll('.settings-tabs [data-tab]').forEach((tab)=>tab.addEventListener('click',()=>{
    document.querySelectorAll('.settings-tabs [data-tab]').forEach((b)=>b.classList.toggle('active',b===tab));
    document.querySelectorAll('.tab-content').forEach((section)=>section.classList.toggle('active',section.id==='tab-'+tab.dataset.tab));
  }));
  document.getElementById('btn-save-all')?.addEventListener('click',savePrefs);
  document.getElementById('btn-save-conn')?.addEventListener('click',()=>PG.toast('Server and Supabase credentials must be configured on the PHP server, not in this browser.',true));
  document.getElementById('btn-test-conn')?.addEventListener('click',async()=>{
    try{await PG.api('/api/me.php');const status=document.getElementById('info-server-status');if(status)status.textContent='Connected';PG.toast('App server connection is working.');}
    catch(e){const status=document.getElementById('info-server-status');if(status)status.textContent='Unavailable';PG.toast(e.message,true);}
  });
  document.getElementById('btn-clear-cache')?.addEventListener('click',()=>{localStorage.removeItem(key);loadPrefs();PG.toast('Saved browser preferences cleared.');});
  document.getElementById('toggle-api-key')?.addEventListener('click',()=>{const input=document.getElementById('api-key');if(input)input.type=input.type==='password'?'text':'password';});
  loadPrefs();
})();
