# SSH 密钥配置指南

## 问题诊断

如果遇到 "Permission denied" 错误，通常是 SSH 密钥配置问题。

## 解决方案

### 步骤 1: 检查本地 SSH 密钥

在本地电脑执行：

```bash
# 查看是否有 SSH 密钥
ls -la ~/.ssh/

# 如果没有，生成新的密钥
ssh-keygen -t rsa -b 4096 -C "deploy@github"
# 按回车使用默认路径，可以设置密码或直接回车
```

### 步骤 2: 获取私钥（完整格式）

```bash
# 查看私钥（必须完整复制，包括头尾）
cat ~/.ssh/id_rsa
```

**重要**：复制时确保：
- 包含 `-----BEGIN OPENSSH PRIVATE KEY-----` 开头
- 包含 `-----END OPENSSH PRIVATE KEY-----` 结尾
- 所有行都完整（不要遗漏任何行）
- 每行末尾的换行符要保留

### 步骤 3: 将公钥添加到服务器

**方法 1: 使用 ssh-copy-id（推荐）**

```bash
ssh-copy-id root@你的服务器IP
```

**方法 2: 手动添加**

```bash
# 1. 查看公钥
cat ~/.ssh/id_rsa.pub

# 2. SSH 登录服务器
ssh root@你的服务器IP

# 3. 在服务器上执行
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "你的公钥内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 步骤 4: 测试 SSH 连接

```bash
# 测试是否可以无密码登录
ssh -i ~/.ssh/id_rsa root@你的服务器IP

# 如果可以直接登录（不需要密码），说明配置成功
# 然后退出：exit
```

### 步骤 5: 在 GitHub 添加 Secret

1. 进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 添加或更新 `SSH_PRIVATE_KEY`：
   - 点击 `SSH_PRIVATE_KEY` 的编辑按钮（如果已存在）
   - 或者点击 **New repository secret** 创建新的
   - Name: `SSH_PRIVATE_KEY`
   - Secret: 粘贴步骤 2 复制的**完整私钥内容**

**注意事项**：
- 私钥必须完整，包括头尾的 `-----BEGIN` 和 `-----END`
- 不要有多余的空格或换行
- 如果是从文件复制，确保所有行都复制了

### 步骤 6: 验证 GitHub Secrets

确保以下 Secrets 都已正确配置：

| Secret 名称 | 值示例 | 说明 |
|------------|--------|------|
| `SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH...` | 完整的私钥 |
| `REMOTE_HOST` | `123.456.789.0` | 服务器 IP |
| `REMOTE_USER` | `root` | SSH 用户名 |
| `REMOTE_PORT` | `22` | SSH 端口（可选，默认 22） |
| `REMOTE_TARGET` | `/var/www/crazy-farm` | 部署目录 |

### 步骤 7: 重新触发部署

1. 推送代码，或
2. 在 GitHub Actions 页面手动触发 "Deploy to Server"

## 常见问题

### Q: "Load key ... error in libcrypto"

**A:** 私钥格式不正确。检查：
1. 私钥是否完整（包括头尾）
2. 是否有特殊字符被转义
3. 尝试重新生成密钥对

### Q: "Permission denied (publickey)"

**A:** 公钥没有正确添加到服务器。检查：
1. 服务器上的 `~/.ssh/authorized_keys` 文件
2. 文件权限：`chmod 600 ~/.ssh/authorized_keys`
3. 目录权限：`chmod 700 ~/.ssh`

### Q: 如何重新生成密钥对？

```bash
# 1. 备份旧密钥（可选）
mv ~/.ssh/id_rsa ~/.ssh/id_rsa.backup
mv ~/.ssh/id_rsa.pub ~/.ssh/id_rsa.pub.backup

# 2. 生成新密钥
ssh-keygen -t rsa -b 4096 -C "deploy@github"

# 3. 将新公钥添加到服务器
ssh-copy-id root@你的服务器IP

# 4. 更新 GitHub Secret
# 复制新私钥：cat ~/.ssh/id_rsa
# 更新 GitHub 中的 SSH_PRIVATE_KEY
```

### Q: 如何验证服务器上的 authorized_keys？

```bash
# SSH 登录服务器
ssh root@你的服务器IP

# 查看 authorized_keys
cat ~/.ssh/authorized_keys

# 应该能看到你的公钥（以 ssh-rsa 开头的一长串）
```

## 调试技巧

如果还是不行，可以在服务器上查看 SSH 日志：

```bash
# 在服务器上执行
tail -f /var/log/secure

# 然后尝试从 GitHub Actions 部署
# 查看日志中的错误信息
```

