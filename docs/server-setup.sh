#!/bin/bash

# 服务器一键配置脚本
# 适用于 Ubuntu/Debian 系统

set -e

echo "🚀 开始配置服务器..."

# 更新系统
echo "📦 更新系统包..."
apt update && apt upgrade -y

# 安装 Nginx
echo "📦 安装 Nginx..."
apt install nginx -y

# 创建网站目录
echo "📁 创建网站目录..."
mkdir -p /var/www/crazy-farm
chown -R www-data:www-data /var/www/crazy-farm
chmod -R 755 /var/www/crazy-farm

# 配置 Nginx
echo "⚙️  配置 Nginx..."
cat > /etc/nginx/sites-available/crazy-farm << 'EOF'
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
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
EOF

# 启用配置
echo "🔗 启用 Nginx 配置..."
ln -sf /etc/nginx/sites-available/crazy-farm /etc/nginx/sites-enabled/

# 删除默认配置（可选）
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# 测试 Nginx 配置
echo "🧪 测试 Nginx 配置..."
nginx -t

# 重启 Nginx
echo "🔄 重启 Nginx..."
systemctl restart nginx
systemctl enable nginx

# 配置防火墙
echo "🔥 配置防火墙..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 22/tcp
    ufw --force enable
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --reload
fi

# 显示服务器 IP
echo ""
echo "✅ 服务器配置完成！"
echo ""
echo "📋 服务器信息："
echo "   - 网站目录: /var/www/crazy-farm"
echo "   - Nginx 配置: /etc/nginx/sites-available/crazy-farm"
echo ""
echo "🌐 访问地址："
echo "   http://$(curl -s ifconfig.me)"
echo ""
echo "📝 下一步："
echo "   1. 配置 GitHub Secrets（SSH 密钥、服务器 IP 等）"
echo "   2. 推送代码触发自动部署"
echo ""

