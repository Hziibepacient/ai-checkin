import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PDFDocument,degrees,PDFName,PDFString} from 'pdf-lib';
import {buildBoardingPDF,inspectBoardingPDF} from '../lib/boarding-pdf.ts';
const url='https://example.test/i/c-'+'0'.repeat(52);
fs.mkdirSync('outputs/pdf-qa',{recursive:true});
const source=fs.readFileSync('C:/FFOutput/格式工厂PicPDF img_v3.pdf');
assert.equal(await inspectBoardingPDF(source),1);
const one=await buildBoardingPDF(source,url);
fs.writeFileSync('outputs/pdf-qa/boarding-original-footer.pdf',one);
const original=await PDFDocument.load(source),result=await PDFDocument.load(one);
assert.equal(result.getPageCount(),1);
assert.equal(result.getPage(0).getWidth(),original.getPage(0).getWidth());
assert.equal(result.getPage(0).getHeight(),original.getPage(0).getHeight()+70);
const synthetic=await PDFDocument.create();
for(const rotation of [0,90,180,270]){const p=synthetic.addPage([640,320]);p.drawText('TOP LEFT '+rotation,{x:60,y:260,size:24});p.drawText('BOTTOM RIGHT',{x:300,y:60,size:24});p.setCropBox(40,40,560,240);p.setRotation(degrees(rotation));}
const rotated=await buildBoardingPDF(await synthetic.save(),url);
fs.writeFileSync('outputs/pdf-qa/boarding-rotation-footer.pdf',rotated);
const r=await PDFDocument.load(rotated);
for(let i=0;i<4;i++){const p=r.getPage(i);assert.equal(p.getWidth(),i%2?240:560);assert.equal(p.getHeight(),(i%2?560:240)+70);const annotations=p.node.lookup(PDFName.of('Annots'));const a=r.context.lookup(annotations.get(0));assert.equal(a.lookup(PDFName.of('A')).lookup(PDFName.of('URI'),PDFString).decodeText(),url);}
await assert.rejects(()=>inspectBoardingPDF(new Uint8Array([1,2,3])));
const empty=await PDFDocument.create();const many=await PDFDocument.create();for(let i=0;i<21;i++)many.addPage();await assert.rejects(async()=>inspectBoardingPDF(await many.save()));
console.log('PASS: original size/content, multipage crop/rotation, clickable URI and malformed/oversized PDFs.');

