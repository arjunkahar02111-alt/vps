'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Folder,
  File,
  FileCode,
  FileArchive,
  UploadCloud,
  Plus,
  Trash2,
  Download,
  Save,
  X,
  ChevronRight,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import { api } from '../../lib/api';

export function FileManagerView() {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Editor State
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [savingFile, setSavingFile] = useState(false);

  // New Folder Modal
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Upload State
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async (targetPath: string) => {
    setLoading(true);
    try {
      const res = await api.listFiles(targetPath);
      setFiles(res.files || []);
      setCurrentPath(targetPath);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles('');
  }, []);

  const handleOpenFile = async (fileItem: any) => {
    if (fileItem.isDirectory) {
      fetchFiles(fileItem.path);
    } else {
      // Open in code editor
      try {
        const res = await api.readFile(fileItem.path);
        setEditingFile(fileItem.path);
        setFileContent(res.content);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    setSavingFile(true);
    try {
      await api.writeFile(editingFile, fileContent);
      alert('File saved successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingFile(false);
    }
  };

  const handleDelete = async (fileItem: any) => {
    if (!confirm(`Are you sure you want to delete ${fileItem.name}?`)) return;
    try {
      await api.deleteFile(fileItem.path);
      fetchFiles(currentPath);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName) return;
    const target = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
    try {
      await api.createFolder(target);
      setFolderModalOpen(false);
      setNewFolderName('');
      fetchFiles(currentPath);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    try {
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
      const targetFolder = currentPath || '';

      const { uploadId } = await api.initChunkUpload({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        totalChunks,
        targetFolder,
        autoExtract: selectedFile.name.endsWith('.zip'),
      });

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(selectedFile.size, start + CHUNK_SIZE);
        const chunkBlob = selectedFile.slice(start, end);
        await api.uploadChunkPart(uploadId, i, chunkBlob);
      }

      await api.finalizeChunkUpload({ uploadId, autoExtract: selectedFile.name.endsWith('.zip') });
      fetchFiles(currentPath);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-red-500" />
            Universal File Manager
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Browse, upload, edit, and safely extract application source code and volumes remotely.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer shadow-crimson-sm transition-all">
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload File / ZIP'}</span>
            <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
          <button
            onClick={() => setFolderModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-xs text-zinc-200"
          >
            <Plus className="w-4 h-4 text-red-400" />
            <span>New Folder</span>
          </button>
          <button
            onClick={() => fetchFiles(currentPath)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Path Breadcrumbs */}
      <div className="flex items-center gap-1.5 p-3 rounded-xl bg-zinc-950/80 border border-red-500/15 text-xs font-mono text-zinc-300 overflow-x-auto">
        <button
          onClick={() => fetchFiles('')}
          className="hover:text-red-400 font-semibold text-red-500 transition-colors"
        >
          root
        </button>
        {breadcrumbs.map((part, index) => {
          const subPath = breadcrumbs.slice(0, index + 1).join('/');
          return (
            <React.Fragment key={index}>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
              <button
                onClick={() => fetchFiles(subPath)}
                className="hover:text-red-400 whitespace-nowrap transition-colors"
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Browser Table (2 Cols or Full) */}
        <div className={`glass-card rounded-2xl p-4 border border-red-500/15 ${editingFile ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-2.5 font-medium">Name</th>
                  <th className="pb-2.5 font-medium hidden sm:table-cell">Size</th>
                  <th className="pb-2.5 font-medium hidden md:table-cell">Modified</th>
                  <th className="pb-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {currentPath && (
                  <tr
                    onClick={() => {
                      const parent = breadcrumbs.slice(0, -1).join('/');
                      fetchFiles(parent);
                    }}
                    className="hover:bg-zinc-900/60 cursor-pointer"
                  >
                    <td colSpan={4} className="py-2.5 text-red-400 font-mono">
                      .. (Parent Directory)
                    </td>
                  </tr>
                )}

                {files.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-zinc-500">
                      Directory is empty.
                    </td>
                  </tr>
                ) : (
                  files.map((item) => (
                    <tr
                      key={item.path}
                      className="hover:bg-zinc-900/50 transition-colors group"
                    >
                      <td
                        onClick={() => handleOpenFile(item)}
                        className="py-2.5 flex items-center gap-2.5 cursor-pointer font-medium text-white group-hover:text-red-400"
                      >
                        {item.isDirectory ? (
                          <Folder className="w-4 h-4 text-red-400 flex-shrink-0" />
                        ) : item.name.endsWith('.zip') ? (
                          <FileArchive className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        ) : item.name.match(/\.(js|ts|py|json|php|go|rs|html|css)$/) ? (
                          <FileCode className="w-4 h-4 text-red-400 flex-shrink-0" />
                        ) : (
                          <File className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        )}
                        <span className="truncate max-w-[200px] sm:max-w-xs">{item.name}</span>
                      </td>

                      <td className="py-2.5 text-zinc-400 font-mono hidden sm:table-cell">
                        {item.isDirectory ? '—' : `${(item.size / 1024).toFixed(1)} KB`}
                      </td>

                      <td className="py-2.5 text-zinc-500 hidden md:table-cell">
                        {new Date(item.modifiedAt).toLocaleDateString()}
                      </td>

                      <td className="py-2.5 text-right space-x-1">
                        {!item.isDirectory && (
                          <button
                            onClick={() => handleOpenFile(item)}
                            title="Edit File"
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item)}
                          title="Delete"
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* In-Browser Code Editor Panel */}
        {editingFile && (
          <div className="lg:col-span-2 glass-card rounded-2xl p-4 border border-red-500/25 flex flex-col h-[560px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-red-400" />
                <span className="text-xs font-mono text-white truncate max-w-sm">{editingFile}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveFile}
                  disabled={savingFile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-crimson-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingFile ? 'Saving...' : 'Save File'}</span>
                </button>
                <button
                  onClick={() => setEditingFile(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="flex-1 w-full p-3 rounded-xl bg-black/90 font-mono text-xs text-zinc-200 border border-zinc-900 focus:border-red-500/50 outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {folderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-zinc-950 border border-red-500/30">
            <h3 className="text-sm font-bold text-white mb-3">Create New Directory</h3>
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name (e.g. data or config)"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFolderModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs text-white font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
