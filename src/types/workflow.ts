export type WorkflowStep =
  | 'research'
  | 'brief'
  | 'outline'
  | 'writing'
  | 'finalize';

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
    id: 'brief',
    label: '2. Brief',
    shortLabel: 'Brief',
    description: 'Intention, audience, longue traîne',
  },
  {
    id: 'outline',
    label: '3. Plan',
    shortLabel: 'Plan',
    description: 'Structure H2/H3 et insertion',
  },
  {
    id: 'writing',
    label: '4. Rédaction',
    shortLabel: 'Rédac.',
    description: 'Rédaction assistée par IA',
  },
  {
    id: 'finalize',
    label: '5. Finaliser',
    shortLabel: 'Finaliser',
    description: 'SEO, liens, meta, export',
  },
];
