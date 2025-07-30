# Contributing to LinkedIn MCP

Thank you for your interest in contributing to the LinkedIn MCP project! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Git
- LinkedIn Developer Account (for testing)

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/linkedin-mcp.git
   cd linkedin-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## 📁 Project Structure

```
├── src/                    # TypeScript source code
│   ├── api/               # LinkedIn API client
│   ├── tools/             # MCP tools implementation
│   ├── types/             # TypeScript type definitions
│   ├── cli.ts            # CLI interface
│   └── index.ts          # Main entry point
├── examples/               # Usage examples and demos
├── tests/                 # Test files
├── docs/                  # Documentation
├── configs/               # Configuration templates
└── .github/workflows/     # CI/CD workflows
```

## 🛠 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Ensure TypeScript compilation passes

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Test specific functionality
npm run test:examples
npm run test:oauth

# Check TypeScript
npm run type-check

# Run linting
npm run lint
```

### 4. Commit Your Changes

We follow conventional commit messages:

```bash
git commit -m "feat: add new LinkedIn profile analysis tool"
git commit -m "fix: resolve OAuth token refresh issue"
git commit -m "docs: update API reference"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 🧪 Testing Guidelines

### Writing Tests

- Place test files in the `tests/` directory
- Use descriptive test names
- Test both success and error scenarios
- Mock external API calls when possible

### Test Types

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test MCP server functionality
3. **OAuth Tests**: Test authentication flows (with test tokens)
4. **Example Tests**: Ensure examples work correctly

### Running Tests

```bash
# All tests
npm test

# Watch mode during development
npm run test:watch

# Test coverage
npm run test:coverage
```

## 📚 Documentation

### Code Documentation

- Use JSDoc comments for public APIs
- Include parameter and return type descriptions
- Provide usage examples in comments

### Documentation Files

- Update relevant `.md` files in `docs/`
- Add examples to `examples/` directory
- Update README.md if adding new features

## 🎯 Contribution Areas

### High Priority
- 🐛 Bug fixes
- 🔒 Security improvements
- 📊 Additional LinkedIn API endpoints
- 🧪 Test coverage improvements

### Medium Priority
- 📚 Documentation improvements
- 🎨 Code style and organization
- ⚡ Performance optimizations
- 🔧 Developer experience improvements

### Ideas Welcome
- 🌟 New MCP tools
- 🎯 Enhanced content generation
- 📈 Analytics features
- 🤖 AI-powered optimizations

## 🔍 Code Review Process

### Before Submitting

1. ✅ All tests pass
2. ✅ TypeScript compiles without errors
3. ✅ Linting passes
4. ✅ Documentation is updated
5. ✅ Examples work correctly

### Review Criteria

- **Functionality**: Does it work as intended?
- **Security**: Are there any security concerns?
- **Performance**: Does it impact performance negatively?
- **Maintainability**: Is the code clean and well-structured?
- **Testing**: Are there adequate tests?
- **Documentation**: Is it properly documented?

## 🔒 Security Considerations

### Sensitive Data

- Never commit access tokens or credentials
- Use environment variables for sensitive configuration
- Sanitize user inputs
- Follow OAuth 2.0 best practices

### Security Review

All contributions affecting authentication, data handling, or network requests will undergo additional security review.

## 📋 Issue Reporting

### Bug Reports

Include:
- **Environment**: OS, Node.js version, package version
- **Steps to Reproduce**: Clear, step-by-step instructions
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Logs**: Relevant error messages or logs

### Feature Requests

Include:
- **Use Case**: Why is this feature needed?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other ways to achieve the goal
- **Additional Context**: Screenshots, examples, etc.

## 📞 Getting Help

- 🐛 **Issues**: [GitHub Issues](https://github.com/maheidem/linkedin-mcp/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/maheidem/linkedin-mcp/discussions)
- 📚 **Documentation**: Check the `docs/` directory

## 🏆 Recognition

Contributors will be:
- Listed in the README.md acknowledgments
- Mentioned in release notes for significant contributions
- Invited to become maintainers for substantial ongoing contributions

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to LinkedIn MCP! 🎉