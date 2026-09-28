// Crockford base32 keeps the original 256-bit ticket while tolerating O/0 and I/L/1.
const alphabet='0123456789abcdefghjkmnpqrstvwxyz';
export function readableTicket(ticket:string){
 if(!/^[\w-]{43}$/.test(ticket))throw new Error('Invalid ticket');
 const bytes=Uint8Array.from(atob(ticket.replaceAll('-','+').replaceAll('_','/')+'='),c=>c.charCodeAt(0));
 let buffer=0,bits=0,out='';
 for(const byte of bytes){buffer=(buffer<<8)|byte;bits+=8;while(bits>=5){bits-=5;out+=alphabet[(buffer>>>bits)&31];}buffer&=(1<<bits)-1;}
 if(bits)out+=alphabet[(buffer<<(5-bits))&31];
 return 'c-'+out;
}
export function normalizeTicket(value:string){
 if(/^[\w-]{43}$/.test(value))return value; // Existing invitations remain case-sensitive.
 if(!/^c-[a-z0-9]{52}$/i.test(value))return null;
 const payload=value.slice(2).toLowerCase().replaceAll('o','0').replace(/[il]/g,'1');
 let buffer=0,bits=0;const bytes:number[]=[];
 for(const c of payload){const n=alphabet.indexOf(c);if(n<0)return null;buffer=(buffer<<5)|n;bits+=5;if(bits>=8){bits-=8;bytes.push((buffer>>>bits)&255);}buffer&=(1<<bits)-1;}
 if(bytes.length!==32||buffer!==0)return null;
 return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}
