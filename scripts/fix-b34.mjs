import fs from 'fs';
const API_KEY = 'dekor-house:572cb1a59f9b6ca88975d1edb83e355d';
const JWT = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZV9udW1iZXIiOiIrOTk4OTk4MjI1MzMzIiwiYXBwX3R5cGUiOiJiYWNrLW9mZmljZSIsInVzZXJuYW1lIjoiZGVrb3ItaG91c2UiLCJpZCI6IjY3MDExNTgwMzM0ZGMwNjlmNTFlNDk2MyIsImlhdCI6MTc3ODk0NjA3NywiZXhwIjoxNzgxNTM4MDc3fQ.JDnsi0DnoakqFDYKEWxs8xn5H1vudY-poqrmDvLzFFI';
const intH = { 'api-key': API_KEY, 'Content-Type': 'application/json' };
const jwtH = { 'Authorization': JWT, 'Content-Type': 'application/json' };
const ORG = '6701170d334dc069f51e4c82';
const UPLOAD = 'https://api.bito.uz/upload-api/public/upload';
const UPDATE = 'https://api.bito.uz/back-api/admin/product/update';
const EDITED = 'output/vetka-batch/edited';

const FIXES = [
  { file: '6526-B-34-red-2.png', sku: '8499', name: 'B-34 blue'  },
  { file: '6526-B-34-red-3.png', sku: '8501', name: 'B-34 white' },
  { file: '6526-B-34-red-4.png', sku: '6526', name: 'B-34 red'   },
  { file: '6526-B-34-red-5.png', sku: '8497', name: 'B-34 pink'  },
];

async function uploadFile(file) {
  const buf = fs.readFileSync(EDITED+'/'+file);
  const bnd = 'B'+Date.now();
  const body = Buffer.concat([
    Buffer.from(`--${bnd}\r\nContent-Disposition: form-data; name="file"; filename="${file}"\r\nContent-Type: image/png\r\n\r\n`),
    buf, Buffer.from(`\r\n--${bnd}--\r\n`)
  ]);
  const r = await (await fetch(UPLOAD, {method:'POST',headers:{'Authorization':JWT,'Content-Type':`multipart/form-data; boundary=${bnd}`},body})).json();
  if(r.code!==0) throw new Error(JSON.stringify(r));
  return r.data;
}

async function getAllProducts() {
  const all=[];let page=1,total=9999;
  while((page-1)*100<total){
    const d=await(await fetch('https://api.bito.uz/integration-api/integration/api/v2/product/get-paging',{method:'POST',headers:intH,body:JSON.stringify({page,limit:100,is_product:true})})).json();
    total=d.data.total;all.push(...d.data.data);page++;
    await new Promise(r=>setTimeout(r,150));
  }
  return all;
}

console.log('Loading products...');
const all = await getAllProducts();
const bysku = {};
all.forEach(p=>bysku[String(p.sku)]=p);
console.log('Loaded',all.length,'\n');

for(const fix of FIXES) {
  const p = bysku[fix.sku];
  if(!p){console.log('NOT FOUND:',fix.sku);continue;}
  try {
    const img = await uploadFile(fix.file);
    const r = await(await fetch(UPDATE,{method:'POST',headers:jwtH,body:JSON.stringify({
      _id:p._id,name:p.name,sku:p.sku,image:img,images:[img],
      is_product:true,is_semi_product:false,is_material:false,is_marked:false,
      is_variant:false,is_compound:false,is_service:false,box_item:p.box_item??0,
      measure_id:p.measure?._id||p.measure_id,
      category_ids:p.category?[p.category._id]:[],
      organizations:[{organization_id:ORG,is_available:true,is_available_for_sale:true,prices:[]}],
      supplier_ids:[],materials:[],barcodes:[],attachments:[]
    })})).json();
    console.log((r.code===0?'✅':'❌'),fix.name,'('+fix.sku+') →',img);
  } catch(e){console.error('ERR',fix.name,e.message);}
  await new Promise(r=>setTimeout(r,300));
}
