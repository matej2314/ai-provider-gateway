import { KeyGeneratorService } from './key-generator.service';
import type { GatewayKey } from '../../common/types/branded.types';

describe('KeyGeneratorService', () => {
  let service: KeyGeneratorService;

  beforeEach(() => {
    service = new KeyGeneratorService();
  });

  it('generateMasterKey should return gw_mk_ prefix and sufficient length', () => {
    const key: GatewayKey = service.generateMasterKey();

    expect(key).toMatch(/^gw_mk_[A-Za-z0-9_-]{20,}$/);
  });

  it('generateGatewayClientKey should slugify clientId in prefix', () => {
    const key: GatewayKey = service.generateGatewayClientKey('my-ide-client');

    expect(key).toMatch(/^gw_my_ide_client_/);
  });

  it('should generate unique keys on consecutive calls', () => {
    const first: GatewayKey = service.generateMasterKey();
    const second: GatewayKey = service.generateMasterKey();

    expect(first).not.toBe(second);
  });

  it('generateGatewayClientKey should trim clientId before slugifying', () => {
    const key: GatewayKey = service.generateGatewayClientKey('  my-client  ');

    expect(key).toMatch(/^gw_my_client_/);
  });
});
