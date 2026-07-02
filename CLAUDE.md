# notro

## Language Settings

- **User interactions (responses, explanations, questions)**: Reply in Japanese
- **Documentation (README, CHANGELOG, comments, commit messages)**: Write in English
- **Code**: Use English including comments

---

## Claude Code Working Rules

### Styling Guidelines

- Use **TailwindCSS 4 utility classes only** for all styling
- Do not use inline styles (`style="..."` attributes)
- Do not use `<style>` tags inside Astro components — **exception**: notro-ui Notion block components (e.g. `Toggle.astro`, `TableBlock.astro`) may use `<style>` for complex CSS selectors (pseudo-elements, parent-context selectors) that cannot be expressed as Tailwind utilities
- Notion block component styles live in **`<style>` blocks within each component file** — do not add component-specific styles to `global.css`
- Design tokens (`--notro-*` variables), color utilities (`notro-text-*`, `notro-bg-*`), and markdown/mermaid wrapper styles (`.notro-markdown`) are defined in `global.css`
- `nt-*` classes in `global.css` are page layout design tokens (`nt-text-*`, `nt-bg-*`, `nt-border-*`) and are separate from Notion block styles
- Do not manipulate styles directly via `element.style.*` in client-side `<script>` tags
- Control visibility using **class manipulation** such as `element.classList.toggle("hidden")` — do not use `element.style.display`

### Build & Layout Verification

After changing code, always verify with the following steps:

```bash
# 1. Type-check + build (run from repo root)
pnpm run build

# 2. Visually check the build output in a browser for layout issues
pnpm --filter notro-blog run preview
```

- Do not push if `pnpm run build` fails
- Always run `pnpm --filter notro-blog run preview` to visually verify styling changes before committing

### notro-ui Component Management

Notion block components are managed via the `notro-ui` CLI. `packages/notro-ui/src/templates/` is the single source of truth; `templates/` holds a copy of it.

#### Basic Flow

```bash
# Add all components to a new template (skips existing files)
notro-ui add --all

# Pull updates from notro-ui into the template (overwrites local changes)
notro-ui update --all --yes
```

#### Commands

| Command | Behavior |
|---------|----------|
| `notro-ui init` | Generates `notro.json` |
| `notro-ui add [name...] [--all]` | Adds components (**skips existing files**) |
| `notro-ui update [name...] [--all] [--yes]` | Updates components (**overwrites local changes**) |
| `notro-ui remove [name...] [--all]` | Removes components |
| `notro-ui list [--installed]` | Lists available / installed components |

#### Guidelines

- **Protecting customized files**: `add` skips existing files by default. Re-running `add` will not overwrite components you have customized in the template
- **Intentional updates**: Use `update` only when pulling changes from notro-ui upstream. Running without `--yes` shows a confirmation prompt
- **`notro.json`**: Configuration file placed at the project root. Tracks `outDir`, `stylesDir`, and the list of installed components. Commit to git

---

### Sub-agent & Branch Management

- Branches worked on by sub-agents (Agent tool) must be **merged into the caller's branch** before pushing
- Do not push sub-agent branches directly
- Always verify the build passes after merging before pushing

### Branch Naming

- All branches Claude works on must use the `claude/` prefix
- Include the session ID at the end of the branch name (`claude/feature-name-XXXXX` format)
- **Pushes will fail with a 403 error without the `claude/` prefix and session ID**

### Multiple Implementation Options

- When multiple implementation approaches are possible, **always present the options to the user via `AskUserQuestion` before starting work**
- Do not decide on an approach and proceed on your own
- Present options with concrete trade-offs (performance, maintainability, implementation cost, etc.)

### Commit Message Guidelines

- Commit messages **must always be in English**
- Format: `<type>: <summary>` (e.g. `feat: add tag filter to blog list`)
- Type must be one of: `feat` / `fix` / `refactor` / `docs` / `chore` / `style` / `test`

### UI/UX Criteria

- Design with **internationalization in mind** as a baseline (text length, character width, RTL considerations)
- Clarity and usability for the user is the top priority
- Prioritize information clarity and accessibility over decoration

### Astro Implementation Best Practices

#### Extract Logic into `.ts` Files

- Keep **minimal code** in Astro file (`.astro`) frontmatter (`---` blocks)
- Extract data fetching, transformation, and business logic into functions in `.ts` files under `src/lib/`
- Write unit tests for all extracted functions (using `vitest`)
- Test scope:
  - Functions under `templates/blog/src/lib/` (when adding or changing)
  - Publicly-called functions under `packages/*/src/utils/`
  - Astro components (`.astro`) themselves do not need tests — extract logic to `.ts` and test those functions

```astro
// Good: extract logic to src/lib/posts.ts; frontmatter only imports and calls
---
import { getCollection } from "astro:content";
import { getSortedPosts, excludeFixedPages } from "@/lib/posts";

const allPosts = await getCollection("posts");
const posts = getSortedPosts(excludeFixedPages(allPosts));
---
<ul>{posts.map(p => <li>{p.data.title}</li>)}</ul>
```

```astro
// Bad: write logic directly in frontmatter
---
import { getCollection } from "astro:content";

const allPosts = await getCollection("posts");
const posts = allPosts
  .filter(p => !p.data.tags?.includes("page"))
  .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());
---
<ul>{posts.map(p => <li>{p.data.title}</li>)}</ul>
```

#### Component Design

- Keep components small with a **single responsibility**
- Always explicitly define Prop types (`interface Props { ... }`)
- Set default values via Props destructuring

#### Performance

- Always use Astro's `<Image />` component for images (do not use `<img>` tags directly)
- Minimize client-side JavaScript (prefer `client:idle` / `client:visible` over `client:load`)
- Use `Astro.glob()` or Content Collections API for page-level data fetching

#### `<script>` Tag Guidelines

- Keep logic in `<script>` tags inside Astro components to a minimum
- If `<script>` logic is complex, extract it to a `.ts` file under `src/lib/` and import it
- Use `is:inline` only when necessary (normally Astro handles bundle optimization)

```astro
<!-- Good: extract logic to .ts and import -->
<button id="menu-btn" aria-expanded="false">Menu</button>
<script>
  import { initMenu } from "@/lib/menu";
  initMenu();
</script>

<!-- Bad: write logic directly in <script> / manipulate style directly -->
<script>
  const btn = document.getElementById("menu-btn");
  const nav = document.getElementById("nav");
  btn?.addEventListener("click", () => {
    nav.style.display = nav.style.display === "none" ? "block" : "none"; // ❌ direct style manipulation
  });
</script>

<!-- Good: control visibility with class manipulation -->
<script>
  const btn = document.getElementById("menu-btn");
  const nav = document.getElementById("nav");
  btn?.addEventListener("click", () => {
    nav.classList.toggle("hidden"); // ✅ classList manipulation
    btn.setAttribute("aria-expanded", String(!nav.classList.contains("hidden")));
  });
</script>
```

#### Accessibility

- Add appropriate `aria-*` attributes to interactive elements
- Do not convey information through color alone (use icons or text alongside)
- Always associate `<label>` with form elements

### Changeset Proposal

When making changes to published packages (those without `private: true`) under `packages/`, **propose to the user after completing the work whether a changeset is needed**.

**Published packages:**

| Package | Path |
|---|---|
| `remark-notro` | `packages/remark-nfm/` |
| `notro-loader` | `packages/notro-loader/` |
| `notro-ui` | `packages/notro-ui/` |
| `rehype-beautiful-mermaid` | `packages/rehype-beautiful-mermaid/` |
| `create-notro` | `packages/create-notro/` |
| `notro-md-sync` | `packages/notro-md-sync/` |

**Version type guide:**

| Change | Version type |
|---|---|
| Breaking API changes (removal, argument changes, behavior changes) | `major` |
| Backward-compatible new features or options | `minor` |
| Bug fixes, internal implementation improvements | `patch` |
| Documentation or type-only changes, added tests | Often no changeset needed |

Run `pnpm changeset` to create a changeset (see "Package Publishing" section for details).

---

## Project Overview

**NotroTail** is a Notion-to-Astro static site generator. It fetches content from Notion via the Notion Public API (Markdown Content API), compiles it as MDX using `@mdx-js/mdx`'s `evaluate()`, and maps Notion block types to Astro components. Outputs a fast, SEO-optimized static site styled with TailwindCSS 4.

The repo is a **pnpm workspace monorepo** with the following packages:

| Package | Path | Purpose |
|---|---|---|
| `remark-nfm` | `packages/remark-nfm/` | Pure remark plugin for Notion-flavored Markdown — pre-parse normalization, `:::callout` directive syntax, and callout conversion. No Astro or Notion API dependencies; independently publishable to npm. |
| `notro-loader` | `packages/notro-loader/` | The publishable npm library (Astro Content Loader + MDX compile pipeline + Notion block components). Uses `remark-nfm` internally. |
| `notro-ui` | `packages/notro-ui/` | Copy-and-own styled Notion block components (shadcn-style). Run `notro-ui add --all` to install components into a template — they become your code, editable directly. |
| `rehype-beautiful-mermaid` | `packages/rehype-beautiful-mermaid/` | Rehype plugin that renders Mermaid code blocks to inline SVG at build time. Optional; included in the blog template. |
| `create-notro` | `packages/create-notro/` | CLI scaffolding tool (`npm create notro@latest`). Downloads a starter template and sets up the project. |
| `notro-md-sync` | `packages/notro-md-sync/` | CLI tool for bidirectional sync between local markdown files and a Notion data source (`notro-md-sync publish / get`). |
| `notro-blog` (blog) | `templates/blog/` | Full-featured blog template (reference app, fetched by `create-notro`) |
| `notro-blank` (blank) | `templates/blank/` | Minimal starter template |

---

## Repository Structure

```
notro/
├── templates/
│   ├── blog/                # Full-featured blog template (reference app + create-notro source)
│   │   ├── src/
│   │   │   ├── components/  # Header, Footer, BlogList
│   │   │   ├── layouts/     # Layout.astro (base HTML shell)
│   │   │   ├── lib/         # blog.ts, nav.ts, seo.ts (page logic)
│   │   │   ├── pages/       # File-based routing
│   │   │   │   ├── index.astro              # Top page
│   │   │   │   └── blog/
│   │   │   │       ├── [...page].astro      # Paginated blog list
│   │   │   │       ├── [slug].astro         # Individual blog posts
│   │   │   │       └── tag/[tag]/[...page].astro
│   │   │   ├── styles/
│   │   │   │   └── global.css       # TailwindCSS 4 imports + notro design tokens + nt-* utilities
│   │   │   ├── content.config.ts  # Astro Content Collections (posts)
│   │   │   └── env.d.ts
│   │   ├── src/config.ts        # site name, navigation links
│   │   ├── astro.config.mjs
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── blank/               # Minimal starter template
│       ├── src/
│       │   ├── layouts/     # Layout.astro (simple HTML shell)
│       │   ├── pages/       # index.astro + [slug].astro
│       │   ├── styles/      # global.css
│       │   └── content.config.ts
│       ├── astro.config.mjs
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── remark-nfm/          # npm library ("remark-nfm" package)
│   │   ├── index.ts         # Public API exports
│   │   └── src/
│   │       ├── nfm.ts           # remarkNfm plugin (pre-parse + directive + callout conversion)
│   │       └── transformer.ts   # preprocessNotionMarkdown() — 10 fixes for Notion markdown quirks
│   ├── notro-loader/        # npm library ("notro-loader" package)
│   │   ├── index.ts         # Main entry point (components + loader)
│   │   ├── integration.ts   # notro() Astro integration entry point
│   │   ├── utils.ts         # Pure TS helpers entry point (safe in astro.config.mjs)
│   │   ├── image-service.ts # notionImageService entry point (Astro image service)
│   │   ├── src/
│   │   │   ├── components/  # Astro components (NotroContent, DatabaseCover, DatabaseProperty)
│   │   │   ├── loader/
│   │   │   │   ├── loader.ts      # Astro Content Loader implementation
│   │   │   │   ├── live-loader.ts # Live-reload loader variant
│   │   │   │   └── schema.ts      # Zod schemas for Notion API response types
│   │   │   └── utils/
│   │   │       ├── compile-mdx.ts    # compileMdxForAstro() — MDX evaluate + Astro component wiring
│   │   │       ├── mdx-pipeline.ts   # buildMdxPlugins() — remark/rehype plugin configuration
│   │   │       └── notion.ts         # getPlainText(), buildLinkToPages() helpers
│   │   └── package.json
│   ├── notro-ui/            # CLI tool + copy-and-own styled components
│   │   ├── bin/notro-ui.js  # CLI entry point
│   │   └── src/templates/   # Source-of-truth component templates (.astro files)
│   ├── rehype-beautiful-mermaid/  # npm library — renders Mermaid blocks to inline SVG
│   │   ├── index.ts         # Public API exports
│   │   └── src/
│   ├── create-notro/        # npm library ("create-notro") — CLI scaffolding tool
│   │   └── src/index.ts     # Prompts user and scaffolds template via giget
│   └── notro-md-sync/       # npm CLI ("notro-md-sync") — bidirectional markdown ↔ Notion sync
│       └── src/index.ts     # publish / get subcommands
├── docs/                    # Documentation site (Astro Starlight)
├── .changeset/              # Changesets config for versioning & publishing
├── netlify.toml             # Netlify deploy template (env var hints)
├── package.json             # Root workspace + changeset scripts
└── tsconfig.json
```

---

## Key Architecture

### `notro` Package Entry Points

The `notro-loader` package exposes four entry points, each designed for a specific import context:

| Entry point | Import | Use case |
|---|---|---|
| `notro-loader` | `import { NotroContent, loader, ... } from "notro-loader"` | Astro components and the Content Loader. **Cannot** be used in `astro.config.mjs` because Astro config is evaluated before the JSX renderer is registered. |
| `notro-loader/utils` | `import { getPlainText, normalizeNotionPresignedUrl, ... } from "notro-loader/utils"` | Pure TypeScript helpers with no Astro component imports. Safe to use anywhere: config files, Node scripts, image services. |
| `notro-loader/integration` | `import { notro } from "notro-loader/integration"` | The `notro()` Astro integration. Used in `astro.config.mjs` to inject `@astrojs/mdx` with the correct plugin pipeline. |
| `notro-loader/image-service` | `import { notionImageService } from "notro-loader/image-service"` | Astro image service that strips expiring `X-Amz-*` query params from Notion S3 URLs before cache-key computation. Used in `astro.config.mjs` under `image.service`. |

### `notro()` Astro Integration

`notro()` is an Astro integration that registers `@astrojs/mdx` with notro's core plugin suite. It is required for two reasons:

1. **`astro:jsx` renderer** — `@astrojs/mdx` registers the `astro:jsx` renderer that `@mdx-js/mdx`'s `evaluate()` depends on to produce Astro VNodes. Without it, `NotroContent` fails at runtime.
2. **Static `.mdx` files** — if the project uses `.mdx` files alongside Notion content, `notro()` ensures they are processed with the same plugin pipeline as dynamically compiled Notion markdown.

The interface mirrors `@astrojs/mdx`. Available options:

| Option | Type | Purpose |
|---|---|---|
| `remarkPlugins` | `PluggableList` | Additional remark plugins (e.g. `[remarkMath]`) |
| `rehypePlugins` | `PluggableList` | Additional rehype plugins (e.g. `[rehypeKatex, [rehypeMermaid, { theme: 'github-dark' }]]`) |
| `shikiConfig` | `Record<string, unknown>` | Injects `@shikijs/rehype` as the last plugin (requires `npm i @shikijs/rehype`). Example: `{ theme: 'github-dark' }` |
| `viteExternals` | `string[]` | Packages to add to Vite's `ssr.external` (for native binaries or dynamic imports) |
| `extendMarkdownConfig` | `boolean` | Whether to extend Astro's base markdown config (default: `false`) |

Usage in `astro.config.mjs`:
```js
import { notro } from "notro-loader/integration";
import { notionImageService } from "notro-loader/image-service";
import { rehypeMermaid } from "rehype-beautiful-mermaid";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  image: { service: notionImageService },
  integrations: [
    notro({
      shikiConfig: { theme: "github-dark" },
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [rehypeMermaid, { theme: "github-dark" }],
        rehypeKatex,
      ],
    }),
    sitemap(),
  ],
});
```

### Content Loading Flow

1. **Astro Content Collections** (`content.config.ts`) defines the `posts` collection (the template app; extend as needed for additional collections).
2. Each collection uses the `loader()` from `notro-loader`, which calls the Notion Public API (`dataSources.query` + `pages.retrieveMarkdown`).
3. The loader caches pages by `last_edited_time` digest, and invalidates cache entries that are deleted, edited, or contain expired Notion pre-signed S3 URLs.
4. Each page's preprocessed Markdown is stored in the Content Collection store. Pages render it via `NotroContent`, which calls `compileMdxCached()` to compile the markdown into an Astro component via `@mdx-js/mdx`'s `evaluate()`, then renders it with `<Content components={notionComponents} />`.

### MDX Compile Pipeline

Defined in `packages/notro-loader/src/utils/mdx-pipeline.ts` via `@mdx-js/mdx`'s `evaluate()` (called from `compile-mdx.ts`). The pipeline is shared between the runtime Notion content path and static `.mdx` files via the `notro()` integration.

**Core remark plugins** (always active):
- `remarkNfm` (from `remark-nfm`) — bundles pre-parse normalization (`preprocessNotionMarkdown`), directive syntax + GFM strikethrough/task-list support, and callout conversion in one plugin

**User-provided remark plugins** (opt-in via `notro({ remarkPlugins })`):
- e.g. `remark-math` — enables `$...$` inline and `$$...$$` block math syntax

**Core rehype plugins** (always active, in order):
1. `rehypeRaw` — converts raw HTML strings from Notion markdown into hast nodes; passes through Notion custom elements (`callout`, `columns`, `video`, etc.)
2. `rehypeNotionColorPlugin` — converts `color="gray_bg"` / `underline="true"` attributes on `<p>`, `<h1-h6>`, `<span>` elements to `notro-*` CSS classes
3. `rehypeBlockElementsPlugin` — renames Notion block elements from lowercase to PascalCase so MDX routes them through the `components` map (e.g. `video` → `Video`, `table_of_contents` → `TableOfContents`)
4. `rehypeInlineMentionsPlugin` — same rename for inline mention elements (`mention-user` → `MentionUser`, etc.)
5. _(user-provided rehype plugins run here)_
6. `rehypeShiki` — injected automatically when `shikiConfig` is set (runs last so other plugins go first)
7. `rehypeSlug` — adds `id` attributes to h1–h4 headings
8. `rehypeTocPlugin` — populates `<TableOfContents>` with anchor links to all headings
9. `resolvePageLinksPlugin` — resolves Notion `notion.so` URLs in `<PageRef>`, `<DatabaseRef>`, mention elements, and `<a href>` using the `linkToPages` map

**Component mapping** (HTML elements → Astro components):
- After `evaluate()`, `<Content components={notionComponents} />` maps every Notion block type (callout, toggle, columns, images, table, TOC, etc.) and standard HTML element to an Astro component
- Custom overrides can be passed via the `components` prop on `NotroContent`
- CSS class overrides can be passed via the `classMap` prop without replacing the component

### Image Handling

`notro-loader/image-service` exports `notionImageService`, which wraps Astro's Sharp image service to strip expiring `X-Amz-*` query parameters from Notion pre-signed S3 URLs before computing the cache key, so repeated builds reuse cached output. Configure it in `astro.config.mjs` under `image.service: notionImageService`.

### Markdown Rendering

Pages render Notion markdown via the `NotroContent` component from `notro-loader`. It accepts preprocessed markdown stored by the loader, compiles it via `compileMdxCached()`, and renders it with component mapping:

```astro
---
import { NotroContent } from "notro-loader";
const markdown = entry.data.markdown;
---

<div class="notro-markdown">
  <NotroContent markdown={markdown} />
</div>
```

Optional props:
- `linkToPages` — `Record<string, { url: string; title: string }>` map for resolving internal Notion page links
- `classMap` — `Partial<Record<ClassMapKeys, string>>` for injecting Tailwind classes into default components without replacing them
- `components` — `Partial<NotionComponents>` for full component overrides (e.g. `{ callout: MyCallout }`)

### Markdown Preprocessing (`preprocessNotionMarkdown`)

`packages/remark-nfm/src/transformer.ts` exports `preprocessNotionMarkdown()`, which is called automatically by `remarkNfm` before each parse. It fixes structural issues in Notion's markdown output. The fixes are numbered and documented in the source:

| Fix | Problem fixed |
|-----|---------------|
| 0 | (Migration) Escaped inline math `\$…\$` from old preprocessing bugs converted back to `$…$` |
| 1 | `---` dividers without a preceding blank line are misread as setext H2 headings |
| 2 | Callout directive syntax `"::: callout {…}"` → `":::callout{…}"`; tab-indented content inside callout blocks is dedented |
| 3 | Block-level color annotations `{color="…"}` → raw `<p color="…">` HTML |
| 4 | `<table_of_contents/>` tag (underscore) wrapped in `<div>` for CommonMark HTML detection |
| 5 | Inline equation `$\`…\`$` → `$…$` for remark-math |
| 6 | `<synced_block>` wrapper stripped and content dedented |
| 7 | `<empty-block/>` isolated with blank lines so it becomes a block-level element |
| 8 | Closing tags `</table>`, `</details>`, `</columns>`, `</column>`, `</summary>` get a trailing blank line — without it, CommonMark HTML blocks swallow all following markdown as raw text |
| 9 | Markdown link syntax `[text](url)` inside raw HTML `<td>` cells converted to `<a href>` tags, because remark does not process inline markdown inside raw HTML blocks |

### Layout Props (`Layout.astro`)

`Layout.astro` accepts:

| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | `<title>` and `og:title` |
| `description` | `string` (optional) | `<meta name="description">` and `og:description` |
| `bodyClass` | `string` (optional) | CSS class on `<body>` for per-page scoped styles |

Canonical URL and `og:url` are set automatically from `Astro.url`.

### Per-Page Scoped Styles (`bodyClass`)

Pages can request a unique visual theme by passing `bodyClass` to `<Layout>`:

- **Static Astro pages** — pass `bodyClass` directly as a `<Layout>` prop.

All per-page rules should be scoped under `main` or `.notro-markdown` so the shared `<header>` and `<footer>` are never affected.

### Navigation Features (`template`)

- **Active nav link** — `Header.astro` reads `Astro.url.pathname` and applies active styles to the current page's link. Navigation links are config-driven via `src/config.ts` (`config.navigation.nav`).
- **Prev/next article nav** — `blog/[slug].astro` builds a date-sorted list of blog posts and passes `prevNav`/`nextNav` (slug + title) as props. A two-column card nav appears below each article body: "← 新しい記事" (newer) on the left, "古い記事 →" (older) on the right.
- **Tag page back link** — `blog/tag/[tag]/[...page].astro` shows "← ブログ一覧" above the heading.
- **Pinned/beginner posts** — `blog/[...page].astro` shows pinned and beginner sections on page 1; on pages 2+, shows "← ピン留め記事は1ページ目にあります" / "← 入門記事は1ページ目にあります" links instead.

### CSS Conventions

Two distinct class prefixes are used in this project:

**`nt-*` classes** (defined in `global.css`) — page layout design tokens for the blog template:
- Text opacity scale: `.nt-text`, `.nt-text-60`, `.nt-text-45`, etc.
- Background opacity scale: `.nt-bg-04`, `.nt-bg-09`, etc.
- Border opacity scale: `.nt-border`, `.nt-border-07`, etc.

**`notro-*` classes** — Notion block styles managed by notro-ui:
- Colors: `.notro-text-gray`, `.notro-text-blue`, `.notro-bg-gray`, `.notro-bg-blue`, etc. — defined in `global.css`
- Component classes: `.notro-toggle` (Toggle.astro `<style>`), `.notro-table` / `.notro-table-wrapper` (TableBlock.astro `<style>`), `.notro-toc-*` (TableOfContents.astro `<style>`) — defined inside each component file
- Markdown wrapper: `.notro-markdown` (applied by `NotroContent`, scopes pre/code/task-list/mermaid styles) — defined in `global.css`

---

## Environment Variables

### Required for `template`

| Variable | Description |
|---|---|
| `NOTION_TOKEN` | Notion Internal Integration Token (API key) |
| `NOTION_DATASOURCE_ID_BLOG` | Notion data source ID for the blog template (`templates/blog`) |
| `NOTION_DATASOURCE_ID_DOCS` | Notion data source ID for the docs template (`templates/docs`) |
| `NOTION_DATASOURCE_ID` | Fallback data source ID (used when the template-specific variable is not set) |

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

- Node.js 24+
- pnpm 10+
- Astro 7 (installed via pnpm)

### Local Environment Variables

Create a `templates/blog/.env` file and set environment variables (already in `.gitignore`):

```bash
NOTION_TOKEN=secret_xxxx
NOTION_DATASOURCE_ID_BLOG=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# NOTION_DATASOURCE_ID=xxxxxxxx-...  ← fallback if NOTION_DATASOURCE_ID_BLOG is not set
```

### Install & Run

```bash
# Install all workspace dependencies from repo root
pnpm install

# Run the Astro dev server (from repo root)
pnpm --filter notro-blog run dev
# or from templates/blog/:
pnpm run dev
```

Dev server runs at http://localhost:4321

### Build

```bash
# Build from repo root (runs astro check + astro build)
pnpm run build

# Build from the blog template workspace directly
cd templates/blog && pnpm run build
```

`pnpm run build` in the root delegates to `pnpm --filter notro-blog run build`.

### Preview (verifying build output)

```bash
# Start the preview server after building to check for layout issues
pnpm --filter notro-blog run preview
```

Preview server runs at http://localhost:4321

### Format

```bash
# Format TypeScript and Astro files
pnpm --filter notro-blog run format
# or from packages/notro-loader:
pnpm --filter notro-loader run format
```

Uses Prettier with `prettier-plugin-astro`.

### Type-checking

Type checking runs as part of `astro build` via `astro check`. Run it separately:

```bash
cd templates/blog && pnpm exec astro check
```

---

## Package Publishing

The following packages under `packages/` are published to npm (no `private: true`):

| Package | Path |
|---|---|
| `remark-notro` | `packages/remark-nfm/` |
| `notro-loader` | `packages/notro-loader/` |
| `notro-ui` | `packages/notro-ui/` |
| `rehype-beautiful-mermaid` | `packages/rehype-beautiful-mermaid/` |
| `create-notro` | `packages/create-notro/` |
| `notro-md-sync` | `packages/notro-md-sync/` |

Version management uses [Changesets](https://github.com/changesets/changesets).

```bash
# Create a changeset for your changes
pnpm changeset

# Bump versions based on pending changesets
pnpm run changeset-version

# Build and publish to npm
pnpm run changeset-publish
```

Config: `.changeset/config.json` — base branch is `main`, access is `public`.

The `notro-loader` package's `exports` map:
- `"notro-loader"` → `index.ts` (components, loader, schemas, utils)

---

## Notion Database Schema Conventions

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

## Notion API Usage

> **Important:** Running `@notionhq/client` as a Node.js script in this environment causes `Error: fetch failed` (undici's fetch does not work). Always use `curl` when interacting with the Notion API.

`@notionhq/client` is installed in the root `node_modules`. Authenticate with `NOTION_TOKEN` and `NOTION_DATASOURCE_ID`.

### Client initialization

```js
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DATASOURCE_ID;
```

### Query a data source (database)

```js
// List all pages (auto-paginated)
import { iteratePaginatedAPI } from "@notionhq/client";

for await (const page of iteratePaginatedAPI(notion.dataSources.query, {
  data_source_id: DB_ID,
})) {
  console.log(page.id, page.properties.Name);
}
```

### Create a page

```js
const page = await notion.pages.create({
  parent: { data_source_id: DB_ID, type: "data_source_id" },
  properties: {
    Name:        { title: [{ text: { content: "タイトル" } }] },
    Slug:        { rich_text: [{ text: { content: "my-slug" } }] },
    Description: { rich_text: [{ text: { content: "説明文" } }] },
    Public:      { checkbox: true },
    Tags:        { multi_select: [{ name: "TypeScript" }, { name: "Astro" }] },
    Category:    { select: { name: "Tutorial" } },
    Date:        { date: { start: "2026-01-15" } },
  },
  // body content can be specified directly as Markdown via the markdown field
  markdown: "# 見出し\n\n本文テキスト",
});
console.log(page.id);
```

### Retrieve page content (Markdown)

```js
const md = await notion.pages.retrieveMarkdown({ page_id: PAGE_ID });
console.log(md.markdown);
console.log(md.truncated); // true if content was truncated
```

### Update page content (Markdown)

```js
// Replace a specific range (content_range specifies the block ID range)
await notion.pages.updateMarkdown({
  page_id: PAGE_ID,
  type: "replace_content_range",
  replace_content_range: {
    content: "# 新しい内容\n\n更新されたテキスト",
    content_range: "BLOCK_ID_START...BLOCK_ID_END",
    allow_deleting_content: true,
  },
});

// Append after a specific block (omit `after` to insert at the beginning)
await notion.pages.updateMarkdown({
  page_id: PAGE_ID,
  type: "insert_content",
  insert_content: {
    content: "\n追記したテキスト",
    after: "BLOCK_ID", // optional
  },
});
```

### Update page properties

```js
await notion.pages.update({
  page_id: PAGE_ID,
  properties: {
    Public: { checkbox: false },
    Tags: { multi_select: [{ name: "Updated" }] },
  },
});
```

### Common script examples

> **Note:** Notion API calls via `node -e` / `node scripts/...` fail due to fetch issues. Use the `curl` commands below instead.

```bash
# List data source pages (curl version)
curl -s "https://api.notion.com/v1/databases/$NOTION_DATASOURCE_ID/query" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2026-03-11" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -c "
import sys, json
d = json.load(sys.stdin)
for p in d.get('results', []):
    pid = p['id']
    name = p['properties'].get('Name', {}).get('title', [{}])[0].get('plain_text', '(no title)')
    slug = (p['properties'].get('Slug', {}).get('rich_text', [{}]) or [{}])[0].get('plain_text', '-')
    print(pid, slug, name)
"

# Create a page (curl version)
curl -s "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2026-03-11" \
  -H "Content-Type: application/json" \
  -d "{
    \"parent\": { \"database_id\": \"$NOTION_DATASOURCE_ID\" },
    \"properties\": {
      \"Name\": { \"title\": [{ \"text\": { \"content\": \"タイトル\" } }] },
      \"Slug\": { \"rich_text\": [{ \"text\": { \"content\": \"my-slug\" } }] },
      \"Public\": { \"checkbox\": true }
    }
  }"
```

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

_All of the following are caused by Notion API limitations. notro logs a warning and continues processing._

### `pages.retrieveMarkdown` API Limitations

> See: https://developers.notion.com/reference/retrieve-page-markdown

#### truncated — Content truncation

When `markdownResponse.truncated === true`, the page content exceeds the Notion API limit (~20,000 blocks) and **the remaining content cannot be retrieved**.

- This endpoint has no cursor or pagination parameters (confirmed in `@notionhq/client` v5.11.1 type definitions)
- Truncated content is used in the build as-is
- **Workaround**: split large Notion pages into multiple sub-pages

#### unknown_block_ids — Unrenderable blocks

Block IDs in `markdownResponse.unknown_block_ids` indicate blocks the Notion API could not convert to Markdown (unsupported block types, etc.).

- These blocks are **silently omitted** from the `markdown` in the response
- There is no way to retrieve their content through this endpoint
- notro logs the list of block IDs as a warning and continues processing

#### Error Handling Policy

| Error code | Action |
|---|---|
| `429 rate_limited` / `500 internal_server_error` / `503 service_unavailable` | Retry with exponential backoff (1s / 2s / 4s, max 3 retries) |
| `401 unauthorized` / `403 restricted_resource` / `404 object_not_found` | No retry. Log a warning and skip the page |
| Other unexpected errors | Log a warning and skip the page (overall build continues) |
