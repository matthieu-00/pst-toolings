import React, { useState, useRef } from 'react';
import { Plus, ExternalLink, Copy, Check, MessageSquare, X, Info, Trash2, GitBranch } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { HelpTooltip } from '@/components/ui/help-tooltip';

const PRDeploymentTracker = () => {
  const [inputUrls, setInputUrls] = useState('');
  const [cards, setCards] = useState([]);
  const [draggedCard, setDraggedCard] = useState(null);
  const [copiedColumn, setCopiedColumn] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [editingTitle, setEditingTitle] = useState(null);
  const [titleInput, setTitleInput] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const dragScrollIntervalRef = useRef(null);
  const [dragOverPosition, setDragOverPosition] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [duplicateToasts, setDuplicateToasts] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingPRs, setConflictingPRs] = useState([]);
  const [conflictResolutions, setConflictResolutions] = useState({});

  const columns = [
    { id: 'yet-to-verify', title: 'Yet to Verify', color: 'bg-accent/10 border-accent/30' },
    { id: 'partially-deployed', title: 'Partially Deployed', color: 'bg-muted/50 border-muted' },
    { id: 'fully-deployed-fixed', title: 'Fully Deployed/Fixed', color: 'bg-accent/20 border-accent/40' },
    { id: 'fully-deployed-not-fixed', title: 'Fully Deployed/Not Fixed', color: 'bg-destructive/10 border-destructive/30' }
  ];

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const showDuplicateToast = (duplicateData, conflictCount = 0) => {
    const toastId = Date.now();
    setDuplicateToasts(prev => [...prev, { id: toastId, urls: duplicateData, conflictCount }]);
  };

  const removeDuplicateToast = (toastId) => {
    setDuplicateToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  const copyDuplicateUrls = (duplicateData, toastId) => {
    // Format: Title - URL (Notes: ...) [Would be in: Column]
    let output = 'Skipped Duplicates\n==================\n';
    
    duplicateData.forEach(dup => {
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

  const openConflictModal = (conflicts) => {
    setConflictingPRs(conflicts);
    
    // Initialize resolutions with current column for existing PRs
    const initialResolutions = {};
    conflicts.forEach(conflict => {
      if (conflict.existingCard) {
        initialResolutions[conflict.url] = conflict.existingCard.column;
      } else {
        initialResolutions[conflict.url] = null; // User must choose
      }
    });
    setConflictResolutions(initialResolutions);
    // Don't open modal automatically, wait for user to click "Review Conflicts"
  };

  const showConflictModalFromToast = (toastId) => {
    setShowConflictModal(true);
    // Close the toast that opened this
    removeDuplicateToast(toastId);
  };

  const setConflictResolution = (url, column) => {
    setConflictResolutions(prev => ({
      ...prev,
      [url]: column
    }));
  };

  const skipConflictPR = (url) => {
    setConflictResolutions(prev => ({
      ...prev,
      [url]: 'SKIP'
    }));
  };

  const confirmConflictResolutions = () => {
    // Apply the chosen resolutions
    conflictingPRs.forEach(conflict => {
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
            const allNewNotes = conflict.importedVersions.flatMap(v => v.notes || []);
            const notesToAdd = allNewNotes.filter(note => !existingNotes.has(note));
            
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
        const allNotes = [...new Set(conflict.importedVersions.flatMap(v => v.notes || []))];
        
        setCards(prev => [...prev, {
          ...firstVersion,
          id: Date.now() + Math.random(),
          column: resolution,
          notes: allNotes
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

  const parseImportedData = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Check for multi-column format first (multiple === separators)
    const headerIndices = [];
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i + 1] && lines[i + 1].startsWith('===')) {
        headerIndices.push(i);
      }
    }
    
    if (headerIndices.length > 1) {
      // Multi-column import
      const importedCards = [];
      let totalCount = 0;
      let columnsImported = [];
      
      headerIndices.forEach((headerIndex, sectionIndex) => {
        const headerText = lines[headerIndex];
        const targetColumn = columns.find(col => col.title === headerText);
        
        if (!targetColumn) return; // Skip unknown columns
        
        // Find end of this section
        const nextHeaderIndex = headerIndices[sectionIndex + 1];
        const endIndex = nextHeaderIndex ? nextHeaderIndex : lines.length;
        
        // Get data lines for this section (skip header and === line)
        const sectionLines = lines.slice(headerIndex + 2, endIndex).filter(line => 
          !line.startsWith('Last validated:') && 
          line.includes('http') // Only lines with URLs
        );
        
        sectionLines.forEach((line, index) => {
          // Parse format: "Title - URL (Notes: note1, note2)"
          const urlMatch = line.match(/(https?:\/\/[^\s)]+)/);
          if (!urlMatch) return;
          
          const url = urlMatch[1];
          const beforeUrl = line.substring(0, line.indexOf(url)).replace(' - ', '');
          const afterUrl = line.substring(line.indexOf(url) + url.length);
          
          // Extract notes if present
          const notesMatch = afterUrl.match(/\(Notes: ([^)]+)\)/);
          const notes = notesMatch ? notesMatch[1].split(',').map(n => n.trim()) : [];
          
          // Determine if title is custom or original PR format
          const originalTitle = extractPRNumber(url);
          const customTitle = (beforeUrl && beforeUrl !== originalTitle) ? beforeUrl : '';
          
          importedCards.push({
            id: Date.now() + index + Math.random() + sectionIndex * 1000,
            url: url,
            title: originalTitle,
            customTitle: customTitle,
            column: targetColumn.id,
            notes: notes
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
    
    const dataLines = lines.slice(headerIndex + 2).filter(line => 
      !line.startsWith('Last validated:') && 
      line.includes('http') // Only lines with URLs
    );
    
    const importedCards = [];
    
    dataLines.forEach((line, index) => {
      // Parse format: "Title - URL (Notes: note1, note2)"
      const urlMatch = line.match(/(https?:\/\/[^\s)]+)/);
      if (!urlMatch) return;
      
      const url = urlMatch[1];
      const beforeUrl = line.substring(0, line.indexOf(url)).replace(' - ', '');
      const afterUrl = line.substring(line.indexOf(url) + url.length);
      
      // Extract notes if present
      const notesMatch = afterUrl.match(/\(Notes: ([^)]+)\)/);
      const notes = notesMatch ? notesMatch[1].split(',').map(n => n.trim()) : [];
      
      // Determine if title is custom or original PR format
      const originalTitle = extractPRNumber(url);
      const customTitle = (beforeUrl && beforeUrl !== originalTitle) ? beforeUrl : '';
      
      importedCards.push({
        id: Date.now() + index + Math.random(),
        url: url,
        title: originalTitle,
        customTitle: customTitle,
        column: targetColumn.id,
        notes: notes
      });
    });
    
    return {
      cards: importedCards,
      columnTitle: targetColumn.title,
      count: importedCards.length,
      isMultiColumn: false
    };
  };

  const extractPRNumber = (url) => {
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
      const duplicateData = [];
      const conflictData = {}; // Track conflicts by URL
      const newCards = [];
      const seenInImport = new Set(); // Track URLs we've already processed in this import
      
      importedData.cards.forEach(card => {
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
                const notesToAdd = card.notes.filter(note => !existingNotes.has(note));
                
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
      const conflicts = Object.values(conflictData).map(conflict => ({
        url: conflict.url,
        existingCard: conflict.existingCard,
        importedVersions: conflict.versions,
        columns: Array.from(conflict.columns)
      }));
      
      // Show appropriate toast messages
      if (importedData.isMultiColumn) {
        if (newCards.length > 0) {
          showToast(`Imported ${newCards.length} PRs across ${importedData.columnsImported.length} columns: ${importedData.columnsImported.join(', ')}`);
        }
      } else {
        if (newCards.length > 0) {
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
    const lines = inputUrls.split('\n').filter(line => line.trim());
    
    // Extract URLs from lines, handling text before/after URLs
    const urls = [];
    lines.forEach(line => {
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
    const existingUrls = new Set(cards.map(card => card.url));
    const duplicateData = [];
    const uniqueUrls = [];
    const seenInImport = new Set(); // Track URLs within this import
    
    urls.forEach(url => {
      if (seenInImport.has(url)) {
        // Duplicate within same import - silently skip
        return;
      }
      
      seenInImport.add(url);
      
      if (existingUrls.has(url)) {
        // Store as card-like object for consistent formatting
        duplicateData.push({
          url: url,
          title: extractPRNumber(url),
          customTitle: '',
          column: 'yet-to-verify',
          notes: []
        });
      } else {
        uniqueUrls.push(url);
      }
    });
    
    // Add only unique URLs
    if (uniqueUrls.length > 0) {
      const newCards = uniqueUrls.map((url, index) => ({
        id: Date.now() + index,
        url: url,
        title: extractPRNumber(url),
        customTitle: '',
        column: 'yet-to-verify',
        notes: []
      }));
      
      setCards(prev => [...prev, ...newCards]);
      showToast(`Added ${uniqueUrls.length} PRs to "Yet to Verify" column`);
    }
    
    // Show duplicate toast if any were found
    if (duplicateData.length > 0) {
      showDuplicateToast(duplicateData);
    }
    
    setInputUrls('');
  };

  const handleDragStart = (e, card) => {
    // If card is part of selection, drag all selected cards
    // Otherwise, just drag this card
    if (selectedCards.includes(card.id)) {
      setDraggedCard({ ...card, isMultiSelect: true, selectedIds: selectedCards });
    } else {
      setDraggedCard(card);
    }
    
    e.dataTransfer.effectAllowed = 'move';
    
    // Style the drag image with prominent glow effect
    const dragElement = e.target.cloneNode(true);
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
    e.dataTransfer.setDragImage(dragElement, e.offsetX, e.offsetY);
    
    // Clean up drag image after drag starts
    setTimeout(() => {
      if (document.body.contains(dragElement)) {
        document.body.removeChild(dragElement);
      }
    }, 0);
    
    // Add mouse move listener for auto-scroll
    const handleDragMove = (event) => {
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
              clearInterval(dragScrollIntervalRef.current);
              dragScrollIntervalRef.current = null;
            }
          }, 33); // Increased from 50ms to 33ms (30fps)
        } else if (shouldScrollDown) {
          dragScrollIntervalRef.current = setInterval(() => {
            const newScrollY = window.scrollY;
            const newMaxScrollY = document.documentElement.scrollHeight - window.innerHeight;
            if (newScrollY < newMaxScrollY - 5) {
              window.scrollBy(0, scrollSpeed);
            } else {
              clearInterval(dragScrollIntervalRef.current);
              dragScrollIntervalRef.current = null;
            }
          }, 33); // Increased from 50ms to 33ms (30fps)
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Only handle reordering if dragging within the same column
    const columnElement = e.currentTarget;
    const columnId = columnElement.getAttribute('data-column-id');
    
    if (draggedCard && draggedCard.column === columnId) {
      const cards = columnElement.querySelectorAll('[data-card-id]');
      const mouseY = e.clientY;
      
      let insertPosition = null;
      
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const rect = card.getBoundingClientRect();
        const cardMiddle = rect.top + rect.height / 2;
        
        if (mouseY < cardMiddle) {
          insertPosition = { columnId, index: i, type: 'before' };
          break;
        }
      }
      
      // If no position found, insert at end
      if (!insertPosition) {
        insertPosition = { columnId, index: cards.length, type: 'after' };
      }
      
      setDragOverPosition(insertPosition);
    } else {
      setDragOverPosition(null);
    }
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    if (!draggedCard) return;

    if (draggedCard.isMultiSelect) {
      // Moving multiple selected cards
      setCards(prev => prev.map(card => 
        draggedCard.selectedIds.includes(card.id)
          ? { ...card, column: columnId }
          : card
      ));
      showToast(`Moved ${draggedCard.selectedIds.length} cards to ${columns.find(col => col.id === columnId).title}`);
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

  const openPR = (url) => {
    window.open(url, '_blank');
  };

  const getCardsInColumn = (columnId) => {
    return cards.filter(card => card.column === columnId);
  };

  const copyColumnUrls = async (columnId) => {
    const columnCards = getCardsInColumn(columnId);
    if (columnCards.length === 0) return;
    
    const column = columns.find(col => col.id === columnId);
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
    } catch (err) {
      console.error('Failed to copy URLs:', err);
      // Fallback for browsers that don't support clipboard API
      alert('Copy failed. Text to copy:\n\n' + fullText);
    }
  };

  const addNote = (cardId) => {
    if (!noteInput.trim()) return;
    
    setCards(prev => prev.map(card => 
      card.id === cardId 
        ? { ...card, notes: [...(card.notes || []), noteInput.trim()] }
        : card
    ));
    
    setNoteInput('');
    setEditingNote(null);
  };

  const removeNote = (cardId, noteIndex) => {
    setCards(prev => prev.map(card => 
      card.id === cardId 
        ? { ...card, notes: card.notes.filter((_, index) => index !== noteIndex) }
        : card
    ));
  };

  const handleNoteKeyPress = (e, cardId) => {
    if (e.key === 'Enter') {
      addNote(cardId);
    } else if (e.key === 'Escape') {
      setEditingNote(null);
      setNoteInput('');
    }
  };

  const saveTitle = (cardId) => {
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

  const handleTitleKeyPress = (e, cardId) => {
    if (e.key === 'Enter') {
      saveTitle(cardId);
    } else if (e.key === 'Escape') {
      setEditingTitle(null);
      setTitleInput('');
    }
  };

  const deleteCard = (cardId) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
    showToast('Card deleted');
    setShowDeleteModal(false);
    setCardToDelete(null);
  };

  const confirmDelete = (card) => {
    setCardToDelete(card);
    setShowDeleteModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCardToDelete(null);
  };

  const handleCardClick = (e, card) => {
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

  // Add keyboard listener for Escape to clear selection
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedCards.length > 0) {
        clearSelection();
        showToast('Selection cleared');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCards]);

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
    columns.forEach((column, index) => {
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
    columns.forEach((column, index) => {
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
      <Card variant="accent" padding="lg" className="mb-6">
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
            className="h-32 resize-none"
          />
          <button
            onClick={addCards}
            disabled={!inputUrls.trim()}
            className="bg-accent text-accent-foreground px-6 py-2 rounded-lg hover:bg-accent/90 disabled:bg-muted disabled:cursor-not-allowed flex items-center gap-2"
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
                  onClick={() => deleteCard(cardToDelete.id)}
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
                  {conflictingPRs.map((conflict, index) => {
                    const displayTitle = conflict.importedVersions[0].customTitle || conflict.importedVersions[0].title;
                    const allNotes = [...new Set(conflict.importedVersions.flatMap(v => v.notes || []))];
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
                              In: {columns.find(col => col.id === conflict.existingCard.column)?.title}
                            </div>
                          ) : (
                            <div className="text-xs font-medium text-orange-500 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-400/10 px-3 py-1 rounded-full ml-4 whitespace-nowrap border border-orange-500/30 dark:border-orange-400/30">
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
                              {conflict.columns.map(columnId => {
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
                          onClick={() => isSkipped ? setConflictResolution(conflict.url, conflict.existingCard?.column || null) : skipConflictPR(conflict.url)}
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
                    const conflictDuplicates = conflictingPRs.flatMap(c => c.importedVersions);
                    copyDuplicateUrls(conflictDuplicates, null);
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
                    disabled={conflictingPRs.some(c => {
                      const resolution = conflictResolutions[c.url];
                      return resolution !== 'SKIP' && (!resolution || (!c.existingCard && !resolution));
                    })}
                    className="bg-accent text-accent-foreground px-6 py-2 rounded-lg hover:bg-accent/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                  >
                    Confirm Selections ({Object.values(conflictResolutions).filter(r => r && r !== 'SKIP').length}/{conflictingPRs.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export All Button */}
        <div className="mb-6 flex justify-end gap-3">
          <button
            onClick={() => setShowReleaseModal(true)}
            className="bg-muted-foreground text-foreground px-4 py-2 rounded-lg hover:bg-muted-foreground/90 transition-colors flex items-center gap-2 text-sm"
          >
            <Copy size={16} />
            Copy Release List
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="bg-accent text-accent-foreground px-6 py-3 rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-md"
          >
            <Copy size={20} />
            Copy Full Status Report
          </button>
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
          <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            {toastMessage}
          </div>
        )}

        {/* Duplicate Warning Toasts */}
        {duplicateToasts.map((toast, index) => (
          <div 
            key={toast.id}
            className="fixed right-4 bg-orange-500 text-white px-6 py-4 rounded-lg shadow-lg z-50"
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
                      className="bg-card text-orange-600 dark:text-orange-400 px-3 py-1 rounded text-sm font-medium hover:bg-muted transition-colors"
                    >
                      Copy Details
                    </button>
                  )}
                  {toast.conflictCount > 0 && conflictingPRs.length > 0 && (
                    <button
                      onClick={() => showConflictModalFromToast(toast.id)}
                      className="bg-card text-orange-600 dark:text-orange-400 px-3 py-1 rounded text-sm font-medium hover:bg-muted transition-colors"
                    >
                      Review Conflicts
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeDuplicateToast(toast.id)}
                className="text-white hover:text-orange-100 transition-colors"
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
                <div className={`p-4 border-b border-border ${column.color} rounded-t-lg`}>
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
                        <div className="h-20 bg-muted border-2 border-dashed border-border rounded-lg mb-3 flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">Drop here</span>
                        </div>
                      )}
                      
                      <div
                        data-card-id={card.id}
                        draggable={editingNote !== card.id && editingTitle !== card.id}
                        onClick={(e) => handleCardClick(e, card)}
                        onDragStart={(e) => {
                          // Only start drag if not editing note/title and not clicking on buttons
                          if (editingNote === card.id || editingTitle === card.id || e.target.closest('button') || e.target.closest('input')) {
                            e.preventDefault();
                            return false;
                          }
                          handleDragStart(e, card);
                        }}
                        className={`bg-card border rounded-lg p-3 cursor-move hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out group ${
                          selectedCards.includes(card.id) 
                            ? 'border-accent border-2 shadow-[0_0_0_2px_hsl(var(--accent)/0.1)]' 
                            : 'border-border'
                        }`}
                          style={{
                          opacity: draggedCard?.id === card.id || (draggedCard?.isMultiSelect && selectedCards.includes(card.id)) ? 0.3 : 1,
                          transform: draggedCard?.id === card.id || (draggedCard?.isMultiSelect && selectedCards.includes(card.id)) ? 'scale(0.95)' : undefined,
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
                    <div className="h-20 bg-muted border-2 border-dashed border-border rounded-lg flex items-center justify-center">
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