import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.css'
})
export class CookieBannerComponent {
  visible = signal(!localStorage.getItem('heail_cookie'));

  choose(accept: boolean) {
    localStorage.setItem('heail_cookie', accept ? 'accepted' : 'rejected');
    this.visible.set(false);
  }
}
