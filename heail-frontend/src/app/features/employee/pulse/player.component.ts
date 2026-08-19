import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PulseService } from '../../../core/services/pulse.service';
import { Question } from '../../../core/models/assessment.models';
import { PulseCode } from '../../../core/models/pulse.models';

const PULSE_LABELS: Record<string, string> = {
  LEADER_PULSE: 'LeaderPulse',
  TALENT_PULSE: 'TalentPulse',
  SYSTEM_PULSE: 'SystemPulse',
  GROWTH_PULSE: 'GrowthPulse'
};

// Directions are shown once before the FIRST pulse of a round only — not
// repeated before each of the four. Keyed by a flag in localStorage so it
// survives a page reload but doesn't need any backend state.
const FIRST_PULSE: PulseCode = 'LEADER_PULSE';
const DIRECTIONS_SEEN_KEY = 'heail_pulse_directions_seen';

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

  showDirections = signal(this.pulseCode === FIRST_PULSE && !localStorage.getItem(DIRECTIONS_SEEN_KEY));

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
  total = computed(() => this.questions().length);
  answeredCount = computed(() => Object.keys(this.answers()).length);
  progressPct = computed(() => this.total() ? Math.round((this.answeredCount() / this.total()) * 100) : 0);
  isLast = computed(() => this.index() === this.total() - 1);
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
    localStorage.setItem(DIRECTIONS_SEEN_KEY, '1');
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
        this.submit();
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

  submit() {
    if (this.answeredCount() < this.total()) {
      this.error.set(`Answer all ${this.total()} questions before submitting (${this.answeredCount()} answered).`);
      const firstUnanswered = this.questions().findIndex(q => !this.answers()[q.questionId]);
      if (firstUnanswered >= 0) this.index.set(firstUnanswered);
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.pulseService.submit(this.sessionId).subscribe({
      next: () => { this.testActive = false; this.router.navigate(['/pulse']); },
      error: (e: any) => { this.submitting.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
