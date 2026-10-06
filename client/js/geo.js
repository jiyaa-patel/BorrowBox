// Browser geolocation + place-name lookup, shared by the Browse and List Item pages.
const GEO_MESSAGES = {
  1: 'Location permission was denied. Allow location access for this site in your browser settings, then try again.',
  2: 'Your device could not work out its position. Check that location services are turned on.',
  3: 'Finding your location took too long. Please try again.'
};

// Same spots as the demo seed. Used as suggestions and as a fallback when the device cannot give a location.
const CAMPUS_PLACES = {
  'Library Block': [23.12905, 72.54480],
  'Central Library': [23.12890, 72.54510],
  'CSE Building': [23.12840, 72.54400],
  'Sports Ground': [23.12720, 72.54620],
  'Sports Complex': [23.12740, 72.54580],
  'Student Activity Centre': [23.12950, 72.54560],
  'E Block Lab': [23.12800, 72.54350],
  'E Block': [23.12810, 72.54340],
  'Hostel Block D': [23.13010, 72.54300],
  'Mechanical Workshop': [23.12690, 72.54420],
  'Auditorium': [23.12960, 72.54470]
};

function getPositionOnce(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

// Resolves { latitude, longitude } (rounded to 6 decimals, matching the DB column) or throws Error(message).
async function bbGetPosition() {
  if (!('geolocation' in navigator)) throw Error('Your browser does not support geolocation.');
  if (!window.isSecureContext) {
    throw Error('Browsers only allow location on https:// or http://localhost. Open the app at http://localhost:3000.');
  }
  let pos;
  try {
    pos = await getPositionOnce({ enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  } catch (e) {
    console.warn('Geolocation (high accuracy) failed:', e.code, e.message);
    if (e.code === 1) throw Error(GEO_MESSAGES[1]);
    try {
      // High accuracy can time out indoors/on desktops: retry with network-based location.
      pos = await getPositionOnce({ enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
    } catch (e2) {
      console.warn('Geolocation (low accuracy) failed:', e2.code, e2.message);
      throw Error(GEO_MESSAGES[e2.code] || 'Could not get your location.');
    }
  }
  return {
    latitude: Number(pos.coords.latitude.toFixed(6)),
    longitude: Number(pos.coords.longitude.toFixed(6))
  };
}

// Place name for the coordinates, or "lat, lng" when the lookup is unavailable.
async function bbPlaceName(latitude, longitude) {
  try {
    const res = await fetch(`/api/geo/reverse?lat=${latitude}&lng=${longitude}`);
    if (res.ok) {
      const { name } = await res.json();
      if (name) return name;
    }
  } catch { /* fall through to coordinates */ }
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

window.CAMPUS_PLACES = CAMPUS_PLACES;
window.bbGetPosition = bbGetPosition;
window.bbPlaceName = bbPlaceName;
