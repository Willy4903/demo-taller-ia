import type { ReactNode } from 'react';
import { reportColors, reportFonts } from '../../lib/pdf/styles';
import { ReportPage } from './ReportPage';
import { SectionHeading } from './ExecSummary';

interface AppendixProps {
  sources: string[];
  filtersApplied: string[];
  dataQuality: { label: string; value: string }[];
  pageNumber: number;
  totalPages: number;
}

export function Appendix({ sources, filtersApplied, dataQuality, pageNumber, totalPages }: AppendixProps) {
  return (
    <ReportPage pageNumber={pageNumber} totalPages={totalPages}>
      <SectionHeading label="ANEXO METODOLÓGICO" />
      <h2 style={{ fontFamily: reportFonts.serif, fontSize: 22, color: reportColors.navy, marginTop: 16 }}>
        Fuentes, filtros y calidad de datos
      </h2>

      <Block title="Fuentes de datos">
        {sources.length > 0 ? (
          <ul style={{ paddingLeft: 18 }}>
            {sources.map((s, i) => (
              <li key={i} style={{ fontSize: 12.5, color: reportColors.grey900, marginBottom: 4 }}>
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}
      </Block>

      <Block title="Filtros aplicados">
        {filtersApplied.length > 0 ? (
          <ul style={{ paddingLeft: 18 }}>
            {filtersApplied.map((f, i) => (
              <li key={i} style={{ fontSize: 12.5, color: reportColors.grey900, marginBottom: 4 }}>
                {f}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 12.5, color: reportColors.grey700 }}>Sin filtros activos (vista completa).</div>
        )}
      </Block>

      <Block title="Calidad de datos">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <tbody>
            {dataQuality.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${reportColors.grey200}` }}>
                <td style={{ padding: '6px 0', color: reportColors.grey700 }}>{row.label}</td>
                <td style={{ padding: '6px 0', textAlign: 'right', color: reportColors.grey900, fontWeight: 600 }}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Block>
    </ReportPage>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, color: reportColors.grey700, fontWeight: 700, fontFamily: reportFonts.sans }}>
        {title.toUpperCase()}
      </div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

function Empty() {
  return <div style={{ fontSize: 12.5, color: reportColors.grey700 }}>No especificado.</div>;
}
