# 🚀 服务器部署指南

本指南将帮助你购买服务器并配置自动部署到服务器。

## 📋 目录

1. [购买服务器](#1-购买服务器)
2. [配置服务器环境](#2-配置服务器环境)
3. [配置 GitHub Secrets](#3-配置-github-secrets)
4. [配置部署工作流](#4-配置部署工作流)
5. [测试部署](#5-测试部署)

---

## 1. 购买服务器

### 推荐的服务器提供商

#### 国内服务器（推荐）
- **阿里云 ECS**：https://www.aliyun.com/product/ecs
  - 新用户有优惠，1核2G 约 ¥50-100/月
  - 国内访问速度快
  
- **腾讯云 CVM**：https://cloud.tencent.com/product/cvm
  - 新用户有优惠，1核2G 约 ¥50-100/月
  - 国内访问速度快

- **华为云 ECS**：https://www.huaweicloud.com/product/ecs.html
  - 新用户有优惠

#### 国外服务器（性价比高）
- **Vultr**：https://www.vultr.com
  - 最低 $6/月，按小时计费
  - 支持支付宝
  
- **DigitalOcean**：https://www.digitalocean.com
  - 最低 $6/月

- **Linode**：https://www.linode.com
  - 最低 $5/月

### 购买建议

1. **选择配置**：
   - CPU: 1核即可
   - 内存: 2GB 足够
   - 硬盘: 20GB 足够
   - 带宽: 1-3Mbps 即可

2. **选择系统**：
   - 推荐：**Ubuntu 22.04 LTS** 或 **Ubuntu 20.04 LTS**
   - 其他：CentOS 7/8 也可以

3. **记录信息**：
   - 服务器公网 IP 地址
   - root 密码（或 SSH 密钥）

---

## 2. 配置服务器环境

### 2.1 连接到服务器

使用 SSH 连接到服务器：

```bash
ssh root@你的服务器IP
```

如果是首次连接，输入 `yes` 确认。

### 2.2 更新系统

```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# CentOS
yum update -y
```

### 2.3 安装 Nginx

```bash
# Ubuntu/Debian
apt install nginx -y

# CentOS
yum install nginx -y
```

### 2.4 启动 Nginx

```bash
# 启动 Nginx
systemctl start nginx

# 设置开机自启
systemctl enable nginx

# 检查状态
systemctl status nginx
```

### 2.5 配置 Nginx

创建网站目录：

```bash
mkdir -p /var/www/crazy-farm
chown -R www-data:www-data /var/www/crazy-farm
```

编辑 Nginx 配置：

```bash
nano /etc/nginx/sites-available/crazy-farm
```

**Ubuntu/Debian** 配置内容：

```nginx
server {
    listen 80;
    server_name _;  # 使用 IP 访问，可以改为你的域名
    
    root /var/www/crazy-farm;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**CentOS** 配置路径不同：

```bash
nano /etc/nginx/conf.d/crazy-farm.conf
```

内容同上。

### 2.6 启用配置并重启 Nginx

**Ubuntu/Debian**：

```bash
# 创建软链接
ln -s /etc/nginx/sites-available/crazy-farm /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

**CentOS**：

```bash
# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

### 2.7 配置防火墙

```bash
# Ubuntu (ufw)
ufw allow 80/tcp
ufw allow 22/tcp
ufw enable

# CentOS (firewalld)
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload
```

### 2.8 配置 SSH 密钥认证（可选但推荐）

在**本地电脑**生成 SSH 密钥对：

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

将公钥复制到服务器：

```bash
ssh-copy-id root@你的服务器IP
```

或者手动复制：

```bash
# 在本地查看公钥
cat ~/.ssh/id_rsa.pub

# 在服务器上添加到 authorized_keys
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# 粘贴公钥内容
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

---

## 3. 配置 GitHub Secrets

### 3.1 获取 SSH 私钥

在**本地电脑**查看私钥：

```bash
cat ~/.ssh/id_rsa
```

**复制整个私钥内容**（包括 `-----BEGIN OPENSSH PRIVATE KEY-----` 和 `-----END OPENSSH PRIVATE KEY-----`）

### 3.2 在 GitHub 添加 Secrets

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加以下 Secrets：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `SSH_PRIVATE_KEY` | 你的 SSH 私钥内容 | 完整的私钥，包括头尾 |
| `REMOTE_HOST` | 你的服务器IP | 例如：`123.456.789.0` |
| `REMOTE_USER` | `root` | 或你的用户名 |
| `REMOTE_PORT` | `22` | SSH 端口，默认 22 |
| `REMOTE_TARGET` | `/var/www/crazy-farm` | 服务器上的部署目录 |

### 3.3 添加 Secrets 步骤

1. **SSH_PRIVATE_KEY**：
   - Name: `SSH_PRIVATE_KEY`
   - Secret: 粘贴你的私钥（完整内容）

2. **REMOTE_HOST**：
   - Name: `REMOTE_HOST`
   - Secret: 你的服务器 IP（例如：`123.456.789.0`）

3. **REMOTE_USER**：
   - Name: `REMOTE_USER`
   - Secret: `root`（或你的用户名）

4. **REMOTE_PORT**：
   - Name: `REMOTE_PORT`
   - Secret: `22`（如果修改了 SSH 端口，填写实际端口）

5. **REMOTE_TARGET**：
   - Name: `REMOTE_TARGET`
   - Secret: `/var/www/crazy-farm`（与 Nginx 配置的目录一致）

---

## 4. 配置部署工作流

工作流文件已经创建在 `.github/workflows/deploy-server.yml`。

如果需要修改部署目录，编辑该文件中的 `TARGET` 变量。

---

## 5. 测试部署

### 5.1 触发部署

有两种方式：

1. **自动触发**：推送代码到 `main` 分支
2. **手动触发**：在 GitHub Actions 页面点击 "Run workflow"

### 5.2 查看部署状态

1. 进入 GitHub 仓库
2. 点击 **Actions** 标签
3. 查看 "Deploy to Server" 工作流运行状态

### 5.3 访问网站

部署成功后，在浏览器访问：

```
http://你的服务器IP
```

例如：`http://123.456.789.0`

---

## 🔧 常见问题

### Q: SSH 连接失败

**A:** 检查：
1. 服务器 IP 是否正确
2. SSH 端口是否正确（默认 22）
3. 防火墙是否开放 22 端口
4. SSH 私钥是否正确

### Q: 部署后无法访问

**A:** 检查：
1. Nginx 是否运行：`systemctl status nginx`
2. Nginx 配置是否正确：`nginx -t`
3. 防火墙是否开放 80 端口
4. 文件权限是否正确：`ls -la /var/www/crazy-farm`

### Q: 403 Forbidden 错误

**A:** 检查文件权限：

```bash
chown -R www-data:www-data /var/www/crazy-farm
chmod -R 755 /var/www/crazy-farm
```

### Q: 如何查看 Nginx 日志

```bash
# 访问日志
tail -f /var/log/nginx/access.log

# 错误日志
tail -f /var/log/nginx/error.log
```

---

## 📝 下一步

- [ ] 购买服务器
- [ ] 配置服务器环境
- [ ] 配置 GitHub Secrets
- [ ] 测试部署
- [ ] 访问网站验证

部署成功后，每次推送代码到 `main` 分支，GitHub Actions 会自动构建并部署到你的服务器！

