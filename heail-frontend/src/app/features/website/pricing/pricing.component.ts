import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-pricing', standalone: true, imports: [RouterLink], templateUrl: './pricing.component.html' })
export class PricingComponent {
  comingSoonNotice = signal('');

  scrollToHr(e: Event) {
    e.preventDefault();
    document.getElementById('hrPricing')?.scrollIntoView({ behavior: 'smooth' });
  }

  notifyComingSoon(feature: string) {
    this.comingSoonNotice.set(feature);
  }
}
