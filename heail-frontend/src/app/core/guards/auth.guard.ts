import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** sessionStorage key: a specific assessment URL the user has *just* signed in
 *  for. One-shot — set by the login page, consumed once by assessmentEntryGuard. */
export const TEST_AUTH_KEY = 'heail_test_auth';

/** sessionStorage key: set on any sign-in whose destination is a test area
 *  (and on candidate token redemption). Marks this browser session as having
 *  completed a fresh identity check, so the assessment players can be entered
 *  without bouncing back to /login again. Persists for the session (a pulse
 *  round is several sittings); cleared on logout and on a forced re-login. */
export const FRESH_AUTH_KEY = 'heail_fresh_auth';

/** True for the assessment player routes — entry always needs a fresh sign-in. */
export const isAssessmentUrl = (url: string) => /^\/(pulse|leader|hr)\/assessment\//.test(url);

/** True for any test-facing destination a "sign in and take your test" email
 *  link would point at (the pulse/leader dashboards, HR assessment list, a
 *  candidate link, or a player URL). */
export const isTestDestination = (url: string) => /^\/(pulse|leader|hr)(\/|$|\?)/.test(url);

/** Clears the sessionStorage markers used by assessmentEntryGuard. */
export function clearTestAuthMarkers() {
  try { sessionStorage.removeItem(TEST_AUTH_KEY); } catch {}
  try { sessionStorage.removeItem(FRESH_AUTH_KEY); } catch {}
}

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  // Carry the attempted URL through login so a test link clicked while logged
  // out lands the user ON the test after signing in, not on the dashboard.
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * `/login` is normally hidden from a signed-in user. But an assessment email
 * links here with `?force=1` — that always ends the current session so the
 * person must re-authenticate before continuing to their test, even if they
 * were already logged in.
 */
export const guestGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  if (route.queryParamMap.get('force') === '1') {
    auth.clearSession();
    clearTestAuthMarkers();
    return true;
  }
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

const sessionStorageWorks = () => {
  try {
    sessionStorage.setItem('__heail_probe', '1');
    sessionStorage.removeItem('__heail_probe');
    return true;
  } catch { return false; }
};

/**
 * Gate for the assessment players. Entering a test requires a sign-in that
 * happened in this browser session — either for this exact test URL (one-shot)
 * or a session-wide fresh-auth marker set when the user logged in on the way
 * to a test area (see login.component / candidate-landing). Anything else,
 * including a session that was simply left signed in, is ended here and sent
 * to /login. Combined with the `?force=1` email links, this makes every test
 * entry from an email go through a fresh login first.
 */
export const assessmentEntryGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const read = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };

  // Safety valve: if sessionStorage is unusable we can't complete the
  // login→marker→enter round-trip, so don't trap a signed-in user in a loop.
  if (auth.isLoggedIn() && !sessionStorageWorks()) return true;

  if (auth.isLoggedIn() && read(FRESH_AUTH_KEY) === '1') return true;

  if (auth.isLoggedIn() && read(TEST_AUTH_KEY) === state.url) {
    try { sessionStorage.removeItem(TEST_AUTH_KEY); } catch {}
    return true;
  }

  auth.clearSession();
  clearTestAuthMarkers();
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const superadminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.role() === 'SUPERADMIN') return true;
  auth.routeByRole();
  return false;
};
