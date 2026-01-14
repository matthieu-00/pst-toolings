# New Page Style Guide Documentation

## Overview

This document provides a complete reference for adding new pages/components to the PST Toolings application. Follow these patterns to ensure consistency with existing pages.

## File Structure

### Page Component Location

- **Location**: `src/` directory (root level)
- **Naming**: Use kebab-case (e.g., `my-new-tool.tsx`)
- **Export**: Default export of the component function

### Example Structure

```
src/
  ├── my-new-tool.tsx          # Main page component
  ├── components/
  │   └── ui/                   # Shared UI components
  └── contexts/
      └── ThemeContext.tsx      # Theme management
```

## Component Structure

### Required Imports Pattern

```typescript
import React, { useState, useEffect } from 'react';
import { IconName } from 'lucide-react';  // Icons from lucide-react
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { useTheme } from '@/contexts/ThemeContext';  // If theme access needed
```

### Component Template

```typescript
import React, { useState } from 'react';
import { YourIcon } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';

export default function YourNewTool() {
  // State declarations
  const [state, setState] = useState(initialValue);

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={YourIcon}
        title="Your Tool Title"
        description="Brief description of what this tool does"
        showHelpButton={true}
        helpContent={
          <div>
            <h3 className="font-semibold mb-2">How to use:</h3>
            <p>Help content here...</p>
          </div>
        }
        onHelpClick={() => {/* handle help */}}
      />
      
      <div className="mt-6 space-y-4">
        {/* Your content here */}
      </div>
    </PageContainer>
  );
}
```

## UI Components Usage

### PageContainer

**Purpose**: Wraps entire page content with consistent spacing and max-width

**Props**:

- `maxWidth`: `"none" | "sm" | "md" | "lg" | "xl" | "95vw"` (default: `"xl"`)
- `variant`: `"default" | "full" | "minimal" | "muted"` (default: `"default"`)
- `className`: Additional classes

**Example**:

```typescript
<PageContainer maxWidth="xl">
  {/* Page content */}
</PageContainer>
```

### PageHeader

**Purpose**: Consistent page title and description with optional icon and help

**Props**:

- `icon`: Lucide React icon component (optional)
- `title`: Page title string (required)
- `description`: Subtitle/description string (optional)
- `helpContent`: React node for help modal/tooltip (optional)
- `onHelpClick`: Function to handle help button click (optional)
- `showHelpButton`: Boolean to show help button (optional)

**Example**:

```typescript
<PageHeader
  icon={Code}
  title="Code Renderer"
  description="Render TSX, HTML/CSS/JS, or combined code live"
  showHelpButton={true}
  helpContent={<div>Help content...</div>}
  onHelpClick={() => setShowHelp(true)}
/>
```

### Card

**Purpose**: Container component with consistent styling

**Props**:

- `variant`: `"default" | "bordered" | "elevated" | "elevated-xl" | "accent"` (default: `"default"`)
- `padding`: `"none" | "sm" | "md" | "lg" | "xl"` (default: `"md"`)
- `className`: Additional classes

**Sub-components**:

- `CardHeader`: Header section
- `CardTitle`: Title within card
- `CardDescription`: Description text
- `CardContent`: Main content area
- `CardFooter`: Footer section

**Example**:

```typescript
<Card variant="default" padding="md">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Button

**Purpose**: Consistent button styling

**Props**:

- `variant`: `"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"`
- `size`: `"default" | "sm" | "lg" | "icon"`
- `asChild`: Use child element as button (for Radix Slot)

**Example**:

```typescript
<Button variant="default" size="default">
  Click Me
</Button>
<Button variant="outline" size="sm">
  <Icon className="w-4 h-4" />
</Button>
```

### Input/Textarea

**Purpose**: Form input components

**Props**: Standard HTML input/textarea props

**Example**:

```typescript
<Input
  type="text"
  placeholder="Enter text..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
<Textarea
  placeholder="Enter multiline text..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### HelpTooltip

**Purpose**: Contextual help information

**Props**:

- `content`: React node for help content
- `variant`: `"tooltip" | "modal"` (default: `"tooltip"`)
- `icon`: `"help" | "info"` (default: `"help"`)
- `tooltipPosition`: `"top" | "bottom" | "left" | "right"` (default: `"bottom"`)

**Example**:

```typescript
<HelpTooltip
  content="This field accepts JSON format"
  variant="tooltip"
  icon="help"
/>
```

## Styling System

### Tailwind CSS with CSS Variables

The project uses Tailwind CSS with custom CSS variables for theming.

### Color System

Use semantic color tokens, not hardcoded colors:

**Background Colors**:

- `bg-background` - Main background
- `bg-card` - Card backgrounds
- `bg-muted` - Muted/secondary backgrounds
- `bg-accent` - Accent color backgrounds

**Text Colors**:

- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary/muted text
- `text-primary` - Primary color text
- `text-accent-foreground` - Text on accent backgrounds

**Border Colors**:

- `border-border` - Standard borders
- `border-accent` - Accent borders
- `border-destructive` - Error/destructive borders

**Status Colors** (for comparisons/data):

- `bg-status-match` / `text-status-match` - Success states, identical values, confirmations
- `bg-status-differ` / `text-status-differ` - Differences in comparisons
- `bg-status-warning` / `text-status-warning` - Warnings, attention states, moderate differences
- `bg-status-only-a` / `bg-status-only-b` - Dataset-specific indicators

**Error States**:

- `bg-destructive` / `text-destructive` - Errors, exceptions, failed operations
- `bg-destructive/10` / `text-destructive` - Error backgrounds with opacity

**Type Colors** (for JSON/data types):

- `bg-type-string` / `text-type-string`
- `bg-type-number` / `text-type-number`
- `bg-type-boolean` / `text-type-boolean`
- `bg-type-array` / `text-type-array`
- `bg-type-object` / `text-type-object`
- `bg-type-null` / `text-type-null`

### Color Mapping Standards

**IMPORTANT**: Always use semantic tokens. Never use hardcoded Tailwind color classes like `text-green-600`, `bg-red-500`, etc.

**Standard Color Mappings**:

- **Success/Confirmation States** → `status-match` (green)
  - Use for: Success messages, check icons, confirmation toasts, "identical values" indicators
  - Example: `text-[hsl(var(--status-match))]` or `bg-status-match`

- **Error States** → `destructive` (red)
  - Use for: Errors, exceptions, failed operations
  - Example: `text-destructive` or `bg-[hsl(var(--destructive))]`

- **Warning/Attention States** → `status-warning` (orange)
  - Use for: Warnings, priority badges, attention states, "moderate differences", minor differences (yellow)
  - Example: `text-[hsl(var(--status-warning))]` or `bg-status-warning/10`

- **Info/Neutral States** → `accent` (Ice Blue)
  - Use for: General info states, neutral indicators, button states
  - Example: `text-accent` or `bg-accent`

- **Dataset Indicators**:
  - Dataset A → `status-only-a` (blue)
  - Dataset B → `status-only-b` (orange)
  - Example: `bg-[hsl(var(--status-only-a)/0.1)]`

**Using Semantic Tokens**:

```typescript
// ✅ CORRECT - Using semantic tokens
<span className="text-[hsl(var(--status-match))]">Success</span>
<div className="bg-destructive text-destructive-foreground">Error</div>
<button className="bg-accent text-accent-foreground">Info</button>

// ❌ WRONG - Hardcoded colors
<span className="text-green-600">Success</span>
<div className="bg-red-500 text-white">Error</div>
<button className="bg-blue-600 text-white">Info</button>
```

**Opacity with Semantic Tokens**:

```typescript
// Use opacity syntax with semantic tokens
<div className="bg-[hsl(var(--status-match)/0.1)]">Light green background</div>
<div className="bg-status-warning/10">Light orange background</div>
<div className="border-[hsl(var(--status-warning)/0.3)]">Semi-transparent border</div>
```

### Spacing

Use Tailwind spacing scale:

- `p-4`, `p-6`, `p-8` for padding
- `m-4`, `m-6`, `m-8` for margin
- `gap-2`, `gap-4`, `gap-6` for flex/grid gaps
- `space-y-4`, `space-x-4` for vertical/horizontal spacing

### Responsive Design

Use Tailwind responsive prefixes:

- `md:` - Medium screens and up
- `lg:` - Large screens and up
- Example: `text-sm md:text-base lg:text-lg`

### Common Patterns

```typescript
// Container with max-width and padding
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

// Flex layouts
<div className="flex items-center justify-between gap-4">

// Grid layouts
<div className="grid md:grid-cols-2 gap-6">

// Hover states
<button className="hover:bg-accent hover:text-accent-foreground transition-colors">

// Border radius
<div className="rounded-lg border border-border">
```

## Theme Support

### Using Theme Context

```typescript
import { useTheme } from '@/contexts/ThemeContext';

export default function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  // Theme is 'light' | 'dark'
  // Use CSS variables - they automatically adapt to theme
}
```

### Theme-Aware Styling

- CSS variables automatically switch between light/dark modes
- No need for conditional classes based on theme
- Use semantic color tokens (e.g., `bg-background`, `text-foreground`)

## Icons

### Lucide React Icons

Import icons from `lucide-react`:

```typescript
import { Code, FileSpreadsheet, GitBranch, Database, Plus, X } from 'lucide-react';
```

### Icon Usage

```typescript
// In JSX
<Code className="w-4 h-4" />
<FileSpreadsheet className="w-6 h-6 text-primary" />

// Common sizes
// Small: w-4 h-4
// Medium: w-5 h-5 or w-6 h-6
// Large: w-8 h-8
```

## Routing

### Adding a New Route

1. **Import component** in `src/App.tsx`:
```typescript
import YourNewTool from './your-new-tool';
```

2. **Add route** in Routes:
```typescript
<Route path="/your-new-tool" element={<YourNewTool />} />
```

3. **Add navigation item** in `navItems` array:
```typescript
const navItems = [
  // ... existing items
  { 
    path: '/your-new-tool', 
    label: 'Your Tool Name', 
    icon: YourIcon 
  },
];
```

4. **Add home page card** (optional) in Home component:
```typescript
<Link
  to="/your-new-tool"
  className="p-6 border rounded-lg hover:bg-accent transition-colors group"
>
  <div className="flex items-center gap-3 mb-2">
    <YourIcon className="w-6 h-6 text-primary" />
    <h2 className="text-xl font-semibold">Your Tool Name</h2>
  </div>
  <p className="text-muted-foreground">
    Description of your tool
  </p>
</Link>
```

## TypeScript Patterns

### Type Definitions

```typescript
// Interface for component props (if needed)
interface MyComponentProps {
  title: string;
  optional?: boolean;
}

// Type aliases
type MyDataType = string | number | null;

// Union types
type Status = 'pending' | 'completed' | 'error';
```

### State Management

```typescript
// Single state
const [value, setValue] = useState<string>('');

// Object state
const [data, setData] = useState<MyDataType>({
  field1: '',
  field2: 0,
});

// Array state
const [items, setItems] = useState<Item[]>([]);
```

### Event Handlers

```typescript
// Input change
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

// Button click
const handleClick = () => {
  // Handle click
};

// Form submit
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // Handle submit
};
```

## Common Patterns

### File Upload

```typescript
const handleFileUpload = async (file: File) => {
  const text = await file.text();
  // Process file
};

<input
  type="file"
  accept=".csv,.xlsx"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }}
/>
```

### Copy to Clipboard

```typescript
const handleCopy = async (text: string) => {
  await navigator.clipboard.writeText(text);
  // Show toast/feedback
};
```

### Modal/Dialog Pattern

```typescript
const [showModal, setShowModal] = useState(false);

{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-card p-6 max-w-2xl rounded-xl border border-border">
      {/* Modal content */}
      <button onClick={() => setShowModal(false)}>Close</button>
    </div>
  </div>
)}
```

### Toast/Notification Pattern

```typescript
const [toastMessage, setToastMessage] = useState('');

const showToast = (message: string) => {
  setToastMessage(message);
  setTimeout(() => setToastMessage(''), 3000);
};

{toastMessage && (
  <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg">
    {toastMessage}
  </div>
)}
```

### Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

{isLoading ? (
  <div className="flex items-center justify-center p-8">
    <div className="text-muted-foreground">Loading...</div>
  </div>
) : (
  // Content
)}
```

### Error Handling

```typescript
const [error, setError] = useState<string | null>(null);

{error && (
  <Alert variant="destructive">
    <AlertCircle className="w-4 h-4" />
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

## Best Practices

1. **Always use PageContainer** for page-level components
2. **Use PageHeader** for consistent page titles
3. **Use semantic color tokens** - never hardcode colors
4. **Support dark mode** - CSS variables handle this automatically
5. **Make components responsive** - use Tailwind responsive prefixes
6. **Use TypeScript** - define types for all props and state
7. **Follow naming conventions** - kebab-case for files, PascalCase for components
8. **Import from `@/` alias** - use `@/components/ui/...` not relative paths
9. **Use Lucide icons** - consistent icon library
10. **Handle loading/error states** - provide user feedback

## Checklist for New Pages

- [ ] Component file created in `src/` with kebab-case naming
- [ ] Default export of component function
- [ ] PageContainer wraps entire content
- [ ] PageHeader with icon, title, and description
- [ ] Route added to `App.tsx`
- [ ] Navigation item added to `navItems` array
- [ ] Home page card added (if applicable)
- [ ] Uses semantic color tokens (no hardcoded colors)
- [ ] Responsive design with Tailwind breakpoints
- [ ] TypeScript types defined for props/state
- [ ] Error handling implemented
- [ ] Loading states handled
- [ ] Icons imported from `lucide-react`
- [ ] Help tooltip/modal added (if needed)
- [ ] Consistent spacing and padding
- [ ] Dark mode support (automatic via CSS variables)

## Example: Complete New Page

```typescript
import React, { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HelpTooltip } from '@/components/ui/help-tooltip';

export default function MyNewTool() {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleProcess = () => {
    if (!input.trim()) {
      setError('Please enter some input');
      return;
    }
    setError(null);
    // Process input
    setResult('Processed result');
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={FileText}
        title="My New Tool"
        description="Process and analyze your data"
        showHelpButton={true}
        helpContent={
          <div>
            <h3 className="font-semibold mb-2">How to use:</h3>
            <p>Enter your data and click process.</p>
          </div>
        }
        onHelpClick={() => {}}
      />

      <div className="mt-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter data</label>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your data here..."
              />
              <HelpTooltip
                content="This field accepts plain text"
                variant="tooltip"
              />
            </div>
            <Button onClick={handleProcess}>Process</Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{result}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
```

## Additional Resources

- **Tailwind CSS**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev/icons
- **React Router**: https://reactrouter.com/
- **TypeScript**: https://www.typescriptlang.org/docs/

---

**Last Updated**: December 2024

**Maintained By**: Development Team
