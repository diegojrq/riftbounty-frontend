#!/usr/bin/env node
/**
 * Upload only public/images/cards to Cloudflare R2 bucket "riftbounty".
 * Keys in R2: cards/OGN-001-298.png, etc.
 *
 * Prereqs:
 *   - npx wrangler login
 *   - Bucket "riftbounty" created in Cloudflare R2
 *
 * Usage: node scripts/upload-r2.mjs
 */

import { readdir } from "fs/promises";
import { join, relative } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const IMAGES_DIR = join(process.cwd(), "public", "images", "cards");
const R2_KEY_PREFIX = "cards";
const BUCKET = "riftbounty";
const MAX_RETRIES = 3;
const DELAY_MS = 400;
const RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getAllFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.name.includes("Zone.Identifier")) continue;
    if (ent.isDirectory()) {
      files.push(...(await getAllFiles(full, base)));
    } else {
      files.push(relative(base, full));
    }
  }
  return files;
}

function uploadOne(relativePath) {
  const filePath = join(IMAGES_DIR, relativePath);
  const key = `${R2_KEY_PREFIX}/${relativePath.replace(/\\/g, "/")}`;
  return execFileAsync(
    "npx",
    ["wrangler", "r2", "object", "put", `${BUCKET}/${key}`, "--file", filePath],
    { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
  );
}

async function uploadWithRetry(relativePath) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await uploadOne(relativePath);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }
  throw lastErr;
}

async function run() {
  console.log("Listing files in public/images/cards...");
  const files = await getAllFiles(IMAGES_DIR);
  console.log(`Found ${files.length} files. Uploading to R2 bucket "${BUCKET}" under ${R2_KEY_PREFIX}/ (sequential + retries)...\n`);

  let done = 0;
  const failedList = [];
  const total = files.length;

  for (const rel of files) {
    try {
      await uploadWithRetry(rel);
      done++;
      if (done % 50 === 0 || done === total) {
        process.stdout.write(`\r  ${done}/${total} uploaded`);
      }
      await sleep(DELAY_MS);
    } catch (err) {
      failedList.push(rel);
      console.error(`\n  FAIL (after ${MAX_RETRIES} retries): ${rel}`, err.message || err);
    }
  }

  console.log(`\n\nDone. Uploaded: ${done}, Failed: ${failedList.length}`);
  if (failedList.length > 0) {
    console.log("\nFailed files (re-run script to retry only missing):");
    failedList.forEach((f) => console.log("  ", f));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
