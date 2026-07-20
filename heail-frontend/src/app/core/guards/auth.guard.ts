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

export const leaderGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.role() === 'LEADER') return true;
  auth.routeByRole();
  return false;
};

export const employeeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.role() === 'EMPLOYEE') return true;
  auth.routeByRole();
  return false;
};

export const superadminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.role() === 'SUPERADMIN') return true;
  auth.routeByRole();
  return false;
};
