import { reportColors, reportFonts } from '../../lib/pdf/styles';
import { ReportPage } from './ReportPage';
import { SectionHeading } from './ExecSummary';

interface FindingPageProps {
  index: number;
  total: number;
  title: string;
  bullets: string[];
  chartImage: string | null;
  pageNumber: number;
  totalPages: number;
}

export function FindingPage({ index, total, title, bullets, chartImage, pageNumber, totalPages }: FindingPageProps) {
  return (
    <ReportPage pageNumber={pageNumber} totalPages={totalPages}>
      <SectionHeading label={`HALLAZGO ${index} DE ${total}`} />
      <h2
        style={{
          fontFamily: reportFonts.serif,
          fontSize: 22,
          color: reportColors.navy,
          marginTop: 16,
          lineHeight: 1.35,
        }}
      >
        {title}
      </h2>
      {chartImage && (
        <div
          style={{
            marginTop: 20,
            border: `1px solid ${reportColors.grey200}`,
            padding: 12,
            background: reportColors.grey100,
          }}
        >
          <img src={chartImage} style={{ width: '100%', display: 'block' }} alt="" />
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, color: reportColors.grey700, fontWeight: 700 }}>
          ¿Y ENTONCES?
        </div>
        <ul style={{ marginTop: 10, paddingLeft: 18 }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ fontSize: 13, lineHeight: 1.6, color: reportColors.grey900, marginBottom: 8 }}>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </ReportPage>
  );
}
