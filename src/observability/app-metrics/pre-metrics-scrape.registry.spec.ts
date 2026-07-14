import { PreMetricsScrapeRegistry } from './pre-metrics-scrape.registry';

describe('PreMetricsScrapeRegistry', () => {
  let registry: PreMetricsScrapeRegistry;

  beforeEach(() => {
    registry = new PreMetricsScrapeRegistry();
  });

  it('should run a registered hook', async () => {
    const hook = jest.fn().mockResolvedValue(undefined);
    registry.register(hook);

    await registry.runAll();

    expect(hook).toHaveBeenCalledTimes(1);
  });

  it('should do nothing when no hook is registered', async () => {
    await expect(registry.runAll()).resolves.toBeUndefined();
  });

  it('should replace the hook on re-register', async () => {
    const first = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);

    registry.register(first);
    registry.register(second);

    await registry.runAll();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
