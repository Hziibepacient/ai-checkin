import {admin,eventForOwner,db,json,fail,sameOrigin,AppError,uid,now,ticket,hash,audit,resolveTicket} from '@/lib/server';
export async function GET(){try{const user=await admin(),event=await eventForOwner(user.userId);const participants=await db().prepare('SELECT p.*, c.checked_at FROM people p LEFT JOIN checkins c ON c.person_id=p.id WHERE p.event_id=? ORDER BY p.created,p.code').bind(event.id).all();const logs=await db().prepare('SELECT action,detail,created FROM audits WHERE event_id=? ORDER BY created DESC LIMIT 20').bind(event.id).all();return json({event,people:participants.results.map(({token_hash,welcome_hash,...p}:any)=>p),logs:logs.results,user:user.displayName});}catch(e){return fail(e)}}
export async function POST(req:Request){try{
 sameOrigin(req);const user=await admin(),event=await eventForOwner(user.userId),body=await req.json() as any;
 if(body.action==='settings'){
  const s=body.event;const starts=Number(s.starts),ends=Number(s.ends),expires=Number(s.expires);
  if(!s.title?.trim()||s.title.length>100||!s.location?.trim()||s.location.length>200||!Number.isFinite(starts)||!Number.isFinite(ends)||!Number.isFinite(expires)||ends<=starts||expires<ends)throw new AppError(400,'INVALID_REQUEST','请填写会议名称、地点，并确保截止时间晚于开始时间、访问有效期不早于签到截止时间');
  if(!['draft','published','cancelled','archived'].includes(s.status))throw new AppError(400,'INVALID_REQUEST','无效会议状态');
  if(!s.message?.includes('{姓名}')||!s.message.includes('签到')||s.message.length>300)throw new AppError(400,'INVALID_REQUEST','成功文案需包含 {姓名} 和“签到”，且不超过 300 字');
  const bounds=await db().prepare('SELECT MIN(c.checked_at) AS first,MAX(c.checked_at) AS last FROM checkins c JOIN people p ON p.id=c.person_id WHERE p.event_id=?').bind(event.id).first<any>();
  if(bounds?.first&&(starts>bounds.first||ends<=bounds.last))throw new AppError(409,'INVALID_WINDOW','新的时间范围不能排除已有签到记录');
  await db().prepare('UPDATE events SET title=?,location=?,starts=?,ends=?,expires=?,status=?,message=? WHERE id=?').bind(s.title.trim(),s.location.trim(),starts,ends,expires,s.status,s.message,event.id).run();await audit(event.id,'更新会议配置',s.status);return json({ok:true});
 }
 if(body.action==='import'){
  if(!Array.isArray(body.rows)||!body.rows.length||body.rows.length>100)throw new AppError(400,'INVALID_REQUEST','每次导入 1–100 位参会人，可分批导入');
  const seen=new Set<string>(),errors:string[]=[];const existing=await db().prepare('SELECT code FROM people WHERE event_id=?').bind(event.id).all<any>();const codes=new Set(existing.results.map((p:any)=>p.code));
  body.rows.forEach((r:any,i:number)=>{if(!r.code?.trim()||!r.name?.trim()||r.code.length>60||r.name.length>60||String(r.department||'').length>80)errors.push(`第 ${i+1} 行：编号、姓名必填，且不能超长`);else if(seen.has(r.code.trim())||codes.has(r.code.trim()))errors.push(`第 ${i+1} 行：编号 ${r.code} 重复`);else seen.add(r.code.trim());});
  if(errors.length)throw new AppError(400,'INVALID_REQUEST',errors.slice(0,8).join('；'));
  const statements=[];for(const p of body.rows){const id=uid();statements.push(db().prepare('INSERT INTO people(id,event_id,code,name,department,version,token_hash,welcome_hash,active,revoked,created) VALUES(?,?,?,?,?,1,?,?,1,0,?)').bind(id,event.id,p.code.trim(),p.name.trim(),String(p.department||'').trim(),await hash(await ticket(id,1)),await hash(await ticket(id,1,'welcome')),now()));}
  await db().batch(statements);await audit(event.id,'导入参会人',`${body.rows.length} 人`);return json({ok:true,count:body.rows.length});
 }
 if(['reissue','revoke','remove'].includes(body.action)){
  const p=await db().prepare('SELECT p.*,c.checked_at FROM people p LEFT JOIN checkins c ON c.person_id=p.id WHERE p.id=? AND p.event_id=?').bind(body.id,event.id).first<any>();if(!p)throw new AppError(404,'NOT_FOUND','人员不存在');
  if(body.action==='remove'&&p.checked_at)throw new AppError(409,'HAS_RECORD','已签到人员不能移出名单');
  if(body.action==='reissue'){const version=p.version+1;await db().prepare('UPDATE people SET version=?,token_hash=?,welcome_hash=?,revoked=0,active=1 WHERE id=?').bind(version,await hash(await ticket(p.id,version)),await hash(await ticket(p.id,version,'welcome')),p.id).run();}
  else await db().prepare('UPDATE people SET revoked=1,active=? WHERE id=?').bind(body.action==='remove'?0:p.active,p.id).run();
  await audit(event.id,body.action==='reissue'?'重新发放邀请':body.action==='remove'?'移出名单':'撤销邀请',p.code);return json({ok:true});
 }
 if(body.action==='invitations'){
  if(event.status!=='published')throw new AppError(409,'NOT_PUBLISHED','请先在会议设置中发布会议，再生成正式邀请');
  if(now()>=event.expires)throw new AppError(409,'INVITATION_EXPIRED','邀请有效期已结束，请先在会议设置中延长有效期');
  const list=await db().prepare('SELECT * FROM people WHERE event_id=? AND active=1 AND revoked=0').bind(event.id).all<any>();
  const items=await Promise.all(list.results.filter((p:any)=>!body.ids||body.ids.includes(p.id)).map(async(p:any)=>{const token=await ticket(p.id,p.version);if(await hash(token)!==p.token_hash||await hash(await ticket(p.id,p.version,'welcome'))!==p.welcome_hash)throw new AppError(409,'INVITATION_KEY_CHANGED',`编号 ${p.code} 的邀请签名与后台记录不一致，请重新发放该邀请后下载；已有签到记录保留`);await resolveTicket(token);return {id:p.id,code:p.code,name:p.name,department:p.department,token,url:`${new URL(req.url).origin}/i/${token}`};}));
  await audit(event.id,'导出 Agent 签到贴图',`${items.length} 人`);return json({event,items});
 }
 if(body.action==='export'){await audit(event.id,'导出签到记录');return json({ok:true});}
 throw new AppError(400,'INVALID_REQUEST','未知操作');
 }catch(e){return fail(e)}}

