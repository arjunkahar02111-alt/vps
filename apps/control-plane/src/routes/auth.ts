import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, generateToken, requireAuth } from '../lib/auth';
import { z } from 'zod';

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Login
  fastify.post('/login', async (req, reply) => {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid email or password format' });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.activityLog.create({
      data: {
        actor: user.name,
        operation: 'USER_LOGIN',
        targetType: 'SERVER',
        status: 'SUCCESS',
        ipAddress: req.ip,
      },
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  });

  // Current authenticated user
  fastify.get('/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const tokenUser = (req as any).user;
    const user = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }
    return reply.send({ user });
  });

  // Update password
  fastify.post('/update-password', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid password format (minimum 8 characters)' });
    }

    const tokenUser = (req as any).user;
    const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return reply.status(400).send({ error: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return reply.send({ message: 'Password updated successfully' });
  });
};
