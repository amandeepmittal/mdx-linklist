import { ExtractedLink, LinkCheckResult, Config } from '../types.js';
import { shouldIgnoreUrl } from '../utils.js';

interface CacheEntry {
  result: LinkCheckResult;
  timestamp: number;
}

const urlCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function validateExternalLink(
  link: ExtractedLink,
  config: Config
): Promise<LinkCheckResult> {
  const { href } = link;

  // Check if should be ignored
  if (shouldIgnoreUrl(href, config.ignorePatterns, config.ignoreDomains)) {
    return { link, status: 'skipped' };
  }

  // Check cache
  const cached = urlCache.get(href);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.result, link };
  }

  const startTime = Date.now();

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(href, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'mdx-linklist/1.0 (Link Checker)',
        },
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const result: LinkCheckResult = {
          link,
          status: 'valid',
          statusCode: response.status,
          responseTime,
        };
        urlCache.set(href, { result, timestamp: Date.now() });
        return result;
      }

      // Some servers don't support HEAD, try GET
      if (response.status === 405) {
        const getResponse = await fetch(href, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'mdx-linklist/1.0 (Link Checker)',
          },
        });

        if (getResponse.ok) {
          const result: LinkCheckResult = {
            link,
            status: 'valid',
            statusCode: getResponse.status,
            responseTime: Date.now() - startTime,
          };
          urlCache.set(href, { result, timestamp: Date.now() });
          return result;
        }
      }

      const result: LinkCheckResult = {
        link,
        status: 'broken',
        statusCode: response.status,
        error: `${response.status} ${response.statusText}`,
        responseTime,
      };
      urlCache.set(href, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      if (attempt === config.retries) {
        const isTimeout =
          error instanceof Error && error.name === 'AbortError';

        const result: LinkCheckResult = {
          link,
          status: isTimeout ? 'timeout' : 'broken',
          error: isTimeout
            ? `Timeout after ${config.timeout}ms`
            : error instanceof Error
              ? error.message
              : 'Unknown error',
          responseTime: Date.now() - startTime,
        };
        urlCache.set(href, { result, timestamp: Date.now() });
        return result;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  // Should not reach here, but just in case
  return {
    link,
    status: 'broken',
    error: 'Max retries exceeded',
  };
}

export async function validateExternalLinks(
  links: ExtractedLink[],
  config: Config
): Promise<LinkCheckResult[]> {
  const results: LinkCheckResult[] = [];
  const chunks: ExtractedLink[][] = [];

  // Split into chunks for concurrency control
  for (let i = 0; i < links.length; i += config.concurrency) {
    chunks.push(links.slice(i, i + config.concurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map((link) => validateExternalLink(link, config))
    );
    results.push(...chunkResults);
  }

  return results;
}
