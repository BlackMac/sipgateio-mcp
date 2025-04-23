#!/usr/bin/env node

/**
 * Setup script for the sipgate API MCP server
 * This script helps users obtain and configure their sipgate API credentials
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Determine platform-specific paths
const platform = process.platform;
let mcpSettingsPath;
let claudeSettingsPath;

if (platform === 'darwin') { // macOS
  mcpSettingsPath = path.join(
    process.env.HOME,
    'Library/Application Support/VSCodium/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json'
  );
  claudeSettingsPath = path.join(
    process.env.HOME,
    'Library/Application Support/Claude/claude_desktop_config.json'
  );
} else if (platform === 'win32') { // Windows
  mcpSettingsPath = path.join(
    process.env.APPDATA,
    'VSCodium/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json'
  );
  claudeSettingsPath = path.join(
    process.env.APPDATA,
    'Claude/claude_desktop_config.json'
  );
} else { // Linux and others
  mcpSettingsPath = path.join(
    process.env.HOME,
    '.config/VSCodium/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json'
  );
  claudeSettingsPath = path.join(
    process.env.HOME,
    '.config/Claude/claude_desktop_config.json'
  );
}

console.log('=== Sipgate API MCP Server Setup ===\n');
console.log('This script will help you configure the sipgate API MCP server.\n');
console.log('To use the sipgate API, you need to obtain a Personal Access Token from sipgate:\n');
console.log('1. Log in to your sipgate account at https://app.sipgate.com');
console.log('2. Navigate to "Settings" > "Personal Access Tokens"');
console.log('3. Create a new token with the necessary permissions');
console.log('4. Note down the Token ID and Token\n');

// Ask for the Token ID and Token
rl.question('Enter your sipgate Token ID: ', (tokenId) => {
  rl.question('Enter your sipgate Token: ', (token) => {
    // Ask which app to configure
    rl.question('Which app do you want to configure? (1: VSCodium, 2: Claude Desktop, 3: Both): ', (appChoice) => {
      const configureVSCodium = ['1', '3'].includes(appChoice);
      const configureClaude = ['2', '3'].includes(appChoice);

      if (configureVSCodium) {
        updateMcpSettings(mcpSettingsPath, tokenId, token);
      }

      if (configureClaude) {
        updateMcpSettings(claudeSettingsPath, tokenId, token);
      }

      console.log('\nSetup complete! You can now use the sipgate API MCP server.');
      console.log('To test it, try running a simple command like getting your phone numbers:');
      console.log('\n<use_mcp_tool>');
      console.log('<server_name>sipgate-api</server_name>');
      console.log('<tool_name>get_phone_numbers</tool_name>');
      console.log('<arguments>');
      console.log('{}');
      console.log('</arguments>');
      console.log('</use_mcp_tool>\n');

      rl.close();
    });
  });
});

/**
 * Update the MCP settings file with the sipgate API credentials
 * @param {string} settingsPath - Path to the MCP settings file
 * @param {string} tokenId - Sipgate Token ID
 * @param {string} token - Sipgate Token
 */
function updateMcpSettings(settingsPath, tokenId, token) {
  try {
    let settings = {};
    
    // Check if the settings file exists
    if (fs.existsSync(settingsPath)) {
      try {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(settingsData);
      } catch (error) {
        console.warn(`Warning: Could not parse existing settings file at ${settingsPath}. Creating new file.`);
      }
    } else {
      // Ensure the directory exists
      const settingsDir = path.dirname(settingsPath);
      fs.mkdirSync(settingsDir, { recursive: true });
    }

    // Initialize mcpServers if it doesn't exist
    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }

    // Add or update the sipgate-api server
    settings.mcpServers['sipgate-api'] = {
      command: 'node',
      args: [
        path.join(__dirname, 'build/index.js')
      ],
      env: {
        SIPGATE_TOKEN_ID: tokenId,
        SIPGATE_TOKEN: token
      },
      disabled: false
    };

    // Write the updated settings back to the file
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`Updated settings at ${settingsPath}`);
  } catch (error) {
    console.error(`Error updating settings at ${settingsPath}:`, error.message);
  }
}