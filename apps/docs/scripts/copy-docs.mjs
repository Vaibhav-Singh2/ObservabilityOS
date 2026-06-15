/**
 * Copy markdown documentation files from the monorepo root into apps/docs
 * so they are bundled with the docs app on Vercel.
 *
 * This runs as a prebuild step so all .md files referenced by DOCS_MAP
 * are available locally at runtime (inside the serverless function bundle).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_APP_DIR = path.resolve(__dirname, "..");
const MONOREPO_ROOT = path.resolve(DOCS_APP_DIR, "../..");
const CONTENT_DIR = path.join(DOCS_APP_DIR, "content");

// Files to copy: [source relative to monorepo root, destination filename inside content/]
const FILES_TO_COPY = [
  { source: "README.md", dest: "README.md" },
  { source: "LICENSE", dest: "LICENSE.md" },
  { source: "COMMERCIAL_LICENSE.md", dest: "COMMERCIAL_LICENSE.md" },
  { source: "docs/ARCHITECTURE.md", dest: "ARCHITECTURE.md" },
  { source: "docs/API.md", dest: "API.md" },
  { source: "docs/CHANGELOG.md", dest: "CHANGELOG.md" },
  { source: "docs/CONTRIBUTING.md", dest: "CONTRIBUTING.md" },
  { source: "docs/DATABASE.md", dest: "DATABASE.md" },
  { source: "docs/DEPLOYMENT.md", dest: "DEPLOYMENT.md" },
  { source: "docs/DEVELOPMENT.md", dest: "DEVELOPMENT.md" },
  { source: "docs/FAQ.md", dest: "FAQ.md" },
  { source: "docs/INSTALLATION.md", dest: "INSTALLATION.md" },
  { source: "docs/QUICKSTART.md", dest: "QUICKSTART.md" },
  { source: "docs/ROADMAP.md", dest: "ROADMAP.md" },
  { source: "docs/SECURITY.md", dest: "SECURITY.md" },
  { source: "docs/TESTING.md", dest: "TESTING.md" },
  { source: "docs/TROUBLESHOOTING.md", dest: "TROUBLESHOOTING.md" },
];

// Create content directory if it doesn't exist
if (!fs.existsSync(CONTENT_DIR)) {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  console.log(`[copy-docs] Created content directory: ${CONTENT_DIR}`);
}

let copiedCount = 0;
for (const file of FILES_TO_COPY) {
  const sourcePath = path.join(MONOREPO_ROOT, file.source);
  const destPath = path.join(CONTENT_DIR, file.dest);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`[copy-docs] Copied: ${file.source} → content/${file.dest}`);
    copiedCount++;
  } else {
    console.warn(`[copy-docs] WARNING: Source not found: ${sourcePath}`);
  }
}

console.log(`[copy-docs] Done. ${copiedCount} files copied.`);