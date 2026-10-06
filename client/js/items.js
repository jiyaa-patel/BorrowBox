// Browse page: search, filters, "Find Near Me", pagination, save-to-borrow-list.
const form = document.querySelector('#filters');
const resultsEl = document.querySelector('#results');
const pagesEl = document.querySelector('#pages');
const errEl = document.querySelector('#err');
const nearBtn = document.querySelector('#near');
const geoBar = document.querySelector('#geoBar');
const geoText = document.querySelector('#geoText');
const field = name => form.elements.namedItem(name);

// Text we put in the Location box after "Find Near Me". While it is unchanged it is a label, not a text filter.
let geoLabel = '';
let seq = 0;
let timer;

function showError(message) {
  errEl.textContent = message;
  errEl.classList.remove('d-none');
}

function statusBadge(status) {
  const s = document.createElement('span');
  s.className = 'bb-badge ' + status;
  s.textContent = status.replace('_', ' ');
  return s;
}

function formatDistance(km) {
  return km < 1 ? Math.round(km * 1000) + ' m' : km + ' km';
}

async function saveItem(id) {
  if (!bbToken()) { location.href = 'login.html?next=' + encodeURIComponent(location.pathname + location.search); return; }
  try {
    await api('/api/wishlist/' + id, { method: 'POST' });
    bbToast('Saved to My Borrow List');
  } catch (e) { bbToast(e.message, 'error'); }
}

function setGeoLabel(text) {
  geoLabel = text;
  field('location').value = text;
}

function hasGeo() { return !!(field('lat').value && field('lng').value); }

function syncGeoBar() {
  geoBar.classList.toggle('d-none', !hasGeo());
  // The server rejects radius/distance-sort without coordinates, so keep the form consistent.
  if (!hasGeo() && field('sort').value === 'distance') field('sort').value = 'newest';
}

function buildQuery() {
  const q = new URLSearchParams(new FormData(form));
  if (!hasGeo()) { q.delete('lat'); q.delete('lng'); q.delete('radius'); }
  else if (geoLabel && field('location').value === geoLabel) q.delete('location');
  if (q.get('page') === '1') q.delete('page');
  [...q.keys()].forEach(k => { if (!q.get(k)) q.delete(k); });
  return q;
}

function renderEmpty() {
  const nearby = hasGeo();
  resultsEl.innerHTML = `<div class="bb-empty" style="grid-column:1/-1"><strong>No matching items</strong>${nearby ? 'Nothing within that distance. Try a larger radius or clear the location.' : 'Try a broader search or clear a filter.'}</div>`;
}

function itemCard(i) {
  const card = document.createElement('article');
  card.className = 'card bb-card-hover bb-item-card';
  card.draggable = true;
  card.dataset.id = i.id;
  card.ondragstart = e => e.dataTransfer.setData('text/borrowbox-item', i.id);

  const top = document.createElement('div');
  top.className = 'bb-item-top';
  const cat = document.createElement('span');
  cat.className = 'bb-kicker';
  cat.textContent = `${i.category.icon} ${i.category.name}`;
  top.append(cat, statusBadge(i.availability.status));

  const title = document.createElement('h2');
  title.className = 'bb-item-title';
  title.textContent = i.name;

  const meta = document.createElement('div');
  meta.className = 'bb-item-meta';
  const rating = i.rating.count ? `${i.rating.avg} ★ (${i.rating.count})` : 'No ratings yet';
  meta.textContent = `${i.location} · ${rating}` + (i.distance_km != null ? ` · ${formatDistance(i.distance_km)} away` : '');

  const actions = document.createElement('div');
  actions.className = 'bb-item-actions';
  const view = document.createElement('a');
  view.href = 'item.html?id=' + i.id;
  view.className = 'btn btn-primary flex-grow-1';
  view.textContent = 'View Item';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn btn-outline-dark';
  save.textContent = 'Save';
  save.onclick = () => saveItem(i.id);
  actions.append(view, save);

  card.append(top, title, meta, actions);
  return card;
}

function renderPager(x) {
  pagesEl.textContent = '';
  if (!x.total) return;
  const info = document.createElement('div');
  info.className = 'bb-muted small';
  info.textContent = `Page ${x.page} of ${x.pages} · ${x.total} item${x.total === 1 ? '' : 's'}`;
  pagesEl.append(info);
  if (x.pages <= 1) return;

  const nav = document.createElement('div');
  nav.className = 'd-flex gap-2';
  const go = (label, page, disabled) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline-dark btn-sm';
    b.textContent = label;
    b.disabled = disabled;
    b.onclick = () => { field('page').value = page; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    return b;
  };
  nav.append(go('← Previous', x.page - 1, x.page <= 1), go('Next →', x.page + 1, x.page >= x.pages));
  pagesEl.append(nav);
}

async function load() {
  const n = ++seq;
  syncGeoBar();
  const q = buildQuery();
  history.replaceState(null, '', q.toString() ? '?' + q : location.pathname);
  errEl.classList.add('d-none');
  try {
    const x = await api('/api/items?' + q);
    if (n !== seq) return; // a newer request superseded this one
    resultsEl.textContent = '';
    if (!x.items.length) { renderEmpty(); renderPager(x); return; }
    x.items.forEach(i => resultsEl.append(itemCard(i)));
    renderPager(x);
  } catch (e) {
    if (n !== seq) return;
    resultsEl.textContent = '';
    pagesEl.textContent = '';
    showError(e.message);
  }
}

function applyUrlParams() {
  for (const [k, v] of new URLSearchParams(location.search)) {
    const el = form.elements.namedItem(k);
    if (el && 'value' in el) el.value = v;
  }
}

// ---- Find Near Me ---------------------------------------------------------
nearBtn.onclick = async () => {
  const label = nearBtn.textContent;
  nearBtn.disabled = true;
  nearBtn.textContent = 'Locating…';
  errEl.classList.add('d-none');
  try {
    const { latitude, longitude } = await bbGetPosition();
    field('lat').value = latitude;
    field('lng').value = longitude;
    if (!field('radius').value) field('radius').value = '5';
    field('sort').value = 'distance';
    field('page').value = '1';
    setGeoLabel('Current location');
    geoText.textContent = 'Showing items near your current location';
    load();
    const name = await bbPlaceName(latitude, longitude);
    if (field('location').value === geoLabel) setGeoLabel(name);
    geoText.textContent = 'Showing items near ' + name;
  } catch (e) {
    showError(e.message + ' Other filters still work.');
  } finally {
    nearBtn.disabled = false;
    nearBtn.textContent = label;
  }
};

document.querySelector('#clearGeo').onclick = () => {
  if (geoLabel && field('location').value === geoLabel) field('location').value = '';
  geoLabel = '';
  field('lat').value = '';
  field('lng').value = '';
  field('page').value = '1';
  load();
};

form.onsubmit = e => { e.preventDefault(); load(); };
form.oninput = e => {
  if (e.target.name !== 'page') field('page').value = '1';
  clearTimeout(timer);
  timer = setTimeout(load, 300);
};

// ---- Drag a card onto the Borrow List drop zone ---------------------------
const dz = document.querySelector('.drop-zone');
dz.ondragover = e => e.preventDefault();
dz.ondragenter = () => dz.classList.add('bb-drag');
dz.ondragleave = () => dz.classList.remove('bb-drag');
dz.ondrop = e => {
  e.preventDefault();
  dz.classList.remove('bb-drag');
  const id = e.dataTransfer.getData('text/borrowbox-item');
  if (/^\d+$/.test(id)) saveItem(id);
};

// ---- Boot -----------------------------------------------------------------
api('/api/categories')
  .then(cats => {
    field('category').innerHTML += cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  })
  .catch(() => { /* categories are optional */ })
  .finally(async () => {
    applyUrlParams();
    load();
    if (hasGeo() && !field('location').value) {
      setGeoLabel('Current location');
      const name = await bbPlaceName(Number(field('lat').value), Number(field('lng').value));
      if (field('location').value === geoLabel) { setGeoLabel(name); geoText.textContent = 'Showing items near ' + name; }
    }
  });
