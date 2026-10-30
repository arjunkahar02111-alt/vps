#!/usr/bin/env bash
# ==============================================================================
# KARVION CONTROL - 1-Click Universal VPS Auto-Installer
# Product Owner: Arjun Kahar
# Designed & Developed by Arjun Kahar
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${RED}${BOLD}"
echo "██╗  ██╗ █████╗ ██████╗ ██╗   ██╗██╗ ██████╗ ███╗   ██╗"
echo "██║ ██╔╝██╔══██╗██╔══██╗██║   ██║██║██╔═══██╗████╗  ██║"
echo "█████╔╝ ███████║██████╔╝██║   ██║██║██║   ██║██╔██╗ ██║"
echo "██╔═██╗ ██╔══██║██╔══██╗╚██╗ ██╔╝██║██║   ██║██║╚██╗██║"
echo "██║  ██╗██║  ██║██║  ██║ ╚████╔╝ ██║╚██████╔╝██║ ╚████║"
echo "╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝"
echo -e "${CYAN}Universal VPS Management, Automated Deployment & Hosting SaaS${NC}"
echo -e "${YELLOW}Designed & Developed by Arjun Kahar${NC}"
echo "================================================================================"

# 1. Root check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[!] Error: Please run this installer as root (sudo bash setup.sh)${NC}"
  exit 1
fi

# 2. Add Swap if less than 1.5GB swap exists (prevents SIGKILL during compile)
SWAP_TOTAL=$(free -m | awk '/^Swap:/{print $2}')
if [ -z "$SWAP_TOTAL" ] || [ "$SWAP_TOTAL" -lt 1500 ]; then
  echo -e "${GREEN}[1/8] Configuring 2GB Swap Memory (Prevents RAM Exhaustion)...${NC}"
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  else
    swapon /swapfile 2>/dev/null || true
  fi
else
  echo -e "${GREEN}[1/8] Adequate Swap Memory already active (${SWAP_TOTAL}MB).${NC}"
fi

# 3. Install System Dependencies
echo -e "${GREEN}[2/8] Updating package repository and essential tools...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ufw jq unzip tar build-essential

# 4. Install Node.js 20 LTS
echo -e "${GREEN}[3/8] Installing Node.js 20 LTS and Package Managers...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v) != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install pnpm and pm2
npm install -g pnpm pm2

# 5. Install Docker Engine if missing
echo -e "${GREEN}[4/8] Verifying Docker Engine API...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${CYAN}[*] Installing Docker Engine for container isolation...${NC}"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  echo -e "${CYAN}[*] Docker Engine already active.${NC}"
fi

# 6. Setup Directory & Clone/Sync Code
INSTALL_DIR="/opt/karvion-vps"
echo -e "${GREEN}[5/8] Synchronizing KARVION CONTROL source code into ${INSTALL_DIR}...${NC}"

if [ -d "$INSTALL_DIR/.git" ]; then
  cd "$INSTALL_DIR"
  git reset --hard HEAD
  git pull origin main
else
  rm -rf "$INSTALL_DIR"
  git clone https://github.com/arjunkahar02111-alt/vps.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# 7. Install Dependencies and Build
echo -e "${GREEN}[6/8] Installing workspace packages and compiling modules...${NC}"
pnpm install --ignore-scripts || pnpm install --no-frozen-lockfile

echo -e "${CYAN}[*] Generating Prisma Database Engine...${NC}"
cd "$INSTALL_DIR/apps/control-plane"
npx prisma generate
npx prisma db push
cd "$INSTALL_DIR"

echo -e "${CYAN}[*] Compiling Next.js Dashboard and Control Plane...${NC}"
export NODE_OPTIONS="--max-old-space-size=1536"
pnpm --filter @karvion/common build
pnpm --filter @karvion/runtime-detector build
pnpm --filter @karvion/control-plane build
pnpm --filter @karvion/web build
pnpm --filter @karvion/vps-agent build

# 8. Start and Daemonize with PM2 (24/7 Auto-Restart)
echo -e "${GREEN}[7/8] Configuring 24/7 background services with PM2...${NC}"
pm2 delete karvion-api 2>/dev/null || true
pm2 delete karvion-web 2>/dev/null || true

cd "$INSTALL_DIR"
pm2 start "node apps/control-plane/dist/server.js" --name "karvion-api"
pm2 start "pnpm --filter @karvion/web start" --name "karvion-web"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# 9. Firewall rules
echo -e "${GREEN}[8/8] Enabling firewall ports (22, 80, 443, 3000, 4000)...${NC}"
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 3000/tcp || true
ufw allow 4000/tcp || true

# Get Public IP
VPS_IP=$(curl -s --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')

echo ""
echo -e "${CYAN}================================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 KARVION CONTROL IS NOW LIVE 24/7 ON YOUR VPS!${NC}"
echo -e "${YELLOW}Designed & Developed by Arjun Kahar${NC}"
echo -e "${CYAN}================================================================================${NC}"
echo ""
echo -e "Web Dashboard:  ${BOLD}${CYAN}http://${VPS_IP}:3000${NC}"
echo -e "Control API:    ${BOLD}${CYAN}http://${VPS_IP}:4000${NC}"
echo ""
echo -e "Superadmin Credentials:"
echo -e "  Email:    ${BOLD}${YELLOW}admin@karvion.local${NC}"
echo -e "  Password: ${BOLD}${YELLOW}KarvionAdmin2026!${NC}"
echo ""
echo -e "${CYAN}Management Commands:${NC}"
echo -e "  Check Status: ${BOLD}pm2 status${NC}"
echo -e "  View Logs:    ${BOLD}pm2 logs${NC}"
echo -e "  Restart:      ${BOLD}pm2 restart all${NC}"
echo -e "${CYAN}================================================================================${NC}"
