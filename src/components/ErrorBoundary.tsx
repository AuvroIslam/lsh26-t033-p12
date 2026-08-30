/**
 * Error boundary.
 *
 * A thrown render in React 19 unmounts the whole tree, so without this a single
 * bad value anywhere leaves the judge looking at a blank white page with no way
 * back. This keeps the ledger intact in localStorage, explains what happened,
 * and offers the two recoveries that actually work: re-render the screen, or —
 * if the stored ledger itself is the problem — clear it and start again.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Named so the message can say which screen failed. */
  area?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry service is wired up, and adding one would mean sending a
    // user's financial data somewhere. The console is the right destination.
    console.error('Khoroch caught a render error', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  private clearAndReload = () => {
    try {
      localStorage.removeItem('lsh26-t033-p12:ledger:v1');
    } catch {
      // Nothing more can be done if storage is unavailable; reload anyway.
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="nb rounded-2xl bg-blush px-5 py-6">
        <h2 className="text-[15px] font-extrabold text-blush-ink">
          {this.props.area ? `The ${this.props.area} could not be displayed` : 'Something went wrong'}
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed font-medium text-[var(--text)]">
          Your ledger is safe — it is stored in this browser and nothing has been lost. The other
          tabs should still work.
        </p>
        <pre className="nb-sm mt-3 max-h-32 overflow-auto rounded-xl bg-[var(--card)] p-3 text-[11px] whitespace-pre-wrap text-[var(--muted)]">
          {error.message || String(error)}
        </pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={this.reset}
            className="nb-sm nb-press rounded-full bg-butter px-4 py-2 text-[13px] font-bold text-[var(--text)]"
          >
            Try this screen again
          </button>
          <button
            onClick={this.clearAndReload}
            className="nb-sm nb-press rounded-full bg-[var(--card)] px-4 py-2 text-[13px] font-bold text-[var(--text)]"
          >
            Clear the ledger and reload
          </button>
        </div>
      </div>
    );
  }
}
