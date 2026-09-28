import {PDFDocument,StandardFonts,PDFName,PDFString,rgb,degrees} from 'pdf-lib';
export async function inspectBoardingPDF(bytes:Uint8Array){
 const pdf=await PDFDocument.load(bytes);const count=pdf.getPageCount();
 if(!count||count>20)throw new Error('每份登机牌需为 1–20 页 PDF');
 return count;
}
export async function buildBoardingPDF(bytes:Uint8Array,url:string,labelPNG?:Uint8Array,pageIndex=0){
 if(!/^https?:\/\//.test(url)||url.length>300)throw new Error('个人链接无效');
 const source=await PDFDocument.load(bytes);if(!source.getPageCount()||source.getPageCount()>20)throw new Error('每份登机牌需为 1–20 页 PDF');
 const out=await PDFDocument.create(),font=await out.embedFont(StandardFonts.Helvetica),bold=await out.embedFont(StandardFonts.HelveticaBold);
 const label=labelPNG?await out.embedPng(labelPNG):null;
 if(!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>=source.getPageCount())throw new Error('请选择有效的登机牌页码');
 for(const original of [source.getPage(pageIndex)]){
  const crop=original.getCropBox(),rotation=((original.getRotation().angle%360)+360)%360;
  if(![0,90,180,270].includes(rotation))throw new Error('不支持此 PDF 页面旋转角度');
  const w=crop.width,h=crop.height,width=rotation%180?h:w,height=rotation%180?w:h;
  if(width<200)throw new Error('PDF 页面过窄，请使用正常尺寸的登机牌');
  const footer=0,page=out.addPage([width,height]);
  const image=await out.embedPage(original,{left:crop.x,bottom:crop.y,right:crop.x+w,top:crop.y+h});
  const position=rotation===0?{x:0,y:footer}:rotation===90?{x:0,y:footer+w}:rotation===180?{x:w,y:footer+h}:{x:h,y:footer};
  page.drawPage(image,{...position,width:w,height:h,rotate:degrees(-rotation)});
  // Match the reference: below SAME SKY, inside the main ticket. No added page band.
  const x=width*.35,boxWidth=width*.51,y=height*.013;
  if(label)page.drawImage(label,{x,y:height*.043,width:Math.min(boxWidth,400),height:15});
  else page.drawText('AI CHECK-IN / Send this PDF to your Agent and say CHECK IN.',{x,y:height*.050,size:Math.min(10,height*.018),font:bold});
  if(label)page.drawText('AI CHECK-IN / Send this PDF to your Agent and say CHECK IN.',{x,y:height*.050,size:8,font,opacity:0});
  let size=Math.min(10,height*.016);while(font.widthOfTextAtSize(url,size)>boxWidth)size-=.25;
  if(size<4)throw new Error('链接区域过窄，请使用横版登机牌');
  page.drawText(url,{x,y,size,font,color:rgb(.05,.05,.05)});
  const link=out.context.obj({Type:'Annot',Subtype:'Link',Rect:[x,y-2,x+boxWidth,y+size+3],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(url)}});
  page.node.set(PDFName.of('Annots'),out.context.obj([out.context.register(link)]));
 }
 out.setTitle('Personal boarding invitation');out.setSubject('Personal check-in link on main boarding pass');
 return out.save();
}
