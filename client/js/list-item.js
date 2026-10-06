// List / edit an item. "Use my current location" fills the Campus location input and
// stores latitude/longitude so the listing shows up in "Find Near Me".
const f = document.querySelector('#f');
const field = n => f.elements.namedItem(n); // explicit lookup: never collides with built-in form properties like form.name
const editId = new URLSearchParams(location.search).get('id');
const today = new Date().toLocaleDateString('en-CA');
const geoBtn = document.querySelector('#geo');
const geoMsg = document.querySelector('#geoMsg');
const errBox = document.querySelector('#err');
let locationAutofilled = false;

function showError(message) {
  errBox.textContent = message;
  errBox.classList.remove('d-none');
}

function setGeoMessage(text, ok = true) {
  geoMsg.textContent = text;
  geoMsg.classList.toggle('text-success', ok && !!text);
  geoMsg.classList.toggle('text-danger', !ok);
}

// Only brand-new listings must start today or later; editing an existing listing
// (which may already have started) must stay saveable.
if (!editId) {
  field('available_from').min = today;
  field('available_to').min = today;
}

function restoreDraft() {
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem('listingDraft')); } catch { /* corrupt draft */ }
  if (!draft || !(draft.name || draft.description || draft.location)) return;
  if (!confirm('Continue your unfinished listing?')) { localStorage.removeItem('listingDraft'); return; }
  Object.entries(draft).forEach(([k, v]) => { if (field(k)) field(k).value = v; });
  if (field('latitude').value && field('longitude').value) setGeoMessage('Location captured');
}

async function init() {
  const me = await requireLogin();
  if (!me) return;
  try {
    const cats = await api('/api/categories');
    field('category_id').innerHTML = cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

    if (editId) {
      const x = await api('/api/items/' + editId);
      if (x.owner.id !== me.id) { location.href = 'my-listings.html'; return; }
      ['name', 'description', 'location'].forEach(k => { field(k).value = x[k]; });
      field('category_id').value = String(x.category.id);
      field('available_from').value = x.availability.from;
      field('available_to').value = x.availability.to;
      field('available_to').min = x.availability.from;
      if (x.latitude != null && x.longitude != null) {
        field('latitude').value = x.latitude;
        field('longitude').value = x.longitude;
        setGeoMessage('Location saved for this listing');
      }
      document.title = 'Edit Item · BorrowBox';
      document.querySelector('.bb-title').textContent = 'Edit Item';
      document.querySelector('#submit').textContent = 'Save changes';
    } else {
      restoreDraft();
    }
  } catch (e) { showError(e.message); }
}

geoBtn.onclick = async () => {
  const label = geoBtn.textContent;
  geoBtn.disabled = true;
  geoBtn.textContent = 'Locating…';
  setGeoMessage('Waiting for your browser… allow location access if asked.');
  try {
    const { latitude, longitude } = await bbGetPosition();
    field('latitude').value = latitude;
    field('longitude').value = longitude;
    setGeoMessage('Found you. Looking up the place name…');

    const name = await bbPlaceName(latitude, longitude);
    const typed = field('location').value.trim();
    if (!typed || locationAutofilled) {
      field('location').value = name.slice(0, 100);
      locationAutofilled = true;
      setGeoMessage('Location captured and filled in below. You can edit the text.');
    } else {
      setGeoMessage(`Coordinates saved. Kept your text "${typed}" as the pickup name.`);
    }
    f.dispatchEvent(new Event('input', { bubbles: true })); // refresh the saved draft
  } catch (e) {
    setGeoMessage(e.message + ' You can also pick a campus spot from the suggestions in the location box.', false);
  } finally {
    geoBtn.disabled = false;
    geoBtn.textContent = label;
  }
};

// Suggest known campus spots; picking one also saves its coordinates (works even without device location).
document.querySelector('#campusPlaces').innerHTML = Object.keys(CAMPUS_PLACES).map(n => `<option value="${n}"></option>`).join('');
field('location').addEventListener('change', () => {
  const spot = CAMPUS_PLACES[field('location').value.trim()];
  if (spot && !field('latitude').value) {
    field('latitude').value = spot[0];
    field('longitude').value = spot[1];
    setGeoMessage('Coordinates saved for this campus spot.');
  }
});

// Typing over an auto-filled location makes it the user's own text again.
field('location').addEventListener('input', () => { locationAutofilled = false; });

f.addEventListener('input', () => {
  if (!editId) localStorage.setItem('listingDraft', JSON.stringify(Object.fromEntries(new FormData(f))));
});

field('available_from').onchange = () => {
  field('available_to').min = field('available_from').value || (editId ? '' : today);
  if (field('available_to').value && field('available_to').value < field('available_from').value) field('available_to').value = field('available_from').value;
};

f.onsubmit = async e => {
  e.preventDefault();
  const submitBtn = document.querySelector('#submit');
  submitBtn.disabled = true;
  errBox.classList.add('d-none');
  try {
    const body = Object.fromEntries(new FormData(f));
    await api(editId ? '/api/items/' + editId : '/api/items', { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) });
    localStorage.removeItem('listingDraft');
    location.href = 'my-listings.html';
  } catch (x) {
    showError(x.message);
    submitBtn.disabled = false;
  }
};

init();
