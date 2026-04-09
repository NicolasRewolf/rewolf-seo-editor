import type {
  WorkflowStep as SharedWorkflowStep,
  WorkflowStepConfig as SharedWorkflowStepConfig,
} from '../../shared/contracts';
import { workflowSteps } from '../../shared/contracts';

export type WorkflowStep = SharedWorkflowStep;
export type StepConfig = SharedWorkflowStepConfig;

export const WORKFLOW_STEPS: StepConfig[] = workflowSteps;
