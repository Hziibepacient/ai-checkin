import assert from 'node:assert/strict';
import fs from 'node:fs';
import JSZip from 'jszip';
import {PDFDocument,degrees,PDFName,PDFString} from 'pdf-lib';
import {buildBoardingPDF,inspectBoardingPDF} from '../lib/boarding-pdf.ts';
const url='https://example.test/i/c-'+'0'.repeat(52);
const label=fs.existsSync('.sites-runtime/header-label.png')?fs.readFileSync('.sites-runtime/header-label.png'):undefined;
fs.mkdirSync('outputs/pdf-qa',{recursive:true});
const combined=await PDFDocument.create();
for(const [i,name] of ['格式工厂PicPDF img_v3.pdf','格式工厂PicPDF img_v3~1.pdf'].entries()){
 const source=fs.readFileSync('C:/FFOutput/'+name);assert.equal(await inspectBoardingPDF(source),1);
 const one=await buildBoardingPDF(source,url,label),original=await PDFDocument.load(source),result=await PDFDocument.load(one);
 assert.equal(result.getPageCount(),1);assert.equal(result.getPage(0).getWidth(),original.getPage(0).getWidth());assert.equal(result.getPage(0).getHeight(),original.getPage(0).getHeight());
 fs.writeFileSync(`outputs/pdf-qa/boarding-position-${i+1}.pdf`,one);combined.addPage((await combined.copyPages(original,[0]))[0]);
}
const bytes=await combined.save(),zip=new JSZip();
for(let i=0;i<2;i++){const invite=url.slice(0,-1)+(i?'g':'0'),result=await buildBoardingPDF(bytes,invite,label,i),pdf=await PDFDocument.load(result);assert.equal(pdf.getPageCount(),1);const annotation=pdf.getPage(0).node.lookup(PDFName.of('Annots'));const a=pdf.context.lookup(annotation.get(0));assert.equal(a.lookup(PDFName.of('A')).lookup(PDFName.of('URI'),PDFString).decodeText(),invite);zip.file(`${i+1}-参会人.pdf`,result);}
const loaded=await JSZip.loadAsync(await zip.generateAsync({type:'uint8array'}));assert.equal(Object.keys(loaded.files).length,2);for(const f of Object.values(loaded.files))assert.equal((await PDFDocument.load(await f.async('uint8array'))).getPageCount(),1);
const synthetic=await PDFDocument.create();for(const angle of [0,90,180,270]){const p=synthetic.addPage([1600,1000]);p.drawText('PAGE '+angle,{x:80,y:800,size:24});p.setCropBox(40,40,1520,920);p.setRotation(degrees(angle));}
const rotated=await synthetic.save();for(let i=0;i<4;i++){const r=await PDFDocument.load(await buildBoardingPDF(rotated,url,label,i)),p=r.getPage(0);assert.equal(r.getPageCount(),1);assert.equal(p.getWidth(),i%2?920:1520);assert.equal(p.getHeight(),i%2?1520:920);}
await assert.rejects(()=>buildBoardingPDF(bytes,url,label,2));await assert.rejects(()=>inspectBoardingPDF(new Uint8Array([1,2,3])));
console.log('PASS: reference placement/original dimensions; two-page input → two separate single-page PDFs with distinct URI links; rotation, crop and invalid page checks.');
