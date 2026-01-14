import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, ExternalLink, Copy, Check, MessageSquare, X, Trash2, GitBranch, Search, BarChart3, Download, FileText, FileJson } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Textarea, Input } from '@/components/ui/input';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { Button } from '@/components/ui/button';

interface Card {
  id: number;
  url: string;
  title: string;
  customTitle?: string;
  column: string;
  notes: string[];
  isMultiSelect?: boolean;
  selectedIds?: number[];
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  archived?: boolean;
  createdAt?: string;
}

interface DuplicateToast {
  id: number;
  urls: Card[];
  conflictCount: number;
}

interface Conflict {
  url: string;
  existingCard?: Card;
  importedVersions: Card[];
  columns: string[];
}

interface DragOverPosition {
  columnId: string;
  index: number;
  type: 'before' | 'after';
}

interface ImportedData {
  cards: Card[];
  isMultiColumn: boolean;
  totalCount?: number;
  columnsImported?: string[];
  columnTitle?: string;
  count?: number;
}

const PRDeploymentTracker = () => {
  const { theme } = useTheme();
  const [inputUrls, setInputUrls] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [copiedColumn, setCopiedColumn] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const dragScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<DragOverPosition | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [duplicateToasts, setDuplicateToasts] = useState<DuplicateToast[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingPRs, setConflictingPRs] = useState<Conflict[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, string | null>>({});
  
  // DT-EW-01, DT-EW-02, DT-EW-03, DT-EW-04, DT-EW-05, DT-EW-06: New state for easy wins
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColumn, setFilterColumn] = useState<string | null>(null);
  const [filterNotes, setFilterNotes] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [bulkNoteInput, setBulkNoteInput] = useState('');
  const [bulkTitleInput, setBulkTitleInput] = useState('');
  const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const columns = [
    { id: 'yet-to-verify', title: 'Yet to Verify', color: 'bg-accent/10 border-accent/30' },
    { id: 'partially-deployed', title: 'Partially Deployed', color: 'bg-muted/50 border-muted' },
    { id: 'fully-deployed-fixed', title: 'Fully Deployed/Fixed', color: 'bg-accent/20 border-accent/40' },
    { id: 'fully-deployed-not-fixed', title: 'Fully Deployed/Not Fixed', color: 'bg-destructive/10 border-destructive/30' }
  ];

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const showDuplicateToast = (duplicateData: Card[], conflictCount = 0) => {
    const toastId = Date.now();
    setDuplicateToasts(prev => [...prev, { id: toastId, urls: duplicateData, conflictCount }]);
  };

  const removeDuplicateToast = (toastId: number) => {
    setDuplicateToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  const copyDuplicateUrls = (duplicateData: Card[], _toastId: number | null) => {
    // Format: Title - URL (Notes: ...) [Would be in: Column]
    let output = 'Skipped Duplicates\n==================\n';
    
    duplicateData.forEach((dup: Card) => {
      const displayTitle = dup.customTitle || dup.title;
      let line = `${displayTitle} - ${dup.url}`;
      
      if (dup.notes && dup.notes.length > 0) {
        line += ` (Notes: ${dup.notes.join(', ')})`;
      }
      
      // Find the column name
      const columnName = columns.find(col => col.id === dup.column)?.title || dup.column;
      line += ` [Would be in: ${columnName}]`;
      
      output += line + '\n';
    });
    
    navigator.clipboard.writeText(output);
    showToast(`Copied ${duplicateData.length} duplicate PR details to clipboard`);
  };

  const openConflictModal = (conflicts: Conflict[]) => {
    setConflictingPRs(conflicts);
    
    // Initialize resolutions with current column for existing PRs
    const initialResolutions: Record<string, string | null> = {};
    conflicts.forEach((conflict: Conflict) => {
      if (conflict.existingCard) {
        initialResolutions[conflict.url] = conflict.existingCard.column;
      } else {
        initialResolutions[conflict.url] = null; // User must choose
      }
    });
    setConflictResolutions(initialResolutions);
    // Don't open modal automatically, wait for user to click "Review Conflicts"
  };

  const showConflictModalFromToast = (toastId: number) => {
    setShowConflictModal(true);
    // Close the toast that opened this
    removeDuplicateToast(toastId);
  };

  const setConflictResolution = (url: string, column: string | null) => {
    setConflictResolutions(prev => ({
      ...prev,
      [url]: column
    }));
  };

  const skipConflictPR = (url: string) => {
    setConflictResolutions(prev => ({
      ...prev,
      [url]: 'SKIP'
    }));
  };

  const confirmConflictResolutions = () => {
    // Apply the chosen resolutions
    conflictingPRs.forEach((conflict: Conflict) => {
      const resolution = conflictResolutions[conflict.url];
      
      if (resolution === 'SKIP') {
        return; // Skip this PR
      }
      
      if (!resolution) {
        return; // No selection made, skip
      }
      
      if (conflict.existingCard) {
        // Update existing card's column and merge notes
        setCards(prev => prev.map(card => {
          if (card.url === conflict.url) {
            const existingNotes = new Set(card.notes || []);
            const allNewNotes = conflict.importedVersions.flatMap((v: Card) => v.notes || []);
            const notesToAdd = allNewNotes.filter((note: string) => !existingNotes.has(note));
            
            return {
              ...card,
              column: resolution,
              notes: [...(card.notes || []), ...notesToAdd]
            };
          }
          return card;
        }));
      } else {
        // Add new card with chosen column
        const firstVersion = conflict.importedVersions[0];
        const allNotes = [...new Set(conflict.importedVersions.flatMap((v: Card) => v.notes || []))];
        
        setCards(prev => [...prev, {
          ...firstVersion,
          id: Date.now() + Math.random(),
          column: resolution,
          notes: allNotes,
          createdAt: new Date().toISOString()
        }]);
      }
    });
    
    setShowConflictModal(false);
    setConflictingPRs([]);
    setConflictResolutions({});
    showToast('Conflict resolutions applied');
  };

  const cancelConflictResolution = () => {
    setShowConflictModal(false);
    setConflictingPRs([]);
    setConflictResolutions({});
  };

  const parseImportedData = (text: string): ImportedData | null => {
    const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
    
    // Check for multi-column format first (multiple === separators)
    const headerIndices: number[] = [];
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i + 1] && lines[i + 1].startsWith('===')) {
        headerIndices.push(i);
      }
    }
    
    if (headerIndices.length > 1) {
      // Multi-column import
      const importedCards: Card[] = [];
      let totalCount = 0;
      const columnsImported: string[] = [];
      
      headerIndices.forEach((headerIndex: number, sectionIndex: number) => {
        const headerText = lines[headerIndex];
        const targetColumn = columns.find(col => col.title === headerText);
        
        if (!targetColumn) return; // Skip unknown columns
        
        // Find end of this section
        const nextHeaderIndex = headerIndices[sectionIndex + 1];
        const endIndex = nextHeaderIndex ? nextHeaderIndex : lines.length;
        
        // Get data lines for this section (skip header and === line)
        const sectionLines = lines.slice(headerIndex + 2, endIndex).filter((line: string) => 
          !line.startsWith('Last validated:') && 
          line.includes('http') // Only lines with URLs
        );
        
        sectionLines.forEach((line: string, index: number) => {
          // Parse format: "Title - URL (Notes: note1, note2)"
          const urlMatch = line.match(/(https?:\/\/[^\s)]+)/);
          if (!urlMatch) return;
          
          const url = urlMatch[1];
          const beforeUrl = line.substring(0, line.indexOf(url)).replace(' - ', '');
          const afterUrl = line.substring(line.indexOf(url) + url.length);
          
          // Extract notes if present
          const notesMatch = afterUrl.match(/\(Notes: ([^)]+)\)/);
          const notes = notesMatch ? notesMatch[1].split(',').map((n: string) => n.trim()) : [];
          
          // Determine if title is custom or original PR format
          const originalTitle = extractPRNumber(url);
          const customTitle = (beforeUrl && beforeUrl !== originalTitle) ? beforeUrl : '';
          
          importedCards.push({
            id: Date.now() + index + Math.random() + sectionIndex * 1000,
            url: url,
            title: originalTitle,
            customTitle: customTitle,
            column: targetColumn.id,
            notes: notes,
            createdAt: new Date().toISOString()
          });
          
          totalCount++;
        });
        
        if (sectionLines.length > 0) {
          columnsImported.push(targetColumn.title);
        }
      });
      
      return {
        cards: importedCards,
        isMultiColumn: true,
        totalCount: totalCount,
        columnsImported: columnsImported
      };
    }
    
    // Single-column import (existing logic)
    let headerIndex = -1;
    let targetColumn = null;
    
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i + 1] && lines[i + 1].startsWith('===')) {
        headerIndex = i;
        const headerText = lines[i];
        // Find matching column
        targetColumn = columns.find(col => col.title === headerText);
        break;
      }
    }
    
    if (!targetColumn) return null; // Not imported data format
    
    const dataLines = lines.slice(headerIndex + 2).filter((line: string) => 
      !line.startsWith('Last validated:') && 
      line.includes('http') // Only lines with URLs
    );
    
    const importedCards: Card[] = [];
    
    dataLines.forEach((line: string, index: number) => {
      // Parse format: "Title - URL (Notes: note1, note2)"
      const urlMatch = line.match(/(https?:\/\/[^\s)]+)/);
      if (!urlMatch) return;
      
      const url = urlMatch[1];
      const beforeUrl = line.substring(0, line.indexOf(url)).replace(' - ', '');
      const afterUrl = line.substring(line.indexOf(url) + url.length);
      
      // Extract notes if present
      const notesMatch = afterUrl.match(/\(Notes: ([^)]+)\)/);
      const notes = notesMatch ? notesMatch[1].split(',').map((n: string) => n.trim()) : [];
      
      // Determine if title is custom or original PR format
      const originalTitle = extractPRNumber(url);
      const customTitle = (beforeUrl && beforeUrl !== originalTitle) ? beforeUrl : '';
      
      importedCards.push({
        id: Date.now() + index + Math.random(),
        url: url,
        title: originalTitle,
        customTitle: customTitle,
        column: targetColumn.id,
        notes: notes,
        createdAt: new Date().toISOString()
      });
    });
    
    return {
      cards: importedCards,
      columnTitle: targetColumn.title,
      count: importedCards.length,
      isMultiColumn: false
    };
  };

  const extractPRNumber = (url: string): string => {
    const match = url.match(/\/pull\/(\d+)/);
    return match ? `PR #${match[1]}` : 'Unknown PR';
  };

  const addCards = () => {
    if (!inputUrls.trim()) return;
    
    // First try to parse as imported data
    const importedData = parseImportedData(inputUrls);
    
    if (importedData) {
      // Handle imported tracker data with duplicate detection
      const existingUrls = new Set(cards.map(card => card.url));
      const duplicateData: Card[] = [];
      const conflictData: Record<string, { url: string; existingCard: Card; columns: Set<string>; versions: Card[] }> = {}; // Track conflicts by URL
      const newCards: Card[] = [];
      const seenInImport = new Set<string>(); // Track URLs we've already processed in this import
      
      importedData.cards.forEach((card: Card) => {
        if (seenInImport.has(card.url)) {
          // Check if this is a different column than what we've seen
          const existingEntry = conflictData[card.url];
          if (existingEntry && !existingEntry.columns.has(card.column)) {
            existingEntry.columns.add(card.column);
            existingEntry.versions.push(card);
          }
          return;
        }
        
        seenInImport.add(card.url);
        
        if (existingUrls.has(card.url)) {
          // Duplicate of existing card in tracker
          const existingCard = cards.find(c => c.url === card.url);
          
          if (!existingCard) return;
          
          // Check if columns differ
          if (existingCard.column !== card.column) {
            // Conflict detected
            if (!conflictData[card.url]) {
              conflictData[card.url] = {
                url: card.url,
                existingCard: existingCard,
                columns: new Set([existingCard.column, card.column]),
                versions: [card]
              };
            } else {
              conflictData[card.url].columns.add(card.column);
              conflictData[card.url].versions.push(card);
            }
          } else {
            // Same column, just merge notes
            duplicateData.push(card);
            
            setCards(prev => prev.map(existingCard => {
              if (existingCard.url === card.url && card.notes.length > 0) {
                const existingNotes = new Set(existingCard.notes || []);
                const notesToAdd = card.notes.filter((note: string) => !existingNotes.has(note));
                
                if (notesToAdd.length > 0) {
                  return {
                    ...existingCard,
                    notes: [...(existingCard.notes || []), ...notesToAdd]
                  };
                }
              }
              return existingCard;
            }));
          }
        } else {
          // Not a duplicate, add to new cards
          newCards.push(card);
        }
      });
      
      // Add new non-duplicate cards
      if (newCards.length > 0) {
        setCards(prev => [...prev, ...newCards]);
      }
      
      // Convert conflict data to array
      const conflicts: Conflict[] = Object.values(conflictData).map((conflict: { url: string; existingCard: Card; columns: Set<string>; versions: Card[] }) => ({
        url: conflict.url,
        existingCard: conflict.existingCard,
        importedVersions: conflict.versions,
        columns: Array.from(conflict.columns)
      }));
      
      // Show appropriate toast messages
      if (importedData.isMultiColumn) {
        if (newCards.length > 0 && importedData.columnsImported) {
          showToast(`Imported ${newCards.length} PRs across ${importedData.columnsImported.length} columns: ${importedData.columnsImported.join(', ')}`);
        }
      } else {
        if (newCards.length > 0 && importedData.columnTitle) {
          showToast(`Imported ${newCards.length} PRs to "${importedData.columnTitle}" column with titles and notes`);
        }
      }
      
      // Show duplicate toast if any were found
      if (duplicateData.length > 0 || conflicts.length > 0) {
        showDuplicateToast(duplicateData, conflicts.length);
      }
      
      // Prepare conflicts but don't open modal yet
      if (conflicts.length > 0) {
        openConflictModal(conflicts);
      }
      
      setInputUrls('');
      return;
    }
    
    // Fall back to regular URL parsing with duplicate detection
    const lines = inputUrls.split('\n').filter((line: string) => line.trim());
    
    // Extract URLs from lines, handling text before/after URLs
    const urls: string[] = [];
    lines.forEach((line: string) => {
      const trimmed = line.trim();
      const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        urls.push(urlMatch[1]); // Just the URL part, not the whole line
      }
    });
    
    if (urls.length === 0) {
      showToast('No valid URLs found. Please paste GitHub PR URLs (starting with https://)');
      return;
    }
    
    // Check for duplicates in regular URL additions
    const existingUrls2 = new Set(cards.map(card => card.url));
    const duplicateData2: Card[] = [];
    const uniqueUrls: string[] = [];
    const seenInImport2 = new Set<string>(); // Track URLs within this import
    
    urls.forEach((url: string) => {
      if (seenInImport2.has(url)) {
        // Duplicate within same import - silently skip
        return;
      }
      
      seenInImport2.add(url);
      
      if (existingUrls2.has(url)) {
        // Store as card-like object for consistent formatting
        duplicateData2.push({
          id: Date.now(),
          url: url,
          title: extractPRNumber(url),
          customTitle: '',
          column: 'yet-to-verify',
          notes: [],
          createdAt: new Date().toISOString()
        });
      } else {
        uniqueUrls.push(url);
      }
    });
    
    // Add only unique URLs
    if (uniqueUrls.length > 0) {
      const newCards2: Card[] = uniqueUrls.map((url: string, index: number) => ({
        id: Date.now() + index,
        url: url,
        title: extractPRNumber(url),
        customTitle: '',
        column: 'yet-to-verify',
        notes: [],
        createdAt: new Date().toISOString()
      }));
      
      setCards(prev => [...prev, ...newCards2]);
      showToast(`Added ${uniqueUrls.length} PRs to "Yet to Verify" column`);
    }
    
    // Show duplicate toast if any were found
    if (duplicateData2.length > 0) {
      showDuplicateToast(duplicateData2);
    }
    
    setInputUrls('');
  };

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    // If card is part of selection, drag all selected cards
    // Otherwise, just drag this card
    if (selectedCards.includes(card.id)) {
      setDraggedCard({ ...card, isMultiSelect: true, selectedIds: selectedCards });
    } else {
      setDraggedCard(card);
    }
    
    e.dataTransfer.effectAllowed = 'move';
    
    // Style the drag image with prominent glow effect
    const target = e.target as HTMLElement;
    const dragElement = target.cloneNode(true) as HTMLElement;
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    dragElement.style.transform = 'translateY(-4px)';
    dragElement.style.boxShadow = isDark 
      ? '0 8px 25px hsl(var(--foreground) / 0.25)' 
      : '0 8px 25px hsl(var(--foreground) / 0.15)';
    dragElement.style.border = `2px solid hsl(var(--accent) / 0.4)`;
    dragElement.style.borderRadius = '8px';
    dragElement.style.backgroundColor = `hsl(var(--background))`;
    dragElement.style.opacity = '1';
    
    // Create drag image
    document.body.appendChild(dragElement);
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-1000px';
    const nativeEvent = e.nativeEvent as DragEvent;
    e.dataTransfer.setDragImage(dragElement, nativeEvent.offsetX || 0, nativeEvent.offsetY || 0);
    
    // Clean up drag image after drag starts
    setTimeout(() => {
      if (document.body.contains(dragElement)) {
        document.body.removeChild(dragElement);
      }
    }, 0);
    
    // Add mouse move listener for auto-scroll
    const handleDragMove = (event: DragEvent) => {
      const scrollZone = 30; // Small zone - only at very edges
      const scrollSpeed = 5; // Increased from 3 for slightly faster scroll
      const viewportHeight = window.innerHeight;
      const mouseY = event.clientY;
      
      // Check scroll position to prevent glitching at boundaries
      const currentScrollY = window.scrollY;
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
      
      // Determine if we should be scrolling
      const shouldScrollUp = mouseY < scrollZone && currentScrollY > 5;
      const shouldScrollDown = mouseY > viewportHeight - scrollZone && currentScrollY < maxScrollY - 5;
      const shouldScroll = shouldScrollUp || shouldScrollDown;
      
      // Clear existing interval if we shouldn't be scrolling anymore
      if (!shouldScroll && dragScrollIntervalRef.current) {
        clearInterval(dragScrollIntervalRef.current);
        dragScrollIntervalRef.current = null;
        return;
      }
      
      // Only create new interval if we don't have one and should be scrolling
      if (shouldScroll && !dragScrollIntervalRef.current) {
        if (shouldScrollUp) {
          dragScrollIntervalRef.current = setInterval(() => {
            const newScrollY = window.scrollY;
            if (newScrollY > 5) {
              window.scrollBy(0, -scrollSpeed);
            } else {
              if (dragScrollIntervalRef.current) {
                clearInterval(dragScrollIntervalRef.current);
                dragScrollIntervalRef.current = null;
              }
            }
          }, 33) as unknown as NodeJS.Timeout; // Increased from 50ms to 33ms (30fps)
        } else if (shouldScrollDown) {
          dragScrollIntervalRef.current = setInterval(() => {
            const newScrollY = window.scrollY;
            const newMaxScrollY = document.documentElement.scrollHeight - window.innerHeight;
            if (newScrollY < newMaxScrollY - 5) {
              window.scrollBy(0, scrollSpeed);
            } else {
              if (dragScrollIntervalRef.current) {
                clearInterval(dragScrollIntervalRef.current);
                dragScrollIntervalRef.current = null;
              }
            }
          }, 33) as unknown as NodeJS.Timeout; // Increased from 50ms to 33ms (30fps)
        }
      }
    };
    
    const handleDragEnd = () => {
      if (dragScrollIntervalRef.current) {
        clearInterval(dragScrollIntervalRef.current);
        dragScrollIntervalRef.current = null;
      }
      document.removeEventListener('dragover', handleDragMove);
      document.removeEventListener('dragend', handleDragEnd);
    };
    
    document.addEventListener('dragover', handleDragMove);
    document.addEventListener('dragend', handleDragEnd);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Only handle reordering if dragging within the same column
    const columnElement = e.currentTarget as HTMLElement;
    const columnId = columnElement.getAttribute('data-column-id');
    
    if (draggedCard && columnId && draggedCard.column === columnId) {
      const cardElements = columnElement.querySelectorAll('[data-card-id]');
      const mouseY = e.clientY;
      
      let insertPosition: DragOverPosition | null = null;
      
      for (let i = 0; i < cardElements.length; i++) {
        const card = cardElements[i] as HTMLElement;
        const rect = card.getBoundingClientRect();
        const cardMiddle = rect.top + rect.height / 2;
        
        if (mouseY < cardMiddle) {
          insertPosition = { columnId, index: i, type: 'before' as const };
          break;
        }
      }
      
      // If no position found, insert at end
      if (!insertPosition) {
        insertPosition = { columnId, index: cardElements.length, type: 'after' as const };
      }
      
      setDragOverPosition(insertPosition);
    } else {
      setDragOverPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggedCard) return;

    if (draggedCard.isMultiSelect && draggedCard.selectedIds) {
      // Moving multiple selected cards
      setCards(prev => prev.map(card => 
        draggedCard.selectedIds!.includes(card.id)
          ? { ...card, column: columnId }
          : card
      ));
      const column = columns.find(col => col.id === columnId);
      if (column) {
        showToast(`Moved ${draggedCard.selectedIds.length} cards to ${column.title}`);
      }
      clearSelection();
    } else if (draggedCard.column === columnId && dragOverPosition) {
      // Reordering within same column
      setCards(prev => {
        const columnCards = prev.filter(card => card.column === columnId && card.id !== draggedCard.id);
        const otherCards = prev.filter(card => card.column !== columnId);
        
        // Insert at the specified position
        columnCards.splice(dragOverPosition.index, 0, draggedCard);
        
        return [...otherCards, ...columnCards];
      });
    } else {
      // Moving single card to different column
      setCards(prev => prev.map(card => 
        card.id === draggedCard.id 
          ? { ...card, column: columnId }
          : card
      ));
    }
    
    setDraggedCard(null);
    setDragOverPosition(null);
    
    // Clean up scroll interval
    if (dragScrollIntervalRef.current) {
      clearInterval(dragScrollIntervalRef.current);
      dragScrollIntervalRef.current = null;
    }
  };

  const openPR = (url: string) => {
    window.open(url, '_blank');
  };

  const getCardsInColumn = (columnId: string): Card[] => {
    return filteredCards.filter(card => card.column === columnId);
  };

  const copyColumnUrls = async (columnId: string) => {
    const columnCards = getCardsInColumn(columnId);
    if (columnCards.length === 0) return;
    
    const column = columns.find(col => col.id === columnId);
    if (!column) return;
    
    const now = new Date();
    
    // Simplified date/time formatting to avoid potential issues
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();
    let hour = now.getHours();
    const minute = now.getMinutes().toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // 0 should be 12
    
    const dateStr = `${month}/${day}/${year}`;
    const timeStr = `${hour}:${minute} ${ampm} EST`;
    
    const header = `${column.title}\n${'='.repeat(column.title.length)}\n`;
    
    const urls = columnCards.map(card => {
      const displayTitle = card.customTitle || card.title;
      let line = `${displayTitle} - ${card.url}`;
      if (card.notes && card.notes.length > 0) {
        line += ` (Notes: ${card.notes.join(', ')})`;
      }
      return line;
    }).join('\n');
    
    const footer = `\nLast validated: ${dateStr} ${timeStr}`;
    
    const fullText = header + urls + footer;
    
    console.log('Copying text:', fullText); // Debug log
    
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedColumn(columnId);
      setTimeout(() => setCopiedColumn(null), 2000);
      showToast(`Copied ${columnCards.length} PRs from "${column.title}" column`);
    } catch (err: unknown) {
      console.error('Failed to copy URLs:', err);
      // Fallback for browsers that don't support clipboard API
      alert('Copy failed. Text to copy:\n\n' + fullText);
    }
  };

  const addNote = (cardId: number) => {
    if (!noteInput.trim()) return;
    
    setCards(prev => prev.map(card => 
      card.id === cardId 
        ? { ...card, notes: [...(card.notes || []), noteInput.trim()] }
        : card
    ));
    
    setNoteInput('');
    setEditingNote(null);
  };

  const removeNote = (cardId: number, noteIndex: number) => {
    setCards(prev => prev.map(card => 
      card.id === cardId 
        ? { ...card, notes: card.notes.filter((_, index) => index !== noteIndex) }
        : card
    ));
  };

  const handleNoteKeyPress = (e: React.KeyboardEvent, cardId: number) => {
    if (e.key === 'Enter') {
      addNote(cardId);
    } else if (e.key === 'Escape') {
      setEditingNote(null);
      setNoteInput('');
    }
  };

  const saveTitle = (cardId: number) => {
    if (titleInput.trim()) {
      setCards(prev => prev.map(card => 
        card.id === cardId 
          ? { ...card, customTitle: titleInput.trim() }
          : card
      ));
    }
    setTitleInput('');
    setEditingTitle(null);
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent, cardId: number) => {
    if (e.key === 'Enter') {
      saveTitle(cardId);
    } else if (e.key === 'Escape') {
      setEditingTitle(null);
      setTitleInput('');
    }
  };

  const deleteCard = (cardId: number) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
    showToast('Card deleted');
    setShowDeleteModal(false);
    setCardToDelete(null);
  };

  const confirmDelete = (card: Card) => {
    setCardToDelete(card);
    setShowDeleteModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCardToDelete(null);
  };

  const handleCardClick = (e: React.MouseEvent, card: Card) => {
    // Check if Ctrl (Windows/Linux) or Cmd (Mac) is pressed
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      
      setSelectedCards(prev => {
        if (prev.includes(card.id)) {
          // Deselect if already selected
          return prev.filter(id => id !== card.id);
        } else {
          // Add to selection
          return [...prev, card.id];
        }
      });
    }
  };

  const clearSelection = () => {
    setSelectedCards([]);
  };

  // DT-EW-01: Search & Filter
  const filteredCards = useMemo(() => {
    let filtered = cards.filter(card => !card.archived);
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(card => {
        const title = (card.customTitle || card.title).toLowerCase();
        const url = card.url.toLowerCase();
        const notes = card.notes.join(' ').toLowerCase();
        return title.includes(searchLower) || url.includes(searchLower) || notes.includes(searchLower);
      });
    }
    
    if (filterColumn) {
      filtered = filtered.filter(card => card.column === filterColumn);
    }
    
    if (filterNotes) {
      const notesLower = filterNotes.toLowerCase();
      filtered = filtered.filter(card => 
        card.notes.some(note => note.toLowerCase().includes(notesLower))
      );
    }
    
    return filtered;
  }, [cards, searchTerm, filterColumn, filterNotes]);

  const getCardsForColumn = (columnId: string) => {
    return filteredCards.filter(card => card.column === columnId);
  };

  // DT-EW-02: Bulk Operations
  const bulkMoveCards = (targetColumn: string) => {
    if (selectedCards.length === 0) return;
    
    setCards(prev => prev.map(card => 
      selectedCards.includes(card.id) 
        ? { ...card, column: targetColumn }
        : card
    ));
    showToast(`Moved ${selectedCards.length} card(s) to ${columns.find(c => c.id === targetColumn)?.title}`);
    setSelectedCards([]);
    setShowBulkMoveMenu(false);
  };

  const bulkAddNotes = () => {
    if (selectedCards.length === 0 || !bulkNoteInput.trim()) return;
    
    setCards(prev => prev.map(card => 
      selectedCards.includes(card.id)
        ? { ...card, notes: [...(card.notes || []), bulkNoteInput.trim()] }
        : card
    ));
    showToast(`Added note to ${selectedCards.length} card(s)`);
    setBulkNoteInput('');
    setShowBulkMenu(false);
  };

  const bulkDeleteCards = () => {
    if (selectedCards.length === 0) return;
    
    setCards(prev => prev.filter(card => !selectedCards.includes(card.id)));
    showToast(`Deleted ${selectedCards.length} card(s)`);
    setSelectedCards([]);
    setShowBulkMenu(false);
  };

  const bulkEditTitles = () => {
    if (selectedCards.length === 0 || !bulkTitleInput.trim()) return;
    
    setCards(prev => prev.map(card => 
      selectedCards.includes(card.id)
        ? { ...card, customTitle: bulkTitleInput.trim() }
        : card
    ));
    showToast(`Updated title for ${selectedCards.length} card(s)`);
    setBulkTitleInput('');
    setShowBulkMenu(false);
  };

  // DT-EW-03: Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/modals
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA' ||
          (e.target as HTMLElement).closest('[role="dialog"]')) {
        // Ctrl+F to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
          e.preventDefault();
          searchInputRef.current?.focus();
          return;
        }
        return;
      }
      
      // Ctrl+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      
      // Delete to delete selected cards
      if (e.key === 'Delete' && selectedCards.length > 0) {
        e.preventDefault();
        bulkDeleteCards();
        return;
      }
      
      // Ctrl+A to select all cards
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedCards(filteredCards.map(card => card.id));
        return;
      }
      
      // Arrow keys to move selected cards between columns
      if (selectedCards.length > 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const currentColumn = filteredCards.find(card => selectedCards.includes(card.id))?.column;
        if (!currentColumn) return;
        
        const currentIndex = columns.findIndex(col => col.id === currentColumn);
        if (currentIndex === -1) return;
        
        let targetIndex = currentIndex;
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          targetIndex = currentIndex - 1;
        } else if (e.key === 'ArrowRight' && currentIndex < columns.length - 1) {
          targetIndex = currentIndex + 1;
        }
        
        if (targetIndex !== currentIndex) {
          bulkMoveCards(columns[targetIndex].id);
        }
        return;
      }
      
      // Escape to clear selection
      if (e.key === 'Escape' && selectedCards.length > 0) {
        clearSelection();
        showToast('Selection cleared');
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCards, filteredCards, columns]);

  // DT-EW-05: Statistics Dashboard
  const statistics = useMemo(() => {
    const cardsPerColumn: Record<string, number> = {};
    columns.forEach(col => {
      cardsPerColumn[col.id] = getCardsForColumn(col.id).length;
    });
    
    const totalCards = cards.length;
    const cardsWithNotes = cards.filter(card => card.notes && card.notes.length > 0).length;
    const cardsWithNotesPercentage = totalCards > 0 ? (cardsWithNotes / totalCards) * 100 : 0;
    
    const recentlyAdded = cards
      .filter(card => card.createdAt)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
    
    return {
      cardsPerColumn,
      totalCards,
      cardsWithNotes,
      cardsWithNotesPercentage,
      recentlyAdded,
    };
  }, [cards, columns, filteredCards]);

  // DT-EW-06: Export Enhancements
  const exportFilteredJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      cards: filteredCards,
      filters: {
        searchTerm,
        filterColumn,
        filterNotes,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deployment-tracker-export.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported to JSON');
  };

  const exportMarkdownTable = () => {
    let markdown = `# Deployment Tracker Export\n\n`;
    markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
    markdown += `| Column | Title | URL | Notes |\n`;
    markdown += `|--------|-------|-----|-------|\n`;
    
    filteredCards.forEach(card => {
      const columnName = columns.find(col => col.id === card.column)?.title || card.column;
      const title = card.customTitle || card.title;
      const notes = card.notes.join('; ') || '-';
      markdown += `| ${columnName} | ${title} | ${card.url} | ${notes} |\n`;
    });
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deployment-tracker-export.md';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported to Markdown');
  };

  const copyFullStatusReport = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();
    let hour = now.getHours();
    const minute = now.getMinutes().toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    
    const dateStr = `${month}/${day}/${year}`;
    const timeStr = `${hour}:${minute} ${ampm} EST`;
    
    let fullReport = '';
    let totalCards = 0;
    
    // Process each column that has cards
    columns.forEach((column) => {
      const columnCards = getCardsInColumn(column.id);
      if (columnCards.length > 0) {
        totalCards += columnCards.length;
        
        // Add spacing between columns (except first)
        if (fullReport) fullReport += '\n\n';
        
        // Add column header
        fullReport += `${column.title}\n${'='.repeat(column.title.length)}\n`;
        
        // Add cards
        const cardLines = columnCards.map(card => {
          const displayTitle = card.customTitle || card.title;
          let line = `${displayTitle} - ${card.url}`;
          if (card.notes && card.notes.length > 0) {
            line += ` (Notes: ${card.notes.join(', ')})`;
          }
          return line;
        });
        
        fullReport += cardLines.join('\n');
      }
    });
    
    // Add timestamp
    if (fullReport) {
      fullReport += `\n\nLast validated: ${dateStr} ${timeStr}`;
    } else {
      fullReport = `No PRs currently tracked.\n\nLast validated: ${dateStr} ${timeStr}`;
    }
    
    try {
      await navigator.clipboard.writeText(fullReport);
      setShowExportModal(false);
      showToast(`Copied complete status report with ${totalCards} PRs from ${columns.filter(col => getCardsInColumn(col.id).length > 0).length} columns`);
    } catch (err) {
      console.error('Failed to copy status report:', err);
      alert('Copy failed. Report to copy:\n\n' + fullReport);
    }
  };

  const copyReleaseList = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();
    let hour = now.getHours();
    const minute = now.getMinutes().toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    
    const dateStr = `${month}/${day}/${year}`;
    const timeStr = `${hour}:${minute} ${ampm} EST`;
    
    let releaseList = '';
    let totalCards = 0;
    
    // Process each column that has cards
    columns.forEach((column) => {
      const columnCards = getCardsInColumn(column.id);
      if (columnCards.length > 0) {
        totalCards += columnCards.length;
        
        // Add spacing between columns (except first)
        if (releaseList) releaseList += '\n\n';
        
        // Add column header
        releaseList += `${column.title}\n${'='.repeat(column.title.length)}\n`;
        
        // Add cards with Asana linking
        const cardLines = columnCards.map(card => {
          const displayTitle = card.customTitle || card.title;
          
          // Look for Asana URL in notes
          let asanaUrl = null;
          if (card.notes && card.notes.length > 0) {
            for (const note of card.notes) {
              const asanaMatch = note.match(/(https:\/\/app\.asana\.com\/[^\s]+)/);
              if (asanaMatch) {
                asanaUrl = asanaMatch[1];
                break;
              }
            }
          }
          
          // Return title with Asana URL if found, otherwise just title
          return asanaUrl ? `${displayTitle} - ${asanaUrl}` : displayTitle;
        });
        
        releaseList += cardLines.join('\n');
      }
    });
    
    // Add timestamp
    if (releaseList) {
      releaseList += `\n\nLast validated: ${dateStr} ${timeStr}`;
    } else {
      releaseList = `No PRs currently tracked.\n\nLast validated: ${dateStr} ${timeStr}`;
    }
    
    try {
      await navigator.clipboard.writeText(releaseList);
      setShowReleaseModal(false);
      showToast(`Copied release list with ${totalCards} items from ${columns.filter(col => getCardsInColumn(col.id).length > 0).length} columns`);
    } catch (err) {
      console.error('Failed to copy release list:', err);
      alert('Copy failed. Release list to copy:\n\n' + releaseList);
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
          Track your GitHub Pull Requests through the deployment verification process. Organize PRs into columns, add notes, and export status reports.
        </p>
      </div>

      {/* Adding PRs */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Adding Pull Requests
        </h3>
        <p className="text-foreground mb-2">
          Enter one GitHub PR URL per line in the text area, then select <strong>Add PRs to Tracker</strong>.
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• Paste individual URLs or complete exported tracker data</p>
          <p>• Multi-column imports automatically populate all sections with titles, notes, and column positions</p>
        </div>
      </div>
      
      {/* Managing Cards */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Managing Cards
        </h3>
        <p className="text-foreground mb-2">
          Drag cards between columns to monitor deployment progress.
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• Drag cards within a column to reorder items</p>
          <p>• Auto-scroll activates when dragging to screen edges</p>
          <p>• <strong>Ctrl+Click</strong> (or <strong>Cmd+Click</strong> on Mac) to multi-select cards</p>
          <p>• Drag any selected card to move all selected cards to a new column</p>
          <p>• Selected cards show a blue border for clear visual feedback</p>
          <p>• Hover over cards to access note, link, and delete options</p>
        </div>
      </div>
      
      {/* Editing */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Editing Cards
        </h3>
        <p className="text-foreground mb-2">
          Click any card title to customize its name (e.g., "Login Bug Fix").
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• Hover to access note and link buttons for each card</p>
          <p>• Add notes up to 150 characters for context (e.g., "requires API update")</p>
          <p>• Include Asana URLs in notes for release list generation</p>
        </div>
      </div>
      
      {/* Exporting */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Exporting Data
        </h3>
        <p className="text-foreground mb-2">
          Use the column headers to copy column data or export full status reports.
        </p>
        <div className="text-muted-foreground text-xs space-y-1">
          <p>• Click column header buttons to copy column-specific data</p>
          <p>• Export full status reports with all PRs, notes, and timestamps</p>
          <p>• Generate release lists with Asana links from card notes</p>
        </div>
      </div>
    </div>
  );

  return (
    <PageContainer variant="default" maxWidth="xl">
      {/* Header */}
      <Card variant="plain" padding="lg" className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <PageHeader
            icon={GitBranch}
            title="GitHub PR Deployment Tracker"
            description="Track your GitHub PRs through the deployment verification process."
          />
          <HelpTooltip
            content={helpContent}
            variant="modal"
            icon="info"
          />
        </div>
        
        {/* Input Section */}
        <div className="space-y-4">
          <Textarea
            value={inputUrls}
            onChange={(e) => setInputUrls(e.target.value)}
            placeholder="Paste GitHub PR URLs here (one per line)&#10;Example:&#10;https://github.com/owner/repo/pull/123&#10;https://github.com/owner/repo/pull/456"
            className="h-32 resize-none bg-card text-foreground border-2 border-accent focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ 
              boxShadow: theme === 'dark' 
                ? '0 0 10px hsl(var(--accent) / 0.2)' 
                : '0 0 10px hsl(var(--accent) / 0.3)'
            }}
          />
          <button
            onClick={addCards}
            disabled={!inputUrls.trim()}
            className="bg-accent text-accent-foreground dark:text-white px-6 py-2 rounded-lg hover:bg-accent/90 disabled:bg-muted disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus size={20} />
            Add PRs to Tracker
          </button>
        </div>
      </Card>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={cancelDelete}>
            <Card variant="elevated-xl" padding="lg" className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-foreground font-bold">Delete Card</h3>
                <button 
                  onClick={cancelDelete}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-3">
                  Are you sure you want to delete this card?
                </p>
                {cardToDelete && (
                  <div className="bg-muted p-3 rounded border">
                    <div className="font-medium text-foreground">
                      {cardToDelete.customTitle || cardToDelete.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {cardToDelete.url}
                    </div>
                    {cardToDelete.notes && cardToDelete.notes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cardToDelete.notes.map((note, index) => (
                          <span key={index} className="inline-block px-2 py-1 bg-accent/10 text-accent text-xs rounded-full border border-accent/30">
                            {note}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-3">
                  This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (cardToDelete) {
                      deleteCard(cardToDelete.id);
                    }
                  }}
                  className="bg-destructive text-destructive-foreground px-6 py-2 rounded-lg hover:bg-destructive/90 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Card
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Conflict Resolution Modal */}
        {showConflictModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={cancelConflictResolution}>
            <div className="bg-card w-full max-w-4xl flex flex-col" style={{ borderRadius: '12px', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
              {/* Fixed Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl text-foreground font-bold">
                  Resolve Status Conflicts ({conflictingPRs.length} PR{conflictingPRs.length > 1 ? 's' : ''})
                </h2>
                <button 
                  onClick={cancelConflictResolution}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {conflictingPRs.map((conflict: Conflict) => {
                    const displayTitle = conflict.importedVersions[0].customTitle || conflict.importedVersions[0].title;
                    const allNotes = [...new Set(conflict.importedVersions.flatMap((v: Card) => v.notes || []))];
                    const currentResolution = conflictResolutions[conflict.url];
                    const isSkipped = currentResolution === 'SKIP';
                    
                    return (
                      <div key={conflict.url} className="border border-border rounded-lg p-4 bg-muted">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-semibold text-foreground text-lg mb-1">
                              {displayTitle}
                            </div>
                            <div className="text-sm text-muted-foreground mb-2 break-all">
                              {conflict.url}
                            </div>
                          </div>
                          {conflict.existingCard ? (
                            <div className="text-xs font-medium text-accent bg-accent/10 px-3 py-1 rounded-full ml-4 whitespace-nowrap border border-accent/30">
                              In: {columns.find(col => col.id === conflict.existingCard?.column)?.title}
                            </div>
                          ) : (
                            <div className="text-xs font-medium text-[hsl(var(--status-warning))] bg-[hsl(var(--status-warning)/0.1)] px-3 py-1 rounded-full ml-4 whitespace-nowrap border border-[hsl(var(--status-warning)/0.3)]">
                              NEW
                            </div>
                          )}
                        </div>
                        
                        {allNotes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {allNotes.map((note, noteIndex) => (
                              <span key={noteIndex} className="inline-block px-2 py-1 bg-accent/10 text-accent text-xs rounded-full border border-accent/30">
                                {note}
                              </span>
                            ))}
                          </div>
                        )}

                        {!isSkipped && (
                          <div className="mb-3">
                            <div className="text-sm font-semibold text-foreground mb-2">Choose status:</div>
                            <div className="flex flex-wrap gap-2">
                              {conflict.columns.map((columnId: string) => {
                                const column = columns.find(col => col.id === columnId);
                                const isSelected = currentResolution === columnId;
                                
                                return (
                                  <button
                                    key={columnId}
                                    onClick={() => setConflictResolution(conflict.url, columnId)}
                                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                      isSelected
                                        ? 'border-accent bg-accent text-accent-foreground font-semibold'
                                        : 'border-border bg-card text-foreground hover:border-accent'
                                    }`}
                                  >
                                    {column?.title || columnId}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => isSkipped ? setConflictResolution(conflict.url, conflict.existingCard ? conflict.existingCard.column : null) : skipConflictPR(conflict.url)}
                          className="text-muted-foreground hover:text-foreground px-4 py-2 rounded border border-border hover:border-border transition-colors text-sm"
                        >
                          {isSkipped ? 'Undo Skip' : 'Skip This PR'}
                        </button>

                        {isSkipped && (
                          <div className="mt-2 text-sm text-muted-foreground italic">
                            This PR will be skipped (no changes applied)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="flex justify-between items-center gap-3 p-6 border-t border-border bg-muted">
                  <button
                    onClick={() => {
                      const conflictDuplicates = conflictingPRs.flatMap((c: Conflict) => c.importedVersions);
                      copyDuplicateUrls(conflictDuplicates, 0);
                    }}
                    className="text-muted-foreground hover:text-foreground px-4 py-2 rounded border border-border hover:border-accent transition-colors text-sm"
                  >
                    Copy Details
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={cancelConflictResolution}
                      className="px-6 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmConflictResolutions}
                      disabled={conflictingPRs.some((c: Conflict) => {
                        const resolution = conflictResolutions[c.url];
                        return resolution !== 'SKIP' && (!resolution || (!c.existingCard && !resolution));
                      })}
                      className="bg-accent text-accent-foreground px-6 py-2 rounded-lg hover:bg-accent/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                    >
                      Confirm Selections ({Object.values(conflictResolutions).filter((r: string | null) => r && r !== 'SKIP').length}/{conflictingPRs.length})
                    </button>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* DT-EW-05: Statistics Dashboard */}
        {showStats && (
          <Card variant="elevated" padding="md" className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Statistics Dashboard
              </h3>
              <Button variant="outline" size="sm" onClick={() => setShowStats(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-muted rounded">
                <div className="text-xs text-muted-foreground mb-1">Total Cards</div>
                <div className="text-2xl font-bold">{statistics.totalCards}</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="text-xs text-muted-foreground mb-1">Cards with Notes</div>
                <div className="text-2xl font-bold">{statistics.cardsWithNotes}</div>
                <div className="text-xs text-muted-foreground">{statistics.cardsWithNotesPercentage.toFixed(1)}%</div>
              </div>
              {columns.slice(0, 2).map(col => (
                <div key={col.id} className="p-3 bg-muted rounded">
                  <div className="text-xs text-muted-foreground mb-1 truncate">{col.title}</div>
                  <div className="text-2xl font-bold">{statistics.cardsPerColumn[col.id] || 0}</div>
                </div>
              ))}
            </div>
            {statistics.recentlyAdded.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Recently Added:</div>
                <div className="flex flex-wrap gap-2">
                  {statistics.recentlyAdded.map(card => (
                    <span key={card.id} className="text-xs px-2 py-1 bg-accent/10 rounded">
                      {card.customTitle || card.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
        
        {!showStats && (
          <div className="mb-6">
            <Button variant="outline" size="sm" onClick={() => setShowStats(true)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Show Statistics
            </Button>
          </div>
        )}

        {/* DT-EW-01: Search & Filter */}
        <Card variant="elevated" padding="md" className="mb-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search cards by title, URL, or notes... (Ctrl+F)"
                  className="pl-10"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <select
                  value={filterColumn || ''}
                  onChange={(e) => setFilterColumn(e.target.value || null)}
                  className="px-3 py-2 rounded border border-border bg-background text-foreground text-sm w-full sm:w-auto"
                >
                  <option value="">All Columns</option>
                  {columns.map(col => (
                    <option key={col.id} value={col.id}>{col.title}</option>
                  ))}
                </select>
                <Input
                  value={filterNotes}
                  onChange={(e) => setFilterNotes(e.target.value)}
                  placeholder="Filter by notes..."
                  className="w-full sm:w-48"
                />
                {(searchTerm || filterColumn || filterNotes) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterColumn(null);
                      setFilterNotes('');
                    }}
                    className="w-full sm:w-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* DT-EW-02: Bulk Operations */}
            {selectedCards.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">{selectedCards.length} card(s) selected</span>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkMoveMenu(!showBulkMoveMenu)}
                  >
                    Move
                  </Button>
                  {showBulkMoveMenu && (
                    <div className="absolute mt-10 bg-card border rounded-md shadow-lg z-50 p-2">
                      {columns.map(col => (
                        <button
                          key={col.id}
                          onClick={() => bulkMoveCards(col.id)}
                          className="block w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                        >
                          {col.title}
                        </button>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkMenu(!showBulkMenu)}
                  >
                    Bulk Actions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
            
            {showBulkMenu && selectedCards.length > 0 && (
              <Card variant="elevated" padding="md" className="bg-muted/50">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Add Note to Selected Cards</label>
                    <div className="flex gap-2">
                      <Input
                        value={bulkNoteInput}
                        onChange={(e) => setBulkNoteInput(e.target.value)}
                        placeholder="Enter note..."
                        className="flex-1"
                      />
                      <Button onClick={bulkAddNotes} disabled={!bulkNoteInput.trim()}>
                        Add
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Set Title for Selected Cards</label>
                    <div className="flex gap-2">
                      <Input
                        value={bulkTitleInput}
                        onChange={(e) => setBulkTitleInput(e.target.value)}
                        placeholder="Enter title..."
                        className="flex-1"
                      />
                      <Button onClick={bulkEditTitles} disabled={!bulkTitleInput.trim()}>
                        Set
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={bulkDeleteCards}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                    <Button variant="outline" onClick={() => setShowBulkMenu(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </Card>

        {/* Export Menu */}
        <div className="mb-6 flex justify-end">
          <div className="relative group">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <div className="absolute top-full right-0 mt-1 bg-card border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[200px]">
              <button
                onClick={() => setShowReleaseModal(true)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Release List
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Full Status Report
              </button>
              <button
                onClick={exportFilteredJSON}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              >
                <FileJson className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={exportMarkdownTable}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export Markdown
              </button>
            </div>
          </div>
        </div>

        {/* Release List Modal */}
        {showReleaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowReleaseModal(false)}>
            <Card variant="elevated-xl" padding="lg" className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-foreground font-bold">Copy Release List</h3>
                <button 
                  onClick={() => setShowReleaseModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-3">
                  This will copy a clean release list with card titles and Asana task links (when available in notes).
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Perfect for stakeholder updates and release documentation.
                </p>
                <p className="text-sm text-muted-foreground text-xs">
                  Format: Card Title - Asana URL (or just title if no Asana link found)
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowReleaseModal(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={copyReleaseList}
                  className="bg-muted-foreground text-foreground px-6 py-2 rounded-lg hover:bg-muted-foreground/90 transition-colors flex items-center gap-2"
                >
                  <Copy size={16} />
                  Copy List
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(false)}>
            <Card variant="elevated-xl" padding="lg" className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-foreground font-bold">Export Status Report</h3>
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-3">
                  This will copy a complete status report of all PRs across all columns with GitHub URLs, custom titles, notes, and a timestamp.
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Perfect for sharing deployment progress with your team, daily standups, or sprint reviews.
                </p>
                <p className="text-sm text-muted-foreground text-xs">
                  Format: Custom Title - GitHub URL (Notes: context) with timestamps
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={copyFullStatusReport}
                  className="bg-accent text-accent-foreground px-6 py-2 rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2"
                >
                  <Copy size={16} />
                  Copy Report
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 right-4 bg-[hsl(var(--status-match))] text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn">
            {toastMessage}
          </div>
        )}

        {/* Duplicate Warning Toasts */}
        {duplicateToasts.map((toast, index) => (
          <div 
            key={toast.id}
            className="fixed right-4 bg-[hsl(var(--status-warning))] text-white px-6 py-4 rounded-lg shadow-lg z-50"
            style={{ top: `${4 + index * 7}rem` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-semibold mb-2">
                  {toast.urls.length + toast.conflictCount} Duplicate{toast.urls.length + toast.conflictCount > 1 ? 's' : ''} Found
                </div>
                <div className="text-sm opacity-90 mb-1">
                  • {toast.urls.length} same status (notes merged)
                </div>
                {toast.conflictCount > 0 && (
                  <div className="text-sm opacity-90 mb-3">
                    • {toast.conflictCount} conflicting status{toast.conflictCount > 1 ? 'es' : ''}
                  </div>
                )}
                <div className="flex gap-2">
                  {toast.urls.length > 0 && (
                    <button
                      onClick={() => copyDuplicateUrls(toast.urls, toast.id)}
                      className="bg-card text-[hsl(var(--status-warning))] px-3 py-1 rounded text-sm font-medium hover:bg-muted transition-colors"
                    >
                      Copy Details
                    </button>
                  )}
                  {toast.conflictCount > 0 && conflictingPRs.length > 0 && (
                    <button
                      onClick={() => showConflictModalFromToast(toast.id)}
                      className="bg-card text-[hsl(var(--status-warning))] px-3 py-1 rounded text-sm font-medium hover:bg-muted transition-colors"
                    >
                      Review Conflicts
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeDuplicateToast(toast.id)}
                className="text-white hover:text-white/80 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        ))}

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map(column => {
            const columnCards = getCardsInColumn(column.id);
            return (
              <div key={column.id} className="bg-card rounded-lg border border-border shadow-sm">
                <div className={`p-4 border-b border-border dark:border-white ${column.color} rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{column.title}</h3>
                      <span className="text-sm text-muted-foreground">({columnCards.length})</span>
                    </div>
                    {columnCards.length > 0 && (
                      <button
                        onClick={() => copyColumnUrls(column.id)}
                        className="p-2 hover:bg-muted rounded transition-colors duration-200"
                        title="Copy all URLs in this column"
                      >
                        {copiedColumn === column.id ? (
                          <Check size={16} className="text-accent" />
                        ) : (
                          <Copy size={16} className="text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                <div
                  className="p-4 min-h-96 space-y-3"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                  data-column-id={column.id}
                >
                  {columnCards.map((card, index) => (
                    <div key={card.id}>
                      {/* Placeholder for reordering */}
                      {dragOverPosition && 
                       dragOverPosition.columnId === column.id && 
                       dragOverPosition.index === index && (
                        <div className="h-20 bg-muted border-2 border-dashed border-border rounded-lg mb-3 flex items-center justify-center animate-pulse">
                          <span className="text-muted-foreground text-sm">Drop here</span>
                        </div>
                      )}
                      
                      <div
                        data-card-id={card.id}
                        draggable={editingNote !== card.id && editingTitle !== card.id}
                        onClick={(e) => handleCardClick(e, card)}
                        onDragStart={(e: React.DragEvent) => {
                          // Only start drag if not editing note/title and not clicking on buttons
                          const target = e.target as HTMLElement;
                          if (editingNote === card.id || editingTitle === card.id || target.closest('button') || target.closest('input')) {
                            e.preventDefault();
                            return;
                          }
                          handleDragStart(e, card);
                        }}
                        className={`bg-card border rounded-lg p-3 cursor-move hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out group animate-fadeIn ${
                          selectedCards.includes(card.id) 
                            ? 'border-accent border-2 shadow-[0_0_0_2px_hsl(var(--accent)/0.1)]' 
                            : 'border-border'
                        }`}
                          style={{
                          opacity: draggedCard?.id === card.id || (draggedCard?.isMultiSelect && selectedCards.includes(card.id)) ? 0.3 : 1,
                          transform: draggedCard?.id === card.id || (draggedCard?.isMultiSelect && selectedCards.includes(card.id)) ? 'scale(0.95)' : undefined,
                          animationDelay: `${index * 50}ms`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          {editingTitle === card.id ? (
                            <input
                              type="text"
                              value={titleInput}
                              onChange={(e) => setTitleInput(e.target.value)}
                              onKeyDown={(e) => handleTitleKeyPress(e, card.id)}
                              onBlur={() => {
                                if (titleInput.trim()) {
                                  saveTitle(card.id);
                                } else {
                                  setEditingTitle(null);
                                  setTitleInput('');
                                }
                              }}
                              className="font-medium text-foreground bg-transparent border-b border-yellow-400 focus:outline-none focus:border-accent flex-1 mr-2"
                              placeholder="Enter custom title..."
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="font-medium text-foreground cursor-pointer hover:text-accent transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTitle(card.id);
                                setTitleInput(card.customTitle || card.title);
                              }}
                              title="Click to edit title"
                            >
                              {card.customTitle || card.title}
                            </span>
                          )}
                          <div className="flex gap-1" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                            <button
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setEditingNote(editingNote === card.id ? null : card.id);
                                setNoteInput('');
                              }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer"
                              title="Add note"
                            >
                              <MessageSquare size={16} />
                            </button>
                            <button
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                openPR(card.url);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-accent hover:text-accent/80 transition-opacity cursor-pointer"
                            >
                              <ExternalLink size={16} />
                            </button>
                            <button
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                confirmDelete(card);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity cursor-pointer"
                              title="Delete card"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {card.url}
                        </div>
                        
                        {/* Notes area */}
                        <div className="mt-2 space-y-2">
                          {card.notes && card.notes.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {card.notes.map((note, noteIndex) => (
                                <span
                                  key={noteIndex}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent text-xs rounded-full border border-accent/30"
                                >
                                  {note}
                                  <button
                                    onClick={() => removeNote(card.id, noteIndex)}
                                    className="hover:text-destructive transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {editingNote === card.id && (
                            <input
                              type="text"
                              value={noteInput}
                              onChange={(e) => setNoteInput(e.target.value)}
                              onKeyDown={(e) => handleNoteKeyPress(e, card.id)}
                              onBlur={() => {
                                if (noteInput.trim()) {
                                  addNote(card.id);
                                } else {
                                  setEditingNote(null);
                                }
                              }}
                              placeholder="Add note (up to 150 characters)..."
                              className="w-full text-xs px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent focus:border-transparent bg-background text-foreground"
                              autoFocus
                              maxLength={150}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Final placeholder at end of column */}
                  {dragOverPosition && 
                   dragOverPosition.columnId === column.id && 
                   dragOverPosition.index === columnCards.length && (
                    <div className="h-20 bg-muted border-2 border-dashed border-border rounded-lg flex items-center justify-center animate-pulse">
                      <span className="text-muted-foreground text-sm">Drop here</span>
                    </div>
                  )}
                  
                  {columnCards.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      <p>Drop PRs here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
    </PageContainer>
  );
};

export default PRDeploymentTracker;