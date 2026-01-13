import { useState, useMemo, useEffect, useRef } from 'react';
import { Upload, Download, Search, X, CheckSquare, Square, Filter, ChevronDown, ChevronRight, RefreshCw, Database, Copy, Check, ArrowUp, ArrowDown, Link2, BarChart3, FileText } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Textarea } from '@/components/ui/input';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { Button } from '@/components/ui/button';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject extends Record<string, JsonValue> {}

interface ComparisonField {
  inA: boolean;
  inB: boolean;
  countA: number;
  countB: number;
  typesA: string[];
  typesB: string[];
  samplesA: JsonValue[];
  samplesB: JsonValue[];
  status: string;
  typeMismatch: boolean;
  valuesDiffer: boolean;
}

export default function JsonExtractor() {
  const { theme } = useTheme();
  const [mode, setMode] = useState<'extract' | 'compare'>('extract');
  const [jsonData, setJsonData] = useState<JsonObject[]>([]);
  const [jsonDataB, setJsonDataB] = useState<JsonObject[]>([]);
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [allKeysB, setAllKeysB] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [errorB, setErrorB] = useState('');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [previewCount, setPreviewCount] = useState(3);
  const [exportMode, setExportMode] = useState<'all' | 'common' | 'differences'>('all');
  
  // JE-EW-01, JE-EW-02, JE-EW-03, JE-EW-05: New state for easy wins
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [rowFilters, setRowFilters] = useState<Record<string, { type: 'contains' | 'exact' | 'range'; value: string; min?: number; max?: number }>>({});
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const parseConsoleFormat = (text: string): JsonObject => {
    const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
    const obj: JsonObject = {} as JsonObject;
    
    let i = 0;
    while (i < lines.length) {
      let currentLine = lines[i];
      
      if (i + 1 < lines.length && lines[i + 1] === ':') {
        let key = currentLine.replace(/^\*+/, '').trim().replace(/^["']|["']$/g, '');
        
        if (i + 2 < lines.length) {
          let valueStr = lines[i + 2].trim();
          let value: JsonValue;
          
          if (valueStr === '""' || valueStr === "''") {
            value = '';
          } else if (valueStr.startsWith('(') && valueStr.includes('[')) {
            const match = valueStr.match(/\[(.+)\]/);
            if (match) {
              try {
                value = JSON.parse('[' + match[1] + ']') as JsonValue;
              } catch {
                value = match[1];
              }
            } else {
              value = valueStr;
            }
          } else if (valueStr.startsWith('{') && valueStr.endsWith('}')) {
            value = valueStr;
          } else if (valueStr === 'null') {
            value = null;
          } else if (valueStr === 'true') {
            value = true;
          } else if (valueStr === 'false') {
            value = false;
          } else if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
            value = valueStr.slice(1, -1);
          } else if (!isNaN(Number(valueStr)) && valueStr !== '') {
            value = Number(valueStr);
          } else {
            value = valueStr;
          }
          
          if (key) {
            obj[key] = value;
          }
          
          i += 3;
          continue;
        }
      }
      
      const colonIndex = currentLine.indexOf(':');
      if (colonIndex !== -1) {
        let key = currentLine.substring(0, colonIndex).trim();
        let valueStr = currentLine.substring(colonIndex + 1).trim();
        
        key = key.replace(/^\*+/, '').trim().replace(/^["']|["']$/g, '');
        
        if (key) {
          let value: JsonValue;
          if (valueStr === '""' || valueStr === "''") {
            value = '';
          } else if (valueStr === 'null') {
            value = null;
          } else if (valueStr === 'true') {
            value = true;
          } else if (valueStr === 'false') {
            value = false;
          } else if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
            value = valueStr.slice(1, -1);
          } else if (!isNaN(Number(valueStr)) && valueStr !== '') {
            value = Number(valueStr);
          } else {
            value = valueStr;
          }
          
          obj[key] = value;
        }
      }
      
      i++;
    }
    
    return obj;
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>, isDatasetB = false) => {
    const text = e.target.value;
    const setData = isDatasetB ? setJsonDataB : setJsonData;
    const setKeys = isDatasetB ? setAllKeysB : setAllKeys;
    const setErr = isDatasetB ? setErrorB : setError;

    if (!text.trim()) {
      setData([]);
      setKeys([]);
      if (!isDatasetB) setSelectedKeys(new Set());
      setErr('');
      return;
    }

    try {
      let dataArray;
      let cleanedText = text.trim();
      
      try {
        const parsed = JSON.parse(cleanedText);
        dataArray = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        try {
          cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          const parsed = JSON.parse(cleanedText);
          dataArray = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          try {
            const parsed = parseConsoleFormat(cleanedText);
            if (Object.keys(parsed).length === 0) {
              setErr('No data with values found. Make sure to paste the full object.');
              return;
            }
            dataArray = [parsed];
          } catch {
            setErr('Unable to parse the data. Try copying the object directly from your console.');
            return;
          }
        }
      }
      
      if (!dataArray || dataArray.length === 0) {
        setErr('No data found. Please paste a JSON object or array.');
        return;
      }
      
      const keySet = new Set();
      dataArray.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(key => keySet.add(key));
        }
      });
      
      if (keySet.size === 0) {
        setErr('No fields found in the data. Make sure you\'re pasting valid data.');
        return;
      }
      
      const sortedKeys = Array.from(keySet as Set<string>).sort() as string[];
      
      setData(dataArray as JsonObject[]);
      setKeys(sortedKeys);
      
      if (mode === 'extract' && !isDatasetB) {
        setSelectedKeys(new Set(sortedKeys));
      }
      
      setErr('');
    } catch (err) {
      setErr('Unable to parse the data. Try copying the object directly from your console.');
    }
  };

  // Comparison field analysis
  const comparisonAnalysis = useMemo<Record<string, ComparisonField> | null>(() => {
    if (mode !== 'compare') return null;

    const keysA = new Set(allKeys);
    const keysB = new Set(allKeysB);
    const allUniqueKeys = new Set([...allKeys, ...allKeysB]);
    
    const analysis: Record<string, ComparisonField> = {};
    
    allUniqueKeys.forEach((key: string) => {
      const inA = keysA.has(key);
      const inB = keysB.has(key);
      
      let countA = 0;
      let countB = 0;
      const typesA = new Set<string>();
      const typesB = new Set<string>();
      const samplesA: JsonValue[] = [];
      const samplesB: JsonValue[] = [];
      const valuesA = new Set<string>();
      const valuesB = new Set<string>();
      
      if (inA) {
        jsonData.forEach((item: JsonObject) => {
          if (key in item && item[key] !== '' && item[key] !== null && item[key] !== undefined) {
            countA++;
            typesA.add(typeof item[key]);
            if (samplesA.length < 3) {
              samplesA.push(item[key]);
            }
            // Store serialized values for comparison
            valuesA.add(JSON.stringify(item[key]));
          }
        });
      }
      
      if (inB) {
        jsonDataB.forEach((item: JsonObject) => {
          if (key in item && item[key] !== '' && item[key] !== null && item[key] !== undefined) {
            countB++;
            typesB.add(typeof item[key]);
            if (samplesB.length < 3) {
              samplesB.push(item[key]);
            }
            // Store serialized values for comparison
            valuesB.add(JSON.stringify(item[key]));
          }
        });
      }
      
      // Check if values differ between datasets
      const valuesDiffer = inA && inB && valuesA.size > 0 && valuesB.size > 0 && 
                          !Array.from(valuesA).every((v: string) => valuesB.has(v));
      
      analysis[key] = {
        inA,
        inB,
        countA,
        countB,
        typesA: Array.from(typesA),
        typesB: Array.from(typesB),
        samplesA,
        samplesB,
        status: inA && inB ? 'both' : inA ? 'onlyA' : 'onlyB',
        typeMismatch: inA && inB && typesA.size > 0 && typesB.size > 0 && 
                      (typesA.size > 1 || typesB.size > 1 || Array.from(typesA)[0] !== Array.from(typesB)[0]),
        valuesDiffer
      };
    });
    
    return analysis;
  }, [mode, allKeys, allKeysB, jsonData, jsonDataB]);

  // Update selected keys when switching to compare mode
  useEffect(() => {
    if (mode === 'compare' && comparisonAnalysis) {
      const allCompareKeys = Object.keys(comparisonAnalysis);
      setSelectedKeys(new Set(allCompareKeys));
    }
  }, [mode, comparisonAnalysis]);

  // Calculate field occurrences for extract mode
  const fieldStats = useMemo<Record<string, { count: number; types: string[] }>>(() => {
    if (mode === 'compare') return {};
    
    const stats: Record<string, { count: number; types: string[] }> = {};
    allKeys.forEach((key: string) => {
      let count = 0;
      const types = new Set<string>();
      jsonData.forEach((item: JsonObject) => {
        if (key in item && item[key] !== '' && item[key] !== null && item[key] !== undefined) {
          count++;
          types.add(typeof item[key]);
        }
      });
      stats[key] = { count, types: Array.from(types) };
    });
    return stats;
  }, [mode, allKeys, jsonData]);

  // Group fields by common prefixes
  const groupedFields = useMemo<{ groups: Record<string, string[]>; ungrouped: string[] }>(() => {
    const keys = mode === 'compare' && comparisonAnalysis ? 
                 Object.keys(comparisonAnalysis) : allKeys;
    
    const groups: Record<string, string[]> = {};
    const ungrouped: string[] = [];
    
    keys.forEach((key: string) => {
      const numberMatch = key.match(/^(.+?)(_)?(\d+)$/);
      if (numberMatch) {
        const prefix = numberMatch[1];
        if (prefix.length >= 3) {
          if (!groups[prefix]) groups[prefix] = [];
          groups[prefix].push(key);
        } else {
          ungrouped.push(key);
        }
      } else {
        ungrouped.push(key);
      }
    });
    
    Object.keys(groups).forEach((prefix: string) => {
      const fields = groups[prefix];
      if (fields.length < 2) {
        ungrouped.push(...fields);
        delete groups[prefix];
      } else {
        const numbers = fields.map((f: string) => {
          const match = f.match(/(\d+)$/);
          return match ? parseInt(match[1]) : null;
        }).filter((n: number | null): n is number => n !== null).sort((a: number, b: number) => a - b);
        
        if (numbers.length < 2) {
          ungrouped.push(...fields);
          delete groups[prefix];
        }
      }
    });
    
    return { groups, ungrouped };
  }, [mode, allKeys, comparisonAnalysis]);

  const filteredKeys = useMemo(() => {
    let keys = mode === 'compare' && comparisonAnalysis ? 
               Object.keys(comparisonAnalysis) : allKeys;
    
    if (searchTerm) {
      keys = keys.filter(key => 
        key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (hideEmpty) {
      if (mode === 'compare' && comparisonAnalysis) {
        keys = keys.filter((key: string) => {
          const analysis = comparisonAnalysis[key];
          return analysis && (analysis.countA > 0 || analysis.countB > 0);
        });
      } else {
        keys = keys.filter((key: string) => fieldStats[key]?.count > 0);
      }
    }
    
    // Filter by export mode in compare mode
    if (mode === 'compare' && exportMode !== 'all' && comparisonAnalysis) {
      keys = keys.filter((key: string) => {
        const analysis = comparisonAnalysis[key];
        if (!analysis) return false;
        if (exportMode === 'common') {
          return analysis.status === 'both';
        } else if (exportMode === 'differences') {
          return analysis.status !== 'both';
        }
        return true;
      });
    }
    
    return keys;
  }, [mode, allKeys, searchTerm, hideEmpty, fieldStats, comparisonAnalysis, exportMode]);

  const toggleKey = (key: string) => {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedKeys(newSelected);
  };

  const toggleGroup = (groupName: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupName)) {
      newCollapsed.delete(groupName);
    } else {
      newCollapsed.add(groupName);
    }
    setCollapsedGroups(newCollapsed);
  };

  const selectAll = () => {
    setSelectedKeys(new Set(filteredKeys));
  };

  const deselectAll = () => {
    const newSelected = new Set(selectedKeys);
    filteredKeys.forEach(key => newSelected.delete(key));
    setSelectedKeys(newSelected);
  };

  // JE-EW-02: Data Filtering & JE-EW-03: Sorting
  const filteredData = useMemo<JsonObject[]>(() => {
    if (selectedKeys.size === 0) return [];
    
    let data = jsonData.map((item: JsonObject) => {
      const filtered: JsonObject = {} as JsonObject;
      Array.from(selectedKeys).sort().forEach((key: string) => {
        if (key in item) {
          filtered[key] = item[key];
        }
      });
      return filtered;
    });
    
    // Apply row filters
    if (Object.keys(rowFilters).length > 0) {
      data = data.filter((item: JsonObject) => {
        return Object.entries(rowFilters).every(([key, filter]) => {
          const value = item[key];
          if (value === null || value === undefined) return false;
          
          if (filter.type === 'contains') {
            return String(value).toLowerCase().includes(filter.value.toLowerCase());
          } else if (filter.type === 'exact') {
            return String(value) === filter.value;
          } else if (filter.type === 'range' && typeof value === 'number') {
            const num = Number(value);
            return (!filter.min || num >= filter.min) && (!filter.max || num <= filter.max);
          }
          return true;
        });
      });
    }
    
    // Apply sorting
    if (sortColumn) {
      data = [...data].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return data;
  }, [jsonData, selectedKeys, rowFilters, sortColumn, sortDirection]);

  const filteredDataB = useMemo<JsonObject[]>(() => {
    if (mode !== 'compare' || selectedKeys.size === 0) return [];
    
    return jsonDataB.map((item: JsonObject) => {
      const filtered: JsonObject = {} as JsonObject;
      Array.from(selectedKeys).sort().forEach((key: string) => {
        if (key in item) {
          filtered[key] = item[key];
        }
      });
      return filtered;
    });
  }, [mode, jsonDataB, selectedKeys]);

  const getTypeColor = (value: JsonValue) => {
    const type = typeof value;
    if (value === null) return 'hsl(var(--type-null))';
    if (type === 'string') return 'hsl(var(--type-string))';
    if (type === 'number') return 'hsl(var(--type-number))';
    if (type === 'boolean') return 'hsl(var(--type-boolean))';
    if (Array.isArray(value)) return 'hsl(var(--type-array))';
    if (type === 'object') return 'hsl(var(--type-object))';
    return 'hsl(var(--muted-foreground))';
  };

  // JE-EW-01: Field Operations
  const copyFieldPath = async (fieldPath: string) => {
    await navigator.clipboard.writeText(fieldPath);
    setCopiedField(fieldPath);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyFieldValue = async (value: JsonValue) => {
    const text = value === null || value === undefined ? 'null' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    await navigator.clipboard.writeText(text);
    setCopiedField('value');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // JE-EW-04: Statistics Dashboard
  const fieldStatistics = useMemo(() => {
    if (mode === 'compare' || selectedKeys.size === 0) return {};
    
    const stats: Record<string, {
      min?: number;
      max?: number;
      avg?: number;
      uniqueCount: number;
      nullCount: number;
      totalCount: number;
      nullPercentage: number;
    }> = {};
    
    Array.from(selectedKeys).forEach((key: string) => {
      const values = jsonData.map(item => item[key]).filter(v => v !== null && v !== undefined);
      const numericValues = values.filter(v => typeof v === 'number') as number[];
      const uniqueValues = new Set(values.map(v => JSON.stringify(v)));
      
      const stat: typeof stats[string] = {
        uniqueCount: uniqueValues.size,
        nullCount: jsonData.length - values.length,
        totalCount: jsonData.length,
        nullPercentage: ((jsonData.length - values.length) / jsonData.length) * 100,
      };
      
      if (numericValues.length > 0) {
        stat.min = Math.min(...numericValues);
        stat.max = Math.max(...numericValues);
        stat.avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      }
      
      stats[key] = stat;
    });
    
    return stats;
  }, [jsonData, selectedKeys, mode]);

  const dataQualityScore = useMemo(() => {
    if (selectedKeys.size === 0) return 0;
    const scores = Object.values(fieldStatistics).map(stat => 100 - stat.nullPercentage);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }, [fieldStatistics, selectedKeys]);

  // JE-EW-06: Import Options
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        const dataArray = Array.isArray(parsed) ? parsed : [parsed];
        setJsonData(dataArray as JsonObject[]);
        const keySet = new Set<string>();
        dataArray.forEach((item: JsonObject) => {
          if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach(key => keySet.add(key));
          }
        });
        setAllKeys(Array.from(keySet).sort());
        setSelectedKeys(new Set(Array.from(keySet)));
        setError('');
      } catch (err) {
        setError('Failed to parse JSON file');
      }
    }
  };

  const importFromURL = async (url: string) => {
    try {
      const response = await fetch(url);
      const text = await response.text();
      const parsed = JSON.parse(text);
      const dataArray = Array.isArray(parsed) ? parsed : [parsed];
      setJsonData(dataArray as JsonObject[]);
      const keySet = new Set<string>();
      dataArray.forEach((item: JsonObject) => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(key => keySet.add(key));
        }
      });
      setAllKeys(Array.from(keySet).sort());
      setSelectedKeys(new Set(Array.from(keySet)));
      setError('');
    } catch (err) {
      setError('Failed to import from URL');
    }
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) {
      alert('No data to export. Please select some fields first.');
      return;
    }

    try {
      const headers = Array.from(selectedKeys).sort();
      const csvRows = [];
      
      if (mode === 'compare' && jsonDataB.length > 0) {
        // Compare mode export
        csvRows.push(['Dataset', ...headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',')].join(','));
        
        filteredData.forEach((item: JsonObject) => {
          const values = headers.map(header => {
            const value = item[header];
            if (value === null || value === undefined) return '';
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
          });
          csvRows.push(['A', ...values].join(','));
        });
        
        filteredDataB.forEach((item: JsonObject) => {
          const values = headers.map(header => {
            const value = item[header];
            if (value === null || value === undefined) return '';
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
          });
          csvRows.push(['B', ...values].join(','));
        });
      } else {
        // Extract mode export
        csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));
        
        filteredData.forEach(item => {
          const values = headers.map(header => {
            const value = item[header];
            if (value === null || value === undefined) return '';
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
          });
          csvRows.push(values.join(','));
        });
      }
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filtered-data-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert('Error exporting CSV: ' + errorMessage);
    }
  };

  const exportToJSON = () => {
    if (filteredData.length === 0) {
      alert('No data to export. Please select some fields first.');
      return;
    }
    
    try {
      let jsonContent;
      
      if (mode === 'compare' && jsonDataB.length > 0) {
        jsonContent = JSON.stringify({
          datasetA: filteredData,
          datasetB: filteredDataB
        }, null, 2);
      } else {
        jsonContent = JSON.stringify(filteredData, null, 2);
      }
      
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filtered-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert('Error exporting JSON: ' + errorMessage);
    }
  };

  const renderFieldCheckbox = (key: string) => {
    if (mode === 'compare' && comparisonAnalysis) {
      const analysis = comparisonAnalysis[key];
      let statusColor = 'hsl(var(--muted-foreground))';
      let statusIcon = '✅';
      
      if (analysis.status === 'both') {
        if (analysis.valuesDiffer) {
          // Values differ - red warning
          statusColor = 'hsl(var(--status-differ))';
          statusIcon = '⚠️';
        } else if (analysis.typeMismatch) {
          // Type mismatch - orange
          statusColor = 'hsl(var(--status-warning))';
          statusIcon = '⚠️';
        } else {
          // All good - green
          statusColor = 'hsl(var(--status-match))';
          statusIcon = '✅';
        }
      } else if (analysis.status === 'onlyA') {
        statusColor = 'hsl(var(--status-only-a))';
        statusIcon = '🔵';
      } else {
        statusColor = 'hsl(var(--status-only-b))';
        statusIcon = '🟠';
      }
      
      // Determine tooltip text
      let tooltipText = '';
      if (analysis.status === 'both') {
        if (analysis.valuesDiffer) {
          tooltipText = 'Field exists in both datasets but values differ';
        } else if (analysis.typeMismatch) {
          tooltipText = 'Field exists in both datasets but has mixed types';
        } else {
          tooltipText = 'Field exists in both datasets with matching values';
        }
      } else if (analysis.status === 'onlyA') {
        tooltipText = 'Field only exists in Dataset A';
      } else {
        tooltipText = 'Field only exists in Dataset B';
      }
      
      return (
        <div key={key} className="relative group" title={tooltipText}>
          <button
            onClick={() => toggleKey(key)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all active:scale-95 ${
              selectedKeys.has(key) 
                ? 'bg-muted text-foreground border-muted' 
                : 'bg-card text-foreground border-border'
            }`}
          >
            {selectedKeys.has(key) ? (
              <CheckSquare className="w-4 h-4 flex-shrink-0 transition-transform duration-200" />
            ) : (
              <Square className="w-4 h-4 flex-shrink-0 transition-transform duration-200" />
            )}
            <span className="text-sm mr-1" style={{ color: statusColor }}>{statusIcon}</span>
            <span className="truncate text-sm flex-1">{key}</span>
            <div className="flex gap-1 text-xs">
              {analysis.inA && (
                <span 
                  className="px-2 py-0.5 rounded bg-muted text-[hsl(var(--status-only-a))]"
                  title={`Dataset A: ${analysis.countA} occurrences`}
                >
                  A:{analysis.countA}
                </span>
              )}
              {analysis.inB && (
                <span 
                  className="px-2 py-0.5 rounded bg-muted text-[hsl(var(--status-only-b))]"
                  title={`Dataset B: ${analysis.countB} occurrences`}
                >
                  B:{analysis.countB}
                </span>
              )}
            </div>
          </button>
        </div>
      );
    } else {
      const stats = fieldStats[key] || { count: 0, types: [] };
      const hasTypeMismatch = stats.types.length > 1;
      
      return (
        <div key={key} className="relative group">
          <button
            onClick={() => toggleKey(key)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all active:scale-95 ${
              selectedKeys.has(key) 
                ? 'bg-accent text-accent-foreground border border-accent' 
                : 'bg-card text-foreground border border-border'
            }`}
          >
            {selectedKeys.has(key) ? (
              <CheckSquare className="w-4 h-4 flex-shrink-0 transition-transform duration-200" />
            ) : (
              <Square className="w-4 h-4 flex-shrink-0 transition-transform duration-200" />
            )}
            <span className="truncate text-sm flex-1">{key}</span>
            <span 
              className={`text-xs px-2 py-0.5 rounded bg-muted ${
                hasTypeMismatch ? 'text-orange-500 dark:text-orange-400' : 'text-muted-foreground'
              }`}
              title={`${stats.count} occurrences across ${jsonData.length} records${hasTypeMismatch ? ' - Mixed types!' : ''}`}
            >
              {stats.count}
            </span>
          </button>
        </div>
      );
    }
  };

  const helpContent = (
    <div className="space-y-6 text-sm">
      {/* Overview */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Overview
        </h3>
        <p className="text-foreground mb-2">
          Extract and compare JSON data fields with advanced filtering capabilities. Parse JSON or console output, analyze field structures, and export selected data.
        </p>
      </div>

      {/* Extract Mode */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Extract Mode
        </h3>
        <p className="text-foreground mb-2">
          Parse a single dataset to extract and analyze its field structure.
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• Parses JSON or console output format</p>
          <p>• Shows occurrence counts per field</p>
          <p>• Auto-groups numbered fields (e.g., driver1, driver2)</p>
          <p>• Displays table preview with type-colored values</p>
          <p>• Highlights mixed data types</p>
          <p>• Export selected fields as CSV or JSON</p>
        </div>
      </div>

      {/* Compare Mode */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Compare Mode
        </h3>
        <p className="text-foreground mb-2">
          Analyze differences between two datasets side-by-side.
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• Paste two datasets side-by-side</p>
          <p>• Analyzes field structure differences</p>
          <p>• Detects value differences in matching fields</p>
          <p>• Shows sample values from both datasets</p>
          <p>• Export filters: All, Common only, or Differences only</p>
          <p>• Exports both datasets in single file</p>
        </div>
      </div>

      {/* Visual Indicators */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Visual Indicators
        </h3>
        <p className="text-foreground mb-2">
          Compare Mode Status Indicators:
        </p>
        <div className="text-muted-foreground text-xs space-y-1 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[hsl(var(--status-match))]">✅</span> In both, values match
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[hsl(var(--status-differ))]">⚠️</span> In both, values differ
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[hsl(var(--status-only-a))]">🔵</span> Only in Dataset A
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[hsl(var(--status-only-b))]">🟠</span> Only in Dataset B
          </div>
        </div>
        <p className="text-foreground mb-2">
          Type Colors:
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[hsl(var(--type-string))]">■</span> String
            <span className="text-[hsl(var(--type-number))]">■</span> Number
            <span className="text-[hsl(var(--type-boolean))]">■</span> Boolean
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[hsl(var(--type-array))]">■</span> Array
            <span className="text-[hsl(var(--type-object))]">■</span> Object
          </div>
        </div>
      </div>

      {/* Limitations */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Limitations
        </h3>
        <p className="text-foreground mb-2">
          What this tool doesn't do:
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• No data transformation or calculations</p>
          <p>• No data validation or cleaning</p>
          <p>• No merging of multiple datasets</p>
          <p>• No editing of field names or values</p>
        </div>
      </div>
    </div>
  );

  return (
    <PageContainer variant="default" maxWidth="xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <PageHeader
            icon={Database}
            title="JSON Data Extractor"
            description="Extract and compare JSON data fields with advanced filtering"
          />
          <HelpTooltip
            content={helpContent}
            variant="modal"
            icon="info"
          />
        </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('extract')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'extract' 
                  ? 'bg-accent text-accent-foreground' 
                  : 'bg-card text-foreground hover:bg-muted'
              }`}
            >
              Extract Mode
            </button>
            <button
              onClick={() => setMode('compare')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'compare' 
                  ? 'bg-accent text-accent-foreground' 
                  : 'bg-card text-foreground hover:bg-muted'
              }`}
            >
              Compare Mode
            </button>
          </div>

          {/* Paste Areas */}
          {mode === 'extract' ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Paste Your Data Here
                </label>
                <div className="flex gap-2">
                  {/* JE-EW-06: Import from URL */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = prompt('Enter JSON URL:');
                      if (url) importFromURL(url);
                    }}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Import URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Import File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const text = await file.text();
                        try {
                          const parsed = JSON.parse(text);
                          const dataArray = Array.isArray(parsed) ? parsed : [parsed];
                          setJsonData(dataArray as JsonObject[]);
                          const keySet = new Set<string>();
                          dataArray.forEach((item: JsonObject) => {
                            if (typeof item === 'object' && item !== null) {
                              Object.keys(item).forEach(key => keySet.add(key));
                            }
                          });
                          setAllKeys(Array.from(keySet).sort());
                          setSelectedKeys(new Set(Array.from(keySet)));
                          setError('');
                        } catch (err) {
                          setError('Failed to parse JSON file');
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                  dragActive ? 'border-accent bg-accent/10 animate-pulse' : 'border-border'
                }`}
              >
                <Textarea
                  onChange={(e) => handlePaste(e, false)}
                  placeholder='Paste your JSON data here or drag & drop a JSON file...'
                  className="h-32 md:h-40 font-mono"
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-destructive">{error}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-accent">
                  Dataset A
                </label>
                <Textarea
                  onChange={(e) => handlePaste(e, false)}
                  placeholder='Paste Dataset A here...'
                  className="h-32 md:h-40 bg-card text-foreground border-2 border-accent"
                  style={{ 
                    boxShadow: theme === 'dark' 
                      ? '0 0 10px hsl(var(--accent) / 0.2)' 
                      : '0 0 10px hsl(var(--accent) / 0.3)'
                  }}
                />
                {error && (
                  <p className="mt-2 text-sm text-destructive">{error}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-accent">
                  Dataset B
                </label>
                <Textarea
                  onChange={(e) => handlePaste(e, true)}
                  placeholder='Paste Dataset B here...'
                  className="h-32 md:h-40 bg-card text-foreground border-2 border-accent"
                  style={{ 
                    boxShadow: theme === 'dark' 
                      ? '0 0 10px hsl(var(--accent) / 0.2)' 
                      : '0 0 10px hsl(var(--accent) / 0.3)'
                  }}
                />
                {errorB && (
                  <p className="mt-2 text-sm text-destructive">{errorB}</p>
                )}
              </div>
            </div>
          )}

          {(jsonData.length > 0 || (mode === 'compare' && jsonDataB.length > 0)) && (
            <>
              <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
                <div className="rounded-lg p-3 md:p-4 bg-card border border-border">
                  <div className="text-xs md:text-sm text-muted-foreground">
                    {mode === 'compare' ? 'Records A/B' : 'Records'}
                  </div>
                  <div className="text-lg md:text-2xl font-bold text-foreground">
                    {mode === 'compare' ? `${jsonData.length}/${jsonDataB.length}` : jsonData.length}
                  </div>
                </div>
                <div className="rounded-lg p-3 md:p-4 bg-card border border-border">
                  <div className="text-xs md:text-sm text-muted-foreground">Total Fields</div>
                  <div className="text-lg md:text-2xl font-bold text-foreground">
                    {mode === 'compare' && comparisonAnalysis ? Object.keys(comparisonAnalysis).length : allKeys.length}
                  </div>
                </div>
                <div className="rounded-lg p-3 md:p-4 bg-card border border-border">
                  <div className="text-xs md:text-sm text-muted-foreground">Selected</div>
                  <div className="text-lg md:text-2xl font-bold text-foreground">{selectedKeys.size}</div>
                </div>
              </div>

              {/* JE-EW-04: Statistics Dashboard */}
              {showStats && mode === 'extract' && selectedKeys.size > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Statistics Dashboard
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setShowStats(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-lg p-4 bg-card border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Data Quality Score</div>
                      <div className="text-2xl font-bold text-foreground">{dataQualityScore.toFixed(1)}%</div>
                    </div>
                    {Object.entries(fieldStatistics).slice(0, 3).map(([key, stat]) => (
                      <div key={key} className="rounded-lg p-4 bg-card border border-border">
                        <div className="text-xs text-muted-foreground mb-2 truncate" title={key}>{key}</div>
                        <div className="space-y-1 text-xs">
                          {stat.min !== undefined && (
                            <div>Min: {stat.min.toFixed(2)} | Max: {stat.max!.toFixed(2)}</div>
                          )}
                          {stat.avg !== undefined && <div>Avg: {stat.avg.toFixed(2)}</div>}
                          <div>Unique: {stat.uniqueCount} | Null: {stat.nullPercentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!showStats && mode === 'extract' && (
                <Button variant="outline" size="sm" onClick={() => setShowStats(true)} className="mb-4">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Show Statistics
                </Button>
              )}

              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search fields..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 bg-muted border border-border text-foreground"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setHideEmpty(!hideEmpty)}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    hideEmpty 
                      ? 'bg-muted text-foreground' 
                      : 'bg-card text-foreground'
                  }`}
                >
                  <Filter className="w-5 h-5" />
                  <span className="hidden md:inline">{hideEmpty ? 'Show All' : 'Hide Empty'}</span>
                </button>
              </div>

              {mode === 'compare' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">
                    Export Filter:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setExportMode('all')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                        exportMode === 'all' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      All Fields
                    </button>
                    <button
                      onClick={() => setExportMode('common')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                        exportMode === 'common' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      Common Only
                    </button>
                    <button
                      onClick={() => setExportMode('differences')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                        exportMode === 'differences' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      Differences Only
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 md:gap-3 mb-4">
                <button
                  onClick={selectAll}
                  className="px-3 md:px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base bg-muted text-foreground"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="px-3 md:px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base bg-card text-foreground"
                >
                  Deselect All
                </button>
              </div>

              <div className="rounded-lg p-4 mb-6 max-h-96 overflow-y-auto bg-muted border border-border">
                <div className="space-y-4">
                  {Object.entries(groupedFields.groups).map(([groupName, fields]) => {
                    const groupFields = fields.filter(f => filteredKeys.includes(f));
                    if (groupFields.length === 0) return null;
                    
                    return (
                      <div key={groupName}>
                        <button
                          onClick={() => toggleGroup(groupName)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-2 transition-colors bg-muted text-foreground border border-border"
                        >
                          {collapsedGroups.has(groupName) ? (
                            <ChevronRight className="w-4 h-4 transition-transform duration-200" />
                          ) : (
                            <ChevronDown className="w-4 h-4 transition-transform duration-200 rotate-90" />
                          )}
                          <span className="font-semibold">{groupName} ({groupFields.length})</span>
                        </button>
                        {!collapsedGroups.has(groupName) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-6 transition-all duration-300 animate-fadeIn">
                            {groupFields.map(renderFieldCheckbox)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {groupedFields.ungrouped.filter(f => filteredKeys.includes(f)).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {groupedFields.ungrouped.filter(f => filteredKeys.includes(f)).map(renderFieldCheckbox)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:gap-3 mb-6">
                <button
                  onClick={exportToCSV}
                  disabled={selectedKeys.size === 0}
                  className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base bg-accent text-accent-foreground"
                >
                  <Download className="w-4 h-4 md:w-5 md:h-5" />
                  Export CSV
                </button>
                <button
                  onClick={exportToJSON}
                  disabled={selectedKeys.size === 0}
                  className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base bg-accent text-accent-foreground"
                >
                  <Download className="w-4 h-4 md:w-5 md:h-5" />
                  Export JSON
                </button>
              </div>

              {selectedKeys.size > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base md:text-lg font-semibold text-foreground">
                      {mode === 'compare' ? 'Comparison Preview' : `Table Preview (first ${previewCount} records)`}
                    </h3>
                    <div className="flex items-center gap-2">
                      <select
                        value={previewCount}
                        onChange={(e) => setPreviewCount(Number(e.target.value))}
                        className="px-2 py-1 rounded text-sm bg-muted text-foreground border border-border"
                      >
                        <option value={3}>3</option>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                      </select>
                      <button
                        onClick={() => setPreviewCount(previewCount)}
                        className="p-2 rounded transition-colors bg-muted text-muted-foreground"
                        title="Refresh preview"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {mode === 'compare' ? (
                    <div className="rounded-lg overflow-x-auto bg-card border border-border">
                      <table className="w-full text-xs md:text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold sticky left-0 z-10 bg-muted text-foreground border-b-2 border-border border-r-2 border-border">
                              Field
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--status-only-a))] bg-muted border-b-2 border-border border-r-2 border-border">
                              Sample Values (A)
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--status-only-b))] bg-muted border-b-2 border-border">
                              Sample Values (B)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(selectedKeys).sort().map((key: string) => {
                            const analysis = comparisonAnalysis?.[key];
                            if (!analysis) return null;
                            const samplesA = analysis.samplesA.map(v => 
                              typeof v === 'object' ? JSON.stringify(v) : String(v)
                            ).join(', ');
                            const samplesB = analysis.samplesB.map(v => 
                              typeof v === 'object' ? JSON.stringify(v) : String(v)
                            ).join(', ');
                            
                            return (
                              <tr key={key}>
                                <td 
                                  className="px-3 py-2 font-semibold sticky left-0 z-10 whitespace-nowrap bg-card text-foreground border-b border-r-2 border-border"
                                >
                                  {key}
                                </td>
                                <td 
                                  className={`px-3 py-2 border-b border-r-2 border-border ${
                                    analysis.inA ? 'text-foreground bg-blue-500/10' : 'text-muted-foreground'
                                  }`}
                                >
                                  {analysis.inA ? (samplesA.length > 50 ? samplesA.substring(0, 50) + '...' : samplesA || 'null') : '(not in A)'}
                                </td>
                                <td 
                                  className={`px-3 py-2 border-b border-border ${
                                    analysis.inB ? 'text-foreground bg-orange-500/10' : 'text-muted-foreground'
                                  }`}
                                >
                                  {analysis.inB ? (samplesB.length > 50 ? samplesB.substring(0, 50) + '...' : samplesB || 'null') : '(not in B)'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-x-auto bg-card border border-border">
                      <table className="w-full text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left font-semibold sticky left-0 z-10 bg-muted text-foreground">
                              Record
                            </th>
                            {Array.from(selectedKeys).sort().map(key => {
                              const isSorted = sortColumn === key;
                              return (
                                <th 
                                  key={key} 
                                  className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground cursor-pointer hover:bg-muted/50 select-none"
                                  onClick={() => handleSort(key)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{key}</span>
                                    {isSorted && (
                                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyFieldPath(key);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 hover:opacity-100"
                                      title="Copy field path"
                                    >
                                      {copiedField === key ? (
                                        <Check className="w-3 h-3 text-green-500 animate-scaleIn" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredData.slice(0, previewCount).map((record, idx) => (
                            <tr key={idx} className="border-b border-border group">
                              <td className="px-3 py-2 font-semibold sticky left-0 z-10 bg-muted text-muted-foreground">
                                #{idx + 1}
                              </td>
                              {Array.from(selectedKeys).sort().map(key => {
                                const value = record[key];
                                const displayValue = value === null || value === undefined ? 
                                  'null' : 
                                  typeof value === 'object' ? 
                                    JSON.stringify(value) : 
                                    String(value);
                                const cellId = `${idx}-${key}`;
                                const isExpanded = expandedCells.has(cellId);
                                const shouldTruncate = displayValue.length > 50;
                                
                                return (
                                  <td 
                                    key={key} 
                                    className="px-3 py-2 whitespace-nowrap relative group/cell"
                                    style={{ color: getTypeColor(value) }}
                                    title={`Type: ${typeof value}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span 
                                        className={shouldTruncate && !isExpanded ? 'cursor-pointer' : ''}
                                        onClick={() => {
                                          if (shouldTruncate) {
                                            const newExpanded = new Set(expandedCells);
                                            if (isExpanded) {
                                              newExpanded.delete(cellId);
                                            } else {
                                              newExpanded.add(cellId);
                                            }
                                            setExpandedCells(newExpanded);
                                          }
                                        }}
                                      >
                                        {shouldTruncate && !isExpanded ? displayValue.substring(0, 50) + '...' : displayValue}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyFieldValue(value);
                                        }}
                                        className="opacity-0 group-hover/cell:opacity-100 hover:opacity-100"
                                        title="Copy value"
                                      >
                                        {copiedField === 'value' ? (
                                          <Check className="w-3 h-3 text-green-500 animate-scaleIn" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {jsonData.length === 0 && !error && (
            <div className="text-center py-8 md:py-12">
              <Upload className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-base md:text-lg text-muted-foreground">
                {mode === 'compare' ? 'Paste datasets above to compare' : 'Paste your data above to get started'}
              </p>
              <p className="text-xs md:text-sm mt-2 text-muted-foreground">Just copy and paste - the tool handles the rest!</p>
            </div>
          )}
    </PageContainer>
  );
}