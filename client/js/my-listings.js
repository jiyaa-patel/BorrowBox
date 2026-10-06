requireLogin();
const show=e=>{err.textContent=e;err.classList.remove('d-none')};
async function action(id,method,path,msg){try{await api(`/api/items/${id}${path}`,{method});if(msg)bbToast(msg);await load()}catch(e){show(e.message)}}
async function load(){
  try{
    const x=await api('/api/items/mine');list.textContent='';
    if(!x.length){list.innerHTML='<div class="bb-empty" style="grid-column:1/-1"><strong>No listings yet</strong>List something useful and it will appear here.</div>';return}
    x.forEach(i=>{
      const d=document.createElement('article');d.className='card bb-card-hover bb-item-card';
      const top=document.createElement('div');top.className='bb-item-top';const cat=document.createElement('span');cat.className='bb-kicker';cat.textContent=`${i.category.icon} ${i.category.name}`;const status=document.createElement('span');status.className='bb-badge '+i.availability.status;status.textContent=i.availability.status.replace('_',' ');top.append(cat,status);
      const h=document.createElement('h2');h.className='bb-item-title';h.textContent=i.name;const p=document.createElement('div');p.className='bb-item-meta';p.textContent=`${i.location} · ${i.pending_requests||0} pending request${Number(i.pending_requests)===1?'':'s'}`;
      const buttons=document.createElement('div');buttons.className='bb-item-actions';const edit=document.createElement('a');edit.href='list-item.html?id='+i.id;edit.className='btn btn-sm btn-outline-primary';edit.textContent='Edit';buttons.append(edit);
      if(i.availability.status==='paused'){const b=document.createElement('button');b.className='btn btn-sm btn-outline-success';b.textContent='Resume';b.onclick=()=>action(i.id,'POST','/resume','Listing resumed');buttons.append(b)}else{const b=document.createElement('button');b.className='btn btn-sm btn-outline-secondary';b.textContent='Pause';b.onclick=()=>action(i.id,'POST','/pause','Listing paused');buttons.append(b)}
      const del=document.createElement('button');del.className='btn btn-sm btn-outline-danger ms-auto';del.textContent='Delete';del.onclick=()=>{if(confirm('Delete this item? This cannot be undone.'))action(i.id,'DELETE','','Listing deleted')};buttons.append(del);d.append(top,h,p,buttons);list.append(d)
    })
  }catch(e){show(e.message)}
}
load();
