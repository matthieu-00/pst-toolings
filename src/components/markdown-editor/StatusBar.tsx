interface StatusBarProps {
  wordCount: number;
  characterCount: number;
  readingTime: number;
  line?: number;
  column?: number;
  fileName?: string;
  isSaved?: boolean;
}

export function StatusBar({
  wordCount,
  characterCount,
  readingTime,
  line,
  column,
  fileName,
  isSaved = true,
}: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 text-xs border-t bg-card text-muted-foreground">
      <div className="flex items-center gap-4">
        {fileName && (
          <span className="font-medium text-foreground">
            {fileName} {!isSaved && <span className="text-destructive">●</span>}
          </span>
        )}
        {line !== undefined && column !== undefined && (
          <span>
            Ln {line}, Col {column}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>{wordCount.toLocaleString()} words</span>
        <span>{characterCount.toLocaleString()} characters</span>
        <span>~{readingTime} min read</span>
      </div>
    </div>
  );
}
