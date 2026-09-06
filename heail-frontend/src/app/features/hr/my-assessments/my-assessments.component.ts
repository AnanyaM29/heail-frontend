import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HrAssessmentService } from '../../../core/services/hr-assessment.service';
import { HrAssessment, HrResult } from '../../../core/models/hr.models';
import { FRESH_AUTH_KEY } from '../../../core/guards/auth.guard';

interface AssessmentCard {
  assessment: HrAssessment;
  completed: boolean;
  sessionId: string | null; // set if there's an in-progress session to resume
}

/** Where a candidate lands right after redeeming their access-link token
 *  (see candidate-landing.component.ts). Shows only the pillar(s) they were
 *  actually assigned — never the full 7-pillar "buy more" catalogue
 *  hr-select.component.ts shows to buyers — and never a score, per the
 *  Candidate Terms (results go to the buyer only). */
@Component({
  selector: 'app-my-assessments',
  standalone: true,
  templateUrl: './my-assessments.component.html',
  styleUrl: './my-assessments.component.css'
})
export class MyAssessmentsComponent implements OnInit {
  private hrAssessments = inject(HrAssessmentService);
  private router = inject(Router);

  loading = signal(true);
  error = signal('');
  cards = signal<AssessmentCard[]>([]);
  starting = signal<number | null>(null);

  ngOnInit() {
    forkJoin({
      assessments: this.hrAssessments.assessments(),
      results: this.hrAssessments.results()
    }).subscribe({
      next: ({ assessments, results }) => {
        const completedIds = new Set(results.map(r => r.assessmentId));
        const visible = assessments.filter(a => a.entitled || completedIds.has(a.id));

        if (visible.length === 0) {
          this.cards.set([]);
          this.loading.set(false);
          return;
        }

        // Only the not-yet-completed, entitled ones might have an in-progress
        // session worth resuming — no point checking the rest.
        const toCheck = visible.filter(a => a.entitled && !completedIds.has(a.id));
        if (toCheck.length === 0) {
          this.cards.set(visible.map(a => ({ assessment: a, completed: completedIds.has(a.id), sessionId: null })));
          this.loading.set(false);
          return;
        }

        forkJoin(toCheck.map(a => this.hrAssessments.current(a.id))).subscribe({
          next: currents => {
            const sessionByAssessment = new Map<number, string | null>();
            toCheck.forEach((a, i) => sessionByAssessment.set(a.id, currents[i]?.sessionId ?? null));
            this.cards.set(visible.map(a => ({
              assessment: a,
              completed: completedIds.has(a.id),
              sessionId: sessionByAssessment.get(a.id) ?? null
            })));
            this.loading.set(false);
          },
          error: () => {
            // Resume-check failing shouldn't block showing the list — worst case
            // "Start" is offered where "Resume" would've been more accurate.
            this.cards.set(visible.map(a => ({ assessment: a, completed: completedIds.has(a.id), sessionId: null })));
            this.loading.set(false);
          }
        });
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  go(card: AssessmentCard) {
    if (card.completed || this.starting() !== null) return;

    // The signed-in candidate is on the page they were sent to take their test —
    // entering the player must not detour through /login. (redeem() sets this on
    // token redemption too; re-set here so a back-nav or refresh still works.)
    try { sessionStorage.setItem(FRESH_AUTH_KEY, '1'); } catch {}

    if (card.sessionId) {
      this.router.navigate(['/hr/assessment', card.sessionId]);
      return;
    }

    this.starting.set(card.assessment.id);
    this.hrAssessments.start(card.assessment.id).subscribe({
      next: res => this.router.navigate(['/hr/assessment', res.sessionId]),
      error: (e: any) => { this.starting.set(null); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
