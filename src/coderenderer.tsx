import React, { useState, useEffect } from 'react';
import { Play, AlertCircle, Copy, Check, Upload, Terminal, Maximize2, Minimize2, RotateCcw, X, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { HelpTooltip } from '@/components/ui/help-tooltip';

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
  const [renderedComponent, setRenderedComponent] = useState(null);
  const [error, setError] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [librariesReady, setLibrariesReady] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [renderMode, setRenderMode] = useState('tsx');
  const [htmlContent, setHtmlContent] = useState(null);
  const [activeEditorTab, setActiveEditorTab] = useState('tsx');
  const [combinedCode, setCombinedCode] = useState({
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

  const addLog = (type, message) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date().toLocaleTimeString() }]);
  };

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

  const updateCombinedCode = (type, value) => {
    setCombinedCode(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const renderTSX = () => {
    if (!librariesReady && (renderMode === 'tsx' || renderMode === 'combined')) {
      setError('LOADING');
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
          setRenderedComponent(null);
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
          
          const createPlaceholder = (name) => {
            const warningLogged = {};
            return (props) => {
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
          
          const safeIcons = {};
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

        const lucideIcons = window.lucide || {};
        const loggedIcons = Object.keys(lucideIcons).length;
        
        const createPlaceholder = (name) => {
          const warningLogged = {};
          return (props) => {
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
        
        const safeIcons = {};
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
          ...safeIcons
        };

        const scopeKeys = Object.keys(scope);
        const scopeValues = Object.values(scope);

        const execFunc = new Function(...scopeKeys, wrappedCode);
        const Component = execFunc(...scopeValues);

        if (typeof Component !== 'function') {
          throw new Error('Result is not a valid component function');
        }

        addLog('success', `Component rendered successfully (${loggedIcons} icons loaded)`);
        setRenderedComponent(() => Component);
      } catch (err) {
        setError(err.message);
        addLog('error', err.message);
        console.error('Render error:', err);
      } finally {
        setIsRendering(false);
      }
    }, 100);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCode(ev.target.result);
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
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50 min-h-[60px]">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <input type="file" accept=".tsx,.ts,.jsx,.js,.txt,.html,.css" onChange={handleFileImport} className="hidden" />
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </label>
                </Button>
                <Button variant="outline" size="sm" onClick={copyCode}>
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button 
                  size="sm" 
                  onClick={renderTSX} 
                  disabled={isRendering || (!librariesReady && (renderMode === 'tsx' || renderMode === 'combined'))} 
                  className="relative"
                >
                  <Play className={`w-4 h-4 mr-2 transition-transform ${isRendering ? 'animate-spin' : ''}`} />
                  {(renderMode === 'tsx' || renderMode === 'combined') && !librariesReady ? 'Loading...' : isRendering ? 'Rendering...' : 'Render'}
                  {isRendering && <span className="absolute inset-0 bg-white/20 animate-pulse rounded" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowClearModal(true)}
                  disabled={!renderedComponent && !error && !htmlContent}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
              {renderMode === 'combined' && (
                <div className="flex gap-1 border-l pl-4 ml-4">
                  {['tsx', 'html', 'css', 'js'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveEditorTab(tab)}
                      className={`text-sm font-semibold px-4 py-1.5 rounded border transition-all ${
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
            
            <textarea
              value={renderMode === 'combined' ? combinedCode[activeEditorTab] : code}
              onChange={(e) => renderMode === 'combined' ? updateCombinedCode(activeEditorTab, e.target.value) : setCode(e.target.value)}
              className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none bg-background text-foreground border-0"
              placeholder={renderMode === 'combined' ? `Paste your ${activeEditorTab.toUpperCase()} code here...` : "Paste your code here..."}
              spellCheck={false}
            />
          </div>
        )}

        <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-card' : 'w-1/2'} flex flex-col bg-card`}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={`text-sm font-semibold px-3 py-1 rounded transition-colors ${
                  activeTab === 'preview' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`text-sm font-semibold px-3 py-1 rounded transition-colors flex items-center gap-1 ${
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
              <div className="p-4 font-display text-xs space-y-2">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground text-center py-12">No logs yet. Click "Render" to see output.</div>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex gap-2 ${
                        log.type === 'error' ? 'text-red-600' :
                        log.type === 'warn' ? 'text-yellow-600' :
                        log.type === 'success' ? 'text-green-600' :
                        'text-muted-foreground'
                      }`}
                    >
                      <span className="text-muted-foreground">[{log.timestamp}]</span>
                      <span className="font-semibold uppercase">{log.type}:</span>
                      <span>{log.message}</span>
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
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-forms allow-modals"
                title="HTML Preview"
              />
            ) : RenderedComponent ? (
              <div className="p-6 font-sans">
                <RenderedComponent />
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