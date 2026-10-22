// Synthetic comparison with a Git revision. No .env, remote DB or real guest data.
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { JSDOM } from 'jsdom';
import { gzipSync } from 'node:zlib';
import { createDatabase, testAdapter, family, ADMIN } from '../tests/helpers.js';
const baselinePath = new URL('../server/.performance-baseline.js',import.meta.url);
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
const baselineRef = process.argv[2] || 'f42ae38';
const getBaseline = file => execFileSync('git',['show',`${baselineRef}:${file}`],{encoding:'utf8'});
const frontend = await readFile(new URL('../public/app.js',import.meta.url),'utf8');
await writeFile(baselinePath,getBaseline('server/app.js'));
try {
  const variants = [
    ['before',(await import(baselinePath.href)).createApp,getBaseline('public/app.js')],
    ['after',(await import('../server/app.js')).createApp,frontend],
  ];
  const results=[];
  for(const [variant,createApp,js] of variants) {
    const db=await createDatabase(); let server,dom;
    try {
      const fixture=await family(db);
      const cookie='a'.repeat(64),csrf='b'.repeat(64);
      await db.query('insert into public.invitation_tokens(invitation_id,token_hash) values($1,$2)',[fixture.id,'c'.repeat(64)]);
      const {createHash}=await import('node:crypto');
      await db.query("insert into public.app_sessions(token_hash,csrf_token,invitation_id,invitation_token_id,expires_at) values($1,$2,$3,1,now()+interval '1 day')",[createHash('sha256').update(cookie).digest('hex'),csrf,fixture.id]);
      const adapter=testAdapter(db); let queries=0;
      const wrap = query => new Proxy(query,{get(target,key){
        if(key==='then') return (resolve,reject) => {queries++;return delay(100).then(()=>target).then(resolve,reject);};
        if(typeof target[key]==='function') return (...args)=>{const value=target[key](...args);return value===target?wrap(target):value;};
        return target[key];
      }});
      const remote={...adapter,from:table=>wrap(adapter.from(table))};
      const config={origin:'http://localhost:3000',bucket:'wedding-gifts'};
      server=createApp(config,{db:remote,login:async()=>({id:ADMIN})}).listen(0,'127.0.0.1');await once(server,'listening');
      config.origin=`http://127.0.0.1:${server.address().port}`;
      const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
      dom=new JSDOM(html,{url:config.origin+'/convite',runScripts:'outside-only'});
      const window=dom.window;window.scrollTo=()=>{};
      const requests=[];
      window.fetch=async(path,options={})=>{
        requests.push(path);await delay(50);
        return fetch(new URL(path,config.origin),{...options,headers:{...options.headers,Cookie:`wedding_session=${cookie}`}});
      };
      const started=performance.now();await window.eval(`(async()=>{${js}\nwindow.perfNavigate = navigate;})()`);
      const initial={ms:Math.round(performance.now()-started),requests:requests.length,queries};
      requests.length=0;queries=0;
      const nav=performance.now();await window.perfNavigate('/convite/presentes');
      results.push({variant,initial,navigation:{ms:Math.round(performance.now()-nav),requests:requests.length,queries},jsBytes:Buffer.byteLength(js),gzipJsBytes:gzipSync(js).length});
    } finally {dom?.window.close();if(server)await new Promise(resolve=>server.close(resolve));await db.close();}
  }
  console.log(JSON.stringify({conditions:'JSDOM + local HTTP/PGlite; 50ms per API request, 100ms per simulated DB round trip; no asset download/rendering',results},null,2));
} finally {await unlink(baselinePath);}
