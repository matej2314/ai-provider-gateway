import { parseCachedChatResponse } from '../schemas/cached-chat-response.schema';
import { isUnservableCachedReply } from '../helpers/is-unservable-cached-reply';
import type { VectorSearchHit } from './vector-store.interface';

export type ParsedKnnHits = {
  hits: VectorSearchHit[];
  corruptKeys: string[];
};

/** Coerce Redis RESP2 / HMGET field values to UTF-8 text. */
export function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (typeof value === 'number') return String(value);
  return '';
}

/**
 * Parse FT.SEARCH RESP2 hits. Corrupt reply payloads are collected for DEL
 * (same hygiene as exact cache invalid entries) — missing dist alone does not delete.
 */
export function parseKnnHits(raw: unknown): ParsedKnnHits {
  if (!Array.isArray(raw) || raw.length < 3) {
    return { hits: [], corruptKeys: [] };
  }

  const items: unknown[] = raw;
  const count = Number(raw[0]);
  if (!Number.isFinite(count) || count < 1) {
    return { hits: [], corruptKeys: [] };
  }

  const hits: VectorSearchHit[] = [];
  const corruptKeys: string[] = [];
  for (let i = 1; i + 1 < items.length; i += 2) {
    const key = asString(items[i]);
    const fields = items[i + 1];
    if (!Array.isArray(fields)) continue;

    const map = new Map<string, string>();
    for (let j = 0; j + 1 < fields.length; j += 2) {
      map.set(asString(fields[j]), asString(fields[j + 1]));
    }

    const replyRaw = map.get('reply');
    if (!replyRaw) {
      if (key) corruptKeys.push(key);
      continue;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(replyRaw);
    } catch {
      if (key) corruptKeys.push(key);
      continue;
    }

    const reply = parseCachedChatResponse(parsedJson);
    if (!reply || isUnservableCachedReply(reply)) {
      if (key) corruptKeys.push(key);
      continue;
    }

    const dist = Number.parseFloat(map.get('dist') ?? '');
    if (!Number.isFinite(dist)) continue;

    hits.push({
      similarity: 1 - dist,
      reply,
    });
  }

  return { hits, corruptKeys };
}
