# 🚀 快速开始 - 服务器部署

## 5 分钟快速部署指南

### 步骤 1: 购买服务器（约 2 分钟）

推荐选择：
- **阿里云/腾讯云**：新用户约 ¥50-100/月，1核2G 配置
- **Vultr/DigitalOcean**：约 $6/月，国外服务器

购买后记录：
- ✅ 服务器 IP 地址
- ✅ root 密码

### 步骤 2: 配置服务器（约 3 分钟）

SSH 连接到服务器：

```bash
ssh root@你的服务器IP
```

执行以下命令（复制粘贴即可）：

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Nginx
apt install nginx -y

# 创建网站目录
mkdir -p /var/www/crazy-farm
chown -R www-data:www-data /var/www/crazy-farm

# 配置 Nginx
cat > /etc/nginx/sites-available/crazy-farm << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/crazy-farm;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/crazy-farm /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 配置防火墙
ufw allow 80/tcp
ufw allow 22/tcp
ufw --force enable
```

### 步骤 3: 配置 SSH 密钥（约 2 分钟）

在**本地电脑**执行：

```bash
# 生成 SSH 密钥（如果还没有）
ssh-keygen -t rsa -b 4096 -C "deploy@github"

# 复制公钥到服务器
ssh-copy-id root@你的服务器IP
```

### 步骤 4: 配置 GitHub Secrets（约 2 分钟）

1. 进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**

2. 添加以下 Secrets：

   **SSH_PRIVATE_KEY**：
   ```bash
   # 在本地查看私钥
   cat ~/.ssh/id_rsa
   ```
   复制完整内容（包括 `-----BEGIN` 和 `-----END`）

   **REMOTE_HOST**：你的服务器 IP（例如：`123.456.789.0`）

   **REMOTE_USER**：`root`

   **REMOTE_PORT**：`22`

   **REMOTE_TARGET**：`/var/www/crazy-farm`

### 步骤 5: 触发部署（约 1 分钟）

1. 推送代码到 `main` 分支，或
2. 在 GitHub Actions 页面手动触发 "Deploy to Server"

### 步骤 6: 访问网站

部署成功后访问：

```
http://你的服务器IP
```

---

## ✅ 完成！

现在每次推送代码，GitHub Actions 会自动部署到你的服务器！

## 📚 详细文档

查看 [完整部署指南](./DEPLOY_SERVER.md) 了解更多细节和故障排除。

