import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readableTicket,normalizeTicket} from '../lib/tokens.ts';
for(const bytes of [Buffer.alloc(32),Buffer.alloc(32,255),...Array.from({length:256},()=>randomBytes(32))]){
 const original=bytes.toString('base64url'),encoded=readableTicket(original);
 assert.match(encoded,/^c-[0123456789abcdefghjkmnpqrstvwxyz]{52}$/);
 assert.equal(normalizeTicket(original),original);
 assert.equal(normalizeTicket(encoded),original);
 assert.equal(normalizeTicket(encoded.toUpperCase()),original);
 assert.equal(normalizeTicket(encoded.replaceAll('0','O').replaceAll('1','l')),original);
 assert.equal(normalizeTicket(encoded.replaceAll('1','I')),original);
 const badPadding=encoded.slice(0,-1)+'1';assert.equal(normalizeTicket(badPadding),null);
}
assert.equal(normalizeTicket('c-'+ 'u'.repeat(52)),null);
assert.equal(normalizeTicket('c-'+ '0'.repeat(51)),null);
assert.equal(normalizeTicket('c-'+ '0'.repeat(53)),null);
assert.equal(normalizeTicket('c-'+ '0'.repeat(51)+'!'),null);
console.log('PASS: 258 ticket round trips, case/O/I/L aliases, padding and malformed-input checks.');
