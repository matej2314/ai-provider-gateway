import { ActiveStreamsTracker } from './active-streams.tracker';
import { AppMetricsService } from './app-metrics.service';
import { asClientId } from '../../common/types/branded.types';

const TEST_CLIENT = asClientId('test-client');
const OTHER_CLIENT = asClientId('other-client');

describe('ActiveStreamsTracker', () => {
  let tracker: ActiveStreamsTracker;
  let mockAppMetrics: Partial<AppMetricsService>;

  beforeEach(() => {
    mockAppMetrics = {
      setActiveStreams: jest.fn(),
    };
    tracker = new ActiveStreamsTracker(mockAppMetrics as AppMetricsService);
  });

  it('should increment on start and decrement on completion', async () => {
    await tracker.trackStream(TEST_CLIENT, () => Promise.resolve('done'));

    expect(mockAppMetrics.setActiveStreams).toHaveBeenNthCalledWith(
      1,
      TEST_CLIENT,
      1,
    );
    expect(mockAppMetrics.setActiveStreams).toHaveBeenLastCalledWith(
      TEST_CLIENT,
      0,
    );
  });

  it('should decrement even when fn throws', async () => {
    await expect(
      tracker.trackStream(TEST_CLIENT, () =>
        Promise.reject(new Error('stream failed')),
      ),
    ).rejects.toThrow('stream failed');

    expect(mockAppMetrics.setActiveStreams).toHaveBeenNthCalledWith(
      1,
      TEST_CLIENT,
      1,
    );
    expect(mockAppMetrics.setActiveStreams).toHaveBeenLastCalledWith(
      TEST_CLIENT,
      0,
    );
  });

  it('should ref-count parallel streams for the same client', async () => {
    let releaseFirst!: () => void;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = tracker.trackStream(TEST_CLIENT, () => firstBlocked);
    expect(mockAppMetrics.setActiveStreams).toHaveBeenLastCalledWith(
      TEST_CLIENT,
      1,
    );

    const second = tracker.trackStream(TEST_CLIENT, () =>
      Promise.resolve('ok'),
    );
    expect(mockAppMetrics.setActiveStreams).toHaveBeenLastCalledWith(
      TEST_CLIENT,
      2,
    );

    await second;
    expect(mockAppMetrics.setActiveStreams).toHaveBeenLastCalledWith(
      TEST_CLIENT,
      1,
    );

    releaseFirst();
    await first;
    expect(mockAppMetrics.setActiveStreams).toHaveBeenLastCalledWith(
      TEST_CLIENT,
      0,
    );
  });

  it('should track stream counts independently per client', async () => {
    let releaseFirst!: () => void;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = tracker.trackStream(TEST_CLIENT, () => firstBlocked);
    await tracker.trackStream(OTHER_CLIENT, () => Promise.resolve('ok'));

    expect(mockAppMetrics.setActiveStreams).toHaveBeenCalledWith(
      TEST_CLIENT,
      1,
    );
    expect(mockAppMetrics.setActiveStreams).toHaveBeenCalledWith(
      OTHER_CLIENT,
      1,
    );
    expect(mockAppMetrics.setActiveStreams).toHaveBeenCalledWith(
      OTHER_CLIENT,
      0,
    );

    releaseFirst();
    await first;
    expect(mockAppMetrics.setActiveStreams).toHaveBeenLastCalledWith(
      TEST_CLIENT,
      0,
    );
  });
});
