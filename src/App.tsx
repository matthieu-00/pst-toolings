import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import LiveCodeRenderer from './coderenderer'
import SpreadsheetComparator from './spreadsheetdiff'
import PRDeploymentTracker from './deploymenttrracker'
import JsonExtractor from './jsonextractor'
import MarkdownEditor from './markdown-editor'
import { Code, FileSpreadsheet, GitBranch, Database, Menu, X, Home as HomeIcon, FileText } from 'lucide-react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeToggle } from './components/ThemeToggle'
import { Button } from './components/ui/button'
import { PocketKnifeIcon } from './components/PocketKnifeIcon'
import { PinEntryModal } from './components/PinEntryModal'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useEffect, useId, useRef, useState } from 'react'
import './App.css'

function Navigation() {
  const location = useLocation()
  const { hasPageAccess } = useAuth()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const drawerId = useId()
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null)
  
  const allNavItems = [
    { path: '/', label: 'Home', icon: PocketKnifeIcon },
    { path: '/code-renderer', label: 'Code Renderer', icon: Code },
    { path: '/spreadsheet-diff', label: 'Spreadsheet Diff', icon: FileSpreadsheet },
    { path: '/deployment-tracker', label: 'Deployment Tracker', icon: GitBranch },
    { path: '/json-extractor', label: 'JSON Extractor', icon: Database },
    { path: '/markdown-editor', label: 'Markdown Editor', icon: FileText },
  ]

  // Filter nav items based on access level
  const navItems = allNavItems.filter(item => {
    // Home page is always accessible (not protected)
    if (item.path === '/') return true
    // Check if user has access to this page
    return hasPageAccess(item.path)
  })

  useEffect(() => {
    if (!isMobileNavOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus first interactive element in drawer.
    queueMicrotask(() => firstLinkRef.current?.focus())

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      // Restore focus to the menu button.
      queueMicrotask(() => menuButtonRef.current?.focus())
    }
  }, [isMobileNavOpen])

  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left (desktop only): nav */}
          <div className="hidden sm:flex space-x-6">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-all duration-200 hover:scale-[1.02] ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 transition-transform duration-200" />}
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Mobile controls on left, desktop controls on right */}
          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              ref={menuButtonRef}
              type="button"
              className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label={isMobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileNavOpen}
              aria-controls={drawerId}
              onClick={() => setIsMobileNavOpen((v) => !v)}
            >
              {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Mobile slide-in drawer */}
      <div
        id={drawerId}
        className={`sm:hidden fixed inset-0 z-50 ${isMobileNavOpen ? '' : 'pointer-events-none'}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isMobileNavOpen}
      >
        <div
          className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-200 ${
            isMobileNavOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMobileNavOpen(false)}
        />
        <div
          tabIndex={-1}
          className={`absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-card border-r shadow-lg transition-transform duration-200 ease-out ${
            isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Menu</span>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Close menu"
              onClick={() => setIsMobileNavOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-2">
            {navItems.map((item, idx) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  {...(idx === 0 ? { ref: firstLinkRef as React.RefObject<HTMLAnchorElement> } : {})}
                  to={item.path}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

function Home() {
  const { hasPageAccess, currentAccessLevel, isLoading } = useAuth()
  
  const toolCards = [
    {
      path: '/code-renderer',
      label: 'Code Renderer',
      icon: Code,
      description: 'Render TSX, HTML/CSS/JS, or combined code live in your browser',
      delay: '0ms'
    },
    {
      path: '/spreadsheet-diff',
      label: 'Spreadsheet Diff',
      icon: FileSpreadsheet,
      description: 'Compare spreadsheets to find differences between them',
      delay: '100ms'
    },
    {
      path: '/deployment-tracker',
      label: 'Deployment Tracker',
      icon: GitBranch,
      description: 'Track GitHub PRs through the deployment verification process',
      delay: '200ms'
    },
    {
      path: '/json-extractor',
      label: 'JSON Extractor',
      icon: Database,
      description: 'Extract and compare JSON data fields with advanced filtering',
      delay: '300ms'
    },
    {
      path: '/markdown-editor',
      label: 'Markdown Editor',
      icon: FileText,
      description: 'Create and edit Markdown files with live preview and export options',
      delay: '400ms'
    }
  ]

  // Filter cards based on access level - only after auth is loaded
  const accessibleCards = isLoading ? [] : toolCards.filter(card => hasPageAccess(card.path))
  
  // For Level 1 and 2, use single column (stacked vertically) to hide missing cards
  // For Level 3 (full access), use 2-column grid
  const isLevel1Or2 = currentAccessLevel && (currentAccessLevel.id === 'level1' || currentAccessLevel.id === 'level2')
  const gridClass = isLevel1Or2 ? 'grid grid-cols-1 max-w-2xl mx-auto gap-6' : 'grid md:grid-cols-2 gap-6'

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">PST Toolings</h1>
          <p className="text-xl text-muted-foreground">
            A collection of useful development tools
          </p>
        </div>
        
        <div className={gridClass}>
          {accessibleCards.map((card, index) => {
            const Icon = card.icon
            return (
              <Link
                key={card.path}
                to={card.path}
                className="p-6 border rounded-lg hover:bg-accent transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg animate-fadeInUp"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-6 h-6 text-primary transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3" />
                  <h2 className="text-xl font-semibold">{card.label}</h2>
                </div>
                <p className="text-muted-foreground">
                  {card.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-muted-foreground mb-4">404</h1>
          <h2 className="text-3xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button
          onClick={() => navigate('/')}
          size="lg"
        >
          <HomeIcon className="w-5 h-5 mr-2" />
          Return Home
        </Button>
      </div>
    </div>
  )
}

function AppContent() {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()
  
  // Don't render anything until auth check is complete to prevent flickering
  if (isLoading) {
    return null;
  }
  
  return (
    <>
      {!isAuthenticated && <PinEntryModal />}
      <Navigation />
      <div key={location.pathname} className="animate-fadeIn">
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route 
            path="/code-renderer" 
            element={
              <ProtectedRoute path="/code-renderer">
                <LiveCodeRenderer />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/spreadsheet-diff" 
            element={
              <ProtectedRoute path="/spreadsheet-diff">
                <SpreadsheetComparator />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/deployment-tracker" 
            element={
              <ProtectedRoute path="/deployment-tracker">
                <PRDeploymentTracker />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/json-extractor" 
            element={
              <ProtectedRoute path="/json-extractor">
                <JsonExtractor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/markdown-editor" 
            element={
              <ProtectedRoute path="/markdown-editor">
                <MarkdownEditor />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
