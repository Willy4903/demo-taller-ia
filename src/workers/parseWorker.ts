/// <reference lib="webworker" />
import { parseCsvText } from '../lib/parsing/csv';
import { parseXlsxBuffer } from '../lib/parsing/xlsx';
import { parseJsonText } from '../lib/parsing/json';
import { detectSchema, coerceRows } from '../lib/parsing/schemaDetection';
import type { ParsedFileResult } from '../lib/data/types';

export interface ParseWorkerRequest {
  id: string;
  fileName: string;
  kind: 'csv' | 'xlsx' | 'json';
  text?: string;
  buffer?: ArrayBuffer;
}

export interface ParseWorkerResponse {
  id: string;
  result: ParsedFileResult;
}

self.onmessage = (event: MessageEvent<ParseWorkerRequest>) => {
  const { id, fileName, kind, text, buffer } = event.data;
  const start = performance.now();

  const raw =
    kind === 'csv'
      ? parseCsvText(text ?? '')
      : kind === 'json'
        ? parseJsonText(text ?? '')
        : parseXlsxBuffer(buffer as ArrayBuffer);

  const schema = detectSchema(raw.rows);
  const rows = coerceRows(raw.rows, schema);
  const parseMs = performance.now() - start;

  const result: ParsedFileResult = {
    fileName,
    rows,
    schema,
    errors: raw.errors,
    parseMs,
  };

  const response: ParseWorkerResponse = { id, result };
  (self as unknown as Worker).postMessage(response);
};

export {};
