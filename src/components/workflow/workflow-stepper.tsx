'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ArticleBrief } from '@/types/article';
import { WORKFLOW_STEPS, type WorkflowStep } from '@/types/workflow';

type WorkflowStepperProps = {
  current: WorkflowStep;
  onChange: (step: WorkflowStep) => void;
  brief?: ArticleBrief;
};

function briefBlocksPlan(brief: ArticleBrief | undefined): boolean {
  if (!brief) return true;
  return !brief.focusKeyword.trim() || !brief.searchIntent;
}

export function WorkflowStepper({
  current,
  onChange,
  brief,
}: WorkflowStepperProps) {
  const blocked = briefBlocksPlan(brief);

  return (
    <div className="border-border bg-muted/20 shrink-0 border-b px-2 py-2">
      <div className="flex flex-wrap gap-1">
        {WORKFLOW_STEPS.map((s, i) => {
          const isPlanOrLater = i >= 2;
          const warn = blocked && isPlanOrLater;
          return (
            <Button
              key={s.id}
              type="button"
              variant={current === s.id ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 max-w-full shrink-0 px-2 text-xs',
                warn && 'opacity-60'
              )}
              onClick={() => onChange(s.id)}
              title={s.description}
            >
              <span className="hidden sm:inline">
                {s.label}
                {warn ? (
                  <span
                    className="bg-destructive ml-1 inline-block size-1.5 rounded-full align-middle"
                    aria-hidden
                  />
                ) : null}
              </span>
              <span className="sm:hidden">
                {i + 1}. {s.shortLabel}
                {warn ? (
                  <span
                    className="bg-destructive ml-0.5 inline-block size-1.5 rounded-full align-middle"
                    aria-hidden
                  />
                ) : null}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
