import { resolve, dirname, relative } from 'node:path';

export function resolveInternalPath(
  href: string,
  sourceFile: string,
  baseDir: string
): string {
  // Remove anchor from path
  const pathWithoutAnchor = href.split('#')[0];

  if (!pathWithoutAnchor) {
    // Anchor-only link like "#section"
    return sourceFile;
  }

  if (pathWithoutAnchor.startsWith('/')) {
    // Absolute path from base
    return resolve(baseDir, pathWithoutAnchor.slice(1));
  }

  // Relative path
  return resolve(dirname(sourceFile), pathWithoutAnchor);
}

export function shouldIgnoreUrl(
  href: string,
  ignorePatterns: string[],
  ignoreDomains: string[]
): boolean {
  // Check ignore patterns
  for (const pattern of ignorePatterns) {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    if (regex.test(href)) {
      return true;
    }
  }

  // Check ignore domains
  try {
    const url = new URL(href);
    if (ignoreDomains.includes(url.hostname)) {
      return true;
    }
  } catch {
    // Not a valid URL, check as string
    for (const domain of ignoreDomains) {
      if (href.includes(domain)) {
        return true;
      }
    }
  }

  return false;
}

export function isExternalUrl(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

export function isSpecialProtocol(href: string): boolean {
  const specialProtocols = [
    'mailto:',
    'tel:',
    'javascript:',
    'data:',
    'ftp:',
    'file:',
  ];
  return specialProtocols.some((protocol) => href.startsWith(protocol));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export function relativePath(filePath: string, baseDir: string): string {
  return relative(baseDir, filePath);
}

export function findSimilarPaths(
  target: string,
  availablePaths: string[],
  maxSuggestions = 3
): string[] {
  const targetLower = target.toLowerCase();
  const targetParts = targetLower.split('/').filter(Boolean);

  const scored = availablePaths.map((path) => {
    const pathLower = path.toLowerCase();
    const pathParts = pathLower.split('/').filter(Boolean);

    let score = 0;

    // Exact substring match
    if (pathLower.includes(targetLower) || targetLower.includes(pathLower)) {
      score += 10;
    }

    // Matching filename
    const targetFile = targetParts[targetParts.length - 1];
    const pathFile = pathParts[pathParts.length - 1];
    if (targetFile && pathFile && pathFile.includes(targetFile)) {
      score += 5;
    }

    // Levenshtein-ish similarity for short strings
    if (target.length < 50 && path.length < 50) {
      const distance = levenshteinDistance(targetLower, pathLower);
      const maxLen = Math.max(target.length, path.length);
      score += Math.max(0, (1 - distance / maxLen) * 5);
    }

    return { path, score };
  });

  return scored
    .filter((s) => s.score > 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
    .map((s) => s.path);
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
