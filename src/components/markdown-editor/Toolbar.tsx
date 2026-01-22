import { EditorView } from '@codemirror/view';
import {
  Bold,
  Italic,
  Link,
  Image,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  Minus,
  Download,
  FileText,
  Clipboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExportGuard } from '@/hooks/useExportGuard';

interface ToolbarProps {
  editorView: EditorView | null;
  onInsertTable?: () => void;
  onExportHTML?: () => void;
  onExportPDF?: () => void;
  onCopyMarkdown?: () => void;
  onCopyHTML?: () => void;
  onCopyPlaintext?: () => void;
}

export function Toolbar({ editorView, onInsertTable, onExportHTML, onExportPDF, onCopyMarkdown, onCopyHTML, onCopyPlaintext }: ToolbarProps) {
  const { ExportGuard } = useExportGuard();
  const insertText = (before: string, after: string = '') => {
    if (!editorView) return;

    const selection = editorView.state.selection.main;
    const selectedText = editorView.state.sliceDoc(selection.from, selection.to);
    const replacement = `${before}${selectedText}${after}`;

    const newFrom = selection.from + before.length;
    const newTo = newFrom + selectedText.length;

    editorView.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: replacement,
      },
      selection: {
        anchor: newFrom,
        head: newTo,
      },
    });

    editorView.focus();
  };

  const toggleHeading = (level: number) => {
    if (!editorView) return;

    const selection = editorView.state.selection.main;
    const doc = editorView.state.doc;
    const line = doc.lineAt(selection.from);
    const lineText = line.text;
    
    // Match existing heading markers (1-6 # symbols followed by a space)
    const headingMatch = lineText.match(/^(#{1,6})\s+(.*)$/);
    
    if (headingMatch) {
      const existingLevel = headingMatch[1].length;
      const textAfterHeading = headingMatch[2];
      
      if (existingLevel === level) {
        // Same level - remove the heading (toggle off)
        editorView.dispatch({
          changes: {
            from: line.from,
            to: line.to,
            insert: textAfterHeading,
          },
          selection: {
            anchor: line.from + textAfterHeading.length,
          },
        });
      } else {
        // Different level - replace with new level
        const newHeading = '#'.repeat(level) + ' ';
        editorView.dispatch({
          changes: {
            from: line.from,
            to: line.to,
            insert: newHeading + textAfterHeading,
          },
          selection: {
            anchor: line.from + newHeading.length + textAfterHeading.length,
          },
        });
      }
    } else {
      // No heading - add the heading
      const newHeading = '#'.repeat(level) + ' ';
      editorView.dispatch({
        changes: {
          from: line.from,
          to: line.to,
          insert: newHeading + lineText,
        },
        selection: {
          anchor: line.from + newHeading.length + lineText.length,
        },
      });
    }

    editorView.focus();
  };

  const wrapLines = (prefix: string) => {
    if (!editorView) return;

    const selection = editorView.state.selection.main;
    const doc = editorView.state.doc;
    const fromLine = doc.lineAt(selection.from);
    const toLine = doc.lineAt(selection.to);

    let changes: { from: number; to: number; insert: string }[] = [];
    let newCursorPos = selection.from;

    for (let i = fromLine.number; i <= toLine.number; i++) {
      const line = doc.line(i);
      if (line.text.trim()) {
        changes.push({
          from: line.from,
          to: line.from,
          insert: prefix,
        });
        if (i === fromLine.number) {
          newCursorPos += prefix.length;
        }
      }
    }

    editorView.dispatch({
      changes,
      selection: { anchor: newCursorPos },
    });

    editorView.focus();
  };

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-card flex-wrap">
      {/* Headings */}
      <div className="flex items-center gap-1 border-r pr-2 mr-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleHeading(1)}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleHeading(2)}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleHeading(3)}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </Button>
      </div>

      {/* Text Formatting */}
      <div className="flex items-center gap-1 border-r pr-2 mr-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertText('**', '**')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertText('*', '*')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertText('`', '`')}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </Button>
      </div>

      {/* Links and Images */}
      <div className="flex items-center gap-1 border-r pr-2 mr-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertText('[', '](url)')}
          title="Link (Ctrl+K)"
        >
          <Link className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertText('![', '](url)')}
          title="Image"
        >
          <Image className="w-4 h-4" />
        </Button>
      </div>

      {/* Lists */}
      <div className="flex items-center gap-1 border-r pr-2 mr-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => wrapLines('- ')}
          title="Unordered List"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => wrapLines('1. ')}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => wrapLines('- [ ] ')}
          title="Checklist"
        >
          <CheckSquare className="w-4 h-4" />
        </Button>
      </div>

      {/* Other */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => wrapLines('> ')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertText('```\n', '\n```')}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </Button>
        {onInsertTable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onInsertTable}
            title="Insert Table"
          >
            <Minus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Export Options */}
      <ExportGuard>
        <div className="relative group">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <div className="absolute top-full left-0 mt-1 bg-card border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[160px]">
            {onExportHTML && (
              <button
                onClick={onExportHTML}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export HTML
              </button>
            )}
            {onExportPDF && (
              <button
                onClick={onExportPDF}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
            )}
            {onCopyHTML && (
              <button
                onClick={onCopyHTML}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              >
                <Clipboard className="w-4 h-4" />
                Copy HTML
              </button>
            )}
            {onCopyMarkdown && (
              <button
                onClick={onCopyMarkdown}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              >
                <Clipboard className="w-4 h-4" />
                Copy Markdown
              </button>
            )}
            {onCopyPlaintext && (
              <button
                onClick={onCopyPlaintext}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              >
                <Clipboard className="w-4 h-4" />
                Copy Plain Text
              </button>
            )}
          </div>
        </div>
      </ExportGuard>
    </div>
  );
}
