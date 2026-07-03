/**
 * Preprocesses Notion Enhanced Markdown before remark/MDX parsing.
 *
 * Fixes structural issues in Notion's markdown output that prevent correct
 * parsing by standard CommonMark/GFM parsers:
 *
 * 0. (Migration) Escaped inline math:
 *    Old versions of this function incorrectly escaped inline math as \$...\$.
 *    This fix converts \$...\$ back to $...$ so math parsers can parse it.
 *
 * 1. Setext heading prevention:
 *    A "---" line immediately after non-blank text is interpreted as a setext
 *    H2 heading. Notion uses "---" as dividers, so we insert a blank line before
 *    each one to force it to become a <hr> thematic break.
 *
 * 2. Callout directive syntax:
 *    Notion outputs raw <callout icon="..." color="...">...</callout> HTML blocks.
 *    This fix first converts them to :::callout{...} directive syntax (Fix 3 below),
 *    then normalizes any legacy "::: callout {icon="..." color="..."}" with spaces
 *    to ":::callout{...}" (no spaces).
 *
 * 3. Block-level color annotations:
 *    Lines ending with {color="..."} are converted to raw HTML elements so the
 *    heading components (H1–H4) can receive the color as a prop.
 *
 * 4. Table of contents:
 *    CommonMark HTML block detection requires tag names matching [A-Za-z][A-Za-z0-9-]*.
 *    The underscore form <table_of_contents/> (Notion API output) is not recognized as HTML
 *    by CommonMark, so it gets escaped as text. Wrap it in <div> so remark treats it
 *    as HTML and the component mapping can render TableOfContents.astro.
 *    The color attribute is preserved if present.
 *
 * 5. Inline equation format:
 *    Notion outputs inline math as $`E = mc^2`$ (backtick-delimited inside $...$).
 *    math parsers expect standard $E = mc^2$ (no backticks). We strip the backticks.
 *
 * 6. Underscore tags (synced_block):
 *    Same underscore issue as table_of_contents — <synced_block> wraps content
 *    with tab-indented markdown. Strip the wrapper tags and dedent the content
 *    so remark can parse it as normal markdown.
 *
 * 7. Empty block isolation:
 *    <empty-block/> inline within a paragraph becomes a block-level element after
 *    the component mapping runs, producing invalid HTML (<div> inside <p>). Adding
 *    blank lines around it ensures remark treats it as a standalone HTML block.
 *
 * 8. Trailing blank line after block-level HTML closing tags:
 *    CommonMark HTML blocks (type 6: block-level elements like <table>, <details>,
 *    <columns>) end only when followed by a blank line. Notion's markdown output
 *    sometimes omits this blank line, causing subsequent markdown (headings, lists,
 *    code fences, etc.) to be consumed as raw HTML text and rendered literally.
 *    We insert a blank line after closing tags when one is absent.
 *
 * 9. Markdown links inside raw HTML table cells:
 *    Notion exports table cell rich-text links as markdown link syntax
 *    [text](url) inside raw HTML <td> and <th> blocks. remark does not process
 *    inline markdown inside raw HTML, so these appear as literal text. We
 *    convert them to <a href="url">text</a> before the pipeline runs.
 *
 * 10. Tab-indented content inside <details> and <column> blocks:
 *    Notion API outputs content inside <details> and <column> elements with a
 *    leading tab per nesting level. CommonMark treats tab-indented lines as
 *    indented code blocks, so toggle/column body content is misrendered as
 *    <pre><code>. We remove one leading tab from each content line inside these
 *    blocks (tracking nesting depth with a stack).
 *
 * 11. Restore backslashes in LaTeX commands inside math delimiters:
 *    Notion API sometimes strips backslashes from LaTeX commands inside inline
 *    math ($...$) and block math ($$...$$), outputting e.g. "frac{...}{...}"
 *    instead of "\frac{...}{...}". We restore the leading backslash for a set
 *    of well-known LaTeX commands that appear without one.
 *
 * 12. Blockquote lazy continuation prevention:
 *    CommonMark's lazy continuation rule causes a non-blank line immediately
 *    following a blockquote line to be pulled into the blockquote. We insert a
 *    blank line between a blockquote line and any following non-blockquote,
 *    non-blank line.
 *
 * 13. Block boundary expansion:
 *    Notion's Markdown API outputs each block (paragraph, heading, list item, etc.)
 *    separated by a single \n. CommonMark treats a single \n between text lines as
 *    a soft break within one paragraph, collapsing all consecutive blocks into a
 *    single <p>. Expanding every single \n between non-blank lines to \n\n restores
 *    the block boundaries, producing separate <p> elements as Notion intended.
 *    Fenced code blocks (``` ... ```) and block-level HTML structures are excluded
 *    from this expansion to preserve their internal newlines.
 *
 *    Note: <br> in Notion's output represents an intra-block Shift+Enter line break,
 *    not a block boundary. It is left as-is; rehype-raw (via parse5) handles both
 *    <br> and <br/> identically as void elements.
 */

// Leading emoji sequence pattern (covers most emoji including keycap sequences).
// Used in Fix 2 to extract the icon from the first content line of an attribute-less
// <callout> block.
const LEADING_EMOJI_RE =
  /^(?:[\u0023\u002A\u0030-\u0039]\uFE0F\u20E3|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:[\u0023\u002A\u0030-\u0039]\uFE0F\u20E3|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/u;

// Block-level HTML closing tags that require a trailing blank line so that
// CommonMark HTML blocks (type 6) end correctly and following markdown is not
// consumed as raw HTML text.
const BLOCK_CLOSING_TAGS = [
  "table",
  "details",
  "columns",
  "column",
  "summary",
  "callout",
] as const;

// LaTeX command names that may appear without a leading backslash in Notion's
// math output. Sorted longest-first to prefer longer matches (e.g. "pmatrix"
// before "matrix") when building the alternation.
const LATEX_COMMANDS = [
  "underbrace",
  "overline",
  "pmatrix",
  "bmatrix",
  "mathbb",
  "mathbf",
  "mathrm",
  "epsilon",
  "partial",
  "approx",
  "matrix",
  "forall",
  "exists",
  "lambda",
  "nabla",
  "cases",
  "infty",
  "sigma",
  "theta",
  "equiv",
  "alpha",
  "delta",
  "right",
  "tilde",
  "begin",
  "gamma",
  "times",
  "cdot",
  "frac",
  "sqrt",
  "prod",
  "left",
  "beta",
  "text",
  "ddot",
  "leq",
  "geq",
  "neq",
  "hat",
  "bar",
  "vec",
  "dot",
  "end",
  "sum",
  "int",
  "lim",
  "sin",
  "cos",
  "tan",
  "log",
  "ln",
  "mu",
  "pi",
  "pm",
  "div",
];

// Build regex: not preceded by backslash or opening brace, the command as a word.
// The negative lookbehind `(?<![\\{])` has two purposes:
//   - `(?<!\\)` — skip commands that already have a backslash (e.g. \frac already present)
//   - `(?<!\{)` — skip commands that appear as arguments inside {…} (e.g. \text{end},
//     \begin{cases}). These are literal text or environment names, not stripped commands.
// The 'u' flag is not needed here since all chars are ASCII.
const LATEX_CMD_RE = new RegExp(
  `(?<![\\\\{])\\b(${[...new Set(LATEX_COMMANDS)].sort((a, b) => b.length - a.length).join("|")})\\b`,
  "g",
);

/**
 * Convert legacy :::callout{...} container-directive blocks (older Notion
 * exports, and content written before the API switched to XML tags) into the
 * current <callout ...>...</callout> XML form. Handles nesting: any other
 * :::name directive opening keeps the closing ::: pairing intact.
 */
function convertLegacyCalloutDirectives(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  // Stack of open directives at any indentation: 'callout' or 'other'.
  const stack: Array<"callout" | "other"> = [];
  let inCodeFence = false;

  for (const line of lines) {
    // Fenced code blocks are literal content — never rewrite inside them.
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      out.push(line);
      continue;
    }
    if (inCodeFence) {
      out.push(line);
      continue;
    }
    const open = line.match(/^(\t*)::: ?callout ?(\{[^}]*\})?[ \t]*$/);
    if (open) {
      const attrs = open[2] ? " " + open[2].slice(1, -1).trim() : "";
      out.push(`${open[1]}<callout${attrs}>`);
      stack.push("callout");
      continue;
    }
    const openOther = line.match(/^\t*:::\S/);
    if (openOther) {
      out.push(line);
      stack.push("other");
      continue;
    }
    const close = line.match(/^(\t*):::[ \t]*$/);
    if (close && stack.length > 0) {
      const kind = stack.pop();
      out.push(kind === "callout" ? `${close[1]}</callout>` : line);
      continue;
    }
    out.push(line);
  }

  return out.join("\n");
}

/**
 * Extract a leading emoji from the first content line of <callout> blocks
 * that have no icon= attribute, moving it into the attribute so the Callout
 * component renders it consistently.
 */
function extractCalloutIcons(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  let inCodeFence = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Fenced code blocks are literal content — never rewrite inside them.
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      out.push(line);
      i++;
      continue;
    }
    const openMatch = inCodeFence
      ? null
      : line.match(/^(\t*)<callout((?:\s[^>]*)?)>[ \t]*$/);
    if (!openMatch || /icon="/.test(openMatch[2])) {
      out.push(line);
      i++;
      continue;
    }
    // Look at the first content line (skipping blank lines) for a leading emoji.
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === "") j++;
    const content = lines[j] ?? "";
    const stripped = content.replace(/^\t*/, "");
    const indent = content.slice(0, content.length - stripped.length);
    const emojiMatch = stripped.match(LEADING_EMOJI_RE);
    if (j < lines.length && emojiMatch && !/^<\/callout>/.test(stripped)) {
      const icon = emojiMatch[0];
      out.push(`${openMatch[1]}<callout icon="${icon}"${openMatch[2]}>`);
      lines[j] = indent + stripped.slice(icon.length).trimStart();
    } else {
      out.push(line);
    }
    i++;
  }

  return out.join("\n");
}

export function preprocessNotionMarkdown(markdown: string): string {
  // Fix 0: Migration — convert \$...\$ (escaped dollars from old preprocessing bug)
  // back to $...$ so math parsers handle inline math correctly.
  // Pattern: backslash-dollar, non-newline/non-dollar content, backslash-dollar.
  // This is idempotent: $...$ (already correct) won't match since it has no backslash.
  let result = markdown.replace(
    /\\\$([^$\n]+)\\\$/g,
    (_, content: string) => `$${content}$`,
  );

  // Fix 1: Ensure --- dividers have a blank line before them.
  // A "---" line immediately after any non-blank content (including after a
  // whitespace-only line that itself follows text) is interpreted as a setext
  // H2 heading. We ensure a blank line precedes every "---" divider.
  //
  // Step 1a: Handle "text\n   \n---" — a whitespace-only line between text and ---
  // is not reliably treated as a blank line by all parsers, so explicitly insert
  // a blank line before the --- and remove the trailing whitespace from the line.
  result = result.replace(/([^\n])\n[ \t]+\n(---+)(\n|$)/g, "$1\n\n$2$3");
  // Step 1b: Handle "text\n---" — no intervening line at all.
  result = result.replace(/([^\n])\n(---+)(\n|$)/g, "$1\n\n$2$3");

  // Fix 2: Callout normalization.
  // The current Notion API outputs callouts as <callout icon="..." color="...">
  // XML blocks — the same shape as every other Notion block element (details,
  // columns, video, ...). Older exports used :::callout{...} container-directive
  // syntax; convert those to the XML form for backward compatibility, then
  // extract leading emoji icons into the icon attribute. Tab-indented children
  // are dedented by Fix 10 together with the other container elements.
  result = convertLegacyCalloutDirectives(result);
  result = extractCalloutIcons(result);

  // Fix 3: Convert block-level color annotations to raw HTML.
  // Headings may carry {color="..."} and/or {toggle="true"} attribute lists.
  // Toggle headings are rendered as plain headings (their children already
  // follow as regular blocks), so the toggle attribute is dropped.
  result = result.replace(
    /^(#{1,6}) (.+?) \{((?:color|toggle)="[^"]*"(?: (?:color|toggle)="[^"]*")*)\}$/gm,
    (_, hashes: string, text: string, attrs: string) => {
      const colorMatch = attrs.match(/color="([^"]+)"/);
      return colorMatch
        ? `<h${hashes.length} color="${colorMatch[1]}">${text}</h${hashes.length}>`
        : `${hashes} ${text}`;
    },
  );
  // Quote, list, and to-do blocks: keep the markdown marker (so the block
  // still parses as a blockquote / list) and wrap the inline text in a
  // colored <span> instead. Wrapping the whole line in <p color> would turn
  // the marker into literal text.
  result = result.replace(
    /^(>[ \t]?)(.+?) \{color="([^"]+)"\}$/gm,
    '$1<span color="$3">$2</span>',
  );
  result = result.replace(
    /^([ \t]*(?:[-*+]|\d+\.)[ \t](?:\[[ xX]\][ \t])?)(.+?) \{color="([^"]+)"\}$/gm,
    '$1<span color="$3">$2</span>',
  );
  // Image blocks: a color annotation cannot wrap the image markdown (raw HTML
  // context would prevent the image from being parsed), so drop it.
  result = result.replace(/^(!\[[^\]]*\]\([^)]*\)) \{color="[^"]+"\}$/gm, "$1");
  result = result.replace(
    /^([^<#\n][^\n]*?) \{color="([^"]+)"\}$/gm,
    '<p color="$2">$1</p>',
  );
  // Ensure color-annotated <p> blocks are surrounded by blank lines so remark
  // treats them as standalone HTML blocks (CommonMark type 6) rather than
  // inline content inside an adjacent paragraph.
  result = result.replace(/([^\n])\n(<p color="[^"]*">)/g, "$1\n\n$2");
  result = result.replace(/(<\/p>)\n([^\n])/g, "$1\n\n$2");

  // Fix 4: Wrap table-of-contents tags in <div> so remark treats them as HTML.
  // CommonMark HTML block detection requires tag names matching [A-Za-z][A-Za-z0-9-]*.
  // The underscore form <table_of_contents/> (Notion API output) is not recognized as HTML
  // by CommonMark. The hyphenated form <table-of-contents/> (seed/user input) is valid but
  // we normalize both to <table_of_contents/> inside a <div> for consistent plugin handling.
  // The color attribute (if present) is preserved in the inner tag.
  result = result.replace(
    /^<table[_-]of[_-]contents(\s[^/>\s][^/>]*)?\s*\/?>$/gm,
    (_, attrs: string | undefined) => {
      const innerAttrs = attrs ? attrs.trim() : "";
      return `<div><table_of_contents${innerAttrs ? ` ${innerAttrs}` : ""}/></div>\n`;
    },
  );

  // Fix 5: Convert Notion inline equation format $`...`$ → $...$ for math parsing.
  // Uses function-form replacement to avoid $ metacharacter confusion in the
  // replacement string.
  result = result.replace(
    /\$`([^`]+)`\$/g,
    (_, content: string) => `$${content}$`,
  );

  // Fix 6: Strip <synced_block> and <synced_block_reference> wrapper tags and dedent content.
  // These tags contain underscores, preventing CommonMark HTML block detection.
  // The content inside is tab-indented; strip the wrapper and dedent so it
  // renders as normal markdown.
  //
  // Both tag types contain the full inline content — Notion embeds the shared
  // content in every occurrence (original and all references). They are treated
  // identically: strip the outer wrapper and expose the content.
  //
  // Any tab-indented <synced_block_reference> closing tags that appear inside
  // the content (API artifact) are also stripped.
  const stripSyncedBlock = (_: string, content: string): string =>
    content
      .replace(/^\t<\/?synced_block_reference(?:\s[^>]*)?\/?>[ \t]*$/gm, "")
      .replace(/^\t/gm, "");

  result = result.replace(
    /^<synced_block(?:\s[^>]*)?>$([\s\S]*?)^<\/synced_block>$/gm,
    stripSyncedBlock,
  );
  result = result.replace(
    /^<synced_block_reference(?:\s[^>]*)?>$([\s\S]*?)^<\/synced_block_reference>$/gm,
    stripSyncedBlock,
  );

  // Fix 7: Ensure <empty-block/> is treated as a standalone block element.
  // Without blank lines around it, remark places it inline inside a <p>,
  // which the component mapping then renders as a block inside inline content.
  result = result.replace(/([^\n])\n(<empty-block\/>)/g, "$1\n\n$2");
  result = result.replace(/(<empty-block\/>)\n([^\n])/g, "$1\n\n$2");

  // Fix 8: Ensure block-level HTML closing tags have a trailing blank line.
  // CommonMark HTML blocks (type 6) end only at a blank line. Notion omits
  // this blank line after closing tags (see BLOCK_CLOSING_TAGS), causing any
  // following markdown to be consumed as raw HTML text and rendered as a
  // literal string instead of proper HTML elements.
  const blockClosingPattern = new RegExp(
    `(<\\/(${BLOCK_CLOSING_TAGS.join("|")})>)\\n([^\\n])`,
    "g",
  );
  result = result.replace(blockClosingPattern, "$1\n\n$3");

  // Fix 9: Convert markdown link syntax inside raw HTML table cells to <a> tags.
  // Notion exports table cell links as [text](url) inside <td>...</td> and
  // <th>...</th>, but remark does not process inline markdown inside raw HTML
  // blocks. Replace them with proper anchor elements so they render as links.
  // The URL pattern handles one level of nested parentheses, e.g.:
  //   https://en.wikipedia.org/wiki/Rust_(programming_language)
  //   https://developer.mozilla.org/docs/Array/find()
  const convertLinksInCell = (
    _: string,
    tag: string,
    content: string,
  ): string => {
    const linked = content.replace(
      /\[([^\]\n]+)\]\(([^()\n]*(?:\([^()\n]*\)[^()\n]*)*)\)/g,
      '<a href="$2">$1</a>',
    );
    return `<${tag}>${linked}</${tag}>`;
  };
  result = result.replace(/<(td|th)>([\s\S]*?)<\/\1>/g, convertLinksInCell);

  // Fix 10: Dedent tab-indented content inside <details>, <columns>, and <column> blocks.
  // Notion API outputs each content line inside <details> and <column> elements
  // with one leading tab per nesting level. CommonMark interprets tab-indented
  // lines as indented code blocks, so toggle/column body text is misrendered as
  // <pre><code>. We track nesting depth and remove one tab per depth level from
  // each line that falls inside these containers (cumulative dedent).
  // <summary>...</summary> lines have no leading tab and are passed through as-is.
  result = (function dedentHtmlBlocks(input: string): string {
    const lines = input.split("\n");
    const out: string[] = [];
    let depth = 0;

    for (const line of lines) {
      // Strip leading tabs to obtain the raw tag for matching.
      const stripped = line.trimStart();

      if (/^<\/(details|columns|column|callout)>/.test(stripped)) {
        // Closing tag: pop depth, then remove 'depth' tabs (after pop).
        if (depth > 0) depth--;
        out.push(
          depth > 0 ? line.replace(new RegExp(`^\t{1,${depth}}`), "") : line,
        );
      } else if (
        /^<(details|columns|column|callout)(?:\s[^>]*)?>$/.test(stripped)
      ) {
        // Opening tag: remove 'depth' tabs before the tag, then push depth.
        out.push(
          depth > 0 ? line.replace(new RegExp(`^\t{1,${depth}}`), "") : line,
        );
        depth++;
      } else if (depth > 0) {
        // Content line inside a container: remove up to 'depth' leading tabs.
        out.push(line.replace(new RegExp(`^\t{1,${depth}}`), ""));
      } else {
        out.push(line);
      }
    }

    return out.join("\n");
  })(result);

  // Fix 11: Restore missing backslashes before LaTeX command names in math content.
  // Notion's API sometimes strips the leading backslash from LaTeX commands
  // (e.g. outputs "frac{a}{b}" instead of "\frac{a}{b}").  We restore backslashes
  // for a fixed set of well-known commands when they appear without one inside
  // $...$ or $$...$$ delimiters.
  //
  // Inline math $...$ (single line): replace via simple regex.
  result = result.replace(
    /\$([^$\n]+)\$/g,
    (_, content: string) => `$${content.replace(LATEX_CMD_RE, "\\$1")}$`,
  );
  // Block math $$...$$ (potentially multi-line): replace via multiline regex.
  result = result.replace(
    /\$\$([\s\S]+?)\$\$/g,
    (_, content: string) => `$$${content.replace(LATEX_CMD_RE, "\\$1")}$$`,
  );

  // Fix 12: Prevent blockquote lazy continuation.
  // CommonMark's lazy continuation rule causes a non-blank, non-blockquote line
  // immediately following a blockquote line to be absorbed into the blockquote.
  // We insert an empty line between a "> ..." line and any following line that
  // does not start with ">" and is not itself blank.
  result = result.replace(/(^>[ \t][^\n]*)\n(?!>|\n)/gm, "$1\n\n");

  // Fix 13: Expand single \n block boundaries to \n\n (paragraph breaks).
  // Notion's Markdown API separates blocks (paragraphs, headings, list items, etc.)
  // with a single \n. CommonMark treats a lone \n between text lines as a soft break,
  // collapsing all blocks into one <p>. We expand every single \n between non-blank
  // lines to \n\n so remark creates separate block-level elements.
  //
  // Protected regions (fenced code blocks ```) are split out and passed
  // through unchanged since their internal newlines are significant.
  // All other segments have single \n between non-blank lines expanded to \n\n.
  //
  // Note: <br> tags are left as-is; rehype-raw handles them downstream.
  result = result
    .split(/((?:^|\n)```[\s\S]*?(?:```\s*(?:\n|$)|$))/g)
    .map((segment, i) => {
      if (i % 2 === 1) return segment; // protected block (fenced code / directive) — pass through
      // Expand single \n between non-blank lines to \n\n.
      // Use a loop to handle consecutive single-newline sequences (e.g. A\nB\nC → A\n\nB\n\nC).
      let s = segment;
      let prev: string;
      do {
        prev = s;
        s = s.replace(/([^\n])\n([^\n])/g, "$1\n\n$2");
      } while (s !== prev);
      return s;
    })
    .join("");

  // Fix 15: Convert **bold** to <strong>bold</strong> to work around CommonMark
  // delimiter run rules that break bold rendering when ** is adjacent to CJK
  // close punctuation (e.g. **『曜日時間固定』** fails because 』 is Unicode Pf).
  //
  // We split the text on code-span boundaries (backtick runs) to avoid
  // converting ** inside inline code. Each non-code segment is processed;
  // code-span segments are passed through unchanged.
  //
  // The regex matches ** ... ** on the same line (non-greedy, no newlines).
  // Nested bold is not common in Notion output so a single-pass replacement
  // (which would leave orphaned ** for the rare nested case) is acceptable.
  result = result
    .split(/((?:^|\n)```[\s\S]*?(?:```|$)|`[^`\n]+`)/g)
    .map((segment, i) => {
      // Odd-indexed segments are code spans / fenced blocks — pass through unchanged.
      if (i % 2 === 1) return segment;
      return segment.replace(
        /\*\*([^\n*]+?)\*\*/g,
        (_, content) => `<strong>${content.trimEnd()}</strong>`,
      );
    })
    .join("");

  return result;
}
