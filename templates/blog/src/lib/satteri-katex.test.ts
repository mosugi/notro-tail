import { describe, it, expect } from "vitest";
import { mdxToJs } from "satteri";
import { satteriKatex } from "./satteri-katex.ts";

/** Compiles markdown with math enabled + satteriKatex, returns JSX source. */
async function compile(markdown: string): Promise<string> {
  const result = await mdxToJs(markdown, {
    features: { math: true },
    mdastPlugins: [satteriKatex()],
    jsx: true,
  });
  return result.code;
}

describe("satteriKatex", () => {
  it("renders inline math to KaTeX markup", async () => {
    const code = await compile("Euler: $e^{i\\pi} + 1 = 0$\n");
    expect(code).toContain("katex");
    expect(code).not.toContain("$e^");
  });

  it("renders block math in display mode", async () => {
    const code = await compile("$$\n\\int_0^1 x\\,dx\n$$\n");
    expect(code).toContain("katex-display");
  });

  it("does not throw on invalid TeX (renders error in place)", async () => {
    const code = await compile("$\\invalidmacro$\n");
    expect(code).toContain("katex");
  });

  it("leaves surrounding markdown intact", async () => {
    const code = await compile("before $x$ after\n");
    expect(code).toContain("before");
    expect(code).toContain("after");
  });
});
