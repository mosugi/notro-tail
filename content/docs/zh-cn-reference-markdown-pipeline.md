---
slug: zh-cn/reference/markdown-pipeline
title: Markdown 处理管道
---

# Markdown 处理管道

本页记录 markdown 处理管道的每个步骤 — 从原始 Notion API 输出到渲染后的 HTML。

## 概述

```
原始 Notion markdown（pages.retrieveMarkdown）
  ↓  preprocessNotionMarkdown()   修复结构性问题
  ↓  remarkNfm                    指令 + GFM + 标注转换
  ↓  （用户 remarkPlugins）
  ↓  rehypeRaw                    HTML 字符串 → hast 节点
  ↓  rehypeNotionColor            color="gray" → notro-* 类
  ↓  rehypeBlockElements          video → Video（PascalCase）
  ↓  rehypeInlineMentions         mention-user → MentionUser
  ↓  （用户 rehypePlugins）
  ↓  rehypeShiki                  语法高亮
  ↓  rehypeSlug                   为标题添加 id 属性
  ↓  rehypeToc                    填充 <TableOfContents>
  ↓  resolvePageLinks             notion.so → 站点相对 URL
  ↓  @mdx-js/mdx evaluate()
  ↓  <Content components={notionComponents} />
渲染后的 HTML
```

---

## preprocessNotionMarkdown

`preprocessNotionMarkdown()` 是一个字符串预处理器（不是 remark 插件），在 AST 解析之前修复 Notion 原始 markdown 输出中的结构性问题。由 `remarkNfm` 自动调用。

### Fix 0 — 转义内联数学迁移

旧版 notro 将内联数学转义为 `\$…\$` 以防止 remark 将其视为文本。此修复将其转换回 `$…$` 以保持兼容性。

### Fix 1 — setext 标题误识别

没有前置空行的 `---` 分隔线会被误读为 setext H2 下划线。Fix 1 在裸 `---` 分隔线之前插入空行。

**修复前:**
```md
Some text
---
Next section
```

**修复后:**
```md
Some text

---
Next section
```

### Fix 2 — 标注指令规范化

Notion 将标注块导出为 `"::: callout {…}"`。Fix 2 将间距规范化为 `":::callout{…}"` 以适配 `remark-directive` 解析器，并对标注块内的制表符缩进内容进行去缩进。

### Fix 3 — 块级颜色注释

段落和标题上的 Notion 颜色注释以 `{color="gray_bg"}` 形式导出在块末尾。Fix 3 将这些转换为原始 HTML `<p color="gray_bg">`，后来由 `rehypeNotionColor` 转换为 CSS 类。

### Fix 4 — 目录标签

`<table_of_contents/>`（带下划线）不被 CommonMark 解析器识别为块级 HTML 元素。Fix 4 将其用 `<div>` 包裹以确保被视为块级元素。

### Fix 5 — 内联公式格式

Notion 将内联公式导出为 `$\`…\`$`。Fix 5 将其转换为 `remark-math` 所需的 `$…$`。

### Fix 6 — 同步块包装器

删除 `<synced_block>` 包装器，将内部内容去缩进到文档级别。

### Fix 7 — 空块隔离

用空行包围 `<empty-block/>` 内联元素，使 remark 将其视为块级元素（MDX 组件路由所必需）。

### Fix 8 — 闭合标签空行

为 `</table>`、`</details>`、`</columns>`、`</column>`、`</summary>` 添加尾随空行。没有这个，CommonMark 的 HTML 块检测模式会将所有后续内容作为原始文本吞噬，阻止 remark 解析后续 markdown。

### Fix 9 — 表格单元格中的 Markdown 链接

原始 HTML `<td>` 单元格内的 `[text](url)` 语法不会被 remark 处理（它将整个 `<table>` 块视为原始 HTML）。Fix 9 在 AST 解析之前将这些转换为 `<a href="url">text</a>` 标签。

---

## remarkNfm

`remarkNfm` 是 `remark-nfm` 包中的核心 remark 插件，将三个操作捆绑在一个插件中：

1. **`preprocessNotionMarkdown`** — 在解析前运行上述字符串修复
2. **`remark-directive`** — 启用 `:::callout{…}` 指令语法
3. **`remark-gfm`** — GFM 删除线（`~~text~~`）和任务列表（`- [x]`）支持
4. **标注转换** — 将 `:::callout` 指令 AST 节点转换为原始 `<callout icon="…" color="…">` HTML 元素

### 标注语法

Notion 在 Fix 2 之后以这种指令格式导出标注块：

```md
:::callout{icon="💡" color="blue"}
这是标注内容。
:::
```

`remarkNfm` 将其转换为：

```html
<callout icon="💡" color="blue">
这是标注内容。
</callout>
```

---

## rehype 插件

### rehypeRaw

将 markdown AST 中嵌入的原始 HTML 字符串转换为适当的 hast 节点，允许后续 rehype 插件遍历和转换它们。自定义 Notion 元素（`<callout>`、`<columns>`、`<video>` 等）作为未知元素通过。

### rehypeNotionColor

将 Notion 颜色属性转换为 notro CSS 类：

| 输入属性 | 输出类 |
|---|---|
| `color="gray"` | `notro-text-gray` |
| `color="gray_background"` | `notro-bg-gray` |
| `underline="true"` | `notro-underline` |

应用于 `<p>`、`<h1>`–`<h6>` 和 `<span>` 元素。

### rehypeBlockElements

将小写的 Notion 块元素名称重命名为 PascalCase，以便 MDX 通过 `components` 映射路由：

| 从 | 到 |
|---|---|
| `<video>` | `<Video>` |
| `<columns>` | `<Columns>` |
| `<column>` | `<Column>` |
| `<table_of_contents>` | `<TableOfContents>` |
| `<callout>` | `<Callout>` |
| `<empty-block>` | `<EmptyBlock>` |

### rehypeInlineMentions

对内联 Notion mention 元素进行相同的重命名：

| 从 | 到 |
|---|---|
| `<mention-user>` | `<MentionUser>` |
| `<mention-page>` | `<MentionPage>` |
| `<mention-date>` | `<MentionDate>` |

### rehypeSlug

根据文本内容为 `<h1>`–`<h4>` 标题添加 `id` 属性，启用锚点链接。

### rehypeToc

收集所有带 `id` 属性的标题，并将锚点链接列表填充到 `<TableOfContents>` 元素中（如果页面上存在）。生成反映标题层次结构的嵌套结构。

### resolvePageLinks

将 `<a href>`、`<PageRef>`、`<DatabaseRef>` 和 mention 元素中的 `notion.so/PAGE_ID` URL 替换为来自传递给 `NotroContent` 的 `linkToPages` 映射的站点相对 URL。

---

## remark-nfm 包

`remark-nfm` 作为独立的 npm 包发布。它没有 Astro 或 Notion API 依赖，可以在任何 remark 管道中使用：

```ts
import { remarkNfm } from "remark-nfm";
import { remark } from "remark";

const result = await remark()
  .use(remarkNfm)
  .process(notionMarkdown);
```

`preprocessNotionMarkdown` 函数也被导出以供在 remark 之外使用：

```ts
import { preprocessNotionMarkdown } from "remark-nfm";

const fixed = preprocessNotionMarkdown(rawMarkdown);
```
