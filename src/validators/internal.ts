import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ExtractedLink, LinkCheckResult, Config } from '../types.js';
import { resolveInternalPath, findSimilarPaths } from '../utils.js';

export async function validateInternalLink(
  link: ExtractedLink,
  baseDir: string,
  config: Config,
  allFiles: string[]
): Promise<LinkCheckResult> {
  const pathWithoutAnchor = link.href.split('#')[0];

  // Handle anchor-only links - skip them
  if (!pathWithoutAnchor || pathWithoutAnchor === '') {
    return { link, status: 'valid' };
  }

  // Resolve the target file path
  const targetPath = resolveInternalPath(link.href, link.sourceFile, baseDir);

  // Try different extensions if no extension provided
  const extensions = ['.mdx', '.md', '/index.mdx', '/index.md', '.tsx', '.ts', '.jsx', '.js'];
  let foundPath: string | null = null;

  // Helper to try finding file with extensions
  const tryFindFile = (basePath: string): string | null => {
    if (existsSync(basePath)) {
      return basePath;
    }
    for (const ext of extensions) {
      const pathWithExt = basePath + ext;
      if (existsSync(pathWithExt)) {
        return pathWithExt;
      }
    }
    return null;
  };

  // First try the direct path
  foundPath = tryFindFile(targetPath);

  // If not found and it's an absolute path, try with route prefixes
  if (!foundPath && pathWithoutAnchor.startsWith('/') && config.routePrefixes.length > 0) {
    for (const prefix of config.routePrefixes) {
      const prefixedPath = resolve(baseDir, prefix, pathWithoutAnchor.slice(1));
      foundPath = tryFindFile(prefixedPath);
      if (foundPath) break;
    }
  }

  if (!foundPath) {
    // Try to find similar paths for suggestions
    const relativePaths = allFiles.map((f) => {
      const rel = f.replace(baseDir, '').replace(/^\//, '');
      return '/' + rel;
    });
    const suggestions = findSimilarPaths(link.href, relativePaths);

    return {
      link,
      status: 'broken',
      error: 'File not found',
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  return { link, status: 'valid' };
}
