import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const API_KEY = 'dekor-house:572cb1a59f9b6ca88975d1edb83e355d';
const JWT = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZV9udW1iZXIiOiIrOTk4OTk4MjI1MzMzIiwiYXBwX3R5cGUiOiJiYWNrLW9mZmljZSIsInVzZXJuYW1lIjoiZGVrb3ItaG91c2UiLCJpZCI6IjY3MDExNTgwMzM0ZGMwNjlmNTFlNDk2MyIsImlhdCI6MTc3ODk0NjA3NywiZXhwIjoxNzgxNTM4MDc3fQ.JDnsi0DnoakqFDYKEWxs8xn5H1vudY-poqrmDvLzFFI';
const INT_BASE = 'https://api.bito.uz/integration-api/integration/api/v2';
const UPLOAD_URL = 'https://api.bito.uz/upload-api/public/upload';
const UPDATE_URL = 'https://api.bito.uz/back-api/admin/product/update';
const ORG_ID = '6701170d334dc069f51e4c82';
const EDITED_DIR = path.join(ROOT, 'output/vetka-batch/edited');

const FILES = [
  '5595-Z-6-rose-1.png',
  '6496-B-10-white-1.png',
  '6516-B-27-white-1.png',
  '6518-B-28-yellow-1.png',
  '6518-B-28-yellow-2.png',
];

const intH = { 'api-key': API_KEY, 'Content-Type': 'application/json' };
const jwtH = { 'Authorization': JWT, 'Content-Type': 'application/json' };

// Load only needed SKUs
const skus = [...new Set(FILES.map(f => f.split('-')[0]))];
console.log('Loading products for SKUs:', skus.join(', '));
const skuMap = {};
let page = 1, total = 9999;
while ((page-1)*100 < total) {
  const d = await (await fetch(`${INT_BASE}/product/get-paging`, {
    method:'POST', headers:intH, body:JSON.stringify({page, limit:100, is_product:true})
  })).json();
  total = d.data.total;
  for (const p of d.data.data) if (skus.includes(String(p.sku))) skuMap[String(p.sku)] = p;
  if (Object.keys(skuMap).length === skus.length) break;
  page++;
  await new Promise(r => setTimeout(r, 150));
}
console.log(`Found ${Object.keys(skuMap).length}/${skus.length} products\n`);

let ok=0, failed=0;
for (const file of FILES) {
  const sku = file.split('-')[0];
  const product = skuMap[sku];
  if (!product) { console.log(`SKIP: ${file} — SKU ${sku} not found`); continue; }
  try {
    const buf = fs.readFileSync(path.join(EDITED_DIR, file));
    const bnd = 'B' + Date.now();
    const body = Buffer.concat([
      Buffer.from(`--${bnd}\r\nContent-Disposition: form-data; name="file"; filename="${file}"\r\nContent-Type: image/png\r\n\r\n`),
      buf, Buffer.from(`\r\n--${bnd}--\r\n`)
    ]);
    const up = await (await fetch(UPLOAD_URL, {
      method:'POST', headers:{'Authorization':JWT,'Content-Type':`multipart/form-data; boundary=${bnd}`}, body
    })).json();
    if (up.code !== 0) throw new Error('Upload: ' + JSON.stringify(up).slice(0,80));
    const img = up.data;
    console.log(`  📤 Uploaded → ${img}`);
    const upd = await (await fetch(UPDATE_URL, { method:'POST', headers:jwtH, body:JSON.stringify({
      _id:product._id, name:product.name, sku:product.sku,
      image:img, images:[img],
      is_product:true, is_semi_product:false, is_material:false,
      is_marked:false, is_variant:false, is_compound:false, is_service:false,
      box_item:product.box_item??0,
      measure_id:product.measure?._id||product.measure_id,
      category_ids:product.category?[product.category._id]:[],
      organizations:[{organization_id:ORG_ID,is_available:true,is_available_for_sale:true,prices:[]}],
      supplier_ids:[],materials:[],barcodes:[],attachments:[]
    })})).json();
    if (upd.code !== 0) throw new Error('Update: ' + JSON.stringify(upd).slice(0,120));
    console.log(`✅ ${product.name} (${sku}) — ${file}`);
    ok++;
    await new Promise(r => setTimeout(r, 300));
  } catch(e) { console.error(`❌ ${file}: ${e.message}`); failed++; }
}
console.log(`\nDone: ${ok} ok, ${failed} failed`);
