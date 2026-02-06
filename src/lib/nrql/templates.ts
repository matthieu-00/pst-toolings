import type { NrqlTemplate } from './types';

export const NRQL_TEMPLATES: NrqlTemplate[] = [
  {
    id: 'latency-by-app',
    label: 'Latency by app (APM)',
    description: 'Average transaction duration grouped by application name, as a time series.',
    query: `FROM Transaction SELECT average(duration) FACET appName TIMESERIES auto SINCE 1 day ago`,
    tags: ['apm', 'latency', 'timeseries'],
  },
  {
    id: 'error-rate-by-status',
    label: 'Error rate by status code',
    description: 'Count of transactions grouped by HTTP response code.',
    query: `FROM Transaction SELECT count(*) FACET httpResponseCode WHERE httpResponseCode >= 400 SINCE 1 day ago`,
    tags: ['apm', 'errors', 'http'],
  },
  {
    id: 'log-volume-by-level',
    label: 'Log volume by level',
    description: 'Log event count grouped by level (e.g. error, warn, info).',
    query: `FROM Log SELECT count(*) FACET level TIMESERIES 1 hour SINCE 1 day ago`,
    tags: ['logs', 'volume', 'timeseries'],
  },
  {
    id: 'alert-high-error-rate',
    label: 'Alert: high error rate',
    description: 'Numeric query suitable for an NRQL alert condition (error count).',
    query: `FROM Transaction SELECT count(*) WHERE httpResponseCode >= 400 SINCE 5 minutes ago`,
    tags: ['alert', 'errors', 'apm'],
  },
  {
    id: 'browser-unique-users',
    label: 'Browser: unique users by country',
    description: 'Unique user count from PageView events, grouped by country.',
    query: `SELECT uniqueCount(session) FROM PageView WHERE countryCode IS NOT NULL FACET countryCode SINCE 1 day ago LIMIT 20`,
    tags: ['browser', 'pageview', 'users'],
  },
  {
    id: 'transaction-percentile',
    label: '95th percentile duration (APM)',
    description: '95th percentile transaction duration over time.',
    query: `FROM Transaction SELECT percentile(duration, 95) TIMESERIES 5 minutes SINCE 1 day ago`,
    tags: ['apm', 'latency', 'percentile', 'timeseries'],
  },
  {
    id: 'apm-throughput',
    label: 'Transaction throughput by app',
    description: 'Transaction count over time, faceted by application.',
    query: `FROM Transaction SELECT count(*) FACET appName TIMESERIES 1 minute SINCE 6 hours ago LIMIT 5`,
    tags: ['apm', 'throughput', 'timeseries'],
  },
  {
    id: 'span-duration-by-entity',
    label: 'Span duration by entity (tracing)',
    description: 'Average span duration from distributed tracing, grouped by entity name.',
    query: `FROM Span SELECT average(duration) FACET entity.name TIMESERIES auto SINCE 1 day ago`,
    tags: ['tracing', 'span', 'latency'],
  },
  {
    id: 'synthetic-check-success',
    label: 'Synthetic check success count',
    description: 'Count of successful synthetic checks over time.',
    query: `FROM SyntheticCheck SELECT count(*) WHERE result = 'SUCCESS' TIMESERIES 1 hour SINCE 1 day ago`,
    tags: ['synthetic', 'monitoring'],
  },
  {
    id: 'raw-transaction-sample',
    label: 'Raw transaction sample',
    description: 'Fetch a few transaction events with selected attributes (no aggregation).',
    query: `SELECT name, duration, appName FROM Transaction LIMIT 10 SINCE 1 hour ago`,
    tags: ['apm', 'sample', 'exploration'],
  },
];
