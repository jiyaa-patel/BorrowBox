// Shared navbar, footer, toasts and notifications.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function isActive(path) {
  const here = location.pathname.split('/').pop() || 'index.html';
  return here === path ? ' active' : '';
}
const navLink = (path, label) => `<a class="nav-link${isActive(path)}" href="${path}">${label}</a>`;

function guestLinks() {
  return `${navLink('items.html', 'Browse')}${navLink('login.html', 'Login')}<a class="btn btn-primary ms-lg-2" href="register.html">Register</a>`;
}

function notificationMarkup() {
  return `<div class="dropdown ms-lg-1">
    <button class="btn btn-link nav-link position-relative" type="button" data-bs-toggle="dropdown" aria-label="Notifications">Notifications<span id="bbNotifBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none">0</span></button>
    <div class="dropdown-menu dropdown-menu-end p-2 shadow border-0" style="width:min(360px,90vw)">
      <div class="d-flex justify-content-between align-items-center px-2 py-1"><strong>Notifications</strong><button id="bbReadAll" class="btn btn-sm btn-link">Mark all read</button></div>
      <div id="bbNotifList"><div class="px-2 py-3 bb-muted small">Loading…</div></div>
    </div>
  </div>`;
}

// Shows who is signed in and holds Profile / My Listings / Logout.
function userMenuMarkup(u) {
  const initial = esc((u.name || '?').trim().charAt(0).toUpperCase());
  const first = esc((u.name || '').trim().split(/\s+/)[0]);
  return `<div class="dropdown ms-lg-2">
    <button class="btn bb-user-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Account menu">
      <span class="bb-avatar">${initial}</span><span class="bb-user-name">${first}</span>
    </button>
    <div class="dropdown-menu dropdown-menu-end shadow border-0 p-2" style="min-width:260px">
      <div class="px-2 py-2">
        <div class="bb-eyebrow">Signed in as</div>
        <div class="fw-bold">${esc(u.name)}</div>
        <div class="bb-muted small text-break">${esc(u.email)}</div>
        <div class="bb-muted small">${esc(u.student_id)}${u.role === 'admin' ? ' · Admin' : ''}</div>
      </div>
      <hr class="dropdown-divider">
      <a class="dropdown-item rounded-3" href="profile.html">My profile</a>
      <a class="dropdown-item rounded-3" href="my-listings.html">My listings</a>
      <a class="dropdown-item rounded-3" href="requests.html">My requests</a>
      <hr class="dropdown-divider">
      <button class="dropdown-item rounded-3 text-danger fw-semibold" type="button" onclick="logout()">Logout</button>
    </div>
  </div>`;
}

function memberLinks(u) {
  return navLink('dashboard.html', 'Dashboard') + navLink('items.html', 'Browse') + navLink('list-item.html', 'List an Item') +
    navLink('requests.html', 'Requests') + navLink('wishlist.html', 'Borrow List') +
    (u.role === 'admin' ? navLink('admin.html', 'Admin') : '') +
    notificationMarkup() + userMenuMarkup(u);
}

function renderNav(links) {
  const nav = document.querySelector('#nav');
  if (!nav) return;
  nav.innerHTML = `<nav class="navbar navbar-expand-lg navbar-dark bb-nav sticky-top"><div class="container">
    <a class="navbar-brand d-flex align-items-center" href="/"><span class="bb-logo">B</span>BorrowBox</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#bbNav" aria-controls="bbNav" aria-expanded="false" aria-label="Toggle navigation"><span class="navbar-toggler-icon"></span></button>
    <div id="bbNav" class="collapse navbar-collapse"><div class="navbar-nav ms-auto align-items-lg-center">${links}</div></div>
  </div></nav>`;
}

function bbToast(message, type = 'success') {
  let wrap = document.querySelector('.bb-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'bb-toast-wrap';
    document.body.append(wrap);
  }
  const node = document.createElement('div');
  node.className = `bb-toast ${type}`;
  node.textContent = message;
  wrap.append(node);
  setTimeout(() => node.remove(), 2600);
}

function reminderText(r) {
  if (r.due_in_days < 0) return `${r.item} is ${Math.abs(r.due_in_days)} day(s) overdue`;
  if (r.due_in_days === 0) return `${r.item} is due today`;
  return `${r.item} is due in ${r.due_in_days} day(s)`;
}

async function loadNotifications() {
  const list = document.querySelector('#bbNotifList');
  const badge = document.querySelector('#bbNotifBadge');
  if (!list || !badge) return;
  try {
    const x = await api('/api/notifications');
    badge.textContent = x.unread;
    badge.classList.toggle('d-none', !x.unread);
    list.textContent = '';

    const all = [
      ...x.reminders.map(r => ({ message: reminderText(r), request_id: r.request_id, is_read: 0 })),
      ...x.items
    ];
    if (!all.length) {
      list.innerHTML = '<div class="px-2 py-3 bb-muted small">You are all caught up.</div>';
      return;
    }
    all.slice(0, 8).forEach(n => {
      const b = document.createElement('button');
      b.className = 'dropdown-item rounded-3 py-2 text-wrap' + (n.is_read ? '' : ' fw-semibold');
      b.textContent = n.message;
      b.onclick = async () => {
        if (n.id) { try { await api('/api/notifications/' + n.id + '/read', { method: 'PUT' }); } catch { /* ignore */ } }
        if (n.request_id) location.href = 'requests.html';
        else if (n.item_id) location.href = 'item.html?id=' + n.item_id;
      };
      list.append(b);
    });
  } catch {
    list.innerHTML = '<div class="px-2 py-3 bb-muted small">Notifications unavailable.</div>';
  }
}

window.bbToast = bbToast;
window.esc = esc;

document.addEventListener('DOMContentLoaded', async () => {
  const foot = document.querySelector('#foot');
  if (foot) {
    foot.innerHTML = `<footer class="bb-footer"><div class="container bb-footer-inner"><div><strong>BorrowBox</strong> · Borrow what you need. Lend what you don't.</div><div><a href="/">Home</a> · <a href="items.html">Browse</a> · Borrow responsibly.</div></div></footer>`;
  }

  // No token: show guest links straight away. Token present: wait for /me so the bar
  // never flashes "Login" for someone who is signed in.
  if (!bbToken()) { renderNav(guestLinks()); return; }
  renderNav('');
  const u = await getUser();
  if (!u) { renderNav(guestLinks()); return; }

  renderNav(memberLinks(u));
  loadNotifications();
  const readAll = document.querySelector('#bbReadAll');
  if (readAll) readAll.onclick = async () => {
    try { await api('/api/notifications/read-all', { method: 'PUT' }); await loadNotifications(); } catch { /* ignore */ }
  };
  setInterval(loadNotifications, 60000);
  document.dispatchEvent(new CustomEvent('bb:user', { detail: u }));
});
