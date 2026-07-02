/**
 * satteriMermaid — renders ```mermaid code blocks to inline SVG at build time.
 *
 * A Sätteri hast plugin (https://satteri.bruits.org/docs/plugins/) for
 * Astro 7's Rust-based Markdown/MDX processor.
 *
 * Requires beautiful-mermaid (optional dependency):
 *   npm install beautiful-mermaid
 *
 * If beautiful-mermaid is not installed, mermaid code blocks are left as-is
 * so downstream plugins (e.g. a Shiki plugin) can process them as code.
 *
 * Usage in astro.config.mjs with notro:
 *   import { satteriMermaid } from 'satteri-beautiful-mermaid';
 *   notro({
 *     shikiConfig: { theme: 'github-dark' },  // shiki is injected after hastPlugins
 *     hastPlugins: [satteriMermaid({ theme: 'github-dark' })],
 *   })
 */

import { defineHastPlugin, type HastNode, type HastPluginInput } from "satteri";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";

export interface SatteriMermaidOptions {
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

export function satteriMermaid(
  options: SatteriMermaidOptions = {},
): HastPluginInput {
  // Cache the beautiful-mermaid loader across visits: the dynamic import
  // resolves once and every mermaid block in every document reuses it.
  let renderFnPromise: Promise<((code: string) => string) | null> | undefined;

  const loadRenderFn = () => {
    renderFnPromise ??= (async () => {
      try {
        // Use new Function('return import(s)') to escape Vite's module
        // runner. In Astro's SSG build, Sätteri plugins run during the
        // prerender phase (after Vite finishes bundling), when the Vite
        // module runner has already been closed. A plain
        // `await import('beautiful-mermaid')` would fail with "Vite module
        // runner has been closed". By constructing the import call inside a
        // new Function, Vite cannot analyse or intercept it at build time,
        // so at runtime Node.js resolves it through its own native ESM
        // loader.
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const nativeImport = new Function("s", "return import(s)") as (
          s: string,
        ) => Promise<typeof import("beautiful-mermaid")>;
        const mod = await nativeImport("beautiful-mermaid");
        const theme =
          options.theme != null ? mod.THEMES[options.theme] : undefined;
        return (code: string) => mod.renderMermaidSVG(code, theme);
      } catch {
        // beautiful-mermaid not installed or failed to load;
        // leave code blocks unchanged.
        return null;
      }
    })();
    return renderFnPromise;
  };

  return defineHastPlugin({
    name: "satteri-mermaid",
    element: {
      filter: ["pre"],
      async visit(node, ctx) {
        const codeEl = node.children?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.type === "element" && c.tagName === "code",
        );
        if (!codeEl || codeEl.type !== "element") return;
        const cls = codeEl.properties?.className;
        if (!Array.isArray(cls) || !cls.includes("language-mermaid")) return;

        const renderFn = await loadRenderFn();
        if (!renderFn) return;

        const svg = renderFn(ctx.textContent(codeEl).trim());
        // Parse the SVG string into proper hast nodes — Sätteri's MDX
        // compiler emits raw string nodes as escaped text, so the SVG must
        // be real element nodes to render as markup.
        const svgRoot = fromHtmlIsomorphic(svg, { fragment: true });
        return {
          type: "element",
          tagName: "div",
          properties: options.className
            ? { className: [options.className] }
            : { "data-mermaid": "" },
          children: svgRoot.children,
        } as HastNode;
      },
    },
  });
}
