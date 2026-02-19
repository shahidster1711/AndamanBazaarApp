#!/bin/bash
set -euo pipefail

# ============================================================
# AndamanBazaar VPS Deploy Script
# Run this ON the VPS server (root@82.29.160.68)
# ============================================================

REPO_URL="https://github.com/shahidster1711/AndamanBazaarApp.git"
APP_DIR="/opt/andamanbazaar"
BRANCH="main"

echo "============================================"
echo " AndamanBazaar — VPS Deployment"
echo "============================================"

# 1. Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "→ Installing Docker..."
    apt-get update -qq
    apt-get install -y -qq curl ca-certificates gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "✓ Docker installed"
else
    echo "✓ Docker already installed"
fi

# 2. Clone or pull the repo
if [ -d "$APP_DIR" ]; then
    echo "→ Pulling latest code..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard "origin/$BRANCH"
else
    echo "→ Cloning repository..."
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 3. Check for .env file
if [ ! -f "$APP_DIR/.env" ]; then
    echo ""
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    echo ""
    echo "   ╔═══════════════════════════════════════════════════╗"
    echo "   ║  IMPORTANT: Edit .env with your actual values!   ║"
    echo "   ║  nano /opt/andamanbazaar/.env                    ║"
    echo "   ║  Then re-run this script.                        ║"
    echo "   ╚═══════════════════════════════════════════════════╝"
    echo ""
    exit 1
fi

# 4. Build and deploy
echo "→ Building and starting containers..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

# 5. Verify
echo ""
echo "→ Waiting 5s for containers to start..."
sleep 5
docker compose ps

echo ""
echo "============================================"
echo " ✓ Deployment complete!"
echo "   App: http://82.29.160.68"
echo "   Logs: docker compose -f $APP_DIR/docker-compose.yml logs -f"
echo "============================================"
