import {db,bearer,resolveTicket,result,json,fail,AppError,now,limit} from '@/lib/server';
export async function POST(req:Request){try{
 const token=bearer(req);let row=await resolveTicket(token);await limit(row.id);const origin=new URL(req.url).origin;
 if(row.checked_at)return json(await result(row,origin,true));
 const t=now();
 const insert=await db().prepare(`INSERT OR IGNORE INTO checkins(person_id,checked_at) SELECT p.id,? FROM people p JOIN events e ON e.id=p.event_id WHERE p.id=? AND p.token_hash=? AND p.active=1 AND p.revoked=0 AND e.status='published' AND e.starts<=? AND e.ends>? AND e.expires>?`).bind(t,row.id,row.token_hash,t,t,t).run();
 row=await resolveTicket(token);
 if(row.checked_at)return json(await result(row,origin,!insert.meta.changes),insert.meta.changes?201:200);
 if(row.status==='cancelled')throw new AppError(409,'EVENT_CANCELLED','会议已取消，请联系会务');
 if(row.status!=='published')throw new AppError(409,'CHECKIN_CLOSED','本场会议暂未开放签到');
 if(t<row.starts)throw new AppError(409,'CHECKIN_NOT_OPEN',`尚未到签到时间：${new Date(row.starts).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}（北京时间）开始`);
 throw new AppError(409,'CHECKIN_CLOSED','本场签到已结束，请联系会务');
}catch(e){return fail(e)}}
