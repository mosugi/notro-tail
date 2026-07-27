---
slug: zh-cn/getting-started/quick-start
title: 快速开始
---

# 快速开始

本指南将带你在十分钟内从零开始运行一个 notro 站点。

## 前提条件

- **Node.js 24+** 和 **pnpm 9+**（或 npm/yarn）
- 拥有现有数据库的 [Notion 账户](https://www.notion.so/)，或有权限创建数据库

## 1. 创建项目

```bash
npm create notro@latest
```

CLI 将提示你：

1. **选择模板** — `blog`（功能完整）或 `blank`（极简）
2. **输入项目名称** — 用作目录名

```
◆  Which template would you like to use?
│  ● blog    Full-featured blog with pagination, tags, and RSS
│  ○ blank   Minimal starter
◆  Project name: my-notro-site
◆  Scaffolding to ./my-notro-site…
✔  Done! Next steps:
```

## 2. 安装依赖

```bash
cd my-notro-site
pnpm install
```

## 3. 配置环境变量

复制示例 env 文件并填入你的 Notion 凭据：

```bash
cp .env.example .env
```

打开 `.env` 并设置：

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATASOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

有关如何获取这些值，请参阅 [Notion 设置](/zh-cn/getting-started/notion-setup)。

## 4. 启动开发服务器

```bash
pnpm dev
```

Astro 开发服务器在 **http://localhost:4321** 启动。首次运行时，notro 会从你的 Notion 数据库获取所有页面并缓存它们。

> **提示:** 首次运行可能需要几秒钟，具体取决于数据库中的页面数量。后续启动很快，因为页面按 `last_edited_time` 缓存。

## 5. 在 Notion 中编辑内容

在开发服务器运行时，编辑 Notion 数据库中的页面。重启开发服务器（或保存任何文件触发刷新）即可看到变更反映。

## 6. 构建生产版本

```bash
pnpm build
```

Astro 运行 `astro check`（类型检查），然后运行 `astro build`，在 `dist/` 中生成完全静态的站点。

```bash
pnpm preview   # 在本地预览生产构建
```

## 7. 部署

将项目推送到 GitHub 并连接到你首选的托管平台。有关步骤说明，请参阅部署指南：

- [Cloudflare Pages](/zh-cn/deployment/cloudflare-pages)
- [Vercel](/zh-cn/deployment/vercel)
- [Netlify](/zh-cn/deployment/netlify)

## 项目结构

脚手架后，你的项目结构如下（blog 模板）：

```
my-notro-site/
├── src/
│   ├── components/      # Header、Footer、BlogList
│   ├── layouts/         # Layout.astro
│   ├── lib/             # blog.ts、nav.ts、seo.ts
│   ├── pages/           # 基于文件的路由
│   │   ├── index.astro
│   │   └── blog/
│   │       ├── [...page].astro
│   │       └── [slug].astro
│   ├── styles/
│   │   ├── global.css       # TailwindCSS 4 + 布局工具类
│   │   └── notro-theme.css  # Notion 块颜色令牌
│   └── content.config.ts    # Astro Content Collections
├── astro.config.mjs
├── package.json
└── .env
```

## 下一步

- [Notion 设置](/zh-cn/getting-started/notion-setup) — 配置 Notion 集成和数据库模式
- [配置](/zh-cn/guides/configuration) — 自定义 notro 管道、插件和图像服务
- [自定义组件](/zh-cn/guides/customizing-components) — 覆盖或扩展 Notion 块组件
