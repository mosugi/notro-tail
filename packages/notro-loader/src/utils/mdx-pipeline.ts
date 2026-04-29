/**
 * MDX plugin pipeline for Notion Enhanced Markdown.
 *
 * Parser layer — configures the remark (markdown → mdast) and rehype
 * (hast → HTML) plugin chains. Astro runtime binding lives in compile-mdx.ts.
 *
 * Responsibility layers:
 *   - remarkNfm: always active, required for Notion content
 *   - NOTION_CORE_REHYPE_PLUGINS (internal): always active, Notion-specific
 *   - User-provided plugins via notro({ remarkPlugins, rehypePlugins }):
 *       math (remark-math + rehype-katex), diagrams (rehype-beautiful-mermaid), etc.
 *   - Built-in Shiki support via notro({ shikiConfig }): injected last so user
 *       plugins (rehypeMermaid, rehypeKatex) run before syntax highlighting
 */

import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { remarkNfm } from 'remark-notro';
import { getNotroPlugins } from './notro-config.ts';

import type { Plugin, PluggableList } from 'unified';
import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';
import type { LinkToPages } from '../types.ts';

// Recursively extract text content from a hast node tree.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hastNodeToString(node: any): string {
	if (node.type === 'text') return node.value ?? '';
	return (node.children ?? []).map(hastNodeToString).join('');
}

// Notion-specific custom element names that rehype-raw must pass through
// without stripping. These are mapped to Astro components in notionComponents.
const NOTION_CUSTOM_ELEMENTS = [
	// MDX AST node types — must be passed through rehype-raw or it throws
	// "Cannot compile mdxJsxFlowElement node" at build time.
	'mdxJsxFlowElement',
	'mdxJsxTextElement',
	'mdxFlowExpression',
	'mdxTextExpression',
	'mdxJsImport',
	'mdxJsExport',
	'callout',
	'columns',
	'column',
	'audio',
	'video',
	'file',
	'pdf',
	'page',
	'database',
	'table_of_contents',

	'empty-block',
	'mention-user',
	'mention-page',
	'mention-database',
	'mention-data-source',
	'mention-agent',
	'mention-date',
];

// ── Notion color attribute → CSS class conversion ─────────────────────────

// Notion text color names. Used for both text and background variants.
const NOTION_COLOR_NAMES = new Set([
	'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red',
]);

/**
 * Maps a Notion color attribute value to a notro CSS class.
 * Handles the current `_bg` suffix format and the legacy `_background` suffix.
 * CSS classes are defined in notro-theme.css.
 */
function notionColorToClass(color: string): string {
	if (!color || color === 'default') return '';
	if (color.endsWith('_bg')) {
		const base = color.slice(0, -3);
		if (NOTION_COLOR_NAMES.has(base)) return `notro-bg-${base}`;
	} else if (color.endsWith('_background')) {
		const base = color.slice(0, -'_background'.length);
		if (NOTION_COLOR_NAMES.has(base)) return `notro-bg-${base}`;
	} else if (NOTION_COLOR_NAMES.has(color)) {
		return `notro-text-${color}`;
	}
	return '';
}

function appendClass(properties: Record<string, unknown>, cls: string): void {
	if (!cls) return;
	const existing = properties.className;
	properties.className = existing
		? (Array.isArray(existing) ? [...existing, cls] : [String(existing), cls])
		: [cls];
}

/**
 * Rehype plugin: converts Notion `color` attributes on block and inline elements
 * to `notro-*` CSS classes (defined in notro-theme.css).
 *
 * MDX's component substitution does not apply to HTML elements that come from
 * rehype-raw (raw HTML processed from the markdown source). This plugin runs
 * after rehype-raw and applies color classes directly in the hast tree so that
 * component mapping is not required.
 *
 * Handles both node types:
 *   - `element` (hast): standard HTML nodes processed by rehype-raw
 *   - `mdxJsxFlowElement` / `mdxJsxTextElement`: produced when @mdx-js/mdx parses
 *     raw HTML like `<p color="gray_bg">` — MDX treats any tagged element with
 *     attributes as JSX, so the node type is mdxJsxFlowElement, not element.
 *     These nodes use `name` + `attributes[]` instead of `tagName` + `properties`.
 *
 * Handles:
 *   - Block-level: <p color="gray_bg">, <h1-h6 color="blue">
 *   - Inline: <span color="gray">, <span underline="true">
 */
const rehypeNotionColorPlugin: Plugin<[], Root> = () => {
	return (tree) => {
		// Handle standard hast element nodes (produced by rehype-raw from raw HTML
		// blocks — e.g. `<p color="gray_bg">` that appears at block level without
		// any other attributes that would trigger MDX JSX parsing)
		visit(tree, 'element', (node: Element) => {
			const props = node.properties ?? {};
			const color = props.color;
			const isBlockEl = /^(p|h[1-6])$/.test(node.tagName);
			const isSpan = node.tagName === 'span';

			if (!isBlockEl && !isSpan) return;

			// Convert color attribute to CSS class
			if (typeof color === 'string') {
				const cls = notionColorToClass(color);
				delete props.color;
				appendClass(props, cls);
				node.properties = props;
			}

			// Convert underline attribute on spans to CSS class
			if (isSpan && (props.underline === 'true' || props.underline === true)) {
				delete props.underline;
				appendClass(props, 'underline');
				node.properties = props;
			}
		});

		// Handle MDX JSX nodes (mdxJsxFlowElement / mdxJsxTextElement).
		// @mdx-js/mdx parses any HTML element with attributes (e.g. `<p color="gray_bg">`)
		// as a JSX element. These nodes use `name` + `attributes[]` (array of
		// {type:'mdxJsxAttribute', name, value}) instead of `tagName` + `properties`.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		visit(tree, (node: any) => {
			if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return;
			const name: string = node.name ?? '';
			const isBlockEl = /^(p|h[1-6])$/.test(name);
			const isSpan = name === 'span';

			if (!isBlockEl && !isSpan) return;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const attrs: any[] = Array.isArray(node.attributes) ? node.attributes : [];
			const classesToAdd: string[] = [];

			// Filter out color/underline attributes, collecting their values
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const filteredAttrs = attrs.filter((attr: any) => {
				if (attr.type !== 'mdxJsxAttribute') return true;
				if (attr.name === 'color') {
					const cls = notionColorToClass(String(attr.value ?? ''));
					if (cls) classesToAdd.push(cls);
					return false;
				}
				if (isSpan && attr.name === 'underline' && String(attr.value) === 'true') {
					classesToAdd.push('underline');
					return false;
				}
				return true;
			});

			if (classesToAdd.length === 0) return;

			// Append to existing class attribute or add a new one
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const classAttr = filteredAttrs.find((attr: any) =>
				attr.type === 'mdxJsxAttribute' && (attr.name === 'class' || attr.name === 'className'),
			);
			if (classAttr) {
				classAttr.value = [String(classAttr.value ?? ''), ...classesToAdd].filter(Boolean).join(' ');
			} else {
				filteredAttrs.push({ type: 'mdxJsxAttribute', name: 'class', value: classesToAdd.join(' ') });
			}

			node.attributes = filteredAttrs;
		});
	};
};

// ── Notion element name → PascalCase component name mapping ──────────────
//
// MDX's component-substitution rule:
//   - PascalCase names  → component variable: _jsx(Video, ...)  ← components map IS consulted
//   - lowercase names   → HTML string:        _jsx("video", ...) ← components map is IGNORED
//
// This applies to ALL elements in the MDX compile tree, whether they come
// from the MDX source, remark plugins, or raw HTML processed by rehype-raw.
// Elements from raw HTML (Notion markdown) end up as `mdxJsxFlowElement`
// nodes with their original lowercase names. Renaming them to PascalCase here
// enables the `components` prop to substitute them with Astro components.
//
// There are two sets of renames:
//   1. NOTION_BLOCK_RENAMES  — block-level elements (mdxJsxFlowElement)
//   2. NOTION_MENTION_RENAMES — inline mention elements (mdxJsxTextElement)

// Block-level Notion elements from raw HTML in markdown.
// The target PascalCase names must match keys in defaultComponents / notroComponents.
const NOTION_BLOCK_RENAMES = new Map<string, string>([
	['table_of_contents',       'TableOfContents'],
	['video',                   'Video'],
	['audio',                   'Audio'],
	['file',                    'FileBlock'],
	['pdf',                     'PdfBlock'],
	['columns',                 'Columns'],
	['column',                  'Column'],
	['page',                    'PageRef'],
	['database',                'DatabaseRef'],
	['details',                 'Details'],
	['summary',                 'Summary'],
	['empty-block',             'EmptyBlock'],
	// Table elements — Notion outputs raw <table header-row="true">...</table> HTML.
	// Renaming to PascalCase enables the `components` prop to override them.
	['table',                   'TableBlock'],
	['thead',                   'TableHead'],
	['tbody',                   'TableBody'],
	['colgroup',                'TableColgroup'],
	['col',                     'TableCol'],
	['tr',                      'TableRow'],
	['th',                      'TableHeaderCell'],
	['td',                      'TableCell'],
]);

/**
 * Rehype plugin: renames Notion block-level elements from lowercase to
 * PascalCase so MDX generates a components-map lookup instead of a
 * plain HTML string.
 *
 * Notion block elements (video, audio, table_of_contents, columns, etc.)
 * arrive as `mdxJsxFlowElement` nodes — the MDX JSX parser processes all
 * inline/block HTML as JSX. With lowercase names, MDX compiles them as
 * `_jsx("video", ...)` (literal string), which bypasses the `components`
 * prop entirely. Renaming to PascalCase makes MDX emit `_jsx(Video, ...)`,
 * which looks up `_components.Video` at runtime.
 *
 * Must run before rehypeSlug and rehypeTocPlugin. Component keys in
 * defaultComponents / notroComponents must use the same PascalCase names.
 */
const rehypeBlockElementsPlugin: Plugin<[], Root> = () => {
	return (tree) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		visit(tree, (node: any) => {
			// Block elements appear as mdxJsxFlowElement at the top level,
			// but may appear as mdxJsxTextElement when consecutive blocks appear
			// without blank lines in the Notion markdown (grouped into a <p>).
			if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return;
			const renamed = NOTION_BLOCK_RENAMES.get(node.name);
			if (renamed) node.name = renamed;
		});
	};
};

// Inline mention elements from Notion markdown.
// Hyphenated-lowercase names also compile as plain HTML strings in MDX.
const NOTION_MENTION_RENAMES = new Map<string, string>([
	['mention-user',        'MentionUser'],
	['mention-page',        'MentionPage'],
	['mention-database',    'MentionDatabase'],
	['mention-data-source', 'MentionDataSource'],
	['mention-agent',       'MentionAgent'],
	['mention-date',        'MentionDate'],
]);

/**
 * Rehype plugin: renames Notion inline mention elements from hyphenated-
 * lowercase (mention-user, mention-date…) to PascalCase (MentionUser,
 * MentionDate…) so MDX generates a components-map lookup instead of a
 * plain HTML string.
 *
 * Must run before hast-util-to-estree (i.e. before @mdx-js/mdx compiles
 * the tree). Component keys in defaultComponents / notroComponents must
 * use the same PascalCase names.
 */
const rehypeInlineMentionsPlugin: Plugin<[], Root> = () => {
	return (tree) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		visit(tree, (node: any) => {
			// Notion mentions come through as mdxJsxTextElement nodes because
			// MDX's JSX parser processes inline HTML like <mention-user url="...">
			if (node.type !== 'mdxJsxTextElement' && node.type !== 'mdxJsxFlowElement') return;
			const renamed = NOTION_MENTION_RENAMES.get(node.name);
			if (renamed) node.name = renamed;
		});
	};
};



function resolveNotionUrl(
	url: string,
	linkToPages: LinkToPages,
): { href: string; isExternal: boolean } {
	// Notion URLs end with the page ID (32-char hex, with or without dashes).
	// Example: https://www.notion.so/My-Page-Title-abc123def456...
	// Strip dashes from both the URL and the ID, then check whether the URL
	// ends with the normalised ID. Using endsWith() instead of includes()
	// prevents a shorter ID from matching a different longer ID that happens
	// to contain it as a substring (e.g. "abc" matching "abc123").
	const urlNoDash = url.replace(/-/g, '');
	for (const [pageId, info] of Object.entries(linkToPages)) {
		const idNoDash = pageId.replace(/-/g, '');
		if (urlNoDash === idNoDash || urlNoDash.endsWith(idNoDash)) {
			return { href: `/${info.url}`, isExternal: false };
		}
	}
	return { href: url, isExternal: true };
}

type ResolveOptions = { linkToPages: LinkToPages };

/** Read the `url` attribute value from an mdxJsxFlowElement/mdxJsxTextElement. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUrlFromMdxJsx(node: any): string | undefined {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const attr = node.attributes?.find((a: any) => a.type === 'mdxJsxAttribute' && a.name === 'url');
	return typeof attr?.value === 'string' ? attr.value : undefined;
}

/** Set the `url` attribute on an mdxJsxFlowElement/mdxJsxTextElement. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setUrlOnMdxJsx(node: any, href: string): void {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const attr = node.attributes?.find((a: any) => a.type === 'mdxJsxAttribute' && a.name === 'url');
	if (attr) {
		attr.value = href;
	} else {
		node.attributes = [...(node.attributes ?? []), { type: 'mdxJsxAttribute', name: 'url', value: href }];
	}
}

/**
 * Rehype plugin: resolves Notion page/database URLs in hast elements.
 * Handles <page>, <database>, <MentionPage>, <MentionDatabase>, and <a href>.
 *
 * Notion page/database block elements (<page>, <database>) come through as
 * regular hast `element` nodes. Inline mention elements come through as
 * mdxJsxTextElement nodes (renamed to MentionPage etc. by
 * rehypeInlineMentionsPlugin which runs before this plugin).
 */
const resolvePageLinksPlugin: Plugin<[ResolveOptions], Root> = (options) => {
	const { linkToPages } = options;
	return (tree) => {
		// Handle <a href> hast elements (standard links to Notion pages).
		visit(tree, 'element', (node: Element) => {
			if (node.tagName === 'a') {
				const rawHref = node.properties?.href;
				const href = typeof rawHref === 'string' ? rawHref : undefined;
				if (href?.includes('notion.so')) {
					const { href: resolved, isExternal } = resolveNotionUrl(href, linkToPages);
					if (!isExternal) {
						node.properties = { ...node.properties, href: resolved };
					}
				}
			}
		});

		// Handle MDX JSX nodes for page/database references and inline mentions.
		// By the time this plugin runs, rehypeBlockElementsPlugin has renamed:
		//   page → PageRef, database → DatabaseRef
		// And rehypeInlineMentionsPlugin has renamed:
		//   mention-page → MentionPage, mention-database → MentionDatabase
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		visit(tree, (node: any) => {
			if (node.type !== 'mdxJsxTextElement' && node.type !== 'mdxJsxFlowElement') return;
			if (
				node.name !== 'PageRef' &&
				node.name !== 'DatabaseRef' &&
				node.name !== 'MentionPage' &&
				node.name !== 'MentionDatabase'
			) return;
			const url = getUrlFromMdxJsx(node);
			if (url) {
				const { href } = resolveNotionUrl(url, linkToPages);
				setUrlOnMdxJsx(node, href);
			}
		});
	};
};

// ── TOC population ─────────────────────────────────────────────────────────

/**
 * Rehype plugin: populates <table_of_contents> elements with anchor links
 * generated from all h1–h4 headings in the document.
 *
 * Must run AFTER rehype-slug so that headings already have id attributes.
 * Performs a two-pass traversal:
 *  1. Collect every h1–h4 that has an id (added by rehype-slug).
 *  2. Replace the children of each <table_of_contents> with a <ul> list
 *     of <li><a href="#id"> entries, preserving heading level as a
 *     data-level attribute for CSS indentation.
 */
const rehypeTocPlugin: Plugin<[], Root> = () => {
	return (tree) => {
		// Pass 1: collect headings with IDs
		const headings: Array<{ level: number; id: string; text: string }> = [];
		visit(tree, 'element', (node: Element) => {
			const match = /^h([1-4])$/.exec(node.tagName);
			if (!match) return;
			const id = node.properties?.id;
			if (typeof id !== 'string' || !id) return;
			headings.push({
				level: parseInt(match[1], 10),
				id,
				text: hastNodeToString(node),
			});
		});

		if (headings.length === 0) return;

		// Pass 2: inject heading links into TableOfContents nodes.
		// After rehypeBlockElementsPlugin runs, <table_of_contents> is renamed to
		// TableOfContents as a mdxJsxFlowElement. This plugin runs after that rename,
		// so we look for mdxJsxFlowElement nodes with name 'TableOfContents'.
		const listItems = headings.map((h) => ({
			type: 'element' as const,
			tagName: 'li',
			properties: { 'data-toc-item': '', 'data-toc-level': h.level },
			children: [
				{
					type: 'element' as const,
					tagName: 'a',
					properties: { href: `#${h.id}`, 'data-toc-link': '' },
					children: [{ type: 'text' as const, value: h.text }],
				},
			],
		}));

		const tocChildren = [
			{
				type: 'element' as const,
				tagName: 'ul',
				properties: { 'data-toc-list': '' },
				children: listItems,
			},
		];

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		visit(tree, (node: any) => {
			if (node.type !== 'mdxJsxFlowElement') return;
			if (node.name !== 'TableOfContents') return;
			node.children = tocChildren;
		});
	};
};

// ── Plugin bundle factory ──────────────────────────────────────────────────

export type MdxPlugins = {
	remarkPlugins: PluggableList;
	rehypePlugins: PluggableList;
};

/** Returns the remark and rehype plugin configuration for Notion MDX. */
export function buildMdxPlugins(linkToPages: LinkToPages): MdxPlugins {
	const { remarkPlugins: userRemarkPlugins, rehypePlugins: userRehypePlugins } = getNotroPlugins();

	return {
		remarkPlugins: [
			remarkNfm,
			...userRemarkPlugins,
		],
		rehypePlugins: [
			// rehypeRaw must come first: converts raw HTML strings in mdast into
			// hast element nodes so that subsequent plugins and component mapping
			// can process them (e.g. <table>, <h2 color="...">, etc.).
			// passThrough preserves Notion-specific custom elements that are not
			// valid HTML and would otherwise be stripped by the HTML parser.
			[rehypeRaw, { passThrough: NOTION_CUSTOM_ELEMENTS }],
			// Convert Notion color/underline attributes to CSS classes.
			// MDX component substitution does not apply to HTML elements created by
			// rehypeRaw, so we apply color classes directly here in the hast tree.
			rehypeNotionColorPlugin,
			// Rename Notion block-level elements (video, audio, table_of_contents,
			// columns, etc.) from lowercase to PascalCase so MDX generates a
			// components-map lookup (_jsx(Video, ...)) instead of a plain HTML
			// string literal (_jsx("video", ...)).
			rehypeBlockElementsPlugin,
			// Rename Notion inline mention elements (mention-user, mention-date…)
			// from hyphenated-lowercase to PascalCase for the same reason.
			rehypeInlineMentionsPlugin,
			// User-provided plugins: math, diagrams, syntax highlighting, etc.
			// e.g. notro({ rehypePlugins: [rehypeKatex, [rehypeMermaid, { theme: 'github-dark' }]] })
			// notro({ shikiConfig: { theme: 'github-dark' } }) injects @shikijs/rehype automatically.
			...userRehypePlugins,
			// rehype-slug adds id attributes to h1–h4 elements.
			// Must run before rehypeTocPlugin, which reads those ids.
			rehypeSlug,
			// Populates TableOfContents with anchor links to all headings.
			rehypeTocPlugin,
			[resolvePageLinksPlugin, { linkToPages }] as const,
		],
	};
}
