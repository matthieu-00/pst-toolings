# PST Toolings

A modern, single-page web application providing a collection of developer tools for code rendering, data comparison, deployment tracking, and JSON extraction. Built with React, TypeScript, and Tailwind CSS, deployed to GitHub Pages.

## Overview

PST Toolings is a comprehensive suite of web-based utilities designed to streamline common development workflows. The application features a clean, responsive interface with dark mode support and provides four main tools:

1. **Code Renderer** - Live preview and execution of TSX, HTML/CSS/JS, or combined code snippets
2. **Spreadsheet Diff** - Compare CSV and Excel files to identify differences between datasets
3. **Deployment Tracker** - Track GitHub Pull Requests through deployment verification workflows
4. **JSON Extractor** - Extract, filter, and compare JSON data with advanced field analysis

## Features

### Code Renderer
- Live code execution with React/TSX support
- Combined HTML/CSS/JavaScript rendering
- Console logging and error handling
- Code editor with syntax highlighting
- Export and sharing capabilities
- Full-screen preview mode

### Spreadsheet Diff
- Support for CSV and Excel (.xlsx) file formats
- Side-by-side comparison with visual highlighting
- Column-based filtering and analysis
- Export filtered results
- Statistical overview of differences
- Excel-style column letter notation

### Deployment Tracker
- Kanban-style board for PR tracking
- Multiple column workflows (e.g., To Review, In Progress, Done)
- Card-based PR management with notes and tags
- Drag-and-drop card organization
- Import/export functionality for board state
- Multi-select support for bulk operations
- Priority levels and due dates

### JSON Extractor
- Extract and display all keys from JSON arrays
- Compare two JSON datasets side-by-side
- Field-level type analysis and statistics
- Advanced filtering and search
- Expandable/collapsible nested structures
- Export filtered results
- Visual type indicators (string, number, boolean, array, object, null)

## Technology Stack

### Core Framework
- **React 18.3.1** - UI library with hooks and modern patterns
- **TypeScript 5.3.3** - Type-safe development
- **Vite 5.0.7** - Fast build tool and dev server
- **React Router DOM 6.20.0** - Client-side routing

### Styling
- **Tailwind CSS 3.3.6** - Utility-first CSS framework
- **CSS Variables** - Theme-aware color system
- **PostCSS** - CSS processing
- **Autoprefixer** - Browser compatibility

### UI Components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Class Variance Authority** - Component variant management
- **clsx & tailwind-merge** - Conditional class utilities

### Data Processing
- **PapaParse 5.4.1** - CSV parsing
- **SheetJS (xlsx) 0.18.5** - Excel file handling

### Development Tools
- **ESLint** - Code linting with TypeScript support
- **Playwright** - End-to-end testing
- **GitHub Actions** - CI/CD pipeline

## Project Structure

```
pst-toolings/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages deployment workflow
├── e2e/                         # End-to-end tests
│   ├── fixtures/               # Test data files
│   └── *.spec.ts               # Playwright test specs
├── public/                      # Static assets
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── alert.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── help-tooltip.tsx
│   │   │   ├── input.tsx
│   │   │   ├── page-container.tsx
│   │   │   └── page-header.tsx
│   │   └── ThemeToggle.tsx     # Theme switcher component
│   ├── contexts/
│   │   └── ThemeContext.tsx    # Theme state management
│   ├── lib/
│   │   └── utils.ts            # Utility functions (cn helper)
│   ├── types/
│   │   └── window.d.ts         # TypeScript type definitions
│   ├── App.tsx                 # Main app component with routing
│   ├── App.css                 # App-specific styles
│   ├── coderenderer.tsx        # Code Renderer tool
│   ├── spreadsheetdiff.tsx     # Spreadsheet Diff tool
│   ├── deploymenttrracker.tsx  # Deployment Tracker tool
│   ├── jsonextractor.tsx       # JSON Extractor tool
│   ├── index.css               # Global styles and CSS variables
│   └── main.tsx                # Application entry point
├── index.html                  # HTML template
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── playwright.config.ts        # Playwright test configuration
```

## Architecture

### Routing
The application uses React Router for client-side routing. Routes are defined in `App.tsx`:
- `/` - Home page with tool cards
- `/code-renderer` - Code Renderer tool
- `/spreadsheet-diff` - Spreadsheet Diff tool
- `/deployment-tracker` - Deployment Tracker tool
- `/json-extractor` - JSON Extractor tool

### State Management
- **Local Component State** - React hooks (`useState`, `useReducer`) for component-level state
- **Context API** - `ThemeContext` for global theme management
- **LocalStorage** - Persistence for theme preference and deployment tracker data

### Theming System
The application uses a CSS variable-based theming system that automatically adapts to light/dark modes:
- Theme preference is stored in `localStorage`
- System preference is detected on first load
- CSS variables defined in `index.css` control all colors
- Semantic color tokens (e.g., `bg-background`, `text-foreground`) ensure consistency
- Special semantic colors for data types and comparison statuses

### Component Architecture
- **Page Components** - Main tool components located in `src/` root (kebab-case naming)
- **UI Components** - Reusable components in `src/components/ui/` (shadcn/ui style)
- **Layout Components** - `PageContainer` and `PageHeader` for consistent page structure
- **Context Providers** - Wrapped at app level in `App.tsx`

## Coding Conventions

### File Naming
- **Components**: kebab-case (e.g., `coderenderer.tsx`, `spreadsheetdiff.tsx`)
- **UI Components**: kebab-case (e.g., `page-container.tsx`, `help-tooltip.tsx`)
- **Utilities**: kebab-case (e.g., `utils.ts`)
- **Types**: kebab-case (e.g., `window.d.ts`)

### TypeScript
- **Strict Mode**: Enabled with all strict checks
- **Type Definitions**: Interfaces for complex objects, types for unions/primitives
- **No Implicit Any**: All variables must have explicit types
- **Path Aliases**: Use `@/` prefix for imports from `src/` (e.g., `@/components/ui/button`)

### Component Patterns
- **Default Exports**: Page components use default exports
- **Named Exports**: UI components and utilities use named exports
- **Functional Components**: All components are function components with hooks
- **Props Interfaces**: Define interfaces for component props when needed

### Styling Conventions
- **Tailwind Classes**: Primary styling method
- **Semantic Tokens**: Always use semantic color tokens (never hardcoded colors)
  - `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`
  - `bg-type-*` for JSON data types
  - `bg-status-*` for comparison states
- **Responsive Design**: Use Tailwind breakpoints (`sm:`, `md:`, `lg:`)
- **Spacing**: Use Tailwind spacing scale (`p-4`, `gap-6`, `space-y-4`)
- **CSS Variables**: Defined in `index.css` for theme colors

### Import Organization
1. React and React hooks
2. Third-party libraries
3. Icons (from `lucide-react`)
4. UI components (from `@/components/ui/`)
5. Contexts and utilities (from `@/`)
6. Local styles

Example:
```typescript
import React, { useState, useEffect } from 'react';
import { Code, AlertCircle } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { useTheme } from '@/contexts/ThemeContext';
```

### State Management Patterns
- **useState**: For simple component state
- **useReducer**: For complex state with multiple actions (if needed)
- **useMemo**: For expensive computations
- **useEffect**: For side effects and lifecycle management
- **useRef**: For DOM references and mutable values

### Error Handling
- Display user-friendly error messages using `Alert` component
- Validate user input before processing
- Handle file parsing errors gracefully
- Provide clear feedback for all user actions

### Accessibility
- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus management in modals and drawers
- Screen reader friendly content

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd pst-toolings

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Starts the Vite dev server (typically at `http://localhost:5173`)

### Building
```bash
npm run build
```
Creates production build in `dist/` directory

### Preview Production Build
```bash
npm run preview
```
Preview the production build locally (uses base path `/pst-toolings/`)

### Linting
```bash
npm run lint
```
Runs ESLint to check code quality

### Testing
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## Deployment

The application is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `main` branch.

### Deployment Process
1. Push to `main` branch triggers workflow
2. Build job runs: installs dependencies, builds project, verifies output
3. Deploy job runs: uploads `dist/` to GitHub Pages
4. Site available at: `https://matthieu-00.github.io/pst-toolings/`

### Build Configuration
- Base path: `/pst-toolings/` (configured in `vite.config.ts`)
- Output directory: `dist/`
- `.nojekyll` file created to prevent Jekyll processing

### Manual Deployment
To deploy manually:
```bash
npm run build
# Then push dist/ to gh-pages branch or use GitHub Actions
```

## Configuration Files

### TypeScript (`tsconfig.json`)
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode enabled
- Path alias: `@/*` → `./src/*`

### Vite (`vite.config.ts`)
- React plugin
- Base path: `/pst-toolings/`
- Path alias: `@` → `./src`

### Tailwind (`tailwind.config.js`)
- Dark mode: class-based
- Custom color system with CSS variables
- Custom animations and keyframes
- Extended theme with semantic colors

### ESLint (`.eslintrc.cjs`)
- TypeScript parser
- React hooks rules
- Strict linting rules

## Browser Support

The application targets modern browsers with ES2020 support:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

When adding new features or tools:
1. Follow the file naming conventions (kebab-case)
2. Use the established component patterns
3. Implement proper TypeScript types
4. Use semantic color tokens for styling
5. Ensure responsive design
6. Add appropriate error handling
7. Update routing in `App.tsx`
8. Add navigation item to `navItems` array
9. Consider adding E2E tests in `e2e/`

For detailed guidelines on adding new pages, see `NEW_PAGE_STYLE_GUIDE.md`.

## License

[Add license information if applicable]

## Additional Resources

- **Tailwind CSS**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev/icons
- **React Router**: https://reactrouter.com/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Vite**: https://vitejs.dev/
- **Playwright**: https://playwright.dev/
