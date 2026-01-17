import { LinkCheckResult, CheckSummary } from '../types.js';
import { relativePath, formatDuration } from '../utils.js';

export function reportMarkdown(
  results: LinkCheckResult[],
  summary: CheckSummary,
  baseDir: string
): string {
  const lines: string[] = [];
  const now = new Date().toISOString();

  lines.push('# Link Check Report');
  lines.push('');
  lines.push(`Generated: ${now}`);
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Files scanned | ${summary.filesScanned} |`);
  lines.push(`| Total links | ${summary.totalLinks} |`);
  lines.push(`| Internal links | ${summary.internalLinks} |`);
  lines.push(`| External links | ${summary.externalLinks} |`);
  lines.push(
    `| Broken (internal) | ${summary.brokenInternal} |`
  );
  lines.push(
    `| Broken (external) | ${summary.brokenExternal} |`
  );
  lines.push(`| Timeouts | ${summary.timeouts} |`);
  lines.push(`| Redirected | ${summary.redirected} |`);
  lines.push(`| Skipped | ${summary.skipped} |`);
  lines.push(`| Duration | ${formatDuration(summary.duration)} |`);
  lines.push('');

  // Broken internal links
  const brokenInternal = results.filter(
    (r) =>
      (r.status === 'broken' || r.status === 'timeout') &&
      (r.link.type === 'internal' || r.link.type === 'anchor')
  );

  if (brokenInternal.length > 0) {
    lines.push(`## Broken Internal Links (${brokenInternal.length})`);
    lines.push('');

    // Group by file
    const byFile = new Map<string, LinkCheckResult[]>();
    for (const result of brokenInternal) {
      const file = relativePath(result.link.sourceFile, baseDir);
      const existing = byFile.get(file) || [];
      existing.push(result);
      byFile.set(file, existing);
    }

    for (const [file, fileResults] of byFile) {
      lines.push(`### ${file}`);
      lines.push('');

      for (const result of fileResults) {
        lines.push(`- **Line ${result.link.line}**: \`${result.link.href}\``);
        lines.push(`  - Error: ${result.error}`);

        if (result.suggestions && result.suggestions.length > 0) {
          lines.push(`  - Suggestions: ${result.suggestions.join(', ')}`);
        }
      }
      lines.push('');
    }
  }

  // Broken external links
  const brokenExternal = results.filter(
    (r) =>
      (r.status === 'broken' || r.status === 'timeout') &&
      r.link.type === 'external'
  );

  if (brokenExternal.length > 0) {
    lines.push(`## Broken External Links (${brokenExternal.length})`);
    lines.push('');

    // Group by file
    const byFile = new Map<string, LinkCheckResult[]>();
    for (const result of brokenExternal) {
      const file = relativePath(result.link.sourceFile, baseDir);
      const existing = byFile.get(file) || [];
      existing.push(result);
      byFile.set(file, existing);
    }

    for (const [file, fileResults] of byFile) {
      lines.push(`### ${file}`);
      lines.push('');

      for (const result of fileResults) {
        lines.push(`- **Line ${result.link.line}**: ${result.link.href}`);
        lines.push(
          `  - Error: ${result.error}${result.statusCode ? ` (${result.statusCode})` : ''}`
        );
      }
      lines.push('');
    }
  }

  // Redirected links
  const redirected = results.filter((r) => r.status === 'redirected');

  if (redirected.length > 0) {
    lines.push(`## Redirected Links (${redirected.length})`);
    lines.push('');

    // Group by file
    const byFile = new Map<string, LinkCheckResult[]>();
    for (const result of redirected) {
      const file = relativePath(result.link.sourceFile, baseDir);
      const existing = byFile.get(file) || [];
      existing.push(result);
      byFile.set(file, existing);
    }

    for (const [file, fileResults] of byFile) {
      lines.push(`### ${file}`);
      lines.push('');

      for (const result of fileResults) {
        lines.push(`- **Line ${result.link.line}**: \`${result.link.href}\``);
        lines.push(`  - Redirects to: \`${result.redirectDestination}\``);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
