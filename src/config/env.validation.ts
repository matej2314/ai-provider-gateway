import { plainToInstance, Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  validateSync,
  IsBoolean,
  IsIn,
  IsInt,
  Min,
  Max,
  IsNumber,
  ValidateIf,
} from 'class-validator';
import type { CACHE_BACKEND_TYPE } from '../cache/interfaces/cache-backend-interface';

function toBoolean(value: unknown): boolean {
  return value === 'true' || value === true;
}

function toInt(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseInt(value, 10);
  return NaN;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return NaN;
}

function isRedisInfrastructureRequired(obj: EnvironmentVariables): boolean {
  const redisKv =
    obj.CACHE_ENABLED === true &&
    (obj.CACHE_BACKEND ?? 'noop').toLowerCase() === 'redis';
  return (
    redisKv ||
    obj.RATE_LIMIT_SMART_ENABLED === true ||
    obj.SEMANTIC_CACHE_ENABLED === true
  );
}

class EnvironmentVariables {
  @Transform(({ value }: { value: unknown }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  CACHE_ENABLED?: boolean = false;

  @IsIn(['noop', 'redis'])
  @IsOptional()
  CACHE_BACKEND?: 'noop' | 'redis' = 'noop';

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  CACHE_TTL?: number = 3600;

  @IsString()
  @IsOptional()
  CACHE_KEY_PREFIX?: string = 'aigw:';

  @ValidateIf((obj: EnvironmentVariables) => isRedisInfrastructureRequired(obj))
  @IsString()
  @IsOptional()
  REDIS_HOST?: string = 'localhost';

  @ValidateIf((obj: EnvironmentVariables) => isRedisInfrastructureRequired(obj))
  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  REDIS_PORT?: number = 6379;

  @ValidateIf((obj: EnvironmentVariables) => isRedisInfrastructureRequired(obj))
  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string = '';

  @ValidateIf((obj: EnvironmentVariables) => isRedisInfrastructureRequired(obj))
  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  REDIS_DB?: number = 0;

  @IsString()
  @IsOptional()
  REDIS_KEY_PREFIX?: string = 'aigw:';

  @Transform(({ value }: { value: unknown }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  RATE_LIMIT_SMART_ENABLED?: boolean = false;

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  RATE_LIMIT_RPS_PER_KEY?: number = 10;

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  RATE_LIMIT_BURST_PER_KEY?: number = 20;

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @IsOptional()
  RATE_LIMIT_STREAMS_CONCURRENT?: number = 3;

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  RATE_LIMIT_COOLDOWN_AFTER_429?: number = 60;

  @IsString()
  @IsOptional()
  SENTRY_DSN?: string = '';

  @Transform(({ value }: { value: unknown }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  SENTRY_ENABLED?: boolean = false;

  @IsString()
  @IsOptional()
  SENTRY_ENVIRONMENT?: string = 'development';

  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  SENTRY_TRACES_SAMPLE_RATE?: number = 0.1;

  @Transform(({ value }: { value: unknown }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  LOG_PRETTY?: boolean = false;

  @IsString()
  @IsOptional()
  ERROR_REPORTING_ADAPTER?: string = 'noop';

  @IsIn(['prometheus', 'noop'])
  @IsOptional()
  METRICS_BACKEND?: 'prometheus' | 'noop' = 'noop';

  @IsIn(['sentry', 'noop'])
  @IsOptional()
  AI_METRICS_BACKEND?: 'sentry' | 'noop' = 'noop';

  @Transform(({ value }: { value: unknown }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  SEMANTIC_CACHE_ENABLED?: boolean = false;

  @IsString()
  @IsOptional()
  EMBEDDING_BASE_URL?: string = 'http://localhost:11435';

  @IsString()
  @IsOptional()
  EMBEDDING_MODEL?: string = 'qwen3-embedding:0.6b';

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  EMBEDDING_DIM?: number = 1024;

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  EMBEDDING_TIMEOUT_MS?: number = 5000;

  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  SEMANTIC_CACHE_MIN_SIMILARITY?: number = 0.85;

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  SEMANTIC_CACHE_TTL?: number = 3600;

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  SEMANTIC_CACHE_K?: number = 3;
}

const CACHE_BACKEND_VALUES = ['noop', 'redis'] as const;

export function parseCacheBackend(
  raw: string | undefined,
  enabled: boolean,
): CACHE_BACKEND_TYPE {
  if (!enabled) return 'noop';
  const normalized = (raw ?? 'noop').toLowerCase();

  if ((CACHE_BACKEND_VALUES as readonly string[]).includes(normalized)) {
    return normalized as CACHE_BACKEND_TYPE;
  }
  return 'noop';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });
  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}

export type ValidatedEnvironment = EnvironmentVariables;
