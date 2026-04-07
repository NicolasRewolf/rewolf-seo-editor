'use client';

import { Button } from '@/components/ui/button';
import { WORKFLOW_STEPS, type WorkflowStep } from '@/types/workflow';

type WorkflowStepperProps = {
  current: WorkflowStep;
  onChange: (step: WorkflowStep) => void;
};

export function WorkflowStepper({ current, onChange }: WorkflowStepperProps) {
  return (
    <div className="border-border bg-muted/20 shrink-0 border-b px-2 py-2">
      <div className="flex flex-wrap gap-1">
        {WORKFLOW_STEPS.map((s, i) => (
          <Button
            key={s.id}
            type="button"
            variant={current === s.id ? 'default' : 'ghost'}
            size="sm"
            className="h-8 max-w-full shrink-0 px-2 text-xs"
            onClick={() => onChange(s.id)}
            title={s.description}
          >
            <span className="hidden sm:inline">{s.label}</span>
            <span className="sm:hidden">
              {i + 1}. {s.shortLabel}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
