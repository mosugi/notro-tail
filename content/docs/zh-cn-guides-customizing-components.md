---
slug: zh-cn/guides/customizing-components
title: 自定义组件
---

# 自定义组件

notro 通过 Astro 组件渲染 Notion 块。本页介绍自定义块外观和行为的三种方式。

## notro-ui：复制即用的组件

Notion 块组件通过 `notro-ui` CLI 管理。组件位于 `packages/notro-ui/src/templates/` 作为真实来源，你将它们复制到项目中后就成为你自己的代码。

### 安装 CLI

```bash
npm i -g notro-ui
# 或使用 pnpm dlx：
pnpm dlx notro-ui --help
```

### 向项目添加组件

从项目根目录（放置 `notro.json` 的地方）运行：

```bash
# 初始化（创建 notro.json，放置 notro-theme.css）
notro-ui init

# 添加所有组件（跳过现有文件）
notro-ui add --all

# 添加特定组件
notro-ui add callout toggle columns
```

### 从上游更新组件

```bash
# 拉取更新（覆盖本地更改 — 谨慎使用）
notro-ui update --all --yes

# 预览更改（不带 --yes 显示确认提示）
notro-ui update --all
```

### 可用命令

| 命令 | 行为 |
|---|---|
| `notro-ui init` | 创建 `notro.json`，放置 `notro-theme.css` |
| `notro-ui add [name...] [--all]` | 添加组件（**跳过现有文件**） |
| `notro-ui update [name...] [--all] [--yes]` | 更新组件（**覆盖**） |
| `notro-ui remove [name...] [--all]` | 删除组件 |
| `notro-ui list [--installed]` | 列出可用/已安装的组件 |

### notro.json

`notro-ui init` 在项目根目录创建 `notro.json`：

```json
{
  "outDir": "src/components/notion",
  "stylesDir": "src/styles",
  "components": ["callout", "toggle", "columns", "code-block"]
}
```

提交 `notro.json` 以跟踪已安装的组件。

---

## 使用 classMap 覆盖 CSS 类

不替换组件而自定义样式最简单的方法是 `NotroContent` 上的 `classMap` 属性。传入 `ClassMapKeys → string` 的部分映射，向特定元素注入额外的 Tailwind 类：

```astro
---
import { NotroContent } from "notro-loader";
const { entry } = Astro.props;
---
<NotroContent
  markdown={entry.data.markdown}
  classMap={{
    callout: "rounded-xl border-2",
    toggle: "my-4",
    codeBlock: "text-sm",
  }}
/>
```

类映射键对应组件插槽。使用 `notro-ui list` 查看可用的键。

---

## 使用 components 完全覆盖组件

要完全控制，通过 `components` 属性传递自定义 Astro 组件：

```astro
---
import { NotroContent } from "notro-loader";
import MyCallout from "./MyCallout.astro";
import MyCodeBlock from "./MyCodeBlock.astro";
const { entry } = Astro.props;
---
<NotroContent
  markdown={entry.data.markdown}
  components={{
    callout: MyCallout,
    pre: MyCodeBlock,
  }}
/>
```

只有你提供的键会被覆盖 — 所有其他组件使用 notro 默认值。

### 编写自定义组件

组件属性反映 Notion 生成的 HTML 属性。例如，自定义标注接收 `icon`、`color` 和插槽内容：

```astro
---
// MyCallout.astro
interface Props {
  icon?: string;
  color?: string;
}
const { icon, color } = Astro.props;
---
<aside class:list={["my-callout", color && `my-callout--${color}`]}>
  {icon && <span class="my-callout__icon">{icon}</span>}
  <div class="my-callout__body">
    <slot />
  </div>
</aside>
```

### 组件映射参考

| 键 | 元素 | Notion 块 |
|---|---|---|
| `callout` | `<callout>` | 标注块 |
| `toggle` | `<details>` | 折叠块 |
| `columns` | `<columns>` | 分栏布局包装器 |
| `column` | `<column>` | 单个列 |
| `video` | `<video>` | 视频嵌入 |
| `table_of_contents` | `<table_of_contents>` | 目录 |
| `empty_block` | `<empty-block>` | 空间块 |
| `pre` | `<pre>` | 代码块 |
| `img` | `<img>` | 图片 |
| `a` | `<a>` | 链接 |
| `h1`–`h4` | `<h1>`–`<h4>` | 标题 |

---

## 使用 notro-theme.css 进行样式设置

`notro-theme.css` 定义了 Notion 块颜色、折叠样式、表格样式等的 CSS 变量和工具类。由 `notro-ui init` 放置在 `src/styles/` 中。

在全局样式表中导入：

```css
/* global.css */
@import "tailwindcss";
@import "./notro-theme.css";
```

### 颜色令牌

```css
/* 文本颜色 */
.notro-text-gray    .notro-text-brown   .notro-text-orange
.notro-text-yellow  .notro-text-green   .notro-text-blue
.notro-text-purple  .notro-text-pink    .notro-text-red

/* 背景颜色 */
.notro-bg-gray      .notro-bg-brown     .notro-bg-orange
.notro-bg-yellow    .notro-bg-green     .notro-bg-blue
.notro-bg-purple    .notro-bg-pink      .notro-bg-red
```

当 Notion 页面包含颜色注释的块时，`rehypeNotionColor` 插件会自动应用这些类。
