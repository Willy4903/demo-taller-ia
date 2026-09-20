import type { ReactNode } from 'react';
import { PAGE_HEIGHT_PX, PAGE_MARGIN_PX, PAGE_WIDTH_PX, reportColors, reportFonts } from '../../lib/pdf/styles';

interface ReportPageProps {
  pageNumber: number;
  totalPages: number;
  children: ReactNode;
  dark?: boolean;
}

/** Fixed A4-sized page wrapper used by every report template, with footer + page number. */
export function ReportPage({ pageNumber, totalPages, children, dark = false }: ReportPageProps) {
  return (
    <div
      style={{
        width: PAGE_WIDTH_PX,
        height: PAGE_HEIGHT_PX,
        background: dark ? reportColors.navy : reportColors.white,
        color: dark ? reportColors.white : reportColors.grey900,
        fontFamily: reportFonts.sans,
        position: 'relative',
        boxSizing: 'border-box',
        padding: PAGE_MARGIN_PX,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1 }}>{children}</div>
      <div
        style={{
          position: 'absolute',
          left: PAGE_MARGIN_PX,
          right: PAGE_MARGIN_PX,
          bottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9,
          color: dark ? reportColors.grey400 : reportColors.grey400,
          borderTop: `1px solid ${dark ? reportColors.navyLight : reportColors.grey200}`,
          paddingTop: 8,
        }}
      >
        <span>Informe Ejecutivo · Dashboard Analítico</span>
        <span>
          Página {pageNumber} de {totalPages}
        </span>
      </div>
    </div>
  );
}
