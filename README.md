# mdx-linklist

[![npm version](https://img.shields.io/npm/v/mdx-linklist.svg)](https://www.npmjs.com/package/mdx-linklist)
[![npm downloads](https://img.shields.io/npm/dm/mdx-linklist.svg)](https://www.npmjs.com/package/mdx-linklist)
[![license](https://img.shields.io/npm/l/mdx-linklist.svg)](https://github.com/amandeepmittal/mdx-linklist/blob/main/LICENSE)

A CLI tool to extract and report broken links in MDX files. Check for broken internal links and external URLs in your documentation.

## Installation

```bash
npm install -g mdx-linklist
```

Or run directly with npx:

```bash
# Check current directory
npx mdx-linklist check ./pages
```

## Usage

### Basic Check

```bash
# Check specific directory
mdx-linklist check ./pages

# Check current directory
mdx-linklist check .
```

### Options

```bash
mdx-linklist check <directory> [options]

Options:
  -c, --config <path>         Path to config file
  -i, --internal-only         Only check internal links
  -e, --external-only         Only check external links
  --ignore <pattern>          Ignore URL pattern (can be repeated)
  --ignore-domain <domain>    Ignore domain (can be repeated)
  --route-prefix <prefix>     Route prefix for absolute paths (can be repeated)
  --component <name>          Custom JSX component with href prop (can be repeated)
  -t, --timeout <ms>          External request timeout (default: 10000)
  --concurrency <n>           Parallel requests (default: 10)
  -f, --format <type>         Output format: console|json|markdown
  -o, --output <file>         Write report to file
  --no-progress               Hide progress bar
  --no-fail                   Do not exit with code 1 on broken links
  -v, --verbose               Show all links, not just broken
  --redirects <file>          Path to client-side redirects file
  --fail-on-redirects         Exit with error if redirected links found
```

### Examples

```bash
# Check only internal links (faster, no network)
mdx-linklist check ./pages --internal-only

# Output as JSON
mdx-linklist check ./pages --format json --output report.json

# Ignore localhost and specific domains
mdx-linklist check ./pages --ignore "localhost:*" --ignore-domain "twitter.com"

# Check with custom timeout
mdx-linklist check ./pages --timeout 5000

# Framework docs with route prefixes (e.g., Expo, Next.js, Docusaurus)
mdx-linklist check ./docs \
  --internal-only \
  --route-prefix pages \
  --component Link \
  --component APIBox

# Check with client-side redirects file
mdx-linklist check ./docs --redirects ./common/client-redirects.ts -i

# Fail CI if redirected links exist (to encourage updating old links)
mdx-linklist check ./docs --redirects ./redirects.json --fail-on-redirects
```

### Route Prefixes

Many documentation frameworks use route-style paths that map to files in a subdirectory:

```markdown
<!-- Link in MDX -->

[Getting Started](/guides/intro)

<!-- Actual file location -->

pages/guides/intro.mdx
```

Use `--route-prefix` to tell mdx-linklist where to find files for absolute paths:

```bash
mdx-linklist check ./docs --route-prefix pages
```

### Client-Side Redirects

Many documentation sites use client-side redirects to handle moved pages. Without redirect awareness, mdx-linklist would flag these as broken links.

Use `--redirects` to provide a redirects file:

```bash
mdx-linklist check ./docs --redirects ./common/client-redirects.ts
```

Redirected links are reported separately and **don't cause a failure by default**:

```
REDIRECTED LINKS (2)

  docs/guide.mdx:42:5
  │ /guides/splash-screens/
  └─ ↳ /develop/user-interface/splash-screen/
```

**Supported formats:**

- **JSON** - Simple key-value object:
  ```json
  {
    "/old-path": "/new-path",
    "/guides/splash-screens": "/develop/user-interface/splash-screen"
  }
  ```

- **TypeScript/JavaScript** - Extracts `Record<string, string>` style objects (like Expo's `client-redirects.ts`):
  ```typescript
  const RENAMED_PAGES: Record<string, string> = {
    '/old-path/': '/new-path/',
    '/guides/splash-screens/': '/develop/user-interface/splash-screen/',
  };
  ```

Use `--fail-on-redirects` in CI to encourage updating old links to their canonical URLs.

## Configuration

You can use CLI flags (recommended) or create a `mdx-linklist.config.json` file:

```json
{
  "include": ["./docs/**/*.mdx", "./docs/**/*.md"],
  "exclude": ["./docs/archive/**"],
  "ignorePatterns": ["localhost:*", "127.0.0.1:*"],
  "ignoreDomains": ["twitter.com", "x.com"],
  "timeout": 10000,
  "retries": 2,
  "concurrency": 10,
  "routePrefixes": ["pages"],
  "customComponents": ["Link", "A", "CustomLink"],
  "redirectsFile": "./common/client-redirects.ts",
  "failOnRedirects": false
}
```

### Config Options

| Option             | Type       | Default                                              | Description                            |
| ------------------ | ---------- | ---------------------------------------------------- | -------------------------------------- |
| `include`          | `string[]` | `["./**/*.mdx", "./**/*.md"]`                        | Glob patterns for files to scan        |
| `exclude`          | `string[]` | `["**/node_modules/**", "**/dist/**", "**/.git/**"]` | Glob patterns to exclude               |
| `ignorePatterns`   | `string[]` | `["localhost:*", "127.0.0.1:*", "*.local"]`          | URL patterns to skip                   |
| `ignoreDomains`    | `string[]` | `[]`                                                 | Domains to skip                        |
| `timeout`          | `number`   | `10000`                                              | External request timeout (ms)          |
| `retries`          | `number`   | `2`                                                  | Retry count for failed requests        |
| `concurrency`      | `number`   | `10`                                                 | Parallel external requests             |
| `routePrefixes`    | `string[]` | `[]`                                                 | Directory prefixes for absolute paths  |
| `customComponents` | `string[]` | `["Link", "A"]`                                      | JSX components with href props         |
| `redirectsFile`    | `string`   | `undefined`                                          | Path to client-side redirects file     |
| `failOnRedirects`  | `boolean`  | `false`                                              | Treat redirected links as errors       |

## What It Checks

### Internal Links

- Relative paths (`./page.mdx`, `../other/page.mdx`)
- Absolute paths (`/docs/guide`)
- Combined with anchors (`./page.mdx#section`) - validates file exists

### External Links

- HTTP/HTTPS URLs
- Follows redirects
- Reports status codes

### JSX Components

- `<Link href="...">`
- `<A href="...">`
- Custom components (configurable via `--component` flag)

## Progress Display

While checking links, you'll see fun progress messages:

```
 ☕ Brewing your link report...
 📁 Found 3 files
 🎣 Fishing for links...
 🔗 Caught 8 links
 🏠 Knocking on 6 local doors...
 🏠 Visited 6 local doors
 🌐 Pinging the interwebs (2 links)...
 🌐 Pinged 2 external links
```

Use `--no-progress` to hide these messages.

## Output Formats

### Console (default)

```
BROKEN INTERNAL LINKS (2)

  docs/guide.mdx:45:12
  │ [Missing Page](/does-not-exist)
  └─ File not found
     Suggestions: /docs/guide, /docs/getting-started

BROKEN EXTERNAL LINKS (1)

  docs/resources.mdx:23:5
  │ https://example.com/old-page
  └─ 404 Not Found

REDIRECTED LINKS (2)

  docs/intro.mdx:12:5
  │ /guides/splash-screens/
  └─ ↳ /develop/user-interface/splash-screen/

──────────────────────────────────────────
SUMMARY
──────────────────────────────────────────
  Files scanned     50
  Total links       234
  Broken            3
  Redirected        2
  Duration          12.4s
──────────────────────────────────────────
```

### JSON

```bash
mdx-linklist check ./docs --format json
```

### Markdown

```bash
mdx-linklist check ./docs --format markdown --output report.md
```

## Development

```bash
# Install dependencies
bun install

# Run in development
bun run dev check ./tests/fixtures/valid-docs

# Build
bun run build

# Run tests
bun test
```

## License

MIT
