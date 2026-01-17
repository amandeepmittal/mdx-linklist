import { LinkCheckResult, CheckSummary } from '../types.js';
import { relativePath } from '../utils.js';

interface JsonRedirectedLink {
  href: string;
  sourceFile: string;
  line: number;
  column?: number;
  destination: string;
}

interface JsonReport {
  summary: CheckSummary;
  broken: JsonBrokenLink[];
  redirected: JsonRedirectedLink[];
  skipped: JsonSkippedLink[];
}

interface JsonBrokenLink {
  type: string;
  href: string;
  sourceFile: string;
  line: number;
  column?: number;
  context?: string;
  error?: string;
  statusCode?: number;
  suggestions?: string[];
}

interface JsonSkippedLink {
  href: string;
  sourceFile: string;
  line: number;
  reason: string;
}

export function reportJson(
  results: LinkCheckResult[],
  summary: CheckSummary,
  baseDir: string
): string {
  const broken = results
    .filter((r) => r.status === 'broken' || r.status === 'timeout')
    .map((r) => ({
      type: r.link.type,
      href: r.link.href,
      sourceFile: relativePath(r.link.sourceFile, baseDir),
      line: r.link.line,
      column: r.link.column,
      context: r.link.context,
      error: r.error,
      statusCode: r.statusCode,
      suggestions: r.suggestions,
    }));

  const redirected = results
    .filter((r) => r.status === 'redirected')
    .map((r) => ({
      href: r.link.href,
      sourceFile: relativePath(r.link.sourceFile, baseDir),
      line: r.link.line,
      column: r.link.column,
      destination: r.redirectDestination || '',
    }));

  const skipped = results
    .filter((r) => r.status === 'skipped')
    .map((r) => ({
      href: r.link.href,
      sourceFile: relativePath(r.link.sourceFile, baseDir),
      line: r.link.line,
      reason: 'Matched ignore pattern',
    }));

  const report: JsonReport = {
    summary,
    broken,
    redirected,
    skipped,
  };

  return JSON.stringify(report, null, 2);
}
