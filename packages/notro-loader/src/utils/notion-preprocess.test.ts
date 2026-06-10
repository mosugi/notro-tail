import { describe, it, expect } from "vitest";
import { preprocessNotionMarkdown, applyMdxContext } from "./notion-preprocess.ts";

// ============================================================
// Block boundary expansion (Fix 13)
// ============================================================
describe("preprocessNotionMarkdown: block boundary expansion", () => {
	it("expands single \\n to \\n\\n between text blocks", () => {
		const result = preprocessNotionMarkdown("block one\nblock two");
		expect(result).toContain("block one\n\nblock two");
	});

	it("preserves code block content during expansion", () => {
		const result = preprocessNotionMarkdown("intro\n```\nline one\nline two\n```\noutro");
		expect(result).toContain("line one\nline two");
		expect(result).toContain("intro");
		expect(result).toContain("outro");
	});
});

// ============================================================
// Callout conversion (Fix 2)
// ============================================================
describe("preprocessNotionMarkdown: callout conversion", () => {
	it("converts raw <callout> HTML to MDX JSX with blank lines", () => {
		const input = '<callout icon="💡" color="gray_bg">\n\tcallout text\n</callout>';
		const result = preprocessNotionMarkdown(input);
		expect(result).toContain('<callout icon="💡" color="gray_bg">');
		expect(result).toContain("callout text");
		expect(result).toContain("</callout>");
	});

	it("extracts leading emoji as icon from <callout> without icon attribute", () => {
		const input = "<callout>\n\t💡 icon extracted from content\n</callout>";
		const result = preprocessNotionMarkdown(input);
		expect(result).toContain('icon="💡"');
		expect(result).toContain("icon extracted from content");
	});

	it("adds blank lines around callout content for block-level MDX parsing", () => {
		const input = '<callout icon="📌">\n\tbody text\n</callout>';
		const result = preprocessNotionMarkdown(input);
		// Body must be surrounded by blank lines so MDX treats it as block markdown
		expect(result).toMatch(/<callout[^>]*>\n\n/);
		expect(result).toMatch(/\n\n<\/callout>/);
	});
});

// ============================================================
// Color → className (Fix 3 and Fix 16)
// ============================================================
describe("preprocessNotionMarkdown: color→className conversion", () => {
	it("converts heading with color annotation to className", () => {
		const result = preprocessNotionMarkdown('## My Section {color="blue"}');
		expect(result).toContain("className=");
		expect(result).toContain("notro-blue");
	});

	it("converts paragraph with color annotation to className", () => {
		const result = preprocessNotionMarkdown('some text {color="gray_bg"}');
		expect(result).toContain("className=");
		expect(result).toContain("notro-gray-bg");
	});

	it("converts <span color=\"...\"> to className", () => {
		const result = preprocessNotionMarkdown('<span color="red">colored</span>');
		expect(result).toContain('className=');
		expect(result).toContain("notro-red");
		expect(result).not.toContain('color="red"');
	});

	it("converts <span underline=\"true\"> to className", () => {
		const result = preprocessNotionMarkdown('<span underline="true">underlined</span>');
		expect(result).toContain('className="underline"');
		expect(result).not.toContain('underline="true"');
	});
});

// ============================================================
// <table_of_contents> → <TableOfContents/> (Fix 4)
// ============================================================
describe("preprocessNotionMarkdown: table_of_contents rename", () => {
	it("converts <table_of_contents/> to <TableOfContents/>", () => {
		const result = preprocessNotionMarkdown("<table_of_contents/>");
		expect(result).toContain("<TableOfContents/>");
		expect(result).not.toContain("table_of_contents");
	});

	it("adds blank lines around <TableOfContents/> for block-level MDX parsing", () => {
		// Without blank lines before/after, MDX parses <TableOfContents> as inline
		// within a paragraph and errors with "Expected a closing tag before end of paragraph".
		const input = "Some text\n<table_of_contents/>\nMore text";
		const result = preprocessNotionMarkdown(input);
		// Must have blank line BEFORE the tag
		expect(result).toMatch(/\n\n<TableOfContents/);
		// Must have blank line AFTER the tag
		expect(result).toMatch(/<TableOfContents[^>]*\/>\n\n/);
	});
});

// ============================================================
// Element renaming (Fix 14)
// ============================================================
describe("preprocessNotionMarkdown: element renaming", () => {
	it("renames <video> → <Video>", () => {
		const result = preprocessNotionMarkdown('<video src="url"/>');
		expect(result).toContain("<Video");
		expect(result).not.toContain("<video");
	});

	it("renames <mention-user> → <MentionUser>", () => {
		const result = preprocessNotionMarkdown('<mention-user url="x">name</mention-user>');
		expect(result).toContain("<MentionUser");
		expect(result).toContain("</MentionUser>");
		expect(result).not.toContain("<mention-user");
	});

	it("renames table elements: <table> → <TableBlock>, <tr> → <TableRow>", () => {
		const input = "<table>\n<tr><td>cell</td></tr>\n</table>";
		const result = preprocessNotionMarkdown(input);
		expect(result).toContain("<TableBlock");
		expect(result).toContain("<TableRow");
		expect(result).toContain("<TableCell");
	});

	it("does not rename partial element name matches", () => {
		// 'col' must not match the start of 'colgroup' or 'columns'
		const input = "<colgroup><col/></colgroup>";
		const result = preprocessNotionMarkdown(input);
		expect(result).toContain("<TableColgroup");
		expect(result).toContain("<TableCol");
	});

	it("does not rename elements inside inline code spans", () => {
		// Elements inside backtick spans must stay as-is so MDX treats them as literal text.
		// Renaming e.g. <table_of_contents/> inside a code span would cause populateToc()
		// to expand it into the full TOC block, breaking the surrounding structure.
		const input = 'The `<table_of_contents/>` tag is used for TOC.';
		const result = preprocessNotionMarkdown(input);
		expect(result).toContain("`<table_of_contents/>`");
		expect(result).not.toContain("`<TableOfContents");
	});

	it("does not rename elements inside fenced code blocks", () => {
		const input = "```\n<video src=\"url\"/>\n<table>\n```";
		const result = preprocessNotionMarkdown(input);
		// Inside code block, names should be unchanged
		expect(result).toContain("<video");
		expect(result).toContain("<table>");
	});
});

// ============================================================
// CJK bold (Fix 15)
// ============================================================
describe("preprocessNotionMarkdown: CJK bold", () => {
	it("converts **bold** adjacent to CJK text to <strong>", () => {
		const result = preprocessNotionMarkdown("固定の場合でも**振替**は可能となります。");
		expect(result).toContain("<strong>振替</strong>");
	});
});

// ============================================================
// GFM Strikethrough (Fix 17)
// ============================================================
describe("preprocessNotionMarkdown: GFM strikethrough", () => {
	it("converts ~~text~~ to <del>text</del>", () => {
		const result = preprocessNotionMarkdown("~~strikethrough~~");
		expect(result).toContain("<del>strikethrough</del>");
	});

	it("does not convert ~~ inside code blocks", () => {
		const result = preprocessNotionMarkdown("```\n~~not strikethrough~~\n```");
		expect(result).toContain("~~not strikethrough~~");
		expect(result).not.toContain("<del>");
	});
});

// ============================================================
// GFM Task List (Fix 18)
// ============================================================
describe("preprocessNotionMarkdown: GFM task list", () => {
	it("converts - [x] to inline checkbox (checked)", () => {
		const result = preprocessNotionMarkdown("- [x] done task");
		expect(result).toContain('type="checkbox"');
		expect(result).toContain("checked");
		expect(result).toContain("done task");
	});

	it("converts - [ ] to inline checkbox (unchecked)", () => {
		const result = preprocessNotionMarkdown("- [ ] todo task");
		expect(result).toContain('type="checkbox"');
		expect(result).not.toMatch(/checked(?!=)/);
		expect(result).toContain("todo task");
	});
});

// ============================================================
// Void HTML element self-closing (Fix 19)
// ============================================================
describe("preprocessNotionMarkdown: void HTML self-closing", () => {
	it("converts <br> to <br/>", () => {
		const result = preprocessNotionMarkdown("line1<br>line2");
		expect(result).toContain("<br/>");
		expect(result).not.toMatch(/<br(?!\/)[^>]*>/);
	});

	it("converts <BR> (uppercase) to <br/>", () => {
		const result = preprocessNotionMarkdown("line1<BR>line2");
		expect(result).toContain("<br/>");
		expect(result).not.toContain("<BR>");
	});

	it("does not double-close already self-closing <br/>", () => {
		const result = preprocessNotionMarkdown("line1<br/>line2");
		expect(result).not.toContain("<br//>"); // no double slash
		expect(result).toContain("<br/>");
	});
});

// ============================================================
// applyMdxContext: heading IDs
// ============================================================
describe("applyMdxContext: heading IDs", () => {
	it("injects <a id='slug'></a> anchor before headings", () => {
		const result = applyMdxContext("## My Section");
		expect(result).toContain('<a id="my-section"></a>');
		expect(result).toContain("## My Section");
	});

	it("deduplicates heading IDs with numeric suffix", () => {
		const result = applyMdxContext("## Intro\n\n## Intro");
		expect(result).toContain('<a id="intro"></a>');
		expect(result).toContain('<a id="intro-2"></a>');
	});
});

// ============================================================
// applyMdxContext: TOC population
// ============================================================
describe("applyMdxContext: TOC population", () => {
	it("replaces <TableOfContents/> with populated list when headings are present", () => {
		const input = "<TableOfContents/>\n\n## Section One\n\n## Section Two";
		const result = applyMdxContext(input);
		expect(result).toContain('<TableOfContents>');
		expect(result).toContain('data-toc-list');
		expect(result).toContain('href="#section-one"');
		expect(result).toContain('href="#section-two"');
	});

	it("leaves <TableOfContents/> unchanged when there are no headings", () => {
		const result = applyMdxContext("No headings here.\n\n<TableOfContents/>");
		expect(result).toContain("<TableOfContents/>");
	});

	it("surrounds expanded <TableOfContents> block with blank lines", () => {
		// Ensures MDX parses the multi-line block as block-level JSX (not inline).
		const input = "<TableOfContents/>\n\n## Section One";
		const result = applyMdxContext(input);
		// expanded block must be preceded by blank line
		expect(result).toMatch(/\n\n<TableOfContents>/);
		// expanded block must be followed by blank line
		expect(result).toMatch(/<\/TableOfContents>\n\n/);
	});

	it("does not expand <TableOfContents/> inside inline code spans", () => {
		// If the tag is inside a backtick span (e.g. in a code example in a table cell),
		// populateToc() must leave it unexpanded to avoid breaking the surrounding structure.
		const input = "The `<TableOfContents/>` tag. \n\n## Section One";
		const result = applyMdxContext(input);
		// The code span must remain intact
		expect(result).toContain("`<TableOfContents/>`");
		// The TOC should NOT have been expanded inside the code span
		expect(result).not.toMatch(/`\s*\n\n<TableOfContents>/);
	});
});

// ============================================================
// applyMdxContext: page link resolution
// ============================================================
describe("applyMdxContext: page link resolution", () => {
	it("resolves notion.so href to internal URL", () => {
		const linkToPages = { "abc123": { url: "my-page", title: "My Page" } };
		const input = '<a href="https://www.notion.so/My-Page-abc123">link</a>';
		const result = applyMdxContext(input, { linkToPages });
		expect(result).toContain('href="/my-page"');
		expect(result).not.toContain("notion.so");
	});

	it("leaves external links unchanged", () => {
		const input = '<a href="https://example.com">external</a>';
		const result = applyMdxContext(input, { linkToPages: {} });
		expect(result).toContain('href="https://example.com"');
	});
});
