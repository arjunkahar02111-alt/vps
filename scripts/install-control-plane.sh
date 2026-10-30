#!/usr/bin/env bash
# ==============================================================================
# KARVION CONTROL - 1-Click Production Control Plane Installer
# Product Owner: Arjun Kahar
# Designed & Developed by Arjun Kahar
# Platform: Ubuntu 24.04 LTS / Debian 12 / Linux
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}"
echo "██╗  ██╗ █████╗ ██████╗ ██╗   ██╗██╗ ██████╗ ███╗   ██╗"
echo "██║ ██╔╝██╔══██╗██╔══██╗██║   ██║██║██╔═══██╗████╗  ██║"
echo "█████╔╝ ███████║██████╔╝██║   ██║██║██║   ██║██╔██╗ ██║"
echo "██╔═██╗ ██╔══██║██╔══██╗╚██╗ ██╔╝██║██║   ██║██║╚██╗██║"
echo "██║  ██╗██║  ██║██║  ██║ ╚████╔╝ ██║╚██████╔╝██║ ╚████║"
echo "╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝"
echo -e "${CYAN}Universal VPS Management, Automated Deployment & Hosting SaaS${NC}"
echo -e "${YELLOW}Designed & Developed by Arjun Kahar${NC}"
echo "================================================================================"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[!] Please run as root (sudo ./install-control-plane.sh)${NC}"
  exit 1
fi

echo -e "${GREEN}[1/6] Updating system packages...${NC}"
apt-get update -y && apt-get install -y curl git ufw jq unzip tar

echo -e "${GREEN}[2/6] Verifying Docker Engine...${NC}"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

echo -e "${GREEN}[3/6] Installing Node.js LTS and pnpm...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g pnpm

echo -e "${GREEN}[4/6] Creating storage structure at /opt/karvion...${NC}"
mkdir -p /opt/karvion/{applications,uploads/staging,backups,databases,logs,proxy}
chmod -R 755 /opt/karvion

echo -e "${GREEN}[5/6] Building KARVION CONTROL stack...${NC}"
pnpm install
pnpm build
cd apps/control-plane && npx prisma db push && cd ../..

echo -e "${GREEN}[6/6] Configuring Firewall & Systemd Services...${NC}"
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 3000/tcp || true
ufw allow 4000/tcp || true

echo -e "${CYAN}================================================================================"
echo -e "${GREEN}🎉 KARVION CONTROL HAS BEEN INSTALLED SUCCESSFULLY!${NC}"
echo -e "${YELLOW}Designed & Developed by Arjun Kahar${NC}"
echo -e "Web Dashboard:  ${CYAN}http://$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}'):3000${NC}"
echo -e "API Endpoint:   ${CYAN}http://$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}'):4000${NC}"
echo -e "Default Admin:  ${YELLOW}admin@karvion.local${NC}"
echo -e "Initial Pass:   ${YELLOW}KarvionAdmin2026!${NC}"
echo -e "${CYAN}================================================================================"
