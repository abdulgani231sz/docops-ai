export type Item={description:string;quantity:number;unitPrice:number;amount:number};
export type Fields={number:string;vendor:string;poNumber:string;date:string;currency:string;subtotal:number|null;tax:number|null;total:number|null;items:Item[]};
export type Doc={id:string;kind:'invoice'|'po';filename:string;fileKey:string|null;hash:string;fields:Fields;text:string;method:string;status:'review'|'approved'|'rejected';note:string;createdAt:string;revision:number};
export type Issue={label:string;detail:string};
export const money=(n:number|null,c='INR')=>n===null?'Not found':new Intl.NumberFormat('en-IN',{style:'currency',currency:/^[A-Z]{3}$/.test(c)?c:'XXX',maximumFractionDigits:2}).format(n);
const amount=(s:string|undefined):number|null=>{if(!s?.trim()||!/[0-9]/.test(s))return null;const n=Number(s.replace(/[^\d.-]/g,''));return Number.isFinite(n)?n:null};
const normalized=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
export function extract(text:string,kind:'invoice'|'po'):Fields{
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const value=(patterns:RegExp[])=>{for(const p of patterns){for(const l of lines){const m=l.match(p);if(m)return m[1].trim()}}return ''};
 const number=value(kind==='invoice'?[/^invoice\s*(?:number|no\.?|#|id)?\s*[:#-]\s*(.+)$/i,/^invoice\s+(?:number|no\.?|#|id)\s+(.+)$/i]:[/^(?:purchase\s*order|po)\s*(?:number|no\.?|#|id)?\s*[:#-]\s*(.+)$/i]);
 const vendor=value([/^(?:vendor|supplier|seller|from)(?:\s*name)?\s*:\s*(.+)$/i]);
 const poNumber=value([/^(?:purchase\s*order|po)\s*(?:number|no\.?|#|id)?\s*[:#-]\s*(.+)$/i]);
 const date=value([/^(?:invoice\s*|order\s*)?date\s*:\s*(.+)$/i]);
 const currency=value([/^currency\s*:\s*([A-Z]{3})$/i]).toUpperCase()||(text.includes('₹')||/\bINR\b/.test(text)?'INR':text.includes('$')?'USD':'');
 const total=amount(value([/^(?:grand\s*total|invoice\s*total|amount\s*due|total\s*amount|total)\s*:?\s+([\d₹$€£].*)$/i]));
 const subtotal=amount(value([/^sub[ -]?total\s*:?\s+([\d₹$€£].*)$/i]));
 const tax=amount(value([/^(?:tax|gst|vat)(?:\s*amount)?\s*:?\s+([\d₹$€£].*)$/i]));
 const items:Item[]=[];
 for(const l of lines){const parts=l.split(/\s*\|\s*|\t+|\s{2,}/);if(parts.length===4){const q=amount(parts[1]),p=amount(parts[2]),a=amount(parts[3]);if(q!==null&&p!==null&&a!==null&&parts[0]&&!/^(?:total|tax|subtotal)$/i.test(parts[0]))items.push({description:parts[0],quantity:q,unitPrice:p,amount:a})}}
 return {number,vendor,poNumber:kind==='po'?number:poNumber,date,currency,subtotal,tax,total,items};
}
export function issuesFor(doc:Doc,docs:Doc[]):Issue[]{
 const f=doc.fields,out:Issue[]=[];
 for(const [key,label] of [['number','Document number'],['vendor','Vendor'],['date','Date'],['currency','Currency']] as const)if(!f[key])out.push({label:`${label} missing`,detail:'Check the original document and correct the extracted fields.'});
 for(const key of ['subtotal','tax','total'] as const)if(f[key]===null)out.push({label:key+' missing',detail:'Enter the value from the source, including an explicit zero for no tax.'});
 if(!f.items.length)out.push({label:'Line items need review',detail:'No structured line items were found. Add the description, quantity, unit price and amount.'});
 for(const item of f.items){if(Math.abs(item.quantity*item.unitPrice-item.amount)>0.02)out.push({label:'Line calculation mismatch',detail:`${item.description}: quantity × unit price does not equal the line amount.`});}
 const sum=f.items.reduce((a,i)=>a+i.amount,0);
 if(f.items.length&&f.subtotal!==null&&Math.abs(sum-f.subtotal)>0.02)out.push({label:'Subtotal mismatch',detail:'The sum of line amounts differs from the stated subtotal.'});
 if(f.subtotal!==null&&f.tax!==null&&f.total!==null&&Math.abs(f.subtotal+f.tax-f.total)>0.02)out.push({label:'Total calculation mismatch',detail:'Subtotal plus tax differs from the stated total.'});
 if(doc.kind==='invoice'){
  if(f.poNumber&&docs.some(d=>d.id!==doc.id&&d.kind==='invoice'&&d.status==='approved'&&normalized(d.fields.poNumber)===normalized(f.poNumber)))out.push({label:'PO already invoiced',detail:'Another approved invoice uses this purchase order. Partial or split invoicing is not supported in this version.'});
  if(docs.some(d=>d.id!==doc.id&&d.kind==='invoice'&&((f.number&&normalized(d.fields.number)===normalized(f.number)&&normalized(d.fields.vendor)===normalized(f.vendor))||d.hash===doc.hash)))out.push({label:'Possible duplicate',detail:'Another invoice has the same vendor and invoice number, or identical source bytes.'});
  const matches=docs.filter(d=>d.kind==='po'&&f.poNumber&&normalized(d.fields.number)===normalized(f.poNumber));const po=matches[0];if(matches.length>1)out.push({label:'Ambiguous purchase order',detail:'Multiple purchase orders use this reference. Correct their document numbers before approval.'});
  if(!po)out.push({label:'Purchase order not found',detail:f.poNumber?`Upload ${f.poNumber} or correct the PO reference.`:'Add a purchase-order reference and upload the matching PO.'});
  else{
   if(normalized(po.fields.vendor)!==normalized(f.vendor))out.push({label:'Vendor mismatch',detail:`Purchase order vendor: ${po.fields.vendor||'not found'}.`});
   if(po.fields.currency!==f.currency)out.push({label:'Currency mismatch',detail:`Purchase order currency: ${po.fields.currency||'not found'}.`});
   if(!po.fields.items.length)out.push({label:'PO items missing',detail:'Review the purchase-order extraction first.'});
   const seen=new Set<string>();
   for(const item of f.items){const k=normalized(item.description);if(seen.has(k))out.push({label:'Repeated line item',detail:`${item.description}: combine or review repeated rows.`});seen.add(k);const p=po.fields.items.find(i=>normalized(i.description)===k);if(!p)out.push({label:'Unmatched item',detail:`${item.description} is not on the purchase order.`});else {if(item.quantity!==p.quantity)out.push({label:'Quantity mismatch',detail:`${item.description}: invoice ${item.quantity}, purchase order ${p.quantity}.`});if(Math.abs(item.unitPrice-p.unitPrice)>0.02)out.push({label:'Unit price mismatch',detail:`${item.description}: invoice ${item.unitPrice}, purchase order ${p.unitPrice}.`});}}
   if(po.fields.items.some(p=>!f.items.some(i=>normalized(i.description)===normalized(p.description))))out.push({label:'PO items missing from invoice',detail:'This first version expects a complete, one-to-one purchase-order match.'});
  }
 }
 return out;
}
export function csvCell(value:unknown){let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
