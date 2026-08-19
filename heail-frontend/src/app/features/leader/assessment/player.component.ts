import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
    this.assessment.resume(this.sessionId).subscribe({
      next: res => {
        if (res.status === 'COMPLETED') {
          this.router.navigate(['/leader']);
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
    this.assessment.answer(this.sessionId, q.questionId, option).subscribe({
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
    this.assessment.submit(this.sessionId).subscribe({
      next: () => { this.testActive = false; this.router.navigate(['/leader']); },
      error: (e: any) => { this.submitting.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
