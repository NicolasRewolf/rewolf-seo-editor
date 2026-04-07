export type WorkflowStep = 'research' | 'outline' | 'writing' | 'finalize';

export type StepConfig = {
  id: WorkflowStep;
  label: string;
  shortLabel: string;
  description: string;
};

export const WORKFLOW_STEPS: StepConfig[] = [
  {
    id: 'research',
    label: '1. Data',
    shortLabel: 'Data',
    description: 'Sources, SERP, extraction URL',
  },
  {
    id: 'outline',
    label: '2. Plan',
    shortLabel: 'Plan',
    description: 'Structure H2/H3 et insertion',
  },
  {
    id: 'writing',
    label: '3. Rédaction',
    shortLabel: 'Rédac.',
    description: 'Rédaction assistée par IA',
  },
  {
    id: 'finalize',
    label: '4. Finaliser',
    shortLabel: 'Finaliser',
    description: 'SEO, liens, meta, export',
  },
];
