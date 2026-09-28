import {PDFDocument,StandardFonts,PDFName,PDFString,rgb,degrees} from 'pdf-lib';
export async function inspectBoardingPDF(bytes:Uint8Array){
 const pdf=await PDFDocument.load(bytes);const count=pdf.getPageCount();
 if(!count||count>20)throw new Error('每份登机牌需为 1–20 页 PDF');
 return count;
}
export async function buildBoardingPDF(bytes:Uint8Array,url:string,labelPNG?:Uint8Array){
 if(!/^https?:\/\//.test(url)||url.length>300)throw new Error('个人链接无效');
 const source=await PDFDocument.load(bytes);if(!source.getPageCount()||source.getPageCount()>20)throw new Error('每份登机牌需为 1–20 页 PDF');
 const out=await PDFDocument.create(),font=await out.embedFont(StandardFonts.Helvetica),bold=await out.embedFont(StandardFonts.HelveticaBold);
 const label=labelPNG?await out.embedPng(labelPNG):null;
 for(const original of source.getPages()){
  const crop=original.getCropBox(),rotation=((original.getRotation().angle%360)+360)%360;
  if(![0,90,180,270].includes(rotation))throw new Error('不支持此 PDF 页面旋转角度');
  const w=crop.width,h=crop.height,width=rotation%180?h:w,height=rotation%180?w:h;
  if(width<200)throw new Error('PDF 页面过窄，请使用正常尺寸的登机牌');
  const footer=70,page=out.addPage([width,height+footer]);
  const image=await out.embedPage(original,{left:crop.x,bottom:crop.y,right:crop.x+w,top:crop.y+h});
  const position=rotation===0?{x:0,y:footer}:rotation===90?{x:0,y:footer+w}:rotation===180?{x:w,y:footer+h}:{x:h,y:footer};
  page.drawPage(image,{...position,width:w,height:h,rotate:degrees(-rotation)});
  page.drawRectangle({x:0,y:0,width,height:footer,color:rgb(1,1,1)});
  page.drawLine({start:{x:12,y:footer-1},end:{x:width-12,y:footer-1},thickness:.5,color:rgb(.8,.8,.8)});
  if(label)page.drawImage(label,{x:14,y:43,width:Math.min(width-28,480),height:18});
  else page.drawText('AI CHECK-IN',{x:14,y:48,size:12,font:bold});
  const instruction='PERSONAL CHECK-IN LINK | Ask your Agent to check in using this URL.';
  let instructionSize=9;while(font.widthOfTextAtSize(instruction,instructionSize)>width-28)instructionSize-=.25;
  page.drawText(instruction,{x:14,y:29,size:instructionSize,font,color:rgb(.25,.25,.25)});
  let size=12;while(font.widthOfTextAtSize(url,size)>width-28)size-=.25;
  if(size<5)throw new Error('PDF 太窄，无法清晰放下个人链接，请换用横版登机牌');
  page.drawText(url,{x:14,y:12,size,font,color:rgb(.05,.2,.35)});
  const link=out.context.obj({Type:'Annot',Subtype:'Link',Rect:[12,4,width-12,25],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(url)}});
  page.node.set(PDFName.of('Annots'),out.context.obj([out.context.register(link)]));
 }
 out.setTitle('Personal boarding invitation');out.setSubject('Personal check-in link in footer');
 return out.save();
}
