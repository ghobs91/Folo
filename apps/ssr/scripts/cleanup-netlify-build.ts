import { fileURLToPath } from "node:url"

import { dirname } from "pathe"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Clean up temporary build artifacts if needed
try {
  // Keep .generated for now as it's needed
  console.info("✓ Netlify build cleanup complete")
} catch (error) {
  console.warn("Cleanup warning:", error)
}
