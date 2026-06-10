/**
 * Sätteri MDASTP plugins bundled into notro's default pipeline.
 *
 * Scope: static .mdx files processed by @astrojs/mdx with Sätteri.
 * The Notion runtime path (evaluate()) uses string-level preprocessing
 * (preprocessNotionMarkdown / applyMdxContext) and is unaffected.
 *
 * What is and isn't needed for user-authored .mdx files:
 * - callout directive → <callout> element: YES — users write :::callout in .mdx
 * - Notion color/block/mention transforms: NOT needed (Notion API artifacts)
 * - Heading IDs / TOC: covered by @astrojs/mdx's built-in Sätteri plugins
 * - Page link resolution: NOT needed (Notion links, not in .mdx files)
 *
 * GFM, math, and directives: controlled via Sätteri's Features option.
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
