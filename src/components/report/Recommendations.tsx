import { reportColors, reportFonts } from '../../lib/pdf/styles';
import { ReportPage } from './ReportPage';
import { SectionHeading } from './ExecSummary';

interface RecommendationsProps {
  recommendations: string[];
  pageNumber: number;
  totalPages: number;
}

export function Recommendations({ recommendations, pageNumber, totalPages }: RecommendationsProps) {
  return (
    <ReportPage pageNumber={pageNumber} totalPages={totalPages}>
      <SectionHeading label="RECOMENDACIONES Y PRÓXIMOS PASOS" />
      <h2 style={{ fontFamily: reportFonts.serif, fontSize: 22, color: reportColors.navy, marginTop: 16 }}>
        Acciones sugeridas
      </h2>
      <div style={{ marginTop: 20 }}>
        {recommendations.map((rec, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 14,
              padding: '14px 0',
              borderBottom: `1px solid ${reportColors.grey200}`,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: `1.5px solid ${reportColors.gold}`,
                color: reportColors.navy,
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: reportColors.grey900 }}>{rec}</div>
          </div>
        ))}
      </div>
    </ReportPage>
  );
}
