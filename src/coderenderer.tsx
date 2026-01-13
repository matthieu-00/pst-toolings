import React, { useState, useEffect, useRef } from 'react';
import { Play, AlertCircle, Upload, Terminal, Maximize2, Minimize2, RotateCcw, X, Code, Download, Share2, Save, FileText, Type, WrapText, ZoomIn, ZoomOut, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { Input } from '@/components/ui/input';

interface LogEntry {
  type: string;
  message: string;
  timestamp: string;
}

interface CombinedCode {
  tsx: string;
  html: string;
  css: string;
  js: string;
}

type RenderedComponentType = (() => React.ReactElement) | null;

export default function LiveCodeRenderer() {
  const defaultCode = `export default function Demo() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">
        Hello from TSX!
      </h1>
      <p className="text-lg mb-4">Count: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90"
      >
        Increment
      </button>
    </div>
  );
}`;

  const [code, setCode] = useState(defaultCode);
  const [renderedComponent, setRenderedComponent] = useState<RenderedComponentType>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [librariesReady, setLibrariesReady] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [renderMode, setRenderMode] = useState<'tsx' | 'html' | 'combined'>('tsx');
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<'tsx' | 'html' | 'css' | 'js'>('tsx');
  const [combinedCode, setCombinedCode] = useState<CombinedCode>({
    tsx: `function HelloWorld() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Hello from TSX!</h1>
      <p>This is your React component.</p>
    </div>
  );
}`,
    html: `<div class="banner">
  <h2>HTML Content</h2>
  <p>This HTML will render above your React component.</p>
</div>`,
    css: `.banner {
  background: linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--primary)) 100%);
  color: hsl(var(--primary-foreground));
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}`,
    js: `console.log('Custom JavaScript executing!');

// Add any vanilla JS you need
window.customAlert = function() {
  alert('Hello from vanilla JS!');
};`
  });
  
  // CR-EW-01: Keyboard Shortcuts & CR-EW-06: Editor Enhancements state
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [showFindDialog, setShowFindDialog] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const [showSnippetsMenu, setShowSnippetsMenu] = useState(false);
  const [snippets, setSnippets] = useState<Record<string, { name: string; code: string; mode: 'tsx' | 'html' | 'combined' }>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prettierReady, setPrettierReady] = useState(false);

  const addLog = (type: string, message: string) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date().toLocaleTimeString() }]);
  };

  // CR-EW-01: Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/modals
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        const target = e.target as HTMLElement;
        if (target.closest('[role="dialog"]') || target.closest('.modal')) return;
        
        // Ctrl+F for find (only if not already in find dialog)
        if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !showFindDialog) {
          e.preventDefault();
          setShowFindDialog(true);
          return;
        }
        
        // Ctrl+/ to toggle comment (simple implementation)
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
          e.preventDefault();
          const textarea = textareaRef.current;
          if (!textarea) return;
          
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const currentCode = renderMode === 'combined' ? combinedCode[activeEditorTab as keyof CombinedCode] : code;
          const selectedText = currentCode.substring(start, end);
          const lines = currentCode.split('\n');
          const startLine = currentCode.substring(0, start).split('\n').length - 1;
          const endLine = currentCode.substring(0, end).split('\n').length - 1;
          
          let newCode = currentCode;
          let newStart = start;
          let newEnd = end;
          
          if (selectedText.includes('\n')) {
            // Multi-line comment toggle
            const allCommented = lines.slice(startLine, endLine + 1).every(line => line.trim().startsWith('//'));
            lines.slice(startLine, endLine + 1).forEach((line, idx) => {
              const actualIdx = startLine + idx;
              if (allCommented) {
                lines[actualIdx] = line.replace(/^(\s*)\/\/\s?/, '$1');
              } else {
                lines[actualIdx] = line.replace(/^(\s*)/, '$1// ');
              }
            });
            newCode = lines.join('\n');
            const prefixLength = lines.slice(0, startLine).join('\n').length + (startLine > 0 ? 1 : 0);
            newStart = prefixLength + lines[startLine].length - currentCode.split('\n')[startLine].length;
            newEnd = prefixLength + lines.slice(startLine, endLine + 1).join('\n').length - (endLine > startLine ? 1 : 0);
          } else {
            // Single line comment toggle
            const lineStart = currentCode.lastIndexOf('\n', start - 1) + 1;
            const lineEnd = currentCode.indexOf('\n', end);
            const line = lineEnd === -1 ? currentCode.substring(lineStart) : currentCode.substring(lineStart, lineEnd);
            const trimmed = line.trim();
            if (trimmed.startsWith('//')) {
              const newLine = line.replace(/^(\s*)\/\/\s?/, '$1');
              newCode = currentCode.substring(0, lineStart) + newLine + currentCode.substring(lineEnd === -1 ? currentCode.length : lineEnd);
              newStart = start - 2;
              newEnd = end - 2;
            } else {
              const indent = line.match(/^\s*/)?.[0] || '';
              const newLine = indent + '// ' + trimmed;
              newCode = currentCode.substring(0, lineStart) + newLine + currentCode.substring(lineEnd === -1 ? currentCode.length : lineEnd);
              newStart = start + 3;
              newEnd = end + 3;
            }
          }
          
          if (renderMode === 'combined') {
            updateCombinedCode(activeEditorTab as keyof CombinedCode, newCode);
          } else {
            setCode(newCode);
          }
          
          setTimeout(() => {
            textarea.setSelectionRange(newStart, newEnd);
            textarea.focus();
          }, 0);
          return;
        }
      }
      
      // Global shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isRendering && librariesReady) {
          renderTSX();
        }
        return;
      }
      
      if (e.key === 'Escape' && showFindDialog) {
        setShowFindDialog(false);
        setFindTerm('');
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFindDialog, renderMode, activeEditorTab, combinedCode, code, isRendering, librariesReady]);

  // CR-EW-02: Code Formatting
  const formatCode = async () => {
    const currentCode = renderMode === 'combined' ? combinedCode[activeEditorTab as keyof CombinedCode] : code;
    
    if (!prettierReady || !window.prettier) {
      // Load Prettier from CDN
      return new Promise<void>((resolve) => {
        if (window.prettier) {
          setPrettierReady(true);
          resolve();
          return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/prettier@3.0.0/standalone.js';
        script.onload = () => {
          const parserScript = document.createElement('script');
          parserScript.src = 'https://cdn.jsdelivr.net/npm/prettier@3.0.0/parser-babel.js';
          parserScript.onload = () => {
            const htmlScript = document.createElement('script');
            htmlScript.src = 'https://cdn.jsdelivr.net/npm/prettier@3.0.0/parser-html.js';
            htmlScript.onload = () => {
              const cssScript = document.createElement('script');
              cssScript.src = 'https://cdn.jsdelivr.net/npm/prettier@3.0.0/parser-postcss.js';
              cssScript.onload = () => {
                setPrettierReady(true);
                formatCode();
                resolve();
              };
              document.head.appendChild(cssScript);
            };
            document.head.appendChild(htmlScript);
          };
          document.head.appendChild(parserScript);
        };
        document.head.appendChild(script);
      });
    }
    
    try {
      let formatted = currentCode;
      if (window.prettier) {
        const parser = activeEditorTab === 'tsx' ? 'babel' : activeEditorTab === 'html' ? 'html' : activeEditorTab === 'css' ? 'css' : 'babel';
        formatted = window.prettier.format(currentCode, {
          parser,
          plugins: window.prettierPlugins ? Object.values(window.prettierPlugins) : [],
          semi: true,
          singleQuote: true,
          tabWidth: 2,
        });
      }
      
      if (renderMode === 'combined') {
        updateCombinedCode(activeEditorTab as keyof CombinedCode, formatted);
      } else {
        setCode(formatted);
      }
      addLog('success', 'Code formatted successfully');
    } catch (err) {
      addLog('error', `Formatting failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // CR-EW-04: Export Options
  const exportHTML = () => {
    if (!htmlContent && !renderedComponent) {
      addLog('error', 'Nothing to export. Please render first.');
      return;
    }
    
    let html = '';
    if (htmlContent) {
      html = htmlContent;
    } else if (renderedComponent) {
      // Create a simple HTML wrapper
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Component</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${renderMode === 'combined' ? combinedCode.tsx : code}
  </script>
</body>
</html>`;
    }
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exported-component.html';
    a.click();
    URL.revokeObjectURL(url);
    addLog('success', 'HTML exported successfully');
  };

  const exportCode = () => {
    const currentCode = renderMode === 'combined' ? combinedCode[activeEditorTab as keyof CombinedCode] : code;
    const extension = activeEditorTab === 'tsx' ? 'tsx' : activeEditorTab === 'html' ? 'html' : activeEditorTab === 'css' ? 'css' : 'js';
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('success', `Code exported as ${extension} file`);
  };

  const shareViaURL = () => {
    const currentCode = renderMode === 'combined' ? JSON.stringify(combinedCode) : code;
    const encoded = encodeURIComponent(currentCode);
    const url = `${window.location.origin}${window.location.pathname}?code=${encoded}&mode=${renderMode}`;
    navigator.clipboard.writeText(url);
    addLog('success', 'Shareable URL copied to clipboard');
  };

  // CR-EW-05: Code Snippets
  useEffect(() => {
    const saved = localStorage.getItem('code-renderer-snippets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate and filter snippets
        const validSnippets: Record<string, { name: string; code: string; mode: 'tsx' | 'html' | 'combined' }> = {};
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          if (value && typeof value === 'object' && 'name' in value && 'code' in value && 'mode' in value) {
            if (value.mode === 'tsx' || value.mode === 'html' || value.mode === 'combined') {
              validSnippets[key] = {
                name: String(value.name),
                code: String(value.code),
                mode: value.mode,
              };
            }
          }
        });
        setSnippets(validSnippets);
      } catch (e) {
        console.error('Failed to load snippets:', e);
      }
    }
  }, []);

  const saveSnippet = () => {
    const name = prompt('Enter snippet name:');
    if (!name) return;
    
    const currentCode = renderMode === 'combined' ? JSON.stringify(combinedCode) : code;
    const snippetMode: 'tsx' | 'html' | 'combined' = renderMode === 'combined' ? 'combined' : renderMode;
    const newSnippets = {
      ...snippets,
    } as Record<string, { name: string; code: string; mode: 'tsx' | 'html' | 'combined' }>;
    newSnippets[Date.now().toString()] = {
      name,
      code: currentCode,
      mode: snippetMode,
    };
    setSnippets(newSnippets);
    localStorage.setItem('code-renderer-snippets', JSON.stringify(newSnippets));
    addLog('success', `Snippet "${name}" saved`);
  };

  const loadSnippet = (snippetId: string) => {
    const snippet = snippets[snippetId];
    if (!snippet) return;
    
    if (snippet.mode === 'combined') {
      try {
        const parsed = JSON.parse(snippet.code);
        setCombinedCode(parsed);
        setRenderMode('combined');
      } catch {
        addLog('error', 'Failed to load snippet');
      }
    } else {
      setCode(snippet.code);
      setRenderMode(snippet.mode);
    }
    setShowSnippetsMenu(false);
    addLog('success', `Snippet "${snippet.name}" loaded`);
  };

  const deleteSnippet = (snippetId: string) => {
    const newSnippets = { ...snippets };
    delete newSnippets[snippetId];
    setSnippets(newSnippets);
    localStorage.setItem('code-renderer-snippets', JSON.stringify(newSnippets));
    addLog('success', 'Snippet deleted');
  };

  // Load code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    const modeParam = params.get('mode') as 'tsx' | 'html' | 'combined' | null;
    if (codeParam) {
      try {
        const decoded = decodeURIComponent(codeParam);
        if (modeParam === 'combined') {
          const parsed = JSON.parse(decoded);
          setCombinedCode(parsed);
          setRenderMode('combined');
        } else {
          setCode(decoded);
          setRenderMode(modeParam || 'tsx');
        }
      } catch (e) {
        console.error('Failed to load code from URL:', e);
      }
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.group') && !target.closest('[data-snippets-menu]')) {
        setShowSnippetsMenu(false);
      }
    };
    if (showSnippetsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showSnippetsMenu]);

  const handleClearRender = () => {
    // Remove any injected CSS from Combined mode
    const injectedStyles = document.head.querySelectorAll('[data-combined-css]');
    injectedStyles.forEach(style => style.remove());
    
    setCode(defaultCode);
    setCombinedCode({
      tsx: defaultCode,
      html: '',
      css: '',
      js: ''
    });
    setRenderedComponent(null);
    setHtmlContent(null);
    setError(null);
    setLogs([]);
    setActiveTab('preview');
    setActiveEditorTab('tsx');
    setRenderMode('tsx');
    setShowClearModal(false);
  };

  const updateCombinedCode = (type: keyof CombinedCode, value: string) => {
    setCombinedCode(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const renderTSX = () => {
    if (!librariesReady && (renderMode === 'tsx' || renderMode === 'combined')) {
      setError('LOADING' as string);
      return;
    }
    
    // Clean up any previously injected CSS from Combined mode
    const injectedStyles = document.head.querySelectorAll('[data-combined-css]');
    injectedStyles.forEach(style => style.remove());
    
    // Always clear htmlContent and renderedComponent at start to ensure clean slate
    setHtmlContent(null);
    setRenderedComponent(null);
    
    setError(null);
    setLogs([]);
    setActiveTab('preview');
    setIsRendering(true);
    
    addLog('info', `Starting ${renderMode.toUpperCase()} render...`);
    
    setTimeout(() => {
      try {
        if (renderMode === 'html') {
          addLog('info', 'Rendering HTML/CSS/JS in isolated container');
          setHtmlContent(code);
          setRenderedComponent(null as RenderedComponentType);
          addLog('success', 'HTML rendered successfully');
          setIsRendering(false);
          return;
        }

        if (renderMode === 'combined') {
          addLog('info', 'Rendering combined TSX with embedded HTML/CSS/JS');
          
          if (!window.Babel) {
            throw new Error('Babel not loaded');
          }

          let processedTsx = combinedCode.tsx.trim().split('\n')
            .filter(line => !line.trim().startsWith('import '))
            .map(line => line.trim().startsWith('export default') ? line.replace('export default', '') : line)
            .join('\n');

          if (combinedCode.css || combinedCode.js || combinedCode.html) {
            processedTsx = `
              ${processedTsx}
              
              ${combinedCode.css ? `
              const styleElement = document.createElement('style');
              styleElement.textContent = \`${combinedCode.css.replace(/`/g, '\\`')}\`;
              if (!document.head.querySelector('[data-combined-css]')) {
                styleElement.setAttribute('data-combined-css', 'true');
                document.head.appendChild(styleElement);
              }
              ` : ''}
              
              ${combinedCode.js ? `
              try {
                ${combinedCode.js}
              } catch (e) {
                console.error('Custom JS error:', e);
              }
              ` : ''}
            `;
          }

          const transformed = window.Babel.transform(processedTsx, {
            presets: ['react'],
            filename: 'component.tsx'
          }).code;

          const lucideIcons = window.lucide || {};
          const loggedIcons = Object.keys(lucideIcons).length;
          
          const createPlaceholder = (name: string) => {
            const warningLogged: Record<string, boolean> = {};
            return (props: Record<string, any>) => {
              if (!warningLogged[name]) {
                console.warn(`Icon "${name}" not available in lucide`);
                warningLogged[name] = true;
              }
              return React.createElement('span', { ...props, title: `${name} icon` }, '◻');
            };
          };
          
          const commonIcons = [
            'Search', 'Plus', 'Minus', 'Play', 'AlertCircle', 'Copy', 'Check', 
            'Upload', 'ExternalLink', 'MessageSquare', 'X', 'Info', 'Camera',
            'Download', 'Edit', 'Trash', 'Settings', 'Menu', 'ChevronDown',
            'ChevronUp', 'ChevronLeft', 'ChevronRight', 'Star', 'Heart'
          ];
          
          const safeIcons: Record<string, React.ComponentType<any>> = {};
          commonIcons.forEach(iconName => {
            safeIcons[iconName] = lucideIcons[iconName] || createPlaceholder(iconName);
          });
          
          Object.keys(lucideIcons).forEach(iconName => {
            if (!safeIcons[iconName]) {
              safeIcons[iconName] = lucideIcons[iconName];
            }
          });
          
          const wrappedCode = `
            ${transformed}
            
            const code = ${JSON.stringify(transformed)};
            const constMatch = code.match(/const\\s+([A-Z][a-zA-Z0-9]*)\\s*=/);
            const functionMatch = code.match(/function\\s+([A-Z][a-zA-Z0-9]*)\\s*\\(/);
            
            const componentName = constMatch?.[1] || functionMatch?.[1];
            
            if (componentName) {
              try {
                return eval(componentName);
              } catch (e) {
                throw new Error('Component found but could not be evaluated: ' + componentName + '. Error: ' + e.message);
              }
            }
            
            throw new Error('No component found in TSX tab. Make sure your component name starts with a capital letter.');
          `;

          const scope = {
            React,
            useState: React.useState,
            useEffect: React.useEffect,
            useCallback: React.useCallback,
            useMemo: React.useMemo,
            useRef: React.useRef,
            useContext: React.useContext,
            useReducer: React.useReducer,
            ...safeIcons
          };

          const scopeKeys = Object.keys(scope);
          const scopeValues = Object.values(scope);

          const execFunc = new Function(...scopeKeys, wrappedCode);
          const Component = execFunc(...scopeValues);

          if (typeof Component !== 'function') {
            throw new Error('Result is not a valid component function');
          }

          if (combinedCode.html) {
            const WrappedComponent = () => {
              return React.createElement('div', null, [
                React.createElement('div', { 
                  key: 'html',
                  dangerouslySetInnerHTML: { __html: combinedCode.html }
                }),
                React.createElement(Component, { key: 'component' })
              ]);
            };
            
            addLog('success', `Combined component rendered (${loggedIcons} icons, HTML, CSS, JS included)`);
            setRenderedComponent(() => WrappedComponent);
          } else {
            addLog('success', `Combined component rendered (${loggedIcons} icons, CSS, JS included)`);
            setRenderedComponent(() => Component);
          }
          
          setHtmlContent(null);
          setIsRendering(false);
          return;
        }

        if (!window.Babel) {
          throw new Error('Babel not loaded');
        }

        let processedCode = code.trim().split('\n')
          .filter(line => !line.trim().startsWith('import '))
          .map(line => line.trim().startsWith('export default') ? line.replace('export default', '') : line)
          .join('\n');

        const transformed = window.Babel.transform(processedCode, {
          presets: ['react'],
          filename: 'component.tsx'
        }).code;

        const lucideIcons2 = window.lucide || {};
        const loggedIcons2 = Object.keys(lucideIcons2).length;
        
        const createPlaceholder2 = (name: string) => {
          const warningLogged: Record<string, boolean> = {};
          return (props: Record<string, any>) => {
            if (!warningLogged[name]) {
              console.warn(`Icon "${name}" not available in lucide`);
              warningLogged[name] = true;
            }
            return React.createElement('span', { ...props, title: `${name} icon` }, '◻');
          };
        };
        
        const commonIcons2 = [
          'Search', 'Plus', 'Minus', 'Play', 'AlertCircle', 'Copy', 'Check', 
          'Upload', 'ExternalLink', 'MessageSquare', 'X', 'Info', 'Camera',
          'Download', 'Edit', 'Trash', 'Settings', 'Menu', 'ChevronDown',
          'ChevronUp', 'ChevronLeft', 'ChevronRight', 'Star', 'Heart'
        ];
        
        const safeIcons2: Record<string, React.ComponentType<any>> = {};
        commonIcons2.forEach(iconName => {
          safeIcons2[iconName] = lucideIcons2[iconName] || createPlaceholder2(iconName);
        });
        
        Object.keys(lucideIcons2).forEach(iconName => {
          if (!safeIcons2[iconName]) {
            safeIcons2[iconName] = lucideIcons2[iconName];
          }
        });
        
        const wrappedCode = `
          ${transformed}
          
          const code = ${JSON.stringify(transformed)};
          const constMatch = code.match(/const\\s+([A-Z][a-zA-Z0-9]*)\\s*=/);
          const functionMatch = code.match(/function\\s+([A-Z][a-zA-Z0-9]*)\\s*\\(/);
          
          const componentName = constMatch?.[1] || functionMatch?.[1];
          
          if (componentName) {
            try {
              return eval(componentName);
            } catch (e) {
              throw new Error('Component found but could not be evaluated: ' + componentName + '. Error: ' + e.message);
            }
          }
          
          throw new Error('No component found. Make sure your component name starts with a capital letter.');
        `;

        const scope = {
          React,
          useState: React.useState,
          useEffect: React.useEffect,
          useCallback: React.useCallback,
          useMemo: React.useMemo,
          useRef: React.useRef,
          useContext: React.useContext,
          useReducer: React.useReducer,
          ...safeIcons2
        };

        const scopeKeys = Object.keys(scope);
        const scopeValues = Object.values(scope);

        const execFunc = new Function(...scopeKeys, wrappedCode);
        const Component = execFunc(...scopeValues);

        if (typeof Component !== 'function') {
          throw new Error('Result is not a valid component function');
        }

        addLog('success', `Component rendered successfully (${loggedIcons2} icons loaded)`);
        setRenderedComponent(() => Component);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        addLog('error', errorMessage);
        console.error('Render error:', err);
      } finally {
        setIsRendering(false);
      }
    }, 100);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        if (ev.target?.result && typeof ev.target.result === 'string') {
          setCode(ev.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    let babelReady = false;
    let lucideReady = false;

    const checkReady = () => {
      if (babelReady && lucideReady) {
        setLibrariesReady(true);
        setInitialLoading(false);
        setError(null);
      }
    };

    if (window.Babel) {
      babelReady = true;
      checkReady();
    } else {
      const babelScript = document.createElement('script');
      babelScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js';
      babelScript.onload = () => {
        babelReady = true;
        checkReady();
      };
      babelScript.onerror = () => {
        console.error('Failed to load Babel');
        setInitialLoading(false);
      };
      document.head.appendChild(babelScript);
    }

    if (window.lucide || window.lucideReact) {
      window.lucideReact = window.lucide || window.lucideReact;
      lucideReady = true;
      checkReady();
    } else {
      const lucideScript = document.createElement('script');
      lucideScript.src = 'https://unpkg.com/lucide@0.263.1/dist/umd/lucide.js';
      lucideScript.onload = () => {
        window.lucideReact = window.lucide;
        lucideReady = true;
        checkReady();
      };
      lucideScript.onerror = () => {
        console.warn('Failed to load lucide, continuing without it');
        lucideReady = true;
        checkReady();
      };
      document.head.appendChild(lucideScript);
    }

    if (babelReady && lucideReady) {
      checkReady();
    }
  }, []);

  const RenderedComponent = renderedComponent;

  const helpContent = (
    <div className="space-y-6 text-sm">
      {/* Overview */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Overview
        </h3>
        <p className="text-foreground mb-2">
          Render TSX, HTML/CSS/JS, or combined code live in your browser. Test React components, static HTML, or full web pages with instant preview and debugging capabilities.
        </p>
      </div>

      {/* Render Modes */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Render Modes
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-foreground mb-1 font-medium">TSX Mode:</p>
            <div className="text-muted-foreground text-xs space-y-1">
              <p>• Write React components with hooks (useState, useEffect, etc.)</p>
              <p>• Full React functionality with JSX syntax</p>
              <p>• Babel and Lucide React icons loaded automatically</p>
            </div>
          </div>
          <div>
            <p className="text-foreground mb-1 font-medium">HTML Mode:</p>
            <div className="text-muted-foreground text-xs space-y-1">
              <p>• Render static HTML content</p>
              <p>• Perfect for testing HTML structure and layout</p>
            </div>
          </div>
          <div>
            <p className="text-foreground mb-1 font-medium">Combined Mode:</p>
            <div className="text-muted-foreground text-xs space-y-1">
              <p>• Combine HTML, CSS, JavaScript, and TSX together</p>
              <p>• HTML renders above the React component</p>
              <p>• CSS styles apply globally</p>
              <p>• JavaScript executes before component render</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Workflow
        </h3>
        <p className="text-foreground mb-2">
          Write your code and render it instantly.
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• Select your render mode (TSX, HTML, or Combined)</p>
          <p>• Write or paste your code in the editor</p>
          <p>• Click "Render" to see live preview</p>
          <p>• Check the Logs tab for console output and errors</p>
          <p>• Use fullscreen mode for better viewing</p>
        </div>
      </div>

      {/* Features */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Features
        </h3>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• Console logs captured and displayed in Logs tab</p>
          <p>• Fullscreen mode for immersive preview</p>
          <p>• Clear button to reset code and preview</p>
          <p>• Copy button to copy rendered code</p>
          <p>• Error messages displayed clearly when rendering fails</p>
          <p>• Tab-based editor for Combined mode (HTML, CSS, JS, TSX)</p>
        </div>
      </div>

      {/* Visual Indicators */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Visual Indicators
        </h3>
        <p className="text-foreground mb-2">
          Log types in the Logs tab:
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• <span className="text-red-600 dark:text-red-400">Error</span> - Red: Runtime errors and exceptions</p>
          <p>• <span className="text-yellow-600 dark:text-yellow-400">Warning</span> - Yellow: Warnings and deprecations</p>
          <p>• <span className="text-green-600 dark:text-green-400">Success</span> - Green: Successful operations</p>
          <p>• Info - Default: General console.log messages</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b px-6 py-4 bg-card">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            icon={Code}
            title="Live Code Renderer"
            description="Render TSX, HTML/CSS/JS, or combined code live in your browser"
          />
          <HelpTooltip
            content={helpContent}
            variant="modal"
            icon="info"
          />
        </div>
        
        <div className="flex gap-2 mt-3">
          <span className="text-xs text-muted-foreground self-center mr-2">Render Mode:</span>
          <button
            onClick={() => setRenderMode('tsx')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              renderMode === 'tsx' 
                ? 'bg-accent text-accent-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            TSX
          </button>
          <button
            onClick={() => setRenderMode('html')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              renderMode === 'html' 
                ? 'bg-blue-600 text-white' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            HTML/CSS/JS
          </button>
          <button
            onClick={() => setRenderMode('combined')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              renderMode === 'combined' 
                ? 'bg-accent text-accent-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Combined
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {!isFullscreen && (
          <div className="w-1/2 flex flex-col border-r bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50 min-h-[60px] flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                {/* Import */}
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <input type="file" accept=".tsx,.ts,.jsx,.js,.txt,.html,.css" onChange={handleFileImport} className="hidden" />
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </label>
                </Button>
                
                {/* Clear */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowClearModal(true)}
                  disabled={!renderedComponent && !error && !htmlContent}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                
                {/* Format */}
                <Button variant="outline" size="sm" onClick={formatCode} title="Format code">
                  <Type className="w-4 h-4 mr-2" />
                  Format
                </Button>
                
                {/* Export Options */}
                <div className="relative group">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <div className="absolute top-full left-0 mt-1 bg-card border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[160px]">
                    <button
                      onClick={exportHTML}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Export HTML
                    </button>
                    <button
                      onClick={exportCode}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <Code className="w-4 h-4" />
                      Export Code
                    </button>
                    <button
                      onClick={shareViaURL}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Share URL
                    </button>
                  </div>
                </div>
                
                {/* Code Snippets */}
                <div className="relative group" data-snippets-menu>
                  <Button variant="outline" size="sm" onClick={() => setShowSnippetsMenu(!showSnippetsMenu)}>
                    <Save className="w-4 h-4 mr-2" />
                    Snippets
                  </Button>
                  {showSnippetsMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-card border rounded-md shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto" data-snippets-menu>
                      <div className="px-3 py-2 border-b flex items-center justify-between">
                        <span className="text-sm font-semibold">Snippets</span>
                        <button
                          onClick={saveSnippet}
                          className="text-xs text-accent hover:underline"
                        >
                          + Save Current
                        </button>
                      </div>
                      {Object.keys(snippets).length === 0 ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                          No snippets saved
                        </div>
                      ) : (
                        Object.entries(snippets).map(([id, snippet]) => (
                          <div key={id} className="px-3 py-2 hover:bg-muted flex items-center justify-between group/item">
                            <button
                              onClick={() => loadSnippet(id)}
                              className="flex-1 text-left text-sm"
                            >
                              {snippet.name}
                            </button>
                            <button
                              onClick={() => deleteSnippet(id)}
                              className="opacity-0 group-hover/item:opacity-100 text-destructive hover:text-destructive/80"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                {/* Render - moved to end */}
                <Button 
                  size="sm" 
                  onClick={renderTSX} 
                  disabled={isRendering || (!librariesReady && (renderMode === 'tsx' || renderMode === 'combined'))} 
                  className="relative"
                  title="Ctrl+S / Cmd+S"
                >
                  <Play className={`w-4 h-4 mr-2 transition-transform ${isRendering ? 'animate-spin' : ''}`} />
                  {(renderMode === 'tsx' || renderMode === 'combined') && !librariesReady ? 'Loading...' : isRendering ? 'Rendering...' : 'Render'}
                  {isRendering && <span className="absolute inset-0 bg-white/20 animate-pulse rounded" />}
                </Button>
                
                {/* Settings - Editor Enhancements */}
                <div className="relative group">
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                  <div className="absolute top-full left-0 mt-1 bg-card border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[200px]">
                    <button
                      onClick={() => setShowLineNumbers(!showLineNumbers)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 ${showLineNumbers ? 'bg-accent/10' : ''}`}
                    >
                      <FileText className="w-4 h-4" />
                      Line Numbers {showLineNumbers ? '✓' : ''}
                    </button>
                    <button
                      onClick={() => setWordWrap(!wordWrap)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 ${wordWrap ? 'bg-accent/10' : ''}`}
                    >
                      <WrapText className="w-4 h-4" />
                      Word Wrap {wordWrap ? '✓' : ''}
                    </button>
                    <div className="px-3 py-2 text-sm border-t border-border">
                      <div className="text-xs text-muted-foreground mb-1">Font Size</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFontSize(Math.max(10, fontSize - 2))}
                          className="p-1 hover:bg-muted rounded"
                          title="Decrease font size"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-muted-foreground min-w-[40px] text-center">{fontSize}px</span>
                        <button
                          onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                          className="p-1 hover:bg-muted rounded"
                          title="Increase font size"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowFindDialog(true)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 border-t border-border"
                    >
                      <Search className="w-4 h-4" />
                      Find (Ctrl+F)
                    </button>
                  </div>
                </div>
              </div>
              {renderMode === 'combined' && (
                <div className="flex gap-1 border-l pl-4 ml-4 relative">
                  {(['tsx', 'html', 'css', 'js'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveEditorTab(tab)}
                      className={`text-sm font-semibold px-4 py-1.5 rounded border transition-all duration-300 relative ${
                        activeEditorTab === tab
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:border-blue-400 hover:text-foreground'
                      }`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* CR-EW-03: Line Numbers & CR-EW-06: Editor Enhancements */}
            <div className="flex-1 flex overflow-hidden relative">
              {showLineNumbers && (
                <div 
                  className="bg-muted/30 text-muted-foreground text-xs font-mono py-4 px-2 select-none border-r"
                  style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.5}px` }}
                >
                  {(() => {
                    const currentCode = renderMode === 'combined' ? combinedCode[activeEditorTab as keyof CombinedCode] : code;
                    const lines = currentCode.split('\n');
                    return lines.map((_, i) => (
                      <div key={i} style={{ height: `${fontSize * 1.5}px` }} className="text-right pr-2">
                        {i + 1}
                      </div>
                    ));
                  })()}
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={renderMode === 'combined' ? combinedCode[activeEditorTab as keyof CombinedCode] : code}
                onChange={(e) => renderMode === 'combined' ? updateCombinedCode(activeEditorTab as keyof CombinedCode, e.target.value) : setCode(e.target.value)}
                className="flex-1 p-4 font-mono resize-none focus:outline-none bg-background text-foreground border-0"
                style={{ 
                  fontSize: `${fontSize}px`,
                  lineHeight: `${fontSize * 1.5}px`,
                  whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                  overflowWrap: wordWrap ? 'break-word' : 'normal'
                }}
                placeholder={renderMode === 'combined' ? `Paste your ${activeEditorTab.toUpperCase()} code here...` : "Paste your code here..."}
                spellCheck={false}
              />
            </div>
            
            {/* CR-EW-01: Find Dialog */}
            {showFindDialog && (
              <div className="absolute top-16 left-4 right-4 bg-card border rounded-md shadow-lg p-3 z-50 flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={findTerm}
                  onChange={(e) => setFindTerm(e.target.value)}
                  placeholder="Find in code..."
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowFindDialog(false);
                      setFindTerm('');
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => {
                  if (findTerm && textareaRef.current) {
                    const currentCode = renderMode === 'combined' ? combinedCode[activeEditorTab as keyof CombinedCode] : code;
                    const index = currentCode.indexOf(findTerm);
                    if (index !== -1) {
                      textareaRef.current.setSelectionRange(index, index + findTerm.length);
                      textareaRef.current.focus();
                      textareaRef.current.scrollIntoView({ block: 'center' });
                    }
                  }
                }}>
                  Find
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setShowFindDialog(false);
                  setFindTerm('');
                }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-card' : 'w-1/2'} flex flex-col bg-card`}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={`text-sm font-semibold px-3 py-1 rounded transition-all duration-300 ${
                  activeTab === 'preview' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`text-sm font-semibold px-3 py-1 rounded transition-all duration-300 flex items-center gap-1 ${
                  activeTab === 'logs' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Terminal className="w-3 h-3" />
                Logs {logs.length > 0 && `(${logs.length})`}
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 mr-2" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Fullscreen
                </>
              )}
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            {activeTab === 'logs' ? (
              <div className="p-4 font-display text-xs space-y-2 animate-fadeIn">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground text-center py-12">No logs yet. Click "Render" to see output.</div>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex gap-2 animate-fadeIn`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <span className={`${
                        log.type === 'error' ? 'text-red-600' :
                        log.type === 'warn' ? 'text-yellow-600' :
                        log.type === 'success' ? 'text-green-600' :
                        'text-muted-foreground'
                      }`}>
                        <span className="text-muted-foreground">[{log.timestamp}]</span>
                        <span className="font-semibold uppercase">{log.type}:</span>
                        <span>{log.message}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : initialLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-muted-foreground">Loading libraries...</p>
                </div>
              </div>
            ) : error === 'LOADING' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-400 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-muted-foreground">Libraries still loading. Please wait a moment...</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">Render Error</div>
                    <pre className="text-xs whitespace-pre-wrap font-mono mt-2">{error}</pre>
                  </AlertDescription>
                </Alert>
              </div>
            ) : isRendering ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-muted-foreground">Rendering component...</p>
                </div>
              </div>
            ) : htmlContent ? (
              <iframe
                srcDoc={htmlContent}
                className="w-full h-full border-0 animate-fadeIn"
                sandbox="allow-scripts allow-forms allow-modals"
                title="HTML Preview"
              />
            ) : RenderedComponent && typeof RenderedComponent === 'function' ? (
              <div className="p-6 font-sans animate-fadeIn">
                {React.createElement(RenderedComponent)}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center max-w-md px-4">
                  <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-semibold mb-2">Click "Render" to preview your code</p>
                  {renderMode === 'tsx' && (
                    <p className="text-xs">Paste React/TSX component code in the editor and click Render to see it live.</p>
                  )}
                  {renderMode === 'html' && (
                    <p className="text-xs">Paste complete HTML with inline &lt;style&gt; and &lt;script&gt; tags, then click Render.</p>
                  )}
                  {renderMode === 'combined' && (
                    <div className="text-xs space-y-2">
                      <p className="font-semibold">How Combined mode works:</p>
                      <p className="text-left">Use the tabs above the editor to switch between file types. Add code to any tab you need:</p>
                      <ul className="text-left space-y-1 ml-4">
                        <li>• <strong>TSX:</strong> React component (required)</li>
                        <li>• <strong>HTML:</strong> Static markup (optional)</li>
                        <li>• <strong>CSS:</strong> Styles (optional)</li>
                        <li>• <strong>JS:</strong> Vanilla JavaScript (optional)</li>
                      </ul>
                      <p className="mt-2">All tabs combine when you click Render!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card variant="elevated" padding="lg" className="max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Clear Renderer?</h3>
              <button
                onClick={() => setShowClearModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will reset the code editor to the demo component and clear the rendered preview. Your current code will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowClearModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClearRender}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear & Reset
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="border-t px-6 py-3 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <strong>Tip:</strong> {renderMode === 'tsx' 
            ? 'Import statements are automatically stripped. React hooks and lucide-react icons are available globally.' 
            : renderMode === 'html'
            ? 'Paste complete HTML with inline <style> and <script> tags for wireframing and prototypes.'
            : 'Use tabs to organize TSX components alongside HTML structure, CSS styles, and JavaScript. All files combine on render.'}
        </p>
      </div>
    </div>
  );
}