/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  // Notion API credentials (required)
  readonly NOTION_TOKEN: string;
  readonly NOTION_DATASOURCE_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
