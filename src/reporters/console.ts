import chalk from 'chalk';
import { LinkCheckResult, CheckSummary } from '../types.js';
import { formatDuration, relativePath } from '../utils.js';

export function reportConsole(
  results: LinkCheckResult[],
  summary: CheckSummary,
  baseDir: string,
  verbose: boolean
): void {
  const brokenInternal = results.filter(
    (r) =>
      r.status === 'broken' &&
      (r.link.type === 'internal' || r.link.type === 'anchor')
  );
  const brokenExternal = results.filter(
    (r) => r.status === 'broken' && r.link.type === 'external'
  );
  const timeouts = results.filter((r) => r.status === 'timeout');
  const skipped = results.filter((r) => r.status === 'skipped');

  console.log('');

  // Broken internal links
  if (brokenInternal.length > 0) {
    console.log(
      chalk.red.bold(`BROKEN INTERNAL LINKS (${brokenInternal.length})`)
    );
    console.log('');

    for (const result of brokenInternal) {
      const relPath = relativePath(result.link.sourceFile, baseDir);
      console.log(
        chalk.yellow(`  ${relPath}:${result.link.line}:${result.link.column || 0}`)
      );
      console.log(chalk.dim(`  │ ${result.link.context}`));
      console.log(chalk.red(`  └─ ${result.error}`));

      if (result.suggestions && result.suggestions.length > 0) {
        console.log(
          chalk.cyan(`     Suggestions: ${result.suggestions.join(', ')}`)
        );
      }
      console.log('');
    }
  }

  // Broken external links
  if (brokenExternal.length > 0) {
    console.log(
      chalk.red.bold(`BROKEN EXTERNAL LINKS (${brokenExternal.length})`)
    );
    console.log('');

    for (const result of brokenExternal) {
      const relPath = relativePath(result.link.sourceFile, baseDir);
      console.log(
        chalk.yellow(`  ${relPath}:${result.link.line}:${result.link.column || 0}`)
      );
      console.log(chalk.dim(`  │ ${result.link.href}`));
      console.log(
        chalk.red(
          `  └─ ${result.error}${result.statusCode ? ` (${result.statusCode})` : ''}`
        )
      );
      console.log('');
    }
  }

  // Timeouts
  if (timeouts.length > 0) {
    console.log(chalk.yellow.bold(`TIMEOUTS (${timeouts.length})`));
    console.log('');

    for (const result of timeouts) {
      const relPath = relativePath(result.link.sourceFile, baseDir);
      console.log(chalk.yellow(`  ${relPath}:${result.link.line}`));
      console.log(chalk.dim(`  │ ${result.link.href}`));
      console.log(chalk.yellow(`  └─ ${result.error}`));
      console.log('');
    }
  }

  // Skipped (only in verbose mode)
  if (verbose && skipped.length > 0) {
    console.log(chalk.gray.bold(`SKIPPED (${skipped.length})`));
    console.log('');

    for (const result of skipped) {
      const relPath = relativePath(result.link.sourceFile, baseDir);
      console.log(chalk.gray(`  ${relPath}:${result.link.line}`));
      console.log(chalk.gray(`  └─ ${result.link.href}`));
    }
    console.log('');
  }

  // Summary
  console.log(chalk.dim('─'.repeat(50)));
  console.log(chalk.bold('SUMMARY'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log(`  Files scanned     ${chalk.cyan(summary.filesScanned)}`);
  console.log(`  Total links       ${chalk.cyan(summary.totalLinks)}`);
  console.log(`  ├─ Internal       ${chalk.cyan(summary.internalLinks)}`);
  console.log(`  └─ External       ${chalk.cyan(summary.externalLinks)}`);
  console.log('');

  const brokenTotal = summary.brokenInternal + summary.brokenExternal;
  const brokenColor = brokenTotal > 0 ? chalk.red : chalk.green;
  console.log(`  Broken            ${brokenColor(brokenTotal)}`);

  if (brokenTotal > 0) {
    console.log(`  ├─ Internal       ${chalk.red(summary.brokenInternal)}`);
    console.log(`  └─ External       ${chalk.red(summary.brokenExternal)}`);
  }

  if (summary.timeouts > 0) {
    console.log(`  Timeouts          ${chalk.yellow(summary.timeouts)}`);
  }
  if (summary.skipped > 0) {
    console.log(`  Skipped           ${chalk.gray(summary.skipped)}`);
  }

  console.log('');
  console.log(`  Duration          ${chalk.cyan(formatDuration(summary.duration))}`);
  console.log(chalk.dim('─'.repeat(50)));
}
