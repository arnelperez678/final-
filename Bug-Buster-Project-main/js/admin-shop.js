/* Admin shop inventory controls. */
(() => {
  'use strict';
  const PG=window.PG; if(!PG) return;
  const $=(id)=>document.getElementById(id); let items=[];
  const money=(n)=>`${Number(n||0)} seeds`;
  function render(){
    const term=$('search-items')?.value.trim().toLowerCase()||'';
    const kind=$('filter-category')?.value||'all'; const status=$('filter-status')?.value||'all';
    const shown=items.filter((i)=>(!term||i.name.toLowerCase().includes(term))&&(kind==='all'||i.kind===kind)&&(status==='all'||(status==='active'&&i.is_active)||(status==='inactive'&&!i.is_active)));
    const body=$('shop-items-body'); body.replaceChildren();
    shown.forEach((item)=>{
      const row=document.createElement('tr');
      const icon=PG.el('td','col-icon'); icon.appendChild(PG.spriteEl(item.sprite||'seed'));
      row.append(icon,PG.el('td','col-name',item.name));
      const category=PG.el('td'); category.appendChild(PG.el('span','tag tag-'+item.kind,item.kind)); row.appendChild(category);
      row.append(PG.el('td','col-price',money(item.cost_seeds)),PG.el('td','col-desc','—'));
      const status=PG.el('td'); status.appendChild(PG.el('span','status-badge '+(item.is_active?'status-active':'status-inactive'),item.is_active?'Active':'Hidden')); row.appendChild(status);
      const cell=PG.el('td','col-actions'); const actions=PG.el('div','action-buttons');
      const edit=PG.el('button','btn-icon btn-edit','✏️'); edit.type='button'; edit.title='Edit item'; edit.addEventListener('click',()=>editItem(item));
      const toggle=PG.el('button','btn-icon btn-hide',item.is_active?'👁️':'🙈'); toggle.type='button'; toggle.title=item.is_active?'Hide item':'Show item'; toggle.addEventListener('click',()=>toggleItem(item));
      actions.append(edit,toggle); cell.appendChild(actions); row.appendChild(cell); body.appendChild(row);
    });
    if(!shown.length){const row=PG.el('tr');const cell=PG.el('td',null,'No shop items match your filters.');cell.colSpan=7;row.appendChild(cell);body.appendChild(row);}
    $('total-items').textContent=String(items.length); $('seed-count').textContent=String(items.filter(i=>i.kind==='seed').length);
    $('tool-count').textContent=String(items.filter(i=>i.kind==='tool').length); $('decor-count').textContent=String(items.filter(i=>i.kind==='decor').length);
    $('active-count').textContent=String(items.filter(i=>i.is_active).length);
  }
  async function load(){try{const d=await PG.api('/api/admin/shop.php');items=d.items||[];render();}catch(e){PG.toast(e.message,true);}}
  async function editItem(item){
    const name=prompt('Item name:',item?.name||''); if(name===null)return;
    const kind=prompt('Type: seed, tool, or decor',item?.kind||'seed'); if(kind===null)return;
    const cost=prompt('Cost in seeds:',String(item?.cost_seeds||0)); if(cost===null)return;
    try{await PG.api('/api/admin/shop.php',{body:{action:'save',id:item?.id,name,kind,cost_seeds:Number(cost),sprite:item?.sprite||'seed',is_active:item?.is_active??true}});PG.toast(item?'Item updated':'Item added');await load();}
    catch(e){PG.toast(e.message,true);}
  }
  async function toggleItem(item){try{await PG.api('/api/admin/shop.php',{body:{action:'toggle',id:item.id,is_active:!item.is_active}});await load();}catch(e){PG.toast(e.message,true);}}
  $('btn-add-item')?.addEventListener('click',()=>editItem(null));
  ['search-items','filter-category','filter-status'].forEach((id)=>$(id)?.addEventListener('input',render));
  $('current-date').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  PG.ready.then((me)=>{if(me?.role==='admin')load();});
})();
