#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const SRC_DIR = path.join(__dirname, "..", "src")
const DIST_DIR = path.join(__dirname, "..", "dist")

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true })
}

// Read source files
const srcJs = fs.readFileSync(path.join(SRC_DIR, "index.js"), "utf8")
const srcDts = fs.readFileSync(path.join(SRC_DIR, "index.d.ts"), "utf8")

// CommonJS format
const cjsContent = srcJs

// ESM format
let esmContent = srcJs
  .replace(/const (\w+) = require\(["']([^"']+)["']\)/g, "import $1 from \"$2\"")
  .replace(/const \{ ([^}]+) \} = require\(["']([^"']+)["']\)/g, "import { $1 } from \"$2\"")
  .replace(/module\.exports = (\w+);?/g, "export default $1;")
  .replace(/module\.exports\.(\w+) = (\w+);?/g, "export { $2 as $1 };")

// Ensure proper ESM exports at the end
if (!esmContent.includes("export default")) {
  esmContent += "\nexport default TelegramBot;"
}

// Add named exports if not already present
if (!esmContent.includes("export { TelegramBot")) {
  esmContent += "\nexport { TelegramBot, InlineKeyboardBuilder, ReplyKeyboardBuilder };"
}

// Write dist files
fs.writeFileSync(path.join(DIST_DIR, "index.cjs"), cjsContent)
fs.writeFileSync(path.join(DIST_DIR, "index.mjs"), esmContent)
fs.writeFileSync(path.join(DIST_DIR, "index.d.ts"), srcDts)

console.log("✅ Build complete!")
console.log(`  - dist/index.cjs (CommonJS)`)
console.log(`  - dist/index.mjs (ESM)`)
console.log(`  - dist/index.d.ts (TypeScript definitions)`)
