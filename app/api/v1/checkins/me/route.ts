import {bearer,resolveTicket,result,json,fail} from '@/lib/server';
export async function GET(req:Request){try{const row=await resolveTicket(bearer(req));return json(row.checked_at?await result(row,new URL(req.url).origin,true):{code:'NOT_CHECKED_IN',message:'尚未签到'});}catch(e){return fail(e)}}
