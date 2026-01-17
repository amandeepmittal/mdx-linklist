import { readFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';

export type RedirectMap = Record<string, string>;

export function parseRedirectsFile(filePath: string): RedirectMap {
  if (!existsSync(filePath)) {
    console.warn(`Warning: Redirects file not found: ${filePath}`);
    return {};
  }

  const ext = extname(filePath).toLowerCase();
  const content = readFileSync(filePath, 'utf-8');

  try {
    if (ext === '.json') {
      return parseJsonRedirects(content);
    } else if (ext === '.ts' || ext === '.js') {
      return parseTsJsRedirects(content);
    } else {
      console.warn(`Warning: Unsupported redirects file format: ${ext}`);
      return {};
    }
  } catch (error) {
    console.warn(`Warning: Failed to parse redirects file: ${filePath}`);
    console.warn(error instanceof Error ? error.message : String(error));
    return {};
  }
}

function parseJsonRedirects(content: string): RedirectMap {
  const parsed = JSON.parse(content);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('JSON redirects file must contain an object');
  }

  // Validate all values are strings
  const redirects: RedirectMap = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      redirects[normalizeRedirectPath(key)] = value;
    }
  }

  return redirects;
}

function parseTsJsRedirects(content: string): RedirectMap {
  const redirects: RedirectMap = {};

  // Match object literals assigned to variables
  // Handles: const RENAMED_PAGES: Record<string, string> = { ... }
  // And: const redirects = { ... }
  const objectPattern = /(?:const|let|var)\s+\w+\s*(?::[^=]+)?\s*=\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;

  let match;
  while ((match = objectPattern.exec(content)) !== null) {
    const objectContent = match[1];
    parseObjectEntries(objectContent, redirects);
  }

  return redirects;
}

function parseObjectEntries(content: string, redirects: RedirectMap): void {
  // Match key-value pairs like: '/old-path/': '/new-path/',
  // Handles both single and double quotes
  const entryPattern = /['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g;

  let match;
  while ((match = entryPattern.exec(content)) !== null) {
    const [, source, destination] = match;
    redirects[normalizeRedirectPath(source)] = destination;
  }
}

function normalizeRedirectPath(path: string): string {
  // Normalize the path for consistent matching
  let normalized = path;

  // Remove trailing slash for matching (but keep leading slash)
  if (normalized.endsWith('/') && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

export function lookupRedirect(href: string, redirects: RedirectMap): string | undefined {
  // Normalize the href for lookup
  let lookupPath = href.split('#')[0]; // Remove anchor

  // Try exact match first
  if (redirects[lookupPath]) {
    return redirects[lookupPath];
  }

  // Try without trailing slash
  if (lookupPath.endsWith('/') && lookupPath.length > 1) {
    const withoutSlash = lookupPath.slice(0, -1);
    if (redirects[withoutSlash]) {
      return redirects[withoutSlash];
    }
  }

  // Try with trailing slash
  if (!lookupPath.endsWith('/')) {
    const withSlash = lookupPath + '/';
    if (redirects[withSlash]) {
      return redirects[withSlash];
    }
  }

  return undefined;
}
