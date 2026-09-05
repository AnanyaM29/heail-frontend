import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  // Carry the attempted URL through login so a test link clicked while logged
  // out lands the user ON the test after signing in, not on the dashboard.
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  auth.routeByRole();
  return false;
};

// TEMPORARY — these used to strictly require role() === 'LEADER'/'EMPLOYEE'.
// Since a single account's stored role no longer implies it's the *only*
// thing that account does (an org admin can also be a respondent, etc.),
// these now just require login, mirroring the backend's @PreAuthorize
// loosening to isAuthenticated() on the equivalent controllers. Real
// per-product entitlement checks (does this account actually have a Leader
// purchase / a pulse invitation?) are enforced by the API calls each page
// makes, not by the route guard.
export const leaderGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  const router = inject(Router);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const employeeGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  const router = inject(Router);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const superadminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.role() === 'SUPERADMIN') return true;
  auth.routeByRole();
  return false;
};
