import { useState, useEffect, useRef, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { FileText, Eye, EyeOff, Split } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Editor } from '@/components/markdown-editor/Editor';
import { Preview } from '@/components/markdown-editor/Preview';
import { Toolbar } from '@/components/markdown-editor/Toolbar';
import { FileTree } from '@/components/markdown-editor/FileTree';
import { StatusBar } from '@/components/markdown-editor/StatusBar';
import { CommandPalette, Command } from '@/components/markdown-editor/CommandPalette';
import { useFileWorkspace } from '@/hooks/useFileWorkspace';
import { exportToHTML, exportToPDF, copyAsMarkdown, copyAsHTML } from '@/lib/markdown/exporter';
import { useTheme } from '@/contexts/ThemeContext';
import { useExportGuard } from '@/hooks/useExportGuard';

type ViewMode = 'editor' | 'split' | 'preview';

interface EditorSettings {
  fontSize: number;
  wordWrap: boolean;
  showLineNumbers: boolean;
  scrollSync: boolean;
  focusMode: boolean;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  wordWrap: false,
  showLineNumbers: true,
  scrollSync: true,
  focusMode: false,
};

const SETTINGS_STORAGE_KEY = 'markdownEditor_settings';

export default function MarkdownEditor() {
  const { theme } = useTheme();
  const { canExport } = useExportGuard();
  const {
    activeFile,
    activeFileId,
    createFile,
    openFile,
    saveFile,
  } = useFileWorkspace();

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [content, setContent] = useState('');
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>(() => {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });
  const [isSaved, setIsSaved] = useState(true);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorColumn, setCursorColumn] = useState(1);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const editorScrollRef = useRef<HTMLElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Load active file content
  useEffect(() => {
    if (activeFile) {
      setContent(activeFile.content);
      setIsSaved(true);
    } else {
      setContent('');
      setIsSaved(true);
    }
  }, [activeFile]);

  // Auto-save on content change
  useEffect(() => {
    if (activeFileId && content !== activeFile?.content) {
      const timeoutId = setTimeout(() => {
        saveFile(activeFileId, content);
        setIsSaved(true);
      }, 1000);

      setIsSaved(false);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [content, activeFileId, activeFile, saveFile]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFileId) {
          saveFile(activeFileId, content);
          setIsSaved(true);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleImportFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId, content, saveFile]);

  // Update cursor position
  useEffect(() => {
    if (!editorView) return;

    const updateCursor = () => {
      const selection = editorView.state.selection.main;
      const line = editorView.state.doc.lineAt(selection.head);
      setCursorLine(line.number);
      setCursorColumn(selection.head - line.from + 1);
    };

    // Use a simple interval to update cursor position
    const intervalId = setInterval(() => {
      updateCursor();
    }, 100);

    updateCursor();
    
    return () => {
      clearInterval(intervalId);
    };
  }, [editorView]);

  // Calculate stats
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characterCount = content.length;
  const readingTime = Math.ceil(wordCount / 200);

  // Toast notification helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleNewFile = () => {
    const id = createFile();
    openFile(id);
  };

  const handleFileSelect = (fileId: string) => {
    openFile(fileId);
  };

  const handleImportFile = () => {
    // Import is handled by FileTree component
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt,.markdown';
    input.click();
    return;
  };

  const handleInsertTable = () => {
    if (!editorView) return;
    const table = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
`;
    const selection = editorView.state.selection.main;
    editorView.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: table,
      },
    });
    editorView.focus();
  };

  const handleExportHTML = () => {
    if (!canExport) {
      showToast('Export functionality is not available with your current access level.');
      return;
    }
    if (!activeFile) return;
    const html = exportToHTML(content, { theme, title: activeFile.name });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFile.name.replace(/\.md$/, '')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('HTML exported successfully');
  };

  const handleExportPDF = async () => {
    if (!canExport) {
      showToast('Export functionality is not available with your current access level.');
      return;
    }
    if (!activeFile) return;
    try {
      await exportToPDF(content, { theme, title: activeFile.name });
      showToast('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast('Failed to export PDF');
    }
  };

  const handleCopyMarkdown = async () => {
    if (!canExport) {
      showToast('Export functionality is not available with your current access level.');
      return;
    }
    const success = await copyAsMarkdown(content);
    if (success) {
      showToast('Markdown copied to clipboard');
    } else {
      showToast('Failed to copy markdown to clipboard');
    }
  };

  const handleCopyHTML = async () => {
    if (!canExport) {
      showToast('Export functionality is not available with your current access level.');
      return;
    }
    const success = await copyAsHTML(content, { theme });
    if (success) {
      showToast('HTML copied to clipboard');
    } else {
      showToast('Failed to copy HTML to clipboard');
    }
  };

  const handleCopyPlaintext = async () => {
    if (!canExport) {
      showToast('Export functionality is not available with your current access level.');
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      showToast('Plain text copied to clipboard');
    } catch (error) {
      console.error('Error copying plaintext to clipboard:', error);
      showToast('Failed to copy plain text to clipboard');
    }
  };

  const handleInsertImage = () => {
    if (!editorView || !imageUrl.trim()) return;
    const altText = imageAlt.trim() || 'image';
    const imageMarkdown = `![${altText}](${imageUrl})`;
    const selection = editorView.state.selection.main;
    editorView.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: imageMarkdown,
      },
      selection: {
        anchor: selection.from + imageMarkdown.length,
      },
    });
    editorView.focus();
    setShowImageDialog(false);
    setImageUrl('');
    setImageAlt('');
  };

  const handleDropImage = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    // For now, we'll insert image references
    // In a real app, you'd upload to a server and get URLs
    const imageFile = imageFiles[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (editorView && dataUrl) {
        // Insert as data URL (for demo - in production, upload to server)
        const imageMarkdown = `![${imageFile.name}](${dataUrl})`;
        const selection = editorView.state.selection.main;
        editorView.dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: imageMarkdown,
          },
          selection: {
            anchor: selection.from + imageMarkdown.length,
          },
        });
        editorView.focus();
      }
    };
    reader.readAsDataURL(imageFile);
  }, [editorView]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const commands: Command[] = [
    {
      id: 'toggle-preview',
      label: 'Toggle Preview',
      category: 'View',
      icon: viewMode === 'preview' ? EyeOff : Eye,
      action: () => setViewMode(viewMode === 'preview' ? 'editor' : 'preview'),
    },
    {
      id: 'toggle-split',
      label: 'Toggle Split View',
      category: 'View',
      icon: Split,
      action: () => setViewMode(viewMode === 'split' ? 'editor' : 'split'),
    },
    {
      id: 'new-file',
      label: 'New File',
      category: 'File',
      action: handleNewFile,
      keywords: ['create'],
    },
    {
      id: 'save',
      label: 'Save File',
      category: 'File',
      action: () => {
        if (activeFileId) {
          saveFile(activeFileId, content);
          setIsSaved(true);
        }
      },
    },
    {
      id: 'export-html',
      label: 'Export as HTML',
      category: 'File',
      action: handleExportHTML,
    },
    {
      id: 'export-pdf',
      label: 'Export as PDF',
      category: 'File',
      action: handleExportPDF,
    },
    {
      id: 'copy-markdown',
      label: 'Copy as Markdown',
      category: 'Edit',
      action: handleCopyMarkdown,
    },
    {
      id: 'copy-html',
      label: 'Copy as HTML',
      category: 'Edit',
      action: handleCopyHTML,
    },
    {
      id: 'insert-table',
      label: 'Insert Table',
      category: 'Insert',
      action: handleInsertTable,
    },
    {
      id: 'insert-image',
      label: 'Insert Image',
      category: 'Insert',
      action: () => setShowImageDialog(true),
    },
    {
      id: 'toggle-focus',
      label: settings.focusMode ? 'Disable Focus Mode' : 'Enable Focus Mode',
      category: 'View',
      action: () => setSettings((prev) => ({ ...prev, focusMode: !prev.focusMode })),
    },
  ];

  const handleEditorScrollRef = useCallback((element: HTMLElement | null) => {
    if (editorScrollRef.current !== element) {
      (editorScrollRef as React.MutableRefObject<HTMLElement | null>).current = element;
    }
  }, []);

  return (
    <PageContainer variant="full" maxWidth="none" className="flex flex-col h-screen">
      <PageHeader
        icon={FileText}
        title="Markdown Editor"
        description="Create and edit Markdown files with live preview"
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="markdown-editor-filetree hidden md:block">
          <FileTree
            activeFileId={activeFileId}
            onFileSelect={handleFileSelect}
            onFileCreate={handleNewFile}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="markdown-editor-toolbar">
            <div className="flex items-center justify-between border-b bg-card">
              <Toolbar 
                editorView={editorView} 
                onInsertTable={handleInsertTable}
                onExportHTML={handleExportHTML}
                onExportPDF={handleExportPDF}
                onCopyMarkdown={handleCopyMarkdown}
                onCopyHTML={handleCopyHTML}
                onCopyPlaintext={handleCopyPlaintext}
              />
              <div className="flex items-center gap-1 p-2 border-l">
                <button
                  onClick={() => setViewMode('editor')}
                  className={`p-2 rounded hover:bg-accent ${
                    viewMode === 'editor' ? 'bg-accent' : ''
                  }`}
                  title="Editor Only"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`p-2 rounded hover:bg-accent ${
                    viewMode === 'split' ? 'bg-accent' : ''
                  }`}
                  title="Split View"
                >
                  <Split className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`p-2 rounded hover:bg-accent ${
                    viewMode === 'preview' ? 'bg-accent' : ''
                  }`}
                  title="Preview Only"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            className={`flex-1 flex flex-col md:flex-row overflow-hidden relative ${
              settings.focusMode ? 'focus-mode' : ''
            }`}
            onDrop={handleDropImage}
            onDragOver={handleDragOver}
            ref={editorContainerRef}
          >
            {(viewMode === 'editor' || viewMode === 'split') && (
              <div
                className={`h-full ${
                  viewMode === 'split' ? 'w-full md:w-1/2 border-r' : 'w-full'
                } ${settings.focusMode ? 'opacity-100' : ''}`}
              >
                <Editor
                  value={content}
                  onChange={setContent}
                  fontSize={settings.fontSize}
                  wordWrap={settings.wordWrap}
                  showLineNumbers={settings.showLineNumbers}
                  onEditorReady={setEditorView}
                  onScrollRef={handleEditorScrollRef}
                />
              </div>
            )}

            {(viewMode === 'preview' || viewMode === 'split') && (
              <div
                className={`h-full ${
                  viewMode === 'split' ? 'w-full md:w-1/2' : 'w-full'
                } ${settings.focusMode ? 'opacity-100' : ''}`}
              >
                <Preview
                  content={content}
                  editorScrollRef={editorScrollRef}
                />
              </div>
            )}
          </div>

          <StatusBar
            wordCount={wordCount}
            characterCount={characterCount}
            readingTime={readingTime}
            line={cursorLine}
            column={cursorColumn}
            fileName={activeFile?.name}
            isSaved={isSaved}
          />
        </div>
      </div>

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
      />

      {showImageDialog && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setShowImageDialog(false)}
        >
          <div
            className="bg-card border rounded-lg shadow-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Insert Image</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alt Text (optional)</label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Description of the image"
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowImageDialog(false);
                    setImageUrl('');
                    setImageAlt('');
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertImage}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg z-50 animate-fadeIn">
          {toastMessage}
        </div>
      )}
    </PageContainer>
  );
}
