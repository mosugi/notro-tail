import { Client } from "@notionhq/client";
import { ProxyAgent, setGlobalDispatcher } from "undici";

const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
if (httpsProxy) {
  setGlobalDispatcher(new ProxyAgent(httpsProxy));
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PAGE_ID = "31c6b8b6-8958-819e-b082-fb58db169007";

async function checkMarkdown() {
  // Try retrieveMarkdown (new API)
  try {
    const md = await notion.pages.retrieveMarkdown({ page_id: PAGE_ID });
    console.log("=== MARKDOWN OUTPUT ===");
    console.log(JSON.stringify(md, null, 2).slice(0, 5000));
  } catch (e) {
    console.error("retrieveMarkdown failed:", e.message);
  }
}

checkMarkdown().catch(console.error);
