import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** sessionStorage key: the assessment URL the user has *just* re-authenticated
 *  for. Set by the login page, consumed once by assessmentEntryGuard. */
export const TEST_AUTH_KEY = 'heail_test_auth';

/** sessionStorage key: set when a candidate redeems their access-link token.
 *  Such a session is already a per-person, expiring credential, so it's exempt
 *  from the re-login gate below (and a candidate takes several pillars per
 *  sitting, so it must persist, not be one-shot). */
export const CANDIDATE_SESSION_KEY = 'heail_candidate_session';

/** Routes that require a fresh sign-in on entry, even if a session already exists. */
export const isAssessmentUrl = (url: string) => /^\/(pulse|leader|hr)\/assessment\//.test(url);

/** Clears the sessionStorage markers used by assessmentEntryGuard. */
export function clearTestAuthMarkers() {
  try { sessionStorage.removeItem(TEST_AUTH_KEY); } catch {}
  try { sessionStorage.removeItem(CANDIDATE_SESSION_KEY); } catch {}
}

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

/**
 * Gate for the assessment players. Entering a test is always a fresh-auth
 * boundary: any existing session is ended and the user is sent to /login,
 * unless they have *just* signed in for this exact test URL (a one-shot
 * marker the login page sets). Prevents a test being taken on a browser
 * someone else left signed in, and forces an explicit identity check
 * immediately before a timed assessment.
 */
const sessionStorageWorks = () => {
  try {
    sessionStorage.setItem('__heail_probe', '1');
    sessionStorage.removeItem('__heail_probe');
    return true;
  } catch { return false; }
};

export const assessmentEntryGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const read = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };

  // Safety valve: if sessionStorage is unusable we can't complete the
  // login→marker→enter round-trip, so don't trap a signed-in user in a loop.
  if (auth.isLoggedIn() && !sessionStorageWorks()) return true;

  // Candidate token sessions are already a fresh per-person identity check.
  if (auth.isLoggedIn() && read(CANDIDATE_SESSION_KEY) === '1') return true;

  // Password accounts: allowed only straight off a sign-in for this exact test URL.
  if (auth.isLoggedIn() && read(TEST_AUTH_KEY) === state.url) {
    try { sessionStorage.removeItem(TEST_AUTH_KEY); } catch {}
    return true;
  }

  // Anything else — including an already-signed-in session — ends here.
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
