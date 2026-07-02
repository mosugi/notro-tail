# notro-blog — Astro starter template

`template/` is the Astro 7 starter template and reference implementation that ships with the monorepo.
It demonstrates every feature of the `notro` library and is fetched by `npm create notro@latest`. It can also be used as a starting point for your own Notion-backed site.

---

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `src/pages/index.astro` | Hero landing page with feature cards |
| `/blog/` | `src/pages/blog/[...page].astro` | Paginated blog list; page 1 shows pinned posts |
| `/blog/[slug]/` | `src/pages/blog/[slug].astro` | Individual blog post with prev/next navigation |
| `/blog/tag/[tag]/` | `src/pages/blog/tag/[tag]/[...page].astro` | Filtered list by tag with back link |

---

## Key Files

### `src/config.ts`

Site-wide configuration: site name, language, analytics, posts per page, navigation links, footer links, and social links.

### `src/layouts/Layout.astro`

Base HTML shell. Accepts:

| Prop | Type | Effect |
|------|------|--------|
| `title` | `string` | `<title>` and `og:title` |
| `description` | `string?` | `<meta name="description">` and `og:description` |
| `bodyClass` | `string?` | CSS class on `<body>` for per-page scoped styles |

Canonical URL and `og:url` are computed automatically from `Astro.url`.

### `src/components/Header.astro`

Sticky header with active-link highlighting. Reads `Astro.url.pathname` and applies `font-medium text-gray-900` to the current page.

### `src/styles/global.css`

TailwindCSS 4 stylesheet. Defines:
- `nt-*` utility classes for design tokens (text/bg/border opacity scale)

---

## Blog Post Features

### Prev/Next Navigation

Each blog post page shows a two-column card at the bottom linking to the adjacent posts sorted by `Date` (descending). Posts tagged `"page"` (fixed pages) are excluded from this list and show no prev/next nav.

### Pinned Posts

Posts tagged `"pinned"` appear in a separate pinned section at the top of page 1 of the blog list. On page 2+, a hint links back to page 1.

### Tag Filtering

`/blog/tag/[tag]/` lists all posts for a given tag with a back link to the full blog list.

---

## Notion Database Schema

| Property | Type | Used by |
|----------|------|---------|
| `Name` | title | Post title, `<title>`, `og:title` |
| `Description` | rich_text | Excerpt, `<meta description>`, `og:description` |
| `Public` | checkbox | Loader filter (only `Public: true` pages are fetched) |
| `Slug` | rich_text | URL path (`/blog/[slug]/`) |
| `Tags` | multi_select | Tag filtering; `"page"` = fixed page, `"pinned"` = pinned post |
| `Category` | select | Available for custom filtering |
| `Date` | date | Publication date; used for prev/next ordering |

---

## Getting Started

### 1. Create a project

```bash
npm create notro@latest
```

Or clone and use this directory directly.

### 2. Set environment variables

Copy `.env.example` to `.env` and fill in your Notion credentials:

```
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATASOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

- **NOTION_TOKEN** — create an Internal Integration at https://www.notion.so/my-integrations
- **NOTION_DATASOURCE_ID** — the ID of your Notion database (found in the database URL)

### 3. Install and run

```bash
npm install
npm run dev     # http://localhost:4321
```

---

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mosugi/notro&root-directory=templates/blog&env=NOTION_TOKEN,NOTION_DATASOURCE_ID&envDescription=Notion%20API%20credentials%20required%20to%20fetch%20content&project-name=notro-blog&repository-name=notro-blog)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mosugi/notro)

Both buttons fork the `mosugi/notro` repository into your GitHub account and deploy the `templates/blog` directory. You will be prompted to enter `NOTION_TOKEN` and `NOTION_DATASOURCE_ID` during setup.

### Vercel (manual)

1. Push your project to GitHub / GitLab / Bitbucket
2. Import the repository at https://vercel.com/new
3. Add environment variables in **Project → Settings → Environment Variables**:
   - `NOTION_TOKEN`
   - `NOTION_DATASOURCE_ID`
4. Deploy — Vercel auto-detects Astro and sets `dist/` as the output directory

### Netlify (manual)

1. Push your project to GitHub / GitLab / Bitbucket
2. Create a new site at https://app.netlify.com/start
3. Set build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Add environment variables in **Site → Environment variables**:
   - `NOTION_TOKEN`
   - `NOTION_DATASOURCE_ID`
5. Deploy

> **Node.js version**: set to **24** or later in your hosting platform's runtime settings.

---

## Development

```bash
npm run dev       # dev server at http://localhost:4321
npm run build     # astro check + astro build
npm run preview   # preview production build locally
npm run format    # Prettier + prettier-plugin-astro
npm run test      # vitest
```
