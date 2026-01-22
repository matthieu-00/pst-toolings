import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// Initialize highlight.js
hljs.configure({
  languages: [
    'javascript',
    'typescript',
    'python',
    'java',
    'cpp',
    'c',
    'csharp',
    'php',
    'ruby',
    'go',
    'rust',
    'swift',
    'kotlin',
    'sql',
    'html',
    'css',
    'json',
    'xml',
    'yaml',
    'markdown',
    'bash',
    'shell',
    'powershell',
    'dockerfile',
    'nginx',
    'apache',
  ],
});

export function highlightCodeBlocks(container: HTMLElement): void {
  const codeBlocks = container.querySelectorAll('pre code[data-language]');
  codeBlocks.forEach((block) => {
    const language = block.getAttribute('data-language') || 'text';
    const code = block.textContent || '';
    
    try {
      const highlighted = hljs.highlight(code, { language }).value;
      block.innerHTML = highlighted;
    } catch (error) {
      // If highlighting fails, just escape the code
      block.textContent = code;
    }
  });
}

export function highlightCode(code: string, language: string = 'text'): string {
  try {
    return hljs.highlight(code, { language }).value;
  } catch (error) {
    return hljs.highlightAuto(code).value;
  }
}
