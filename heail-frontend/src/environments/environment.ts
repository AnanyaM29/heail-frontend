// Development defaults — used by `ng serve` and any build with the `development`
// configuration. Swapped for environment.prod.ts on `ng build` (production is the
// default configuration — see angular.json's fileReplacements).
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  // Public sandbox Client ID — safe to expose client-side, only the Secret is private.
  paypalClientId: 'PAYPAL_SANDBOX_CLIENT_ID_PLACEHOLDER'
};
