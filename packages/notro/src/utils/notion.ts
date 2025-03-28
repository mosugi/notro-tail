import type { PropertyPageObjectResponseType } from "../loader/schema.ts";

export const getPlainText = (
  property: PropertyPageObjectResponseType,
): string | undefined => {
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
  default: "nt-color-default",
  gray: "nt-color-gray",
  brown: "nt-color-brown",
  orange: "nt-color-orange",
  yellow: "nt-color-yellow",
  green: "nt-color-green",
  blue: "nt-color-blue",
  purple: "nt-color-purple",
  pink: "nt-color-pink",
  red: "nt-color-red",
  default_background: "nt-color-default_background",
  gray_background: "nt-color-gray_background",
  brown_background: "nt-color-brown_background",
  orange_background: "nt-color-orange_background",
  yellow_background: "nt-color-yellow_background",
  green_background: "nt-color-green_background",
  blue_background: "nt-color-blue_background",
  purple_background: "nt-color-purple_background",
  pink_background: "nt-color-pink_background",
  red_background: "nt-color-red_background",
} as const;

type NotionColor = keyof typeof notionColors;

export const getNotionColor = (color: NotionColor): string => {
  return notionColors[color];
};
