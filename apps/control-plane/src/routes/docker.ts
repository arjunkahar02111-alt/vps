import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../lib/auth';
import {
  getDockerInfo,
  listAllContainers,
  listAllImages,
  getContainerLogs,
  docker,
  isDockerAvailable,
} from '../lib/docker';

export const dockerRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/info', { preHandler: [requireAuth] }, async (req, reply) => {
    const info = await getDockerInfo();
    return reply.send({ info });
  });

  fastify.get('/containers', { preHandler: [requireAuth] }, async (req, reply) => {
    const containers = await listAllContainers();
    return reply.send({ containers });
  });

  fastify.get('/images', { preHandler: [requireAuth] }, async (req, reply) => {
    const images = await listAllImages();
    return reply.send({ images });
  });

  fastify.get('/containers/:id/logs', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { tail } = req.query as { tail?: string };
    const logs = await getContainerLogs(id, tail ? parseInt(tail, 10) : 150);
    return reply.send({ logs });
  });

  fastify.post('/containers/:id/restart', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await isDockerAvailable())) {
      return reply.status(503).send({ error: 'Docker daemon offline' });
    }
    try {
      const c = docker.getContainer(id);
      await c.restart();
      return reply.send({ success: true, message: 'Container restarted' });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  fastify.post('/containers/:id/stop', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await isDockerAvailable())) {
      return reply.status(503).send({ error: 'Docker daemon offline' });
    }
    try {
      const c = docker.getContainer(id);
      await c.stop();
      return reply.send({ success: true, message: 'Container stopped' });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
};
