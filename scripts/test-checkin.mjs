import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin='http://localhost:5173';
const auth={Cookie:'__sites_local_auth=1','Content-Type':'application/json'};
async function request(path,options={}){const r=await fetch(origin+path,options);let d;try{d=await r.json()}catch{d={}}return {status:r.status,d};}
async function admin(body){const r=await request('/api/admin',{method:'POST',headers:auth,body:JSON.stringify(body)});assert.equal(r.status,200,JSON.stringify(r.d));return r.d;}
assert.equal((await request('/api/admin')).status,401);
const initial=await request('/api/admin',{headers:auth});assert.equal(initial.status,200);const event=initial.d.event;
const testEvent={...event,title:'[本地验收] 季度复盘会',location:'本机测试环境 · 不属于正式活动',starts:Math.min(event.starts,Date.now()-3600000),ends:Date.now()+86400000,expires:Date.now()+2*86400000,status:'published'};
await admin({action:'settings',event:testEvent});
const prefix='QA'+Date.now();await admin({action:'import',rows:[{code:prefix+'A',name:'验收张三',department:'测试组'},{code:prefix+'B',name:'验收张三',department:'同名验证组'},{code:prefix+'C',name:'边界测试',department:'测试组'},{code:prefix+'D',name:'浏览器验收',department:'测试组'}]});
const invites=(await admin({action:'invitations'})).items.filter(x=>x.code.startsWith(prefix));assert.equal(invites.length,4);assert.notEqual(invites[0].token,invites[1].token);
const token=invites[0].token,headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const page=await fetch(origin+'/i/'+token);assert.equal(page.status,200);assert((await page.text()).includes('验收张三'));
assert.equal((await request('/api/v1/checkins/me',{headers})).d.code,'NOT_CHECKED_IN');
const concurrent=await Promise.all(Array.from({length:12},()=>request('/api/v1/checkins',{method:'POST',headers,body:'{}'})));
assert.equal(concurrent.filter(x=>x.status===201).length,1);assert(concurrent.every(x=>[200,201].includes(x.status)));assert.equal(new Set(concurrent.map(x=>x.d.checked_in_at)).size,1);
const result=concurrent[0].d;assert.equal(typeof result.reply.text,'string');assert.equal(Object.keys(result.reply.link).length,2);
const welcome=await fetch(result.reply.link.url);assert.equal(welcome.status,200);assert((await welcome.text()).includes('验收张三'));
assert.equal((await request('/api/v1/checkins',{method:'POST',headers:{Authorization:'Bearer '+result.reply.link.url.split('/').pop()},body:'{}'})).status,401);
assert.equal((await request('/api/v1/checkins/me',{headers:{Authorization:`Bearer ${invites[1].token}`}})).d.code,'NOT_CHECKED_IN');
const badImport=await request('/api/admin',{method:'POST',headers:auth,body:JSON.stringify({action:'import',rows:[{code:prefix+'A',name:'重复编号'}]})});assert.equal(badImport.status,400);
await admin({action:'reissue',id:invites[0].id});assert.equal((await request('/api/v1/checkins/me',{headers})).status,401);
const renewed=(await admin({action:'invitations',ids:[invites[0].id]})).items[0];const newResult=await request('/api/v1/checkins',{method:'POST',headers:{Authorization:`Bearer ${renewed.token}`},body:'{}'});assert.equal(newResult.d.checked_in_at,result.checked_in_at);
const remove=await request('/api/admin',{method:'POST',headers:auth,body:JSON.stringify({action:'remove',id:renewed.id})});assert.equal(remove.status,409);
await admin({action:'revoke',id:invites[1].id});assert.equal((await request('/api/v1/checkins',{method:'POST',headers:{Authorization:`Bearer ${invites[1].token}`},body:'{}'})).status,401);
await admin({action:'settings',event:{...testEvent,status:'cancelled'}});assert.equal((await request('/api/v1/checkins',{method:'POST',headers:{Authorization:`Bearer ${invites[2].token}`},body:'{}'})).d.code,'EVENT_CANCELLED');
assert.equal((await request('/api/v1/checkins',{method:'POST',headers:{Authorization:`Bearer ${renewed.token}`},body:'{}'})).d.code,'ALREADY_CHECKED_IN');
await admin({action:'settings',event:testEvent});
const final=await request('/api/admin',{headers:auth});assert.equal(final.d.people.filter(p=>p.id===renewed.id&&p.checked_at).length,1);
fs.mkdirSync('.sites-runtime',{recursive:true});fs.writeFileSync('.sites-runtime/qa.json',JSON.stringify({invite:origin+'/i/'+invites[3].token,welcome:newResult.d.reply.link.url,people:invites.length,checks:17},null,2));
console.log('PASS: 17 integration checks. Preview-only records; production remains untouched.');

