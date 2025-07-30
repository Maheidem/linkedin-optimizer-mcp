# Quick Installation Guide

## One-Command Install

```bash
npx @maheidem/linkedin-mcp install
```

This command will:
1. ✅ Install the LinkedIn MCP server
2. ✅ Detect your operating system
3. ✅ Find Claude's configuration file
4. ✅ Add the MCP server configuration
5. ✅ Set up secure token storage
6. ✅ Provide next steps

## Manual Installation

If you prefer manual setup:

```bash
# Install globally
npm install -g @maheidem/linkedin-mcp

# Or install locally
npm install @maheidem/linkedin-mcp

# Run installation
linkedin-mcp install
```

## After Installation

1. **Restart Claude** Desktop or Code
2. **Set up authentication**:
   ```bash
   linkedin-mcp auth
   ```
3. **Test the setup**:
   ```bash
   linkedin-mcp status
   ```

## Troubleshooting

- **Installation fails**: Run with `--verbose` flag
- **Claude doesn't see the server**: Check `linkedin-mcp status`
- **Permission errors**: Run `linkedin-mcp install` again

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/maheidem/linkedin-mcp/issues)
- 📚 **Full Docs**: [README.md](./README.md)