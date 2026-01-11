import { readFileSync } from 'node:fs';
import { ExtractedLink, LinkType, Config } from '../types.js';
import { isExternalUrl, isSpecialProtocol } from '../utils.js';

interface ExtractedRawLink {
  href: string;
  line: number;
  column: number;
  context: string;
}

export function extractLinksFromFile(
  filePath: string,
  config: Config
): ExtractedLink[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const rawLinks: ExtractedRawLink[] = [];
  let inCodeBlock = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;

    // Track fenced code blocks (``` or ~~~)
    if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip lines inside code blocks
    if (inCodeBlock) {
      continue;
    }

    // Skip HTML comments
    if (line.trim().startsWith('<!--')) {
      continue;
    }

    // Extract markdown links: [text](url)
    const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = markdownLinkRegex.exec(line)) !== null) {
      const href = match[2].trim();
      rawLinks.push({
        href,
        line: lineNumber,
        column: match.index + 1,
        context: match[0],
      });
    }

    // Extract image references: ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = imageRegex.exec(line)) !== null) {
      const href = match[2].trim();
      rawLinks.push({
        href,
        line: lineNumber,
        column: match.index + 1,
        context: match[0],
      });
    }

    // Extract JSX component links
    for (const component of config.customComponents) {
      const jsxRegex = new RegExp(
        `<${component}\\s+[^>]*href=["']([^"']+)["'][^>]*/?>`,
        'g'
      );
      while ((match = jsxRegex.exec(line)) !== null) {
        rawLinks.push({
          href: match[1],
          line: lineNumber,
          column: match.index + 1,
          context: match[0],
        });
      }
    }

    // Extract standard <a> tags
    const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
    while ((match = anchorRegex.exec(line)) !== null) {
      rawLinks.push({
        href: match[1],
        line: lineNumber,
        column: match.index + 1,
        context: match[0],
      });
    }
  }

  // Convert raw links to ExtractedLink with type classification
  return rawLinks
    .filter((raw) => !isSpecialProtocol(raw.href))
    .filter((raw) => raw.href.trim() !== '')
    .map((raw) => ({
      type: classifyLinkType(raw.href),
      href: raw.href,
      sourceFile: filePath,
      line: raw.line,
      column: raw.column,
      context: raw.context,
    }));
}

function classifyLinkType(href: string): LinkType {
  if (isExternalUrl(href)) {
    return 'external';
  }

  if (href.startsWith('#')) {
    return 'anchor';
  }

  // Check for asset extensions
  const assetExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
    '.ico',
    '.mp4',
    '.webm',
    '.mp3',
    '.wav',
    '.pdf',
  ];
  const hrefLower = href.toLowerCase().split('#')[0].split('?')[0];
  if (assetExtensions.some((ext) => hrefLower.endsWith(ext))) {
    return 'asset';
  }

  return 'internal';
}
