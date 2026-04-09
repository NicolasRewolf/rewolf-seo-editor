import { z } from 'zod';

export const workflowStepSchema = z.enum([
  'research',
  'brief',
  'outline',
  'writing',
  'finalize',
]);

export const workflowStepConfigSchema = z.object({
  id: workflowStepSchema,
  label: z.string(),
  shortLabel: z.string(),
  description: z.string(),
});

export const workflowStepsSchema = z.array(workflowStepConfigSchema).min(1);

export const workflowStateSchema = z.object({
  current: workflowStepSchema,
});

export const workflowTransitionSchema = z.object({
  from: workflowStepSchema,
  to: workflowStepSchema,
});

export const workflowSteps = workflowStepsSchema.parse([
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
]);

export type WorkflowStep = z.infer<typeof workflowStepSchema>;
export type WorkflowStepConfig = z.infer<typeof workflowStepConfigSchema>;
export type WorkflowState = z.infer<typeof workflowStateSchema>;
export type WorkflowTransition = z.infer<typeof workflowTransitionSchema>;
