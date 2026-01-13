import { Routes, Route, Link, useLocation } from 'react-router-dom'
import LiveCodeRenderer from './coderenderer'
import SpreadsheetComparator from './spreadsheetdiff'
import PRDeploymentTracker from './deploymenttrracker'
import JsonExtractor from './jsonextractor'
import { Code, FileSpreadsheet, GitBranch, Database } from 'lucide-react'
import { ThemeProvider } from './contexts/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import './App.css'

function Navigation() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'Home', icon: null },
    { path: '/code-renderer', label: 'Code Renderer', icon: Code },
    { path: '/spreadsheet-diff', label: 'Spreadsheet Diff', icon: FileSpreadsheet },
    { path: '/deployment-tracker', label: 'Deployment Tracker', icon: GitBranch },
    { path: '/json-extractor', label: 'JSON Extractor', icon: Database },
  ]

  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              )
            })}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}

function Home() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">PST Toolings</h1>
          <p className="text-xl text-muted-foreground">
            A collection of useful development tools
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Link
            to="/code-renderer"
            className="p-6 border rounded-lg hover:bg-accent transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Code className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Code Renderer</h2>
            </div>
            <p className="text-muted-foreground">
              Render TSX, HTML/CSS/JS, or combined code live in your browser
            </p>
          </Link>

          <Link
            to="/spreadsheet-diff"
            className="p-6 border rounded-lg hover:bg-accent transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Spreadsheet Diff</h2>
            </div>
            <p className="text-muted-foreground">
              Compare spreadsheets to find differences between them
            </p>
          </Link>

          <Link
            to="/deployment-tracker"
            className="p-6 border rounded-lg hover:bg-accent transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <GitBranch className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Deployment Tracker</h2>
            </div>
            <p className="text-muted-foreground">
              Track GitHub PRs through the deployment verification process
            </p>
          </Link>

          <Link
            to="/json-extractor"
            className="p-6 border rounded-lg hover:bg-accent transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">JSON Extractor</h2>
            </div>
            <p className="text-muted-foreground">
              Extract and compare JSON data fields with advanced filtering
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/code-renderer" element={<LiveCodeRenderer />} />
        <Route path="/spreadsheet-diff" element={<SpreadsheetComparator />} />
        <Route path="/deployment-tracker" element={<PRDeploymentTracker />} />
        <Route path="/json-extractor" element={<JsonExtractor />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
