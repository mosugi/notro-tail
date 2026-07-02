import { describe, it, expect } from "vitest";
import { mdxToJs } from "satteri";
import { preprocessNotionMarkdown } from "remark-notro";
import { buildSatteriPlugins } from "./satteri-pipeline.ts";
import type { LinkToPages } from "../types.ts";

/**
 * Compiles Notion markdown through the Sätteri pipeline (same plugin
 * configuration as compile-mdx.ts) and returns the generated JSX module
 * source for assertions.
 */
async function compile(
  markdown: string,
  linkToPages: LinkToPages = {},
): Promise<string> {
  const { mdastPlugins, hastPlugins, features } =
    buildSatteriPlugins(linkToPages);
  const result = await mdxToJs(preprocessNotionMarkdown(markdown), {
    features,
    mdastPlugins,
    hastPlugins,
    jsx: true,
  });
  return result.code;
}

describe("satteri pipeline: callout conversion", () => {
  it("converts :::callout directives into <callout> component lookups", async () => {
    const code = await compile(
      ':::callout{icon="💡" color="gray_bg"}\nBody text.\n:::\n',
    );
    expect(code).toContain("_components.callout");
    expect(code).toContain('color="gray_bg"');
    expect(code).toContain('icon="💡"');
    expect(code).toContain("Body text.");
  });

  it("converts nested callouts inside the outer replacement", async () => {
    const code = await compile(
      '::::callout{icon="a"}\nouter\n\n:::callout{icon="b"}\ninner\n:::\n::::\n',
    );
    expect(code).toContain('icon="a"');
    expect(code).toContain('icon="b"');
    expect(code).toContain("inner");
  });

  it("restores text directives as literal text (ports remarkNfm's flow-only directive)", async () => {
    const code = await compile("**http://localhost:4321** and 10:00\n");
    expect(code).toContain("http://localhost");
    expect(code).toContain(":4321");
    // ":00" is restored as its own text node, so the compiled JSX splits
    // "10:00" into {" and 10"}{":00"} — assert on the restored fragment.
    expect(code).toContain(":00");
    expect(code).not.toContain("_components.div");
  });

  it("restores text directives after multibyte content (byte-offset positions)", async () => {
    const code = await compile(
      "日本語のテキストです。サーバーは **http://localhost:4321** で起動。\n",
    );
    expect(code).toContain(":4321");
  });
});

describe("satteri pipeline: element renames", () => {
  it("renames block elements to PascalCase component lookups", async () => {
    const code = await compile(
      '<video url="https://x.mp4"></video>\n\n<table_of_contents/>\n',
    );
    expect(code).toContain("Video");
    expect(code).toContain("TableOfContents");
    expect(code).not.toContain("<video");
  });

  it("renames nested table elements inside the topmost replacement", async () => {
    const code = await compile(
      '<table header-row="true">\n<tr><th>H</th></tr>\n<tr><td>cell</td></tr>\n</table>\n',
    );
    expect(code).toContain("TableBlock");
    expect(code).toContain("TableRow");
    expect(code).toContain("TableHeaderCell");
    expect(code).toContain("TableCell");
  });

  it("renames inline mention elements", async () => {
    const code = await compile(
      'Hi <mention-user url="https://notion.so/u">bob</mention-user>!\n',
    );
    expect(code).toContain("MentionUser");
    expect(code).not.toContain("mention-user");
  });
});

describe("satteri pipeline: color conversion", () => {
  it("converts block color attributes to CSS variable classes", async () => {
    const code = await compile('<p color="blue">text</p>\n');
    expect(code).toContain("text-[var(--notro-blue)]");
    expect(code).not.toContain('color="blue"');
  });

  it("converts background colors and span underline", async () => {
    const code = await compile(
      '<p color="gray_bg">bg</p>\n\ntext <span underline="true">u</span>\n',
    );
    expect(code).toContain("bg-[var(--notro-gray-bg)]");
    expect(code).toContain('"underline"');
    expect(code).not.toContain("underline=");
  });

  it("converts colored spans nested inside colored paragraphs", async () => {
    const code = await compile(
      '<p color="blue">a <span color="red">b</span></p>\n',
    );
    expect(code).toContain("text-[var(--notro-blue)]");
    expect(code).toContain("text-[var(--notro-red)]");
  });
});

describe("satteri pipeline: heading slugs and TOC", () => {
  it("adds github-slugger ids to headings", async () => {
    const code = await compile("# Hello World\n\n## Second Section\n");
    expect(code).toContain('id="hello-world"');
    expect(code).toContain('id="second-section"');
  });

  it("deduplicates repeated heading slugs per document", async () => {
    const code = await compile("# Same\n\n# Same\n");
    expect(code).toContain('id="same"');
    expect(code).toContain('id="same-1"');
  });

  it("populates TableOfContents with anchor links to headings", async () => {
    const code = await compile(
      "<table_of_contents/>\n\n# First\n\n## Second\n",
    );
    expect(code).toContain("TableOfContents");
    expect(code).toContain('href="#first"');
    expect(code).toContain('href="#second"');
    expect(code).toContain("data-toc-list");
  });
});

describe("satteri pipeline: page link resolution", () => {
  const linkToPages: LinkToPages = {
    abc123def456abc123def456abc12345: { url: "blog/my-page", title: "My Page" },
  };

  it("resolves notion.so anchor hrefs via linkToPages", async () => {
    const code = await compile(
      "[link](https://www.notion.so/My-Page-abc123def456abc123def456abc12345)\n",
      linkToPages,
    );
    expect(code).toContain('href="/blog/my-page"');
  });

  it("resolves url attributes on mention-page elements", async () => {
    const code = await compile(
      '<mention-page url="https://www.notion.so/My-Page-abc123def456abc123def456abc12345">p</mention-page>\n',
      linkToPages,
    );
    expect(code).toContain("MentionPage");
    expect(code).toContain('url="/blog/my-page"');
  });

  it("keeps external notion.so links unresolved", async () => {
    const code = await compile(
      "[link](https://www.notion.so/Other-ffff23def456abc123def456abc12345)\n",
      linkToPages,
    );
    expect(code).toContain(
      "https://www.notion.so/Other-ffff23def456abc123def456abc12345",
    );
  });
});

describe("satteri pipeline: gfm parity", () => {
  it("supports strikethrough and task lists", async () => {
    const code = await compile("~~gone~~\n\n- [x] done\n- [ ] todo\n");
    expect(code).toContain("del");
    expect(code).toContain('type="checkbox"');
  });
});
