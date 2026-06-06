/**
 * Notion markdown → clean MDX string preprocessing.
 *
 * Replaces the remark/rehype pipeline with two pure string-transform passes:
 *
 * 1. preprocessNotionMarkdown(markdown) — structural fixes, callout JSX
 *    conversion, color-to-className, element renaming. Same logic as
 *    remark-notro's preprocessNotionMarkdown() but extended to produce
 *    complete MDX that evaluate() can compile without any plugins.
 *
 * 2. applyMdxContext(markdown, { linkToPages }) — context-dependent
 *    transforms that require knowledge of the full document:
 *    heading ID injection, TOC population, page link resolution.
 *
 * These two functions replace the following pipeline:
 *   remarkNfm + rehype-raw + rehypeNotionColorPlugin +
 *   rehypeBlockElementsPlugin + rehypeInlineMentionsPlugin +
 *   rehype-slug + rehypeTocPlugin + resolvePageLinksPlugin
 */

import type { LinkToPages } from '../types.ts';

// ── Color maps ────────────────────────────────────────────────────────────────

const NOTION_TEXT_CLASSES: Record<string, string> = {
	gray:   'text-[var(--notro-gray)]',
	brown:  'text-[var(--notro-brown)]',
	orange: 'text-[var(--notro-orange)]',
	yellow: 'text-[var(--notro-yellow)]',
	green:  'text-[var(--notro-green)]',
	blue:   'text-[var(--notro-blue)]',
	purple: 'text-[var(--notro-purple)]',
	pink:   'text-[var(--notro-pink)]',
	red:    'text-[var(--notro-red)]',
};

const NOTION_BG_CLASSES: Record<string, string> = {
	gray:   'bg-[var(--notro-gray-bg)]',
	brown:  'bg-[var(--notro-brown-bg)]',
	orange: 'bg-[var(--notro-orange-bg)]',
	yellow: 'bg-[var(--notro-yellow-bg)]',
	green:  'bg-[var(--notro-green-bg)]',
	blue:   'bg-[var(--notro-blue-bg)]',
	purple: 'bg-[var(--notro-purple-bg)]',
	pink:   'bg-[var(--notro-pink-bg)]',
	red:    'bg-[var(--notro-red-bg)]',
};

function notionColorToClass(color: string): string {
	if (!color || color === 'default') return '';
	if (color.endsWith('_bg')) return NOTION_BG_CLASSES[color.slice(0, -3)] ?? '';
	if (color.endsWith('_background')) return NOTION_BG_CLASSES[color.slice(0, -'_background'.length)] ?? '';
	return NOTION_TEXT_CLASSES[color] ?? '';
}

// ── Element rename maps ───────────────────────────────────────────────────────
// Notion block elements that must be PascalCase for MDX component substitution.
// Sorted by name-length descending to ensure longer names (e.g. colgroup) are
// matched before shorter prefixes (e.g. col) in the combined rename regex.

const BLOCK_RENAMES = new Map<string, string>([
	['table_of_contents', 'TableOfContents'],
	['mention-data-source', 'MentionDataSource'],
	['mention-database', 'MentionDatabase'],
	['mention-user', 'MentionUser'],
	['mention-page', 'MentionPage'],
	['mention-agent', 'MentionAgent'],
	['mention-date', 'MentionDate'],
	['empty-block', 'EmptyBlock'],
	['colgroup', 'TableColgroup'],
	['database', 'DatabaseRef'],
	['columns', 'Columns'],
	['details', 'Details'],
	['summary', 'Summary'],
	['column', 'Column'],
	['tbody', 'TableBody'],
	['thead', 'TableHead'],
	['table', 'TableBlock'],
	['audio', 'Audio'],
	['video', 'Video'],
	['file', 'FileBlock'],
	['page', 'PageRef'],
	['pdf', 'PdfBlock'],
	['col', 'TableCol'],
	['tr', 'TableRow'],
	['th', 'TableHeaderCell'],
	['td', 'TableCell'],
]);

// Build a single regex that matches all known element names (longest first so
// alternation doesn't short-circuit e.g. "col" before "colgroup").
const RENAME_NAMES_PATTERN = [...BLOCK_RENAMES.keys()]
	.sort((a, b) => b.length - a.length)
	.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
	.join('|');

// Matches opening/closing tags for any known element.
// Group 1: optional </  Group 2: element name  Group 3: first non-name char (space/>/)
const ELEMENT_RENAME_RE = new RegExp(`(<\\/?)(${RENAME_NAMES_PATTERN})([\\s>\\/])`, 'g');

// ── Shared constants (mirrored from remark-notro) ─────────────────────────────

const LEADING_EMOJI_RE =
	/^(?:[#*0-9]️⃣|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}|\p{Emoji}️)(?:‍(?:[#*0-9]️⃣|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}|\p{Emoji}️))*/u;

const BLOCK_CLOSING_TAGS = ['table', 'details', 'columns', 'column', 'summary'] as const;

const LATEX_COMMANDS = [
	'underbrace', 'overline', 'pmatrix', 'bmatrix', 'mathbb', 'mathbf', 'mathrm',
	'epsilon', 'partial', 'approx', 'matrix', 'forall', 'exists', 'lambda',
	'nabla', 'cases', 'infty', 'sigma', 'theta', 'equiv', 'alpha', 'delta',
	'right', 'tilde', 'begin', 'gamma', 'times', 'cdot',
	'frac', 'sqrt', 'prod', 'left', 'beta', 'text', 'ddot', 'leq', 'geq',
	'neq', 'hat', 'bar', 'vec', 'dot', 'end', 'sum', 'int', 'lim', 'sin',
	'cos', 'tan', 'log', 'ln', 'mu', 'pi', 'pm', 'div',
];

const LATEX_CMD_RE = new RegExp(
	`(?<![\\\\{])\\b(${[...new Set(LATEX_COMMANDS)].sort((a, b) => b.length - a.length).join('|')})\\b`,
	'g',
);

// ── Callout conversion (HTML → MDX JSX) ──────────────────────────────────────

/**
 * Converts raw `<callout ...>...</callout>` HTML blocks to `<callout ...>` MDX
 * JSX (with blank lines around the content so MDX treats it as block markdown),
 * and recursively processes nested callouts after dedenting.
 */
function convertAndDedentCallouts(input: string): string {
	const lines = input.split('\n');
	const out: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		const openMatch = line.match(/^<callout((?:\s[^>]*)?)>/);

		if (openMatch) {
			const attrsStr = openMatch[1].trim();
			const iconMatch = attrsStr.match(/icon="([^"]*)"/);
			const colorMatch = attrsStr.match(/color="([^"]*)"/);
			let icon = iconMatch ? iconMatch[1] : '';
			const color = colorMatch ? colorMatch[1] : '';

			const bodyLines: string[] = [];
			i++;
			let depth = 1;
			while (i < lines.length) {
				const bl = lines[i];
				if (/^<callout/.test(bl.trimStart())) depth++;
				if (bl.trimStart().trim() === '</callout>') {
					depth--;
					if (depth === 0) break;
				}
				bodyLines.push(bl);
				i++;
			}

			if (!icon && bodyLines.length > 0) {
				const firstContent = bodyLines[0].replace(/^\t/, '');
				const emojiMatch = firstContent.match(LEADING_EMOJI_RE);
				if (emojiMatch) {
					icon = emojiMatch[0];
					bodyLines[0] = '\t' + firstContent.slice(icon.length).trimStart();
				}
			}

			const attrParts: string[] = [];
			if (icon) attrParts.push(`icon="${icon}"`);
			if (color) attrParts.push(`color="${color}"`);
			const attrsJsx = attrParts.length > 0 ? ' ' + attrParts.join(' ') : '';

			const dedented = bodyLines.map(l => l.replace(/^\t/, '')).join('\n');
			const processedBody = convertAndDedentCallouts(dedented);

			out.push(`<callout${attrsJsx}>`);
			out.push(''); // blank line so MDX treats children as block markdown
			if (processedBody) out.push(...processedBody.split('\n'));
			out.push(''); // blank line before closing tag
			out.push('</callout>');
			i++; // skip </callout> line
		} else {
			out.push(line);
			i++;
		}
	}

	return out.join('\n');
}

// ── Span color/underline → className ─────────────────────────────────────────

function convertSpanColors(markdown: string): string {
	return markdown.replace(/<span([^>]*)>/g, (_, attrs: string) => {
		const colorMatch = attrs.match(/\bcolor="([^"]*)"/);
		const underlineMatch = attrs.match(/\bunderline="([^"]*)"/);
		const color = colorMatch ? colorMatch[1] : '';
		const underline = underlineMatch ? underlineMatch[1] : '';
		if (!color && !underline) return `<span${attrs}>`;

		const classes: string[] = [];
		if (color) {
			const cls = notionColorToClass(color);
			if (cls) classes.push(cls);
		}
		if (underline === 'true') classes.push('underline');

		if (classes.length === 0) return `<span${attrs}>`;

		const cleanedAttrs = attrs
			.replace(/\s*\bcolor="[^"]*"/, '')
			.replace(/\s*\bunderline="[^"]*"/, '');

		const existingClassMatch = cleanedAttrs.match(/\b(?:class|className)="([^"]*)"/);
		if (existingClassMatch) {
			const combined = [existingClassMatch[1], ...classes].filter(Boolean).join(' ');
			return `<span${cleanedAttrs.replace(/\b(?:class|className)="[^"]*"/, `className="${combined}"`)}>`;
		}
		return `<span${cleanedAttrs} className="${classes.join(' ')}">`;
	});
}

// ── Main preprocessing pass ───────────────────────────────────────────────────

/**
 * Transforms Notion markdown into clean MDX that evaluate() can compile without
 * any remark or rehype plugins.
 *
 * Covers the same structural fixes as remark-notro's preprocessNotionMarkdown()
 * and additionally:
 * - Converts callouts to MDX JSX (<callout ...>...</callout>)
 * - Converts color/underline attributes to className
 * - Converts <table_of_contents/> → <TableOfContents/>
 * - Renames all Notion custom elements to PascalCase
 * - Converts <span> color/underline attributes to className
 */
export function preprocessNotionMarkdown(markdown: string): string {
	// Fix 0: Migration — convert legacy \$...\$ escaped math back to $...$
	let result = markdown.replace(/\\\$([^$\n]+)\\\$/g, (_, c: string) => `$${c}$`);

	// Fix 1: Ensure --- dividers have a blank line before them (setext heading prevention).
	result = result.replace(/([^\n])\n[ \t]+\n(---+)(\n|$)/g, '$1\n\n$2$3');
	result = result.replace(/([^\n])\n(---+)(\n|$)/g, '$1\n\n$2$3');

	// Fix 2: Callout → MDX JSX.
	// Notion outputs <callout icon="..." color="...">...\n</callout> blocks.
	// Convert directly to <callout ...>\n\ncontent\n\n</callout> MDX JSX
	// (blank lines ensure MDX treats children as block-level markdown).
	result = convertAndDedentCallouts(result);
	// Also handle any remaining "::: callout {attrs}" legacy forms.
	result = result.replace(
		/^::: callout( \{[^}]*\})?$/gm,
		(_, attrs) => `:::callout${(attrs as string | undefined)?.trim() ?? ''}`,
	);

	// Fix 3: Block-level color annotations → className.
	// Headings: ## Heading {color="blue"} → <h2 className="text-[var(--notro-blue)]">Heading</h2>
	result = result.replace(
		/^(#{1,6}) (.+?) \{color="([^"]+)"\}$/gm,
		(_, hashes: string, text: string, color: string) => {
			const cls = notionColorToClass(color);
			const level = hashes.length;
			return cls
				? `<h${level} className="${cls}">${text}</h${level}>`
				: `<h${level}>${text}</h${level}>`;
		},
	);
	// Paragraphs: text {color="gray_bg"} → <p className="bg-[var(--notro-gray-bg)]">text</p>
	result = result.replace(
		/^([^<#\n][^\n]*?) \{color="([^"]+)"\}$/gm,
		(_, text: string, color: string) => {
			const cls = notionColorToClass(color);
			return cls ? `<p className="${cls}">${text}</p>` : `<p>${text}</p>`;
		},
	);
	// Ensure color-annotated <p>/<h*> are surrounded by blank lines.
	result = result.replace(/([^\n])\n(<(?:p|h[1-6]) className="[^"]*">)/g, '$1\n\n$2');
	result = result.replace(/(<\/(?:p|h[1-6])>)\n([^\n])/g, '$1\n\n$2');

	// Fix 4: <table_of_contents/> → <TableOfContents/>
	// MDX parses PascalCase JSX natively; no <div> wrapper or passThrough needed.
	result = result.replace(
		/^<table[_-]of[_-]contents(\s[^/>\s][^/>]*)?\s*\/?>$/gm,
		(_, attrs: string | undefined) => {
			const innerAttrs = attrs ? ' ' + attrs.trim() : '';
			return `<TableOfContents${innerAttrs}/>`;
		},
	);

	// Fix 5: Inline equation format $`...`$ → $...$
	result = result.replace(/\$`([^`]+)`\$/g, (_, c: string) => `$${c}$`);

	// Fix 6: Strip <synced_block> and <synced_block_reference> wrappers.
	const stripSyncedBlock = (_: string, content: string): string =>
		content
			.replace(/^\t<\/?synced_block_reference(?:\s[^>]*)?\/?>[ \t]*$/gm, '')
			.replace(/^\t/gm, '');
	result = result.replace(
		/^<synced_block(?:\s[^>]*)?>$([\s\S]*?)^<\/synced_block>$/gm,
		stripSyncedBlock,
	);
	result = result.replace(
		/^<synced_block_reference(?:\s[^>]*)?>$([\s\S]*?)^<\/synced_block_reference>$/gm,
		stripSyncedBlock,
	);

	// Fix 7: Ensure <empty-block/> is treated as a standalone block element.
	result = result.replace(/([^\n])\n(<empty-block\/>)/g, '$1\n\n$2');
	result = result.replace(/(<empty-block\/>)\n([^\n])/g, '$1\n\n$2');

	// Fix 8: Ensure block-level HTML closing tags have a trailing blank line.
	const blockClosingPattern = new RegExp(
		`(<\\/(${BLOCK_CLOSING_TAGS.join('|')})>)\\n([^\\n])`,
		'g',
	);
	result = result.replace(blockClosingPattern, '$1\n\n$3');

	// Fix 9: Convert markdown links inside raw HTML table cells to <a> tags.
	result = result.replace(/<(td|th)>([\s\S]*?)<\/\1>/g, (_: string, tag: string, content: string) => {
		const linked = content.replace(
			/\[([^\]\n]+)\]\(([^()\n]*(?:\([^()\n]*\)[^()\n]*)*)\)/g,
			'<a href="$2">$1</a>',
		);
		return `<${tag}>${linked}</${tag}>`;
	});

	// Fix 10: Dedent tab-indented content inside <details>, <columns>, and <column>.
	result = (function dedentHtmlBlocks(input: string): string {
		const lines = input.split('\n');
		const out: string[] = [];
		let depth = 0;
		for (const line of lines) {
			const stripped = line.trimStart();
			if (/^<\/(details|columns|column)>/.test(stripped)) {
				if (depth > 0) depth--;
				out.push(depth > 0 ? line.replace(new RegExp(`^\t{1,${depth}}`), '') : line);
			} else if (/^<(details|columns|column)(?:\s[^>]*)?>$/.test(stripped)) {
				out.push(depth > 0 ? line.replace(new RegExp(`^\t{1,${depth}}`), '') : line);
				depth++;
			} else if (depth > 0) {
				out.push(line.replace(new RegExp(`^\t{1,${depth}}`), ''));
			} else {
				out.push(line);
			}
		}
		return out.join('\n');
	})(result);

	// Fix 11: Restore missing backslashes in LaTeX commands inside math delimiters.
	result = result.replace(
		/\$([^$\n]+)\$/g,
		(_, c: string) => `$${c.replace(LATEX_CMD_RE, '\\$1')}$`,
	);
	result = result.replace(
		/\$\$([\s\S]+?)\$\$/g,
		(_, c: string) => `$$${c.replace(LATEX_CMD_RE, '\\$1')}$$`,
	);

	// Fix 12: Prevent blockquote lazy continuation.
	result = result.replace(/(^>[ \t][^\n]*)\n(?!>|\n)/gm, '$1\n\n');

	// Fix 13: Expand single \n block boundaries to \n\n (paragraph breaks).
	// Protect fenced code blocks from expansion.
	result = result
		.split(/((?:^|\n)```[\s\S]*?(?:```\s*(?:\n|$)|$))/g)
		.map((segment, i) => {
			if (i % 2 === 1) return segment; // protected fenced code block
			let s = segment;
			let prev: string;
			do {
				prev = s;
				s = s.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
			} while (s !== prev);
			return s;
		})
		.join('');

	// Fix 14: Rename Notion custom elements to PascalCase for MDX component substitution.
	// e.g. <video> → <Video>, <mention-user> → <MentionUser>
	// PascalCase names make MDX generate _jsx(Video, ...) which consults the
	// components map; lowercase names generate _jsx("video", ...) which bypasses it.
	result = result.replace(
		ELEMENT_RENAME_RE,
		(_, prefix: string, name: string, suffix: string) => {
			const renamed = BLOCK_RENAMES.get(name) ?? name;
			return `${prefix}${renamed}${suffix}`;
		},
	);

	// Fix 15: Convert **bold** to <strong> to work around CJK punctuation rules.
	result = result
		.split(/((?:^|\n)```[\s\S]*?(?:```|$)|`[^`\n]+`)/g)
		.map((segment, i) => {
			if (i % 2 === 1) return segment;
			return segment.replace(/\*\*([^\n*]+?)\*\*/g, (_, c) => `<strong>${(c as string).trimEnd()}</strong>`);
		})
		.join('');

	// Fix 16: Convert <span> color/underline attributes to className.
	result = convertSpanColors(result);

	// Fix 17: GFM strikethrough ~~text~~ → <del>text</del>.
	// remark-gfm is no longer in the evaluate() pipeline; handle at string level.
	// Protected from code blocks by the split approach.
	result = result
		.split(/((?:^|\n)```[\s\S]*?(?:```\s*(?:\n|$)|$))/g)
		.map((segment, i) => {
			if (i % 2 === 1) return segment;
			return segment.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>');
		})
		.join('');

	// Fix 18: GFM task list items - [ ] / - [x] → inline checkbox JSX.
	// Produces: `- <input type="checkbox" disabled/> text`
	// Transforms the checkbox prefix into a self-closing JSX <input> element.
	result = result.replace(
		/^([ \t]*[-*+])[ \t]+\[( |x|X)\][ \t]+/gm,
		(_, bullet: string, check: string) => {
			const checked = check.trim() !== '' ? ' checked' : '';
			return `${bullet} <input type="checkbox" disabled${checked}/> `;
		},
	);

	// Fix 19: Convert void HTML elements to self-closing JSX form.
	// MDX's JSX parser requires <br/> not <br>; HTML void elements are not
	// auto-closed in JSX syntax (unlike HTML5). Only handle elements that
	// appear bare (i.e. not already self-closing and not inside code blocks).
	result = result
		.split(/((?:^|\n)```[\s\S]*?(?:```\s*(?:\n|$)|$))/g)
		.map((segment, i) => {
			if (i % 2 === 1) return segment;
			return segment.replace(
				/<(br|hr|wbr)((?:\s[^>]*)?)>/gi,
				(_, tag: string, attrs: string) => `<${tag.toLowerCase()}${attrs}/>`,
			);
		})
		.join('');

	return result;
}

// ── Context-dependent MDX post-processing ─────────────────────────────────────

/** Heading entry collected during heading ID injection. */
interface HeadingEntry {
	id: string;
	text: string;
	depth: number;
}

/** Strip markdown inline formatting to produce plain text for slugs and TOC labels. */
function stripMarkdownFormatting(text: string): string {
	return text
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')  // [text](url) → text
		.replace(/`([^`]+)`/g, '$1')               // `code` → code
		.replace(/[*_]{1,3}/g, '')                 // *** ** * _ __ ___ markers
		.trim();
}

function textToSlug(text: string): string {
	return stripMarkdownFormatting(text)
		.toLowerCase()
		.replace(/[^\wÀ-ž\s-]/g, '')
		.replace(/[\s_]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Injects `<a id="slug"/>` anchors before ATX headings (h1–h4) and returns
 * both the modified markdown and the list of collected headings for TOC use.
 */
function injectHeadingIds(markdown: string): { result: string; headings: HeadingEntry[] } {
	const headings: HeadingEntry[] = [];
	const slugCounts = new Map<string, number>();

	const result = markdown.replace(/^(#{1,4}) (.+)$/gm, (_, hashes: string, rawText: string) => {
		const depth = hashes.length;
		const text = stripMarkdownFormatting(rawText);
		const baseSlug = textToSlug(rawText);
		if (!baseSlug) return `${hashes} ${rawText}`; // no slug for empty headings

		const count = slugCounts.get(baseSlug) ?? 0;
		slugCounts.set(baseSlug, count + 1);
		const id = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;

		headings.push({ id, text, depth });
		// Insert anchor immediately before the heading; the leading blank line
		// comes from Fix 13's block boundary expansion that already ran.
		return `<a id="${id}"></a>\n${hashes} ${rawText}`;
	});

	return { result, headings };
}

function populateToc(markdown: string, headings: HeadingEntry[]): string {
	if (headings.length === 0) return markdown;

	const items = headings
		.map(h =>
			`<li data-toc-item="" data-toc-level="${h.depth}"><a href="#${h.id}" data-toc-link="">${escapeHtml(h.text)}</a></li>`,
		)
		.join('\n');
	const tocHtml = `<ul data-toc-list="">\n${items}\n</ul>`;

	// Replace all <TableOfContents.../> occurrences with the populated version.
	return markdown.replace(
		/<TableOfContents([^/]*)\s*\/>/g,
		(_, extraAttrs: string) => {
			const attrStr = extraAttrs.trim();
			return attrStr
				? `<TableOfContents ${attrStr}>\n${tocHtml}\n</TableOfContents>`
				: `<TableOfContents>\n${tocHtml}\n</TableOfContents>`;
		},
	);
}

function resolveNotionUrl(
	url: string,
	linkToPages: LinkToPages,
): string {
	const urlNoDash = url.replace(/-/g, '');
	for (const [pageId, info] of Object.entries(linkToPages)) {
		const idNoDash = pageId.replace(/-/g, '');
		if (urlNoDash === idNoDash || urlNoDash.endsWith(idNoDash)) {
			return `/${info.url}`;
		}
	}
	return url;
}

function resolvePageLinks(markdown: string, linkToPages: LinkToPages): string {
	if (Object.keys(linkToPages).length === 0) return markdown;

	// Resolve href="https://...notion.so/..." in standard markdown links and JSX attrs
	let result = markdown.replace(/href="([^"]*notion\.so[^"]*)"/g, (_, url: string) => {
		const resolved = resolveNotionUrl(url, linkToPages);
		return `href="${resolved}"`;
	});

	// Resolve url="https://...notion.so/..." in PageRef, DatabaseRef, MentionPage, MentionDatabase
	result = result.replace(/(<(?:PageRef|DatabaseRef|MentionPage|MentionDatabase)[^>]*?)url="([^"]*)"/g,
		(_, prefix: string, url: string) => {
			const resolved = resolveNotionUrl(url, linkToPages);
			return `${prefix}url="${resolved}"`;
		},
	);

	return result;
}

/**
 * Applies context-dependent MDX transforms that require document-level knowledge.
 * Must run AFTER preprocessNotionMarkdown().
 *
 * @param markdown - preprocessed MDX source from preprocessNotionMarkdown()
 * @param options.linkToPages - optional Notion page ID → { url, title } map
 */
export function applyMdxContext(
	markdown: string,
	options: { linkToPages?: LinkToPages } = {},
): string {
	const { linkToPages = {} } = options;

	const { result: withIds, headings } = injectHeadingIds(markdown);
	const withToc = populateToc(withIds, headings);
	const withLinks = resolvePageLinks(withToc, linkToPages);

	return withLinks;
}
