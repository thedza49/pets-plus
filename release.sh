#!/bin/bash
# Release script for Pets Plus Portal

PROJECT_DIR="/home/daniel/pets-plus-portal"
cd "$PROJECT_DIR" || exit

echo "🚀 Starting Pets Plus release process..."

# 1. Versioning
VERSION=$(node -e "const m=require('./behavior_pack/manifest.json'); console.log(m.header.version.join('.'))")
echo "Current version: $VERSION"

# 2. Commit and Push
# This will trigger the Build and Release GitHub Action
echo "📤 Committing and pushing to trigger GitHub Action..."
git add .
git commit -m "chore: manual release $VERSION"
git push origin main

echo "🎉 Push complete! GitHub Action will build and publish the .mcaddon shortly."
echo "Check progress here: https://github.com/thedza49/pets-plus/actions"
