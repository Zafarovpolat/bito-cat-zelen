import fs from 'fs';
import path from 'path';

const TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZV9udW1iZXIiOiIrOTk4OTk4MjI1MzMzIiwiYXBwX3R5cGUiOiJiYWNrLW9mZmljZSIsInVzZXJuYW1lIjoiZGVrb3ItaG91c2UiLCJpZCI6IjY3MDExNTgwMzM0ZGMwNjlmNTFlNDk2MyIsImlhdCI6MTc3ODk0NjA3NywiZXhwIjoxNzgxNTM4MDc3fQ.JDnsi0DnoakqFDYKEWxs8xn5H1vudY-poqrmDvLzFFI';
const UPLOAD_URL = 'https://api.bito.uz/upload-api/public/upload';
const GET_PAGING = 'https://api.bito.uz/back-api/admin/product/get-paging';
const UPDATE_URL = 'https://api.bito.uz/back-api/admin/product/update';
const EDITED_DIR = '/Users/sarvaribrokhimov/Documents/Codex/2026-05-09/files-mentioned-by-the-user-image/output/vetka-batch/edited';

const headers = { 'Authorization': TOKEN, 'Content-Type': 'application/json' };

// Get product from Bito by SKU
async function getProductBySku(sku) {
  const res = await fetch(GET_PAGING, {
    method: 'POST',
    headers,
    body: JSON.stringify({ page: 1, limit: 5, search: sku })
  });
  const data = await res.json();
  const products = data?.data?.data || [];
  return products.find(p => String(p.sku) === String(sku)) || null;
}

// Upload PNG file to Bito
async function uploadFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const boundary = 'Boundary' + Date.now();
  const CRLF = '\r\n';
  const body = Buffer.concat([
    Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}Content-Type: image/png${CRLF}${CRLF}`),
    fileBuffer,
    Buffer.from(`${CRLF}--${boundary}--${CRLF}`)
  ]);
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Authorization': TOKEN, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error('Upload failed: ' + JSON.stringify(data));
  return data.data; // e.g. "/uploads/file-xxx.png"
}

// Update product image on Bito
async function updateProduct(product, imagePath) {
  const currentImages = product.images || [];
  // Add new image if not already there
  const newImages = currentImages.includes(imagePath) ? currentImages : [imagePath, ...currentImages];
  const body = {
    ...product,
    image: imagePath,
    images: newImages,
    category_ids: product.categories?.map(c => c._id) || product.category_ids || [],
    measure_id: product.measure?._id || product.measure_id,
    organizations: (product.organizations || []).map(o => ({
      organization_id: o.organization_id || o.organization?._id,
      is_available: o.is_available,
      is_available_for_sale: o.is_available_for_sale,
      prices: o.prices || []
    }))
  };
  const res = await fetch(UPDATE_URL, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (data.code !== 0) throw new Error('Update failed: ' + JSON.stringify(data));
  return data;
}

// Main
const files = fs.readdirSync(EDITED_DIR).filter(f => f.endsWith('.png'));
console.log(`Found ${files.length} PNG files`);

let ok = 0, fail = 0;
for (const file of files) {
  const sku = file.split('-')[0];
  const filePath = path.join(EDITED_DIR, file);

  try {
    // Find product
    const product = await getProductBySku(sku);
    if (!product) { console.log(`⚠️  SKU ${sku} not found in Bito (${file})`); fail++; continue; }

    // Upload image
    const imagePath = await uploadFile(filePath);
    console.log(`📤 Uploaded ${file} → ${imagePath}`);

    // Update product
    await updateProduct(product, imagePath);
    console.log(`✅ Updated product "${product.name}" (SKU: ${sku})`);
    ok++;

    await new Promise(r => setTimeout(r, 300)); // rate limit
  } catch (e) {
    console.error(`❌ Error for ${file}:`, e.message);
    fail++;
  }
}

console.log(`\nDone: ${ok} updated, ${fail} failed`);
