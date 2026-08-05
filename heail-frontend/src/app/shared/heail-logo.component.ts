import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-heail-logo',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a class="logo" routerLink="/">
      <img src="/heail-logo.png" alt="HEAIL" class="logo-img">
      <span class="logo-tag">Human Experience + AI Logic</span>
    </a>
  `,
  styles: [`
    .logo { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-decoration: none; }
    .logo-img { height: 140px; width: auto; }
    .logo-tag {
      font-size: 9px; letter-spacing: .22em; color: var(--gold);
      text-transform: uppercase; font-weight: 600; font-family: var(--body);
    }
  `]
})
export class HeailLogoComponent {}
