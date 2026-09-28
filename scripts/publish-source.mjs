// Fallback for the missing Sites workflow helper. Token is read only from stdin,
// held in memory, and passed to git via its scoped environment config.
import readline from 'node:readline';
import {spawnSync} from 'node:child_process';
const rl=readline.createInterface({input:process.stdin,terminal:false});
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdout.write('Ready for source credential JSON on stdin.\n');
for await(const line of rl){
 const c=JSON.parse(line);rl.close();
 if(c.auth_mode!=='http_extra_header')throw new Error('Unsupported credential mode');
 const remote=new URL(c.remote_url);if(remote.protocol!=='https:')throw new Error('HTTPS required');
 const env={...process.env,GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'2',GIT_CONFIG_KEY_0:`http.${remote.origin}/.extraHeader`,GIT_CONFIG_VALUE_0:`Authorization: Bearer ${c.token}`,GIT_CONFIG_KEY_1:'credential.helper',GIT_CONFIG_VALUE_1:''};
 const r=spawnSync('git',['push',c.remote_url,`HEAD:refs/heads/${c.branch}`],{env,encoding:'utf8'});
 if(r.status!==0){console.error((r.stderr||'Push failed').replaceAll(c.token,'[redacted]'));process.exit(r.status||1)}
 console.log('Source push succeeded.');break;
}
