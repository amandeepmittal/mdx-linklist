export type LinkType = 'internal' | 'external' | 'anchor' | 'asset';

export type LinkStatus = 'valid' | 'broken' | 'skipped' | 'timeout';

export interface ExtractedLink {
  type: LinkType;
  href: string;
  resolvedPath?: string;
  sourceFile: string;
  line: number;
  column?: number;
  context?: string;
}

export interface LinkCheckResult {
  link: ExtractedLink;
  status: LinkStatus;
  statusCode?: number;
  error?: string;
  suggestion?: string;
  suggestions?: string[];
  responseTime?: number;
}

export interface CheckSummary {
  filesScanned: number;
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  brokenInternal: number;
  brokenExternal: number;
  skipped: number;
  timeouts: number;
  duration: number;
}

export interface Config {
  include: string[];
  exclude: string[];
  ignorePatterns: string[];
  ignoreDomains: string[];
  timeout: number;
  retries: number;
  concurrency: number;
  internalOnly: boolean;
  externalOnly: boolean;
  customComponents: string[];
  routePrefixes: string[];
}

export const DEFAULT_CONFIG: Config = {
  include: ['./**/*.mdx', './**/*.md'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
  ignorePatterns: ['localhost:*', '127.0.0.1:*', '*.local'],
  ignoreDomains: [],
  timeout: 10000,
  retries: 2,
  concurrency: 10,
  internalOnly: false,
  externalOnly: false,
  customComponents: ['Link', 'A'],
  routePrefixes: [],
};
