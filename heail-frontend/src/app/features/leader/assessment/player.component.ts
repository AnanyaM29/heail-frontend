import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AssessmentService } from '../../../core/services/assessment.service';
import { Question } from '../../../core/models/assessment.models';

// Directions are shown once before a respondent's first-ever attempt at this
// assessment — not repeated on retakes. Keyed by a flag in localStorage.
const DIRECTIONS_SEEN_KEY = 'heail_leader_directions_seen';

@Component({
  selector: 'app-assessment-player',
  standalone: true,
  imports: [],
  templateUrl: './player.component.html',
  styleUrl: './player.component.css'
})
export class AssessmentPlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private assessment = inject(AssessmentService);

  sessionId = this.route.snapshot.paramMap.get('sessionId')!;

  loading = signal(true);
  error = signal('');
  submitting = signal(false);

  questions = signal<Question[]>([]);
  answers = signal<Record<string, string>>({});
  index = signal(0);

  showDirections = signal(!localStorage.getItem(DIRECTIONS_SEEN_KEY));

  deadlineAt = signal<string | null>(null);
  secondsLeft = signal<number | null>(null);
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private autoSubmitted = false;

  /** True once the test is actually live (past directions, questions loaded) until a
   *  successful submit — drives both testExitGuard and the beforeunload prompt. */
  private testActive = false;
  private beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    if (!this.testActive) return;
    e.preventDefault();
    e.returnValue = '';
  };

  current = computed(() => this.questions()[this.index()] ?? null);
  /** Distinct question ids — answers are keyed by id, so if the session ever
   *  carries a repeated id, counting raw slots would make "all answered" never
   *  true and Submit would silently no-op. */
  total = computed(() => new Set(this.questions().map(q => q.questionId)).size);
  answeredCount = computed(() => Object.keys(this.answers()).length);
  progressPct = computed(() => this.total() ? Math.round((this.answeredCount() / this.total()) * 100) : 0);
  isLast = computed(() => this.index() === this.questions().length - 1);
  currentSelected = computed(() => {
    const q = this.current();
    return q ? this.answers()[q.questionId] ?? null : null;
  });
  timeLabel = computed(() => {
    const s = this.secondsLeft();
    if (s === null) return '';
    const m = Math.floor(Math.max(0, s) / 60);
    const rem = Math.max(0, s) % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  });

  ngOnInit() {
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
    if (!this.showDirections()) this.loadQuestions();
  }

  ngOnDestroy() {
    if (this.timerHandle) clearInterval(this.timerHandle);
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    this.exitLockdown();
  }

  private startTimer(deadlineAt: string | null) {
    this.deadlineAt.set(deadlineAt);
    if (this.timerHandle) clearInterval(this.timerHandle);
    if (!deadlineAt) return;
    const tick = () => {
      const remaining = Math.round((new Date(deadlineAt).getTime() - Date.now()) / 1000);
      this.secondsLeft.set(remaining);
      if (remaining <= 0 && !this.autoSubmitted && !this.submitting()) {
        this.autoSubmitted = true;
        this.submit(true);
      }
    };
    tick();
    this.timerHandle = setInterval(tick, 1000);
  }

  /** Used by testExitGuard to decide whether leaving this route needs confirmation. */
  isTestInProgress(): boolean {
    return this.testActive;
  }

  beginAfterDirections() {
    localStorage.setItem(DIRECTIONS_SEEN_KEY, '1');
    this.showDirections.set(false);
    // Must happen synchronously inside this click handler — browsers only grant
    // fullscreen from a direct user gesture, not from an async subscribe callback.
    this.enterLockdown();
    this.loadQuestions();
  }

  /** Best-effort: on a resumed session there's no click here to hang the
   *  fullscreen request off, since directions (and their "Start" click) are
   *  only shown once per browser. Browsers may silently ignore this call
   *  without a fresh gesture — that's fine, the rest of the test still works. */
  private enterLockdown() {
    const el = document.documentElement as any;
    const request = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.msRequestFullscreen;
    request?.call(el)?.catch?.(() => {});
  }

  private exitLockdown() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  private loadQuestions() {
    this.assessment.resume(this.sessionId).subscribe({
      next: res => {
        if (res.status === 'COMPLETED') {
          this.router.navigate(['/leader']);
          return;
        }
        this.questions.set(res.questions);
        this.answers.set(res.answeredOptions);
        this.loading.set(false);

        const answered = new Set(Object.keys(res.answeredOptions));
        const firstUnansweredIndex = res.questions.findIndex(
          q => !answered.has(q.questionId)
        );

        this.index.set(firstUnansweredIndex === -1 ? res.questions.length - 1 : firstUnansweredIndex);
        this.testActive = true;
        this.startTimer(res.deadlineAt);
        if (!document.fullscreenElement) this.enterLockdown();
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  select(option: string) {
    const q = this.current();
    if (!q) return;
    this.answers.update(a => ({ ...a, [q.questionId]: option }));
    this.assessment.answer(this.sessionId, q.questionId, option).subscribe({
      error: (e: any) => this.error.set(this.msg(e))
    });
  }

  next() { if (this.index() < this.total() - 1) this.index.update(i => i + 1); }

  submit(forced = false) {
    const answeredKeys = new Set(Object.keys(this.answers()));
    const unanswered = this.questions()
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => !answeredKeys.has(q.questionId));
    console.log('[leader submit]', {
      forced,
      total: this.total(),
      answered: this.answeredCount(),
      questionCount: this.questions().length,
      unansweredIndexes: unanswered.map(x => x.i + 1),
    });
    if (!forced && unanswered.length > 0) {
      this.error.set(`Please answer all questions before submitting — question ${unanswered.map(x => x.i + 1).join(', ')} still unanswered.`);
      this.index.set(unanswered[0].i);
      return;
    }
    this.submitting.set(true);
    this.error.set('');

    // Flush every local answer before submitting. select() saves fire-and-forget,
    // so answering the last question and immediately hitting Submit can race the
    // final save and the server rejects "N-1 of N answered". answer() is an
    // idempotent upsert — re-sending already-saved ones is harmless.
    const a = this.answers();
    const flushes = Object.keys(a).map(qid => this.assessment.answer(this.sessionId, qid, a[qid]));
    const flushed$ = flushes.length ? forkJoin(flushes).pipe(catchError(() => of(null))) : of(null);

    flushed$.pipe(
      switchMap(() => this.assessment.submit(this.sessionId, forced))
    ).subscribe({
      next: result => {
        this.testActive = false;
        this.exitLockdown();
        // Carry the just-created result's id so the dashboard shows THIS attempt —
        // otherwise it falls back to "is there any live session at all", and if a
        // separate, older attempt is independently still in progress, that one's
        // "Resume" banner would take over instead of this attempt's result (timed
        // out or not) ever being shown.
        this.router.navigate(['/leader'], { queryParams: { result: result.id } });
      },
      error: (e: any) => { this.submitting.set(false); console.error('Leader submit failed', e); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
