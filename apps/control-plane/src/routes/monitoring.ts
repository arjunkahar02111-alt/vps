import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../lib/auth';
import { collectSystemMetrics } from '../lib/metrics';

export const monitoringRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { serverId } = req.query as { serverId?: string };
    const metrics = await collectSystemMetrics(serverId || 'localhost-primary');
    return reply.send({ metrics });
  });
};
