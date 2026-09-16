import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { PulseService } from '../../../core/services/pulse.service';
import { Question } from '../../../core/models/assessment.models';
import { PulseCode } from '../../../core/models/pulse.models';

const PULSE_LABELS: Record<string, string> = {
  LEADER_PULSE: 'LeaderPulse',
  TALENT_PULSE: 'TalentPulse',
  SYSTEM_PULSE: 'SystemPulse',
  GROWTH_PULSE: 'GrowthPulse'
};

// Directions are shown once per ROUND, before whichever pulse the respondent
// actually opens first — not tied to LEADER_PULSE specifically. Pulses are
// always taken in strict sequence (start() enforces "complete X before Y"),
// but the *person* isn't tied to one device across the round: if they complete
// pulse 1 on their phone and come back on a laptop for pulse 2, the laptop has
// never shown them anything, so gating on "is this pulse #1" would skip
// instructions entirely on that device — hence a persisted flag rather than a
// query param. Scoped by orderId (not a single global flag) so a respondent
// taking a second round for a different company sees the directions again.

@Component({
  selector: 'app-pulse-player',
  standalone: true,
  imports: [],
  templateUrl: './player.component.html',
  styleUrl: './player.component.css'
})
export class PulsePlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pulseService = inject(PulseService);

  pulseCode = this.route.snapshot.paramMap.get('pulseCode') as PulseCode;
  sessionId = this.route.snapshot.paramMap.get('sessionId')!;

  loading = signal(true);
  error = signal('');
  submitting = signal(false);

  questions = signal<Question[]>([]);
  answers = signal<Record<string, string>>({});
  index = signal(0);

  private directionsSeenKey =
    'heail_pulse_directions_seen_' + (this.route.snapshot.queryParamMap.get('order') ?? 'default');

  // ?directions=1 forces this screen even if the "seen" flag is set — useful
  // for verifying it's actually deployed without having to clear localStorage.
  showDirections = signal(
    this.route.snapshot.queryParamMap.get('directions') === '1' || !localStorage.getItem(this.directionsSeenKey)
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

  pulseLabel = computed(() => PULSE_LABELS[this.pulseCode] ?? this.pulseCode);
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
  }

  /** Used by testExitGuard to decide whether leaving this route needs confirmation. */
  isTestInProgress(): boolean {
    return this.testActive;
  }

  beginAfterDirections() {
    localStorage.setItem(this.directionsSeenKey, '1');
    this.showDirections.set(false);
    this.loadQuestions();
  }

  private loadQuestions() {
    this.pulseService.resume(this.sessionId).subscribe({
      next: res => {
        if (res.status === 'COMPLETED') {
          this.router.navigate(['/pulse']);
          return;
        }
        this.questions.set(res.questions);
        this.answers.set(res.answeredOptions);
        this.loading.set(false);

        // Resume at the first unanswered question, not always question 1 — a
        // respondent who answered a few and came back should pick up where they
        // left off. If everything's answered, land on the last question.
        const answered = new Set(Object.keys(res.answeredOptions));
        const firstUnansweredIndex = res.questions.findIndex(q => !answered.has(q.questionId));
        this.index.set(firstUnansweredIndex === -1 ? res.questions.length - 1 : firstUnansweredIndex);

        this.testActive = true;
        this.startTimer(res.deadlineAt);
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
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

  select(option: string) {
    const q = this.current();
    if (!q) return;
    this.answers.update(a => ({ ...a, [q.questionId]: option }));
    this.pulseService.answer(this.sessionId, q.questionId, option).subscribe({
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

    // Flush every local answer before submitting. select() saves fire-and-forget,
    // so answering the last question and immediately hitting Submit can race the
    // final save and the server rejects "N-1 of N answered". answer() is an
    // idempotent upsert — re-sending already-saved ones is harmless.
    const a = this.answers();
    const flushes = Object.keys(a).map(qid => this.pulseService.answer(this.sessionId, qid, a[qid]));
    const flushed$ = flushes.length ? forkJoin(flushes).pipe(catchError(() => of(null))) : of(null);

    flushed$.pipe(
      switchMap(() => this.pulseService.submit(this.sessionId, forced))
    ).subscribe({
      next: () => { this.testActive = false; this.router.navigate(['/pulse']); },
      error: (e: any) => { this.submitting.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
