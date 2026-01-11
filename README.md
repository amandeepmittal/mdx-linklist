# mdx-linklist

A CLI tool to extract and validate links in MDX files. Check for broken internal links and external URLs in your documentation.

## Installation

```bash
npm install -g mdx-linklist
```

Or run directly with npx:

```bash
npx mdx-linklist check ./docs
```

## Usage

### Basic Check

```bash
mdx-linklist check ./docs
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
```

### Examples

```bash
# Check only internal links (faster, no network)
mdx-linklist check ./docs --internal-only

# Output as JSON
mdx-linklist check ./docs --format json --output report.json

# Ignore localhost and specific domains
mdx-linklist check ./docs --ignore "localhost:*" --ignore-domain "twitter.com"

# Check with custom timeout
mdx-linklist check ./docs --timeout 5000

# Framework docs with route prefixes (e.g., Expo, Next.js, Docusaurus)
mdx-linklist check ./docs \
  --internal-only \
  --route-prefix pages \
  --component Link \
  --component APIBox
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
  "customComponents": ["Link", "A", "CustomLink"]
}
```

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `include` | `string[]` | `["./**/*.mdx", "./**/*.md"]` | Glob patterns for files to scan |
| `exclude` | `string[]` | `["**/node_modules/**", "**/dist/**", "**/.git/**"]` | Glob patterns to exclude |
| `ignorePatterns` | `string[]` | `["localhost:*", "127.0.0.1:*", "*.local"]` | URL patterns to skip |
| `ignoreDomains` | `string[]` | `[]` | Domains to skip |
| `timeout` | `number` | `10000` | External request timeout (ms) |
| `retries` | `number` | `2` | Retry count for failed requests |
| `concurrency` | `number` | `10` | Parallel external requests |
| `routePrefixes` | `string[]` | `[]` | Directory prefixes for absolute paths |
| `customComponents` | `string[]` | `["Link", "A"]` | JSX components with href props |

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

──────────────────────────────────────────
SUMMARY
──────────────────────────────────────────
  Files scanned     50
  Total links       234
  Broken            3
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

## CI Integration

The CLI exits with code 1 when broken links are found:

```yaml
# GitHub Actions
- name: Check links
  run: npx mdx-linklist check ./docs --internal-only
```

Use `--no-fail` to always exit with code 0:

```bash
mdx-linklist check ./docs --no-fail
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
