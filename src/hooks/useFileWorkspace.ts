import { useState, useEffect, useCallback } from 'react';

export interface MarkdownFile {
  id: string;
  name: string;
  content: string;
  lastModified: number;
}

interface WorkspaceData {
  files: Record<string, MarkdownFile>;
  activeFileId: string | null;
}

const STORAGE_KEY = 'markdownEditor_workspace';

export function useFileWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceData>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Invalid data, start fresh
      }
    }
    return { files: {}, activeFileId: null };
  });

  // Persist to localStorage whenever workspace changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace]);

  const createFile = useCallback((name?: string): string => {
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newFile: MarkdownFile = {
      id,
      name: name || `Untitled ${Object.keys(workspace.files).length + 1}.md`,
      content: '',
      lastModified: Date.now(),
    };

    setWorkspace((prev) => ({
      files: { ...prev.files, [id]: newFile },
      activeFileId: id,
    }));

    return id;
  }, [workspace.files]);

  const openFile = useCallback((id: string): MarkdownFile | null => {
    const file = workspace.files[id];
    if (file) {
      setWorkspace((prev) => ({ ...prev, activeFileId: id }));
      return file;
    }
    return null;
  }, [workspace.files]);

  const saveFile = useCallback((id: string, content: string) => {
    setWorkspace((prev) => {
      const file = prev.files[id];
      if (!file) return prev;

      return {
        ...prev,
        files: {
          ...prev.files,
          [id]: {
            ...file,
            content,
            lastModified: Date.now(),
          },
        },
      };
    });
  }, []);

  const deleteFile = useCallback((id: string) => {
    setWorkspace((prev) => {
      const { [id]: removed, ...remainingFiles } = prev.files;
      return {
        files: remainingFiles,
        activeFileId: prev.activeFileId === id ? null : prev.activeFileId,
      };
    });
  }, []);

  const renameFile = useCallback((id: string, newName: string) => {
    setWorkspace((prev) => {
      const file = prev.files[id];
      if (!file) return prev;

      return {
        ...prev,
        files: {
          ...prev.files,
          [id]: {
            ...file,
            name: newName,
            lastModified: Date.now(),
          },
        },
      };
    });
  }, []);

  const importFile = useCallback(async (file: File): Promise<string> => {
    const content = await file.text();
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newFile: MarkdownFile = {
      id,
      name: file.name || 'Imported.md',
      content,
      lastModified: Date.now(),
    };

    setWorkspace((prev) => ({
      files: { ...prev.files, [id]: newFile },
      activeFileId: id,
    }));

    return id;
  }, []);

  const exportFile = useCallback((id: string) => {
    const file = workspace.files[id];
    if (!file) return;

    const blob = new Blob([file.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.endsWith('.md') ? file.name : `${file.name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [workspace.files]);

  const getAllFiles = useCallback((): MarkdownFile[] => {
    return Object.values(workspace.files).sort(
      (a, b) => b.lastModified - a.lastModified
    );
  }, [workspace.files]);

  const getActiveFile = useCallback((): MarkdownFile | null => {
    if (!workspace.activeFileId) return null;
    return workspace.files[workspace.activeFileId] || null;
  }, [workspace]);

  return {
    files: getAllFiles(),
    activeFile: getActiveFile(),
    activeFileId: workspace.activeFileId,
    createFile,
    openFile,
    saveFile,
    deleteFile,
    renameFile,
    importFile,
    exportFile,
  };
}
