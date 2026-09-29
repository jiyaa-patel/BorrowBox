const test=require('node:test');const assert=require('node:assert/strict');
let server,base;
test.before(async()=>{server=require('../server/app').listen(0);await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`});
test.after(()=>server.close());
test('health endpoint',async()=>{const r=await fetch(base+'/api/health');assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true})});
test('unknown api is JSON 404',async()=>{const r=await fetch(base+'/api/nope');assert.equal(r.status,404);assert.equal((await r.json()).error,'Not found')});
