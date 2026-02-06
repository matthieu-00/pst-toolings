import type { NrqlStructure } from './types';

const NRQL_KEYWORDS: { key: keyof NrqlStructure; pattern: RegExp }[] = [
  { key: 'timezone', pattern: /\bWITH\s+TIMEZONE\b/gi },
  { key: 'compareWith', pattern: /\bCOMPARE\s+WITH\b/gi },
  { key: 'select', pattern: /\bSELECT\b/gi },
  { key: 'from', pattern: /\bFROM\b/gi },
  { key: 'where', pattern: /\bWHERE\b/gi },
  { key: 'facet', pattern: /\bFACET\b/gi },
  { key: 'limit', pattern: /\bLIMIT\b/gi },
  { key: 'since', pattern: /\bSINCE\b/gi },
  { key: 'until', pattern: /\bUNTIL\b/gi },
  { key: 'timeseries', pattern: /\bTIMESERIES\b/gi },
];

interface Match {
  key: keyof NrqlStructure;
  start: number;
  length: number;
}

function findKeywordMatches(normalized: string): Match[] {
  const matches: Match[] = [];
  for (const { key, pattern } of NRQL_KEYWORDS) {
    let m: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(normalized)) !== null) {
      const keywordLength = m[0].length;
      matches.push({ key, start: m.index, length: keywordLength });
    }
  }
  matches.sort((a, b) => a.start - b.start);
  return matches;
}

/**
 * Parse NRQL query string into a clause structure.
 * Keywords are case-insensitive. Multi-word keywords (WITH TIMEZONE, COMPARE WITH) are supported.
 */
export function parseNrql(query: string): NrqlStructure {
  const normalized = query.trim().replace(/\s+/g, ' ').replace(/\n/g, ' ');
  const structure: NrqlStructure = {};

  if (!normalized) {
    return structure;
  }

  const matches = findKeywordMatches(normalized);

  for (let i = 0; i < matches.length; i++) {
    const { key, start, length } = matches[i];
    const valueStart = start + length;
    const valueEnd = i + 1 < matches.length ? matches[i + 1].start : normalized.length;
    const value = normalized.slice(valueStart, valueEnd).trim();
    if (value) {
      structure[key] = value;
    }
  }

  return structure;
}
