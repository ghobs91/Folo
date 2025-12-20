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
  // For Netlify, ensure the bundled server is available under the functions dir
  // so the runtime import at runtime (../../dist/server/index.mjs) succeeds.
  try {
    const distServer = path.join(__dirname, "../dist/server")
    const dest = path.join(__dirname, "../netlify/functions/dist/server")
    // Create destination directory
    await fs.mkdir(path.dirname(dest), { recursive: true })
    // Use fs.cp if available (Node 16+), fall back to simple copy loop
    if (typeof (fs as any).cp === "function") {
      // @ts-ignore runtime API
      await (fs as any).cp(distServer, dest, { recursive: true })
    } else {
      // Fallback: copy files recursively
      async function copyRecursive(src: string, dst: string) {
        await fs.mkdir(dst, { recursive: true })
        const entries = await fs.readdir(src, { withFileTypes: true })
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const dstPath = path.join(dst, entry.name)
          if (entry.isDirectory()) await copyRecursive(srcPath, dstPath)
          else await fs.copyFile(srcPath, dstPath)
        }
      }
      await copyRecursive(distServer, dest)
    }
    console.info("✓ Copied dist/server into netlify/functions/dist/server")
  } catch (error) {
    console.warn("Warning: could not copy dist/server into functions dir:", error)
  }
}

async function main() {
  await generateIndexHtmlData()
  await copyServerBundleForNetlify()
  console.info("✓ Prepared Netlify build artifacts")
}

main()
