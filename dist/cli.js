#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const program = new commander_1.Command();
const packageJson = require('../package.json');
class LinkedInMCPInstaller {
    homeDir = os.homedir();
    tokenDir = path.join(this.homeDir, '.linkedin-mcp', 'tokens');
    getClaudeConfigPath() {
        // Check if we're running inside Claude Code by looking for environment variables or process context
        const claudeCodeConfig = path.join(this.homeDir, '.claude.json');
        // Always prefer Claude Code config if it exists and has content
        if (fs.existsSync(claudeCodeConfig)) {
            try {
                const stats = fs.statSync(claudeCodeConfig);
                if (stats.size > 100) { // Config file has some content
                    return claudeCodeConfig;
                }
            }
            catch (error) {
                // Ignore error, fall through to Claude Desktop
            }
        }
        // Check if Claude Code is likely being used (look for .claude directory or other indicators)
        const claudeDir = path.join(this.homeDir, '.claude');
        if (fs.existsSync(claudeDir) || process.env.CLAUDE_CONFIG_DIR) {
            // Force creation of Claude Code config
            return claudeCodeConfig;
        }
        // Fall back to Claude Desktop config
        const platform = os.platform();
        switch (platform) {
            case 'darwin': // macOS
                return path.join(this.homeDir, 'Library/Application Support/Claude/claude_desktop_config.json');
            case 'win32': // Windows
                return path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
            case 'linux': // Linux
                return path.join(this.homeDir, '.config', 'claude', 'claude_desktop_config.json');
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
    async ensureConfigDirectory() {
        const configPath = this.getClaudeConfigPath();
        const configDir = path.dirname(configPath);
        await fs.ensureDir(configDir);
    }
    async loadClaudeConfig() {
        const configPath = this.getClaudeConfigPath();
        try {
            if (await fs.pathExists(configPath)) {
                const content = await fs.readFile(configPath, 'utf-8');
                const fullConfig = JSON.parse(content);
                // If this is Claude Code config (.claude.json), extract or create mcpServers section
                if (configPath.endsWith('.claude.json')) {
                    return fullConfig; // Return full config for Claude Code
                }
                else {
                    return fullConfig; // Return as-is for Claude Desktop
                }
            }
        }
        catch (error) {
            console.warn(chalk_1.default.yellow(`Warning: Could not read existing config: ${error}`));
        }
        return {};
    }
    async saveClaudeConfig(config) {
        const configPath = this.getClaudeConfigPath();
        await this.ensureConfigDirectory();
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }
    getServerPath() {
        // Try to find the installed package
        const globalNodeModules = path.join(os.homedir(), '.npm', 'lib', 'node_modules', '@maheidem', 'linkedin-mcp');
        const localNodeModules = path.join(process.cwd(), 'node_modules', '@maheidem', 'linkedin-mcp');
        const currentDir = path.join(__dirname, '..');
        if (fs.existsSync(path.join(globalNodeModules, 'dist', 'linkedin-complete-mcp.js'))) {
            return path.join(globalNodeModules, 'dist', 'linkedin-complete-mcp.js');
        }
        if (fs.existsSync(path.join(localNodeModules, 'dist', 'linkedin-complete-mcp.js'))) {
            return path.join(localNodeModules, 'dist', 'linkedin-complete-mcp.js');
        }
        if (fs.existsSync(path.join(currentDir, 'dist', 'linkedin-complete-mcp.js'))) {
            return path.join(currentDir, 'dist', 'linkedin-complete-mcp.js');
        }
        throw new Error('LinkedIn MCP server binary not found');
    }
    async install() {
        const spinner = (0, ora_1.default)('Installing LinkedIn MCP server...').start();
        try {
            // 1. Create token storage directory
            spinner.text = 'Setting up token storage...';
            await fs.ensureDir(this.tokenDir);
            // 2. Load existing Claude config
            spinner.text = 'Loading Claude configuration...';
            const config = await this.loadClaudeConfig();
            // 3. Add MCP server configuration
            spinner.text = 'Configuring MCP server...';
            const serverPath = this.getServerPath();
            const configPath = this.getClaudeConfigPath();
            if (!config.mcpServers) {
                config.mcpServers = {};
            }
            config.mcpServers['linkedin-complete'] = {
                command: 'npx',
                args: ['-y', '--package=@maheidem/linkedin-mcp', 'linkedin-mcp-server'],
                env: {
                    LINKEDIN_TOKEN_STORAGE_PATH: this.tokenDir
                }
            };
            // 4. Save updated config
            spinner.text = 'Saving configuration...';
            await this.saveClaudeConfig(config);
            spinner.succeed('LinkedIn MCP server installed successfully!');
            console.log(chalk_1.default.green('\n✅ Installation complete!'));
            // Ask if user wants to authenticate now
            const { doAuth } = await inquirer_1.default.prompt([{
                    type: 'confirm',
                    name: 'doAuth',
                    message: '\nWould you like to complete LinkedIn authentication now?',
                    default: true
                }]);
            if (doAuth) {
                await this.auth();
                console.log(chalk_1.default.green('\n🎉 All done! You are fully set up.'));
                console.log(chalk_1.default.blue('\nJust restart Claude and you can use LinkedIn features immediately!'));
            }
            else {
                console.log(chalk_1.default.blue('\n📝 Next steps:'));
                console.log('1. Run authentication: linkedin-mcp auth');
                console.log('2. Restart Claude Desktop/Code');
                console.log('3. Test the installation: linkedin-mcp status');
            }
            console.log(chalk_1.default.dim(`\n📁 Token storage: ${this.tokenDir}`));
            console.log(chalk_1.default.dim(`📄 Claude config: ${this.getClaudeConfigPath()}`));
        }
        catch (error) {
            spinner.fail('Installation failed');
            console.error(chalk_1.default.red(`Error: ${error}`));
            process.exit(1);
        }
    }
    async uninstall() {
        const spinner = (0, ora_1.default)('Uninstalling LinkedIn MCP server...').start();
        try {
            // 1. Load Claude config
            const config = await this.loadClaudeConfig();
            // 2. Remove MCP server configuration
            if (config.mcpServers) {
                delete config.mcpServers['linkedin-complete'];
                // If no other MCP servers, remove the entire section
                if (Object.keys(config.mcpServers).length === 0) {
                    delete config.mcpServers;
                }
            }
            // 3. Save updated config
            await this.saveClaudeConfig(config);
            // 4. Ask about token cleanup
            const { removeTokens } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'removeTokens',
                    message: 'Remove stored LinkedIn tokens?',
                    default: false
                }
            ]);
            if (removeTokens && await fs.pathExists(this.tokenDir)) {
                await fs.remove(this.tokenDir);
                spinner.text = 'Removed stored tokens';
            }
            spinner.succeed('LinkedIn MCP server uninstalled successfully!');
            console.log(chalk_1.default.yellow('\n⚠️  Please restart Claude Desktop/Code to apply changes'));
        }
        catch (error) {
            spinner.fail('Uninstallation failed');
            console.error(chalk_1.default.red(`Error: ${error}`));
            process.exit(1);
        }
    }
    async status() {
        console.log(chalk_1.default.blue('🔍 LinkedIn MCP Server Status\n'));
        try {
            // Check Claude config
            const config = await this.loadClaudeConfig();
            const isConfigured = config.mcpServers?.['linkedin-complete'] !== undefined;
            console.log(`📄 Claude Configuration: ${chalk_1.default[isConfigured ? 'green' : 'red'](isConfigured ? '✅ Configured' : '❌ Not configured')}`);
            console.log(`   Location: ${this.getClaudeConfigPath()}`);
            if (isConfigured) {
                const serverConfig = config.mcpServers['linkedin-complete'];
                console.log(`   Command: ${serverConfig.command} ${serverConfig.args?.join(' ') || ''}`);
            }
            // Check token storage
            const tokenDirExists = await fs.pathExists(this.tokenDir);
            console.log(`\n📁 Token Storage: ${chalk_1.default[tokenDirExists ? 'green' : 'yellow'](tokenDirExists ? '✅ Directory exists' : '⚠️  Directory not found')}`);
            console.log(`   Location: ${this.tokenDir}`);
            if (tokenDirExists) {
                const files = await fs.readdir(this.tokenDir);
                const tokenFiles = files.filter(f => f.endsWith('.json'));
                console.log(`   Stored tokens: ${tokenFiles.length > 0 ? chalk_1.default.green(`${tokenFiles.length} found`) : chalk_1.default.yellow('None')}`);
                if (tokenFiles.length > 0) {
                    tokenFiles.forEach(file => {
                        console.log(`     - ${file}`);
                    });
                }
            }
            // Check server binary
            try {
                const serverPath = this.getServerPath();
                const serverExists = await fs.pathExists(serverPath);
                console.log(`\n🚀 Server Binary: ${chalk_1.default[serverExists ? 'green' : 'red'](serverExists ? '✅ Found' : '❌ Not found')}`);
                console.log(`   Location: ${serverPath}`);
            }
            catch (error) {
                console.log(`\n🚀 Server Binary: ${chalk_1.default.red('❌ Not found')}`);
                console.log(`   Error: ${error}`);
            }
        }
        catch (error) {
            console.error(chalk_1.default.red(`Error checking status: ${error}`));
            process.exit(1);
        }
    }
    async auth() {
        // Use the comprehensive OAuth setup that handles everything
        const { OAuthSetup } = await Promise.resolve().then(() => __importStar(require('./oauth-setup.js')));
        const setup = new OAuthSetup();
        const success = await setup.setup();
        if (!success) {
            console.error(chalk_1.default.red('\n❌ OAuth setup failed'));
            console.error(chalk_1.default.yellow('Please check your credentials and try again.'));
            process.exit(1);
        }
        console.log(chalk_1.default.green('\n✨ OAuth setup complete!'));
        console.log(chalk_1.default.green('You are now fully authenticated with LinkedIn.'));
        console.log(chalk_1.default.cyan('\n✅ No further authentication steps needed!'));
        console.log(chalk_1.default.cyan('The MCP server will automatically use your stored token.'));
    }
    async postinstall() {
        // Silent post-install setup
        try {
            await fs.ensureDir(this.tokenDir);
        }
        catch (error) {
            // Ignore errors during postinstall
        }
    }
}
// CLI Commands
program
    .name('linkedin-mcp')
    .description('LinkedIn MCP Server CLI')
    .version(packageJson.version);
program
    .command('install')
    .description('Install and configure LinkedIn MCP server for Claude')
    .action(async () => {
    const installer = new LinkedInMCPInstaller();
    await installer.install();
});
program
    .command('uninstall')
    .description('Remove LinkedIn MCP server configuration')
    .action(async () => {
    const installer = new LinkedInMCPInstaller();
    await installer.uninstall();
});
program
    .command('status')
    .description('Check LinkedIn MCP server status')
    .action(async () => {
    const installer = new LinkedInMCPInstaller();
    await installer.status();
});
program
    .command('auth')
    .description('Set up LinkedIn OAuth credentials')
    .action(async () => {
    const installer = new LinkedInMCPInstaller();
    await installer.auth();
});
program
    .command('postinstall')
    .description('Post-installation setup (internal use)')
    .action(async () => {
    const installer = new LinkedInMCPInstaller();
    await installer.postinstall();
});
// Parse command line arguments
program.parse();
//# sourceMappingURL=cli.js.map