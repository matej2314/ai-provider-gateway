import { createInProcessSingleflight } from './in-process-singleflight';

describe('createInProcessSingleflight', () => {
  it('shares one work() among concurrent callers of the same key', async () => {
    const run = createInProcessSingleflight<number>();
    let calls = 0;
    const work = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return 7;
    };

    const [a, b] = await Promise.all([run('k', work), run('k', work)]);
    expect(a).toBe(7);
    expect(b).toBe(7);
    expect(calls).toBe(1);
  });

  it('propagates failure to waiters and allows a later retry', async () => {
    const run = createInProcessSingleflight<number>();
    const boom = new Error('fail');
    await expect(
      Promise.all([
        run('k', () => Promise.reject(boom)),
        run('k', () => Promise.reject(boom)),
      ]),
    ).rejects.toThrow('fail');

    await expect(run('k', () => Promise.resolve(1))).resolves.toBe(1);
  });
});
