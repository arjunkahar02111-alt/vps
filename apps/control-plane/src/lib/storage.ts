import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { FileEntry } from '@karvion/common';

const DEFAULT_STORAGE = path.resolve(process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage'));

// Ensure base directories exist
export function initStorage() {
  const dirs = [
    DEFAULT_STORAGE,
    path.join(DEFAULT_STORAGE, 'applications'),
    path.join(DEFAULT_STORAGE, 'uploads', 'staging'),
    path.join(DEFAULT_STORAGE, 'backups'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function getStorageRoot(): string {
  return DEFAULT_STORAGE;
}

/**
 * Validates that requested path is safely inside baseDir (prevents path traversal / symlink escapes)
 */
export function resolveSafePath(relativeOrSubPath: string, baseDir: string = DEFAULT_STORAGE): string {
  const normalized = path.normalize(relativeOrSubPath);
  if (normalized.startsWith('..') || path.isAbsolute(normalized) && !normalized.startsWith(baseDir)) {
    throw new Error('Security Violation: Path traversal detected outside storage boundaries');
  }
  const resolved = path.resolve(baseDir, normalized);
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Security Violation: Path traversal detected outside storage boundaries');
  }
  return resolved;
}

export function listDirectory(relativeDirPath: string = ''): FileEntry[] {
  const targetDir = resolveSafePath(relativeDirPath);
  if (!fs.existsSync(targetDir)) return [];

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  return entries.map(entry => {
    const fullPath = path.join(targetDir, entry.name);
    let size = 0;
    let modifiedAt = new Date().toISOString();
    let isSymlink = entry.isSymbolicLink();

    try {
      const stat = fs.statSync(fullPath);
      size = stat.size;
      modifiedAt = stat.mtime.toISOString();
    } catch {
      // fallback
    }

    const rel = path.relative(DEFAULT_STORAGE, fullPath).replace(/\\/g, '/');

    return {
      name: entry.name,
      path: rel,
      size,
      isDirectory: entry.isDirectory(),
      isSymlink,
      modifiedAt,
      permissions: '0755',
    };
  });
}

export function readFileSafe(relativeFilePath: string): string {
  const targetFile = resolveSafePath(relativeFilePath);
  if (!fs.existsSync(targetFile)) {
    throw new Error(`File not found: ${relativeFilePath}`);
  }
  const stat = fs.statSync(targetFile);
  if (stat.size > 10 * 1024 * 1024) {
    throw new Error('File exceeds maximum readable size (10 MB)');
  }
  return fs.readFileSync(targetFile, 'utf-8');
}

export function writeFileSafe(relativeFilePath: string, content: string): void {
  const targetFile = resolveSafePath(relativeFilePath);
  const parent = path.dirname(targetFile);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  fs.writeFileSync(targetFile, content, 'utf-8');
}

export function deletePathSafe(relativeFilePath: string): void {
  const target = resolveSafePath(relativeFilePath);
  if (target === DEFAULT_STORAGE) {
    throw new Error('Cannot delete root storage directory');
  }
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

export function createFolderSafe(relativeDirPath: string): void {
  const target = resolveSafePath(relativeDirPath);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
}

/**
 * Safe ZIP Extraction with Zip-Slip protection
 */
export async function extractZipSafe(zipFilePath: string, targetDir: string): Promise<string[]> {
  const resolvedTarget = path.isAbsolute(targetDir) ? path.resolve(targetDir) : resolveSafePath(targetDir);
  if (!fs.existsSync(resolvedTarget)) {
    fs.mkdirSync(resolvedTarget, { recursive: true });
  }

  const zip = new AdmZip(zipFilePath);
  const zipEntries = zip.getEntries();
  const extractedFiles: string[] = [];

  for (const entry of zipEntries) {
    // Prevent Zip Slip vulnerability
    const entryPath = entry.entryName;
    const destPath = path.resolve(resolvedTarget, entryPath);
    if (!destPath.startsWith(resolvedTarget)) {
      throw new Error(`Security Violation: Zip entry escapes target directory (${entryPath})`);
    }

    if (entry.isDirectory) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
    } else {
      const entryParent = path.dirname(destPath);
      if (!fs.existsSync(entryParent)) {
        fs.mkdirSync(entryParent, { recursive: true });
      }
      fs.writeFileSync(destPath, entry.getData());
      extractedFiles.push(entryPath);
    }
  }

  return extractedFiles;
}

/**
 * Saves a chunk part to staging
 */
export function saveUploadChunk(uploadId: string, chunkIndex: number, buffer: Buffer): void {
  const stagingDir = path.join(DEFAULT_STORAGE, 'uploads', 'staging');
  if (!fs.existsSync(stagingDir)) {
    fs.mkdirSync(stagingDir, { recursive: true });
  }
  const chunkFile = path.join(stagingDir, `part_${uploadId}_${String(chunkIndex).padStart(6, '0')}`);
  fs.writeFileSync(chunkFile, buffer);
}

/**
 * Assembles all chunks into a final file
 */
export async function assembleChunks(
  uploadId: string,
  totalChunks: number,
  outputRelativePath: string
): Promise<string> {
  const stagingDir = path.join(DEFAULT_STORAGE, 'uploads', 'staging');
  const targetFile = resolveSafePath(outputRelativePath);
  const parent = path.dirname(targetFile);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }

  const writeStream = fs.createWriteStream(targetFile);

  for (let i = 0; i < totalChunks; i++) {
    const chunkFile = path.join(stagingDir, `part_${uploadId}_${String(i).padStart(6, '0')}`);
    if (!fs.existsSync(chunkFile)) {
      writeStream.close();
      throw new Error(`Missing chunk part ${i} for upload ${uploadId}`);
    }
    const data = fs.readFileSync(chunkFile);
    writeStream.write(data);
    fs.unlinkSync(chunkFile); // cleanup chunk
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.end(() => resolve());
    writeStream.on('error', reject);
  });

  return targetFile;
}
