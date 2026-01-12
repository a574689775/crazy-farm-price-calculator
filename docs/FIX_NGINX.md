# 修复 Nginx 默认页面问题

## 问题诊断

如果禁用了 `conf.d/default.conf` 但还是显示默认页面，可能是默认配置在主配置文件中。

## 解决方案

### 方法 1: 检查并修改主配置文件

```bash
# 1. 查看主配置文件
cat /etc/nginx/nginx.conf

# 2. 找到 server 块，通常在文件末尾或 include 之前
# 如果看到类似这样的配置：
# server {
#     listen       80 default_server;
#     listen       [::]:80 default_server;
#     server_name  _;
#     root         /usr/share/nginx/html;
#     ...
# }
# 需要注释掉或删除这个 server 块
```

### 方法 2: 直接修改主配置文件

```bash
# 备份主配置文件
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak

# 编辑主配置文件
vi /etc/nginx/nginx.conf
```

在主配置文件中，找到类似这样的 server 块并注释掉：

```nginx
# 注释掉这个 server 块
# server {
#     listen       80 default_server;
#     listen       [::]:80 default_server;
#     server_name  _;
#     root         /usr/share/nginx/html;
#     ...
# }
```

### 方法 3: 使用 sed 自动注释（推荐）

```bash
# 备份
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak

# 注释掉主配置文件中的 server 块（从 server { 到对应的 }）
sed -i '/^[[:space:]]*server[[:space:]]*{/,/^[[:space:]]*}/s/^/#/' /etc/nginx/nginx.conf

# 或者更精确的方法：注释掉包含 default_server 的 server 块
sed -i '/listen.*default_server/,/^[[:space:]]*}/s/^/#/' /etc/nginx/nginx.conf
```

### 方法 4: 完全替换主配置文件中的 server 块

```bash
# 备份
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak

# 查看当前配置
grep -A 20 "server {" /etc/nginx/nginx.conf | head -30
```

然后手动编辑，或者使用更安全的方法：

```bash
# 创建一个新的主配置文件
cat > /tmp/nginx_main.conf << 'EOF'
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

    # 只包含我们的配置，不包含默认 server
    include /etc/nginx/conf.d/*.conf;
}
EOF

# 替换主配置文件
cp /tmp/nginx_main.conf /etc/nginx/nginx.conf
```

### 方法 5: 最简单的方法 - 直接删除默认目录

```bash
# 删除默认页面目录
rm -rf /usr/share/nginx/html/*

# 或者重命名
mv /usr/share/nginx/html /usr/share/nginx/html.bak

# 创建符号链接指向我们的目录
ln -s /var/www/crazy-farm /usr/share/nginx/html
```

## 验证步骤

执行以下命令验证：

```bash
# 1. 测试配置
nginx -t

# 2. 查看所有 server 配置
nginx -T | grep -A 10 "server {"

# 3. 重新加载
systemctl reload nginx

# 4. 测试访问
curl http://localhost

# 5. 查看错误日志（如果有问题）
tail -f /var/log/nginx/error.log
```

## 最终解决方案（推荐）

如果以上方法都不行，执行这个完整脚本：

```bash
#!/bin/bash

# 备份
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak

# 确保我们的配置存在且正确
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

# 修改主配置文件，注释掉默认 server 块
sed -i '/listen.*80.*default_server/,/^[[:space:]]*}/ { /^[[:space:]]*server[[:space:]]*{/,/^[[:space:]]*}/ s/^/#/ }' /etc/nginx/nginx.conf

# 或者直接编辑主配置文件，找到并注释掉 server 块
# vi /etc/nginx/nginx.conf

# 测试并重载
nginx -t && systemctl reload nginx

# 创建一个测试文件
echo "<h1>Test - Crazy Farm</h1>" > /var/www/crazy-farm/index.html
chown nginx:nginx /var/www/crazy-farm/index.html

# 测试访问
curl http://localhost
```

