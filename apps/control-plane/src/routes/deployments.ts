import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';
import { runDeploymentPipeline } from '../lib/deployment-runner';
import { z } from 'zod';

export const deploymentsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List deployments
  fastify.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { projectId } = req.query as { projectId?: string };
    const where: any = {};
    if (projectId) where.projectId = projectId;

    const deployments = await prisma.deployment.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, slug: true, projectType: true, processType: true } },
        server: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    const parsed = deployments.map(d => ({
      ...d,
      logs: JSON.parse(d.logs || '[]'),
    }));

    return reply.send({ deployments: parsed });
  });

  // Get deployment by ID
  fastify.get('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const deployment = await prisma.deployment.findUnique({
      where: { id },
      include: {
        project: true,
        server: true,
      },
    });

    if (!deployment) {
      return reply.status(404).send({ error: 'Deployment job not found' });
    }

    return reply.send({
      deployment: {
        ...deployment,
        logs: JSON.parse(deployment.logs || '[]'),
      },
    });
  });

  // Trigger deployment
  fastify.post('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      projectId: z.string(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Missing projectId' });
    }

    const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
    if (!project) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    const latest = await prisma.deployment.findFirst({
      where: { projectId: project.id },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version || 0) + 1;

    const deployment = await prisma.deployment.create({
      data: {
        projectId: project.id,
        serverId: project.serverId,
        version: nextVersion,
        step: 'INIT',
        status: 'PENDING',
        logs: JSON.stringify([]),
      },
    });

    setImmediate(() => {
      runDeploymentPipeline(deployment.id).catch(console.error);
    });

    return reply.status(201).send({
      message: 'Deployment triggered',
      deploymentId: deployment.id,
      version: nextVersion,
    });
  });
};
