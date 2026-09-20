import { reportColors, reportFonts } from '../../lib/pdf/styles';
import { ReportPage } from './ReportPage';

interface CoverProps {
  title: string;
  subtitle: string;
  dateLabel: string;
  totalPages: number;
}

export function Cover({ title, subtitle, dateLabel, totalPages }: CoverProps) {
  return (
    <ReportPage pageNumber={1} totalPages={totalPages} dark>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ width: 64, height: 4, background: reportColors.gold, marginBottom: 32 }} />
        <div style={{ fontSize: 12, letterSpacing: 2, color: reportColors.gold, marginBottom: 12 }}>
          INFORME EJECUTIVO
        </div>
        <h1
          style={{
            fontFamily: reportFonts.serif,
            fontSize: 40,
            lineHeight: 1.15,
            margin: 0,
            marginBottom: 20,
            maxWidth: 560,
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 15, color: reportColors.grey200, maxWidth: 520, lineHeight: 1.6 }}>{subtitle}</p>
        <div style={{ marginTop: 48, fontSize: 12, color: reportColors.grey400 }}>{dateLabel}</div>
      </div>
    </ReportPage>
  );
}
