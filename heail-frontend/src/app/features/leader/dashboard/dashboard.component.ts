import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AssessmentService } from '../../../core/services/assessment.service';
import { LeaderResult, SessionResumeResponse } from '../../../core/models/assessment.models';

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

  startAssessment() {
    this.starting.set(true);
    this.error.set('');
    this.noEntitlement.set(false);
    this.assessment.start().subscribe({
      next: res => this.router.navigate(['/leader/assessment', res.sessionId]),
      error: (e: any) => {
        this.starting.set(false);
        if (e?.status === 403) this.noEntitlement.set(true);
        else this.error.set(this.msg(e));
      }
    });
  }

  resumeAssessment() {
    const s = this.currentSession();
    if (s) this.router.navigate(['/leader/assessment', s.sessionId]);
  }

  domainLabel(code: string) {
    return DOMAIN_LABELS[code] ?? code;
  }

  private loadResults() {
    this.assessment.results().subscribe({
      next: r => { this.results.set(r); this.loading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
