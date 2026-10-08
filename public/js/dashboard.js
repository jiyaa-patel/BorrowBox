function label(k){return k.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase()).replace('Pct','%')}
function statCard(k,v){const d=document.createElement('div');d.className='card bb-metric';const b=document.createElement('div');b.className='bb-metric-value';b.textContent=v??0;const s=document.createElement('div');s.className='bb-metric-label';s.textContent=label(k);d.append(b,s);return d}
function borrowRow(a){const d=document.createElement('div');d.className='d-flex justify-content-between align-items-center gap-3 py-3 border-bottom';const left=document.createElement('div');const b=document.createElement('strong');b.textContent=a.item;const small=document.createElement('div');small.className='bb-muted small';small.textContent=a.due_in_days<0?`${Math.abs(a.due_in_days)} day(s) overdue`:a.due_in_days===0?'Due today':`${a.due_in_days} day(s) remaining`;left.append(b,small);const tag=document.createElement('span');tag.className='bb-badge '+(a.level==='red'?'cancelled':a.level==='yellow'?'borrowed':'available');tag.textContent=a.level==='red'?'Overdue':a.level==='yellow'?'Due soon':'On track';d.append(left,tag);return d}
function accountPanel(u){
  const box=document.createElement('div');box.className='bb-shell bb-panel';
  const head=document.createElement('div');head.className='d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3';
  const who=document.createElement('div');who.className='d-flex align-items-center gap-3';
  const av=document.createElement('span');av.className='bb-avatar bb-avatar-lg';av.textContent=(u.name||'?').trim().charAt(0).toUpperCase();
  const names=document.createElement('div');
  const eye=document.createElement('div');eye.className='bb-eyebrow';eye.textContent='Signed in as';
  const nm=document.createElement('div');nm.className='h5 fw-bold mb-0';nm.textContent=u.name;
  const em=document.createElement('div');em.className='bb-muted small';em.textContent=u.email;
  names.append(eye,nm,em);who.append(av,names);
  const btns=document.createElement('div');btns.className='d-flex gap-2';
  const prof=document.createElement('a');prof.href='profile.html';prof.className='btn btn-outline-dark';prof.textContent='Trust profile';
  const out=document.createElement('button');out.type='button';out.className='btn btn-outline-danger';out.textContent='Logout';out.onclick=()=>logout();
  btns.append(prof,out);head.append(who,btns);
  const grid=document.createElement('div');grid.className='bb-account';
  const since=u.created_at?String(u.created_at).slice(0,10):'';
  [['Student ID',u.student_id],['Phone',u.phone],['Department',u.department+' · Year '+u.year],['Campus area',u.campus_area],['Account type',u.role==='admin'?'Administrator':'Member'],['Member since',since]].forEach(([a,b])=>{
    const d=document.createElement('div');const s=document.createElement('small');s.textContent=a;const v=document.createElement('strong');v.textContent=b||'-';d.append(s,v);grid.append(d)});
  box.append(head,grid);return box}
async function init(){const u=await requireLogin();if(!u)return;account.append(accountPanel(u));try{const x=await api('/api/me/dashboard');hello.textContent='Hello, '+x.greeting;stats.textContent='';Object.entries(x.stats).forEach(([k,v])=>stats.append(statCard(k,v)));active.textContent='';x.activeBorrows.forEach(a=>active.append(borrowRow(a)));if(!x.activeBorrows.length)active.innerHTML='<div class="bb-empty"><strong>No active borrows</strong>Browse items whenever you need something.</div>'}catch(e){active.textContent='';const a=document.createElement('div');a.className='alert alert-danger mb-0';a.textContent=e.message;active.append(a)}}
init();
