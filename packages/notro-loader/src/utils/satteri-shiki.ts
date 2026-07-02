/**
 * Sätteri hast plugin for Shiki syntax highlighting.
 *
 * Replaces <pre><code class="language-xxx"> blocks with Shiki's rendered
 * hast tree. The Sätteri counterpart of @shikijs/rehype, driven by the
 * notro({ shikiConfig }) option.
 *
 * The `codeToHast` function is injected by the notro() integration, which
 * dynamically imports the optional `shiki` dependency (see integration.ts).
 */

import { defineHastPlugin, type HastNode, type HastPluginInput } from "satteri";

/** Matches shiki's codeToHast: returns a hast root whose first child is <pre>. */
export type CodeToHastFn = (
  code: string,
  options: Record<string, unknown>,
) => Promise<{ children: unknown[] }>;

export function createSatteriShikiPlugin(
  codeToHast: CodeToHastFn,
  shikiConfig: Record<string, unknown>,
): HastPluginInput {
  return defineHastPlugin({
    name: "notro-shiki",
    element: {
      filter: ["pre"],
      async visit(node, ctx) {
        const codeEl = node.children?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.type === "element" && c.tagName === "code",
        );
        if (!codeEl || codeEl.type !== "element") return;
        const cls = codeEl.properties?.className;
        const langCls = Array.isArray(cls)
          ? cls.find((c) => String(c).startsWith("language-"))
          : undefined;
        if (!langCls) return; // no language — leave untouched (matches @shikijs/rehype)
        const lang = String(langCls).slice("language-".length);
        const code = ctx.textContent(codeEl).replace(/\n$/, "");
        try {
          const root = await codeToHast(code, { ...shikiConfig, lang });
          return root.children[0] as HastNode;
        } catch {
          // Unknown language or highlighter failure — leave the block as-is.
          return;
        }
      },
    },
  });
}
