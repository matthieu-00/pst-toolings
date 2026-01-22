import { parseMarkdown } from './parser';
import html2pdf from 'html2pdf.js';

export interface ExportOptions {
  theme?: 'light' | 'dark';
  includeStyles?: boolean;
  title?: string;
}

const defaultCSS = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    background: #fff;
  }
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
  }
  h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  p { margin-bottom: 1em; }
  ul, ol { margin-bottom: 1em; padding-left: 2em; }
  li { margin-bottom: 0.25em; }
  blockquote {
    border-left: 4px solid #dfe2e5;
    padding-left: 1em;
    margin: 1em 0;
    color: #6a737d;
  }
  code {
    background: #f6f8fa;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
    font-family: 'Courier New', monospace;
  }
  pre {
    background: #f6f8fa;
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1em 0;
  }
  pre code {
    background: none;
    padding: 0;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }
  th, td {
    border: 1px solid #dfe2e5;
    padding: 0.5em 1em;
    text-align: left;
  }
  th {
    background: #f6f8fa;
    font-weight: 600;
  }
  img {
    max-width: 100%;
    height: auto;
    margin: 1em 0;
  }
  a {
    color: #0366d6;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`;

const darkCSS = `
  body {
    background: #1e1e1e;
    color: #d4d4d4;
  }
  h1, h2 {
    border-bottom-color: #3e3e3e;
  }
  blockquote {
    border-left-color: #3e3e3e;
    color: #858585;
  }
  code {
    background: #252526;
    color: #ce9178;
  }
  pre {
    background: #252526;
  }
  table th, table td {
    border-color: #3e3e3e;
  }
  th {
    background: #2d2d30;
  }
  a {
    color: #4ec9b0;
  }
`;

export function exportToHTML(content: string, options: ExportOptions = {}): string {
  const { theme = 'light', includeStyles = true, title = 'Document' } = options;
  const html = parseMarkdown(content);
  const css = includeStyles ? (theme === 'dark' ? darkCSS : defaultCSS) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${includeStyles ? `<style>${css}</style>` : ''}
</head>
<body>
  ${html}
</body>
</html>`;
}

export async function exportToPDF(content: string, options: ExportOptions = {}): Promise<void> {
  const { theme = 'light', title = 'Document' } = options;
  const html = parseMarkdown(content);
  const css = theme === 'dark' ? darkCSS : defaultCSS;
  
  // Create a temporary container to render HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto; padding: 2rem;">
      ${html}
    </div>
  `;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '800px';
  tempDiv.style.background = theme === 'dark' ? '#1e1e1e' : '#fff';
  tempDiv.style.color = theme === 'dark' ? '#d4d4d4' : '#333';
  
  // Apply styles
  const styleElement = document.createElement('style');
  styleElement.textContent = css;
  tempDiv.appendChild(styleElement);
  
  document.body.appendChild(tempDiv);

  try {
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${title.replace(/\.md$/, '')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    await html2pdf().set(opt).from(tempDiv).save();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  } finally {
    document.body.removeChild(tempDiv);
  }
}

export async function copyAsMarkdown(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

export async function copyAsHTML(content: string, options: ExportOptions = {}): Promise<boolean> {
  try {
    const html = exportToHTML(content, { ...options, includeStyles: false });
    await navigator.clipboard.writeText(html);
    return true;
  } catch (error) {
    console.error('Error copying HTML to clipboard:', error);
    return false;
  }
}
