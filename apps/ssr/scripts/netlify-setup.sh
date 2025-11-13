#!/bin/bash

# Netlify Setup Script for Follow SSR
# Run this from the monorepo root

set -e

echo "📦 Installing dependencies..."
pnpm install

echo "✅ Netlify configuration complete!"
echo ""
echo "Next steps:"
echo "1. Update pnpm to v9+ if needed: pnpm add -g pnpm"
echo "2. Set environment variables in Netlify dashboard"
echo "3. Connect your repo to Netlify"
echo "4. Deploy using: netlify deploy --prod"
echo ""
echo "See apps/ssr/NETLIFY_DEPLOY.md for detailed instructions"
