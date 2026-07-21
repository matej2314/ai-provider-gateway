import type { ConfigService } from '@nestjs/config';
import type { AppConfiguration } from './app-configuration.types';

export function getAppConfig<K extends keyof AppConfiguration>(
  config: ConfigService,
  key: K,
): AppConfiguration[K] | undefined {
  return config.get<AppConfiguration[K]>(key);
}

export function getAppConfigOrThrow<K extends keyof AppConfiguration>(
  config: ConfigService,
  key: K,
): AppConfiguration[K] {
  const value = config.get<AppConfiguration[K]>(key);
  if (value === undefined) throw new Error(`Missing config key: ${key}`);
  return value;
}
