import { glob } from 'glob';
import { resolve } from 'node:path';
import { Config } from '../types.js';

export async function scanFiles(
  directory: string,
  config: Config
): Promise<string[]> {
  const baseDir = resolve(process.cwd(), directory);

  const patterns = config.include.map((pattern) =>
    pattern.startsWith('./') ? pattern.slice(2) : pattern
  );

  const ignorePatterns = config.exclude.map((pattern) =>
    pattern.startsWith('./') ? pattern.slice(2) : pattern
  );

  const files: string[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: baseDir,
      ignore: ignorePatterns,
      absolute: true,
      nodir: true,
    });
    files.push(...matches);
  }

  // Remove duplicates and sort
  return [...new Set(files)].sort();
}
