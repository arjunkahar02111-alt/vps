import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';
import dns from 'node:dns/promises';
import { z } from 'zod';

export const domainsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List domains
  fastify.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const domains = await prisma.domain.findMany({
      include: {
        project: { select: { id: true, name: true, slug: true, status: true } },
        server: { select: { id: true, name: true, ipAddress: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ domains });
  });

  // Add domain
  fastify.post('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      domainName: z.string().min(3),
      projectId: z.string(),
      containerPort: z.number().optional().default(3000),
      sslEnabled: z.boolean().optional().default(true),
      forceHttps: z.boolean().optional().default(true),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const { domainName, projectId, containerPort, sslEnabled, forceHttps } = parsed.data;
    const cleanDomain = domainName.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { server: true },
    });
    if (!project) return reply.status(404).send({ error: 'Application not found' });

    // Check DNS resolution
    let dnsVerified = false;
    try {
      const records = await dns.resolve4(cleanDomain);
      if (records.length > 0) {
        dnsVerified = true;
      }
    } catch {
      dnsVerified = false;
    }

    const domain = await prisma.domain.create({
      data: {
        domainName: cleanDomain,
        projectId,
        serverId: project.serverId,
        containerPort: containerPort || project.containerPort || 3000,
        sslEnabled,
        forceHttps,
        dnsVerified,
        sslIssuedAt: sslEnabled ? new Date() : null,
        sslExpiresAt: sslEnabled ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null,
      },
    });

    // Update project with domain
    await prisma.project.update({
      where: { id: projectId },
      data: { domainName: cleanDomain, enableSsl: sslEnabled },
    });

    await prisma.activityLog.create({
      data: {
        actor: (req as any).user.email,
        operation: 'DOMAIN_ADDED',
        targetType: 'DOMAIN',
        targetId: domain.id,
        status: 'SUCCESS',
        details: JSON.stringify({ domain: cleanDomain, project: project.name }),
      },
    });

    return reply.status(201).send({ domain });
  });

  // Verify domain DNS
  fastify.post('/:id/verify-dns', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const domain = await prisma.domain.findUnique({ where: { id } });
    if (!domain) return reply.status(404).send({ error: 'Domain not found' });

    try {
      const records = await dns.resolve4(domain.domainName);
      const isOk = records.length > 0;
      await prisma.domain.update({
        where: { id },
        data: { dnsVerified: isOk },
      });
      return reply.send({ success: true, verified: isOk, ips: records });
    } catch (err: any) {
      return reply.send({ success: false, verified: false, error: err.message });
    }
  });

  // Delete domain
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const domain = await prisma.domain.findUnique({ where: { id } });
    if (!domain) return reply.status(404).send({ error: 'Domain not found' });

    await prisma.domain.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        actor: (req as any).user.email,
        operation: 'DOMAIN_REMOVED',
        targetType: 'DOMAIN',
        targetId: id,
        status: 'SUCCESS',
      },
    });

    return reply.send({ success: true, message: 'Domain deleted' });
  });
};
