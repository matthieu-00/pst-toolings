import { marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { mangle } from 'marked-mangle';

// Configure marked with GFM support
marked.use(gfmHeadingId());
marked.use(mangle());

// Custom renderer extensions - using tokens
marked.use({
  renderer: {
    code(token) {
      const lang = (token.lang as string) || 'text';
      const code = token.text || '';
      return `<pre class="hljs"><code class="language-${lang}" data-language="${lang}">${code}</code></pre>`;
    },
    image(token) {
      const href = token.href || '';
      const title = token.title || '';
      const text = token.text || '';
      if (!href) return '';
      const titleAttr = title ? ` title="${title}"` : '';
      return `<img src="${href}" alt="${text}"${titleAttr} class="markdown-image" onerror="this.style.display='none';" />`;
    },
    link(token) {
      const href = token.href || '';
      const title = token.title || '';
      const text = token.text || '';
      if (!href) return text;
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

export function parseMarkdown(markdown: string): string {
  try {
    return marked.parse(markdown) as string;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return `<pre class="error">Error parsing markdown: ${error instanceof Error ? error.message : 'Unknown error'}</pre>`;
  }
}

export function sanitizeMarkdown(markdown: string): string {
  // Basic sanitization - in production, consider using DOMPurify
  return markdown;
}
