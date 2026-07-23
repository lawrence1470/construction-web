// Copies the pdf.js worker from node_modules to public/ so it can be self-hosted
// at a stable, bundler-independent URL (/pdf/pdf.worker.min.mjs). The worker
// version MUST match the pdfjs-dist API version, so copying from node_modules
// guarantees they stay in lockstep. Used by DocumentThumbnail to rasterize the
// first page of a PDF for card previews. Runs in the postinstall chain.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const destDir = resolve(root, 'public/pdf');
const dest = resolve(destDir, 'pdf.worker.min.mjs');

if (!existsSync(src)) {
  console.warn(`[sync-pdf-worker] Source not found: ${src}. Skipping.`);
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[sync-pdf-worker] Copied ${src} -> ${dest}`);
