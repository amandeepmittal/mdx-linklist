import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Config, DEFAULT_CONFIG } from './types.js';

export function loadConfig(configPath?: string): Config {
  const paths = configPath
    ? [configPath]
    : [
        './mdx-linklist.config.json',
        './linklist.config.json',
        './.mdx-linklistrc.json',
      ];

  for (const p of paths) {
    const fullPath = resolve(process.cwd(), p);
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const userConfig = JSON.parse(content) as Partial<Config>;
        return mergeConfig(DEFAULT_CONFIG, userConfig);
      } catch {
        console.warn(`Warning: Could not parse config file: ${fullPath}`);
      }
    }
  }

  return DEFAULT_CONFIG;
}

export function mergeConfig(base: Config, override: Partial<Config>): Config {
  return {
    ...base,
    ...override,
    include: override.include ?? base.include,
    exclude: override.exclude ?? base.exclude,
    ignorePatterns: [
      ...base.ignorePatterns,
      ...(override.ignorePatterns ?? []),
    ],
    ignoreDomains: [...base.ignoreDomains, ...(override.ignoreDomains ?? [])],
    customComponents: override.customComponents ?? base.customComponents,
    routePrefixes: override.routePrefixes ?? base.routePrefixes,
    redirectsFile: override.redirectsFile ?? base.redirectsFile,
    failOnRedirects: override.failOnRedirects ?? base.failOnRedirects,
  };
}
