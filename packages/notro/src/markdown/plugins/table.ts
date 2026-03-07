import type { Plugin } from "unified";
import type { Root, Element } from "hast";
import { visit } from "unist-util-visit";

// Handles Notion's <table header-row="true" header-column="false"> format.
//
// Notion Enhanced Markdown represents tables with explicit header attributes:
//   <table header-row="true" header-column="false">
//   <tr><td>Header 1</td><td>Header 2</td></tr>
//   ...
//   </table>
//
// This plugin:
// 1. Converts the first <tr> cells to <th> when header-row="true"
// 2. Converts the first cell of each row to <th> when header-column="true"
// 3. Wraps header rows in <thead> and body rows in <tbody>
// 4. Removes the custom attributes from <table>
export const tablePlugin: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "table") return;

      const hasHeaderRow =
        node.properties?.["headerRow"] === "true" ||
        node.properties?.["header-row"] === "true";
      const hasHeaderColumn =
        node.properties?.["headerColumn"] === "true" ||
        node.properties?.["header-column"] === "true";

      // Remove Notion-specific table attributes
      if (node.properties) {
        delete node.properties["headerRow"];
        delete node.properties["headerColumn"];
        delete node.properties["header-row"];
        delete node.properties["header-column"];
      }

      // Find all <tr> elements (may be direct children or inside <tbody>)
      const rows: Element[] = [];
      const collectRows = (el: Element) => {
        for (const child of el.children) {
          if (child.type === "element") {
            if (child.tagName === "tr") {
              rows.push(child);
            } else if (
              child.tagName === "tbody" ||
              child.tagName === "thead"
            ) {
              collectRows(child);
            }
          }
        }
      };
      collectRows(node);

      if (rows.length === 0) return;

      // Process header row: convert <td> to <th> in the first row
      if (hasHeaderRow) {
        const headerRow = rows[0];
        for (const cell of headerRow.children) {
          if (cell.type === "element" && cell.tagName === "td") {
            cell.tagName = "th";
            cell.properties = { ...cell.properties, scope: "col" };
          }
        }
      }

      // Process header column: convert first <td> to <th> in each row
      if (hasHeaderColumn) {
        const startRow = hasHeaderRow ? 1 : 0;
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          const firstCell = row.children.find(
            (c) => c.type === "element" && (c as Element).tagName === "td"
          ) as Element | undefined;
          if (firstCell) {
            firstCell.tagName = "th";
            firstCell.properties = { ...firstCell.properties, scope: "row" };
          }
        }
      }

      // Rebuild table with <thead> and <tbody>
      const thead: Element = {
        type: "element",
        tagName: "thead",
        properties: {},
        children: hasHeaderRow ? [rows[0]] : [],
      };
      const tbody: Element = {
        type: "element",
        tagName: "tbody",
        properties: {},
        children: hasHeaderRow ? rows.slice(1) : rows,
      };

      node.children = hasHeaderRow ? [thead, tbody] : [tbody];
    });
  };
};
