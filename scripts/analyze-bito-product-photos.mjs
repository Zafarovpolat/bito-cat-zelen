import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output");
const imageDir = path.join(outputDir, "images");

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(`Usage:
  npm run analyze -- [--limit N] [--download|--no-download] [--ai|--no-ai]

Examples:
  npm run sample
  npm run analyze -- --limit 50
  npm run analyze -- --limit 50 --ai
`);
  process.exit(0);
}

const config = {
  apiKey: process.env.BITO_API_KEY,
  baseUrl: trimTrailingSlash(
    process.env.BITO_BASE_URL ||
      "https://api.bito.uz/integration-api/integration/api/v2",
  ),
  priceId: process.env.BITO_PRICE_ID,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
};

if (!config.apiKey) {
  fail("Missing BITO_API_KEY. Copy .env.example to .env and add your key.");
}

await fs.mkdir(outputDir, { recursive: true });
if (args.download) await fs.mkdir(imageDir, { recursive: true });

const products = await fetchProducts();
await writeJson("products.json", products);

const manifest = buildPhotoManifest(products);

if (args.download) {
  await downloadManifestImages(manifest);
}

await writeJson("photo-manifest.json", manifest);

if (args.ai) {
  if (!config.openaiApiKey) {
    fail("Missing OPENAI_API_KEY. Add it to .env or rerun with --no-ai.");
  }
  const analysis = await analyzePhotos(manifest);
  await writeJson("analysis.json", analysis);
}

console.log(
  JSON.stringify(
    {
      productCount: products.length,
      productCountWithPhotos: manifest.filter((item) => item.photos.length > 0)
        .length,
      photoCount: manifest.reduce((sum, item) => sum + item.photos.length, 0),
      outputDir,
    },
    null,
    2,
  ),
);

async function fetchProducts() {
  const limit = args.limit;
  const candidates = [
    ["POST", "/product/get-paging", pagingBody(limit)],
    ["POST", "/product-warehouse/get-paging", pagingBody(limit)],
    ["GET", "/product/get-all", null],
    ["GET", "/product/all", null],
    ["GET", "/product", null],
    ["GET", "/products", null],
  ];

  const errors = [];
  for (const [method, endpoint, body] of candidates) {
    try {
      const url = new URL(`${config.baseUrl}${endpoint}`);
      if (method === "GET") {
        if (limit) url.searchParams.set("limit", String(limit));
        if (config.priceId) url.searchParams.set("priceId", config.priceId);
      }

      const json = await bitoRequest(method, url, body);
      const items = normalizeList(json);
      if (items.length > 0) return limit ? items.slice(0, limit) : items;
      errors.push(`${endpoint}: response contained no recognizable list`);
    } catch (error) {
      errors.push(`${endpoint}: ${error.message}`);
    }
  }

  fail(
    `Could not fetch products from known endpoints.\nTried:\n- ${errors.join(
      "\n- ",
    )}`,
  );
}

function pagingBody(limit) {
  const body = {
    page: 1,
    limit: limit || 50,
  };

  if (config.priceId) {
    body.price_id = config.priceId;
    body.priceId = config.priceId;
  }

  return body;
}

async function bitoRequest(method, url, body) {
  const isApiKey = config.apiKey.includes(":");
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (isApiKey) {
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
  const responseBody = text ? safeJson(text) : null;

  if (!response.ok) {
    const detail = responseBody
      ? JSON.stringify(responseBody).slice(0, 500)
      : text.slice(0, 500);
    throw new Error(`${response.status} ${response.statusText} ${detail}`);
  }

  return responseBody;
}

function normalizeList(json) {
  if (Array.isArray(json)) return json;
  for (const key of ["data", "items", "products", "result", "rows", "list"]) {
    const value = json?.[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = normalizeList(value);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function buildPhotoManifest(products) {
  return products.map((product, index) => {
    const id = product.id || product._id || product.guid || product.uuid || index + 1;
    const name =
      product.name ||
      product.title ||
      product.productName ||
      product.fullName ||
      `product-${id}`;

    const urls = [...new Set(findImageUrls(product))];
    return {
      id,
      name,
      sku: product.sku || product.barcode || product.code || null,
      photos: urls.map((url, photoIndex) => ({
        url,
        localPath: args.download
          ? path.join(imageDir, `${safeFileName(`${id}-${photoIndex + 1}`)}${extFromUrl(url)}`)
          : null,
      })),
    };
  });
}

function findImageUrls(value) {
  const urls = [];

  function visit(node) {
    if (!node) return;
    if (typeof node === "string") {
      if (isImageUrl(node)) urls.push(absolutizeUrl(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node !== "object") return;

    for (const [key, child] of Object.entries(node)) {
      const lower = key.toLowerCase();
      const likelyImageField =
        lower.includes("image") ||
        lower.includes("photo") ||
        lower.includes("picture") ||
        lower.includes("media") ||
        lower.includes("file");

      if (likelyImageField) visit(child);
      if (typeof child === "string" && isImageUrl(child)) urls.push(absolutizeUrl(child));
      if (child && typeof child === "object") visit(child);
    }
  }

  visit(value);
  return urls;
}

function isImageUrl(value) {
  return (
    /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(value) ||
    /^\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(value)
  );
}

function absolutizeUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/uploads/")) {
    const fileName = url.split("/").pop();
    return `https://api.bito.uz/upload-api/public/uploads/${fileName}`;
  }
  const origin = new URL(config.baseUrl).origin;
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function downloadManifestImages(manifest) {
  for (const product of manifest) {
    for (const photo of product.photos) {
      const response = await fetch(photo.url);
      if (!response.ok) {
        photo.downloadError = `${response.status} ${response.statusText}`;
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(photo.localPath, bytes);
      photo.bytes = bytes.length;
    }
  }
}

async function analyzePhotos(manifest) {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const results = [];

  for (const product of manifest) {
    if (product.photos.length === 0) continue;
    const photo = product.photos[0];
    const imageUrl = photo.localPath
      ? `data:${mimeFromPath(photo.localPath)};base64,${await base64(photo.localPath)}`
      : photo.url;

    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Analyze product photos for ecommerce catalog quality. Be concise and practical.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Product: ${product.name}\nSKU: ${product.sku || "unknown"}\nReturn JSON with keys: visible_product, product_type_guess, background_quality, lighting_quality, sharpness, crop_framing, issues, recommended_action.`,
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    results.push({
      id: product.id,
      name: product.name,
      sku: product.sku,
      photoUrl: photo.url,
      analysis: safeJson(response.choices[0]?.message?.content || "{}"),
    });
  }

  return results;
}

function parseArgs(argv) {
  const parsed = { limit: null, download: true, ai: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--limit") parsed.limit = Number(argv[++i]);
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--no-download") parsed.download = false;
    else if (arg === "--download") parsed.download = true;
    else if (arg === "--ai") parsed.ai = true;
    else if (arg === "--no-ai") parsed.ai = false;
  }
  return parsed;
}

async function writeJson(fileName, data) {
  await fs.writeFile(
    path.join(outputDir, fileName),
    `${JSON.stringify(data, null, 2)}\n`,
  );
}

async function base64(filePath) {
  return (await fs.readFile(filePath)).toString("base64");
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function safeFileName(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, "-").replace(/^-|-$/g, "");
}

function extFromUrl(url) {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname);
  return ext || ".jpg";
}

function mimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
