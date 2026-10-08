// Current-user helpers. getUser() is cached per page load so the navbar and the page script
// share one /api/auth/me request instead of firing several.
let userPromise = null;

function getUser() {
  const t = bbToken();
  if (!t) return Promise.resolve(null);
  if (!userPromise) {
    userPromise = fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + t } })
      .then(res => {
        if (res.status === 401 || res.status === 403) { bbClearSession(); return null; }
        return res.ok ? res.json() : null;
      })
      .catch(() => null); // server unreachable: stay quiet, keep the token
  }
  return userPromise;
}

function logout() {
  bbClearSession();
  location.href = 'login.html?loggedout=1';
}

async function requireLogin() {
  const u = await getUser();
  if (!u) location.href = 'login.html?next=' + encodeURIComponent(location.pathname + location.search);
  return u;
}

async function requireRole(role) {
  const u = await requireLogin();
  if (u && u.role !== role) location.href = 'dashboard.html';
  return u;
}

window.getUser = getUser;
window.logout = logout;
window.requireLogin = requireLogin;
window.requireRole = requireRole;
