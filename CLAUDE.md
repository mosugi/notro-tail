# notro-tail

## 言語設定

すべての返答は日本語で行うこと。ただし、コードのコメントは英語を使用する。

## Project Overview

**NotroTail** is a Notion-to-Astro static site generator. It fetches content from Notion via the Notion Public API (Markdown Content API), renders it through a custom remark/rehype pipeline, and outputs a fast, SEO-optimized static site styled with TailwindCSS 4.

The repo is an **npm workspace monorepo** with two workspaces:

| Workspace | Path | Purpose |
|---|---|---|
| `notro-tail` | `apps/notro-tail/` | The deployable Astro 5 website (template / reference app) |
| `notro` | `packages/notro/` | The publishable npm library (Astro Content Loader + components + plugins) |

---

## Repository Structure

```
notro-tail/
├── apps/
│   └── notro-tail/          # Astro website template
│       ├── src/
│       │   ├── components/  # Header, Footer, BlogList
│       │   ├── layouts/     # Layout.astro (base HTML shell)
│       │   ├── lib/         # notionImageService.ts (custom Astro image service)
│       │   ├── pages/       # File-based routing
│       │   │   ├── [...slug].astro          # General pages from Notion "pages" collection
│       │   │   └── blog/
│       │   │       ├── [...page].astro      # Paginated blog list
│       │   │       ├── [slug].astro         # Individual blog posts
│       │   │       ├── category/[category]/[...page].astro
│       │   │       └── tag/[tag]/[...page].astro
│       │   ├── styles/
│       │   │   └── global.css  # TailwindCSS 4 imports + nt-* utility classes
│       │   ├── content.config.ts  # Astro Content Collections (pages + posts)
│       │   └── env.d.ts
│       ├── astro.config.mjs
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── notro/               # npm library ("notro" package)
│       ├── index.ts         # Public API exports
│       ├── src/
│       │   ├── components/  # Astro components (NotionImage, NotionH1-3, etc.)
│       │   ├── loader/
│       │   │   ├── loader.ts    # Astro Content Loader implementation
│       │   │   └── schema.ts    # Zod schemas for Notion API response types
│       │   ├── markdown/
│       │   │   ├── notroMarkdownConfig.ts  # Astro markdown config factory
│       │   │   ├── transformer.ts
│       │   │   └── plugins/     # remark/rehype plugins
│       │   │       ├── callout.ts
│       │   │       ├── cleanup.ts
│       │   │       ├── color.ts
│       │   │       ├── columns.ts
│       │   │       ├── image.ts
│       │   │       ├── media.ts
│       │   │       ├── page-link.ts
│       │   │       ├── table-of-contents.ts
│       │   │       └── toggle.ts
│       │   └── utils/
│       │       └── notion.ts    # getPlainText(), getNotionColor() helpers
│       └── package.json
├── docs/public/             # Documentation images
├── .changeset/              # Changesets config for versioning & publishing
├── netlify.toml             # Netlify deploy template (env var hints)
├── package.json             # Root workspace + changeset scripts
└── tsconfig.json
```

---

## Key Architecture

### Content Loading Flow

1. **Astro Content Collections** (`content.config.ts`) define two collections: `pages` and `posts`.
2. Each collection uses the `loader()` from `notro`, which calls the Notion Public API (`dataSources.query` + `pages.retrieveMarkdown`).
3. The loader caches pages by `last_edited_time` digest, and invalidates cache entries that are deleted, edited, or contain expired Notion pre-signed S3 URLs.
4. Each page's Markdown body is stored in the Content Collection store; `entry.render()` processes it through the `notroMarkdownConfig()` plugin pipeline.

### Markdown Plugin Pipeline

Configured in `astro.config.mjs` via `notroMarkdownConfig()` from `notro/config`:

**Remark plugins** (parse Markdown → mdast):
- `remark-directive` — enables `:::callout` directive syntax
- `calloutPlugin` — converts Notion callout directives to HTML

**Rehype plugins** (transform hast → HTML):
- `rehypeRaw` — must be first; parses raw HTML tags from Notion markdown
- `imagePlugin` — wraps Notion images
- `columnsPlugin` — handles Notion column layouts
- `colorPlugin` — maps Notion color names to `nt-color-*` CSS classes
- `pageLinkPlugin` — resolves `<page url="...">` tags to internal or external links
- `mediaPlugin` — embeds videos and other media
- `tableOfContentsPlugin` — generates TOC
- `togglePlugin` — renders Notion toggles as `<details>`/`<summary>`
- `cleanupPlugin` — final cleanup pass

### Image Handling

`apps/notro-tail/src/lib/notionImageService.ts` wraps Astro's Sharp image service to strip expiring `X-Amz-*` query parameters from Notion pre-signed S3 URLs before computing the cache key, so repeated builds reuse cached output.

### Component Mapping

Pages use `entry.render()` with a `components` prop to replace default HTML elements with Notion-styled Astro components:

```astro
<Content components={{
  img: NotionImage,
  h1: NotionH1,
  h2: NotionH2,
  h3: NotionH3,
  blockquote: NotionBlockquote,
  table: NotionTable,
}} />
```

### CSS Conventions

All Notion-specific CSS classes use the `nt-` prefix (defined in `global.css`):
- Block types: `.nt-header-block`, `.nt-callout-block`, `.nt-toggle-block`, etc.
- Colors: `.nt-color-gray`, `.nt-color-blue_background`, etc.
- Annotations: `.nt-annotation-bold`, `.nt-annotation-italic`, etc.
- Collections: `.nt-collection-item`, `.nt-collection-cover`, `.nt-collection-property`

---

## Environment Variables

### Required for `apps/notro-tail`

| Variable | Description |
|---|---|
| `NOTION_TOKEN` | Notion Internal Integration Token (API key) |
| `NOTION_PAGES_ID` | Notion data source ID for the `pages` collection |
| `NOTION_POSTS_ID` | Notion data source ID for the `posts` collection |

### For Vercel Deployment (Claude Code on the Web)

Set these in Claude Code on the Web → Settings → Environment Variables:

| Variable | Source |
|---|---|
| `VERCEL_PROJECT_ID` | Vercel project Settings > General |
| `VERCEL_ORG_ID` | Vercel team Settings > General |
| `VERCEL_TOKEN` | vercel.com/account/tokens (Personal Access Token) |

> `VERCEL_OIDC_TOKEN` is set automatically by the Vercel platform and does **not** need to be set manually. It cannot be used for Vercel's own REST API (it is an external-service OIDC token); use `VERCEL_TOKEN` (PAT) for Vercel API calls.

---

## Development Workflow

### Prerequisites

- Node.js 22+
- Astro 5 (installed via npm)

### Install & Run

```bash
# Install all workspace dependencies from repo root
npm install

# Run the Astro dev server (from repo root)
npm run dev --workspace=notro-tail
# or from apps/notro-tail:
npm run dev
```

Dev server runs at http://localhost:4321

### Build

```bash
# Build from repo root (runs astro check + astro build)
npm run build

# Build from the app workspace directly
cd apps/notro-tail && npm run build
```

`npm run build` in the root delegates to `npm run build --workspace=notro-tail`.

### Format

```bash
# Format TypeScript and Astro files
npm run format --workspace=notro-tail
# or from packages/notro:
npm run format --workspace=notro
```

Uses Prettier with `prettier-plugin-astro`.

### Type-checking

Type checking runs as part of `astro build` via `astro check`. Run it separately:

```bash
cd apps/notro-tail && npx astro check
```

---

## Package Publishing (`packages/notro`)

The `notro` package is published to npm. It uses [Changesets](https://github.com/changesets/changesets) for versioning.

```bash
# Create a changeset for your changes
npx changeset

# Bump versions based on pending changesets
npm run changeset-version

# Build and publish to npm
npm run changeset-publish
```

Config: `.changeset/config.json` — base branch is `main`, access is `public`.

The package's `exports` map:
- `"notro"` → `index.ts` (components, loader, schemas, utils)
- `"notro/config"` → `src/markdown/notroMarkdownConfig.ts` (must be imported separately in `astro.config.mjs` to avoid Vite config evaluation issues)

---

## Notion Database Schema Conventions

### `pages` collection

| Property | Type | Purpose |
|---|---|---|
| `Page` | title | Page display name |
| `Public` | checkbox | Whether to include in build |
| `Slug` | rich_text | URL slug (falls back to Notion ID) |
| `Type` | multi_select | `"Header"` marks page for nav; other values for categorization |
| `Order` | number | Sort order in navigation |
| `Description` | rich_text | Page description |

The index page is the entry with `Slug = "index"` (rendered at `/`).

### `posts` collection

| Property | Type | Purpose |
|---|---|---|
| `Name` | title | Post title |
| `Description` | rich_text | Post description / excerpt |
| `Public` | checkbox | Whether to include in build |
| `Slug` | rich_text | URL slug |
| `Tags` | multi_select | Tags for filtering |
| `Category` | select | Category for filtering |
| `Date` | date | Publication date |

---

## Vercel API Usage

With environment variables configured:

```bash
# List recent deployments
curl -s "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&limit=5" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool

# Get latest deploy ID and build logs
DEPLOY_ID=$(curl -s "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&limit=1" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['deployments'][0]['uid'])")

curl -s "https://api.vercel.com/v2/deployments/$DEPLOY_ID/events?teamId=$VERCEL_ORG_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool

# Check deployment status
curl -s "https://api.vercel.com/v13/deployments/$DEPLOY_ID?teamId=$VERCEL_ORG_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('State:', d.get('readyState'))
print('URL:', d.get('url'))
print('Error:', d.get('errorMessage', 'none'))
"
```

---

## Known Issues / TODOs

- `//FIXME` in `packages/notro/src/loader/loader.ts:108`: Notion API has a 3 requests/second rate limit. Currently all pages are fetched with `Promise.all`. A `p-queue` with retry logic should be implemented to respect this limit.
- Truncated Notion markdown (`markdownResponse.truncated === true`) is logged as a warning but not handled with paginated retrieval yet.
- `pageSize: 2` in `blog/[...page].astro` is a development placeholder — adjust for production use.
