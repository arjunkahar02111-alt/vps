import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';
import { docker, isDockerAvailable } from '../lib/docker';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const databasesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List database instances
  fastify.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { serverId } = req.query as { serverId?: string };
    const where: any = {};
    if (serverId) where.serverId = serverId;

    const databases = await prisma.databaseInstance.findMany({
      where,
      include: { server: { select: { id: true, name: true, ipAddress: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ databases });
  });

  // Provision new database instance
  fastify.post('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      engine: z.enum(['POSTGRES', 'MYSQL', 'MARIADB', 'REDIS', 'MONGODB', 'SQLITE']),
      serverId: z.string().optional(),
      port: z.number().optional(),
      databaseName: z.string().optional(),
      username: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const { name, engine, serverId, databaseName, username } = parsed.data;

    let targetServerId = serverId;
    if (!targetServerId) {
      const server = await prisma.vPSServer.findFirst({ where: { status: 'ONLINE' } });
      if (!server) return reply.status(400).send({ error: 'No active server available' });
      targetServerId = server.id;
    }

    // Default engine ports
    const defaultPorts: Record<string, number> = {
      POSTGRES: 5432,
      MYSQL: 3306,
      MARIADB: 3307,
      REDIS: 6379,
      MONGODB: 27017,
      SQLITE: 0,
    };

    const targetPort = parsed.data.port || defaultPorts[engine] || 5432;
    const finalDbName = databaseName || name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const finalUsername = username || 'karvion_user';
    const randomPassword = `kvn_${uuidv4().substring(0, 16)}`;

    let containerId = '';

    // If Docker available and not SQLite, attempt docker run
    if (engine !== 'SQLITE' && (await isDockerAvailable())) {
      const containerName = `karvion-db-${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
      try {
        let image = 'postgres:16-alpine';
        let env: string[] = [];

        if (engine === 'POSTGRES') {
          image = 'postgres:16-alpine';
          env = [
            `POSTGRES_DB=${finalDbName}`,
            `POSTGRES_USER=${finalUsername}`,
            `POSTGRES_PASSWORD=${randomPassword}`,
          ];
        } else if (engine === 'REDIS') {
          image = 'redis:7-alpine';
          env = [];
        } else if (engine === 'MYSQL' || engine === 'MARIADB') {
          image = engine === 'MYSQL' ? 'mysql:8.0' : 'mariadb:11';
          env = [
            `MYSQL_DATABASE=${finalDbName}`,
            `MYSQL_USER=${finalUsername}`,
            `MYSQL_PASSWORD=${randomPassword}`,
            `MYSQL_ROOT_PASSWORD=${randomPassword}`,
          ];
        } else if (engine === 'MONGODB') {
          image = 'mongo:7';
          env = [
            `MONGO_INITDB_ROOT_USERNAME=${finalUsername}`,
            `MONGO_INITDB_ROOT_PASSWORD=${randomPassword}`,
            `MONGO_INITDB_DATABASE=${finalDbName}`,
          ];
        }

        const cont = await docker.createContainer({
          Image: image,
          name: containerName,
          Env: env,
          HostConfig: {
            PortBindings: {
              [`${targetPort}/tcp`]: [{ HostPort: String(targetPort) }],
            },
            RestartPolicy: { Name: 'unless-stopped' },
          },
        });
        await cont.start();
        containerId = cont.id.substring(0, 12);
      } catch (err: any) {
        console.warn(`Docker database provisioning note: ${err.message}`);
        containerId = `db-${Date.now().toString(16)}`;
      }
    } else {
      containerId = `db-${Date.now().toString(16)}`;
    }

    const dbRecord = await prisma.databaseInstance.create({
      data: {
        name,
        engine,
        serverId: targetServerId,
        port: targetPort,
        databaseName: finalDbName,
        username: finalUsername,
        passwordEncrypted: randomPassword,
        containerId,
        status: 'RUNNING',
      },
    });

    await prisma.activityLog.create({
      data: {
        actor: (req as any).user.email,
        operation: 'DATABASE_CREATED',
        targetType: 'DATABASE',
        targetId: dbRecord.id,
        status: 'SUCCESS',
        details: JSON.stringify({ engine, name, port: targetPort }),
      },
    });

    return reply.status(201).send({ database: dbRecord });
  });

  // Delete database instance
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await prisma.databaseInstance.findUnique({ where: { id } });
    if (!db) return reply.status(404).send({ error: 'Database not found' });

    if (db.containerId && (await isDockerAvailable())) {
      try {
        const c = docker.getContainer(db.containerId);
        await c.stop().catch(() => {});
        await c.remove().catch(() => {});
      } catch {
        // ignore
      }
    }

    await prisma.databaseInstance.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        actor: (req as any).user.email,
        operation: 'DATABASE_DELETED',
        targetType: 'DATABASE',
        targetId: id,
        status: 'SUCCESS',
      },
    });

    return reply.send({ success: true, message: 'Database deleted' });
  });
};
