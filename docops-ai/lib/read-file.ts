export async function readDocument(file:File,onProgress:(s:string)=>void):Promise<{text:string;method:string}>{
 if(file.size>10*1024*1024)throw new Error('Choose a file smaller than 10 MB.');
 if(file.type==='text/plain'||file.name.toLowerCase().endsWith('.txt'))return {text:await file.text(),method:'Text import'};
 let worker:Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>|undefined;
 const ocr=async(image:File|HTMLCanvasElement)=>{if(!worker){onProgress('Loading English OCR…');const {createWorker}=await import('tesseract.js');worker=await createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/ocr',logger:m=>{if(m.status==='recognizing text')onProgress(`Reading text · ${Math.round(m.progress*100)}%`)}});await worker.setParameters({preserve_interword_spaces:'1'})}return (await worker.recognize(image)).data.text};
 try{
  if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')){
   onProgress('Opening PDF…');const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc='/pdf/pdf.worker.min.mjs';
   const task=pdfjs.getDocument({data:await file.arrayBuffer()});const pdf=await task.promise;
   try{if(pdf.numPages>5)throw new Error('This version supports up to 5 PDF pages. Split larger documents first.');const pages:string[]=[];let usedOcr=false;
    for(let p=1;p<=pdf.numPages;p++){onProgress(`Reading page ${p} of ${pdf.numPages}…`);const page=await pdf.getPage(p),content=await page.getTextContent();const rows=new Map<number,{x:number;text:string}[]>();
     for(const item of content.items){if('str' in item){const y=Math.round(item.transform[5]/3)*3;const row=rows.get(y)||[];row.push({x:item.transform[4],text:item.str});rows.set(y,row)}}
     let text=[...rows.entries()].sort((a,b)=>b[0]-a[0]).map(([,r])=>r.sort((a,b)=>a.x-b.x).map(i=>i.text).join('  ')).join('\n');
     if(text.trim().length<30){usedOcr=true;const base=page.getViewport({scale:1});const scale=Math.min(2,2200/Math.max(base.width,base.height));const viewport=page.getViewport({scale});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;text=await ocr(canvas);canvas.width=0;canvas.height=0;}
     pages.push(`--- Page ${p} ---\n${text}`);page.cleanup();
    }return {text:pages.join('\n\n'),method:usedOcr?'PDF text + English OCR':'PDF text extraction'};
   }finally{await task.destroy()}
  }
  if(['image/png','image/jpeg'].includes(file.type)){const bitmap=await createImageBitmap(file);try{if(bitmap.width*bitmap.height>25000000)throw new Error('Image dimensions are too large. Resize to under 25 megapixels.');const canvas=document.createElement('canvas');const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);return {text:await ocr(canvas),method:'English OCR'}}finally{bitmap.close()}}
  throw new Error('Use a PDF, PNG, JPG or TXT document.');
 }finally{if(worker)await worker.terminate()}
}
