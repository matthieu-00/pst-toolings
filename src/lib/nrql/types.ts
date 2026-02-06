export interface NrqlStructure {
  select?: string;
  from?: string;
  where?: string;
  facet?: string;
  limit?: string;
  since?: string;
  until?: string;
  timezone?: string;
  compareWith?: string;
  timeseries?: string;
}

export interface ValidationMessage {
  severity: 'error' | 'warning';
  message: string;
}

export interface NrqlTemplate {
  id: string;
  label: string;
  description: string;
  query: string;
  tags: string[];
}
