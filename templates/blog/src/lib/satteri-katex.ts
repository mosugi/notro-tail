/**
 * satteriKatex — renders math nodes to KaTeX HTML at build time.
 *
 * A Sätteri mdast plugin: with notro({ features: { math: true } }), Sätteri
 * parses `$...$` and `$$...$$` into inlineMath / math mdast nodes; this
 * plugin replaces them with KaTeX-rendered HTML (the Sätteri counterpart of
 * remark-math + rehype-katex).
 *
 * Usage in astro.config.mjs:
 *   import { satteriKatex } from "./src/lib/satteri-katex.ts";
 *   notro({
 *     features: { math: true },
 *     mdastPlugins: [satteriKatex()],
 *   })
 */

import { defineMdastPlugin, type MdastPluginInput } from "satteri";
import katex from "katex";
import type { KatexOptions } from "katex";

export function satteriKatex(options: KatexOptions = {}): MdastPluginInput {
  const render = (value: string, displayMode: boolean) => {
    try {
      return {
        rawHtml: katex.renderToString(value, {
          // KaTeX throws on parse errors by default; render the error in
          // place instead so one bad formula doesn't break the whole page.
          throwOnError: false,
          ...options,
          displayMode,
        }),
      };
    } catch {
      // Defensive: throwOnError may be overridden via options.
      return undefined;
    }
  };

  return defineMdastPlugin({
    name: "satteri-katex",
    math(node) {
      return render(node.value, true);
    },
    inlineMath(node) {
      return render(node.value, false);
    },
  });
}
