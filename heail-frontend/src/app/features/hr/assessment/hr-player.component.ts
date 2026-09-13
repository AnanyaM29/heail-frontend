import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { HrAssessmentService } from '../../../core/services/hr-assessment.service';
import { HrQuestion } from '../../../core/models/hr.models';

/** Same locked-down, no-timer test player as AssessmentPlayerComponent (Leader),
 *  generalized to 5 options (A-E) instead of 4. */
@Component({
  selector: 'app-hr-player',
  standalone: true,
  imports: [],
  templateUrl: './hr-player.component.html',
  styleUrl: './hr-player.component.css'
})
export class HrPlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private assessment = inject(HrAssessmentService);

  sessionId = this.route.snapshot.paramMap.get('sessionId')!;

  loading = signal(true);
  error = signal('');
  submitting = signal(false);

  questions = signal<HrQuestion[]>([]);
  answers = signal<Record<string, string>>({});
  index = signal(0);

  // Each HR pillar is its own independent test — directions show whenever this
  // is a genuinely fresh start (the launcher navigates here with ?fresh=1 right
  // after calling start()), never on a resume of an already-in-progress session.
  // ?directions=1 forces it regardless, for verifying this is actually deployed.
  showDirections = signal(
    this.route.snapshot.queryParamMap.get('fresh') === '1' ||
    this.route.snapshot.queryParamMap.get('directions') === '1'
  );

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
  /** Distinct question ids — answers are keyed by id, so a repeated id in the
   *  session must not make "all answered" permanently unreachable. */
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
          this.router.navigate(['/dashboard']);
          return;
        }
        this.questions.set(res.questions);
        this.answers.set(res.answeredOptions);
        this.loading.set(false);

        // Resume at the first unanswered question, not always question 1 — a
        // candidate who answered a few and came back should pick up where they
        // left off. If everything's answered, land on the last question.
        const answered = new Set(Object.keys(res.answeredOptions));
        const firstUnansweredIndex = res.questions.findIndex(q => !answered.has(q.questionId));
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
    if (!forced && this.answeredCount() < this.total()) {
      const firstUnanswered = this.questions().findIndex(q => !this.answers()[q.questionId]);
      if (firstUnanswered >= 0) this.index.set(firstUnanswered);
      return;
    }
    this.submitting.set(true);
    this.error.set('');

    // Flush every local answer before asking the server to submit. select() saves
    // fire-and-forget, so answering the last question and immediately hitting
    // Submit can race the final save and the server rejects "N-1 of N answered".
    // answer() is an idempotent upsert — re-sending already-saved ones is harmless.
    const a = this.answers();
    const flushes = Object.keys(a).map(qid => this.assessment.answer(this.sessionId, qid, a[qid]));
    const flushed$ = flushes.length ? forkJoin(flushes).pipe(catchError(() => of(null))) : of(null);

    flushed$.pipe(
      switchMap(() => this.assessment.submit(this.sessionId, forced))
    ).subscribe({
      next: () => { this.testActive = false; this.exitLockdown(); this.router.navigate(['/dashboard']); },
      error: (e: any) => { this.submitting.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
