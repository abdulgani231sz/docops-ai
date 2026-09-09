import {env} from 'cloudflare:workers';
import type {Doc} from './documents';
export function database(){if(!env.DB)throw new Error('Document storage is unavailable. Please try again.');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error('File storage is unavailable. Please try again.');return env.BUCKET;}
export function decode(r:Record<string,unknown>):Doc{return {id:String(r.id),kind:r.kind as Doc['kind'],filename:String(r.filename),fileKey:r.file_key as string|null,hash:String(r.hash),fields:JSON.parse(String(r.fields)),text:String(r.source_text),method:String(r.method),status:r.status as Doc['status'],note:String(r.note),createdAt:String(r.created_at),revision:Number(r.revision)}}
export async function list(){const r=await database().prepare('SELECT * FROM documents ORDER BY created_at DESC').all();return r.results.map(decode)}
export async function insert(d:Doc){return database().prepare('INSERT OR IGNORE INTO documents (id,kind,filename,file_key,hash,fields,source_text,method,status,note,created_at,revision) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(d.id,d.kind,d.filename,d.fileKey,d.hash,JSON.stringify(d.fields),d.text,d.method,d.status,d.note,d.createdAt,d.revision).run()}
export function checkOrigin(r:Request){const o=r.headers.get('origin');if(o&&o!==new URL(r.url).origin)throw new Error('Cross-origin changes are not allowed.');}
export const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
export function failure(e:unknown){console.error('DocOps request failed',e instanceof Error?e.message:'Unknown error');return json({error:e instanceof Error?e.message:'The request could not be completed.'},400)}
