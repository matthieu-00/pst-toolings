import React, { useState, useMemo } from 'react';
import { Upload, Download, HelpCircle, AlertCircle, X } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function SpreadsheetComparator() {
  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);
  const [headers1, setHeaders1] = useState([]);
  const [headers2, setHeaders2] = useState([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [hideIdentical, setHideIdentical] = useState(false);
  const [colLetters1, setColLetters1] = useState([]);
  const [colLetters2, setColLetters2] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState([]);

  const getExcelColumnLetter = (index) => {
    let letter = '';
    let num = index;
    while (num >= 0) {
      letter = String.fromCharCode((num % 26) + 65) + letter;
      num = Math.floor(num / 26) - 1;
    }
    return letter;
  };

  const parseFile = async (file, setData, setHeaders, setColLetters) => {
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'csv') {
      const text = await file.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          const filtered = results.data.filter(row => {
            const values = Object.values(row);
            return values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
          });
          
          const cleaned = filtered.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
              const trimmedKey = key.trim();
              newRow[trimmedKey] = row[key];
            });
            return newRow;
          });
          const cleanedHeaders = results.meta.fields.map(h => h.trim());
          const letters = cleanedHeaders.map((_, idx) => getExcelColumnLetter(idx));
          setData(cleaned);
          setHeaders(cleanedHeaders);
          setColLetters(letters);
        }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      
      const range = XLSX.utils.decode_range(ws['!ref']);
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
      });
      
      const cleaned = jsonData.map(row => {
        const newRow = {};
        Object.keys(row).forEach(key => {
          newRow[key.trim()] = row[key];
        });
        return newRow;
      });
      const cleanedHeaders = cleaned.length > 0 ? Object.keys(cleaned[0]) : [];
      const letters = cleanedHeaders.map((_, idx) => getExcelColumnLetter(idx));
      setData(cleaned);
      setHeaders(cleanedHeaders);
      setColLetters(letters);
    }
  };

  const parsePasted = (text, setData, setHeaders, setColLetters) => {
    Papa.parse(text.trim(), {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        const cleaned = results.data.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => {
            const trimmedKey = key.trim();
            newRow[trimmedKey] = row[key];
          });
          return newRow;
        });
        const cleanedHeaders = results.meta.fields.map(h => h.trim());
        const letters = cleanedHeaders.map((_, idx) => getExcelColumnLetter(idx));
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

    return allHeaders.map((col, colIdx) => {
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

  const displayedColumns = useMemo(() => {
    if (hideIdentical) {
      return sortedColumns.filter(col => col.diffCount > 0);
    }
    return sortedColumns;
  }, [sortedColumns, hideIdentical]);

  const getBarColor = (diffCount, totalRows) => {
    if (diffCount === 0) return 'bg-accent';
    const percentage = (diffCount / totalRows) * 100;
    if (percentage <= 10) return 'bg-accent/60';
    if (percentage <= 30) return 'bg-accent/80';
    if (percentage <= 60) return 'bg-muted-foreground/60';
    return 'bg-destructive';
  };

  const exportToCSV = () => {
    const columnsToExport = selectedExportColumns.length > 0 
      ? columnComparisons.filter(col => selectedExportColumns.includes(col.column))
      : columnComparisons;
    
    const allDifferences = [];
    columnsToExport.forEach(col => {
      col.differences.forEach(diff => {
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

  const toggleColumnSelection = (column) => {
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

  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="max-w-[95vw] mx-auto">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Spreadsheet Differential Check</h1>
              <p className="text-xs text-gray-500 mt-1">Compare spreadsheets to find the differences between them</p>
            </div>
            <button 
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <HelpCircle className="w-5 h-5 text-gray-500" />
              {showTooltip && (
                <div className="absolute right-0 top-8 w-80 bg-foreground text-foreground text-xs p-3 rounded-lg shadow-xl z-10">
                  <p className="font-semibold mb-2">How to use:</p>
                  <ul className="space-y-1">
                    <li>• Upload or paste two spreadsheets (CSV/Excel)</li>
                    <li>• Tool auto-detects and skips header rows</li>
                    <li>• Columns ranked by differences with color gradient</li>
                    <li>• Green = identical, yellow to red = increasing differences</li>
                    <li>• Click any column to see row-by-row comparison</li>
                    <li>• Toggle to hide identical columns</li>
                    <li>• Export all differences or select specific columns</li>
                    <li>• Column letters (A, B, C) shown for easy reference</li>
                  </ul>
                </div>
              )}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-0 border-b">
            <div className="p-4 md:border-r">
              <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                <div className="w-3 h-3 bg-accent rounded"></div> Spreadsheet 1
              </h3>
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files[0] && parseFile(e.target.files[0], setData1, setHeaders1, setColLetters1)}
                className="mb-2 text-xs w-full"
              />
              <textarea 
                placeholder="Or paste CSV/TSV data..."
                className="w-full p-2 border rounded text-xs font-mono"
                rows="3"
                onChange={(e) => e.target.value && parsePasted(e.target.value, setData1, setHeaders1, setColLetters1)}
              />
              {data1 && <p className="text-xs text-green-600 mt-1">✓ {data1.length} rows, {headers1.length} columns</p>}
            </div>

            <div className="p-4 border-t md:border-t-0">
              <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div> Spreadsheet 2
              </h3>
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files[0] && parseFile(e.target.files[0], setData2, setHeaders2, setColLetters2)}
                className="mb-2 text-xs w-full"
              />
              <textarea 
                placeholder="Or paste CSV/TSV data..."
                className="w-full p-2 border rounded text-xs font-mono"
                rows="3"
                onChange={(e) => e.target.value && parsePasted(e.target.value, setData2, setHeaders2, setColLetters2)}
              />
              {data2 && <p className="text-xs text-green-600 mt-1">✓ {data2.length} rows, {headers2.length} columns</p>}
            </div>
          </div>

          {data1 && data2 && (
            <div className="p-4 bg-muted border-b flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-4 text-sm">
                <span className="font-semibold">Total Differences: {totalDiffs}</span>
                <span className="text-muted-foreground">Across {columnComparisons.filter(c => c.diffCount > 0).length} columns</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <span className="text-gray-700">Hide identical columns</span>
                  <div 
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      hideIdentical ? 'bg-accent' : 'bg-muted'
                    }`}
                    onClick={() => setHideIdentical(!hideIdentical)}
                  >
                    <div 
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        hideIdentical ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
                <button 
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-1 bg-blue-600 text-foreground px-3 py-1 rounded hover:bg-blue-700 text-xs"
                >
                  <Download className="w-3 h-3" /> Export Differences
                </button>
              </div>
            </div>
          )}

          {data1 && data2 && (
            <div className="grid md:grid-cols-3 gap-4 p-4">
              <div className="md:col-span-1 border-r pr-4">
                <h3 className="font-semibold mb-3 text-sm">Columns Ranked by Differences</h3>
                <div className="space-y-2 overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                  {displayedColumns.map(col => (
                    <button
                      key={col.column}
                      onClick={() => setSelectedColumn(col.column)}
                      className={`w-full text-left p-3 rounded border-2 transition-all ${
                        selectedColumn === col.column 
                          ? 'border-accent bg-accent/10' 
                          : 'border-gray-200 hover:border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <div className="font-semibold text-sm truncate">{col.column}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
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
                        {col.onlyIn1 && <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded ml-2">Only S1</span>}
                        {col.onlyIn2 && <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded ml-2">Only S2</span>}
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
                      {columnComparisons.find(c => c.column === selectedColumn)?.diffCount > 0 && (
                        <span className="bg-accent/20 text-accent px-2 py-0.5 rounded text-xs">
                          {columnComparisons.find(c => c.column === selectedColumn).diffCount} {columnComparisons.find(c => c.column === selectedColumn).diffCount === 1 ? 'difference' : 'differences'}
                        </span>
                      )}
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
                              className={`border-b ${
                                diff.status === 'added' ? 'bg-green-50' :
                                diff.status === 'removed' ? 'bg-red-50' :
                                diff.status === 'changed' ? 'bg-yellow-50' : ''
                              }`}
                            >
                              <td className="p-2 font-mono text-gray-500">{diff.rowIndex + 1}</td>
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
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-bold">Export Differences</h2>
                  <button 
                    onClick={() => {
                      setShowExportModal(false);
                      setSelectedExportColumns([]);
                    }}
                    className="text-gray-500 hover:text-gray-700"
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
                      className="px-3 py-1 bg-muted text-gray-700 rounded text-xs hover:bg-muted"
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
                          <div className="text-xs text-gray-500">
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
                    className="px-4 py-2 text-gray-700 hover:bg-muted rounded text-sm"
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}