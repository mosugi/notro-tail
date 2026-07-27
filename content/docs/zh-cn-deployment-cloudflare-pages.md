---
slug: zh-cn/deployment/cloudflare-pages
title: 部署到 Cloudflare Pages
---

# 部署到 Cloudflare Pages

本指南介绍如何将 notro 站点部署到 [Cloudflare Pages](https://pages.cloudflare.com/)。

## 前提条件

- [Cloudflare 账户](https://dash.cloudflare.com/sign-up)
- 已推送到 GitHub 或 GitLab 的项目

## 1. 创建 Pages 项目

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 前往 **Workers & Pages** → **Pages** → **Create a project**
3. 点击 **Connect to Git** 并授权 Cloudflare 访问你的仓库
4. 选择你的仓库并点击 **Begin setup**

## 2. 配置构建

在构建配置表单中设置：

| 设置 | 值 |
|---|---|
| **Framework preset** | Astro |
| **Build command** | `pnpm build` |
| **Build output directory** | `dist` |
| **Root directory** | `/`（如果项目在仓库根目录，则留空） |
| **Node.js version** | `24` |

如果你的项目使用 monorepo，Astro 站点在子目录中（例如 `templates/blog/`），将 **Root directory** 设置为该路径。

## 3. 设置环境变量

点击 **Environment variables (advanced)** 并添加：

| 变量 | 值 |
|---|---|
| `NOTION_TOKEN` | 你的 Notion 集成密钥 |
| `NOTION_DATASOURCE_ID` | 你的 Notion 数据库 UUID |

> **提示:** 仅在 **Production** 下设置这些，或者如果你希望预览部署也从 Notion 获取内容，则为 **Preview** 复制它们。

## 4. 部署

点击 **Save and Deploy**。Cloudflare 将克隆你的仓库、运行 `pnpm install` 和 `pnpm build`，并将 `dist/` 目录部署到 Cloudflare 边缘网络。

## 5. 配置自动部署

首次部署后，Cloudflare 在每次推送到生产分支（通常是 `main`）时自动部署。

对于 notro 站点，Notion 中的内容更改**不会**自动触发重建。使用 Cloudflare 的 Deploy Hooks 设置定时重建：

1. 前往 **Pages** → 你的项目 → **Settings** → **Builds & deployments**
2. 滚动到 **Deploy hooks** → **Add deploy hook**
3. 命名（例如 `Notion content update`）并选择要构建的分支
4. 复制生成的 URL

在内容更改时，使用此 Webhook URL 配合 cron 任务或 Notion 自动化触发重建。

## 自定义域名

1. 前往你的 Pages 项目 → **Custom domains** → **Set up a custom domain**
2. 输入你的域名并按照 DNS 设置说明操作
3. Cloudflare 自动提供 TLS 证书

## Node.js 版本

Cloudflare Pages 通过 `NODE_VERSION` 环境变量支持 Node.js 版本。在项目的环境变量中将其设置为 `24`，或在仓库中添加 `.node-version` 文件：

```
24
```

## 故障排查

**构建失败，提示"pnpm not found"**

在 `package.json` 中添加 `pnpm` 版本：

```json
{
  "packageManager": "pnpm@10.33.0"
}
```

**环境变量不可用**

确保变量设置为 **Production** 环境（不只是 Preview），并确认添加后已重新部署。

**大型站点触及 20,000 文件限制**

Cloudflare Pages 有 20,000 个文件的限制。对于大型站点，考虑使用带 KV 存储的 Cloudflare Workers，或考虑 Vercel/Netlify。
