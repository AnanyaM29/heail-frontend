import { Component, HostListener, signal, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent {
  auth = inject(AuthService);
  menuOpen = signal(false);
  firstName = computed(() => this.auth.user()?.name?.split(' ')[0] ?? '');

  toggleMenu() { this.menuOpen.update(v => !v); }
  closeMenu() { this.menuOpen.set(false); }

  logout() { this.closeMenu(); this.auth.logout(); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const t = e.target as HTMLElement;
    if (!t.closest('nav')) this.menuOpen.set(false);
  }
}
