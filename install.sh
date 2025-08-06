#!/bin/bash

# LinkedIn MCP System-Wide Installation Script
# This script automates the installation and setup process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Header
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}     LinkedIn MCP System-Wide Installer${NC}"
echo -e "${BLUE}================================================${NC}"
echo

# Check for Node.js
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) found"

# Check for npm
print_status "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi
print_success "npm $(npm -v) found"

# Installation method selection
echo
echo "Select installation method:"
echo "1) Install from npm registry (recommended)"
echo "2) Install from current directory (development)"
echo -n "Choice [1]: "
read -r INSTALL_METHOD
INSTALL_METHOD=${INSTALL_METHOD:-1}

# Perform installation
echo
if [ "$INSTALL_METHOD" = "1" ]; then
    print_status "Installing @maheidem/linkedin-mcp globally from npm..."
    npm install -g @maheidem/linkedin-mcp
elif [ "$INSTALL_METHOD" = "2" ]; then
    print_status "Building and installing from current directory..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "Not in the linkedin-optimizer-mcp directory"
        exit 1
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Build
    print_status "Building project..."
    npm run build
    
    # Create global link
    print_status "Creating global link..."
    npm link
else
    print_error "Invalid choice"
    exit 1
fi

# Verify installation
echo
print_status "Verifying installation..."
if command -v linkedin-mcp &> /dev/null; then
    print_success "linkedin-mcp CLI installed successfully"
    INSTALLED_VERSION=$(linkedin-mcp --version 2>/dev/null || echo "unknown")
    print_status "Version: $INSTALLED_VERSION"
else
    print_error "Installation verification failed"
    print_warning "You may need to add npm global bin to your PATH"
    echo "Add this to your ~/.bashrc or ~/.zshrc:"
    echo 'export PATH="$(npm bin -g):$PATH"'
    exit 1
fi

# Configure Claude
echo
echo "Configure Claude integration?"
echo -n "Continue? [Y/n]: "
read -r CONFIGURE_CLAUDE
CONFIGURE_CLAUDE=${CONFIGURE_CLAUDE:-Y}

if [[ "$CONFIGURE_CLAUDE" =~ ^[Yy]$ ]]; then
    print_status "Configuring Claude integration..."
    linkedin-mcp install
    
    if [ $? -eq 0 ]; then
        print_success "Claude configuration complete"
    else
        print_warning "Claude configuration may need manual setup"
    fi
fi

# OAuth Setup
echo
echo "Set up LinkedIn OAuth credentials?"
echo -n "Continue? [Y/n]: "
read -r SETUP_OAUTH
SETUP_OAUTH=${SETUP_OAUTH:-Y}

if [[ "$SETUP_OAUTH" =~ ^[Yy]$ ]]; then
    print_status "Setting up OAuth credentials..."
    echo
    echo "You'll need:"
    echo "1. LinkedIn Client ID"
    echo "2. LinkedIn Client Secret"
    echo
    echo "Get these from: https://www.linkedin.com/developers/"
    echo
    linkedin-mcp auth
fi

# Check status
echo
print_status "Checking installation status..."
linkedin-mcp status

# Final instructions
echo
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}     Installation Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo
echo "Next steps:"
echo "1. Restart Claude Desktop/Code"
echo "2. In Claude, run: 'Check my LinkedIn authentication status'"
echo "3. If not authenticated:"
echo "   - Run: 'Get LinkedIn authorization URL'"
echo "   - Open the URL in browser and authorize"
echo "   - Run: 'Exchange code [CODE_FROM_URL]'"
echo
echo "Commands available:"
echo "  linkedin-mcp status    - Check status"
echo "  linkedin-mcp auth      - Update OAuth credentials"
echo "  linkedin-mcp install   - Reconfigure Claude"
echo "  linkedin-mcp --help    - Show all commands"
echo
print_success "System-wide installation complete!"

# Add to PATH reminder if needed
if ! echo "$PATH" | grep -q "$(npm bin -g)"; then
    echo
    print_warning "Remember to add npm global bin to your PATH:"
    echo "Add to ~/.bashrc or ~/.zshrc:"
    echo 'export PATH="$(npm bin -g):$PATH"'
fi