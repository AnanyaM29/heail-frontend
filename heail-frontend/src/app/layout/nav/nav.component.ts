import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent {
  menuOpen = signal(false);

  toggleMenu() { this.menuOpen.update(v => !v); }
  closeMenu() { this.menuOpen.set(false); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const t = e.target as HTMLElement;
    if (!t.closest('nav')) this.menuOpen.set(false);
  }
}
