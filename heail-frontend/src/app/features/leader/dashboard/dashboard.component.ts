import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AssessmentService } from '../../../core/services/assessment.service';
import { LeaderResult, SessionResumeResponse } from '../../../core/models/assessment.models';
import { FRESH_AUTH_KEY } from '../../../core/guards/auth.guard';

const DOMAIN_LABELS: Record<string, string> = {
  I: 'Leadership & Vision',
  II: 'Decision-Making & Strategy',
  III: 'Team Management & Culture',
  IV: 'Personal Mastery & EQ',
  V: 'Ethics, Purpose & Resilience'
};

@Component({
  selector: 'app-leader-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class LeaderDashboardComponent implements OnInit {
  private assessment = inject(AssessmentService);
  private router = inject(Router);

  loading = signal(true);
  starting = signal(false);
  error = signal('');
  noEntitlement = signal(false);
  entitled = signal(false);
  entitlementChecked = signal(false);

  currentSession = signal<SessionResumeResponse | null>(null);
  results = signal<LeaderResult[]>([]);

  latest = computed(() => this.results()[0] ?? null);
  domainEntries = computed(() => {
    const r = this.latest();
    return r ? Object.entries(r.domainScores) : [];
  });

  ngOnInit() {
    this.assessment.current().subscribe({
      next: session => { this.currentSession.set(session); this.loadResults(); },
      error: () => this.loadResults()
    });
  }

  /** No toolbar/location/menu bar — a stripped-down popup window instead of a
   *  normal tab, so there's no address bar to navigate away in and no tab
   *  strip to switch out of. Sized to fill the screen so it reads as a
   *  dedicated window rather than a small floating box. */
  private static readonly LOCKDOWN_FEATURES =
    `toolbar=no,location=no,menubar=no,status=no,directories=no,resizable=no,scrollbars=yes,` +
    `width=${screen.availWidth},height=${screen.availHeight},left=0,top=0`;

  startAssessment() {
    this.starting.set(true);
    this.error.set('');
    this.noEntitlement.set(false);
    // This is an in-app start by an already-signed-in user — mark the session as
    // fresh-authed BEFORE opening the popup so it inherits the marker (sessionStorage
    // is cloned into the new window at open time) and assessmentEntryGuard lets it
    // straight in instead of bouncing to /login. Email links still force re-login
    // via /take-test/:dest → forceTestLoginGuard, which clears this marker.
    this.markFreshAuth();
    // Opens in a locked-down window on purpose — separate from the browsable
    // main site (see testExitGuard/beforeunload in AssessmentPlayerComponent).
    // Must call window.open() synchronously, inside this click handler, or
    // browsers block it as an unrequested popup — the target URL isn't known
    // yet, so open blank and redirect it once the session-start call comes back.
    const testWindow = window.open('', '_blank', LeaderDashboardComponent.LOCKDOWN_FEATURES);
    this.assessment.start().subscribe({
      next: res => {
        this.starting.set(false);
        const url = this.router.createUrlTree(['/leader/assessment', res.sessionId]).toString();
        if (testWindow) testWindow.location.href = url; else window.open(url, '_blank', LeaderDashboardComponent.LOCKDOWN_FEATURES);
      },
      error: (e: any) => {
        this.starting.set(false);
        testWindow?.close();
        if (e?.status === 403) this.noEntitlement.set(true);
        else this.error.set(this.msg(e));
      }
    });
  }

  resumeAssessment() {
    const s = this.currentSession();
    if (!s) return;
    this.markFreshAuth();
    const url = this.router.createUrlTree(['/leader/assessment', s.sessionId]).toString();
    window.open(url, '_blank', LeaderDashboardComponent.LOCKDOWN_FEATURES);
  }

  /** In-app test launches happen for a user who is already signed in on this
   *  page, so entering the player must not bounce through /login. Setting this
   *  synchronously — before any window.open — means a popup opened right after
   *  inherits it in its cloned sessionStorage. */
  private markFreshAuth() {
    try { sessionStorage.setItem(FRESH_AUTH_KEY, '1'); } catch {}
  }

  domainLabel(code: string) {
    return DOMAIN_LABELS[code] ?? code;
  }

  private loadResults() {
    this.assessment.results().subscribe({
      next: r => {
        this.results.set(r);
        this.loading.set(false);
        // Only relevant before a first sitting: if the account holds an unused
        // entitlement and has no in-progress session, the "no results yet" view
        // offers "Start Assessment". There is no retake once a result exists.
        if (!this.currentSession()) this.checkEntitlement();
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  private checkEntitlement() {
    this.assessment.entitlement().subscribe({
      next: res => { this.entitled.set(res.entitled); this.entitlementChecked.set(true); },
      error: () => { this.entitled.set(false); this.entitlementChecked.set(true); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
