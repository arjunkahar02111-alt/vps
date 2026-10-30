import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const serversRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Agent enrollment script (public bash script for curl | bash)
  fastify.get('/install-agent.sh', async (req, reply) => {
    const host = req.headers.host || 'localhost:4000';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const script = `#!/usr/bin/env bash
# ==============================================================================
# KARVION CONTROL - Remote VPS Agent Installer
# Product Owner & Developer: Arjun Kahar
# ==============================================================================
set -e

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
NC='\\033[0m'

echo -e "\${CYAN}============================================================\${NC}"
echo -e "\${RED}   KARVION CONTROL - VPS NODE ENROLLMENT AGENT\${NC}"
echo -e "\${CYAN}   Designed & Developed by Arjun Kahar\${NC}"
echo -e "\${CYAN}============================================================\${NC}"

# Parse enrollment token
TOKEN=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --token)
      TOKEN="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [ -z "$TOKEN" ]; then
  echo -e "\${RED}[!] Error: Missing enrollment token. Run with --token <YOUR_TOKEN>\${NC}"
  exit 1
fi

echo -e "\${GREEN}[+] Verifying node dependencies (Docker, curl, systemd)...\${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "[*] Installing Docker Engine..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

echo -e "\${GREEN}[+] Registering node with Karvion Control Plane at ${protocol}://${host}...\${NC}"

# Register agent with control plane
HOSTNAME=$(hostname)
IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
OS=$(grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '"' || uname -s)
ARCH=$(uname -m)
CORES=$(nproc)
RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
DISK_GB=$(df -BG / | awk 'NR==2 {print $2}' | tr -d 'G')

RESPONSE=$(curl -s -X POST "${protocol}://${host}/api/v1/servers/enroll" \\
  -H "Content-Type: application/json" \\
  -d "{\\"token\\": \\"$TOKEN\\", \\"hostname\\": \\"$HOSTNAME\\", \\"ipAddress\\": \\"$IP\\", \\"osName\\": \\"$OS\\", \\"architecture\\": \\"$ARCH\\", \\"cpuCores\\": $CORES, \\"totalRamMb\\": $RAM_MB, \\"totalDiskGb\\": $DISK_GB}")

echo -e "\${GREEN}[+] Server successfully enrolled into KARVION CONTROL!\${NC}"
echo -e "\${GREEN}[+] Agent active and streaming telemetry.\${NC}"
`;
    reply.header('Content-Type', 'text/x-shellscript');
    return reply.send(script);
  });

  // Agent self-enrollment endpoint (called by install-agent.sh)
  fastify.post('/enroll', async (req, reply) => {
    const enrollSchema = z.object({
      token: z.string(),
      hostname: z.string(),
      ipAddress: z.string(),
      osName: z.string(),
      architecture: z.string(),
      cpuCores: z.number(),
      totalRamMb: z.number(),
      totalDiskGb: z.number(),
    });

    const parsed = enrollSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid enrollment payload' });
    }

    const { token, hostname, ipAddress, osName, architecture, cpuCores, totalRamMb, totalDiskGb } = parsed.data;

    // Check if token exists
    const server = await prisma.vPSServer.findUnique({
      where: { enrollmentToken: token },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Invalid or expired enrollment token' });
    }

    // Update server status and specs
    const updated = await prisma.vPSServer.update({
      where: { id: server.id },
      data: {
        hostname,
        ipAddress,
        osName,
        architecture,
        cpuCores,
        totalRamMb,
        totalDiskGb,
        status: 'ONLINE',
        lastHeartbeat: new Date(),
        enrollmentToken: null, // consume token
      },
    });

    await prisma.activityLog.create({
      data: {
        actor: 'Agent Daemon',
        operation: 'VPS_AGENT_CONNECTED',
        targetType: 'SERVER',
        targetId: server.id,
        status: 'SUCCESS',
        details: JSON.stringify({ ipAddress, hostname, osName }),
      },
    });

    return reply.send({ success: true, serverId: updated.id, message: 'Node enrolled successfully' });
  });

  // List servers
  fastify.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const servers = await prisma.vPSServer.findMany({
      include: {
        _count: {
          select: { projects: true, databases: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ servers });
  });

  // Generate 1-click enrollment token & install command
  fastify.post('/enrollment-token', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      panelUrl: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Server name is required' });
    }

    const token = `kvn_${uuidv4().replace(/-/g, '')}`;
    const server = await prisma.vPSServer.create({
      data: {
        name: parsed.data.name,
        ipAddress: 'Pending Discovery...',
        hostname: parsed.data.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        status: 'PROVISIONING',
        enrollmentToken: token,
      },
    });

    let baseUrl = parsed.data.panelUrl?.trim();
    if (!baseUrl) {
      const host = req.headers.host || 'localhost:4000';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      baseUrl = `${protocol}://${host}`;
    } else {
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }
      baseUrl = baseUrl.replace(/\/$/, '');
    }

    const installCommand = `curl -sSL ${baseUrl}/api/v1/servers/install-agent.sh | sudo bash -s -- --token ${token}`;

    return reply.send({
      server,
      token,
      installCommand,
    });
  });

  // Get server by ID
  fastify.get('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const server = await prisma.vPSServer.findUnique({
      where: { id },
      include: {
        projects: true,
        databases: true,
        firewallRules: true,
        domains: true,
      },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    return reply.send({ server });
  });

  // Delete server
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const server = await prisma.vPSServer.findUnique({ where: { id } });
    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    const totalServers = await prisma.vPSServer.count();
    if (totalServers <= 1) {
      return reply.status(400).send({ error: 'At least one active VPS server must remain in the panel' });
    }

    await prisma.vPSServer.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        actor: (req as any).user.email,
        operation: 'VPS_REMOVED',
        targetType: 'SERVER',
        targetId: id,
        status: 'SUCCESS',
      },
    });

    return reply.send({ success: true, message: 'Server removed' });
  });
};
