// Shared fetch helper. Adds the JWT, parses JSON and turns failures into Error(message).
function token() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function clearSession() {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  // Per-user leftovers must not leak to the next person using this browser.
  localStorage.removeItem('listingDraft');
  localStorage.removeItem('recentlyViewed');
}

function loginUrl() {
  return 'login.html?next=' + encodeURIComponent(location.pathname + location.search);
}

async function api(url, opt = {}) {
  const headers = { ...(opt.headers || {}) };
  if (opt.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const t = token();
  if (t) headers.Authorization = 'Bearer ' + t;

  const res = await fetch(url, { ...opt, headers });
  let data = {};
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }

  // A 401 from the login/register form just means "wrong credentials": show the message,
  // do NOT bounce the user back to the login page (that made the error invisible).
  const isAuthForm = /^\/api\/auth\/(login|register)/.test(url);
  if (res.status === 401 && !isAuthForm) {
    clearSession();
    location.href = loginUrl();
    throw Error(data.error || 'Login required');
  }
  if (res.status === 429) throw Error('Too many attempts. Please wait a few minutes and try again.');
  if (!res.ok) throw Error(data.error || 'Request failed');
  return data;
}

window.api = api;
window.bbToken = token;
window.bbClearSession = clearSession;
