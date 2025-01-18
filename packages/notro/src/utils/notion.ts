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
  return undefined;
};
