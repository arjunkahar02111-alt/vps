import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../lib/auth';
import {
  initStorage,
  listDirectory,
  readFileSafe,
  writeFileSafe,
  deletePathSafe,
  createFolderSafe,
  extractZipSafe,
  saveUploadChunk,
  assembleChunks,
  resolveSafePath,
  getStorageRoot,
} from '../lib/storage';
import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';

export const uploadsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  initStorage();

  // 1. Initialize resumable multipart chunked upload
  fastify.post('/chunk-init', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      fileName: z.string(),
      fileSize: z.number().positive(),
      totalChunks: z.number().int().positive(),
      projectId: z.string().optional(),
      targetFolder: z.string().optional(),
      autoExtract: z.boolean().optional().default(true),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const { fileName, fileSize, totalChunks, projectId, targetFolder } = parsed.data;
    const uploadId = uuidv4();

    // Determine target location
    let targetPath = path.join('uploads', 'staging', `${uploadId}_${fileName}`);
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (project) {
        targetPath = path.join(project.projectRoot, targetFolder || '', fileName);
      }
    }

    await prisma.fileUpload.create({
      data: {
        id: uploadId,
        projectId,
        fileName,
        fileSize,
        totalChunks,
        status: 'UPLOADING',
        targetPath,
      },
    });

    return reply.send({
      uploadId,
      chunkSize: 5 * 1024 * 1024, // 5MB standard chunk
      targetPath,
    });
  });

  // 2. Receive single chunk
  fastify.post('/chunk', { preHandler: [requireAuth] }, async (req, reply) => {
    const data = await req.file();
    if (!data) {
      return reply.status(400).send({ error: 'No chunk file received' });
    }

    const uploadId = (data.fields.uploadId as any)?.value;
    const chunkIndexStr = (data.fields.chunkIndex as any)?.value;

    if (!uploadId || chunkIndexStr === undefined) {
      return reply.status(400).send({ error: 'Missing uploadId or chunkIndex' });
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    const buffer = await data.toBuffer();

    saveUploadChunk(uploadId, chunkIndex, buffer);

    await prisma.fileUpload.update({
      where: { id: uploadId },
      data: { uploadedChunks: { increment: 1 } },
    });

    return reply.send({ success: true, chunkIndex });
  });

  // 3. Finalize chunked upload and auto-extract if zip
  fastify.post('/chunk-finalize', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      uploadId: z.string(),
      autoExtract: z.boolean().optional().default(true),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Missing uploadId' });
    }

    const { uploadId, autoExtract } = parsed.data;
    const record = await prisma.fileUpload.findUnique({ where: { id: uploadId } });
    if (!record) {
      return reply.status(404).send({ error: 'Upload session not found' });
    }

    // Assemble file
    const finalFullPath = await assembleChunks(uploadId, record.totalChunks, record.targetPath);
    let extractedFiles: string[] = [];

    if (autoExtract && record.fileName.endsWith('.zip')) {
      const destDir = path.dirname(finalFullPath);
      try {
        extractedFiles = await extractZipSafe(finalFullPath, destDir);
      } catch (zipErr: any) {
        return reply.status(400).send({ error: `Zip Extraction failed: ${zipErr.message}` });
      }
    }

    await prisma.fileUpload.update({
      where: { id: uploadId },
      data: { status: 'COMPLETED' },
    });

    return reply.send({
      success: true,
      filePath: record.targetPath,
      extractedCount: extractedFiles.length,
      extractedFiles: extractedFiles.slice(0, 50),
    });
  });

  // 4. File Manager: List directory
  fastify.get('/files', { preHandler: [requireAuth] }, async (req, reply) => {
    const { path: reqPath } = req.query as { path?: string };
    try {
      const files = listDirectory(reqPath || '');
      return reply.send({ files });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // 5. File Manager: Read file content
  fastify.get('/files/content', { preHandler: [requireAuth] }, async (req, reply) => {
    const { path: reqPath } = req.query as { path: string };
    if (!reqPath) return reply.status(400).send({ error: 'Path is required' });

    try {
      const content = readFileSafe(reqPath);
      return reply.send({ content });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // 6. File Manager: Write / Save file content
  fastify.put('/files/content', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      path: z.string(),
      content: z.string(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid file payload' });

    try {
      writeFileSafe(parsed.data.path, parsed.data.content);
      return reply.send({ success: true, message: 'File saved successfully' });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // 7. File Manager: Delete file or folder
  fastify.delete('/files', { preHandler: [requireAuth] }, async (req, reply) => {
    const { path: reqPath } = req.query as { path: string };
    if (!reqPath) return reply.status(400).send({ error: 'Path is required' });

    try {
      deletePathSafe(reqPath);
      return reply.send({ success: true, message: 'Item deleted' });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // 8. File Manager: Create Folder
  fastify.post('/files/folder', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({ path: z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Path required' });

    try {
      createFolderSafe(parsed.data.path);
      return reply.send({ success: true, message: 'Folder created' });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // 9. File Manager: Download file
  fastify.get('/files/download', { preHandler: [requireAuth] }, async (req, reply) => {
    const { path: reqPath } = req.query as { path: string };
    if (!reqPath) return reply.status(400).send({ error: 'Path is required' });

    try {
      const fullPath = resolveSafePath(reqPath);
      if (!fs.existsSync(fullPath)) return reply.status(404).send({ error: 'File not found' });

      const fileName = path.basename(fullPath);
      const stream = fs.createReadStream(fullPath);
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
      return reply.send(stream);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
};
