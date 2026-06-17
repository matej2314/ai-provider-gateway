jest.mock('uuid', () => ({
  v4: jest.fn(() => 'e2e-test-uuid'),
}));

jest.mock('../../../src/config/configuration', () =>
  jest.requireActual('./mock-configuration'),
);

const originalConsoleError = console.error;

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const first = String(args[0] ?? '');
    if (first.includes('Registered clients')) {
      return;
    }
    originalConsoleError(...args);
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});
