import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';
import { docker, isDockerAvailable } from '../lib/docker';
import { runDeploymentPipeline } from '../lib/deployment-runner';
import { createFolderSafe, resolveSafePath, deletePathSafe } from '../lib/storage';
import path from 'node:path';
import { z } from 'zod';

export const projectsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List all projects / applications
  fastify.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { serverId, processType } = req.query as { serverId?: string; processType?: string };
    const where: any = {};
    if (serverId) where.serverId = serverId;
    if (processType) where.processType = processType;

    const projects = await prisma.project.findMany({
      where,
      include: {
        server: { select: { id: true, name: true, ipAddress: true, status: true } },
        envVariables: true,
        domains: true,
        _count: { select: { deployments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ projects });
  });

  // Get project by ID
  fastify.get('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        server: true,
        envVariables: true,
        domains: true,
        deployments: { take: 10, orderBy: { startedAt: 'desc' } },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    return reply.send({ project });
  });

  // Create new project
  fastify.post('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      serverId: z.string().optional(),
      projectType: z.string().default('NODEJS'),
      processType: z.string().default('WEB_APP'),
      framework: z.string().optional(),
      containerPort: z.number().optional().default(3000),
      publishedPort: z.number().optional(),
      startCommand: z.string().optional(),
      buildCommand: z.string().optional(),
      cpuLimit: z.number().optional().default(1.0),
      memoryLimitMb: z.number().optional().default(512),
      restartPolicy: z.enum(['no', 'always', 'on-failure', 'unless-stopped']).default('unless-stopped'),
      envVariables: z.record(z.string()).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const data = parsed.data;

    // Pick server (default to first active server / localhost)
    let targetServerId = data.serverId;
    if (!targetServerId) {
      const server = await prisma.vPSServer.findFirst({ where: { status: 'ONLINE' } });
      if (!server) {
        return reply.status(400).send({ error: 'No active VPS server available to host application' });
      }
      targetServerId = server.id;
    }

    const slug = data.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const existing = await prisma.project.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

    // Prepare project directory
    const projectRootRel = path.join('applications', finalSlug);
    createFolderSafe(projectRootRel);
    createFolderSafe(path.join(projectRootRel, 'data'));
    createFolderSafe(path.join(projectRootRel, 'logs'));

    const project = await prisma.project.create({
      data: {
        name: data.name,
        slug: finalSlug,
        serverId: targetServerId,
        projectType: data.projectType,
        processType: data.processType,
        framework: data.framework,
        projectRoot: projectRootRel,
        containerPort: data.containerPort,
        publishedPort: data.publishedPort || (data.processType.startsWith('BOT') ? undefined : data.containerPort),
        startCommand: data.startCommand,
        buildCommand: data.buildCommand,
        cpuLimit: data.cpuLimit,
        memoryLimitMb: data.memoryLimitMb,
        restartPolicy: data.restartPolicy,
        status: 'STOPPED',
      },
    });

    // Save initial env variables
    if (data.envVariables) {
      for (const [key, value] of Object.entries(data.envVariables)) {
        await prisma.environmentVariable.create({
          data: {
            projectId: project.id,
            key,
            value,
            isSecret: key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASS'),
          },
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        actor: (req as any).user.email,
        operation: 'APPLICATION_CREATED',
        targetType: 'APPLICATION',
        targetId: project.id,
        status: 'SUCCESS',
        details: JSON.stringify({ name: project.name, slug: project.slug }),
      },
    });

    return reply.status(201).send({ project });
  });

  // Update project settings
  fastify.put('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.status(404).send({ error: 'Application not found' });

    const schema = z.object({
      name: z.string().optional(),
      containerPort: z.number().optional(),
      publishedPort: z.number().optional(),
      startCommand: z.string().optional(),
      buildCommand: z.string().optional(),
      cpuLimit: z.number().optional(),
      memoryLimitMb: z.number().optional(),
      restartPolicy: z.enum(['no', 'always', 'on-failure', 'unless-stopped']).optional(),
      domainName: z.string().optional(),
      envVariables: z.record(z.string()).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const { envVariables, ...updateData } = parsed.data;

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    // Update env variables if supplied
    if (envVariables) {
      await prisma.environmentVariable.deleteMany({ where: { projectId: id } });
      for (const [key, value] of Object.entries(envVariables)) {
        await prisma.environmentVariable.create({
          data: {
            projectId: id,
            key,
            value,
            isSecret: key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASS'),
          },
        });
      }
    }

    return reply.send({ project: updated });
  });

  // Delete project
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.status(404).send({ error: 'Application not found' });

    // Stop and remove docker container if exists
    if (project.containerId && (await isDockerAvailable())) {
      try {
        const c = docker.getContainer(project.containerId);
        await c.stop().catch(() => {});
        await c.remove().catch(() => {});
      } catch {
        // ignore
      }
    }

    // Remove project files
    try {
      deletePathSafe(project.projectRoot);
    } catch {
      // ignore
    }

    await prisma.project.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        actor: (req as any).user.email,
        operation: 'APPLICATION_DELETED',
        targetType: 'APPLICATION',
        targetId: id,
        status: 'SUCCESS',
      },
    });

    return reply.send({ success: true, message: 'Application deleted' });
  });

  // Start application
  fastify.post('/:id/start', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.status(404).send({ error: 'Application not found' });

    if (project.containerId && (await isDockerAvailable())) {
      try {
        const c = docker.getContainer(project.containerId);
        await c.start();
      } catch (err: any) {
        console.warn(`Docker start notice: ${err.message}`);
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { status: 'RUNNING' },
    });

    return reply.send({ project: updated, message: 'Application started' });
  });

  // Stop application
  fastify.post('/:id/stop', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.status(404).send({ error: 'Application not found' });

    if (project.containerId && (await isDockerAvailable())) {
      try {
        const c = docker.getContainer(project.containerId);
        await c.stop();
      } catch (err: any) {
        console.warn(`Docker stop notice: ${err.message}`);
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { status: 'STOPPED' },
    });

    return reply.send({ project: updated, message: 'Application stopped' });
  });

  // Restart application
  fastify.post('/:id/restart', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.status(404).send({ error: 'Application not found' });

    if (project.containerId && (await isDockerAvailable())) {
      try {
        const c = docker.getContainer(project.containerId);
        await c.restart();
      } catch (err: any) {
        console.warn(`Docker restart notice: ${err.message}`);
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        status: 'RUNNING',
        restartCount: { increment: 1 },
      },
    });

    return reply.send({ project: updated, message: 'Application restarted' });
  });

  // Rebuild & Redeploy application
  fastify.post('/:id/rebuild', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.status(404).send({ error: 'Application not found' });

    const latestDep = await prisma.deployment.findFirst({
      where: { projectId: id },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latestDep?.version || 0) + 1;

    const deployment = await prisma.deployment.create({
      data: {
        projectId: id,
        serverId: project.serverId,
        version: nextVersion,
        step: 'INIT',
        status: 'PENDING',
        logs: JSON.stringify([]),
      },
    });

    // Run pipeline asynchronously
    setImmediate(() => {
      runDeploymentPipeline(deployment.id).catch(err => {
        console.error('Deployment error:', err);
      });
    });

    return reply.send({
      message: 'Deployment triggered',
      deploymentId: deployment.id,
      version: nextVersion,
    });
  });
};
