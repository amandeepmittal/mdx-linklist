import { Command } from 'commander';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import ora from 'ora';
import chalk from 'chalk';
import { loadConfig, mergeConfig } from './config.js';
import { scanFiles, extractLinksFromFile } from './scanner/index.js';
import { validateInternalLink, validateExternalLinks } from './validators/index.js';
import { reportConsole, reportJson, reportMarkdown } from './reporters/index.js';
import {
  ExtractedLink,
  LinkCheckResult,
  CheckSummary,
  Config,
  DEFAULT_CONFIG,
} from './types.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('mdx-linklist')
    .description('Extract and validate links in MDX files')
    .version('0.1.0');

  program
    .command('check')
    .description('Check links in MDX files')
    .argument('<directory>', 'Directory to scan for MDX files')
    .option('-c, --config <path>', 'Path to config file')
    .option('-i, --internal-only', 'Only check internal links')
    .option('-e, --external-only', 'Only check external links')
    .option('--ignore <pattern>', 'Ignore URL pattern (can be repeated)', collect, [])
    .option('--ignore-domain <domain>', 'Ignore domain (can be repeated)', collect, [])
    .option('--route-prefix <prefix>', 'Route prefix for absolute paths (can be repeated)', collect, [])
    .option('--component <name>', 'Custom JSX component with href prop (can be repeated)', collect, [])
    .option('-t, --timeout <ms>', 'External request timeout', '10000')
    .option('--concurrency <n>', 'Parallel requests', '10')
    .option('-f, --format <type>', 'Output format: console|json|markdown', 'console')
    .option('-o, --output <file>', 'Write report to file')
    .option('--no-progress', 'Hide progress bar')
    .option('--no-fail', 'Do not exit with code 1 on broken links')
    .option('-v, --verbose', 'Show all links, not just broken')
    .action(async (directory: string, options) => {
      await runCheck(directory, options);
    });

  return program;
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

async function runCheck(directory: string, options: Record<string, unknown>): Promise<void> {
  const startTime = Date.now();
  const baseDir = resolve(process.cwd(), directory);

  // Load and merge config
  let config = loadConfig(options.config as string | undefined);

  // Apply CLI overrides
  const overrides: Partial<Config> = {};

  if (options.internalOnly) overrides.internalOnly = true;
  if (options.externalOnly) overrides.externalOnly = true;
  if ((options.ignore as string[]).length > 0) {
    overrides.ignorePatterns = options.ignore as string[];
  }
  if ((options.ignoreDomain as string[]).length > 0) {
    overrides.ignoreDomains = options.ignoreDomain as string[];
  }
  if ((options.routePrefix as string[]).length > 0) {
    overrides.routePrefixes = options.routePrefix as string[];
  }
  if ((options.component as string[]).length > 0) {
    overrides.customComponents = options.component as string[];
  }
  if (options.timeout) overrides.timeout = parseInt(options.timeout as string, 10);
  if (options.concurrency) overrides.concurrency = parseInt(options.concurrency as string, 10);

  config = mergeConfig(config, overrides);

  const showProgress = options.progress !== false;
  const format = options.format as 'console' | 'json' | 'markdown';
  const verbose = options.verbose as boolean;

  // Scan for files
  let spinner = showProgress ? ora(' ☕ Brewing your link report... ').start() : null;

  const files = await scanFiles(directory, config);

  if (files.length === 0) {
    spinner?.fail(' 😢 No MDX files found ');
    process.exit(0);
  }

  spinner?.succeed(` 📁 Found ${files.length} files `);

  // Extract links from all files
  spinner = showProgress ? ora(' 🎣 Fishing for links... ').start() : null;

  const allLinks: ExtractedLink[] = [];

  for (let i = 0; i < files.length; i++) {
    const links = extractLinksFromFile(files[i], config);
    allLinks.push(...links);
    if (i % 10 === 0) await yieldToEventLoop();
  }

  spinner?.succeed(` 🔗 Caught ${allLinks.length} links `);

  // Filter links based on config
  let linksToCheck = allLinks;

  if (config.internalOnly) {
    linksToCheck = allLinks.filter(
      (l) => l.type === 'internal' || l.type === 'anchor' || l.type === 'asset'
    );
  } else if (config.externalOnly) {
    linksToCheck = allLinks.filter((l) => l.type === 'external');
  }

  // Validate links
  const results: LinkCheckResult[] = [];

  // Check internal links
  const internalLinks = linksToCheck.filter(
    (l) => l.type === 'internal' || l.type === 'anchor' || l.type === 'asset'
  );
  const externalLinks = linksToCheck.filter((l) => l.type === 'external');

  if (internalLinks.length > 0) {
    spinner = showProgress
      ? ora(` 🏠 Knocking on ${internalLinks.length} local doors... `).start()
      : null;

    for (let i = 0; i < internalLinks.length; i++) {
      const result = await validateInternalLink(internalLinks[i], baseDir, config, files);
      results.push(result);
      if (i % 10 === 0) await yieldToEventLoop();
    }

    spinner?.succeed(` 🏠 Visited ${internalLinks.length} local doors `);
  }

  if (externalLinks.length > 0 && !config.internalOnly) {
    spinner = showProgress
      ? ora(` 🌐 Pinging the interwebs (${externalLinks.length} links)... `).start()
      : null;

    const externalResults = await validateExternalLinks(externalLinks, config);
    results.push(...externalResults);

    spinner?.succeed(` 🌐 Pinged ${externalLinks.length} external links `);
  }

  // Calculate summary
  const summary: CheckSummary = {
    filesScanned: files.length,
    totalLinks: allLinks.length,
    internalLinks: allLinks.filter(
      (l) => l.type === 'internal' || l.type === 'anchor' || l.type === 'asset'
    ).length,
    externalLinks: allLinks.filter((l) => l.type === 'external').length,
    brokenInternal: results.filter(
      (r) =>
        r.status === 'broken' &&
        (r.link.type === 'internal' || r.link.type === 'anchor' || r.link.type === 'asset')
    ).length,
    brokenExternal: results.filter(
      (r) => r.status === 'broken' && r.link.type === 'external'
    ).length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    timeouts: results.filter((r) => r.status === 'timeout').length,
    duration: Date.now() - startTime,
  };

  // Generate report
  let output: string;

  switch (format) {
    case 'json':
      output = reportJson(results, summary, baseDir);
      break;
    case 'markdown':
      output = reportMarkdown(results, summary, baseDir);
      break;
    default:
      reportConsole(results, summary, baseDir, verbose);
      output = '';
  }

  // Write to file if specified
  if (options.output && output) {
    writeFileSync(options.output as string, output, 'utf-8');
    console.log(chalk.green(`Report written to ${options.output}`));
  } else if (output) {
    console.log(output);
  }

  // Exit with error code if broken links found
  const brokenCount = summary.brokenInternal + summary.brokenExternal + summary.timeouts;

  if (brokenCount > 0 && options.fail !== false) {
    process.exit(1);
  }
}
