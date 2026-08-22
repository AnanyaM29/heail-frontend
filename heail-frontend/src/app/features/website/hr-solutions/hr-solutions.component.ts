import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Marketing page for HR teams — copy only, no login/purchase flow.
 *  Buying assessments lives at /pricing/buy-hr (see app.routes.ts). */
@Component({ selector: 'app-hr-solutions', standalone: true, imports: [RouterLink], templateUrl: './hr-solutions.component.html' })
export class HrSolutionsComponent {
  scrollToPillars(e: Event) {
    e.preventDefault();
    document.getElementById('pillars')?.scrollIntoView({ behavior: 'smooth' });
  }
}
