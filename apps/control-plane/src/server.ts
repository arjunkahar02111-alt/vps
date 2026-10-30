import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { prisma } from './lib/prisma';
import { hashPassword } from './lib/auth';
import { initStorage } from './lib/storage';
import { collectSystemMetrics } from './lib/metrics';
import { deploymentEvents } from './lib/deployment-runner';
import os from 'node:os';

// Routes
import { authRoutes } from './routes/auth';
import { serversRoutes } from './routes/servers';
import { projectsRoutes } from './routes/projects';
import { deploymentsRoutes } from './routes/deployments';
import { uploadsRoutes } from './routes/uploads';
import { dockerRoutes } from './routes/docker';
import { databasesRoutes } from './routes/databases';
import { firewallRoutes } from './routes/firewall';
import { domainsRoutes } from './routes/domains';
import { backupsRoutes } from './routes/backups';
import { monitoringRoutes } from './routes/monitoring';
import { logsRoutes } from './routes/logs';
import { terminalRoutes } from './routes/terminal';

const fastify = Fastify({
  logger: false,
});

async function bootstrap() {
  initStorage();

  // Plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB per chunk part
    },
  });

  await fastify.register(rateLimit, {
    max: 500,
    timeWindow: '1 minute',
  });

  await fastify.register(websocket);

  // Health probe
  fastify.get('/health', async () => ({
    status: 'ok',
    product: 'KARVION CONTROL',
    developer: 'Arjun Kahar',
    timestamp: new Date().toISOString(),
  }));

  // Register API Routes
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(serversRoutes, { prefix: '/api/v1/servers' });
  await fastify.register(projectsRoutes, { prefix: '/api/v1/projects' });
  await fastify.register(deploymentsRoutes, { prefix: '/api/v1/deployments' });
  await fastify.register(uploadsRoutes, { prefix: '/api/v1' }); // uploads and files
  await fastify.register(dockerRoutes, { prefix: '/api/v1/docker' });
  await fastify.register(databasesRoutes, { prefix: '/api/v1/databases' });
  await fastify.register(firewallRoutes, { prefix: '/api/v1/firewall' });
  await fastify.register(domainsRoutes, { prefix: '/api/v1/domains' });
  await fastify.register(backupsRoutes, { prefix: '/api/v1/backups' });
  await fastify.register(monitoringRoutes, { prefix: '/api/v1/monitoring' });
  await fastify.register(logsRoutes, { prefix: '/api/v1/logs' });
  await fastify.register(terminalRoutes, { prefix: '/api/v1/terminal' });

  // Real-time Metrics WebSocket
  fastify.get('/ws/metrics', { websocket: true }, (socket, req) => {
    const interval = setInterval(async () => {
      if (socket.readyState === socket.OPEN) {
        try {
          const metrics = await collectSystemMetrics();
          socket.send(JSON.stringify(metrics));
        } catch {
          // ignore
        }
      }
    }, 2000);

    socket.on('close', () => clearInterval(interval));
    socket.on('error', () => clearInterval(interval));
  });

  // Real-time Deployment Logs WebSocket
  fastify.get('/ws/deployments/:jobId', { websocket: true }, (socket, req) => {
    const { jobId } = req.params as { jobId: string };

    const logListener = (data: any) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(data));
      }
    };

    deploymentEvents.on(`log:${jobId}`, logListener);

    socket.on('close', () => {
      deploymentEvents.off(`log:${jobId}`, logListener);
    });
    socket.on('error', () => {
      deploymentEvents.off(`log:${jobId}`, logListener);
    });
  });

  // Database Seeding (Admin & Local Primary Node)
  const existingUser = await prisma.user.findFirst();
  if (!existingUser) {
    const pass = await hashPassword('KarvionAdmin2026!');
    await prisma.user.create({
      data: {
        email: 'admin@karvion.local',
        name: 'Arjun Kahar (Administrator)',
        passwordHash: pass,
        role: 'SUPERADMIN',
      },
    });
    console.log('[Karvion Control] Default Superadmin seeded: admin@karvion.local / KarvionAdmin2026!');
  }

  // Ensure Primary Host VPS node exists
  const primaryServer = await prisma.vPSServer.findFirst({ where: { isLocalHost: true } });
  if (!primaryServer) {
    const totalMem = Math.round(os.totalmem() / (1024 * 1024));
    await prisma.vPSServer.create({
      data: {
        name: 'Primary Node (Host VPS)',
        ipAddress: '127.0.0.1',
        hostname: os.hostname(),
        status: 'ONLINE',
        osName: `${os.type()} ${os.release()}`,
        architecture: os.arch(),
        cpuCores: os.cpus().length,
        totalRamMb: totalMem,
        totalDiskGb: 100,
        isLocalHost: true,
      },
    });
    console.log('[Karvion Control] Primary Node registered and online.');
  }

  // Ensure baseline firewall rules
  const ruleCount = await prisma.firewallRule.count();
  if (ruleCount === 0) {
    const srv = await prisma.vPSServer.findFirst();
    if (srv) {
      const defaultRules = [
        { port: 22, protocol: 'TCP', action: 'ALLOW', direction: 'INBOUND', description: 'SSH Secure Shell Access', isSystemRule: true },
        { port: 80, protocol: 'TCP', action: 'ALLOW', direction: 'INBOUND', description: 'HTTP Web Traffic', isSystemRule: true },
        { port: 443, protocol: 'TCP', action: 'ALLOW', direction: 'INBOUND', description: 'HTTPS Encrypted Web Traffic', isSystemRule: true },
        { port: 3000, protocol: 'TCP', action: 'ALLOW', direction: 'INBOUND', description: 'KARVION Control Web Dashboard', isSystemRule: true },
        { port: 4000, protocol: 'TCP', action: 'ALLOW', direction: 'INBOUND', description: 'KARVION API & Telemetry Control Plane', isSystemRule: true },
      ];
      for (const r of defaultRules) {
        await prisma.firewallRule.create({
          data: { ...r, serverId: srv.id, sourceCidr: '0.0.0.0/0' },
        });
      }
    }
  }

  const PORT = parseInt(process.env.PORT || '4000', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  await fastify.listen({ port: PORT, host: HOST });

  console.log(`
========================================================================
  KARVION CONTROL - Universal VPS Management & Automated Deployment
  Product Owner & Architect: Arjun Kahar
  Developer Branding: Designed & Developed by Arjun Kahar
  Control Plane API running at: http://localhost:${PORT}
  WebSocket Metrics Stream at: ws://localhost:${PORT}/ws/metrics
========================================================================
`);
}

bootstrap().catch(err => {
  console.error('[!] Fatal error during Karvion Control Plane startup:', err);
  process.exit(1);
});
