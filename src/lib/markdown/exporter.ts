import { parseMarkdown } from './parser';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
  
  // Validate content
  if (!html || html.trim().length === 0) {
    throw new Error('No content to export to PDF');
  }
  
  // Create a temporary container to render HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto; padding: 2rem; background: ${theme === 'dark' ? '#1e1e1e' : '#fff'}; color: ${theme === 'dark' ? '#d4d4d4' : '#333'};">
      ${html}
    </div>
  `;
  
  // Position off-screen but keep visible - html2canvas CANNOT capture visibility:hidden elements
  tempDiv.style.position = 'absolute';
  tempDiv.style.top = '0';
  tempDiv.style.left = '-10000px'; // Off-screen but still "visible"
  tempDiv.style.width = '800px';
  tempDiv.style.height = 'auto';
  tempDiv.style.background = theme === 'dark' ? '#1e1e1e' : '#fff';
  tempDiv.style.color = theme === 'dark' ? '#d4d4d4' : '#333';
  tempDiv.style.visibility = 'visible'; // MUST be visible for html2canvas
  tempDiv.style.opacity = '1'; // MUST be opaque for html2canvas
  tempDiv.style.display = 'block';
  tempDiv.style.pointerEvents = 'none';
  tempDiv.style.zIndex = '-1';
  
  // Apply styles
  const styleElement = document.createElement('style');
  styleElement.textContent = css;
  tempDiv.appendChild(styleElement);
  
  document.body.appendChild(tempDiv);

  try {
    // Wait for DOM to be fully rendered and styles applied
    // Use double requestAnimationFrame to ensure rendering is complete
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
    
    // Additional small delay to ensure fonts and images are loaded
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    
    // Validate element has content and dimensions
    const contentDiv = tempDiv.querySelector('div');
    if (!contentDiv) {
      throw new Error('Failed to create PDF content container');
    }
    
    // Force layout recalculation by accessing offsetHeight
    const initialHeight = contentDiv.offsetHeight;
    const initialWidth = contentDiv.offsetWidth;
    const textContent = contentDiv.textContent || '';
    
    // Check if element has been rendered (has dimensions)
    if (initialHeight === 0 && initialWidth === 0) {
      // Give it one more render cycle
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
    }
    
    // Generate canvas using html2canvas directly
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      scrollY: 0,
      scrollX: 0,
      windowWidth: 800,
      windowHeight: contentDiv.scrollHeight || Math.max(initialHeight, 1200),
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
      onclone: (clonedDoc: Document, element: HTMLElement) => {
        // Apply styles to the cloned document FIRST, before any other operations
        const clonedStyle = clonedDoc.createElement('style');
        clonedStyle.textContent = css;
        clonedDoc.head.appendChild(clonedStyle);
        
        // Ensure the cloned document's body and html have proper styling
        const clonedBody = clonedDoc.body;
        const clonedHtml = clonedDoc.documentElement;
        
        if (clonedBody) {
          clonedBody.style.margin = '0';
          clonedBody.style.padding = '0';
          clonedBody.style.background = theme === 'dark' ? '#1e1e1e' : '#fff';
          clonedBody.style.color = theme === 'dark' ? '#d4d4d4' : '#333';
          clonedBody.style.width = '800px';
          clonedBody.style.minHeight = '100vh';
        }
        
        if (clonedHtml) {
          clonedHtml.style.margin = '0';
          clonedHtml.style.padding = '0';
          clonedHtml.style.background = theme === 'dark' ? '#1e1e1e' : '#fff';
          clonedHtml.style.width = '800px';
        }
        
        // Ensure the cloned element has proper visibility and dimensions
        // Make it fully visible for html2canvas
        element.style.position = 'relative';
        element.style.top = '0';
        element.style.left = '0';
        element.style.visibility = 'visible';
        element.style.opacity = '1';
        element.style.display = 'block';
        element.style.width = '800px';
        element.style.height = 'auto';
        element.style.background = theme === 'dark' ? '#1e1e1e' : '#fff';
        element.style.color = theme === 'dark' ? '#d4d4d4' : '#333';
        element.style.minHeight = '1px';
        element.style.overflow = 'visible';
        element.style.pointerEvents = 'auto';
        
        // Find the content div in the cloned document and ensure it has proper styling
        const clonedContentDiv = element.querySelector('div');
        if (clonedContentDiv) {
          clonedContentDiv.style.display = 'block';
          clonedContentDiv.style.visibility = 'visible';
          clonedContentDiv.style.position = 'relative';
          clonedContentDiv.style.width = '100%';
          clonedContentDiv.style.background = theme === 'dark' ? '#1e1e1e' : '#fff';
          clonedContentDiv.style.color = theme === 'dark' ? '#d4d4d4' : '#333';
          clonedContentDiv.style.minHeight = '1px';
          
          // Ensure all text elements have explicit colors and are visible
          const allTextElements = clonedContentDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, div, a, pre, code, blockquote, strong, em, b, i');
          allTextElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            // Set color if not already set
            if (!htmlEl.style.color || htmlEl.style.color === 'transparent' || htmlEl.style.color === 'rgba(0, 0, 0, 0)') {
              htmlEl.style.color = theme === 'dark' ? '#d4d4d4' : '#333';
            }
            // Ensure visibility
            htmlEl.style.visibility = 'visible';
            htmlEl.style.display = htmlEl.style.display || 'block';
            // Remove any opacity that might hide content
            if (htmlEl.style.opacity === '0') {
              htmlEl.style.opacity = '1';
            }
          });
          
          // Ensure images are visible
          const images = clonedContentDiv.querySelectorAll('img');
          images.forEach((img) => {
            const htmlImg = img as HTMLImageElement;
            htmlImg.style.visibility = 'visible';
            htmlImg.style.display = htmlImg.style.display || 'block';
            if (htmlImg.style.opacity === '0') {
              htmlImg.style.opacity = '1';
            }
          });
          
          // Force layout recalculation by accessing multiple properties
          void clonedContentDiv.offsetHeight;
          void clonedContentDiv.scrollHeight;
          void clonedContentDiv.clientHeight;
        }
      }
    });

    // Get canvas dimensions
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A4 dimensions in mm
    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm
    const margin = 10; // 10mm margin on all sides

    // Calculate available space for content
    const contentWidth = pdfWidth - (margin * 2);
    const contentHeight = pdfHeight - (margin * 2);

    // Calculate scaling to fit width while maintaining aspect ratio
    // Convert pixels to mm: at scale 2, 1px = 0.264583mm (96dpi / 25.4mm per inch / 2 scale)
    const pxToMm = 0.264583;
    const imgWidthMm = imgWidth * pxToMm;
    const imgHeightMm = imgHeight * pxToMm;
    
    // Scale to fit content width
    const scale = contentWidth / imgWidthMm;
    const scaledWidth = imgWidthMm * scale;
    const scaledHeight = imgHeightMm * scale;

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Convert canvas to image data URL
    const imgData = canvas.toDataURL('image/png', 1.0);

    // Handle multi-page if content is taller than one page
    if (scaledHeight <= contentHeight) {
      // Single page - content fits on one page
      pdf.addImage(imgData, 'PNG', margin, margin, scaledWidth, scaledHeight);
    } else {
      // Multi-page - split content across multiple pages
      // For each page, we show a portion of the image by using negative y position
      const totalPages = Math.ceil(scaledHeight / contentHeight);
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        // Calculate the y offset to show the correct portion of the image
        // Negative y positions shift the image up to show lower portions
        const yOffset = -(page * contentHeight);
        
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          margin + yOffset,
          scaledWidth,
          scaledHeight
        );
      }
    }

    // Save PDF
    pdf.save(`${title.replace(/\.md$/, '')}.pdf`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error exporting to PDF:', errorMessage, error);
    throw new Error(`Failed to export PDF: ${errorMessage}`);
  } finally {
    // Clean up: remove the temporary element
    if (tempDiv.parentNode) {
      document.body.removeChild(tempDiv);
    }
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
