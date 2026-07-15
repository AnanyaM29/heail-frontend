import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../../core/services/assessment.service';
import { Question } from '../../../core/models/assessment.models';

@Component({
  selector: 'app-assessment-player',
  standalone: true,
  imports: [],
  templateUrl: './player.component.html',
  styleUrl: './player.component.css'
})
export class AssessmentPlayerComponent implements OnInit {
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

  current = computed(() => this.questions()[this.index()] ?? null);
  total = computed(() => this.questions().length);
  answeredCount = computed(() => Object.keys(this.answers()).length);
  progressPct = computed(() => this.total() ? Math.round((this.answeredCount() / this.total()) * 100) : 0);
  isLast = computed(() => this.index() === this.total() - 1);
  currentSelected = computed(() => {
    const q = this.current();
    return q ? this.answers()[q.questionId] ?? null : null;
  });

  ngOnInit() {
    this.assessment.resume(this.sessionId).subscribe({
      next: res => {
        if (res.status === 'COMPLETED') {
          this.router.navigate(['/leader']);
          return;
        }
        this.questions.set(res.questions);
        this.answers.set(res.answeredOptions);
        this.loading.set(false);
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
      next: () => this.router.navigate(['/leader']),
      error: (e: any) => { this.submitting.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
