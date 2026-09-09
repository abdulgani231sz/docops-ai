export const demoPo=`PURCHASE ORDER
PO: PO-2026-041
Vendor: Meridian Office Supply
Date: 2026-09-01
Currency: INR
Description | Quantity | Unit price | Amount
Ergonomic desk chair | 8 | 6500 | 52000
Monitor arm | 8 | 2400 | 19200
Subtotal: 71200
Tax: 12816
Total: 84016`;
export const demoInvoice=`INVOICE
Invoice: INV-1042
PO: PO-2026-041
Vendor: Meridian Office Supply
Date: 2026-09-08
Currency: INR
Description | Quantity | Unit price | Amount
Ergonomic desk chair | 10 | 6500 | 65000
Monitor arm | 8 | 2400 | 19200
Subtotal: 84200
Tax: 15156
Total: 99356`;
export const demoSamples=[{id:'demo-po-041',kind:'po' as const,text:demoPo,filename:'PO-2026-041.txt'},{id:'demo-inv-1042',kind:'invoice' as const,text:demoInvoice,filename:'Meridian-INV-1042.txt'},{id:'demo-po-042',kind:'po' as const,text:demoPo.replaceAll('PO-2026-041','PO-2026-042').replaceAll('Meridian Office Supply','Northstar Equipment'),filename:'PO-2026-042.txt'},{id:'demo-inv-1043',kind:'invoice' as const,text:demoPo.replace('PURCHASE ORDER','INVOICE\nInvoice: INV-1043').replaceAll('PO-2026-041','PO-2026-042').replaceAll('Meridian Office Supply','Northstar Equipment'),filename:'Northstar-INV-1043.txt'}];
