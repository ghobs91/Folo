# Netlify Deployment Guide for Follow SSR

This guide covers deploying the Follow SSR app to Netlify.

## Prerequisites

1. Netlify account
2. GitHub repository connected to Netlify
3. pnpm installed in your project

## Setup Steps

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Configure Environment Variables

In your Netlify site dashboard, add all required environment variables from `apps/ssr/.env.example`:

- `VITE_WEB_URL` - Your production web URL
- `VITE_WEB_PROD_URL` - Production API URL
- `VITE_WEB_DEV_URL` - Development API URL
- Any other environment variables your app requires

### 3. Deploy via Netlify UI

1. **Connect Repository**: Link your GitHub repo to Netlify
2. **Build Settings**:
   - Base directory: `apps/ssr`
   - Build command: `cd ../.. && pnpm run build:netlify --filter=@follow/ssr`
   - Publish directory: `apps/ssr/dist`
   - Functions directory: `apps/ssr/netlify/functions`

3. **Deploy Settings**:
   - Node version: 20
   - Package manager: pnpm

### 4. Deploy via Netlify CLI (Alternative)

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# From the monorepo root
cd apps/ssr

# Login to Netlify
netlify login

# Initialize site (first time only)
netlify init

# Deploy
netlify deploy --prod
```

## Configuration Details

### netlify.toml

The `netlify.toml` file configures:

- Build command and output directories
- Node.js version (20)
- Static asset serving for `/dist-external/*`
- Routing all requests to the serverless function
- External modules that shouldn't be bundled

### Build Process

The build:netlify script:

1. Builds Vite frontend → `dist/`
2. Prepares build artifacts (index template)
3. Bundles server code with tsdown → `dist/server/`
4. Cleanup temporary files

### Serverless Function

The Netlify function at `netlify/functions/server.mts`:

- Creates a single Fastify app instance (reused across invocations)
- Adapts Netlify's Request/Response to Node.js req/res for Fastify
- Handles all routes through the Fastify server

## Testing Locally

```bash
# Install Netlify CLI
pnpm add -D netlify-cli

# Build the app
pnpm run build:netlify

# Test with Netlify Dev
netlify dev
```

## Troubleshooting

### Cold Starts

First request may be slower due to function initialization. Consider:

- Using Netlify's Background Functions for heavy operations
- Implementing proper caching strategies

### Bundle Size

If deployment fails due to size:

- Check `external_node_modules` in `netlify.toml`
- Review dependencies that can be externalized

### Environment Variables

Ensure all required env vars are set in Netlify dashboard under:
Site settings → Environment variables

## Differences from Vercel

- **Function format**: Uses Netlify Functions instead of Vercel's API routes
- **Configuration**: `netlify.toml` instead of `vercel.json`
- **Static assets**: Configured via redirects instead of rewrites
- **Bundling**: Uses esbuild via Netlify (specified in netlify.toml)

## Performance Tips

1. Enable Netlify's Edge network for better global performance
2. Use Netlify Analytics to monitor function performance
3. Consider Netlify Edge Functions for ultra-low latency routes
4. Implement proper caching headers in your Fastify routes

## Support

For issues specific to:

- **App code**: Check the main repository issues
- **Netlify deployment**: Consult Netlify documentation or support
