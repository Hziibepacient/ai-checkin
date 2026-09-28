import {sticker,stickerTitle,stickerSVG} from './sticker';
import JSZip from 'jszip';
import {PDFDocument,StandardFonts,rgb,PDFName,PDFString} from 'pdf-lib';
export function csvCell(v:unknown){let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export function inviteURL(person:any,origin:string){return person.url||`${origin}/i/${person.token}`;}
export function agentText(person:any,origin:string){return `请为邀请函中的参会人完成签到。受邀人：${person.name}（编号 ${person.code}）。
个人邀请链接：${inviteURL(person,origin)}
读取链接中的签到说明；仅在用户要求签到时提交。不要根据访问页面判断已签到。系统确认成功后回复返回的一段文字和一个欢迎仪式链接。若你的工具无法提交，请明确说明，并给出个人链接供用户点击“确认签到”。`;}
export async function invitationCanvas(person:any,_event:any,origin:string){
 await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=sticker.width;canvas.height=sticker.height;const c=canvas.getContext('2d')!;
 c.fillStyle='#111111';c.font=`600 ${sticker.titleSize}px "Microsoft YaHei",Arial,sans-serif`;c.fillText(stickerTitle,sticker.left,sticker.titleY);
 const url=inviteURL(person,origin);let size=sticker.urlSize;c.font=`${size}px Consolas,monospace`;while(c.measureText(url).width>sticker.width-24)c.font=`${--size}px Consolas,monospace`;c.fillText(url,sticker.left,sticker.urlY);return canvas;
}
export async function exportInvitations(items:any[],event:any,format:'png'|'pdf',progress:(n:number)=>void){
 const zip=new JSZip(),mapping=[['编号','姓名','贴图文件','个人邀请链接'].map(csvCell).join(',')];
 for(let i=0;i<items.length;i++){
 const p=items[i],canvas=await invitationCanvas(p,event,location.origin),png=await new Promise<Blob>(r=>canvas.toBlob(b=>r(b!),'image/png')),name=`${p.code}-${p.name}-Agent签到贴图`.replace(/[<>:"/\\|?*]/g,'_'),url=inviteURL(p,location.origin);
 if(format==='png')zip.file(`${name}.png`,png);
 else{const pdf=await PDFDocument.create(),page=pdf.addPage([1024,54]),image=await pdf.embedPng(await png.arrayBuffer());page.drawImage(image,{x:0,y:0,width:1024,height:54});const font=await pdf.embedFont(StandardFonts.Helvetica);page.drawText(url,{x:6,y:10,size:8,font,color:rgb(0,0,0),opacity:0});const annotation=pdf.context.obj({Type:'Annot',Subtype:'Link',Rect:[0,0,1024,54],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(url)}});page.node.set(PDFName.of('Annots'),pdf.context.obj([pdf.context.register(annotation)]));zip.file(`${name}.pdf`,await pdf.save());}
 zip.file(`${name}.svg`,stickerSVG(url));zip.file(`${name}.txt`,agentText(p,location.origin));mapping.push([p.code,p.name,`${name}.${format}`,url].map(csvCell).join(','));progress(i+1);
 }
 zip.file('人员与签到贴图映射.csv','\uFEFF'+mapping.join('\r\n'));zip.file('使用说明.txt','极简贴图为黑色文字、透明背景，没有边框或色块。PNG 原图 2048×108；SVG 可在设计软件中调整。建议贴在浅色留白处，成图显示宽度至少 1100 像素、高度约 58 像素，保留完整 URL，不压缩到二维码大小。文件名和映射清单对应参会人；图片内容不重复姓名和会议信息。若 Agent 需要确认，请按其提示确认；若它不能发送 POST，可打开个人链接点击确认签到。TXT 文件是可复制的同内容文字版。');download(await zip.generateAsync({type:'blob'}),`Agent签到贴图-${format}.zip`);
}
export function parseCSV(input:string){const rows:string[][]=[];let row:string[]=[],cell='',quote=false;const s=input.replace(/^\uFEFF/,'');for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quote&&s[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(c===','&&!quote){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}row.push(cell);if(row.some(x=>x.trim()))rows.push(row);if(quote)throw new Error('CSV 中存在未闭合的引号');if(rows[0]&&['编号','工号','code'].includes(rows[0][0].trim().toLowerCase()))rows.shift();return rows.map(r=>({code:r[0]?.trim()||'',name:r[1]?.trim()||'',department:r[2]?.trim()||''}));}
