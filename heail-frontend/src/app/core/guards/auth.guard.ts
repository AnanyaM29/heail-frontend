import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
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
export const leaderGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  const router = inject(Router);
  return router.createUrlTree(['/login']);
};

export const employeeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  const router = inject(Router);
  return router.createUrlTree(['/login']);
};

export const superadminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.role() === 'SUPERADMIN') return true;
  auth.routeByRole();
  return false;
};
