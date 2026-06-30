#!/bin/bash
# ============================================================
# 病理学考试系统 - 一键部署脚本
# 在新服务器上执行: bash deploy.sh
# ============================================================
set -e

REPO="andyhang1980/website-source"
DEPLOY_DIR="/opt/exam_system"
DB_NAME="yf_boot_exam"
DB_USER="root"
DB_PASS="Zfz19801210*"
BACKEND_PORT=8090

echo "=== 病理学考试系统部署 ==="
echo ""

# 1. 安装依赖
echo "[1/6] 安装系统依赖..."
apt-get update -qq
apt-get install -y -qq nginx git curl python3 python3-pip python3-venv mysql-server

# 2. 安装 Python 包
echo "[2/6] 安装 Python 依赖..."
pip3 install flask flask-cors pymysql openpyxl --quiet

# 3. 下载源码
echo "[3/6] 下载源码..."
if [ -d "$DEPLOY_DIR/.git" ]; then
    cd "$DEPLOY_DIR"
    git pull origin main
    echo "代码已更新"
else
    mkdir -p "$DEPLOY_DIR"
    git clone "https://github.com/$REPO.git" "$DEPLOY_DIR"
    echo "代码已克隆"
fi
cd "$DEPLOY_DIR"

# 4. 配置 MySQL
echo "[4/6] 配置数据库..."
systemctl enable mysql
systemctl start mysql

# 创建数据库（如果不存在）
mysql -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || {
    echo "数据库密码可能不对，请手动配置 MySQL"
}

# 5. 配置 Nginx 反向代理
echo "[5/6] 配置 Nginx..."
cat > /etc/nginx/sites-available/exam << 'NGINX_CONF'
server {
    listen 80 default_server;
    server_name _;

    # H5 前端（手机端）
    location /h5/ {
        alias /opt/exam_system/exam_h5/;
        index index.html;
        try_files $uri $uri/ /h5/index.html;
    }

    # PC 端管理后台
    location /admin {
        alias /opt/exam_system/exam_system/static/admin.html;
    }

    # PC 端前端
    location /pc/ {
        alias /opt/exam_system/exam_system/static/;
        index index.html;
        try_files $uri $uri/ /pc/index.html;
    }

    # Flask API 后端
    location /api/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }

    # 默认跳转到 H5
    location = / {
        return 302 /h5/;
    }
}
NGINX_CONF

ln -sf /etc/nginx/sites-available/exam /etc/nginx/sites-enabled/exam
rm -f /etc/nginx/sites-enabled/default
systemctl enable nginx
systemctl restart nginx

# 6. 启动 Flask 后端（使用 systemd）
echo "[6/6] 配置后端服务..."
cat > /etc/systemd/system/exam-backend.service << EOF
[Unit]
Description=Exam System Backend
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/bin/python3 $DEPLOY_DIR/exam_backend/app.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 同时创建 exam_system 主系统服务
cat > /etc/systemd/system/exam-main.service << EOF
[Unit]
Description=Exam System Main (port 8080)
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/bin/python3 $DEPLOY_DIR/exam_system/app.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable exam-backend
systemctl restart exam-backend
systemctl enable exam-main
systemctl restart exam-main

echo ""
echo "=== 部署完成 ==="
echo ""
echo "访问地址:"
echo "  H5 手机端:  http://$(hostname -I | awk '{print $1}')/h5/"
echo "  PC 端:      http://$(hostname -I | awk '{print $1}')/pc/"
echo "  管理后台:   http://$(hostname -I | awk '{print $1}')/admin"
echo "  API 后端:   http://$(hostname -I | awk '{print $1}')/api/"
echo ""
echo "服务管理:"
echo "  systemctl status exam-backend    # 查看后端状态"
echo "  systemctl restart exam-backend   # 重启后端"
echo "  journalctl -u exam-backend -f    # 查看日志"
echo ""
echo "下一步:"
echo "  1. 修改 exam_backend/app.py 和 exam_system/app.py 中的数据库密码"
echo "  2. 通过管理后台导入试题"
echo "  3. 配置域名 DNS 指向此服务器"
echo "  4. 安装 HTTPS: apt install certbot python3-certbot-nginx && certbot --nginx"
echo ""
