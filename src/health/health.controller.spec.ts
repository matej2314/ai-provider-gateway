import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthService: Partial<HealthService>;

  beforeEach(async () => {
    mockHealthService = {
      getLiveness: jest.fn().mockReturnValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
      }),
      getReadiness: jest.fn().mockResolvedValue({
        status: 'ready',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        checks: {
          config: { status: 'healthy', message: 'Config loaded' },
          cache: { status: 'healthy', message: 'Cache noop' },
        },
      }),
    };

    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getLiveness', () => {
    it('should return liveness status', () => {
      const result = controller.getLiveness();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
    });

    it('should call healthService.getLiveness', () => {
      controller.getLiveness();

      expect(mockHealthService.getLiveness).toHaveBeenCalled();
    });
  });

  describe('getReadiness', () => {
    it('should return readiness status', async () => {
      const result = await controller.getReadiness();

      expect(result.status).toBe('ready');
      expect(result.checks).toBeDefined();
    });

    it('should call healthService.getReadiness', async () => {
      await controller.getReadiness();

      expect(mockHealthService.getReadiness).toHaveBeenCalled();
    });

    it('should include checks in response', async () => {
      const result = await controller.getReadiness();

      expect(result.checks.config).toBeDefined();
      expect(result.checks.cache).toBeDefined();
    });
  });
});
