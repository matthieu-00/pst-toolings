import { useEffect, useRef } from 'react';
import { parseMarkdown } from '@/lib/markdown/parser';
import { highlightCodeBlocks } from '@/lib/markdown/syntax-highlight';
import { useScrollSync } from '@/hooks/useScrollSync';

interface PreviewProps {
  content: string;
  editorScrollRef?: React.RefObject<HTMLElement>;
  className?: string;
}

export function Preview({ content, editorScrollRef, className = '' }: PreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  // Sync scroll with editor if provided
  useScrollSync(editorScrollRef || { current: null }, previewRef, {
    enabled: !!editorScrollRef?.current,
    smooth: true,
  });

  useEffect(() => {
    if (!previewRef.current) return;

    const html = parseMarkdown(content);
    previewRef.current.innerHTML = html;

    // Apply syntax highlighting to code blocks
    highlightCodeBlocks(previewRef.current);
  }, [content]);

  return (
    <div
      ref={previewRef}
      className={`markdown-preview h-full overflow-y-auto p-6 prose prose-sm max-w-none ${className}`}
      style={{
        fontFamily: 'var(--font-sans), sans-serif',
        lineHeight: '1.7',
        color: 'hsl(var(--foreground))',
      }}
    />
  );
}
