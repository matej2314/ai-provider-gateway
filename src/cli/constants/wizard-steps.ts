export const WIZARD_STEPS = [
  'master-key',
  'providers',
  'models',
  'clients',
  'server-config',
  'write-files',
  'complete',
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export const WIZARD_INIT_STEPS: WizardStep[] = [
  'master-key',
  'providers',
  'models',
  'clients',
  'server-config',
];

export const WizardStep = {
  MasterKey: 'master-key',
  Providers: 'providers',
  Models: 'models',
  Clients: 'clients',
  ServerConfig: 'server-config',
  WriteFiles: 'write-files',
  Complete: 'complete',
} as const satisfies Record<string, WizardStep>;
