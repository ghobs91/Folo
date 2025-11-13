/// <reference types="node" />
import type { Context } from "@netlify/functions"

// @ts-ignore - Generated during build
// eslint-disable-next-line antfu/no-import-dist
import { createApp } from "../../dist/server/index.mjs"

let app: Awaited<ReturnType<typeof createApp>> | null = null

export default async (req: Request, _context: Context) => {
  // Initialize app once and reuse
  if (!app) {
    app = await createApp()
    await app.ready()
  }

  try {
    // Extract request details
    const url = new URL(req.url)
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
