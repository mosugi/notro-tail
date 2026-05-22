---
slug: zh-cn/deployment/netlify
title: 部署到 Netlify
---

# 部署到 Netlify

本指南介绍如何将 notro 站点部署到 [Netlify](https://www.netlify.com/)。

## 前提条件

- [Netlify 账户](https://app.netlify.com/signup)
- 已推送到 GitHub、GitLab 或 Bitbucket 的项目

## 1. 创建新站点

1. 登录 [app.netlify.com](https://app.netlify.com/) 并点击 **Add new site** → **Import an existing project**
2. 连接到你的 Git 提供商并选择你的仓库

## 2. 配置构建

设置以下构建设置：

| 设置 | 值 |
|---|---|
| **Base directory** | _（留空，或为 monorepo 设置包路径）_ |
| **Build command** | `pnpm build` |
| **Publish directory** | `dist` |

### netlify.toml（推荐）

在仓库根目录的 `netlify.toml` 中定义构建设置以保持版本控制：

```toml
[build]
  command = "pnpm build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "24"
  PNPM_VERSION = "10"
```

对于 Astro 项目在子目录中的 monorepo：

```toml
[build]
  base    = "templates/blog"
  command = "pnpm build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "24"
```

## 3. 设置环境变量

在 Netlify 控制台，前往 **Site configuration** → **Environment variables** → **Add a variable**：

| 键 | 值 |
|---|---|
| `NOTION_TOKEN` | 你的 Notion 集成密钥 |
| `NOTION_DATASOURCE_ID` | 你的 Notion 数据库 UUID |

> **提示:** 如果不想让预览构建从 Notion 获取内容，使用 **Scopes** 将变量限制为仅 Production 上下文。

## 4. 部署

点击 **Deploy site**。Netlify 克隆你的仓库、安装依赖、运行构建，并从其 CDN 提供 `dist/` 目录。

## 5. 自动部署和重建触发器

Netlify 在每次推送到生产分支时自动部署。对于 Notion 内容更改，使用 Build Hook：

1. 前往 **Site configuration** → **Build & deploy** → **Build hooks**
2. 点击 **Add build hook**，命名（例如 `Notion content`）并选择分支
3. 复制生成的 URL

触发钩子重建：

```bash
curl -X POST -d {} "https://api.netlify.com/build_hooks/YOUR_HOOK_ID"
```

### 使用 Netlify Functions 定时重建

创建定时 Netlify Function 按计划重建：

```ts
// netlify/functions/scheduled-rebuild.ts
import type { Config } from "@netlify/functions";

export default async function handler() {
  await fetch(process.env.BUILD_HOOK_URL!, { method: "POST" });
  return { statusCode: 200 };
}

export const config: Config = {
  schedule: "0 2 * * *",  // 每天 UTC 2:00
};
```

将 `BUILD_HOOK_URL` 添加为指向你自己构建钩子 URL 的环境变量。

## 自定义域名

1. 前往 **Domain management** → **Add a domain**
2. 输入你的自定义域名并按照 DNS 配置说明操作
3. Netlify 通过 Let's Encrypt 自动提供 TLS 证书

## Netlify Edge Functions（可选）

对于 SSR，安装 Netlify 适配器：

```bash
pnpm add @astrojs/netlify
```

```js
// astro.config.mjs
import netlify from "@astrojs/netlify";

export default defineConfig({
  output: "server",
  adapter: netlify(),
  // ...
});
```

## 故障排查

**`pnpm: command not found`**

在环境变量或 `netlify.toml` 中设置 `PNPM_VERSION`：

```toml
[build.environment]
  PNPM_VERSION = "10"
```

**构建成功但站点显示 404**

验证 **Publish directory** 设置为 `dist` 而不是项目根目录。

**环境变量在构建时不可用**

确保变量设置了 **Builds** 作用域。在变量设置中检查作用域包括 **Builds**（不只是 **Runtime**）。
