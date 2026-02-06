import type { NrqlStructure, ValidationMessage } from './types';

const NUMERIC_AGGREGATORS = [
  'count(',
  'average(',
  'sum(',
  'percentage(',
  'rate(',
  'max(',
  'min(',
  'percentile(',
  'stddev(',
  'uniqueCount(',
];

export interface ValidateNrqlOptions {
  alertMode?: boolean;
}

/**
 * Validate NRQL structure and raw query. Returns errors and warnings.
 */
export function validateNrql(
  struct: NrqlStructure,
  query: string,
  options: ValidateNrqlOptions = {}
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  if (!struct.select?.trim()) {
    messages.push({ severity: 'error', message: 'Query must have a SELECT clause.' });
  }
  if (!struct.from?.trim()) {
    messages.push({ severity: 'error', message: 'Query must have a FROM clause.' });
  }

  if (query.length >= 4096) {
    messages.push({
      severity: 'error',
      message: 'Query string must be less than 4 KB.',
    });
  }

  if (!struct.since?.trim() && (struct.select || struct.from)) {
    messages.push({
      severity: 'warning',
      message: 'Consider adding SINCE to limit the time range (default is last 60 minutes).',
    });
  }

  const doubleQuoteOrUnquoted = /=\s*"[^"]*"|=\s*[^\s'"]+/;
  if (struct.where?.trim() && doubleQuoteOrUnquoted.test(struct.where)) {
    messages.push({
      severity: 'warning',
      message: 'NRQL string literals should use single quotes, e.g. WHERE appName = \'my-app\'.',
    });
  }

  if (options.alertMode && struct.select?.trim()) {
    const selectNorm = struct.select.trim().toLowerCase();
    const hasNumericAggregator = NUMERIC_AGGREGATORS.some((agg) =>
      selectNorm.startsWith(agg.toLowerCase())
    );
    if (!hasNumericAggregator) {
      messages.push({
        severity: 'warning',
        message:
          'Alert conditions require a numeric SELECT (e.g. count(*), average(duration), rate(...)).',
      });
    }
  }

  return messages;
}
