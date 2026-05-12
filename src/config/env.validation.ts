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
} from 'class-validator';

const isProduction = (config: Record<string, unknown>): boolean => {
  const nodeEnv = config.NODE_ENV as string;
  return nodeEnv === 'production';
};

function hasAtLeastOneProviderKey(env: EnvironmentVariables): boolean {
  const anthropic = (env.ANTHROPIC_API_KEY ?? '').trim();
  const google = (env.GOOGLE_API_KEY ?? '').trim();
  return anthropic.length > 0 || google.length > 0;
}

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ANTHROPIC_API_KEY?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  GOOGLE_API_KEY?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  CACHE_ENABLED?: boolean = false;

  @IsIn(['noop', 'redis', 'memory', 'other'])
  @IsOptional()
  CACHE_BACKEND?: string = 'noop';

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  CACHE_TTL?: number = 3600;

  @IsString()
  @IsOptional()
  CACHE_KEY_PREFIX?: string = 'aigw:';

  @IsString()
  @IsOptional()
  REDIS_HOST?: string = 'localhost';

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  REDIS_PORT?: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string = '';

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @IsOptional()
  REDIS_DB?: number = 0;

  @IsString()
  @IsOptional()
  REDIS_KEY_PREFIX?: string = 'aigw:';
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
