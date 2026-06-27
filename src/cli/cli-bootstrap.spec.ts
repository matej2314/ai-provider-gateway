jest.mock('boxen', () => ({
  __esModule: true,
  default: jest.fn((text: string) => text),
}));

describe('CliModule bootstrap', () => {
  it('should load wizard-state schema without circular import', () => {
    expect(() => {
      require('./schemas/wizard-state.schema');
      require('./services/wizard-state-manager.service');
    }).not.toThrow();
  });

  it('should load CliModule without Zod enum crash', () => {
    expect(() => {
      require('./cli.module');
    }).not.toThrow();
  });
});
