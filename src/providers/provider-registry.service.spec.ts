import { Test, TestingModule } from '@nestjs/testing';
import { ProviderRegistryService } from './provider-registry.service';

describe('ProviderRegistryService', () => {
  let service: ProviderRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProviderRegistryService],
    }).compile();

    service = module.get<ProviderRegistryService>(ProviderRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
