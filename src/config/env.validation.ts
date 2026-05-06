import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
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
