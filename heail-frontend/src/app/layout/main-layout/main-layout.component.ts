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
    <app-nav />
    <main><router-outlet /></main>
    <app-footer />
    <app-cookie-banner />
  `
})
export class MainLayoutComponent {}
