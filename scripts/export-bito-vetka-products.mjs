import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const batchDir = path.join(rootDir, "output", "vetka-batch");
const originalsDir = path.join(batchDir, "originals");

const args = parseArgs(process.argv.slice(2));
const config = {
  apiKey: process.env.BITO_API_KEY,
  baseUrl: trimTrailingSlash(
    process.env.BITO_BASE_URL ||
      "https://api.bito.uz/integration-api/integration/api/v2",
  ),
  pageSize: args.pageSize || 100,
  downloadRetries: args.downloadRetries || 3,
};

if (!config.apiKey) {
  fail("Missing BITO_API_KEY. Add it to .env or pass it in the environment.");
}

await fs.mkdir(originalsDir, { recursive: true });

const allProducts = await fetchAllProducts();
const vetkaProducts = allProducts.filter(isVetkaProduct);
const manifest = buildManifest(vetkaProducts);

await downloadOriginals(manifest);
await writeJson(path.join(batchDir, "products-all.json"), allProducts);
await writeJson(path.join(batchDir, "manifest.json"), manifest);
await writePrompts(manifest);

console.log(
  JSON.stringify(
    {
      totalProducts: allProducts.length,
      vetkaProducts: vetkaProducts.length,
      vetkaPhotos: manifest.reduce((sum, item) => sum + item.photos.length, 0),
      batchDir,
    },
    null,
    2,
  ),
);

async function fetchAllProducts() {
  const first = await fetchProductPage(1);
  const firstItems = normalizeProductPage(first).items;
  const total = normalizeProductPage(first).total || firstItems.length;
  const pageCount = Math.max(1, Math.ceil(total / config.pageSize));
  const products = [...firstItems];

  for (let page = 2; page <= pageCount; page += 1) {
    const json = await fetchProductPage(page);
    products.push(...normalizeProductPage(json).items);
    console.log(`Fetched page ${page}/${pageCount}`);
  }

  return dedupeById(products);
}

async function fetchProductPage(page) {
  return bitoRequest("POST", `${config.baseUrl}/product/get-paging`, {
    page,
    limit: config.pageSize,
  });
}

async function bitoRequest(method, url, body) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (config.apiKey.includes(":")) {
    headers["api-key"] = config.apiKey;
  } else {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json = text ? safeJson(text) : null;

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  }
  if (json?.code && json.code !== 0) {
    throw new Error(`Bito API error: ${JSON.stringify(json).slice(0, 500)}`);
  }

  return json;
}

function normalizeProductPage(json) {
  const data = json?.data;
  if (Array.isArray(data)) return { items: data, total: data.length };
  if (Array.isArray(data?.data)) return { items: data.data, total: data.total };
  if (Array.isArray(json?.items)) return { items: json.items, total: json.total };
  return { items: [], total: 0 };
}

function isVetkaProduct(product) {
  const category = String(product.category?.name || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();
  return category.includes("vetka") || category.includes("ветка") || name.includes("vetka");
}

function buildManifest(products) {
  return products
    .map((product) => {
      const id = product._id || product.id;
      const name = product.name || `product-${id}`;
      const sku = product.sku || product.barcode || product.code || null;
      const category = product.category?.name || null;
      const photos = normalizeImagePaths(product)
        .map((imagePath, index) => {
          const url = toUploadApiUrl(imagePath);
          const fileName = `${safeFileName(`${sku || id}-${name}`)}-${index + 1}${extFromUrl(url)}`;
          return {
            index: index + 1,
            sourcePath: imagePath,
            url,
            originalPath: path.join(originalsDir, fileName),
            editedPath: path.join(batchDir, "edited", fileName.replace(/\.[^.]+$/, ".png")),
            promptPath: path.join(batchDir, "prompts", fileName.replace(/\.[^.]+$/, ".txt")),
          };
        });

      return {
        id,
        name,
        sku,
        category,
        updatedAt: product.updated_at || null,
        photos,
      };
    })
    .filter((product) => product.photos.length > 0);
}

function normalizeImagePaths(product) {
  const values = [];
  if (product.image) values.push(product.image);
  if (Array.isArray(product.images)) values.push(...product.images);
  return [...new Set(values.filter(Boolean))];
}

async function downloadOriginals(manifest) {
  const total = manifest.reduce((sum, product) => sum + product.photos.length, 0);
  let current = 0;

  for (const product of manifest) {
    for (const photo of product.photos) {
      current += 1;
      try {
        await fs.access(photo.originalPath);
        photo.downloadStatus = "exists";
        console.log(`Photo ${current}/${total} exists: ${product.name} #${photo.index}`);
        continue;
      } catch {
        // Download below.
      }

      try {
        const bytes = await downloadWithRetry(photo.url);
        await fs.writeFile(photo.originalPath, bytes);
        photo.downloadStatus = "downloaded";
        photo.bytes = bytes.length;
        console.log(`Photo ${current}/${total} downloaded: ${product.name} #${photo.index}`);
      } catch (error) {
        photo.downloadStatus = "error";
        photo.downloadError = error.message;
        console.error(`Photo ${current}/${total} failed: ${product.name} #${photo.index}: ${error.message}`);
      }
    }
  }
}

async function downloadWithRetry(url) {
  let lastError;

  for (let attempt = 1; attempt <= config.downloadRetries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < config.downloadRetries) {
        await sleep(1000 * attempt);
      }
    }
  }

  throw lastError;
}

async function writePrompts(manifest) {
  const promptsDir = path.join(batchDir, "prompts");
  await fs.mkdir(promptsDir, { recursive: true });
  await fs.mkdir(path.join(batchDir, "edited"), { recursive: true });

  const jsonl = [];
  for (const product of manifest) {
    for (const photo of product.photos) {
      const prompt = buildPrompt(product, photo);
      await fs.writeFile(photo.promptPath, prompt);
      jsonl.push(
        JSON.stringify({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          photoIndex: photo.index,
          originalPath: photo.originalPath,
          editedPath: photo.editedPath,
          prompt,
        }),
      );
    }
  }

  await fs.writeFile(path.join(batchDir, "prompts.jsonl"), `${jsonl.join("\n")}\n`);
}

function buildPrompt(product, photo) {
  const colorHint = inferColorHint(product.name);
  const uniqueLine = colorHint
    ? `Product-specific color note: preserve the ${colorHint} color family exactly as seen in the input photo.`
    : "Product-specific color note: preserve the exact color family seen in the input photo.";

  return `Edit this Bito product photo into a truthful premium ecommerce catalog product image.

Product name: ${product.name}
SKU: ${product.sku || "unknown"}
Category: ${product.category || "VETKA"}
Photo index: ${photo.index}

PRIMARY GOAL:
Create one clean studio catalog image for this exact artificial decorative branch. The output must look like a real product photo of the same physical item, not an AI-redesigned, idealized, or more expensive version.

STRICT REAL-APPEARANCE RULES:
- Preserve the real product identity exactly.
- Do not beautify by changing the actual object.
- Do not make the product fuller, cleaner, newer, more symmetrical, more expensive, or more botanical than the original.
- Do not add flowers, petals, buds, leaves, stems, branches, wires, connectors, berries, moss, or decorative parts.
- Do not remove any product parts.
- Do not change the number of flower clusters, branches, stems, or leaves.
- Do not change the product length, proportions, curvature, density, or construction.
- Preserve artificial fabric/plastic texture, visible wire/plastic stems, wrinkles, uneven spacing, and realistic imperfections.
- Do not transform it into a natural living plant.
- ${uniqueLine}

REMOVE NON-PRODUCT ELEMENTS:
Remove any hand, sleeve, wall, floor, tile, marble, table, packaging clutter, room shadow, background marks, price tags, reflections, or non-product object. If a hand is holding the product, remove the hand and reconstruct only the visible product continuation without inventing extra decorative parts.

CATALOG STYLE:
Use a pure white or very light off-white studio background. Use soft even studio lighting, improved exposure, clarity, sharpness, and low noise. Add only a subtle natural shadow if needed. No props, no vase, no text, no watermark, no logo.

COMPOSITION:
Vertical product-card composition. Keep the whole product visible with comfortable margins.

STRICT ORIENTATION CORRECTION:
If the source photo shows the branch upside down, hanging downward, lying in an unnatural direction, or with flowers visually dropping from the top, correct the overall orientation for the catalog image. The product must read from bottom to top: lower/base stem at the bottom of the frame, decorative flowers/leaves rising upward above it, and the full item centered vertically. Rotate/re-orient only the overall product presentation; do not redesign the product, do not change its structure, and do not invent missing parts. Do not output an upside-down or hanging-down composition.

Do not crop important petals, leaves, stems, or tips.

NEGATIVE CONSTRAINTS:
No extra flowers, no extra leaves, no changed color, no changed quantity, no unrealistic CGI, no illustration, no luxury fantasy styling, no over-gloss, no poster look, no cropped product.`;
}

function inferColorHint(name) {
  const lower = String(name).toLowerCase();
  const colors = [
    ["pink", "pink / hot-pink / magenta"],
    ["rose", "rose-pink"],
    ["red", "red"],
    ["violet", "violet / purple"],
    ["purple", "purple"],
    ["green", "green"],
    ["white", "white"],
    ["yellow", "yellow"],
    ["orange", "orange"],
    ["blue", "blue"],
    ["cream", "cream"],
  ];
  return colors.find(([key]) => lower.includes(key))?.[1] || null;
}

function toUploadApiUrl(imagePath) {
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith("/uploads/")) {
    return `https://api.bito.uz/upload-api/public/uploads/${imagePath.split("/").pop()}`;
  }
  return imagePath;
}

function dedupeById(products) {
  const seen = new Set();
  return products.filter((product) => {
    const id = product._id || product.id || product.name;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function extFromUrl(url) {
  const pathname = new URL(url).pathname;
  return path.extname(pathname) || ".jpg";
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--page-size") parsed.pageSize = Number(argv[++i]);
    else if (argv[i] === "--download-retries") parsed.downloadRetries = Number(argv[++i]);
  }
  return parsed;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function safeFileName(value) {
  return String(value)
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 150);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
