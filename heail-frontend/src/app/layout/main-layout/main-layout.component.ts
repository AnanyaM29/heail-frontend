import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from '../nav/nav.component';
import { FooterComponent } from '../footer/footer.component';
import { CookieBannerComponent } from '../cookie-banner/cookie-banner.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavComponent, FooterComponent, CookieBannerComponent],
  template: `
    <div class="layout-shell">
      <app-nav />
      <main><router-outlet /></main>
      <app-footer />
    </div>
    <app-cookie-banner />
  `,
  styles: [`
    .layout-shell { display: flex; flex-direction: column; min-height: 100vh; }
    main { flex: 1 1 auto; }
  `]
})
export class MainLayoutComponent {}
