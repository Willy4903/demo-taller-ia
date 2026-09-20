import { useCallback, useRef } from 'react';
import type ReactECharts from 'echarts-for-react';

/** Provides a ref to attach to a ReactECharts instance plus a handler to export it as PNG. */
export function useChartPngExport(fileName: string) {
  const ref = useRef<ReactECharts | null>(null);

  const exportPng = useCallback(() => {
    const instance = ref.current?.getEchartsInstance();
    if (!instance) return;
    const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.png`;
    link.click();
  }, [fileName]);

  return { ref, exportPng };
}
