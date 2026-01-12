# CentOS 服务器配置指南

## 完整配置命令（CentOS）

在服务器上依次执行以下命令：

```bash
# 1. 更新系统
yum update -y

# 2. 安装 Nginx
yum install nginx -y

# 3. 创建网站目录
mkdir -p /var/www/crazy-farm

# 4. 设置目录权限（CentOS 使用 nginx 用户，不是 www-data）
chown -R nginx:nginx /var/www/crazy-farm
chmod -R 755 /var/www/crazy-farm

# 5. 创建 Nginx 配置文件（CentOS 使用 conf.d 目录）
cat > /etc/nginx/conf.d/crazy-farm.conf << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/crazy-farm;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
EOF

# 6. 测试 Nginx 配置
nginx -t

# 7. 启动并设置开机自启
systemctl start nginx
systemctl enable nginx

# 8. 配置防火墙（CentOS 使用 firewalld）
systemctl start firewalld
systemctl enable firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload

# 9. 检查 Nginx 状态
systemctl status nginx

# 10. 查看服务器 IP（用于访问）
curl ifconfig.me
```

## 一键执行脚本

你也可以创建一个脚本文件：

```bash
cat > /tmp/setup-centos.sh << 'SCRIPT'
#!/bin/bash
set -e

echo "🚀 开始配置 CentOS 服务器..."

# 更新系统
echo "📦 更新系统..."
yum update -y

# 安装 Nginx
echo "📦 安装 Nginx..."
yum install nginx -y

# 创建网站目录
echo "📁 创建网站目录..."
mkdir -p /var/www/crazy-farm
chown -R nginx:nginx /var/www/crazy-farm
chmod -R 755 /var/www/crazy-farm

# 配置 Nginx
echo "⚙️  配置 Nginx..."
cat > /etc/nginx/conf.d/crazy-farm.conf << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/crazy-farm;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
EOF

# 测试并启动 Nginx
echo "🧪 测试 Nginx 配置..."
nginx -t

echo "🔄 启动 Nginx..."
systemctl start nginx
systemctl enable nginx

# 配置防火墙
echo "🔥 配置防火墙..."
systemctl start firewalld
systemctl enable firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload

echo ""
echo "✅ 配置完成！"
echo "📋 网站目录: /var/www/crazy-farm"
echo "🌐 访问地址: http://$(curl -s ifconfig.me)"
echo ""
SCRIPT

chmod +x /tmp/setup-centos.sh
bash /tmp/setup-centos.sh
```

## 验证配置

执行以下命令验证：

```bash
# 检查 Nginx 是否运行
systemctl status nginx

# 检查端口是否开放
netstat -tlnp | grep :80

# 检查防火墙规则
firewall-cmd --list-all

# 测试访问（应该返回 403，因为目录还没有文件）
curl http://localhost
```

## 常见问题

### Q: 如果遇到 SELinux 权限问题

```bash
# 设置 SELinux 上下文
chcon -R -t httpd_sys_content_t /var/www/crazy-farm
chcon -R -t httpd_sys_rw_content_t /var/www/crazy-farm
```

### Q: 如果 Nginx 启动失败

```bash
# 查看错误日志
tail -f /var/log/nginx/error.log

# 检查配置语法
nginx -t
```

### Q: 如果无法访问

1. 检查防火墙：
   ```bash
   firewall-cmd --list-all
   ```

2. 检查 Nginx 状态：
   ```bash
   systemctl status nginx
   ```

3. 检查端口监听：
   ```bash
   netstat -tlnp | grep :80
   ```

## 下一步

配置完成后，继续：
1. 配置 SSH 密钥
2. 配置 GitHub Secrets
3. 触发自动部署

