#!/bin/bash

# Quick Setup Script for LinkedIn MCP
# Run this after installation to quickly configure everything

set -e

echo "🚀 LinkedIn MCP Quick Setup"
echo "=========================="
echo

# Step 1: Check if already installed
echo "1️⃣ Checking installation..."
if command -v linkedin-mcp &> /dev/null; then
    echo "   ✅ linkedin-mcp is installed"
    linkedin-mcp --version
else
    echo "   ❌ linkedin-mcp not found. Installing..."
    npm install -g @maheidem/linkedin-mcp
fi
echo

# Step 2: Configure Claude
echo "2️⃣ Configuring Claude..."
linkedin-mcp install
echo

# Step 3: Check current status
echo "3️⃣ Checking authentication status..."
linkedin-mcp status
echo

# Step 4: Instructions
echo "📋 Setup Complete!"
echo "================="
echo
echo "To authenticate with LinkedIn:"
echo
echo "1. In Claude, say: 'Get LinkedIn authorization URL'"
echo "2. Open the URL in your browser"
echo "3. Authorize the app"
echo "4. Copy the 'code' parameter from the redirect URL"
echo "5. In Claude, say: 'Exchange LinkedIn code [YOUR_CODE]'"
echo
echo "Once authenticated, you can use all LinkedIn features without providing tokens!"
echo
echo "Examples:"
echo "  - 'Create a LinkedIn post about AI trends'"
echo "  - 'Get my LinkedIn profile information'"
echo "  - 'Check my LinkedIn authentication status'"
echo

# Optional: Open Claude
echo -n "Open Claude Desktop now? [y/N]: "
read -r OPEN_CLAUDE

if [[ "$OPEN_CLAUDE" =~ ^[Yy]$ ]]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a "Claude" 2>/dev/null || echo "Could not open Claude. Please open it manually."
    else
        echo "Please open Claude manually."
    fi
fi