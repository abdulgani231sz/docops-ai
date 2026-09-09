import {database,list,json,failure,checkOrigin} from '@/lib/storage';
import {issuesFor} from '@/lib/documents';
import {z} from 'zod';
const n=z.number().finite().min(0).max(1e12);
const fields=z.object({number:z.string().max(150),vendor:z.string().max(250),poNumber:z.string().max(150),date:z.string().max(80),currency:z.string().regex(/^[A-Z]{3}$/),subtotal:n.nullable(),tax:n.nullable(),total:n.nullable(),items:z.array(z.object({description:z.string().min(1).max(250),quantity:n,unitPrice:n,amount:n})).max(200)});
export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;return json({events:(await database().prepare('SELECT action,detail,created_at FROM audit WHERE document_id=? ORDER BY created_at DESC').bind(id).all()).results})}catch(e){return failure(e)}}
export async function PATCH(r:Request,{params}:{params:Promise<{id:string}>}){try{checkOrigin(r);const {id}=await params;const body=z.object({revision:z.number().int(),fields:fields.optional(),status:z.enum(['review','approved','rejected']).optional(),note:z.string().max(2000).default('')}).parse(await r.json());const docs=await list(),d=docs.find(d=>d.id===id);if(!d)return json({error:'Document not found.'},404);if(body.revision!==d.revision)return json({error:'This document changed. Reload before saving.'},409);
 const next={...d,fields:body.fields??d.fields,status:body.fields?'review' as const:body.status??d.status,note:body.note};
 if(next.status==='approved'&&issuesFor(next,docs.map(x=>x.id===id?next:x)).length)throw new Error('Resolve all checks before approval.');
 if(next.status==='rejected'&&!body.note.trim())throw new Error('Add a reason before rejecting.');
 const token=crypto.randomUUID();const approvedPo=next.status==='approved'&&next.kind==='invoice'?docs.find(x=>x.kind==='po'&&x.fields.number.toLowerCase().replace(/[^a-z0-9]/g,'')===next.fields.poNumber.toLowerCase().replace(/[^a-z0-9]/g,''))?.id??null:null;
 const result=await database().batch([
 database().prepare('UPDATE documents SET fields=?,status=?,note=?,revision=revision+1,update_token=?,approved_po=? WHERE id=? AND revision=?').bind(JSON.stringify(next.fields),next.status,next.note,token,approvedPo,id,body.revision),
 database().prepare('INSERT INTO audit (id,document_id,action,detail,created_at) SELECT ?,id,?,?,? FROM documents WHERE id=? AND update_token=?').bind(crypto.randomUUID(),body.fields?'Fields corrected':next.status==='approved'?'Approved':next.status==='rejected'?'Rejected':'Reopened',body.note||'Document reviewed in workspace',new Date().toISOString(),id,token)
 ]);if(!result[0].meta.changes)return json({error:'This document changed. Reload before saving.'},409);
 return json({ok:true});
 }catch(e){return failure(e)}}
