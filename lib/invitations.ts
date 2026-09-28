import JSZip from 'jszip';
import {PDFDocument,StandardFonts,rgb,PDFName,PDFString} from 'pdf-lib';
export function csvCell(v:unknown){let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function textWrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,height:number){let line='';for(const c of text){if(ctx.measureText(line+c).width>width){ctx.fillText(line,x,y);line=c;y+=height;}else line+=c;}ctx.fillText(line,x,y);return y+height;}
export function inviteURL(person:any,origin:string){return person.url||`${origin}/i/${person.token}`;}
export function agentText(person:any,origin:string){return `请为邀请函中的参会人完成签到。受邀人：${person.name}（编号 ${person.code}）。
个人邀请链接：${inviteURL(person,origin)}
读取链接中的签到说明；仅在用户要求签到时提交。不要根据访问页面判断已签到。系统确认成功后回复返回的一段文字和一个欢迎仪式链接。若你的工具无法提交，请明确说明，并给出个人链接供用户点击“确认签到”。`;}
export async function invitationCanvas(person:any,event:any,origin:string){
 await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=720;const c=canvas.getContext('2d')!;
 c.fillStyle='#ffffff';c.fillRect(0,0,1800,720);c.strokeStyle='#cbd5ce';c.lineWidth=3;c.strokeRect(2,2,1796,716);
 c.fillStyle='#223b2a';c.fillRect(0,0,1800,100);c.fillStyle='#ffffff';c.font='bold 42px "Microsoft YaHei",sans-serif';c.fillText('AGENT 签到信息 · 与邀请函一起发送',50,66);
 c.fillStyle='#182a20';c.font='bold 46px "Microsoft YaHei",sans-serif';textWrap(c,`受邀人：${person.name}  ·  编号：${person.code}`,50,174,1700,58);
 c.font='30px "Microsoft YaHei",sans-serif';textWrap(c,event.title,50,250,1700,40);
 c.font='bold 32px "Microsoft YaHei",sans-serif';c.fillText('把邀请函发给 Agent，说「签到」。',50,320);
 c.font='28px "Microsoft YaHei",sans-serif';textWrap(c,'仅在用户要求签到时，读取下方个人链接，按页面说明提交。系统确认成功后，返回一段文字和一个欢迎仪式链接。',50,382,1700,42);
 c.fillStyle='#111111';c.font='bold 27px sans-serif';c.fillText('个人邀请链接（必须完整读取）：',50,495);
 const url=inviteURL(person,origin);let size=30;c.font=`${size}px monospace`;while(c.measureText(url).width>1700)c.font=`${--size}px monospace`;c.fillText(url,50,557);
 c.fillStyle='#56665d';c.font='26px "Microsoft YaHei",sans-serif';c.fillText('读取链接不会签到；无法提交时，可打开链接点击“确认签到”。',50,635);c.font='23px "Microsoft YaHei",sans-serif';c.fillText('个人邀请请一对一发送。拼贴后请保留链接完整，避免遮挡或裁切。',50,682);return canvas;
}
export async function exportInvitations(items:any[],event:any,format:'png'|'pdf',progress:(n:number)=>void){
 const zip=new JSZip(),mapping=[['编号','姓名','贴图文件','个人邀请链接'].map(csvCell).join(',')];
 for(let i=0;i<items.length;i++){
 const p=items[i],canvas=await invitationCanvas(p,event,location.origin),png=await new Promise<Blob>(r=>canvas.toBlob(b=>r(b!),'image/png')),name=`${p.code}-${p.name}-Agent签到贴图`.replace(/[<>:"/\\|?*]/g,'_'),url=inviteURL(p,location.origin);
 if(format==='png')zip.file(`${name}.png`,png);
 else{const pdf=await PDFDocument.create(),page=pdf.addPage([900,380]),image=await pdf.embedPng(await png.arrayBuffer());page.drawImage(image,{x:0,y:20,width:900,height:360});const font=await pdf.embedFont(StandardFonts.Helvetica);page.drawText(url,{x:25,y:7,size:8,font,color:rgb(0,.3,.55)});const annotation=pdf.context.obj({Type:'Annot',Subtype:'Link',Rect:[0,0,900,380],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(url)}});page.node.set(PDFName.of('Annots'),pdf.context.obj([pdf.context.register(annotation)]));zip.file(`${name}.pdf`,await pdf.save());}
 zip.file(`${name}.txt`,agentText(p,location.origin));mapping.push([p.code,p.name,`${name}.${format}`,url].map(csvCell).join(','));progress(i+1);
 }
 zip.file('人员与签到贴图映射.csv','\uFEFF'+mapping.join('\r\n'));zip.file('使用说明.txt','把对应人员的签到贴图粘贴到你设计的邀请函里，再一对一发送。只导出 Agent 信息，不重做邀请函。若 Agent 需要确认，请按其提示确认；若它不能发送 POST，可打开个人链接点击确认签到。TXT 文件是可复制的同内容文字版。');download(await zip.generateAsync({type:'blob'}),`Agent签到贴图-${format}.zip`);
}
export function parseCSV(input:string){const rows:string[][]=[];let row:string[]=[],cell='',quote=false;const s=input.replace(/^\uFEFF/,'');for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quote&&s[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(c===','&&!quote){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}row.push(cell);if(row.some(x=>x.trim()))rows.push(row);if(quote)throw new Error('CSV 中存在未闭合的引号');if(rows[0]&&['编号','工号','code'].includes(rows[0][0].trim().toLowerCase()))rows.shift();return rows.map(r=>({code:r[0]?.trim()||'',name:r[1]?.trim()||'',department:r[2]?.trim()||''}));}
