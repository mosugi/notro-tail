/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly NOTION_TOKEN: string;
  readonly NOTION_DATASOURCE_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
