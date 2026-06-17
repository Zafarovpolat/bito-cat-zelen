import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const batchDir = path.join(rootDir, "output", "vetka-batch");
const promptsPath = path.join(batchDir, "prompts.jsonl");
const logPath = path.join(batchDir, "gpt-image-results.jsonl");

const args = parseArgs(process.argv.slice(2));

if (!process.env.OPENAI_API_KEY) {
  fail("Missing OPENAI_API_KEY. Add it to .env before running GPT Image processing.");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const jobs = await readJobs();
const selectedJobs = jobs.slice(args.offset, args.limit ? args.offset + args.limit : undefined);

await fs.mkdir(path.join(batchDir, "edited"), { recursive: true });

for (const [index, job] of selectedJobs.entries()) {
  const absoluteIndex = args.offset + index + 1;
  const exists = await fileExists(job.editedPath);
  if (exists && !args.force) {
    console.log(`Skipping ${absoluteIndex}/${jobs.length}: ${job.name} #${job.photoIndex} already exists`);
    continue;
  }

  console.log(`Processing ${absoluteIndex}/${jobs.length}: ${job.name} #${job.photoIndex}`);
  const result = await editImage(job);
  await fs.writeFile(job.editedPath, Buffer.from(result.b64_json, "base64"));
  await appendJsonl(logPath, {
    time: new Date().toISOString(),
    productId: job.productId,
    name: job.name,
    sku: job.sku,
    photoIndex: job.photoIndex,
    originalPath: job.originalPath,
    editedPath: job.editedPath,
    usage: result.usage || null,
  });
}

console.log(
  JSON.stringify(
    {
      totalJobs: jobs.length,
      processedSelection: selectedJobs.length,
      editedDir: path.join(batchDir, "edited"),
    },
    null,
    2,
  ),
);

async function editImage(job) {
  let lastError;

  for (let attempt = 1; attempt <= args.retries; attempt += 1) {
    try {
      const imgBuf = await fs.readFile(job.originalPath);
      const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
      const CRLF = "\r\n";
      const textParts = Buffer.from(
        `--${boundary}${CRLF}Content-Disposition: form-data; name="model"${CRLF}${CRLF}gpt-image-2-2026-04-21${CRLF}` +
        `--${boundary}${CRLF}Content-Disposition: form-data; name="prompt"${CRLF}${CRLF}${job.prompt}${CRLF}` +
        `--${boundary}${CRLF}Content-Disposition: form-data; name="size"${CRLF}${CRLF}${args.size}${CRLF}` +
        `--${boundary}${CRLF}Content-Disposition: form-data; name="image"; filename="image.jpeg"${CRLF}Content-Type: image/jpeg${CRLF}${CRLF}`
      );
      const endPart = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
      const body = Buffer.concat([textParts, imgBuf, endPart]);

      const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length.toString(),
        },
        body,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const image = data.data?.[0];
      if (!image?.b64_json) throw new Error("Response did not include b64_json image data.");
      return { b64_json: image.b64_json, usage: data.usage || null };
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt < args.retries) await sleep(2000 * attempt);
    }
  }

  throw lastError;
}

async function readJobs() {
  const text = await fs.readFile(promptsPath, "utf8");
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function parseArgs(argv) {
  const parsed = {
    limit: null,
    offset: 0,
    quality: "medium",
    size: "1024x1536",
    retries: 3,
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--limit") parsed.limit = Number(argv[++i]);
    else if (arg === "--offset") parsed.offset = Number(argv[++i]);
    else if (arg === "--quality") parsed.quality = argv[++i];
    else if (arg === "--size") parsed.size = argv[++i];
    else if (arg === "--retries") parsed.retries = Number(argv[++i]);
    else if (arg === "--force") parsed.force = true;
  }

  return parsed;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function appendJsonl(filePath, value) {
  await fs.appendFile(filePath, `${JSON.stringify(value)}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
