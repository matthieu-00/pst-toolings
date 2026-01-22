import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTheme } from '@/contexts/ThemeContext';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  fontSize?: number;
  wordWrap?: boolean;
  showLineNumbers?: boolean;
  onEditorReady?: (view: EditorView) => void;
  onScrollRef?: (element: HTMLElement | null) => void;
}

export function Editor({
  value,
  onChange,
  fontSize = 14,
  wordWrap = false,
  showLineNumbers = true,
  onEditorReady,
  onScrollRef,
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!editorRef.current) return;

    const fontSizeCompartment = new Compartment();
    const wordWrapCompartment = new Compartment();
    const lineNumbersCompartment = new Compartment();

    const startState = EditorState.create({
      doc: value,
      extensions: [
        markdown(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        fontSizeCompartment.of(EditorView.theme({
          '&': {
            fontSize: `${fontSize}px`,
          },
          '.cm-content': {
            padding: '1rem',
            minHeight: '100%',
            fontFamily: 'var(--font-mono), monospace',
            lineHeight: '1.6',
          },
          '.cm-scroller': {
            fontFamily: 'var(--font-mono), monospace',
          },
        })),
        wordWrapCompartment.of(wordWrap ? EditorView.lineWrapping : []),
        lineNumbersCompartment.of(showLineNumbers ? lineNumbers() : []),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            backgroundColor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
          },
          '.cm-content': {
            backgroundColor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
          },
          '.cm-editor': {
            height: '100%',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
          '.cm-gutters': {
            backgroundColor: 'hsl(var(--muted))',
            color: 'hsl(var(--muted-foreground))',
            border: 'none',
          },
          '.cm-lineNumbers .cm-lineNumber': {
            color: 'hsl(var(--muted-foreground))',
          },
          '.cm-activeLine': {
            backgroundColor: 'hsl(var(--muted) / 0.3)',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'hsl(var(--muted) / 0.3)',
          },
          '.cm-cursor': {
            borderLeftColor: 'hsl(var(--foreground))',
          },
          '.cm-selectionBackground': {
            backgroundColor: 'hsl(var(--accent) / 0.3)',
          },
        }),
        theme === 'dark' ? oneDark : [],
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;
    if (onEditorReady) {
      onEditorReady(view);
    }
    if (onScrollRef) {
      onScrollRef(view.scrollDOM);
    }

    return () => {
      view.destroy();
      viewRef.current = null;
      if (onScrollRef) {
        onScrollRef(null);
      }
    };
  }, []); // Only run once on mount

  // Update content when value prop changes externally
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value,
        },
      });
      viewRef.current.dispatch(transaction);
    }
  }, [value]);

  // Update font size, word wrap, and line numbers via CSS
  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    if (wordWrap) {
      editor.style.whiteSpace = 'pre-wrap';
    } else {
      editor.style.whiteSpace = 'pre';
    }
  }, [wordWrap]);

  return <div ref={editorRef} className="h-full w-full" />;
}
