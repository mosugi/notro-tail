import sharpImageService from "astro/assets/services/sharp";

export const notionImageServiceConfig = () => ({
  entrypoint: "./src/lib/notionImageService.ts",
  config: {},
});

const notionImageService = {
  ...sharpImageService,
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
