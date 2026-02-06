import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  LayoutList,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
} from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseNrql } from '@/lib/nrql/parser';
import { validateNrql } from '@/lib/nrql/validator';
import { explainNrql } from '@/lib/nrql/explainer';
import { NRQL_TEMPLATES } from '@/lib/nrql/templates';
import type { NrqlStructure, ValidationMessage } from '@/lib/nrql/types';

const NRQL_DOCS_URL = 'https://docs.newrelic.com/docs/nrql/get-started/introduction-nrql-new-relics-query-language/';

const STRUCTURE_KEYS: { key: keyof NrqlStructure; label: string }[] = [
  { key: 'from', label: 'FROM' },
  { key: 'select', label: 'SELECT' },
  { key: 'where', label: 'WHERE' },
  { key: 'facet', label: 'FACET' },
  { key: 'limit', label: 'LIMIT' },
  { key: 'since', label: 'SINCE' },
  { key: 'until', label: 'UNTIL' },
  { key: 'timeseries', label: 'TIMESERIES' },
  { key: 'timezone', label: 'WITH TIMEZONE' },
  { key: 'compareWith', label: 'COMPARE WITH' },
];

export default function NrqlHelper() {
  const [query, setQuery] = useState('');
  const [alertMode, setAlertMode] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    if (!showHelpModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowHelpModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showHelpModal]);

  useEffect(() => {
    if (!showClearModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowClearModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showClearModal]);

  const structure = useMemo(() => parseNrql(query), [query]);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [validationMessages, setValidationMessages] = useState<ValidationMessage[]>([]);
  const [hasValidated, setHasValidated] = useState(false);

  const handleExplain = () => {
    setExplanation(explainNrql(structure));
  };

  const handleValidate = () => {
    setValidationMessages(validateNrql(structure, query, { alertMode }));
    setHasValidated(true);
  };

  const handleSuggestImprovements = () => {
    setValidationMessages(validateNrql(structure, query, { alertMode }));
    setExplanation(explainNrql(structure));
    setHasValidated(true);
  };

  const handleInsertTemplate = (templateQuery: string) => {
    setQuery(templateQuery);
    const struct = parseNrql(templateQuery);
    setExplanation(explainNrql(struct));
    setValidationMessages(validateNrql(struct, templateQuery, { alertMode }));
    setTemplatesOpen(false);
    setHasValidated(true);
  };

  const handleClear = () => {
    setQuery('');
    setExplanation([]);
    setValidationMessages([]);
    setHasValidated(false);
    setShowClearModal(false);
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={Search}
        title="NRQL Helper"
        description="Build and understand New Relic NRQL queries with explanations and validation"
        showHelpButton
        onHelpClick={() => setShowHelpModal(true)}
      />

      {showHelpModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelpModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
        >
          <Card
            variant="elevated"
            padding="lg"
            className="max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="help-modal-title" className="text-lg font-semibold text-foreground">
                About NRQL Helper
              </h2>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground max-h-[60vh] overflow-y-auto">
              <p>
                NRQL Helper lets you build and understand New Relic Query Language (NRQL) queries
                without leaving your tools site. All parsing, explanation, and validation run in
                your browser; no query data is sent to a server.
              </p>

              <h3 className="font-semibold text-foreground pt-1">How to use</h3>
              <ul className="list-disc list-inside space-y-2 pl-1">
                <li>
                  <strong>Editor:</strong> Enter or paste your NRQL query in the left panel. The
                  Structure section on the right updates live as you type (parsed FROM, SELECT,
                  WHERE, etc.).
                </li>
                <li>
                  <strong>Explain:</strong> Fills the Explanation section with plain-language
                  descriptions of what your query does (e.g. which event type, which aggregation).
                </li>
                <li>
                  <strong>Validate:</strong> Runs checks and shows errors or warnings in the
                  Suggestions panel (e.g. missing SELECT/FROM, query length, single-quote
                  literals).
                </li>
                <li>
                  <strong>Suggest improvements:</strong> Runs both Explain and Validate so you see
                  the full explanation and any improvement tips in one click.
                </li>
                <li>
                  <strong>Templates:</strong> Opens a list of starter queries. Click one to insert
                  it into the editor and optionally run explanation and validation.
                </li>
                <li>
                  <strong>Alert mode:</strong> When checked, validation warns if the SELECT is not
                  a numeric expression (required for NRQL-based alert conditions in New Relic).
                </li>
              </ul>

              <p>
                <a
                  href={NRQL_DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  New Relic NRQL documentation
                </a>
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setShowHelpModal(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showClearModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowClearModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-modal-title"
        >
          <Card
            variant="elevated"
            padding="lg"
            className="max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="clear-modal-title" className="text-lg font-semibold text-foreground">
                Clear editor?
              </h2>
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will clear the query, explanation, and validation results. Your current
              content will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowClearModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClear}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear & Reset
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Editor */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>NRQL</CardTitle>
              <CardDescription>Enter or paste your NRQL query</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="FROM Transaction SELECT average(duration) FACET appName TIMESERIES auto SINCE 1 day ago"
                className="min-h-[200px] font-mono text-sm mt-3"
                spellCheck={false}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExplain}
                  className="gap-1.5"
                  title="Show plain-language explanation of what your query does"
                >
                  <Lightbulb className="w-4 h-4" />
                  Explain
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleValidate}
                  className="gap-1.5"
                  title="Check for errors and warnings (e.g. missing clauses, query length, string quotes)"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Validate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSuggestImprovements}
                  className="gap-1.5"
                  title="Run both Explain and Validate to see full explanation and improvement tips"
                >
                  <Sparkles className="w-4 h-4" />
                  Suggest improvements
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplatesOpen((v) => !v)}
                  className="gap-1.5"
                  title="Open list of starter queries to insert into the editor"
                >
                  <LayoutList className="w-4 h-4" />
                  Templates
                  {templatesOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearModal(true)}
                  className="gap-1.5"
                  title="Clear the query editor and reset explanation and validation"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear
                </Button>
                <label
                  className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer ml-2"
                  title="When on, validation warns if SELECT is not numeric (required for NRQL alert conditions)"
                >
                  <input
                    type="checkbox"
                    checked={alertMode}
                    onChange={(e) => setAlertMode(e.target.checked)}
                    className="rounded border-input"
                  />
                  Alert mode
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Templates drawer */}
          {templatesOpen && (
            <Card variant="bordered" padding="md">
              <CardHeader>
                <CardTitle className="text-base">Templates</CardTitle>
                <CardDescription>Click to insert a starter query</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {NRQL_TEMPLATES.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => handleInsertTemplate(t.query)}
                        className="w-full text-left p-3 rounded-md border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <span className="font-medium text-foreground block">{t.label}</span>
                        <span className="text-sm text-muted-foreground">{t.description}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Explanation & structure, Suggestions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Explanation & structure</CardTitle>
              <CardDescription>Parsed clauses and plain-language explanation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Structure</h4>
                <dl className="space-y-1.5 text-sm">
                  {STRUCTURE_KEYS.map(({ key, label }) => {
                    const value = structure[key];
                    if (value === undefined || value === '') return null;
                    return (
                      <div key={key} className="flex gap-2">
                        <dt className="text-muted-foreground shrink-0">{label}:</dt>
                        <dd className="font-mono text-foreground break-all">{value}</dd>
                      </div>
                    );
                  })}
                  {STRUCTURE_KEYS.every(({ key }) => !structure[key]?.trim()) && (
                    <p className="text-muted-foreground">Enter a query to see structure.</p>
                  )}
                </dl>
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Explanation</h4>
                {explanation.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {explanation.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click &quot;Explain&quot; or &quot;Suggest improvements&quot; to generate an explanation.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suggestions & validation</CardTitle>
              <CardDescription>Warnings and errors from validation</CardDescription>
            </CardHeader>
            <CardContent>
              {validationMessages.length > 0 ? (
                <ul className="space-y-2">
                  {validationMessages.map((msg, i) => (
                    <li key={i}>
                      <Alert
                        variant={msg.severity === 'error' ? 'destructive' : 'default'}
                        className={
                          msg.severity === 'warning'
                            ? 'border-[hsl(var(--status-warning))] bg-[hsl(var(--status-warning)/0.1)]'
                            : undefined
                        }
                      >
                        <AlertDescription
                          className={
                            msg.severity === 'warning' ? 'text-[hsl(var(--status-warning))]' : undefined
                          }
                        >
                          {msg.message}
                        </AlertDescription>
                      </Alert>
                    </li>
                  ))}
                </ul>
              ) : hasValidated ? (
                <p className="text-sm text-[hsl(var(--status-match))]">
                  No issues found.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click &quot;Validate&quot; or &quot;Suggest improvements&quot; to check for issues.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
