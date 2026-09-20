import { reportColors, reportFonts } from '../../lib/pdf/styles';
import { ReportPage } from './ReportPage';

interface ExecSummaryProps {
  messages: string[];
  pageNumber: number;
  totalPages: number;
}

export function ExecSummary({ messages, pageNumber, totalPages }: ExecSummaryProps) {
  return (
    <ReportPage pageNumber={pageNumber} totalPages={totalPages}>
      <SectionHeading label="RESUMEN EJECUTIVO" />
      <h2 style={{ fontFamily: reportFonts.serif, fontSize: 24, color: reportColors.navy, marginTop: 8 }}>
        Mensajes clave
      </h2>
      <div style={{ marginTop: 24 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 22, alignItems: 'flex-start' }}>
            <div
              style={{
                fontFamily: reportFonts.serif,
                fontSize: 22,
                color: reportColors.gold,
                minWidth: 32,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: reportColors.grey900, paddingTop: 2 }}>{msg}</div>
          </div>
        ))}
      </div>
    </ReportPage>
  );
}

export function SectionHeading({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 2,
        color: reportColors.gold,
        fontWeight: 700,
        borderBottom: `2px solid ${reportColors.navy}`,
        paddingBottom: 8,
      }}
    >
      {label}
    </div>
  );
}
