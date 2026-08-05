// Production values — this file replaces environment.ts at build time for the
// `production` configuration (angular.json fileReplacements).
//
// apiBaseUrl is deliberately empty: in the Docker setup, nginx (see nginx.conf)
// reverse-proxies /api/ on the SAME origin through to the backend container, so
// the frontend never needs to know the backend's host/IP/domain — it just calls
// relative paths like /api/v1/auth/login. This also means no CORS is needed
// between frontend and backend in this deployment. Same trick works whether
// you're hitting the site by raw EC2 IP or later by a real domain — nothing
// here needs to change either way.
export const environment = {
  production: true,
  apiBaseUrl: '',
  // Public live/sandbox Client ID — safe to expose client-side, only the Secret is private.
  paypalClientId: 'PAYPAL_CLIENT_ID_PLACEHOLDER'
};
