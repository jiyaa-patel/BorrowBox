const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages=['index.html','login.html','register.html','items.html','item.html','list-item.html','my-listings.html','requests.html','wishlist.html','dashboard.html','profile.html','admin.html'];

test('all main pages have valid document order',()=>{
  for(const name of pages){
    const s=read('public/'+name).toLowerCase();
    assert.ok(s.indexOf('<head')<s.indexOf('</head>'),name+' head');
    assert.ok(s.indexOf('</head>')<s.indexOf('<body'),name+' body after head');
    assert.ok(s.indexOf('<main')<s.indexOf('</main>'),name+' main');
  }
});

test('pages using api/auth load helpers before their functional script',()=>{
  for(const name of pages){
    const s=read('public/'+name);
    const apiPos=s.indexOf('src="js/api.js"');
    const authPos=s.indexOf('src="js/auth.js"');
    const uses=/api\(|requireLogin\(|requireRole\(|getUser\(\)/.test(s);
    if(uses){assert.ok(apiPos>=0,name+' includes api.js');assert.ok(authPos>apiPos,name+' loads auth after api')}
  }
});

test('request UI is wired for complete core lifecycle',()=>{
  const html=read('public/requests.html');
  const js=read('public/js/requests-app.js');
  for(const action of ['accept','reject','handover-code','confirm-handover','return','confirm-return','cancel'])assert.ok(html.includes(action)||js.includes(action),action);
  assert.ok(js.includes("/api/reviews"),'review endpoint wired');
  assert.ok(js.includes("/api/requests/"),'request detail/actions wired');
});

test('listing and item flow scripts exist and are non-empty',()=>{
  for(const f of ['public/js/item-flow.js','public/js/list-item.js','public/js/my-listings.js','public/js/requests-app.js'])assert.ok(read(f).length>200,f);
});

test('geolocation helper is loaded before the pages that use it',()=>{
  for(const name of ['items.html','list-item.html']){
    const s=read('public/'+name);
    assert.ok(s.indexOf('src="js/geo.js"')>s.indexOf('src="js/layout.js"'),name+' loads geo.js');
  }
  assert.ok(read('public/js/list-item.js').includes('bbPlaceName'),'list-item fills the location input');
  assert.ok(read('public/js/items.js').includes("namedItem('lat')")||read('public/js/items.js').includes("field('lat')"),'browse keeps lat/lng in the query');
});

test('wrong login credentials are shown, not redirected',()=>{
  assert.ok(read('public/js/api.js').includes('isAuthForm'));
});

test('navbar shows the signed-in account and a logout button',()=>{
  const js=read('public/js/layout.js');
  assert.ok(js.includes('Signed in as')&&js.includes('logout()'));
});

test('guests are sent to login after the hero; dashboard shows the account with logout',()=>{
  const home=read('public/js/home.js');
  assert.ok(home.includes('startGuestRedirect')&&home.includes("'login.html'"));
  const dash=read('public/js/dashboard.js');
  assert.ok(dash.includes('accountPanel')&&dash.includes('logout()'));
});

test('Find Near Me fills the Location input on Browse',()=>{
  const js=read('public/js/items.js');
  assert.ok(js.includes('setGeoLabel')&&js.includes('bbPlaceName'));
});

test('page wrapper animation must not keep a stacking context (it traps Bootstrap modals under the backdrop)',()=>{
  const css=read('public/css/app.css');
  const rule=css.match(/\.bb-page\{[^}]*\}/)[0];
  assert.ok(!/animation:[^;}]*\b(both|forwards)\b/.test(rule),rule);
});

test('Request to Borrow requires dates before opening the modal',()=>{
  assert.ok(read('public/js/item-flow.js').includes('Pick a start and an end date'));
});
