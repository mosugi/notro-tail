/**
 * rehypeMermaid — renders ```mermaid code blocks to inline SVG at build time.
 *
 * Requires beautiful-mermaid (optional dependency):
 *   npm install beautiful-mermaid
 *
 * If beautiful-mermaid is not installed, mermaid code blocks are left as-is
 * so downstream plugins (e.g. @shikijs/rehype) can process them as code.
 *
 * Usage in astro.config.mjs:
 *   import { rehypeMermaid } from 'rehype-mermaid';
 *   notro({
 *     rehypePlugins: [
 *       [rehypeMermaid, { theme: 'github-dark' }],  // must come before @shikijs/rehype
 *       rehypeKatex,
 *       [rehypeShiki, { theme: 'github-dark' }],
 *     ],
 *   })
 */

import type { Plugin } from 'unified';
import type { Root, Element, ElementContent } from 'hast';
import { visit } from 'unist-util-visit';
import { toString as hastToString } from 'hast-util-to-string';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';

export interface RehypeMermaidOptions {
  /** beautiful-mermaid theme key (e.g. 'github-dark', 'default'). */
  theme?: string;
  /**
   * CSS class name applied to the wrapper <div> around each rendered SVG.
   * When omitted, a `data-mermaid` attribute is used instead so that styling
   * can be applied via a `[data-mermaid]` selector in global CSS.
   *
   * @example 'mermaid-diagram'
   */
  className?: string;
}

export const rehypeMermaid: Plugin<[RehypeMermaidOptions?], Root> = (options = {}) => {
  return async (tree) => {
    // Collect all mermaid <pre><code class="language-mermaid"> nodes.
    // Must be collected before tree mutation to avoid visit index corruption.
    const nodes: Array<{ node: Element; index: number; parent: { children: ElementContent[] } }> =
      [];

    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'pre' || index === null || !parent) return;
      const codeEl = node.children[0];
      if (!codeEl || codeEl.type !== 'element' || codeEl.tagName !== 'code') return;
      const cls = codeEl.properties?.className;
      if (!Array.isArray(cls) || !cls.includes('language-mermaid')) return;
      nodes.push({ node, index, parent: parent as { children: ElementContent[] } });
    });

    if (nodes.length === 0) return;

    // Try to load beautiful-mermaid (optional — graceful fallback if absent).
    //
    // Use new Function('return import(s)') to escape Vite's module runner.
    // In Astro's SSG build, rehype transformers run during the prerender phase
    // (after Vite finishes bundling), when the Vite module runner has already
    // been closed. A plain `await import('beautiful-mermaid')` would fail with
    // "Vite module runner has been closed". By constructing the import call
    // inside a new Function, Vite cannot analyse or intercept it at build time,
    // so at runtime Node.js resolves it through its own native ESM loader.
    let renderFn: ((code: string) => string) | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const nativeImport = new Function('s', 'return import(s)') as (s: string) => Promise<typeof import('beautiful-mermaid')>;
      const mod = await nativeImport('beautiful-mermaid');
      const theme = options.theme != null ? mod.THEMES[options.theme] : undefined;
      renderFn = (code: string) => mod.renderMermaidSVG(code, theme);
    } catch {
      // beautiful-mermaid not installed or failed to load; leave code blocks unchanged.
      return;
    }

    // Replace each mermaid block with a rendered SVG wrapped in a div.
    // Iterate in reverse so index values remain valid after splicing.
    for (const { node, index, parent } of nodes.reverse()) {
      const code = hastToString(node.children[0] as Element).trim();
      const svg = renderFn(code);
      // Parse the SVG string into proper hast nodes so downstream plugins
      // (e.g. rehype-stringify, MDX hast-to-JSX) can handle them correctly.
      const svgRoot = fromHtmlIsomorphic(svg, { fragment: true });
      const divNode: Element = {
        type: 'element',
        tagName: 'div',
        properties: options.className
          ? { className: [options.className] }
          : { 'data-mermaid': '' },
        children: svgRoot.children as ElementContent[],
      };
      parent.children.splice(index, 1, divNode);
    }
  };
};
