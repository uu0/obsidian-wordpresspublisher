import { parseYaml, stringifyYaml } from 'obsidian';

export class PublishCancelledError extends Error {
  constructor() { super('User cancelled'); }
}

export interface PublishCheckpoint {
  stage: 'sending' | 'published';
  sourcePath: string;
  postId?: string;
  metadata: Record<string, unknown>;
}

/** Preserve the body and unrelated YAML, and reject concurrent note edits atomically. */
export function applyPublishedNote(raw: string, expected: string, metadata: Record<string, unknown>, body?: string): string {
  if (raw !== expected) {
    throw new Error('The source note changed during publishing. WordPress was updated; publish again to recover its ID without uploading again.');
  }
  const header = raw.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m);
  const hasHeader = header?.index === 0;
  const value: unknown = hasHeader ? parseYaml(header[1]) : {};
  if (value !== null && (typeof value !== 'object' || Array.isArray(value))) {
    throw new Error('Frontmatter must be a YAML mapping.');
  }
  const fm = { ...(value as Record<string, unknown> ?? {}), ...metadata };
  const originalBody = hasHeader ? raw.slice(header[0].length) : raw;
  return `---\n${stringifyYaml(fm).trimEnd()}\n---\n${body ?? originalBody}`;
}

export function publishKey(endpoint: string, path: string): string {
  return JSON.stringify([endpoint.replace(/\/$/, ''), path]);
}
