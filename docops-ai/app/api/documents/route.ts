import {list,insert,bucket,json,failure,checkOrigin} from '@/lib/storage';
import {extract,type Doc} from '@/lib/documents';
export async function GET(){try{return json({documents:await list()})}catch(e){return failure(e)}}
export async function POST(r:Request){try{
 checkOrigin(r);const length=Number(r.headers.get('content-length')||0);if(length>12*1024*1024)throw new Error('File is too large. Limit: 10 MB.');
 const form=await r.formData(),file=form.get('file'),text=String(form.get('text')||''),kind=form.get('kind'),method=String(form.get('method')||'pasted text');
 if(kind!=='invoice'&&kind!=='po')throw new Error('Choose an invoice or purchase order.');
 if(text.length<5||text.length>100000)throw new Error('Provide readable document text (5–100,000 characters).');
 const id=crypto.randomUUID();let fileKey:string|null=null,filename=kind+'.txt',bytes:ArrayBuffer=new TextEncoder().encode(text).buffer;
 if(file instanceof File){if(file.size>10*1024*1024)throw new Error('File is too large. Limit: 10 MB.');if(!['application/pdf','image/png','image/jpeg','text/plain'].includes(file.type))throw new Error('Use PDF, PNG, JPG or TXT.');bytes=await file.arrayBuffer();filename=file.name.slice(0,180);fileKey=id;}
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const existing=await list();if(existing.some(d=>d.hash===hash&&d.kind===kind))throw new Error('This exact document is already in your workspace.');
 if(fileKey&&file instanceof File)await bucket().put(fileKey,bytes,{httpMetadata:{contentType:file.type}});
 const d:Doc={id,kind,filename,fileKey,hash,fields:extract(text,kind),text,method:method.slice(0,80),status:'review' as const,note:'',createdAt:new Date().toISOString(),revision:0};
 try{await insert(d)}catch(e){if(fileKey)await bucket().delete(fileKey);throw e}return json({document:d},201);
 }catch(e){return failure(e)}}
