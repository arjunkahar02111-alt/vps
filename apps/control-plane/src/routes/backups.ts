import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';
import { resolveSafePath, getStorageRoot, extractZipSafe } from '../lib/storage';
import AdmZip from 'adm-zip';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';

export const backupsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List backups
  fastify.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { projectId } = req.query as { projectId?: string };
    const where: any = {};
    if (projectId) where.projectId = projectId;

    const backups = await prisma.backup.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, slug: true } },
        server: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ backups });
  });

  // Create backup
  fastify.post('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      projectId: z.string().optional(),
      type: z.enum(['APPLICATION', 'DATABASE', 'FULL_SYSTEM']).default('APPLICATION'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const { name, projectId, type } = parsed.data;

    let targetServerId = '';
    let sourcePath = getStorageRoot();

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return reply.status(404).send({ error: 'Application not found' });
      targetServerId = project.serverId;
      sourcePath = resolveSafePath(project.projectRoot);
    } else {
      const server = await prisma.vPSServer.findFirst({ where: { status: 'ONLINE' } });
      if (!server) return reply.status(400).send({ error: 'No active server available' });
      targetServerId = server.id;
    }

    const backupsDir = path.join(getStorageRoot(), 'backups');
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

    const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, '_');
    const zipFileName = `backup_${cleanName}_${Date.now()}.zip`;
    const zipFilePath = path.join(backupsDir, zipFileName);

    // Zip directory
    const zip = new AdmZip();
    if (fs.existsSync(sourcePath)) {
      zip.addLocalFolder(sourcePath);
    }
    zip.writeZip(zipFilePath);

    // Calculate sha256 checksum and size
    const fileBuffer = fs.readFileSync(zipFilePath);
    const sha256Checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const sizeBytes = fileBuffer.length;

    const backup = await prisma.backup.create({
      data: {
        name,
        type,
        serverId: targetServerId,
        projectId,
        filePath: path.relative(getStorageRoot(), zipFilePath).replace(/\\/g, '/'),
        sizeBytes,
        sha256Checksum,
      },
    });

    await prisma.activityLog.create({
      data: {
        actor: (req as any).user.email,
        operation: 'BACKUP_CREATED',
        targetType: 'APPLICATION',
        targetId: projectId || undefined,
        status: 'SUCCESS',
        details: JSON.stringify({ name, sizeBytes, sha256Checksum }),
      },
    });

    return reply.status(201).send({ backup });
  });

  // Restore backup
  fastify.post('/:id/restore', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const backup = await prisma.backup.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!backup) return reply.status(404).send({ error: 'Backup not found' });
    if (!backup.projectId || !backup.project) {
      return reply.status(400).send({ error: 'Cannot restore non-project backup directly' });
    }

    const fullZipPath = resolveSafePath(backup.filePath);
    if (!fs.existsSync(fullZipPath)) {
      return reply.status(404).send({ error: 'Backup archive file missing on disk' });
    }

    // Verify sha256 integrity
    const fileBuffer = fs.readFileSync(fullZipPath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    if (checksum !== backup.sha256Checksum) {
      return reply.status(400).send({ error: 'Security Warning: Backup checksum mismatch (corrupted archive)' });
    }

    // Extract into application root
    const targetDir = resolveSafePath(backup.project.projectRoot);
    await extractZipSafe(fullZipPath, targetDir);

    await prisma.activityLog.create({
      data: {
        actor: (req as any).user.email,
        operation: 'BACKUP_RESTORED',
        targetType: 'APPLICATION',
        targetId: backup.projectId,
        status: 'SUCCESS',
        details: JSON.stringify({ backupName: backup.name }),
      },
    });

    return reply.send({ success: true, message: 'Backup restored successfully' });
  });

  // Delete backup
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) return reply.status(404).send({ error: 'Backup not found' });

    try {
      const fullPath = resolveSafePath(backup.filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      // ignore
    }

    await prisma.backup.delete({ where: { id } });
    return reply.send({ success: true, message: 'Backup deleted' });
  });
};
