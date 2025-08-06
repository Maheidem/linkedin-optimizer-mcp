#!/bin/bash

# Force Reinstall Script for LinkedIn MCP
# This completely removes and reinstalls everything

set -e

echo "🔄 LinkedIn MCP Force Reinstall"
echo "================================"
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  This will remove all LinkedIn MCP data including tokens!${NC}"
echo -n "Continue? [y/N]: "
read -r CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo
echo -e "${BLUE}[1/6]${NC} Uninstalling from Claude..."
linkedin-mcp uninstall 2>/dev/null || true

echo -e "${BLUE}[2/6]${NC} Removing global npm package..."
npm uninstall -g @maheidem/linkedin-mcp 2>/dev/null || true

echo -e "${BLUE}[3/6]${NC} Clearing stored data..."
rm -rf ~/.linkedin-mcp

echo -e "${BLUE}[4/6]${NC} Clearing npm cache..."
npm cache clean --force

echo -e "${BLUE}[5/6]${NC} Installing fresh..."
if [ -f "package.json" ]; then
    # We're in the development directory
    echo "   Installing from local directory..."
    npm run clean 2>/dev/null || true
    npm install
    npm run build
    npm link
else
    # Install from npm
    echo "   Installing from npm registry..."
    npm install -g @maheidem/linkedin-mcp
fi

echo -e "${BLUE}[6/6]${NC} Configuring Claude..."
linkedin-mcp install

echo
echo -e "${GREEN}✅ Force reinstall complete!${NC}"
echo
echo "Next steps:"
echo "1. Restart Claude Desktop/Code"
echo "2. The installer should have prompted for authentication"
echo "3. If not, run: linkedin-mcp auth"
echo
echo -e "${GREEN}All done! Your LinkedIn MCP is fresh and ready.${NC}"