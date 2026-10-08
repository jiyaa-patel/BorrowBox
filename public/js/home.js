function stat(label,value){const d=document.createElement('div');d.className='bb-stat';const b=document.createElement('strong');b.textContent=value;const s=document.createElement('span');s.textContent=label;d.append(b,s);return d}
function categoryCard(c){const a=document.createElement('a');a.className='bb-card bb-category';a.href='items.html?category='+c.id;const icon=document.createElement('span');icon.className='bb-category-icon';icon.textContent=c.icon;const text=document.createElement('div');const name=document.createElement('strong');name.textContent=c.name;const count=document.createElement('small');count.textContent=`${c.item_count} active item${Number(c.item_count)===1?'':'s'}`;text.append(name,count);a.append(icon,text);return a}
function itemCard(i){const d=document.createElement('article');d.className='card bb-card-hover bb-item-card';const top=document.createElement('div');top.className='bb-item-top';const tag=document.createElement('span');tag.className='bb-kicker';tag.textContent=`${i.category.icon} ${i.category.name}`;const status=document.createElement('span');status.className='bb-badge '+i.availability.status;status.textContent=i.availability.status.replace('_',' ');top.append(tag,status);const h=document.createElement('h3');h.className='bb-item-title';h.textContent=i.name;const p=document.createElement('div');p.className='bb-item-meta';p.textContent=`${i.location} · ${i.rating.count?i.rating.avg+' ★':'No ratings yet'}`;const a=document.createElement('a');a.className='btn btn-outline-dark mt-auto';a.href='item.html?id='+i.id;a.textContent='View item';d.append(top,h,p,a);return d}
async function loadHome(){try{const s=await fetch('/api/stats/public').then(r=>{if(!r.ok)throw Error();return r.json()});stats.textContent='';stats.append(stat('Community members',s.users),stat('Active items',s.items),stat('Completed borrows',s.completedBorrows))}catch{}try{const c=await fetch('/api/categories').then(r=>{if(!r.ok)throw Error();return r.json()});cats.textContent='';c.forEach(x=>cats.append(categoryCard(x)))}catch{cats.innerHTML='<div class="bb-empty">Categories will appear here when the server is available.</div>'}try{const r=await fetch('/api/items?limit=6').then(x=>{if(!x.ok)throw Error();return x.json()});recent.textContent='';r.items.forEach(x=>recent.append(itemCard(x)));if(!r.items.length)recent.innerHTML='<div class="bb-empty" style="grid-column:1/-1"><strong>No items yet</strong>Be the first person to list something useful.</div>'}catch{recent.innerHTML='<div class="bb-empty" style="grid-column:1/-1">Recently listed items are temporarily unavailable.</div>'}try{const data=await fetch('data/rules.json').then(r=>r.json());rules.textContent='';data.forEach(x=>{const li=document.createElement('li');li.textContent=x;rules.append(li)})}catch{}try{const data=await fetch('data/faq.json').then(r=>r.json());faq.textContent='';data.forEach((x,n)=>{const box=document.createElement('div');box.className='accordion-item';const id='faq'+n;const h=document.createElement('h2');h.className='accordion-header';const b=document.createElement('button');b.className='accordion-button collapsed';b.type='button';b.dataset.bsToggle='collapse';b.dataset.bsTarget='#'+id;b.textContent=x.q;const body=document.createElement('div');body.id=id;body.className='accordion-collapse collapse';const inner=document.createElement('div');inner.className='accordion-body';inner.textContent=x.a;h.append(b);body.append(inner);box.append(h,body);faq.append(box)})}catch{}const u=await getUser();if(!u)startGuestRedirect();if(u){showWhoAmI(u);heroSecondary.href='list-item.html';heroSecondary.textContent='List an item';bottomCta.href='dashboard.html';bottomCta.textContent='Open dashboard'}}loadHome();

function showWhoAmI(u){
  const box=document.querySelector('#whoami');
  if(!box)return;
  const initial=(u.name||'?').trim().charAt(0).toUpperCase();
  const pill=document.createElement('div');pill.className='bb-whoami';
  const av=document.createElement('span');av.className='bb-avatar';av.textContent=initial;
  const text=document.createElement('span');
  const who=document.createElement('strong');who.textContent=u.name;
  text.append('Signed in as ',who,' · '+u.email+' · ');
  const out=document.createElement('a');out.href='#';out.textContent='Logout';out.className='fw-bold';
  out.onclick=e=>{e.preventDefault();logout()};
  text.append(out);
  pill.append(av,text);box.append(pill);
}

// Guests: once the hero is on screen, send them to the login page (it links to Register).
// They can cancel with "Stay on this page", or open /?stay=1 to skip the redirect entirely.
const GUEST_REDIRECT_SECONDS=4;
function startGuestRedirect(){
  if(new URLSearchParams(location.search).has('stay'))return;
  let left=GUEST_REDIRECT_SECONDS;
  const bar=document.createElement('div');bar.className='bb-redirect';bar.setAttribute('role','status');
  const msg=document.createElement('span');
  const now=document.createElement('a');now.href='login.html';now.className='btn btn-sm btn-primary';now.textContent='Log in now';
  const reg=document.createElement('a');reg.href='register.html';reg.className='btn btn-sm btn-outline-light';reg.textContent='Create account';
  const stay=document.createElement('button');stay.type='button';stay.className='btn btn-sm btn-link text-white';stay.textContent='Stay on this page';
  const text=()=>{msg.textContent=`Taking you to login in ${left}s`};
  text();
  const timer=setInterval(()=>{left-=1;if(left<=0){clearInterval(timer);location.href='login.html';return}text()},1000);
  stay.onclick=()=>{clearInterval(timer);bar.remove()};
  bar.append(msg,now,reg,stay);document.body.append(bar);
}
