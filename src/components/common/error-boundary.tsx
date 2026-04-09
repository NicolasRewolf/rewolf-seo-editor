'use client';

import React from 'react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[ui:error-boundary]', error.message);
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="bg-muted/30 border-border m-3 rounded-lg border p-6">
        <h2 className="text-foreground text-base font-semibold">
          {this.props.title ?? "L'éditeur a rencontré un problème"}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {this.props.description ??
            'Vous pouvez réessayer ou recharger la page sans perdre le reste de l’interface.'}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-md border px-3 text-sm"
            onClick={this.reset}
          >
            Réessayer
          </button>
          <button
            type="button"
            className="bg-foreground text-background hover:opacity-90 inline-flex h-8 items-center rounded-md px-3 text-sm"
            onClick={this.reload}
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }
}
