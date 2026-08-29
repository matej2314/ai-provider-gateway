import { createHash } from 'node:crypto';
import {
  SEMANTIC_CACHE_PROJECT_ID,
  canonicalSemanticSchema,
} from './semantic-cache.constants';

export type SemanticIndexNameOptions = {
  /** Override project id (tests). Default: {@link SEMANTIC_CACHE_PROJECT_ID}. */
  projectId?: string;
  /** Override canonical SCHEMA string (tests). Default from dim. */
  schemaCanonical?: string;
};

/**
 * Normalize embedding model for the middle segment of the index name.
 * `qwen3-embedding:0.6b` → `qwen3-embedding-0-6b`.
 */
export function normalizeEmbeddingModelForIndex(
  embeddingModel: string,
): string {
  return embeddingModel
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function semanticIndexName(
  embeddingModel: string,
  dim: number,
  options?: SemanticIndexNameOptions,
): string {
  const projectId = options?.projectId ?? SEMANTIC_CACHE_PROJECT_ID;
  const schemaCanonical =
    options?.schemaCanonical ?? canonicalSemanticSchema(dim);
  const normalized = normalizeEmbeddingModelForIndex(embeddingModel);
  const schemaHash8 = createHash('sha256')
    .update(`${projectId}\n${embeddingModel}\n${dim}\n${schemaCanonical}`)
    .digest('hex')
    .slice(0, 8);
  return `${projectId}:sem:idx:${normalized}-${dim}-${schemaHash8}`;
}
