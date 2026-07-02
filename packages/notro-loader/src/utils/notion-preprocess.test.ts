import { describe, it, expect } from "vitest";
import { preprocessNotionMarkdown } from "./notion-preprocess.ts";

// ============================================================
// Fix 0: Migration — convert \$...\$ back to $...$
// ============================================================
describe("Fix 0: escaped inline math migration", () => {
  it("converts \\$...\\$ to $...$", () => {
    const input = "Some text \\$E = mc^2\\$ more text";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("Some text $E = mc^2$ more text");
  });

  it("leaves already-correct $...$ unchanged", () => {
    const input = "Some text $E = mc^2$ more text";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("Some text $E = mc^2$ more text");
  });

  it("does not cross newlines", () => {
    // Backslash-dollars that span lines should not be merged.
    // Fix 13 expands the single \n between the two lines to \n\n (block boundary expansion),
    // so the output has a blank line between them.
    const input = "\\$foo\nbar\\$";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("\\$foo\n\nbar\\$");
  });
});

// ============================================================
// Fix 1: Ensure --- dividers have a blank line before them
// ============================================================
describe("Fix 1: setext heading prevention for ---", () => {
  it("inserts blank line before --- when preceded by text", () => {
    const input = "Some text\n---";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("Some text\n\n---");
  });

  it("leaves --- with existing blank line unchanged", () => {
    const input = "Some text\n\n---";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("Some text\n\n---");
  });

  it("inserts blank line before --- followed by more content", () => {
    // Fix 1 inserts \n\n before ---; Fix 13 also expands \n after --- to \n\n.
    const input = "paragraph\n---\nnext line";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("paragraph\n\n---\n\nnext line");
  });

  it("leaves --- at the start of string unchanged", () => {
    // Fix 13 expands the single \n after --- to \n\n (block boundary).
    const input = "---\ntext";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("---\n\ntext");
  });

  it("inserts blank line before --- when preceded by a spaces-only line that itself follows text", () => {
    // "text\n   \n---" — the whitespace-only line is not a reliable blank line in all parsers
    const input = "text\n   \n---";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("text\n\n---");
  });

  it("inserts blank line before --- when preceded by a tab-only line that itself follows text", () => {
    const input = "text\n\t\n---";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("text\n\n---");
  });

  it("inserts blank line before --- with spaces-only line when followed by more content", () => {
    // Fix 1 inserts \n\n before ---; Fix 13 also expands \n after --- to \n\n.
    const input = "paragraph\n   \n---\nnext line";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("paragraph\n\n---\n\nnext line");
  });
});

// ============================================================
// Fix 2: Normalize callout directive syntax
// ============================================================
describe("Fix 2: callout directive normalization", () => {
  it("removes space between ::: and callout", () => {
    const input = "::: callout\ncontent\n:::";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain(":::callout");
    expect(output).not.toContain("::: callout");
  });

  it("moves attributes next to :::callout (no space)", () => {
    const input = '::: callout {icon="💡" color="blue"}\ncontent\n:::';
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain(':::callout{icon="💡" color="blue"}');
  });

  it("dedents tab-indented content inside callout blocks", () => {
    const input = ":::callout\n\tcallout body\n:::";
    const output = preprocessNotionMarkdown(input);
    // Tab at start of "callout body" should be removed
    expect(output).toContain("\ncallout body\n");
    expect(output).not.toContain("\t");
  });

  it("handles callout with no attributes", () => {
    const input = "::: callout\ntext\n:::";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain(":::callout\n");
  });

  it("handles nested callout — inner ::: callout is normalized and dedented", () => {
    // Notion outputs nested callouts as tab-indented ::: callout blocks.
    // The inner "::: callout" should be normalized to ":::callout" and
    // its tab-indented body should be dedented after the outer dedent.
    const input =
      '::: callout {icon="💡"}\n\touter content\n\t::: callout {icon="🔥"}\n\t\tinner content\n\t:::\n:::';
    const output = preprocessNotionMarkdown(input);
    // Outer callout should be normalized
    expect(output).toContain(':::callout{icon="💡"}');
    // Inner callout should also be normalized (not left as "::: callout")
    expect(output).toContain(':::callout{icon="🔥"}');
    // Inner content should be fully dedented (no leading tabs)
    expect(output).not.toMatch(/^\t/m);
    // Structure: outer open, outer content, inner open, inner content, inner close, outer close
    expect(output).toBe(
      ':::callout{icon="💡"}\nouter content\n:::callout{icon="🔥"}\ninner content\n:::\n:::',
    );
  });

  it("handles triple-nested callouts — all levels normalized and dedented", () => {
    const input =
      "::: callout\n\touter\n\t::: callout\n\t\tmiddle\n\t\t::: callout\n\t\t\tinner\n\t\t:::\n\t:::\n:::";
    const output = preprocessNotionMarkdown(input);
    // All three levels should be normalized
    expect(output.split(":::callout").length - 1).toBe(3);
    // No leading tabs anywhere in the output
    expect(output).not.toMatch(/^\t/m);
    expect(output).toBe(
      ":::callout\nouter\n:::callout\nmiddle\n:::callout\ninner\n:::\n:::\n:::",
    );
  });

  it("does not close outer callout early when inner ::: appears", () => {
    // Without nesting-counter fix, the outer callout would close at the first ":::"
    // (the inner closing :::), leaving the outer closing ::: as a stray line.
    const input =
      ":::callout\n\touter text\n\t:::callout\n\t\tinner text\n\t:::\n\tmore outer\n:::";
    const output = preprocessNotionMarkdown(input);
    // "more outer" must be inside the outer callout (between :::callout and final :::)
    const lines = output.split("\n");
    const firstOpen = lines.indexOf(":::callout");
    const lastClose = lines.lastIndexOf(":::");
    const moreOuterIdx = lines.indexOf("more outer");
    expect(moreOuterIdx).toBeGreaterThan(firstOpen);
    expect(moreOuterIdx).toBeLessThan(lastClose);
  });
});

// ============================================================
// Fix 3: Block-level color annotations → raw HTML
// ============================================================
describe("Fix 3: block-level color annotations", () => {
  it("converts heading with color to raw HTML heading tag", () => {
    const input = '## My Heading {color="blue"}';
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe('<h2 color="blue">My Heading</h2>');
  });

  it("converts h1 with color to <h1>", () => {
    const input = '# Title {color="red"}';
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe('<h1 color="red">Title</h1>');
  });

  it("converts paragraph text with color to <p>", () => {
    const input = 'Some paragraph text {color="gray"}';
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe('<p color="gray">Some paragraph text</p>');
  });

  it("leaves headings without color unchanged", () => {
    const input = "## Normal Heading";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("## Normal Heading");
  });
});

// ============================================================
// Fix 4: <table_of_contents/> wrapping
// ============================================================
describe("Fix 4: table_of_contents wrapping", () => {
  it("wraps <table_of_contents/> in <div>", () => {
    const input = "<table_of_contents/>";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain("<div><table_of_contents/></div>");
  });

  it("wraps hyphenated form <table-of-contents/> too", () => {
    const input = "<table-of-contents/>";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain("<div><table_of_contents/></div>");
  });

  it("adds trailing newline after the wrapped tag", () => {
    const input = "<table_of_contents/>\nnext line";
    const output = preprocessNotionMarkdown(input);
    // Should have a blank line before "next line"
    expect(output).toMatch(/<div><table_of_contents\/><\/div>\n/);
  });
});

// ============================================================
// Fix 5: Inline equation format $`...`$ → $...$
// ============================================================
describe("Fix 5: inline equation normalization", () => {
  it("converts $`...`$ to $...$", () => {
    const input = "Equation $`E = mc^2`$ here";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("Equation $E = mc^2$ here");
  });

  it("leaves standard $...$ unchanged", () => {
    const input = "Equation $E = mc^2$ here";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("Equation $E = mc^2$ here");
  });

  it("handles multiple inline equations on one line", () => {
    const input = "$`a`$ and $`b`$";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("$a$ and $b$");
  });
});

// ============================================================
// Fix 6: <synced_block> stripping
// ============================================================
describe("Fix 6: synced_block stripping", () => {
  it("strips <synced_block> wrapper tags", () => {
    const input = "<synced_block>\n\tcontent line\n</synced_block>";
    const output = preprocessNotionMarkdown(input);
    expect(output).not.toContain("<synced_block>");
    expect(output).not.toContain("</synced_block>");
  });

  it("dedents tab-indented content inside synced_block", () => {
    const input = "<synced_block>\n\tsome content\n</synced_block>";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain("some content");
    // Should not have leading tab
    expect(output).not.toMatch(/^\tsome content/m);
  });

  it("removes <synced_block_reference> tags inside the block", () => {
    const input =
      "<synced_block>\n\t<synced_block_reference/>\n\tcontent\n</synced_block>";
    const output = preprocessNotionMarkdown(input);
    expect(output).not.toContain("synced_block_reference");
  });

  it("strips <synced_block_reference> wrapper tags (reference occurrence)", () => {
    const input =
      "<synced_block_reference>\n\tcontent line\n</synced_block_reference>";
    const output = preprocessNotionMarkdown(input);
    expect(output).not.toContain("<synced_block_reference>");
    expect(output).not.toContain("</synced_block_reference>");
    expect(output).toContain("content line");
  });

  it("dedents tab-indented content inside synced_block_reference", () => {
    const input =
      "<synced_block_reference>\n\tsome content\n</synced_block_reference>";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain("some content");
    expect(output).not.toMatch(/^\tsome content/m);
  });

  it("handles real-world API output: synced_block_reference with url attribute and inner closing tag", () => {
    // Mirrors actual Notion API output: outer <synced_block_reference url="...">,
    // tab-indented content, a tab-indented </synced_block_reference> artifact,
    // and the unindented outer closing tag.
    const input = [
      '<synced_block_reference url="https://www.notion.so/abc123">',
      "\tActual paragraph content here.",
      "\t</synced_block_reference>",
      "</synced_block_reference>",
    ].join("\n");
    const output = preprocessNotionMarkdown(input);
    expect(output).not.toContain("<synced_block_reference");
    expect(output).not.toContain("</synced_block_reference>");
    expect(output).toContain("Actual paragraph content here.");
  });
});

// ============================================================
// Fix 7: <empty-block/> isolation
// ============================================================
describe("Fix 7: empty-block isolation", () => {
  it("adds blank line before <empty-block/> when preceded by text on previous line", () => {
    const input = "some text\n<empty-block/>";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("some text\n\n<empty-block/>");
  });

  it("adds blank line after <empty-block/> when followed by text on next line", () => {
    const input = "<empty-block/>\nsome text";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("<empty-block/>\n\nsome text");
  });

  it("leaves <empty-block/> already surrounded by blank lines unchanged", () => {
    const input = "before\n\n<empty-block/>\n\nafter";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("before\n\n<empty-block/>\n\nafter");
  });
});

// ============================================================
// Fix 8: Trailing blank line after block-level HTML closing tags
// ============================================================
describe("Fix 8: trailing blank line after block-level closing tags", () => {
  it("inserts blank line after </table> when followed by text", () => {
    const input = "</table>\nnext paragraph";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("</table>\n\nnext paragraph");
  });

  it("inserts blank line after </details>", () => {
    const input = "</details>\n# Heading";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("</details>\n\n# Heading");
  });

  it("inserts blank line after </columns>", () => {
    const input = "</columns>\nsome text";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("</columns>\n\nsome text");
  });

  it("inserts blank line after </column>", () => {
    const input = "</column>\nsome text";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("</column>\n\nsome text");
  });

  it("inserts blank line after </summary>", () => {
    const input = "</summary>\nsome text";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("</summary>\n\nsome text");
  });

  it("leaves closing tag with existing blank line unchanged", () => {
    const input = "</table>\n\nnext paragraph";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("</table>\n\nnext paragraph");
  });
});

// ============================================================
// Fix 9: Markdown links inside <td> cells → <a> tags
// ============================================================
describe("Fix 9: markdown links inside td cells", () => {
  it("converts [text](url) inside <td> to <a href>", () => {
    const input = "<td>[Click here](https://example.com)</td>";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe(
      '<td><a href="https://example.com">Click here</a></td>',
    );
  });

  it("leaves plain text inside <td> unchanged", () => {
    const input = "<td>plain text</td>";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("<td>plain text</td>");
  });

  it("converts multiple links inside a single <td>", () => {
    const input = "<td>[first](https://a.com) and [second](https://b.com)</td>";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe(
      '<td><a href="https://a.com">first</a> and <a href="https://b.com">second</a></td>',
    );
  });

  it("leaves markdown links outside <td> unchanged", () => {
    const input = "[link text](https://example.com)";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("[link text](https://example.com)");
  });

  it("handles links inside <td> with surrounding content in a table row", () => {
    const input =
      "<tr>\n<td>[docs](https://docs.example.com)</td>\n<td>cell2</td>\n</tr>";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain('<a href="https://docs.example.com">docs</a>');
    expect(output).toContain("<td>cell2</td>");
  });
});

// ============================================================
// Fix 11: LaTeX command restoration
// ============================================================
describe("Fix 11: LaTeX backslash restoration", () => {
  it("restores missing backslash before frac in inline math", () => {
    const input = "$frac{a}{b}$";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("$\\frac{a}{b}$");
  });

  it("leaves already-correct \\frac unchanged", () => {
    const input = "$\\frac{a}{b}$";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("$\\frac{a}{b}$");
  });

  it("does NOT corrupt \\text{end} — 'end' inside \\text{} must not become \\end", () => {
    // \text{end} is valid LaTeX for typesetting the word "end" in math mode.
    // The LaTeX restoration pass must not turn it into \text{\end}.
    const input = "$\\text{end}$";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("$\\text{end}$");
  });

  it("does NOT corrupt \\text{begin} — 'begin' inside \\text{} must not become \\begin", () => {
    const input = "$\\text{begin}$";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("$\\text{begin}$");
  });

  it("does NOT corrupt \\text{text} — 'text' inside \\text{} must not become \\text{\\text}", () => {
    const input = "$\\text{text}$";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("$\\text{text}$");
  });

  it("does NOT corrupt \\text{sin x} — 'sin' inside \\text{} must not become \\sin", () => {
    const input = "$\\text{sin x}$";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("$\\text{sin x}$");
  });

  it("still restores bare 'end' (no preceding backslash) in \\begin{...}...\\end{} context", () => {
    // Notion strips the backslash: "begin{cases}...end{cases}" → should restore
    const input = "$begin{cases} a end{cases}$";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe("$\\begin{cases} a \\end{cases}$");
  });
});

// ============================================================
// Fix 2 (edge cases): callout closing tag robustness
// ============================================================
describe("Fix 2 edge cases: callout closing tag", () => {
  it("handles </callout> with trailing space", () => {
    // Notion API occasionally outputs trailing whitespace on closing tags.
    // The depth counter must still recognise it as the closing tag.
    const input = '<callout icon="💡">\n\tbody text\n</callout> ';
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain(":::callout");
    expect(output).toContain("body text");
    expect(output).not.toContain("</callout>");
  });

  it("handles </callout> with trailing tab", () => {
    const input = '<callout icon="💡">\n\tbody text\n</callout>\t';
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain(":::callout");
    expect(output).toContain("body text");
    expect(output).not.toContain("</callout>");
  });
});

// ============================================================
// Fix 8/10 interaction: <summary> closing tag + <details> dedent
// ============================================================
describe("Fix 8/10 interaction: details/summary structure", () => {
  it("does not insert spurious blank line between </summary> and first body line inside <details>", () => {
    // Fix 8 adds a blank line after </summary>, but inside <details> that extra
    // blank line should not break the CommonMark HTML block that contains the body.
    // Notion outputs <details> with <summary> header and tab-indented body lines.
    const input = [
      "<details>",
      "\t<summary>Toggle title</summary>",
      "\tbody content",
      "</details>",
    ].join("\n");
    const output = preprocessNotionMarkdown(input);
    // The body content must remain inside <details> (not leak outside)
    const detailsStart = output.indexOf("<details>");
    const detailsEnd = output.indexOf("</details>");
    const bodyPos = output.indexOf("body content");
    expect(bodyPos).toBeGreaterThan(detailsStart);
    expect(bodyPos).toBeLessThan(detailsEnd);
  });

  it("dedents body inside <details> after <summary>", () => {
    const input = [
      "<details>",
      "\t<summary>Title</summary>",
      "\tbody line 1",
      "\tbody line 2",
      "</details>",
    ].join("\n");
    const output = preprocessNotionMarkdown(input);
    // Body lines should not have leading tabs after dedent
    expect(output).toContain("body line 1");
    expect(output).toContain("body line 2");
    expect(output).not.toMatch(/^\tbody/m);
  });
});

// ============================================================
// Fix 10 edge case: <details> inside callout (double-dedent risk)
// ============================================================
describe("Fix 10 edge case: details inside callout", () => {
  it("dedents <details> body inside a callout exactly once", () => {
    // Notion outputs a <details> toggle nested inside a callout block.
    // Fix 2 (callout dedent) removes one leading tab from all body lines.
    // Fix 10 (details/column dedent) should then remove one more tab from
    // the <details> body lines — but NOT from the <details>/<summary> tags
    // themselves, which after Fix 2 have no leading tab.
    //
    // Raw Notion output structure:
    //   <callout>
    //     <details>
    //       <summary>Title</summary>
    //       \t\tbody text      ← two tabs: one for callout, one for details
    //     </details>
    //   </callout>
    const input = [
      "<callout>",
      "\t<details>",
      "\t<summary>Title</summary>",
      "\t\tbody text",
      "\t</details>",
      "</callout>",
    ].join("\n");
    const output = preprocessNotionMarkdown(input);
    console.log("callout+details output:", JSON.stringify(output));
    // body text should appear without any leading tabs
    expect(output).not.toMatch(/^\t+body text/m);
    expect(output).toContain("body text");
    // <details> structure must be present
    expect(output).toContain("<details>");
    expect(output).toContain("</details>");
  });
});

// ============================================================
// Fix 4 edge case: content after <div><table_of_contents/></div>
// ============================================================
describe("Fix 4 edge case: markdown after table_of_contents", () => {
  it("does not absorb following markdown into the div HTML block", () => {
    // CommonMark type 6 HTML blocks end at a blank line.
    // Fix 4 appends \n after </div>, producing a single newline.
    // Without a second newline (blank line), the following markdown line
    // would be consumed as raw HTML text inside the <div> block.
    const input = "<table_of_contents/>\n## Heading";
    const output = preprocessNotionMarkdown(input);
    console.log("toc+heading output:", JSON.stringify(output));
    // There must be a blank line between </div> and the heading
    expect(output).toMatch(/<\/div>\n\n/);
    expect(output).toContain("## Heading");
  });
});

// ============================================================
// Fix 13: Block boundary expansion (\n → \n\n)
// ============================================================
describe("Fix 13: block boundary expansion", () => {
  it("expands single \\n between non-blank lines to \\n\\n", () => {
    const input = "月曜日\n▫️\n火曜日";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain("月曜日\n\n▫️\n\n火曜日");
  });

  it("expands all consecutive block boundaries (A\\nB\\nC → A\\n\\nB\\n\\nC)", () => {
    const input = "月曜日\n▫️\n火曜日\n▫️\n水曜日";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain("月曜日\n\n▫️\n\n火曜日\n\n▫️\n\n水曜日");
  });

  it("leaves existing \\n\\n unchanged", () => {
    const input = "paragraph one\n\nparagraph two";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain("paragraph one\n\nparagraph two");
  });

  it("separates day/time entries from separator symbols (real-world vacancy data)", () => {
    const input =
      "月曜日<br>10:00～18:00スタートまでの間に空きがございます。\n▫️\n火曜日<br>9:00スタート";
    const output = preprocessNotionMarkdown(input);
    // ▫️ must be surrounded by blank lines (paragraph boundaries)
    expect(output).toContain("ございます。\n\n▫️\n\n火曜日");
    // <br> stays inline (intra-block Shift+Enter) — passed through to rehype-raw as-is
    expect(output).toContain("月曜日<br>10:00");
    expect(output).toContain("火曜日<br>9:00");
  });

  it("separates blocks that themselves contain <br> (multi-line blocks)", () => {
    const input =
      "当店のお客様は\n7割くらいの方が多いです。\n▫️\n**週1or週2**で通われる方が多いです。";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain(
      "当店のお客様は\n\n7割くらいの方が多いです。\n\n▫️\n\n",
    );
  });

  it("leaves <br> unchanged (rendering delegated to rehype-raw)", () => {
    const input = "月曜日<br>10:00";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain("月曜日<br>10:00");
  });

  it("does not expand \\n inside fenced code blocks", () => {
    const input = "```\nline one\nline two\n```\nfollowing paragraph";
    const output = preprocessNotionMarkdown(input);
    // Lines inside the fenced block must not be doubled
    expect(output).toContain("line one\nline two");
  });
});

// ============================================================
// Fix 15: Convert **bold** to <strong>bold</strong>
// ============================================================
describe("Fix 15: bold marker conversion to <strong>", () => {
  it("converts basic **bold** to <strong>bold</strong>", () => {
    const input = "固定の場合でも**振替**は可能となります。";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe(
      "固定の場合でも<strong>振替</strong>は可能となります。",
    );
  });

  it("converts **text** adjacent to CJK close punctuation", () => {
    const input = "7割くらいの方が**『曜日時間固定』**となり、";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe(
      "7割くらいの方が<strong>『曜日時間固定』</strong>となり、",
    );
  });

  it("converts multiple bold spans on the same line", () => {
    const input =
      "**週1or週2**で通われる方が多いです。固定の場合でも**振替**は可能です。";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe(
      "<strong>週1or週2</strong>で通われる方が多いです。固定の場合でも<strong>振替</strong>は可能です。",
    );
  });

  it("does not convert ** inside inline code", () => {
    const input = "テキスト `**bold**` テキスト **太字** です";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain("`**bold**`");
    expect(output).toContain("<strong>太字</strong>");
  });

  it("does not convert ** inside fenced code blocks", () => {
    const input = "```\n**not bold**\n```\n\n**this is bold**";
    const output = preprocessNotionMarkdown(input);
    expect(output).toContain("**not bold**");
    expect(output).toContain("<strong>this is bold</strong>");
  });

  it("does not convert ** that spans multiple lines", () => {
    // Fix 13 expands the single \n to \n\n (block boundary), so the lines become
    // separate paragraphs. The ** then spans a paragraph boundary and is not
    // matched by the single-line bold regex — both ** remain as-is.
    const input = "**line one\nline two**";
    const output = preprocessNotionMarkdown(input);
    // After Fix 13: \n → \n\n; bold regex does not cross \n so both ** stay literal.
    expect(output).toBe("**line one\n\nline two**");
  });

  it("trims trailing space from Notion API bold output (**text **)", () => {
    // Notion API sometimes produces **text ** (trailing space before closing **)
    const input = "固定の場合でも**振替 **は可能となります。";
    const output = preprocessNotionMarkdown(input);
    expect(output).toBe(
      "固定の場合でも<strong>振替</strong>は可能となります。",
    );
  });
});

// ============================================================
// Fix 3 (edge case): color-annotated <p> isolation
// ============================================================
describe("Fix 3 edge case: color-annotated p surrounded by blank lines", () => {
  it("inserts blank line before <p color> when preceded by text", () => {
    const input = 'some text\n※日曜日は定休日です。 {color="red"}\nmore text';
    const output = preprocessNotionMarkdown(input);
    // The color-annotated <p> must be preceded by a blank line
    expect(output).toMatch(/some text\n\n<p color="red">/);
  });

  it("inserts blank line after </p> when followed by text", () => {
    const input = 'some text\n※日曜日は定休日です。 {color="red"}\nmore text';
    const output = preprocessNotionMarkdown(input);
    // The color-annotated <p> must be followed by a blank line
    expect(output).toMatch(/<\/p>\n\nmore text/);
  });
});
