jest.mock('uuid', () => ({
  v4: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));

jest.mock('../../../src/config/configuration', () =>
  jest.requireActual('./mock-configuration'),
);

const originalConsoleError = console.error;

function formatConsoleArg(arg: unknown): string {
  if (typeof arg === 'string') {
    return arg;
  }
  if (arg == null) {
    return '';
  }
  if (typeof arg === 'object') {
    return JSON.stringify(arg);
  }
  if (
    typeof arg === 'number' ||
    typeof arg === 'boolean' ||
    typeof arg === 'bigint'
  ) {
    return String(arg);
  }
  if (typeof arg === 'symbol') {
    return arg.description ?? arg.toString();
  }
  return '';
}

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const first = formatConsoleArg(args[0]);
    if (first.includes('Registered clients')) {
      return;
    }
    originalConsoleError(...args);
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});
