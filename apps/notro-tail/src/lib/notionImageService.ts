import sharpImageService from "astro/assets/services/sharp";

export const notionImageServiceConfig = () => ({
  entrypoint: "./src/lib/notionImageService.ts",
  config: {},
});

const notionImageService = {
  ...sharpImageService,
  // Cache key excludes the URL (which changes every build due to S3 signing).
  // OptimizedDatabaseCover passes the stable Notion page ID as the `id` prop.
  propertiesToHash: [
    "id",
    "width",
    "height",
    "format",
    "quality",
    "fit",
    "position",
  ],
};

export default notionImageService;
