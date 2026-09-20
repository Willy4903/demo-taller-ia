import type { ParsedFileResult } from '../data/types';
import type { ParseWorkerRequest, ParseWorkerResponse } from '../../workers/parseWorker';

function kindFromFileName(name: string): 'csv' | 'xlsx' | 'json' {
  const lower = name.toLowerCase();
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx';
  return 'csv';
}

/**
 * Parses a File in a dedicated Web Worker so large files (100k+ rows) do not
 * block the main thread. Falls back to inline parsing if workers are unavailable
 * (e.g. some test environments).
 */
export async function parseFileInWorker(file: File): Promise<ParsedFileResult> {
  const kind = kindFromFileName(file.name);

  if (typeof Worker === 'undefined') {
    const { parseFileInline } = await import('./inline');
    return parseFileInline(file, kind);
  }

  const worker = new Worker(new URL('../../workers/parseWorker.ts', import.meta.url), {
    type: 'module',
  });

  const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const payload: ParseWorkerRequest =
    kind === 'xlsx'
      ? { id, fileName: file.name, kind, buffer: await file.arrayBuffer() }
      : { id, fileName: file.name, kind, text: await file.text() };

  return new Promise<ParsedFileResult>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
      if (event.data.id !== id) return;
      resolve(event.data.result);
      worker.terminate();
    };
    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };
    if (payload.kind === 'xlsx' && payload.buffer) {
      worker.postMessage(payload, [payload.buffer]);
    } else {
      worker.postMessage(payload);
    }
  });
}
