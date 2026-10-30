# KARVION CONTROL
### Universal VPS Management, Automated Deployment & Hosting SaaS
> **Product Owner & Lead Architect:** Arjun Kahar  
> **Developer Branding:** Designed & Developed by Arjun Kahar  
> **Version:** 1.0.0-PROD  

---

```text
██╗  ██╗ █████╗ ██████╗ ██╗   ██╗██╗ ██████╗ ███╗   ██╗
██║ ██╔╝██╔══██╗██╔══██╗██║   ██║██║██╔═══██╗████╗  ██║
█████╔╝ ███████║██████╔╝██║   ██║██║██║   ██║██╔██╗ ██║
██╔═██╗ ██╔══██║██╔══██╗╚██╗ ██╔╝██║██║   ██║██║╚██╗██║
██║  ██╗██║  ██║██║  ██║ ╚████╔╝ ██║╚██████╔╝██║ ╚████║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
     UNIVERSAL INFRASTRUCTURE & APPLICATION PLATFORM
```

## Overview

**KARVION CONTROL** is a universal, self-hosted VPS management and automated application deployment SaaS. It empowers system administrators, developers, and DevOps engineers to orchestrate servers, deploy multi-language applications, host Discord & Telegram bots, manage databases, configure Nginx reverse proxies with SSL certificates, enforce firewall rules, and access interactive web terminals—all through a modern, responsive, cyber crimson dashboard without needing to navigate SSH directories or manually edit configuration files.

---

## Key Capabilities

1. **Universal Multi-Runtime Detection & Build Engine**:
   - Automatically inspects project directories, manifests, and source files.
   - **Supported Runtimes**: Node.js, TypeScript, Bun, Python, PHP (Laravel/Symfony/WordPress), Java (Spring Boot/Maven/Gradle), Go, Rust, .NET 8, Static HTML/Vite, Dockerfile, Docker Compose.
   - **Bot Engine**: Native Discord bot and Telegram bot support with persistent background execution, encrypted secrets storage, and auto-restart policies.

2. **Universal File Manager & Upload Security**:
   - Resumable chunked multipart uploads (handles large files without server memory exhaustion).
   - Zip-Slip protected extraction ensuring all archive entries remain strictly inside project boundaries.
   - Canonicalized path traversal prevention.
   - Built-in in-browser code editor with dark crimson theme and syntax editing.

3. **Multi-VPS Connection Manager**:
   - Single-use enrollment tokens.
   - 1-Click install command: `curl -sSL https://.../install-agent.sh | sudo bash -s -- --token <TOKEN>`.
   - Real-time agent heartbeats and telemetry streaming.

4. **Database Provisioning**:
   - 1-click provisioning of PostgreSQL 16, MySQL 8, MariaDB 11, Redis 7, MongoDB 7, and SQLite.
   - Isolated Docker containers with persistent data volumes.
   - Instant connection string generation and credentials manager.

5. **Firewall & Security Center**:
   - UFW and iptables rule management.
   - **Automated Lockout Protection**: Protects SSH (port 22) and KARVION management ports (3000, 4000) from accidental deletion.

6. **Interactive Web Terminal**:
   - Direct PTY terminal shell session streaming over WebSocket with ANSI colors and xterm compatibility.

7. **Domains & Reverse Proxy**:
   - Map custom domains to internal application containers.
   - Let's Encrypt TLS certificate issuing and renewal.
   - Real-time DNS A-record verification.

8. **Automated Backups & Disaster Recovery**:
   - Full application and database atomic ZIP snapshots.
   - SHA-256 tamper-proof integrity checks.
   - 1-click restore wizard.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│              Next.js 15 Web Dashboard                      │
│        (Cyber Crimson Theme • Responsive Mobile & Desktop)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST & WebSockets
┌──────────────────────────────▼──────────────────────────────┐
│             Fastify Control Plane (Port 4000)               │
│   ├── JWT & Password Hashing (Argon2id/Bcrypt)              │
│   ├── Universal Runtime Detector                            │
│   ├── Resumable Chunked Storage & Safe Zip Extractor        │
│   ├── Deployment Runner & Docker Engine API Client          │
│   └── SQLite / PostgreSQL Database (Prisma ORM)             │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mutual TLS / WebSocket
┌──────────────────────────────▼──────────────────────────────┐
│           Remote VPS Node (or Host Machine Agent)           │
│   ├── Docker Engine API (Containers, Images, Networks)      │
│   ├── Systemd / Sysinfo Telemetry (CPU, RAM, Disk, Net)     │
│   ├── Nginx Reverse Proxy Config Generator                  │
│   └── UFW / iptables Firewall Controller                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start (Development & Local Run)

### Prerequisites
- Node.js >= 20.x
- pnpm >= 10.x
- Docker Engine (optional, for running live containers)

### 1. Install Dependencies & Build
```bash
pnpm install
pnpm build
```

### 2. Run Test Suite
```bash
pnpm test
```
All 11 unit & security tests will run and verify:
- Password hashing & verification
- JWT generation & verification
- Anti path-traversal security
- Zip-Slip malicious archive rejection
- Multi-runtime detection (Node, Discord bot, Python FastAPI, Go, Static HTML)

### 3. Start Development Servers
```bash
# Start Control Plane API (Port 4000)
pnpm dev:server

# In another terminal, start Web Dashboard (Port 3000)
pnpm dev:web
```

Access the dashboard in your browser:
**`http://localhost:3000`**

### Default Administrator Credentials
- **Email:** `admin@karvion.local`
- **Password:** `KarvionAdmin2026!`

---

## Production Deployment (1-Click Install on Linux VPS)

Run this command as root on any Ubuntu 24.04 LTS or Debian 12 server:

```bash
curl -sSL https://raw.githubusercontent.com/arjun-kahar/karvion-control/main/scripts/install-control-plane.sh | sudo bash
```

Or deploy using Docker Compose:
```bash
docker compose up -d
```

---

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript (Strict), Tailwind CSS, Framer Motion, Lucide Icons, Recharts.
- **Backend / Control Plane**: Node.js LTS, Fastify, WebSockets, Prisma ORM, SQLite / PostgreSQL, Dockerode, SystemInformation, Adm-Zip.
- **Agent**: Standalone Node/Go daemon with systemd integration and mTLS WebSocket telemetry.
- **Security**: Zip-Slip protection, Anti Path-Traversal, Argon2id/Bcrypt password hashing, Non-root OCI containers, UFW Firewall management lockout protection.

---

## Developer & Attribution

- **Product Name:** KARVION CONTROL
- **Architect & Lead Developer:** Arjun Kahar
- **Branding:** Designed & Developed by Arjun Kahar
