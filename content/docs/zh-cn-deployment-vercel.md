---
slug: zh-cn/deployment/vercel
title: 部署到 Vercel
---

# 部署到 Vercel

本指南介绍如何将 notro 站点部署到 [Vercel](https://vercel.com/)。

## 前提条件

- [Vercel 账户](https://vercel.com/signup)
- 已推送到 GitHub、GitLab 或 Bitbucket 的项目

## 1. 导入项目

1. 登录 [vercel.com](https://vercel.com/) 并点击 **Add New Project**
2. 点击 **Import Git Repository** 并选择你的仓库
3. Vercel 自动检测 Astro 项目并预填大多数设置

## 2. 配置构建

验证构建配置中的设置：

| 设置 | 值 |
|---|---|
| **Framework Preset** | Astro |
| **Build Command** | `pnpm build` |
| **Output Directory** | `dist` |
| **Install Command** | `pnpm install` |
| **Node.js Version** | `24.x`（在 **Settings → General** 中设置） |

对于 Astro 站点位于子目录的 monorepo，将 **Root Directory** 设置为包路径（例如 `templates/blog`）。

## 3. 设置环境变量

点击 **Environment Variables** 并添加：

| 变量 | 环境 | 值 |
|---|---|---|
| `NOTION_TOKEN` | Production、Preview | 你的 Notion 集成密钥 |
| `NOTION_DATASOURCE_ID` | Production、Preview | 你的 Notion 数据库 UUID |

## 4. 部署

点击 **Deploy**。Vercel 运行 `pnpm install` 和 `pnpm build`，然后将 `dist/` 目录全球部署。

## 5. 自动部署和重建触发器

Vercel 在每次推送到生产分支时自动部署。对于仅内容的 Notion 更改，设置 Deploy Hook：

1. 前往 **Settings** → **Git** → **Deploy Hooks**
2. 点击 **Create Hook**，命名并选择分支
3. 复制 URL

在 cron 任务、GitHub Actions 或 Notion 自动化中使用此 URL，在内容变更时触发重建：

```bash
curl -X POST "https://api.vercel.com/v1/integrations/deploy/HOOK_ID"
```

### GitHub Actions 定时重建

```yaml
# .github/workflows/rebuild.yml
name: Scheduled rebuild
on:
  schedule:
    - cron: "0 2 * * *"   # 每天 UTC 2:00

jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel deploy hook
        run: curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"
```

在 GitHub 仓库 Settings 中将 `VERCEL_DEPLOY_HOOK` 添加为 secret。

## 自定义域名

1. 前往项目 → **Settings** → **Domains** → **Add**
2. 输入你的域名并按照 DNS 说明操作
3. Vercel 通过 Let's Encrypt 自动提供 TLS 证书

## Vercel Edge Functions（可选）

要在 Vercel 上使用 Astro 的 SSR 功能，安装 Vercel 适配器：

```bash
pnpm add @astrojs/vercel
```

```js
// astro.config.mjs
import vercel from "@astrojs/vercel/serverless";

export default defineConfig({
  output: "server",
  adapter: vercel(),
  // ...
});
```

> **注意:** 大多数站点推荐使用 notro 的静态站点生成模式（`output: "static"`，默认）。只有在需要服务器端搜索或个性化等功能时才需要 SSR。

## 故障排查

**构建失败，提示"Cannot find module"**

确保 `node_modules` 没有提交到你的仓库。Vercel 从头安装依赖。

**Node.js 版本不匹配**

在 **Settings → General → Node.js Version** 中设置为 `24.x`，或添加 `.nvmrc` 文件：

```
24
```

**大型 Notion 数据库超出内存限制**

Vercel 的构建容器有 4 GB 内存限制。对于非常大的站点，考虑使用 `loader()` 中的 `filter` 选项只获取公开页面。
