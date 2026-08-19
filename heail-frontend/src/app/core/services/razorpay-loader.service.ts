import { Injectable } from '@angular/core';

declare global {
  interface Window { Razorpay?: any; }
}

@Injectable({ providedIn: 'root' })
export class RazorpayLoaderService {
  private loadPromise: Promise<any> | null = null;

  /** Loads the Razorpay Checkout.js SDK once and resolves with the global `Razorpay` constructor. */
  load(): Promise<any> {
    if (window.Razorpay) return Promise.resolve(window.Razorpay);
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => reject(new Error('Failed to load the Razorpay SDK'));
      document.body.appendChild(script);
    });

    return this.loadPromise;
  }
}
