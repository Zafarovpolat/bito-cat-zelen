const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_URL = 'postgresql://postgres.yjfyvedavmrdifmepvkh:DekorHouse7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const GITHUB_BASE = 'https://zafarovpolat.github.io/bito-cat/edited';
const EDITED_DIR = path.join(__dirname, '..', 'output/vetka-batch/edited');

function cuid() {
  return 'c' + crypto.randomBytes(11).toString('base64url').toLowerCase().slice(0,24);
}

const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
  console.log('Connected to Supabase!\n');

  const files = fs.readdirSync(EDITED_DIR)
    .filter(f => f.endsWith('.png'))
    .sort();

  // Only use -1 files as main image (skip -2, -3)
  const mainFiles = files.filter(f => f.endsWith('-1.png'));
  console.log(`Processing ${mainFiles.length} main images...\n`);

  let updated = 0, inserted = 0, skipped = 0;

  for (const file of mainFiles) {
    const sku = file.split('-')[0];
    const imageUrl = `${GITHUB_BASE}/${file}`;

    // Find product by bitoSku
    const prod = await client.query(
      'SELECT id, code FROM products WHERE "bitoSku" = $1 LIMIT 1',
      [sku]
    );

    if (prod.rows.length === 0) {
      console.log(`SKIP: SKU ${sku} (${file}) — not in Supabase`);
      skipped++;
      continue;
    }

    const productId = prod.rows[0].id;
    const productName = prod.rows[0].code;

    // Check if main image exists
    const existing = await client.query(
      'SELECT id FROM product_images WHERE "productId" = $1 AND "isMain" = true LIMIT 1',
      [productId]
    );

    if (existing.rows.length > 0) {
      // Update existing main image
      await client.query(
        'UPDATE product_images SET url = $1, "updatedAt" = NOW() WHERE id = $2',
        [imageUrl, existing.rows[0].id]
      );
      console.log(`UPD  ${productName} (${sku})`);
      updated++;
    } else {
      // Insert new main image
      const newId = cuid();
      await client.query(
        `INSERT INTO product_images (id, "productId", url, alt, "sortOrder", "isMain", "createdAt")
         VALUES ($1, $2, $3, $4, 0, true, NOW())`,
        [newId, productId, imageUrl, productName]
      );
      console.log(`INS  ${productName} (${sku})`);
      inserted++;
    }
  }

  console.log(`\n${'━'.repeat(40)}`);
  console.log(`✅ Updated:  ${updated}`);
  console.log(`✅ Inserted: ${inserted}`);
  console.log(`⚠️  Skipped:  ${skipped}`);

  await client.end();
}).catch(e => console.error('Error:', e.message));
