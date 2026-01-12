#!/bin/bash

# CentOS Nginx 配置修复脚本

echo "🔧 开始修复 Nginx 配置..."

# 1. 备份主配置文件
echo "📦 备份主配置文件..."
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak

# 2. 创建新的主配置文件
echo "📝 创建新的主配置文件..."
cat > /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 2048;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    include /etc/nginx/conf.d/*.conf;
}
EOF

# 3. 创建我们的网站配置
echo "📝 创建网站配置..."
cat > /etc/nginx/conf.d/crazy-farm.conf << 'EOF'
server {
    listen 80 default_server;
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

# 4. 测试配置
echo "🧪 测试 Nginx 配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ 配置测试通过"
    
    # 5. 重新加载 Nginx
    echo "🔄 重新加载 Nginx..."
    systemctl reload nginx
    
    # 6. 创建测试文件
    echo "📄 创建测试文件..."
    echo "<h1>Crazy Farm - 配置成功！</h1>" > /var/www/crazy-farm/index.html
    chown nginx:nginx /var/www/crazy-farm/index.html
    
    echo ""
    echo "✅ 配置完成！"
    echo "🌐 测试访问: curl http://localhost"
    echo ""
else
    echo "❌ 配置测试失败，请检查错误信息"
    exit 1
fi

