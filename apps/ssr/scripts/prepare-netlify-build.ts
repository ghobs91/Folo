import { mkdirSync } from "node:fs"
import fs from "node:fs/promises"
import { fileURLToPath } from "node:url"

import path, { dirname } from "pathe"

const __dirname = dirname(fileURLToPath(import.meta.url))

mkdirSync(path.join(__dirname, "../.generated"), { recursive: true })

async function generateIndexHtmlData() {
  const indexHtml = await fs.readFile(path.join(__dirname, "../dist/index.html"), "utf-8")
  await fs.writeFile(
    path.join(__dirname, "../.generated/index.template.ts"),
    `export default ${JSON.stringify(indexHtml)}`,
  )
}

async function copyServerBundleForNetlify() {
  // For Netlify, we need to ensure the bundled server is accessible to the function
  // This will happen after tsdown builds the server bundle
  console.info("✓ Server bundle will be accessible via included_files in netlify.toml")
}

async function main() {
  await generateIndexHtmlData()
  await copyServerBundleForNetlify()
  console.info("✓ Prepared Netlify build artifacts")
}

main()
