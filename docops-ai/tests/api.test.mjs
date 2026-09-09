import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';import assert from 'node:assert/strict';
const sqlite=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8').replaceAll('--> statement-breakpoint',''));
function statement(sql,args=[]){const stmt=sqlite.prepare(sql);return {bind:(...v)=>statement(sql,v),run:async()=>{const r=stmt.run(...args);return {success:true,meta:{changes:Number(r.changes)}}},all:async()=>({results:stmt.all(...args)}),first:async()=>stmt.get(...args)??null}}
const objects=new Map();globalThis.__TEST_ENV={DB:{prepare:statement,batch:async statements=>{sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}},BUCKET:{put:async(key,bytes,metadata)=>objects.set(key,{body:new Uint8Array(bytes),...metadata}),get:async key=>objects.get(key),delete:async key=>objects.delete(key)}};
async function route(file){const r=await build({entryPoints:[file],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'test-platform',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test-platform'}));b.onLoad({filter:/.*/,namespace:'test-platform'},()=>({contents:'export const env = globalThis.__TEST_ENV;'}))}}]});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'))}
const demo=await route('app/api/demo/route.ts'),documents=await route('app/api/documents/route.ts'),detail=await route('app/api/documents/[id]/route.ts'),files=await route('app/api/files/[id]/route.ts'),exp=await route('app/api/export/route.ts');
const req=(p,opts={})=>new Request('http://docops.test'+p,opts);const params=id=>({params:Promise.resolve({id})});
try{
assert.equal((await demo.POST(req('/api/demo',{method:'POST'}))).status,200);
let res=await documents.GET();let list=(await res.json()).documents;assert.equal(list.length,4);
const bad=list.find(d=>d.id==='demo-inv-1042'),good=list.find(d=>d.id==='demo-inv-1043');
const patch=(id,body)=>detail.PATCH(req('/api/documents/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),params(id));
assert.equal((await patch(bad.id,{revision:0,status:'approved'})).status,400);
assert.equal((await patch(good.id,{revision:0,status:'approved'})).status,200);
assert.equal((await patch(good.id,{revision:0,status:'rejected',note:'stale'})).status,409);
const csv=await (await exp.GET()).text();assert.ok(csv.includes('INV-1043'));assert.ok(!csv.includes('INV-1042'));
const events=await (await detail.GET(req('/api/documents/'+good.id),params(good.id))).json();assert.equal(events.events[0].action,'Approved');
const form=new FormData();const text='Invoice: INV-API\nVendor: Testing\nDate: 2026-09-09\nCurrency: INR\nTotal: 100';form.set('kind','invoice');form.set('text',text);form.set('file',new File([text],'test.txt',{type:'text/plain'}));
res=await documents.POST(req('/api/documents',{method:'POST',body:form}));assert.equal(res.status,201);const added=await res.json();assert.equal(await (await files.GET(req('/api/files/'+added.document.id),params(added.document.id))).text(),text);
assert.equal((await demo.POST(req('/api/demo',{method:'POST',headers:{Origin:'https://wrong.test'}}))).status,400);
console.log('API checks passed in-process: persistence, mismatch blocking, approval, stale revisions, CSV exclusion, transactional audit, upload/original retrieval and origin rejection.');
}finally{sqlite.close();delete globalThis.__TEST_ENV}
