import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const archive=process.argv[2];
if(!archive)throw new Error('Usage: node scripts/verify-package.mjs <archive.tar.gz>');
const result=spawnSync(process.platform==='win32'?'tar.exe':'tar',['-tf',archive],{encoding:'utf8'});
assert.equal(result.status,0,result.stderr);
const entries=new Set(result.stdout.split(/\r?\n/).map(x=>x.replace(/^\.\//,'')));
assert(entries.has('dist/server/index.js'),'Missing Worker entrypoint');
assert(entries.has('dist/.openai/hosting.json'),'Hosting manifest must be under dist/.openai');
for(const file of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql'))){assert(entries.has(`dist/.openai/drizzle/${file}`),`Missing deployment migration: ${file}`);}
assert(![...entries].some(x=>/(^|\/)\.dev\.vars|(^|\/)\.env(?:$|\.)/.test(x)),'Archive contains runtime secrets');
console.log('PASS: Worker, hosting manifest and all database migrations are in deployment-recognized paths.');
