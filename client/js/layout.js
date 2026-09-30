function active(path){const here=location.pathname.split('/').pop()||'index.html';return here===path?' active':''}
function navLink(path,label){return `<a class="nav-link${active(path)}" href="${path}">${label}</a>`}
document.addEventListener('DOMContentLoaded',async()=>{
  const u=await getUser();
  const publicLinks=navLink('items.html','Browse');
  const userLinks=u?`${navLink('dashboard.html','Dashboard')}${navLink('items.html','Browse')}${navLink('list-item.html','List an Item')}${navLink('requests.html','Requests')}${navLink('wishlist.html','Borrow List')}${u.role==='admin'?navLink('admin.html','Admin'):''}<a class="nav-link" href="profile.html">Profile</a><button class="btn btn-outline-light ms-lg-2" onclick="logout()">Logout</button>`:`${publicLinks}${navLink('login.html','Login')}<a class="btn btn-primary ms-lg-2" href="register.html">Join BorrowBox</a>`;
  const nav=document.querySelector('#nav');
  const foot=document.querySelector('#foot');
  if(nav)nav.innerHTML=`<nav class="navbar navbar-expand-lg navbar-dark bb-nav sticky-top"><div class="container"><a class="navbar-brand d-flex align-items-center" href="/"><span class="bb-logo">B</span>BorrowBox</a><button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#bbNav" aria-label="Toggle navigation"><span class="navbar-toggler-icon"></span></button><div id="bbNav" class="collapse navbar-collapse"><div class="navbar-nav ms-auto align-items-lg-center">${userLinks}</div></div></div></nav>`;
  if(foot)foot.innerHTML=`<footer class="bb-footer"><div class="container bb-footer-inner"><div><strong>BorrowBox</strong> · Borrow what you need. Lend what you don't.</div><div><a href="/">Home</a> · <a href="items.html">Browse</a> · Borrow responsibly.</div></div></footer>`;
});
