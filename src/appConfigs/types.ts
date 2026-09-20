import type { ComponentType } from 'react';
import type { Row } from '../lib/data/types';

/** Configuration that parameterizes AppShell for a specific dashboard (sales, survey, …). */
export interface DashboardConfig {
  /** Stable identifier, e.g. 'sales' | 'survey'. */
  id: string;
  /** Title shown in the header and browser tab. */
  title: string;
  /** Short subtitle shown under the title in the header. */
  subtitle: string;
  /** Path (relative to BASE_URL + 'sample/') of the bundled sample dataset to auto-load. */
  sampleDataPath: string;
  /** Optional per-row enrichment applied right after parsing, before schema detection. */
  enrichRow?: (row: Row) => Row;
  /** Optional extra KPI components rendered alongside the generic KPI row. */
  extraKpis?: ComponentType[];
  /** Subtitle used on the PDF report cover page for this dashboard. */
  pdfCoverSubtitle: string;
}
