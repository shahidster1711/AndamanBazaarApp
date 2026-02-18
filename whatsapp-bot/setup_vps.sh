#!/bin/bash

# AndamanBazaar VPS Deployment Script
# Deploys: 
# 1. Static React Web App (Nginx)
# 2. WhatsApp Bot (Node.js + Baileys)
# 3. ZeroClaw AI Agent (Rust)

set -e

echo "🚀 Starting Full Stack VPS Setup..."

# 1. Update System & Install Core Packages
apt update && apt upgrade -y
apt install -y curl git ufw nginx certbot python3-certbot-nginx build-essential pkg-config libssl-dev

# 2. Install Node.js 20 (for Bot)
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# 3. Install Rust (for ZeroClaw)
if ! command -v rustc &> /dev/null; then
    echo "🦀 Installing Rust Toolchain..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "✅ Rust already installed"
fi

# 4. Install PM2 (Process Manager)
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 5. Setup ZeroClaw
echo "🦁 Building ZeroClaw (this may take a few minutes)..."
if [ ! -d "zeroclaw" ]; then
    git clone https://github.com/zeroclaw-labs/zeroclaw.git
fi
cd zeroclaw
cargo build --release
cargo install --path .
echo "✅ ZeroClaw installed! Run 'zeroclaw onboard' to configure."
cd ..

# 6. Setup Web App Directory
echo "🌐 Setting up Web App Host..."
mkdir -p /var/www/andaman/dist
chown -R $USER:$USER /var/www/andaman

# 7. Setup WhatsApp Bot
APP_DIR="/opt/andaman-bot"
echo "🤖 Setting up WhatsApp Bot in $APP_DIR..."

if [ -d "$APP_DIR" ]; then
    cd $APP_DIR
    git pull origin main
else
    git clone https://github.com/shahidster1711/AndamanBazaarApp.git $APP_DIR
    cd $APP_DIR
fi

cd whatsapp-bot
npm install
npm run build

# Generate Bot Env if missing
if [ ! -f .env ]; then
    echo "PORT=3000" > .env
    echo "BOT_API_KEY=$(openssl rand -hex 16)" >> .env
fi

# Start Bot with PM2
pm2 delete wa-bot 2>/dev/null || true
pm2 start dist/index.js --name wa-bot
pm2 save

# 8. Configure Nginx (Combined Web + Bot)
echo "configure Nginx..."
cat > /etc/nginx/sites-available/andaman <<EOF
server {
    listen 80;
    server_name _; # Replace with domain later

    # 1. Serve React App
    location / {
        root /var/www/andaman/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # 2. Proxy to WhatsApp Bot
    location /api/bot/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/andaman /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 9. Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "✅ ALL SYSTEMS GO!"
echo "------------------------------------------------"
echo "👉 Web App: http://<YOUR_IP> (Upload dist folder to /var/www/andaman/dist)"
echo "👉 WhatsApp Bot: http://<YOUR_IP>/api/bot"
echo "👉 ZeroClaw: Run 'zeroclaw onboard' and select 'Gemini' or enter your API Key."
echo "👉 Bot API Key: $(cat $APP_DIR/whatsapp-bot/.env | grep API_KEY)"
echo "------------------------------------------------"
