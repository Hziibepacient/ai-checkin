'use client';
import {useState} from 'react';
import JSZip from 'jszip';
import {buildBoardingPDF,inspectBoardingPDF} from '@/lib/boarding-pdf';
import {csvCell,download} from '@/lib/invitations';
type Person={id:string;code:string;name:string;active:number;revoked:number};
type Upload={file:File;bytes:Uint8Array;pages:number;page:number;person:string};
function match(name:string,people:Person[]){const stem=name.replace(/\.pdf$/i,'');const found=people.filter(p=>stem===p.code||stem===p.name||stem===`${p.code}-${p.name}`);return found.length===1?found[0].id:'';}
async function labelPNG(person:Person){await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=60;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#111';let size=36;const text='AI CHECK-IN  /  发给 Agent，说「签到」';ctx.font=`600 ${size}px "Microsoft YaHei",sans-serif`;while(ctx.measureText(text).width>1580)ctx.font=`600 ${--size}px "Microsoft YaHei",sans-serif`;ctx.fillText(text,0,44);const blob=await new Promise<Blob>(r=>canvas.toBlob(b=>r(b!),'image/png'));return new Uint8Array(await blob.arrayBuffer());}
export default function InvitationPDF({people,busy,run,api}:{people:Person[];busy:string;run:(label:string,fn:()=>Promise<void>)=>Promise<void>;api:(body:any)=>Promise<any>}){
 const eligible=people.filter(p=>p.active&&!p.revoked);
 const [files,setFiles]=useState<Upload[]>([]),[shared,setShared]=useState(false),[selected,setSelected]=useState<string[]>([]),[message,setMessage]=useState(''),[background,setBackground]=useState('#fcf5ea');
 async function upload(list:FileList|null){if(!list?.length)return;setMessage('');setFiles([]);await run('正在读取登机牌 PDF…',async()=>{
  const all=Array.from(list);if(all.length>100||all.reduce((n,f)=>n+f.size,0)>100*1024*1024)throw new Error('每批最多 100 份，总大小最多 100 MB');
  const result:Upload[]=[];for(const file of all){if(!/\.pdf$/i.test(file.name)||file.size>20*1024*1024)throw new Error(`${file.name}：请上传不超过 20 MB 的 PDF`);const bytes=new Uint8Array(await file.arrayBuffer());try{const pages=await inspectBoardingPDF(bytes);for(let page=0;page<pages;page++)result.push({file,bytes,pages,page,person:pages===1?match(file.name,eligible):''});if(result.length>100)throw new Error('每批最多 100 页')}catch{throw new Error(`${file.name} 无法读取，请使用未加密、有效的 1–20 页 PDF`)}}
  setFiles(result);setSelected([]);setMessage(`已读取 ${result.length} 张登机牌（按页拆分），请逐页确认对应参会人。`);
 });}
 function jobs(){if(shared){if(files.length!==1)throw new Error('共用模板模式请只上传一份不含固定姓名的 PDF');if(!selected.length)throw new Error('请选择参会人');return selected.map(id=>({upload:files[0],id}));}
  if(!files.length||files.some(f=>!f.person))throw new Error('请为每张登机牌选择对应参会人');const ids=files.map(f=>f.person);if(new Set(ids).size!==ids.length)throw new Error('同一位参会人不能同时分配多份 PDF');return files.map(upload=>({upload,id:upload.person}));}
 async function generate(preview=false){await run(preview?'正在制作个人 PDF 预览…':'正在批量生成个人 PDF…',async()=>{
  const list=jobs();if(list.length>100)throw new Error('每批最多生成 100 份，请分批选择参会人');const names=new Set<string>();const data=await api({action:'invitations',ids:list.map(j=>j.id)}),zip=new JSZip(),mapping=[['编号','姓名','源登机牌','生成文件','个人链接'].map(csvCell).join(',')];
  // Validate the complete assignment before any files are produced.
  if(list.some(j=>!data.items.find((p:any)=>p.id===j.id)))throw new Error('名单状态发生变化，请检查参会人邀请是否有效');
  for(const [i,j] of (preview?list.slice(0,1):list).entries()){const p=data.items.find((p:any)=>p.id===j.id),base=`${p.code}-${p.name}-签到邀请`.replace(/[<>:"/\\|?*]/g,'_');let name=base+'.pdf';if(names.has(name))name=base+'-'+(i+1)+'.pdf';names.add(name);const pdf=await buildBoardingPDF(j.upload.bytes,p.url,await labelPNG(p),j.upload.page,background);
   if(preview){download(new Blob([pdf as BlobPart],{type:'application/pdf'}),name);setMessage('已下载第一份个人 PDF，请确认姓名、登机牌和底部链接后再批量发送。');return;}
   zip.file(name,pdf);mapping.push([p.code,p.name,j.upload.file.name+' · 第 '+(j.upload.page+1)+' 页',name,p.url].map(csvCell).join(','));setMessage(`已生成 ${i+1}/${list.length} 份个人 PDF`);
  }
  zip.file('个人PDF分发清单.csv','\uFEFF'+mapping.join('\r\n'));download(await zip.generateAsync({type:'blob'}),'个人签到邀请PDF.zip');setMessage(`已下载 ${list.length} 份独立的单页 PDF 与分发清单，每位参会人一份，可逐人发送。`);
 });}
 return <section className="panel form-panel"><p className="eyebrow">BOARDING PASS → PERSONAL PDF</p><h2>上传登机牌，生成可直接发送的签到 PDF。</h2><p className="muted">保留原设计，按参考登机牌，在主票底部标语下方添加两行小字，原尺寸不变；个人链接是真实文字，可复制和点击。无需自己贴图。建议上传尚未贴旧签到链接的原始登机牌。</p>
 <label>1 · 上传邀请函登机牌 PDF<input type="file" accept="application/pdf,.pdf" multiple disabled={!!busy} onChange={e=>upload(e.target.files)}/><small>支持多个文件或一个多页 PDF；多页逐页拆成独立邀请。每份最多 20 MB，每批最多 100 页 / 100 MB。文件只在当前浏览器处理，刷新后需重新选择。</small></label>
 <label><input type="checkbox" checked={shared} disabled={!!busy} onChange={e=>setShared(e.target.checked)} style={{width:'auto',display:'inline',marginRight:8}}/>使用一份不含固定姓名的单页共用模板，为多位参会人各生成一份 PDF</label>
 <h3>2 · 确认对应参会人</h3><p className="muted">个人登机牌按“编号-姓名.pdf”命名可自动对应；请确保票面姓名与选择的人一致。</p>
 {shared?<div style={{maxHeight:280,overflowY:'auto'}}><button className="text-button" disabled={!!busy} onClick={()=>setSelected(selected.length===eligible.length?[]:eligible.map(p=>p.id))}>{selected.length===eligible.length?'取消全选':'选择全部有效参会人'}</button>{eligible.map(p=><label key={p.id} style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0'}}><input style={{width:'auto'}} type="checkbox" checked={selected.includes(p.id)} disabled={!!busy} onChange={e=>setSelected(e.target.checked?[...selected,p.id]:selected.filter(id=>id!==p.id))}/>{p.code} · {p.name}</label>)}</div>:<div>{files.map((f,i)=><label key={`${i}-${f.file.name}-${f.page}`}>{f.file.name} · 第 {f.page+1}/{f.pages} 页<select value={f.person} disabled={!!busy} onChange={e=>setFiles(files.map((v,n)=>n===i?{...v,person:e.target.value}:v))}><option value="">请选择对应参会人</option>{eligible.map(p=><option value={p.id} key={p.id}>{p.code} · {p.name}</option>)}</select></label>)}</div>}
 <label>签到区域底色<input type="color" value={background} disabled={!!busy} onChange={e=>setBackground(e.target.value)} style={{width:64,height:36}}/><small>默认匹配你提供的米色登机牌，用于覆盖该位置已有的旧链接。</small></label><h3>3 · 每人一份 PDF，下载后发给员工</h3><div className="button-group"><button className="outline" disabled={!!busy||!files.length} onClick={()=>generate(true)}>下载第一份预览</button><button className="primary" disabled={!!busy||!files.length||!eligible.length} onClick={()=>generate()}>批量生成并下载 PDF</button></div><p role="status" className="muted">{message}</p><div className="callout">先发布会议，再生成正式邀请。下载 ZIP 后按分发清单一对一发送 PDF；员工把 PDF 发给 Agent，说“签到”。生成和预览不会提交签到。</div>
 </section>;
}
