---
slug: zh-cn/reference/notro-content
title: NotroContent
---

# NotroContent

`NotroContent` 是一个 Astro 组件，用于编译和渲染预处理后的 Notion markdown。它处理 MDX 编译、组件映射和可选的内部链接解析。

## 导入

```ts
import { NotroContent } from "notro-loader";
```

## 使用

```astro
---
import { NotroContent } from "notro-loader";
const { entry } = Astro.props;
---
<div class="notro-markdown">
  <NotroContent markdown={entry.data.markdown} />
</div>
```

## 属性

```ts
interface Props {
  markdown: string;
  linkToPages?: Record<string, { url: string; title: string }>;
  classMap?: Partial<Record<ClassMapKeys, string>>;
  components?: Partial<NotionComponents>;
}
```

### markdown（必填）

来自 Content Collection 条目的预处理 markdown 字符串。这是加载器在 `entry.data.markdown` 下存储的值。

```astro
<NotroContent markdown={entry.data.markdown} />
```

### linkToPages

从 Notion 页面 UUID 到 `{ url, title }` 的映射，用于解析内部 Notion 页面链接。当 Notion 页面包含到另一个 Notion 页面的链接时，`NotroContent` 将 `notion.so` URL 替换为相应的站点相对 URL。

```astro
---
import { getCollection } from "astro:content";
import { buildLinkToPages } from "notro-loader/utils";

const allPosts = await getCollection("posts");
const linkToPages = buildLinkToPages(allPosts);
---
<NotroContent
  markdown={entry.data.markdown}
  linkToPages={linkToPages}
/>
```

`buildLinkToPages` 通过遍历所有条目，将每个 `entry.id` 映射到 `{ url: "/blog/" + entry.data.slug, title: entry.data.title }` 来构建映射。

### classMap

组件插槽到额外 Tailwind 类字符串的部分映射。用于在不替换整个组件的情况下自定义样式。

```astro
<NotroContent
  markdown={entry.data.markdown}
  classMap={{
    callout: "rounded-xl border-2",
    toggle: "my-6",
    codeBlock: "text-sm font-mono",
    table: "w-full",
  }}
/>
```

可用键对应 notro-ui 组件插槽。运行 `notro-ui list --installed` 查看已安装的组件及其类映射键。

### components

Notion 块类型到自定义 Astro 组件的部分映射。与 notro 默认值合并 — 只有你提供的键会被覆盖。

```astro
---
import MyCallout from "./MyCallout.astro";
import MyToggle from "./MyToggle.astro";
---
<NotroContent
  markdown={entry.data.markdown}
  components={{
    callout: MyCallout,
    toggle: MyToggle,
  }}
/>
```

#### 组件映射键

| 键 | HTML 元素 | Notion 块 |
|---|---|---|
| `callout` | `<callout>` | 标注 |
| `toggle` | `<details>` | 折叠 |
| `columns` | `<columns>` | 分栏布局包装器 |
| `column` | `<column>` | 单个列 |
| `video` | `<video>` | 视频嵌入 |
| `table_of_contents` | `<table_of_contents>` | 目录 |
| `empty_block` | `<empty-block>` | 空块 |
| `pre` | `<pre>` | 代码块 |
| `img` | `<img>` | 图片 |
| `a` | `<a>` | 链接 |
| `h1`–`h4` | `<h1>`–`<h4>` | 标题 |
| `p` | `<p>` | 段落 |
| `blockquote` | `<blockquote>` | 引用 |
| `table` | `<table>` | 表格 |

## MDX 编译缓存

`NotroContent` 内部使用 `compileMdxCached()`，它以 markdown 字符串的哈希为键缓存编译后的 MDX 模块。单次构建中相同页面的重新渲染会重用缓存的模块，无需重新调用 MDX 编译器。

## CSS 包装器

`notro-markdown` CSS 类应用于包装 `NotroContent` 输出的元素（由模板中的父元素应用，而非 `NotroContent` 本身）。`notro-theme.css` 中的该类为以下内容设置作用域样式：

- `<pre>` / `<code>` 块
- 任务列表复选框
- 表格
- 引用

```astro
<!-- 在布局中应用包装器类 -->
<div class="notro-markdown">
  <NotroContent markdown={entry.data.markdown} />
</div>
```

## 类型参考

```ts
import type { NotionComponents, ClassMapKeys } from "notro-loader";

interface NotroContentProps {
  markdown: string;
  linkToPages?: Record<string, { url: string; title: string }>;
  classMap?: Partial<Record<ClassMapKeys, string>>;
  components?: Partial<NotionComponents>;
}
```
