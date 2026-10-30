import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';
import { z } from 'zod';

export const firewallRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List firewall rules
  fastify.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { serverId } = req.query as { serverId?: string };
    const where: any = {};
    if (serverId) where.serverId = serverId;

    const rules = await prisma.firewallRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      enabled: true,
      defaultPolicy: 'DENY (Inbound) / ALLOW (Outbound)',
      rules,
    });
  });

  // Add firewall rule
  fastify.post('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      serverId: z.string().optional(),
      port: z.number().int().min(1).max(65535),
      protocol: z.enum(['TCP', 'UDP', 'BOTH']).default('TCP'),
      action: z.enum(['ALLOW', 'DENY']).default('ALLOW'),
      direction: z.enum(['INBOUND', 'OUTBOUND']).default('INBOUND'),
      sourceCidr: z.string().default('0.0.0.0/0'),
      description: z.string().min(2),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const data = parsed.data;
    let targetServerId = data.serverId;
    if (!targetServerId) {
      const server = await prisma.vPSServer.findFirst({ where: { status: 'ONLINE' } });
      if (!server) return reply.status(400).send({ error: 'No active server available' });
      targetServerId = server.id;
    }

    const rule = await prisma.firewallRule.create({
      data: {
        serverId: targetServerId,
        port: data.port,
        protocol: data.protocol,
        action: data.action,
        direction: data.direction,
        sourceCidr: data.sourceCidr,
        description: data.description,
        isSystemRule: data.port === 22 || data.port === 80 || data.port === 443,
      },
    });

    await prisma.activityLog.create({
      data: {
        actor: (req as any).user.email,
        operation: 'FIREWALL_RULE_ADDED',
        targetType: 'FIREWALL',
        targetId: rule.id,
        status: 'SUCCESS',
        details: JSON.stringify(data),
      },
    });

    return reply.status(201).send({ rule });
  });

  // Delete firewall rule
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const rule = await prisma.firewallRule.findUnique({ where: { id } });
    if (!rule) return reply.status(404).send({ error: 'Rule not found' });

    if (rule.isSystemRule) {
      return reply.status(403).send({ error: 'Cannot remove protected system management rule (SSH/Web)' });
    }

    await prisma.firewallRule.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        actor: (req as any).user.email,
        operation: 'FIREWALL_RULE_DELETED',
        targetType: 'FIREWALL',
        targetId: id,
        status: 'SUCCESS',
      },
    });

    return reply.send({ success: true, message: 'Rule deleted' });
  });
};
