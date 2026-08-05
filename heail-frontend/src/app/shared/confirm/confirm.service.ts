import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button red instead of gold — use for destructive/irreversible actions. */
  danger?: boolean;
}

/**
 * App-wide replacement for window.confirm()/alert(). The browser's native
 * dialog looks like a piece of Chrome itself (its own icon, "This page says",
 * no site styling) — jarring against the rest of the product. Anywhere the
 * app needs a yes/no confirmation, it should go through this service instead,
 * which drives a single <app-confirm-modal> mounted once at the app root.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmOptions | null>(null);
  private resolver: ((result: boolean) => void) | null = null;

  ask(options: ConfirmOptions | string): Promise<boolean> {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    // If something is already open, resolve it as cancelled before replacing it.
    this.resolver?.(false);
    this.request.set(opts);
    return new Promise<boolean>(resolve => { this.resolver = resolve; });
  }

  resolve(result: boolean) {
    const r = this.resolver;
    this.resolver = null;
    this.request.set(null);
    r?.(result);
  }
}
