import { parseWizardState } from './wizard-state.schema';
import { WizardStep } from '../constants/wizard-steps';

describe('parseWizardState', () => {
  it('parses valid state', () => {
    const raw = {
      sessionId: 'test',
      startedAt: new Date().toISOString(),
      currentStep: WizardStep.MasterKey,
      completedSteps: [],
      data: {},
      files: { created: [], backedUp: [] },
    };
    expect(parseWizardState(raw)).not.toBeNull();
  });

  it('returns null for invalid currentStep', () => {
    expect(
      parseWizardState({
        sessionId: 'x',
        startedAt: 'x',
        currentStep: 'invalid',
        completedSteps: [],
        data: {},
        files: { created: [], backedUp: [] },
      }),
    ).toBeNull();
  });
});
