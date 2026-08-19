import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { ConfirmService } from '../../shared/confirm/confirm.service';

export interface ExitConfirmable {
  isTestInProgress(): boolean;
}

/**
 * Guards the pulse/leader assessment player routes. While a test is active
 * (past directions, before a successful submit), any attempt to navigate
 * away in-app — back button, a route change — must be confirmed first. Does
 * NOT cover an actual tab close/refresh; that's the window 'beforeunload'
 * listener each player component registers separately, since Angular route
 * guards never run for those.
 */
export const testExitGuard: CanDeactivateFn<ExitConfirmable> = (component) => {
  if (!component.isTestInProgress()) return true;
  const confirm = inject(ConfirmService);
  return confirm.ask({
    title: 'Leave this assessment?',
    message: 'Please confirm the exit from the page. Your progress is saved — you can restart by logging in again later.',
    confirmLabel: 'Exit',
    cancelLabel: 'Stay',
    danger: true
  });
};
