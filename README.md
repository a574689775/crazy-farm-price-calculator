# 🌾 疯狂农场价格计算器

一个简单的 React 价格计算器 demo，用于测试 GitHub Pages 功能。

## ✨ 功能

- 选择不同农产品的数量
- 实时计算总价
- 响应式设计，支持移动端

## 🚀 本地开发

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm run dev
```

访问 http://localhost:5173 查看应用

### 构建生产版本

```bash
pnpm run build
```

## 📦 部署

### 部署到服务器（推荐 - 国内可访问）

使用 GitHub Actions 自动部署到自己的服务器，通过 IP 访问。

**快速开始**：查看 [快速部署指南](./docs/QUICK_START.md)

**详细文档**：查看 [完整部署指南](./docs/DEPLOY_SERVER.md)

主要步骤：
1. 购买服务器（阿里云/腾讯云/Vultr 等）
2. 配置服务器环境（安装 Nginx）
3. 配置 GitHub Secrets（SSH 密钥、服务器信息）
4. 推送代码自动部署

### 部署到 GitHub Pages

1. 确保你的仓库名称是 `crazy-farm-price-calculator`
2. 如果仓库名称不同，请修改 `package.json` 中的 `homepage` 字段和 `vite.config.ts` 中的 `base` 字段
3. 在 GitHub 仓库设置中启用 Pages：
   - 进入仓库 Settings → Pages
   - Source 选择 "GitHub Actions"
4. 推送代码到 `main` 分支，GitHub Actions 会自动构建并部署

**注意**：GitHub Pages 在国内可能无法访问，建议使用服务器部署。

## 🔗 访问地址

- **服务器部署**：`http://你的服务器IP`
- **GitHub Pages**：`https://a574689775.github.io/crazy-farm-price-calculator/`

## 🛠️ 技术栈

- React 18
- Vite
- pnpm
- CSS3

## 📝 许可证

MIT
