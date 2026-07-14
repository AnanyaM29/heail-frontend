import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-heail-logo',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a class="logo" routerLink="/">
      <span class="logo-name">HEAIL</span>
      <span class="logo-tag">Human Experience + AI Logic</span>
    </a>
  `,
  styles: [`
    .logo { display: flex; flex-direction: column; gap: 2px; text-decoration: none; }
    .logo-name {
      font-family: var(--disp); color: var(--ivory); font-size: 32px;
      letter-spacing: .2em; font-weight: 700; line-height: 1;
    }
    .logo-tag {
      font-size: 9px; letter-spacing: .22em; color: var(--gold);
      text-transform: uppercase; font-weight: 600; font-family: var(--body);
    }
  `]
})
export class HeailLogoComponent {}
