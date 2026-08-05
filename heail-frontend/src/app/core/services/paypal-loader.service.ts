import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare global {
  interface Window { paypal?: any; }
}

@Injectable({ providedIn: 'root' })
export class PaypalLoaderService {
  private loadPromise: Promise<any> | null = null;

  /** Loads the PayPal JS SDK once and resolves with the global `paypal` object. */
  load(): Promise<any> {
    if (window.paypal) return Promise.resolve(window.paypal);
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${environment.paypalClientId}&currency=USD`;
      script.onload = () => resolve(window.paypal);
      script.onerror = () => reject(new Error('Failed to load the PayPal SDK'));
      document.body.appendChild(script);
    });

    return this.loadPromise;
  }
}
