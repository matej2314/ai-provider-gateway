/**
 * Compile-time brand type checks for GatewayKey (Faza 1.6).
 * Not executed by Jest — verified via `npm run build` / `tsc --noEmit`.
 */
import type { GatewayKey } from '../common/types';
import type { GatewayKeyRuntimeConfig } from '../config/configuration.types';

function acceptGatewayKey(_key: GatewayKey): void {}

function acceptAllowList(_keys: GatewayKey[]): void {}

// @ts-expect-error plain string must not be assignable to GatewayKey parameter
acceptGatewayKey('gw_plain_string');

// @ts-expect-error allowList must contain branded GatewayKey values
acceptAllowList(['gw_plain_string']);

const _badRuntimeConfig: Pick<GatewayKeyRuntimeConfig, 'allowList'> = {
  allowList: [
    // @ts-expect-error allowList entries must be branded GatewayKey values
    'gw_not_branded',
  ],
};
