# Page Function Improvements Roadmap

## Reference ID System

Each item has a unique reference ID in the format: `[PAGE]-[PRIORITY]-[NUMBER]`

- **Page Codes**: `CR` = Code Renderer, `JE` = JSON Extractor, `SD` = Spreadsheet Diff, `DT` = Deployment Tracker
- **Priority Codes**: `EW` = Easy Win, `ME` = Medium Effort, `AD` = Advanced
- **Number**: Sequential item number

Example: `CR-EW-01` = Code Renderer Easy Win #1

---

## 1. Code Renderer (`coderenderer.tsx`)

### Easy Wins

#### CR-EW-01: Keyboard Shortcuts ✓
- `Ctrl+S` / `Cmd+S` to render
- `Ctrl+/` to toggle comment
- `Ctrl+F` for find in editor
- `Ctrl+Z` / `Ctrl+Y` for undo/redo

#### CR-EW-02: Code Formatting ✓
- Add "Format Code" button using Prettier or similar
- Auto-format on paste option

#### CR-EW-03: Line Numbers ✓
- Toggle line numbers in editor
- Click line number to set breakpoint (visual only)

#### CR-EW-04: Export Options ✓
- Export rendered HTML as downloadable file
- Export code as file (.tsx, .html, etc.)
- Share via URL hash (encode code in URL)

#### CR-EW-05: Code Snippets ✓
- Save/load code snippets to localStorage
- Quick templates dropdown (React component, HTML page, etc.)

#### CR-EW-06: Editor Enhancements ✓
- Word wrap toggle
- Font size adjustment
- Syntax highlighting (using highlight.js or Prism)

### Medium Effort

#### CR-ME-01: Multiple Tabs
- Multiple code files open simultaneously
- Tab switching with unsaved changes warning

#### CR-ME-02: Undo/Redo Stack
- Full undo/redo history for code edits
- Visual history indicator

#### CR-ME-03: Code Folding
- Collapse/expand code blocks
- Fold all/unfold all buttons

#### CR-ME-04: Search & Replace
- Find/replace dialog
- Highlight all matches
- Replace all functionality

### Advanced Features

#### CR-AD-01: Live Collaboration
- Share code via URL with real-time sync
- Multiple users editing simultaneously

#### CR-AD-02: Component Library
- Pre-built component templates
- Import from npm packages (limited)

#### CR-AD-03: Performance Profiler
- React DevTools integration
- Render time metrics

---

## 2. JSON Extractor (`jsonextractor.tsx`)

### Easy Wins

#### JE-EW-01: Field Operations ✓
- Rename fields inline
- Copy individual field values
- Copy field path (e.g., `user.address.city`)

#### JE-EW-02: Data Filtering ✓
- Filter rows by field value
- Numeric range filters
- String contains/exact match filters

#### JE-EW-03: Sorting ✓
- Sort preview table by any column
- Multi-column sorting
- Sort indicator arrows

#### JE-EW-04: Statistics Dashboard ✓
- Min/max/avg for numeric fields
- Unique value counts
- Null percentage per field
- Data quality score

#### JE-EW-05: Preview Enhancements ✓
- Expandable nested objects/arrays
- Copy cell value on click
- Better truncation with "show more" option

#### JE-EW-06: Import Options ✓
- Import from URL
- Import from file (drag & drop)
- Parse JSON from clipboard automatically

### Medium Effort

#### JE-ME-01: Data Transformation
- Field value transformations (uppercase, lowercase, trim)
- Date parsing and formatting
- Number formatting

#### JE-ME-02: Filter Presets
- Save filter combinations
- Quick filter buttons (e.g., "Only strings", "Only numbers")

#### JE-ME-03: Field Mapping
- Rename multiple fields at once
- Field aliases for display

#### JE-ME-04: Export Enhancements
- Export selected rows only
- Custom export formats (TSV, Excel)
- Export with transformations applied

### Advanced Features

#### JE-AD-01: Data Validation
- Schema validation
- Required field checks
- Type validation rules

#### JE-AD-02: Data Merging
- Merge multiple JSON datasets
- Union/intersection operations

---

## 3. Spreadsheet Diff (`spreadsheetdiff.tsx`)

### Easy Wins

#### SD-EW-01: Visual Enhancements ✓
- Side-by-side cell comparison view
- Color-coded cells (green=same, yellow=changed, red=added/removed)
- Highlight changed cells in column view

#### SD-EW-02: Filter Differences ✓
- Filter by change type (added/removed/changed)
- Filter by difference percentage threshold
- Show only rows with differences

#### SD-EW-03: Statistics Dashboard ✓
- Summary card: total changes, columns affected, rows affected
- Change distribution chart
- Most changed columns list

#### SD-EW-04: Export Enhancements ✓
- Export as Excel with color coding
- Export only changed rows
- Export summary report (text format)

#### SD-EW-05: Column Operations ✓
- Ignore specific columns from comparison
- Column mapping (handle renamed columns)
- Column reordering in export

### Medium Effort

#### SD-ME-01: Merge Functionality
- Choose which value to keep per cell
- Bulk merge operations
- Merge preview before applying

#### SD-ME-02: Undo/Redo
- Undo manual edits
- History of changes

#### SD-ME-03: Comparison Options
- Case-insensitive comparison
- Ignore whitespace
- Numeric tolerance (for floating point)

#### SD-ME-04: Multi-File Comparison
- Compare 3+ files simultaneously
- Show all versions side-by-side

### Advanced Features

#### SD-AD-01: Smart Matching
- Match rows by key column (not just position)
- Fuzzy matching for similar values
- Handle reordered rows

#### SD-AD-02: Change Tracking
- Track changes over time
- Diff history
- Rollback to previous version

---

## 4. Deployment Tracker (`deploymenttracker.tsx`)

### Easy Wins

#### DT-EW-01: Search & Filter ✓
- Search cards by title/URL/notes
- Filter by column
- Filter by notes containing text

#### DT-EW-02: Bulk Operations ✓
- Bulk move selected cards
- Bulk add notes to selected cards
- Bulk delete selected cards
- Bulk edit titles

#### DT-EW-03: Keyboard Shortcuts ✓
- `Ctrl+F` to focus search
- `Delete` to delete selected cards
- Arrow keys to move selected cards between columns
- `Ctrl+A` to select all cards

#### DT-EW-04: Card Enhancements ✓ (partial - tags/priority/due dates structure added)
- Card tags/labels (separate from notes)
- Card priority/urgency indicator
- Card due dates/deadlines
- Card archiving (hide without deleting)

#### DT-EW-05: Statistics Dashboard ✓
- Cards per column count
- Total cards tracked
- Cards with notes percentage
- Recently added cards

#### DT-EW-06: Export Enhancements ✓
- Export filtered view only
- Export as JSON for backup
- Export as Markdown table
- Custom export templates

### Medium Effort

#### DT-ME-01: Card Templates
- Save card templates
- Quick add from template
- Template variables

#### DT-ME-02: Card Linking
- Link related cards
- Show linked cards indicator
- Navigate between linked cards

#### DT-ME-03: History/Audit Log
- Track card movements
- Track note additions/changes
- Show card history timeline

#### DT-ME-04: Import Enhancements
- Import from GitHub API (PR list)
- Import from CSV
- Import validation and preview

#### DT-ME-05: Column Customization
- Rename columns
- Add custom columns
- Column colors/themes
- Column limits (max cards)

### Advanced Features

#### DT-AD-01: GitHub Integration
- Auto-refresh PR status from GitHub API
- Show PR merge status
- Show PR review status
- Auto-move based on PR status

#### DT-AD-02: Notifications
- Browser notifications for PR updates
- Email notifications (if configured)
- Slack integration

#### DT-AD-03: Collaboration
- Share tracker with team
- Real-time updates
- User assignments to cards

#### DT-AD-04: Analytics
- Deployment velocity metrics
- Time in each column analytics
- Bottleneck identification

---

## Cross-Page Improvements

### Universal Enhancements

#### X-EW-01: Keyboard Navigation
- Consistent keyboard shortcuts across pages
- Tab navigation improvements
- Focus management

#### X-EW-02: Accessibility
- ARIA labels
- Screen reader support
- Keyboard-only navigation

#### X-ME-01: Performance
- Virtual scrolling for large datasets
- Lazy loading
- Debounced search/filter

#### X-ME-02: User Preferences
- Save preferences to localStorage
- Theme preferences per page
- Default settings

#### X-ME-03: Error Handling
- Better error messages
- Error recovery suggestions
- Error reporting

#### X-ME-04: Help System
- Contextual help tooltips
- Video tutorials
- Example data sets

---

## Implementation Status

### Phase 1: Easy Wins (COMPLETED)
- [x] CR-EW-01: Keyboard Shortcuts
- [x] CR-EW-02: Code Formatting
- [x] CR-EW-03: Line Numbers
- [x] CR-EW-04: Export Options
- [x] CR-EW-05: Code Snippets
- [x] CR-EW-06: Editor Enhancements
- [x] JE-EW-01: Field Operations
- [x] JE-EW-02: Data Filtering
- [x] JE-EW-03: Sorting
- [x] JE-EW-04: Statistics Dashboard
- [x] JE-EW-05: Preview Enhancements
- [x] JE-EW-06: Import Options
- [x] SD-EW-01: Visual Enhancements
- [x] SD-EW-02: Filter Differences
- [x] SD-EW-03: Statistics Dashboard
- [x] SD-EW-04: Export Enhancements
- [x] SD-EW-05: Column Operations
- [x] DT-EW-01: Search & Filter
- [x] DT-EW-02: Bulk Operations
- [x] DT-EW-03: Keyboard Shortcuts
- [x] DT-EW-04: Card Enhancements (partial - tags/priority/due dates structure added)
- [x] DT-EW-05: Statistics Dashboard
- [x] DT-EW-06: Export Enhancements

### Phase 2: Medium Effort (Pending)
- [ ] CR-ME-01 through CR-ME-04
- [ ] JE-ME-01 through JE-ME-04
- [ ] SD-ME-01 through SD-ME-04
- [ ] DT-ME-01 through DT-ME-05

### Phase 3: Advanced Features (Pending)
- [ ] CR-AD-01 through CR-AD-03
- [ ] JE-AD-01 through JE-AD-02
- [ ] SD-AD-01 through SD-AD-02
- [ ] DT-AD-01 through DT-AD-04

---

## Usage

To reference an item, use its ID (e.g., "Let's do CR-EW-01 today" or "Implement JE-EW-03").
