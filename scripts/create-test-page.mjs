/**
 * Script to create a Notion test page with all Enhanced Markdown block types.
 * Run with: node scripts/create-test-page.mjs
 *
 * Reference: https://developers.notion.com/guides/data-apis/working-with-markdown-content
 */

import { Client } from "@notionhq/client";
import { ProxyAgent, setGlobalDispatcher } from "undici";

// Configure proxy for requests (required in Claude Code on the Web environment)
const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
if (httpsProxy) {
  setGlobalDispatcher(new ProxyAgent(httpsProxy));
}

const DATABASE_ID = "31c6b8b6895881c096fde63fec21205b";
const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!NOTION_TOKEN) {
  console.error("NOTION_TOKEN environment variable is required");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

// Helper to create rich text
const rt = (text, annotations = {}) => ({
  type: "text",
  text: { content: text },
  annotations: {
    bold: false,
    italic: false,
    strikethrough: false,
    underline: false,
    code: false,
    color: "default",
    ...annotations,
  },
});

// Helper to create colored text
const rtColor = (text, color) => rt(text, { color });

const blocks = [
  // ---- Heading 1 ----
  {
    type: "heading_1",
    heading_1: {
      rich_text: [rt("Enhanced Markdown Block Types — Test Page")],
    },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [
        rt("This page lists all supported Notion block types for rendering tests. "),
        rt("Bold", { bold: true }),
        rt(", "),
        rt("italic", { italic: true }),
        rt(", "),
        rt("strikethrough", { strikethrough: true }),
        rt(", "),
        rt("underline", { underline: true }),
        rt(", "),
        rt("inline code", { code: true }),
        rt(", "),
        rtColor("red text", "red"),
        rt(", "),
        rtColor("blue text", "blue"),
        rt(" — inline annotations."),
      ],
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Headings ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Headings")] },
  },
  {
    type: "heading_1",
    heading_1: { rich_text: [rt("Heading 1")] },
  },
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Heading 2")] },
  },
  {
    type: "heading_3",
    heading_3: { rich_text: [rt("Heading 3")] },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Paragraph & Text Annotations ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Paragraph & Text Annotations")] },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [
        rt("Normal paragraph text. "),
        rt("Bold text. ", { bold: true }),
        rt("Italic text. ", { italic: true }),
        rt("Bold italic. ", { bold: true, italic: true }),
        rt("Strikethrough. ", { strikethrough: true }),
        rt("Underline. ", { underline: true }),
        rt("Code span. ", { code: true }),
      ],
    },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [
        rtColor("Gray, ", "gray"),
        rtColor("Brown, ", "brown"),
        rtColor("Orange, ", "orange"),
        rtColor("Yellow, ", "yellow"),
        rtColor("Green, ", "green"),
        rtColor("Blue, ", "blue"),
        rtColor("Purple, ", "purple"),
        rtColor("Pink, ", "pink"),
        rtColor("Red", "red"),
      ],
    },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [
        rtColor("Gray bg, ", "gray_background"),
        rtColor("Brown bg, ", "brown_background"),
        rtColor("Orange bg, ", "orange_background"),
        rtColor("Yellow bg, ", "yellow_background"),
        rtColor("Green bg, ", "green_background"),
        rtColor("Blue bg, ", "blue_background"),
        rtColor("Purple bg, ", "purple_background"),
        rtColor("Pink bg, ", "pink_background"),
        rtColor("Red bg", "red_background"),
      ],
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Quote ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Quote")] },
  },
  {
    type: "quote",
    quote: {
      rich_text: [rt("This is a blockquote. Notion renders this as a styled quote block.")],
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Lists ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Lists")] },
  },
  {
    type: "heading_3",
    heading_3: { rich_text: [rt("Bulleted List")] },
  },
  {
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: [rt("First bullet item")] },
  },
  {
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: [rt("Second bullet item")] },
  },
  {
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: [rt("Third bullet item with "), rt("bold", { bold: true })] },
  },
  {
    type: "heading_3",
    heading_3: { rich_text: [rt("Numbered List")] },
  },
  {
    type: "numbered_list_item",
    numbered_list_item: { rich_text: [rt("First numbered item")] },
  },
  {
    type: "numbered_list_item",
    numbered_list_item: { rich_text: [rt("Second numbered item")] },
  },
  {
    type: "numbered_list_item",
    numbered_list_item: { rich_text: [rt("Third numbered item")] },
  },
  {
    type: "heading_3",
    heading_3: { rich_text: [rt("To-do List")] },
  },
  {
    type: "to_do",
    to_do: {
      rich_text: [rt("Unchecked to-do item")],
      checked: false,
    },
  },
  {
    type: "to_do",
    to_do: {
      rich_text: [rt("Checked to-do item")],
      checked: true,
    },
  },
  {
    type: "to_do",
    to_do: {
      rich_text: [rt("Another unchecked item")],
      checked: false,
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Code Block ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Code Block")] },
  },
  {
    type: "code",
    code: {
      language: "typescript",
      rich_text: [
        rt(
          `// TypeScript code block example
interface User {
  id: number;
  name: string;
  email: string;
}

const greet = (user: User): string => {
  return \`Hello, \${user.name}!\`;
};`
        ),
      ],
    },
  },
  {
    type: "code",
    code: {
      language: "python",
      rich_text: [
        rt(
          `# Python code block example
def fibonacci(n: int) -> list[int]:
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

print(fibonacci(10))`
        ),
      ],
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Callout ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Callout")] },
  },
  {
    type: "callout",
    callout: {
      rich_text: [rt("This is a default callout block. Use callouts to highlight important information.")],
      icon: { type: "emoji", emoji: "💡" },
      color: "gray_background",
    },
  },
  {
    type: "callout",
    callout: {
      rich_text: [rt("Warning callout with a different color and icon.")],
      icon: { type: "emoji", emoji: "⚠️" },
      color: "yellow_background",
    },
  },
  {
    type: "callout",
    callout: {
      rich_text: [rt("Error/danger callout block.")],
      icon: { type: "emoji", emoji: "🚨" },
      color: "red_background",
    },
  },
  {
    type: "callout",
    callout: {
      rich_text: [rt("Info callout with blue background.")],
      icon: { type: "emoji", emoji: "ℹ️" },
      color: "blue_background",
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Toggle ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Toggle")] },
  },
  {
    type: "toggle",
    toggle: {
      rich_text: [rt("Click to expand this toggle block")],
      children: [
        {
          type: "paragraph",
          paragraph: {
            rich_text: [rt("This is the content inside the toggle. It can contain any block type.")],
          },
        },
        {
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: [rt("Nested bullet inside toggle")] },
        },
        {
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: [rt("Another nested bullet")] },
        },
      ],
    },
  },
  {
    type: "toggle",
    toggle: {
      rich_text: [rt("Nested toggle example")],
      children: [
        {
          type: "paragraph",
          paragraph: {
            rich_text: [rt("Outer toggle content")],
          },
        },
      ],
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Table ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Table")] },
  },
  {
    type: "table",
    table: {
      table_width: 3,
      has_column_header: true,
      has_row_header: false,
      children: [
        {
          type: "table_row",
          table_row: {
            cells: [
              [rt("Header 1")],
              [rt("Header 2")],
              [rt("Header 3")],
            ],
          },
        },
        {
          type: "table_row",
          table_row: {
            cells: [
              [rt("Row 1, Col 1")],
              [rt("Row 1, Col 2")],
              [rt("Row 1, Col 3")],
            ],
          },
        },
        {
          type: "table_row",
          table_row: {
            cells: [
              [rt("Row 2, Col 1")],
              [rt("Row 2, Col 2"), rt(" with ", { bold: true }), rt("bold")],
              [rt("Row 2, Col 3")],
            ],
          },
        },
        {
          type: "table_row",
          table_row: {
            cells: [
              [rt("Row 3, Col 1")],
              [rt("Row 3, Col 2")],
              [rt("Row 3, Col 3")],
            ],
          },
        },
      ],
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Equation ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Equation")] },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [
        rt("Inline equation: "),
        {
          type: "equation",
          equation: { expression: "E = mc^2" },
          annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" },
          plain_text: "E = mc^2",
          href: null,
        },
        rt(" — Einstein's mass-energy equivalence."),
      ],
    },
  },
  {
    type: "equation",
    equation: {
      expression: "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}",
    },
  },
  {
    type: "equation",
    equation: {
      expression: "\\frac{d}{dx}\\sin(x) = \\cos(x)",
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Table of Contents ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Table of Contents")] },
  },
  {
    type: "table_of_contents",
    table_of_contents: { color: "default" },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Image ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Image")] },
  },
  {
    type: "image",
    image: {
      type: "external",
      external: { url: "https://images.unsplash.com/photo-1633989464081-16ccd31287a1?w=800" },
      caption: [rt("Sample image caption — Unsplash photo")],
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Column Layout ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Column Layout")] },
  },
  {
    type: "column_list",
    column_list: {
      children: [
        {
          type: "column",
          column: {
            children: [
              {
                type: "heading_3",
                heading_3: { rich_text: [rt("Left Column")] },
              },
              {
                type: "paragraph",
                paragraph: {
                  rich_text: [rt("Content in the left column. Columns allow side-by-side layout.")],
                },
              },
              {
                type: "bulleted_list_item",
                bulleted_list_item: { rich_text: [rt("Left item 1")] },
              },
              {
                type: "bulleted_list_item",
                bulleted_list_item: { rich_text: [rt("Left item 2")] },
              },
            ],
          },
        },
        {
          type: "column",
          column: {
            children: [
              {
                type: "heading_3",
                heading_3: { rich_text: [rt("Right Column")] },
              },
              {
                type: "paragraph",
                paragraph: {
                  rich_text: [rt("Content in the right column. Great for comparisons.")],
                },
              },
              {
                type: "bulleted_list_item",
                bulleted_list_item: { rich_text: [rt("Right item 1")] },
              },
              {
                type: "bulleted_list_item",
                bulleted_list_item: { rich_text: [rt("Right item 2")] },
              },
            ],
          },
        },
      ],
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Colored Blocks ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Colored Blocks")] },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [rt("Paragraph with gray background color")],
      color: "gray_background",
    },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [rt("Paragraph with blue background color")],
      color: "blue_background",
    },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [rt("Paragraph with yellow background color")],
      color: "yellow_background",
    },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [rt("Paragraph with green background color")],
      color: "green_background",
    },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [rt("Paragraph with red background color")],
      color: "red_background",
    },
  },
  {
    type: "heading_3",
    heading_3: {
      rich_text: [rt("Colored Heading 3 — blue")],
      color: "blue",
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Synced Block ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Synced Block")] },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [rt("Synced blocks appear as <synced_block_reference> in the Enhanced Markdown output when referencing another block. The original synced block content is shown inline. See the cleanup plugin for how these are handled.")],
    },
  },

  // ---- Divider ----
  { type: "divider", divider: {} },

  // ---- Heading 2: Empty Block ----
  {
    type: "heading_2",
    heading_2: { rich_text: [rt("Empty Block")] },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [rt("The next block is an empty paragraph (empty block):")],
    },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [],
    },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [rt("Content resumes after the empty block.")],
    },
  },

  // ---- Final Divider ----
  { type: "divider", divider: {} },

  // ---- Footer ----
  {
    type: "paragraph",
    paragraph: {
      rich_text: [
        rt("End of test page. All block types listed above are sourced from the "),
        {
          type: "text",
          text: {
            content: "Notion Enhanced Markdown Format",
            link: { url: "https://developers.notion.com/guides/data-apis/working-with-markdown-content" },
          },
          annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" },
          plain_text: "Notion Enhanced Markdown Format",
          href: "https://developers.notion.com/guides/data-apis/working-with-markdown-content",
        },
        rt(" documentation."),
      ],
    },
  },
];

async function createTestPage() {
  console.log("Creating Notion test page...");

  // Create the page with basic properties
  const today = new Date().toISOString().split("T")[0];
  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Name: {
        title: [{ text: { content: "Enhanced Markdown Block Types — Test Page" } }],
      },
      Description: {
        rich_text: [{ text: { content: "A comprehensive test page covering all Notion Enhanced Markdown block types for rendering verification." } }],
      },
      Slug: {
        rich_text: [{ text: { content: "test-blocks" } }],
      },
      Tags: {
        multi_select: [{ name: "test" }, { name: "blocks" }],
      },
      Date: {
        date: { start: today },
      },
      Public: {
        checkbox: true,
      },
    },
    children: blocks.slice(0, 100), // Notion API limit: 100 blocks per request
  });

  console.log("Page created:", page.id);
  console.log("Page URL:", page.url);

  // Notion API limits children to 100 blocks per request; append the rest if needed
  const remaining = blocks.slice(100);
  if (remaining.length > 0) {
    console.log(`Appending ${remaining.length} additional blocks...`);
    // Split into batches of 100
    for (let i = 0; i < remaining.length; i += 100) {
      const batch = remaining.slice(i, i + 100);
      await notion.blocks.children.append({
        block_id: page.id,
        children: batch,
      });
      console.log(`  Appended batch ${Math.floor(i / 100) + 1}`);
    }
  }

  console.log("Done! Page ID:", page.id);
  return page;
}

createTestPage().catch(console.error);
