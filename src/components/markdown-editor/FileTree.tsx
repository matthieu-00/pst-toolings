import { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFileWorkspace, MarkdownFile } from '@/hooks/useFileWorkspace';

interface FileTreeProps {
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileCreate: () => void;
}

export function FileTree({
  activeFileId,
  onFileSelect,
  onFileCreate,
}: FileTreeProps) {
  const {
    files,
    deleteFile,
    renameFile,
    exportFile,
    importFile,
  } = useFileWorkspace();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleRenameStart = (file: MarkdownFile) => {
    setEditingId(file.id);
    setEditName(file.name);
  };

  const handleRenameSave = (id: string) => {
    if (editName.trim()) {
      renameFile(id, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt,.markdown';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await importFile(file);
      }
    };
    input.click();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      deleteFile(id);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r bg-card flex flex-col items-center p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          title="Expand file tree"
        >
          <FileText className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-2 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold">Files</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onFileCreate}
            title="New file"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleImport}
            title="Import file"
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(true)}
            title="Collapse"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No files yet. Create one to get started.
          </div>
        ) : (
          <div className="p-1">
            {files.map((file) => (
              <div
                key={file.id}
                className={`group flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer ${
                  activeFileId === file.id ? 'bg-accent' : ''
                }`}
                onClick={() => onFileSelect(file.id)}
              >
                <FileText className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                {editingId === file.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameSave(file.id);
                        } else if (e.key === 'Escape') {
                          handleRenameCancel();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 text-xs"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameSave(file.id);
                      }}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameCancel();
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameStart(file);
                        }}
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportFile(file.id);
                        }}
                        title="Export"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
