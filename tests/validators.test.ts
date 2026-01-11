import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateInternalLink } from '../src/validators/internal.js';
import { DEFAULT_CONFIG, ExtractedLink } from '../src/types.js';

const fixturesDir = resolve(__dirname, 'fixtures');
const validDocsDir = resolve(fixturesDir, 'valid-docs');
const brokenInternalDir = resolve(fixturesDir, 'broken-internal');

describe('internal-validator', () => {
  const allFiles = [
    resolve(validDocsDir, 'index.mdx'),
    resolve(validDocsDir, 'intro.mdx'),
    resolve(validDocsDir, 'advanced.mdx'),
  ];

  it('validates existing files', async () => {
    const link: ExtractedLink = {
      type: 'internal',
      href: './intro.mdx',
      sourceFile: resolve(validDocsDir, 'index.mdx'),
      line: 5,
      context: '[introduction](./intro.mdx)',
    };

    const result = await validateInternalLink(
      link,
      validDocsDir,
      DEFAULT_CONFIG,
      allFiles
    );

    expect(result.status).toBe('valid');
  });

  it('reports missing files', async () => {
    const link: ExtractedLink = {
      type: 'internal',
      href: './does-not-exist.mdx',
      sourceFile: resolve(brokenInternalDir, 'index.mdx'),
      line: 10,
      context: '[Missing page](./does-not-exist.mdx)',
    };

    const brokenFiles = [
      resolve(brokenInternalDir, 'index.mdx'),
      resolve(brokenInternalDir, 'exists.mdx'),
    ];

    const result = await validateInternalLink(
      link,
      brokenInternalDir,
      DEFAULT_CONFIG,
      brokenFiles
    );

    expect(result.status).toBe('broken');
    expect(result.error).toContain('File not found');
  });

  it('skips anchor-only links', async () => {
    const link: ExtractedLink = {
      type: 'anchor',
      href: '#getting-started',
      sourceFile: resolve(validDocsDir, 'index.mdx'),
      line: 15,
      context: '[getting started](#getting-started)',
    };

    const result = await validateInternalLink(
      link,
      validDocsDir,
      DEFAULT_CONFIG,
      allFiles
    );

    expect(result.status).toBe('valid');
  });

  it('validates file part of links with anchors', async () => {
    const link: ExtractedLink = {
      type: 'internal',
      href: './advanced.mdx#configuration',
      sourceFile: resolve(validDocsDir, 'index.mdx'),
      line: 8,
      context: '[advanced topics](./advanced.mdx#configuration)',
    };

    const result = await validateInternalLink(
      link,
      validDocsDir,
      DEFAULT_CONFIG,
      allFiles
    );

    expect(result.status).toBe('valid');
  });
});
