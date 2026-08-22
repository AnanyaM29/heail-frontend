import { Component, HostListener, signal, inject, computed, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SearchService, SearchResult } from '../../core/services/search.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent implements AfterViewChecked {
  auth = inject(AuthService);
  private router = inject(Router);
  private searchSvc = inject(SearchService);

  menuOpen = signal(false);
  firstName = computed(() => this.auth.user()?.name?.split(' ')[0] ?? '');

  searchOpen = signal(false);
  searchQuery = signal('');
  searchResults = computed(() => this.searchSvc.search(this.searchQuery()));

  @ViewChild('searchInput') searchInputEl?: ElementRef<HTMLInputElement>;
  private focusPending = false;

  toggleMenu() { this.menuOpen.update(v => !v); }
  closeMenu() { this.menuOpen.set(false); }

  /** The Solutions/user-menu dropdowns are pure CSS (:hover, plus :focus-within
   *  so keyboard users can open them without a mouse). Clicking the trigger or
   *  any link inside leaves that element focused, and :focus-within doesn't
   *  care that the mouse has since left — so without this, the dropdown stays
   *  open until something else on the page steals focus. Blurring on click
   *  hands control back to :hover alone once the click's done its job. */
  blurActive() {
    (document.activeElement as HTMLElement)?.blur();
  }

  logout() { this.closeMenu(); this.auth.logout(); }

  toggleSearch(e: Event) {
    e.stopPropagation();
    const opening = !this.searchOpen();
    this.searchOpen.set(opening);
    if (opening) { this.focusPending = true; }
    else { this.searchQuery.set(''); }
  }

  closeSearch() {
    this.searchOpen.set(false);
    this.searchQuery.set('');
  }

  goToResult(r: SearchResult) {
    this.closeSearch();
    this.closeMenu();
    this.router.navigate([r.route], r.fragment ? { fragment: r.fragment } : {});
  }

  ngAfterViewChecked() {
    if (this.focusPending && this.searchInputEl) {
      this.focusPending = false;
      this.searchInputEl.nativeElement.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const t = e.target as HTMLElement;
    if (!t.closest('nav')) { this.menuOpen.set(false); this.closeSearch(); }
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.closeSearch(); }
}
