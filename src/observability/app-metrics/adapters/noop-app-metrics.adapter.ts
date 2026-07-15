import { Injectable } from '@nestjs/common';
import type {
  AppMetricsBackend,
  AppRequestLabels,
  AppTokenUsage,
  TokenDirection,
  RateLimitReason,
  AppProviderCallContext,
  AppProviderStreamScope,
  HealthComponent,
  HealthMetricsSnapshot,
  HealthStatus,
  HttpRequestLabels,
  HttpMethod,
} from '../interfaces/app-metrics-backend.interface';
import type {
  ClientId,
  ModelAlias,
  ProviderInstanceId,
} from '../../../common/types/branded.types';

@Injectable()
export class NoopAppMetricsAdapter implements AppMetricsBackend {
  recordHttpRequest(_labels: HttpRequestLabels): void {
    return;
  }

  recordHttpRequestDuration(
    _method: HttpMethod,
    _route: string,
    _durationSec: number,
  ): void {
    return;
  }

  recordRequest(_labels: AppRequestLabels): void {
    return;
  }

  recordRequestDuration(
    _provider: ProviderInstanceId,
    _model: ModelAlias,
    _durationSec: number,
  ): void {
    return;
  }

  recordError(
    _provider: ProviderInstanceId,
    _model: ModelAlias,
    _errorCode: string,
  ): void {
    return;
  }

  recordTokens(
    _provider: ProviderInstanceId,
    _model: ModelAlias,
    _direction: TokenDirection,
    _count: number,
  ): void {
    return;
  }

  recordTokensPerRequest(
    _provider: ProviderInstanceId,
    _model: ModelAlias,
    _totalTokens: number,
  ): void {
    return;
  }

  recordTokenUsage(
    _provider: ProviderInstanceId,
    _model: ModelAlias,
    _usage: AppTokenUsage,
  ): void {
    return;
  }

  recordRateLimit(_client: ClientId, _reason: RateLimitReason): void {
    return;
  }

  recordCacheAccess(_model: ModelAlias, _hit: boolean): void {
    return;
  }

  updateCacheHitRate(_model: ModelAlias, _rate: number): void {
    return;
  }

  setActiveStreams(_client: ClientId, _count: number): void {
    return;
  }

  setProviderHealth(_provider: ProviderInstanceId, _healthy: boolean): void {
    return;
  }

  setReadiness(_ready: boolean): void {
    return;
  }

  setComponentHealth(_component: HealthComponent, _status: HealthStatus): void {
    return;
  }

  setProcessUpTime(_seconds: number): void {
    return;
  }

  syncHealthMetrics(_snapshot: HealthMetricsSnapshot): void {
    return;
  }

  async getMetricsSnapshot(): Promise<string> {
    return Promise.resolve('');
  }

  async observeProviderCall<T>(
    _ctx: AppProviderCallContext,
    fn: () => Promise<T>,
    _mapUsage?: (result: T) => AppTokenUsage | undefined,
  ): Promise<T> {
    return fn();
  }

  observeProviderStream(_ctx: AppProviderCallContext): AppProviderStreamScope {
    return {
      end: () => {
        return;
      },
      fail: () => {
        return;
      },
    };
  }
}
