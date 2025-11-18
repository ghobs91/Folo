import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import type { Context } from "@netlify/functions"

const functionDir = dirname(fileURLToPath(import.meta.url))

let app: any = null
let appError: Error | null = null

// Load the bundled server code
async function initApp() {
  if (appError) throw appError
  if (app) return app

  try {
    // In Netlify, the function is in /.netlify/functions-internal/
    // and dist/server is included via included_files configuration
    const serverPath = join(functionDir, "../../dist/server/index.mjs")

    console.info("Attempting to load server from:", serverPath)
    console.info("functionDir:", functionDir)

    // Debug: list parent directories
    try {
      const parentDir = join(functionDir, "../..")
      console.info("Parent directory contents:", readdirSync(parentDir))

      try {
        const distDir = join(functionDir, "../../dist")
        console.info("Dist directory contents:", readdirSync(distDir))
      } catch {
        console.info("Could not read dist directory")
      }
    } catch {
      console.info("Could not read parent directory")
    }

    const { createApp } = await import(serverPath)
    app = await createApp()
    await app.ready()
    console.info("Server initialized successfully")
    return app
  } catch (error) {
    appError = error instanceof Error ? error : new Error(String(error))
    console.error("Failed to initialize app:", appError)
    throw appError
  }
}

export default async (req: Request, _context: Context) => {
  try {
    // Debug endpoint - return diagnostic info
    const url = new URL(req.url)
    if (url.pathname === "/.netlify/functions/server/__debug") {
      try {
        const parentDir = join(functionDir, "../..")
        const distExists = readdirSync(parentDir).includes("dist")

        return new Response(
          JSON.stringify(
            {
              functionDir,
              parentDir,
              parentDirContents: readdirSync(parentDir),
              distExists,
              distContents: distExists ? readdirSync(join(parentDir, "dist")) : "N/A",
              serverPath: join(functionDir, "../../dist/server/index.mjs"),
              appInitialized: !!app,
              appError: appError?.message,
            },
            null,
            2,
          ),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        )
      } catch (debugError) {
        return new Response(
          JSON.stringify(
            {
              error: debugError instanceof Error ? debugError.message : String(debugError),
              functionDir,
            },
            null,
            2,
          ),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          },
        )
      }
    }

    // Initialize app once and reuse
    await initApp()

    // Extract request details
    const { method } = req
    const headers: Record<string, string> = {}

    req.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Add Netlify context headers
    headers["x-netlify-function"] = "true"

    let body: string | undefined
    if (method !== "GET" && method !== "HEAD") {
      body = await req.text()
    }

    // Create mock Node.js request/response objects for Fastify
    return new Promise<Response>((resolve) => {
      const chunks: Buffer[] = []
      let statusCode = 200
      const responseHeaders: Record<string, string> = {}

      const mockReq = {
        method,
        url: url.pathname + url.search,
        headers,
        body,
        rawBody: body,
        httpVersion: "1.1",
        httpVersionMajor: 1,
        httpVersionMinor: 1,
        socket: {
          remoteAddress: headers["x-forwarded-for"] || "127.0.0.1",
          encrypted: true,
        },
        connection: {
          remoteAddress: headers["x-forwarded-for"] || "127.0.0.1",
          encrypted: true,
        },
        on: () => {},
        once: () => {},
        emit: () => {},
        removeListener: () => {},
      }

      const mockRes = {
        statusCode: 200,
        headers: responseHeaders,
        headersSent: false,
        finished: false,

        setHeader(key: string, value: string | string[]) {
          this.headers[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value
          return this
        },

        getHeader(key: string) {
          return this.headers[key.toLowerCase()]
        },

        removeHeader(key: string) {
          delete this.headers[key.toLowerCase()]
          return this
        },

        writeHead(code: number, headers?: Record<string, string | string[]>) {
          statusCode = code
          this.statusCode = code
          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              this.setHeader(key, value)
            })
          }
          this.headersSent = true
          return this
        },

        write(chunk: any) {
          if (chunk) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          return true
        },

        end(data?: any) {
          if (data) {
            chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data))
          }

          this.finished = true
          const body = Buffer.concat(chunks).toString("utf-8")

          resolve(
            new Response(body || null, {
              status: statusCode || this.statusCode,
              headers: responseHeaders,
            }),
          )
        },

        on: () => {},
        once: () => {},
        emit: () => {},
        removeListener: () => {},
      }

      // Inject request into Fastify
      // @ts-ignore - Fastify server emit
      app!.server.emit("request", mockReq, mockRes)
    })
  } catch (error) {
    console.error("Netlify function error:", error)
    return new Response(
      JSON.stringify({
        ok: false,
        message: error instanceof Error ? error.message : "Internal Server Error",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    )
  }
}

// Configure function
export const config = {
  path: "/*",
}
