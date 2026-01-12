# 🌾 疯狂农场价格计算器

一个简单的 React 价格计算器 demo，用于测试 GitHub Pages 功能。

## ✨ 功能

- 选择不同农产品的数量
- 实时计算总价
- 响应式设计，支持移动端

## 🚀 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 查看应用

### 构建生产版本

```bash
npm run build
```

## 📦 部署到 GitHub Pages

### 方法一：使用 GitHub Actions（推荐）

1. 确保你的仓库名称是 `crazy-farm-price-calculator`
2. 如果仓库名称不同，请修改 `package.json` 中的 `homepage` 字段和 `vite.config.js` 中的 `base` 字段
3. 在 GitHub 仓库设置中启用 Pages：
   - 进入仓库 Settings → Pages
   - Source 选择 "GitHub Actions"
4. 推送代码到 `main` 分支，GitHub Actions 会自动构建并部署

### 方法二：手动部署

1. 构建项目：
   ```bash
   npm run build
   ```

2. 在 GitHub 仓库设置中：
   - Settings → Pages
   - Source 选择 "Deploy from a branch"
   - Branch 选择 `gh-pages`，文件夹选择 `/root`

3. 将 `dist` 文件夹的内容推送到 `gh-pages` 分支

## 🔗 访问地址

部署成功后，可以通过以下地址访问：
`https://chenzhaosheng.github.io/crazy-farm-price-calculator/`

## 🛠️ 技术栈

- React 18
- Vite
- CSS3

## 📝 许可证

MIT
