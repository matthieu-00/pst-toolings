import type { NrqlStructure } from './types';

const FROM_DESCRIPTIONS: Record<string, string> = {
  Transaction: "You're querying APM Transaction events (server-side requests).",
  PageView: "You're querying Browser PageView events.",
  Mobile: "You're querying Mobile monitoring events.",
  Log: "You're querying log events.",
  ProcessSample: "You're querying Infrastructure process samples.",
  SyntheticCheck: "You're querying Synthetic check events.",
  Span: "You're querying distributed tracing spans.",
  Metric: "You're querying metric data.",
};

function explainFrom(from: string): string {
  const dataType = from.split(',')[0].trim();
  return FROM_DESCRIPTIONS[dataType] ?? `You're querying ${dataType} events.`;
}

function explainSelect(select: string): string {
  const s = select.trim().toLowerCase();
  if (s.includes('average(')) {
    return "You're calculating an average value (e.g. latency or another numeric attribute).";
  }
  if (s.includes('max(')) {
    return "You're finding the maximum value.";
  }
  if (s.includes('min(')) {
    return "You're finding the minimum value.";
  }
  if (s.includes('sum(')) {
    return "You're summing a numeric attribute across events.";
  }
  if (s.includes('count(*)')) {
    return "You're counting the number of events.";
  }
  if (s.includes('count(')) {
    return "You're counting events or distinct values.";
  }
  if (s.includes('percentile(')) {
    return "You're computing a percentile (e.g. 95th percentile duration).";
  }
  if (s.includes('rate(')) {
    return "You're computing a rate over time.";
  }
  if (s.includes('percentage(')) {
    return "You're computing a percentage.";
  }
  if (s.includes('uniqueCount(')) {
    return "You're counting unique values of an attribute.";
  }
  if (s.includes('*')) {
    return "You're selecting all attributes from each event.";
  }
  return "You're selecting one or more attributes or expressions.";
}

function explainWhere(where: string): string {
  const trimmed = where.trim();
  if (!trimmed) return "";
  return `You're filtering to events where ${trimmed}.`;
}

function explainFacet(facet: string): string {
  const trimmed = facet.trim();
  if (!trimmed) return "";
  return `You're grouping results by ${trimmed}.`;
}

function explainTimeseries(timeseries: string): string {
  const trimmed = timeseries.trim().toLowerCase();
  if (!trimmed) return "You're displaying results as a time series chart.";
  if (trimmed === 'auto') {
    return "You're splitting the time window into automatic buckets for a time chart.";
  }
  return `You're splitting the time window into ${timeseries.trim()} buckets for a time chart.`;
}

/**
 * Generate human-readable explanation lines from parsed NRQL structure.
 */
export function explainNrql(struct: NrqlStructure): string[] {
  const lines: string[] = [];

  if (struct.from?.trim()) {
    lines.push(explainFrom(struct.from));
  }
  if (struct.select?.trim()) {
    lines.push(explainSelect(struct.select));
  }
  if (struct.where?.trim()) {
    const whereLine = explainWhere(struct.where);
    if (whereLine) lines.push(whereLine);
  }
  if (struct.facet?.trim()) {
    const facetLine = explainFacet(struct.facet);
    if (facetLine) lines.push(facetLine);
  }
  if (struct.limit?.trim()) {
    lines.push(`You're limiting results to ${struct.limit} rows or facets.`);
  }
  if (struct.since?.trim()) {
    lines.push(`Time range starts: ${struct.since}.`);
  }
  if (struct.until?.trim()) {
    lines.push(`Time range ends: ${struct.until}.`);
  }
  if (struct.timeseries?.trim()) {
    lines.push(explainTimeseries(struct.timeseries));
  }
  if (struct.timezone?.trim()) {
    lines.push(`Using timezone: ${struct.timezone}.`);
  }
  if (struct.compareWith?.trim()) {
    lines.push(`Comparing with: ${struct.compareWith}.`);
  }

  return lines;
}
