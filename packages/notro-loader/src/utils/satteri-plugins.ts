/**
 * Sätteri MDAST/HAST plugins for Notion content support.
 *
 * These plugins are the Sätteri equivalents of notro's remark/rehype plugins.
 * They are used when notro() is configured with processor: satteri().
 *
 * Scope: static .mdx files processed by @astrojs/mdx with Sätteri.
 * The Notion runtime path (evaluate()) always uses unified regardless.
 *
 * What needs porting vs what doesn't:
 * - preprocessNotionMarkdown() string fixes: NOT needed for user-authored .mdx files
 * - callout directive → <callout> element: YES — users write :::callout in .mdx
 * - rehypeNotionColorPlugin: NOT needed (Notion API artifact, not in .mdx files)
 * - rehypeBlockElementsPlugin: NOT needed (Notion block types, not in .mdx files)
 * - rehypeInlineMentionsPlugin: NOT needed (Notion-specific)
 * - rehypeSlug: covered by satteriHeadingIdsPlugin built-in to @astrojs/mdx
 * - rehypeTocPlugin: NOT needed (<table_of_contents/> is a Notion block, not in .mdx)
 * - resolvePageLinksPlugin: NOT needed (Notion links, not in .mdx files)
 *
 * GFM strikethrough and task lists: built-in to Sätteri, no porting needed.
 */

import { defineMdastPlugin } from 'satteri';
import type { MdastPluginDefinition, MdxJsxAttributeNode, MdxJsxFlowElement } from 'satteri';

/**
 * Sätteri MDASTP plugin: converts :::callout{icon="..." color="..."} container
 * directives to <callout> MDX JSX elements so the Callout.astro component can
 * render them via the notionComponents map.
 *
 * Without this plugin, Sätteri deletes unprocessed directive nodes instead of
 * wrapping them (unlike remark-rehype which wraps in <div>).
 *
 * The callout element uses a lowercase name ("callout") so that MDX compiles it
 * as _jsx(_components.callout || "callout", ...) — the components prop at render
 * time substitutes Callout.astro via notionComponents.
 */
export const notroCalloutPlugin: MdastPluginDefinition = defineMdastPlugin({
	name: 'notro-callout',
	containerDirective(node, _ctx) {
		if (node.name !== 'callout') return;

		const attrs = node.attributes ?? {};
		const mdxAttrs: MdxJsxAttributeNode[] = [];

		if (attrs.color) {
			mdxAttrs.push({ type: 'mdxJsxAttribute', name: 'color', value: attrs.color });
		}
		if (attrs.icon) {
			mdxAttrs.push({ type: 'mdxJsxAttribute', name: 'icon', value: attrs.icon });
		}

		// Return an mdxJsxFlowElement node named "callout".
		// The children (body content) are preserved as-is so block-level markdown
		// inside the callout (paragraphs, lists, headings) renders correctly.
		return {
			type: 'mdxJsxFlowElement',
			name: 'callout',
			attributes: mdxAttrs,
			children: [...node.children],
		} as MdxJsxFlowElement;
	},
});

/**
 * Returns the MDASTP plugins for the Sätteri pipeline.
 * Add notroCalloutPlugin so :::callout directives survive Sätteri's
 * "delete unprocessed directives" behavior.
 */
export function buildSatteriMdastPlugins(): MdastPluginDefinition[] {
	return [notroCalloutPlugin];
}
