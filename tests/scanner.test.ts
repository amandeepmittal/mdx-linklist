import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { scanFiles } from '../src/scanner/file-scanner.js';
import { extractLinksFromFile } from '../src/scanner/link-extractor.js';
import { DEFAULT_CONFIG } from '../src/types.js';

const fixturesDir = resolve(__dirname, 'fixtures');

describe('file-scanner', () => {
  it('finds all mdx files in valid-docs', async () => {
    const files = await scanFiles(
      resolve(fixturesDir, 'valid-docs'),
      DEFAULT_CONFIG
    );

    expect(files.length).toBe(3);
    expect(files.some((f) => f.endsWith('index.mdx'))).toBe(true);
    expect(files.some((f) => f.endsWith('intro.mdx'))).toBe(true);
    expect(files.some((f) => f.endsWith('advanced.mdx'))).toBe(true);
  });

  it('respects exclude patterns', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      exclude: ['**/intro.mdx'],
    };

    const files = await scanFiles(resolve(fixturesDir, 'valid-docs'), config);

    expect(files.some((f) => f.endsWith('intro.mdx'))).toBe(false);
  });
});

describe('link-extractor', () => {
  it('extracts markdown links', () => {
    const links = extractLinksFromFile(
      resolve(fixturesDir, 'valid-docs/index.mdx'),
      DEFAULT_CONFIG
    );

    const hrefs = links.map((l) => l.href);

    expect(hrefs).toContain('./intro.mdx');
    expect(hrefs).toContain('./advanced.mdx#configuration');
    expect(hrefs).toContain('https://react.dev');
  });

  it('extracts JSX Link components', () => {
    const links = extractLinksFromFile(
      resolve(fixturesDir, 'edge-cases/jsx-links.mdx'),
      DEFAULT_CONFIG
    );

    const hrefs = links.map((l) => l.href);

    expect(hrefs).toContain('./other.mdx');
    expect(hrefs).toContain('https://example.com');
  });

  it('extracts custom components when configured', () => {
    const config = {
      ...DEFAULT_CONFIG,
      customComponents: ['Link', 'A', 'CustomLink'],
    };

    const links = extractLinksFromFile(
      resolve(fixturesDir, 'edge-cases/jsx-links.mdx'),
      config
    );

    const hrefs = links.map((l) => l.href);

    expect(hrefs).toContain('/api/reference');
  });

  it('extracts anchor links', () => {
    const links = extractLinksFromFile(
      resolve(fixturesDir, 'valid-docs/index.mdx'),
      DEFAULT_CONFIG
    );

    const anchorLinks = links.filter((l) => l.type === 'anchor');

    expect(anchorLinks.length).toBeGreaterThan(0);
    expect(anchorLinks.some((l) => l.href === '#getting-started')).toBe(true);
  });

  it('classifies link types correctly', () => {
    const links = extractLinksFromFile(
      resolve(fixturesDir, 'valid-docs/index.mdx'),
      DEFAULT_CONFIG
    );

    const internal = links.filter((l) => l.type === 'internal');
    const external = links.filter((l) => l.type === 'external');
    const anchor = links.filter((l) => l.type === 'anchor');

    expect(internal.length).toBeGreaterThan(0);
    expect(external.length).toBeGreaterThan(0);
    expect(anchor.length).toBeGreaterThan(0);
  });

  it('skips special protocols', () => {
    const links = extractLinksFromFile(
      resolve(fixturesDir, 'edge-cases/special-links.mdx'),
      DEFAULT_CONFIG
    );

    const hrefs = links.map((l) => l.href);

    expect(hrefs).not.toContain('mailto:test@example.com');
    expect(hrefs).not.toContain('tel:+1234567890');
    expect(hrefs).not.toContain('javascript:void(0)');
  });

  it('includes line numbers', () => {
    const links = extractLinksFromFile(
      resolve(fixturesDir, 'valid-docs/index.mdx'),
      DEFAULT_CONFIG
    );

    for (const link of links) {
      expect(link.line).toBeGreaterThan(0);
    }
  });
});
