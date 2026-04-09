import type {
  WorkflowStep as SharedWorkflowStep,
  WorkflowStepConfig as SharedWorkflowStepConfig,
} from '@shared/core';
import { workflowSteps } from '@shared/core';

export type WorkflowStep = SharedWorkflowStep;
export type StepConfig = SharedWorkflowStepConfig;

export const WORKFLOW_STEPS: StepConfig[] = workflowSteps;
