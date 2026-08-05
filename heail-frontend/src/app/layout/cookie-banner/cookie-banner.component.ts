import { Component, signal, effect } from '@angular/core';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.css'
})
export class CookieBannerComponent {
  visible = signal(!localStorage.getItem('heail_cookie'));

  constructor() {
    // Reserve space at the bottom of the page while the fixed banner is showing,
    // so it doesn't sit on top of (and hide) the footer underneath it.
    effect(() => {
      document.body.classList.toggle('cookie-banner-open', this.visible());
    });
  }

  choose(accept: boolean) {
    localStorage.setItem('heail_cookie', accept ? 'accepted' : 'rejected');
    this.visible.set(false);
  }
}
