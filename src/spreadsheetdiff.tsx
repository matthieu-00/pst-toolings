import { useState, useMemo } from 'react';
import { Download, AlertCircle, X, FileSpreadsheet, BarChart3, Filter } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { Button } from '@/components/ui/button';

type SpreadsheetRow = Record<string, string | number | null | undefined>;

export default function SpreadsheetComparator() {
  const [data1, setData1] = useState<SpreadsheetRow[] | null>(null);
  const [data2, setData2] = useState<SpreadsheetRow[] | null>(null);
  const [headers1, setHeaders1] = useState<string[]>([]);
  const [headers2, setHeaders2] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [hideIdentical, setHideIdentical] = useState(false);
  const [colLetters1, setColLetters1] = useState<string[]>([]);
  const [colLetters2, setColLetters2] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>([]);
  
  // SD-EW-01, SD-EW-02, SD-EW-03, SD-EW-05: New state for easy wins
  const [viewMode, setViewMode] = useState<'column' | 'sidebyside'>('column');
  const [filterType, setFilterType] = useState<'all' | 'added' | 'removed' | 'changed'>('all');
  const [diffThreshold, setDiffThreshold] = useState<number>(0);
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);
  const [ignoredColumns, setIgnoredColumns] = useState<Set<string>>(new Set());
  const [showStats, setShowStats] = useState(true);

  const getExcelColumnLetter = (index: number): string => {
    let letter = '';
    let num = index;
    while (num >= 0) {
      letter = String.fromCharCode((num % 26) + 65) + letter;
      num = Math.floor(num / 26) - 1;
    }
    return letter;
  };

  const parseFile = async (
    file: File,
    setData: React.Dispatch<React.SetStateAction<SpreadsheetRow[] | null>>,
    setHeaders: React.Dispatch<React.SetStateAction<string[]>>,
    setColLetters: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (ext === 'csv') {
      const text = await file.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
          const filtered = results.data.filter((row: Record<string, unknown>) => {
            const values = Object.values(row);
            return values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
          });
          
          const cleaned: SpreadsheetRow[] = filtered.map((row: Record<string, unknown>) => {
            const newRow: SpreadsheetRow = {} as SpreadsheetRow;
            Object.keys(row).forEach((key: string) => {
              const trimmedKey = key.trim();
              newRow[trimmedKey] = row[key] as string | number | null | undefined;
            });
            return newRow;
          });
          const cleanedHeaders = (results.meta.fields || []).map((h: string) => h.trim());
          const letters = cleanedHeaders.map((_, idx: number) => getExcelColumnLetter(idx));
          setData(cleaned);
          setHeaders(cleanedHeaders);
          setColLetters(letters);
        }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) return;
      const ws = wb.Sheets[firstSheetName];
      
      const ref = ws['!ref'];
      if (!ref) return;
      const range = XLSX.utils.decode_range(ref);
      let headerRow = range.s.r;
      
      for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
        let nonEmptyCount = 0;
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c });
          const cell = ws[cellAddress];
          if (cell && cell.v !== null && cell.v !== undefined && String(cell.v).trim() !== '') {
            nonEmptyCount++;
          }
        }
        if (nonEmptyCount > 3) {
          headerRow = r;
          break;
        }
      }
      
      const jsonData = XLSX.utils.sheet_to_json(ws, { 
        defval: '',
        range: headerRow
      }) as Record<string, unknown>[];
      
      const cleaned: SpreadsheetRow[] = jsonData.map((row: Record<string, unknown>) => {
        const newRow: SpreadsheetRow = {} as SpreadsheetRow;
        Object.keys(row).forEach((key: string) => {
          newRow[key.trim()] = row[key] as string | number | null | undefined;
        });
        return newRow;
      });
      const cleanedHeaders = cleaned.length > 0 ? Object.keys(cleaned[0]) : [];
      const letters = cleanedHeaders.map((_, idx: number) => getExcelColumnLetter(idx));
      setData(cleaned);
      setHeaders(cleanedHeaders);
      setColLetters(letters);
    }
  };

  const parsePasted = (
    text: string,
    setData: React.Dispatch<React.SetStateAction<SpreadsheetRow[] | null>>,
    setHeaders: React.Dispatch<React.SetStateAction<string[]>>,
    setColLetters: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    Papa.parse(text.trim(), {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
        const cleaned: SpreadsheetRow[] = results.data.map((row: Record<string, unknown>) => {
          const newRow: SpreadsheetRow = {} as SpreadsheetRow;
          Object.keys(row).forEach((key: string) => {
            const trimmedKey = key.trim();
            newRow[trimmedKey] = row[key] as string | number | null | undefined;
          });
          return newRow;
        });
        const cleanedHeaders = (results.meta.fields || []).map((h: string) => h.trim());
        const letters = cleanedHeaders.map((_, idx: number) => getExcelColumnLetter(idx));
        setData(cleaned);
        setHeaders(cleanedHeaders);
        setColLetters(letters);
      }
    });
  };

  const allHeaders = useMemo(() => {
    return [...new Set([...headers1, ...headers2])];
  }, [headers1, headers2]);

  const columnComparisons = useMemo(() => {
    if (!data1 || !data2 || allHeaders.length === 0) return [];

    return allHeaders.map((col: string) => {
      const values1 = data1.map((row, idx) => ({ idx, val: String(row[col] ?? '').trim() }));
      const values2 = data2.map((row, idx) => ({ idx, val: String(row[col] ?? '').trim() }));
      
      const maxLen = Math.max(values1.length, values2.length);
      const differences = [];
      let diffCount = 0;

      for (let i = 0; i < maxLen; i++) {
        const v1 = values1[i]?.val ?? '';
        const v2 = values2[i]?.val ?? '';
        
        let status = 'same';
        if (v1 !== v2) {
          if (v1 === '' && v2 !== '') status = 'added';
          else if (v1 !== '' && v2 === '') status = 'removed';
          else status = 'changed';
          diffCount++;
        }

        differences.push({
          rowIndex: i,
          value1: v1,
          value2: v2,
          status
        });
      }

      const idx1 = headers1.indexOf(col);
      const idx2 = headers2.indexOf(col);
      const letter1 = idx1 >= 0 ? colLetters1[idx1] : null;
      const letter2 = idx2 >= 0 ? colLetters2[idx2] : null;

      return {
        column: col,
        letter1,
        letter2,
        diffCount,
        totalRows: maxLen,
        differences,
        inBoth: headers1.includes(col) && headers2.includes(col),
        onlyIn1: headers1.includes(col) && !headers2.includes(col),
        onlyIn2: !headers1.includes(col) && headers2.includes(col)
      };
    });
  }, [data1, data2, allHeaders, headers1, headers2, colLetters1, colLetters2]);

  const sortedColumns = useMemo(() => {
    return [...columnComparisons].sort((a, b) => b.diffCount - a.diffCount);
  }, [columnComparisons]);

  // SD-EW-02: Filter Differences (must be before displayedColumns)
  const filteredColumnComparisons = useMemo(() => {
    let filtered = columnComparisons.filter(col => !ignoredColumns.has(col.column));
    
    if (filterType !== 'all') {
      filtered = filtered.map(col => ({
        ...col,
        differences: col.differences.filter(diff => diff.status === filterType),
        diffCount: col.differences.filter(diff => diff.status === filterType).length,
      })).filter(col => col.diffCount > 0);
    }
    
    if (diffThreshold > 0) {
      const maxRows = Math.max(data1?.length || 0, data2?.length || 0);
      filtered = filtered.filter(col => {
        const percentage = (col.diffCount / maxRows) * 100;
        return percentage >= diffThreshold;
      });
    }
    
    return filtered;
  }, [columnComparisons, filterType, diffThreshold, ignoredColumns, data1, data2]);

  const displayedColumns = useMemo(() => {
    let cols = filteredColumnComparisons;
    if (hideIdentical) {
      cols = cols.filter(col => col.diffCount > 0);
    }
    return cols;
  }, [filteredColumnComparisons, hideIdentical]);

  const getBarColor = (diffCount: number, totalRows: number): string => {
    if (diffCount === 0) return 'bg-accent';
    const percentage = (diffCount / totalRows) * 100;
    if (percentage <= 10) return 'bg-accent/60';
    if (percentage <= 30) return 'bg-accent/80';
    if (percentage <= 60) return 'bg-muted-foreground/60';
    return 'bg-destructive';
  };

  const exportToCSV = () => {
    interface DifferenceRow {
      column: string;
      rowIndex: number;
      spreadsheet1: string;
      spreadsheet2: string;
      status: string;
    }
    const columnsToExport = selectedExportColumns.length > 0 
      ? columnComparisons.filter(col => selectedExportColumns.includes(col.column))
      : columnComparisons;
    
    const allDifferences: DifferenceRow[] = [];
    columnsToExport.forEach((col) => {
      col.differences.forEach((diff) => {
        if (diff.status !== 'same') {
          allDifferences.push({
            column: col.column,
            rowIndex: diff.rowIndex + 1,
            spreadsheet1: diff.value1,
            spreadsheet2: diff.value2,
            status: diff.status
          });
        }
      });
    });
    const csv = Papa.unparse(allDifferences);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'column_comparison_results.csv';
    a.click();
    setShowExportModal(false);
    setSelectedExportColumns([]);
  };

  const toggleColumnSelection = (column: string) => {
    setSelectedExportColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const selectAllColumns = () => {
    const columnsWithDiffs = columnComparisons.filter(c => c.diffCount > 0).map(c => c.column);
    setSelectedExportColumns(columnsWithDiffs);
  };

  const totalDiffs = columnComparisons.reduce((sum, col) => sum + col.diffCount, 0);

  // SD-EW-03: Statistics Dashboard
  const statistics = useMemo(() => {
    const columnsAffected = columnComparisons.filter(c => c.diffCount > 0).length;
    const rowsAffected = new Set<number>();
    columnComparisons.forEach(col => {
      col.differences.forEach(diff => {
        if (diff.status !== 'same') {
          rowsAffected.add(diff.rowIndex);
        }
      });
    });
    
    const changeDistribution = {
      added: columnComparisons.reduce((sum, col) => sum + col.differences.filter(d => d.status === 'added').length, 0),
      removed: columnComparisons.reduce((sum, col) => sum + col.differences.filter(d => d.status === 'removed').length, 0),
      changed: columnComparisons.reduce((sum, col) => sum + col.differences.filter(d => d.status === 'changed').length, 0),
    };
    
    const mostChangedColumns = [...columnComparisons]
      .sort((a, b) => b.diffCount - a.diffCount)
      .slice(0, 5)
      .map(col => ({ name: col.column, count: col.diffCount }));
    
    return {
      totalChanges: totalDiffs,
      columnsAffected,
      rowsAffected: rowsAffected.size,
      changeDistribution,
      mostChangedColumns,
    };
  }, [columnComparisons, totalDiffs]);

  // SD-EW-04: Export Enhancements
  const exportToExcel = () => {
    if (!data1 || !data2) return;
    
    const wb = XLSX.utils.book_new();
    const differences: Array<Record<string, any>> = [];
    
    filteredColumnComparisons.forEach(col => {
      col.differences.forEach(diff => {
        if (diff.status !== 'same' || !showOnlyDiffs) {
          differences.push({
            Column: col.column,
            Row: diff.rowIndex + 1,
            'Spreadsheet 1': diff.value1,
            'Spreadsheet 2': diff.value2,
            Status: diff.status,
          });
        }
      });
    });
    
    const ws = XLSX.utils.json_to_sheet(differences);
    XLSX.utils.book_append_sheet(wb, ws, 'Differences');
    XLSX.writeFile(wb, 'spreadsheet_diff.xlsx');
  };

  const exportSummaryReport = () => {
    const report = `Spreadsheet Comparison Report
Generated: ${new Date().toLocaleString()}

Summary:
- Total Changes: ${statistics.totalChanges}
- Columns Affected: ${statistics.columnsAffected}
- Rows Affected: ${statistics.rowsAffected}

Change Distribution:
- Added: ${statistics.changeDistribution.added}
- Removed: ${statistics.changeDistribution.removed}
- Changed: ${statistics.changeDistribution.changed}

Most Changed Columns:
${statistics.mostChangedColumns.map((col, i) => `${i + 1}. ${col.name}: ${col.count} differences`).join('\n')}
`;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comparison_summary.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const helpContent = (
    <div className="space-y-6 text-sm">
      {/* Overview */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Overview
        </h3>
        <p className="text-foreground mb-2">
          Compare two spreadsheets to find differences between them. Upload CSV or Excel files and analyze column-by-column variations with visual indicators.
        </p>
      </div>

      {/* Workflow */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Workflow
        </h3>
        <p className="text-foreground mb-2">
          Upload or paste two spreadsheets to begin comparison.
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• Upload CSV or Excel files for each spreadsheet</p>
          <p>• Tool auto-detects and skips header rows</p>
          <p>• Columns are automatically ranked by differences</p>
          <p>• Click any column to see detailed row-by-row comparison</p>
          <p>• Toggle to hide identical columns for focused analysis</p>
          <p>• Export all differences or select specific columns</p>
        </div>
      </div>

      {/* Visual Indicators */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Visual Indicators
        </h3>
        <p className="text-foreground mb-2">
          Column color gradient indicates difference levels:
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• <span className="text-green-600 dark:text-green-400">Green</span> = Identical values</p>
          <p>• <span className="text-yellow-600 dark:text-yellow-400">Yellow</span> = Minor differences</p>
          <p>• <span className="text-orange-600 dark:text-orange-400">Orange</span> = Moderate differences</p>
          <p>• <span className="text-red-600 dark:text-red-400">Red</span> = Major differences</p>
        </div>
        <p className="text-foreground mb-2 mt-3">
          Column letters (A, B, C) are shown for easy Excel-style reference.
        </p>
      </div>

      {/* Features */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Features
        </h3>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• Column ranking by difference percentage</p>
          <p>• Row-by-row comparison view for selected columns</p>
          <p>• Hide identical columns toggle</p>
          <p>• Export all differences or selected columns only</p>
          <p>• Excel-style column letter references</p>
        </div>
      </div>
    </div>
  );

  return (
    <PageContainer variant="default" maxWidth="95vw">
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <PageHeader
              icon={FileSpreadsheet}
              title="Spreadsheet Differential Check"
              description="Compare spreadsheets to find the differences between them"
            />
            <HelpTooltip
              content={helpContent}
              variant="modal"
              icon="info"
            />
          </div>
        </div>

          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-4">
              <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                <div className="w-3 h-3 bg-accent rounded"></div> Spreadsheet 1
              </h3>
              <Input 
                type="file" 
                accept=".csv,.xlsx,.xls"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const files = e.target.files;
                  if (files && files[0]) {
                    parseFile(files[0], setData1, setHeaders1, setColLetters1);
                  }
                }}
                className="mb-2 text-xs w-full"
              />
              <Textarea 
                placeholder="Or paste CSV/TSV data..."
                className="w-full text-xs font-mono"
                rows={3}
                onChange={(e) => e.target.value && parsePasted(e.target.value, setData1, setHeaders1, setColLetters1)}
              />
              {data1 && <p className="text-xs text-green-600 mt-1">✓ {data1.length} rows, {headers1.length} columns</p>}
            </div>

            <div className="p-4 border-t md:border-t-0">
              <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div> Spreadsheet 2
              </h3>
              <Input 
                type="file" 
                accept=".csv,.xlsx,.xls"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const files = e.target.files;
                  if (files && files[0]) {
                    parseFile(files[0], setData2, setHeaders2, setColLetters2);
                  }
                }}
                className="mb-2 text-xs w-full"
              />
              <Textarea 
                placeholder="Or paste CSV/TSV data..."
                className="w-full text-xs font-mono"
                rows={3}
                onChange={(e) => e.target.value && parsePasted(e.target.value, setData2, setHeaders2, setColLetters2)}
              />
              {data2 && <p className="text-xs text-accent mt-1">✓ {data2.length} rows, {headers2.length} columns</p>}
            </div>
          </div>

          {data1 && data2 && (
            <>
              {/* SD-EW-03: Statistics Dashboard */}
              {showStats && (
                <div className="p-4 bg-card border-b">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Statistics Dashboard
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setShowStats(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="p-3 bg-muted rounded">
                      <div className="text-xs text-muted-foreground">Total Changes</div>
                      <div className="text-lg font-bold">{statistics.totalChanges}</div>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <div className="text-xs text-muted-foreground">Columns Affected</div>
                      <div className="text-lg font-bold">{statistics.columnsAffected}</div>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <div className="text-xs text-muted-foreground">Rows Affected</div>
                      <div className="text-lg font-bold">{statistics.rowsAffected}</div>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <div className="text-xs text-muted-foreground">Most Changed</div>
                      <div className="text-sm font-semibold truncate" title={statistics.mostChangedColumns[0]?.name}>
                        {statistics.mostChangedColumns[0]?.name || 'N/A'}
                      </div>
                    </div>
                  </div>
                  {statistics.mostChangedColumns.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Top changed: {statistics.mostChangedColumns.slice(0, 3).map(c => `${c.name} (${c.count})`).join(', ')}
                    </div>
                  )}
                </div>
              )}
              
              {!showStats && (
                <div className="p-2 border-b">
                  <Button variant="outline" size="sm" onClick={() => setShowStats(true)}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Show Statistics
                  </Button>
                </div>
              )}

              {/* SD-EW-02: Filter Differences */}
              <div className="p-4 bg-muted border-b flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-4 text-sm flex-wrap">
                  <span className="font-semibold">Total Differences: {totalDiffs}</span>
                  <span className="text-muted-foreground">Across {columnComparisons.filter(c => c.diffCount > 0).length} columns</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                      className="text-xs px-2 py-1 rounded bg-background border"
                    >
                      <option value="all">All Changes</option>
                      <option value="added">Added Only</option>
                      <option value="removed">Removed Only</option>
                      <option value="changed">Changed Only</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Min %:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={diffThreshold}
                      onChange={(e) => setDiffThreshold(Number(e.target.value))}
                      className="w-16 text-xs px-2 py-1 rounded bg-background border"
                      placeholder="0"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <span className="text-gray-700">Hide identical</span>
                    <div 
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        hideIdentical ? 'bg-accent' : 'bg-muted'
                      }`}
                      onClick={() => setHideIdentical(!hideIdentical)}
                    >
                      <div 
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full transition-transform ${
                          hideIdentical ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setShowExportModal(true)}
                    >
                      <Download className="w-3 h-3 mr-1" /> CSV
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={exportToExcel}
                    >
                      <FileSpreadsheet className="w-3 h-3 mr-1" /> Excel
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={exportSummaryReport}
                    >
                      <FileSpreadsheet className="w-3 h-3 mr-1" /> Summary
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {data1 && data2 && (
            <div className="grid md:grid-cols-3 gap-4 p-4">
              <div className="md:col-span-1 border-r pr-4">
                <h3 className="font-semibold mb-3 text-sm">Columns Ranked by Differences</h3>
                <div className="space-y-2 overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                  {displayedColumns.map((col, idx) => (
                    <button
                      key={col.column}
                      onClick={() => setSelectedColumn(col.column)}
                      className={`w-full text-left p-3 rounded border-2 transition-all animate-fadeIn ${
                        selectedColumn === col.column 
                          ? 'border-accent bg-accent/10' 
                          : 'border-gray-200 hover:border-border'
                      }`}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <div className="font-semibold text-sm truncate">{col.column}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {col.letter1 && col.letter2 && col.letter1 === col.letter2 ? (
                              <span>Col {col.letter1}</span>
                            ) : (
                              <span>
                                {col.letter1 ? `S1:${col.letter1}` : ''}
                                {col.letter1 && col.letter2 ? ' / ' : ''}
                                {col.letter2 ? `S2:${col.letter2}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        {col.onlyIn1 && <span className="text-[10px] bg-destructive/10 text-destructive px-1 rounded ml-2">Only S1</span>}
                        {col.onlyIn2 && <span className="text-[10px] bg-accent/20 text-accent px-1 rounded ml-2">Only S2</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {col.diffCount > 0 ? (
                          <>
                            <div className="flex-1 bg-muted rounded h-2">
                              <div 
                                className={`h-2 rounded ${getBarColor(col.diffCount, col.totalRows)}`}
                                style={{ width: `${(col.diffCount / col.totalRows) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{col.diffCount}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-accent flex-1">✓ Identical</span>
                          </>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono ml-1">{col.diffCount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                {selectedColumn ? (
                  <div>
                    <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                      <span>Column: {selectedColumn}</span>
                      {(() => {
                        const col = columnComparisons.find(c => c.column === selectedColumn);
                        return col && col.diffCount > 0 ? (
                          <span className="bg-accent/20 text-accent px-2 py-0.5 rounded text-xs">
                            {col.diffCount} {col.diffCount === 1 ? 'difference' : 'differences'}
                          </span>
                        ) : null;
                      })()}
                    </h3>
                    <div className="overflow-auto border rounded" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted border-b">
                          <tr>
                            <th className="p-2 text-left font-semibold">Row</th>
                            <th className="p-2 text-left font-semibold">Spreadsheet 1</th>
                            <th className="p-2 text-left font-semibold">Spreadsheet 2</th>
                            <th className="p-2 text-left font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {columnComparisons.find(c => c.column === selectedColumn)?.differences.map((diff, idx) => (
                            <tr 
                              key={idx}
                              className={`border-b animate-fadeIn transition-colors duration-200 ${
                                diff.status === 'added' ? 'bg-green-50' :
                                diff.status === 'removed' ? 'bg-red-50' :
                                diff.status === 'changed' ? 'bg-yellow-50' : ''
                              }`}
                              style={{ animationDelay: `${idx * 20}ms` }}
                            >
                              <td className="p-2 font-mono text-muted-foreground">{diff.rowIndex + 1}</td>
                              <td className="p-2 font-mono">{diff.value1 || <span className="text-muted-foreground">—</span>}</td>
                              <td className="p-2 font-mono">{diff.value2 || <span className="text-muted-foreground">—</span>}</td>
                              <td className="p-2">
                                {diff.status !== 'same' && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    diff.status === 'added' ? 'bg-accent/30 text-accent' :
                                    diff.status === 'removed' ? 'bg-destructive/30 text-destructive' :
                                    'bg-accent/40 text-accent'
                                  }`}>
                                    {diff.status.charAt(0).toUpperCase() + diff.status.slice(1)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Select a column to view row-by-row comparison</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!data1 && !data2 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg mb-2">Upload or paste two spreadsheets to compare</p>
              <p className="text-sm">Perfect for invoice lists, employee records, and tabular data</p>
            </div>
          )}

          {showExportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <Card variant="elevated-xl" padding="none" className="max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-bold">Export Differences</h2>
                  <button 
                    onClick={() => {
                      setShowExportModal(false);
                      setSelectedExportColumns([]);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-4 border-b bg-muted">
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllColumns}
                      className="px-3 py-1 bg-accent/10 text-accent rounded text-xs hover:bg-accent/20"
                    >
                      Select All with Differences
                    </button>
                    <button
                      onClick={() => setSelectedExportColumns([])}
                      className="px-3 py-1 bg-muted text-foreground rounded text-xs hover:bg-muted"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedExportColumns.length === 0 
                      ? 'Select columns to export, or export all differences' 
                      : `${selectedExportColumns.length} column${selectedExportColumns.length === 1 ? '' : 's'} selected`}
                  </p>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <div className="space-y-2">
                    {columnComparisons.filter(c => c.diffCount > 0).map(col => (
                      <label
                        key={col.column}
                        className="flex items-center gap-3 p-3 border rounded hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedExportColumns.includes(col.column)}
                          onChange={() => toggleColumnSelection(col.column)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{col.column}</div>
                          <div className="text-xs text-muted-foreground">
                            {col.letter1 && col.letter2 && col.letter1 === col.letter2 ? (
                              <span>Col {col.letter1}</span>
                            ) : (
                              <span>
                                {col.letter1 ? `S1:${col.letter1}` : ''}
                                {col.letter1 && col.letter2 ? ' / ' : ''}
                                {col.letter2 ? `S2:${col.letter2}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          col.diffCount / col.totalRows > 0.6 ? 'bg-destructive/10 text-destructive' :
                          col.diffCount / col.totalRows > 0.3 ? 'bg-muted-foreground/20 text-muted-foreground' :
                          'bg-accent/20 text-accent'
                        }`}>
                          {col.diffCount} {col.diffCount === 1 ? 'diff' : 'diffs'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t bg-muted flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowExportModal(false);
                      setSelectedExportColumns([]);
                    }}
                    className="px-4 py-2 text-foreground hover:bg-muted rounded text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent/90 text-sm flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {selectedExportColumns.length === 0 
                      ? 'Export All Differences' 
                      : `Export ${selectedExportColumns.length} Column${selectedExportColumns.length === 1 ? '' : 's'}`}
                  </button>
                </div>
              </Card>
            </div>
          )}
    </PageContainer>
  );
}