/**
 * Simple Token Manager for LinkedIn MCP
 * Handles token persistence at ~/.linkedin-mcp/tokens/linkedin_token.json
 */

import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Token storage interface
export interface StoredToken {
  access_token: string;
  expires_in: number;
  created_at: number;
  scope?: string;
}

// Storage location - user-wide accessible
const TOKEN_DIR = join(homedir(), '.linkedin-mcp', 'tokens');
const TOKEN_FILE = join(TOKEN_DIR, 'linkedin_token.json');

// 1-hour buffer before expiration
const EXPIRATION_BUFFER_MS = 60 * 60 * 1000;

/**
 * Load token from disk
 */
export async function loadToken(): Promise<StoredToken | null> {
  try {
    const data = await fs.readFile(TOKEN_FILE, 'utf-8');
    return JSON.parse(data) as StoredToken;
  } catch {
    return null;
  }
}

/**
 * Save token to disk
 */
export async function saveToken(token: StoredToken): Promise<void> {
  // Ensure directory exists
  await fs.mkdir(TOKEN_DIR, { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(token, null, 2));
}

/**
 * Check if token is expired (with 1-hour buffer)
 */
export function isTokenExpired(token: StoredToken): boolean {
  const expiresAt = token.created_at + (token.expires_in * 1000);
  const now = Date.now();
  return now >= (expiresAt - EXPIRATION_BUFFER_MS);
}

/**
 * Get a valid access token, or null if expired/missing
 */
export async function getValidToken(): Promise<string | null> {
  const token = await loadToken();

  if (!token) {
    return null;
  }

  if (isTokenExpired(token)) {
    console.error('Token expired. Run linkedin_auto_auth to refresh.');
    return null;
  }

  return token.access_token;
}

/**
 * Get token expiration info for display
 */
export async function getTokenInfo(): Promise<{ valid: boolean; expiresAt?: string; remainingDays?: number } | null> {
  const token = await loadToken();

  if (!token) {
    return null;
  }

  const expiresAt = token.created_at + (token.expires_in * 1000);
  const now = Date.now();
  const remainingMs = expiresAt - now;
  const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));

  return {
    valid: !isTokenExpired(token),
    expiresAt: new Date(expiresAt).toISOString(),
    remainingDays
  };
}
