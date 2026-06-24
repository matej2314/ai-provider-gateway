import { plainToInstance, Transform } from 'class-transformer';
import {
  IsNotEmpty,
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
  Matches,
} from 'class-validator';
import type { CACHE_BACKEND_TYPE } from '../cache/interfaces/cache-backend-interface';

const isProduction = (config: Record<string, unknown>): boolean => {
  const nodeEnv = config.NODE_ENV;
  return nodeEnv === 'production';
};

function isRedisCacheBackend(obj: EnvironmentVariables): boolean {
  return (
    obj.CACHE_BACKEND === 'redis' &&
    (obj.CACHE_BACKEND ?? 'noop').toLowerCase() === 'redis'
  );
}

function hasAtLeastOneProviderKey(env: EnvironmentVariables): boolean {
  const anthropic = (env.ANTHROPIC_API_KEY ?? '').trim();
  const google = (env.GOOGLE_API_KEY ?? '').trim();
  return anthropic.length > 0 || google.length > 0;
}

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^sk-ant-/, {
    message: 'ANTHROPIC_API_KEY must start with "sk-ant-"',
  })
  ANTHROPIC_API_KEY?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^(AIza|AQ\.)/, {
    message: 'GOOGLE_API_KEY must start with "AIza" or "AQ" strings',
  })
  GOOGLE_API_KEY?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  CACHE_ENABLED?: boolean = false;

  @IsIn(['noop', 'redis', 'memory', 'other'])
  @IsOptional()
  CACHE_BACKEND?: 'noop' | 'redis' | 'memory' | 'other' = 'noop';

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  CACHE_TTL?: number = 3600;

  @IsString()
  @IsOptional()
  CACHE_KEY_PREFIX?: string = 'aigw:';

  @ValidateIf((obj) => isRedisCacheBackend(obj))
  @IsString()
  @IsOptional()
  REDIS_HOST?: string = 'localhost';

  @ValidateIf((obj) => isRedisCacheBackend(obj))
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  REDIS_PORT?: number = 6379;

  @ValidateIf((obj) => isRedisCacheBackend(obj))
  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string = '';

  @ValidateIf((obj) => isRedisCacheBackend(obj))
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @IsOptional()
  REDIS_DB?: number = 0;

  @IsString()
  @IsOptional()
  REDIS_KEY_PREFIX?: string = 'aigw:';

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  RATE_LIMIT_SMART_ENABLED?: boolean = false;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  RATE_LIMIT_RPS_PER_KEY?: number = 10;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  RATE_LIMIT_BURST_PER_KEY?: number = 20;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsOptional()
  RATE_LIMIT_STREAMS_CONCURRENT?: number = 3;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @IsOptional()
  RATE_LIMIT_COOLDOWN_AFTER_429?: number = 60;

  @IsString()
  @IsOptional()
  SENTRY_DSN?: string = '';

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  SENTRY_ENABLED?: boolean = false;

  @IsString()
  @IsOptional()
  SENTRY_ENVIRONMENT?: string = 'development';

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  SENTRY_TRACES_SAMPLE_RATE?: number = 0.1;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  LOG_PRETTY?: boolean = false;

  @IsString()
  @IsOptional()
  ERROR_REPORTING_ADAPTER?: string = 'noop';

  @IsString()
  @IsOptional()
  METRICS_BACKEND?: string = 'noop';
}

const CACHE_BACKEND_VALUES = ['noop', 'redis', 'memory', 'other'] as const;

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
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });
  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }

  if (isProduction(config) && !hasAtLeastOneProviderKey(validatedConfig)) {
    throw new Error('At least one API key is required in production');
  }
  return validatedConfig;
}

export type ValidatedEnvironment = EnvironmentVariables;
