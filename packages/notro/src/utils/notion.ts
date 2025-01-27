import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export const getPagePropertyText = (
  properties: PageObjectResponse["properties"],
  propertyName: string,
): string | undefined => {
  const property = properties?.[propertyName];

  if (
    property?.type === "rich_text" &&
    property.rich_text[0]?.plain_text !== undefined
  ) {
    return property.rich_text[0].plain_text;
  }
  if (
    property?.type === "title" &&
    property.title[0]?.plain_text !== undefined
  ) {
    return property.title[0].plain_text;
  }
  if (property?.type === "select" && property.select?.name !== undefined) {
    return property.select.name;
  }
  if (
    property?.type === "multi_select" &&
    property.multi_select !== undefined
  ) {
    return property.multi_select.map((option) => option.name).join();
  }
  return undefined;
};

const notionColors = {
  default: "notion-color-default",
  gray: "notion-color-gray",
  brown: "notion-color-brown",
  orange: "notion-color-orange",
  yellow: "notion-color-yellow",
  green: "notion-color-green",
  blue: "notion-color-blue",
  purple: "notion-color-purple",
  pink: "notion-color-pink",
  red: "notion-color-red",
  gray_background: "notion-color-gray_background",
  brown_background: "notion-color-brown_background",
  orange_background: "notion-color-orange_background",
  yellow_background: "notion-color-yellow_background",
  green_background: "notion-color-green_background",
  blue_background: "notion-color-blue_background",
  purple_background: "notion-color-purple_background",
  pink_background: "notion-color-pink_background",
  red_background: "notion-color-red_background",
} as const;

type NotionColor = keyof typeof notionColors;

export const getNotionColor = (color: NotionColor): string => {
  return notionColors[color];
};
