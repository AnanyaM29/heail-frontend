// Development defaults — used by `ng serve` and any build with the `development`
// configuration. Swapped for environment.prod.ts on `ng build` (production is the
// default configuration — see angular.json's fileReplacements).
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080'
  // razorpayKeyId used to live here, but it's not secret — the backend now
  // includes it in every order response (OrderResponse.razorpayKeyId), so the
  // frontend doesn't need a separately-configured copy to keep in sync.
};
