import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';

export const logsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { limit = '100', targetType } = req.query as { limit?: string; targetType?: string };
    const where: any = {};
    if (targetType) where.targetType = targetType;

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, parseInt(limit, 10) || 100),
    });

    return reply.send({ logs });
  });
};
