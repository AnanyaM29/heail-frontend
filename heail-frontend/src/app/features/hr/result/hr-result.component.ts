import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HrAssessmentService } from '../../../core/services/hr-assessment.service';
import { HrResult } from '../../../core/models/hr.models';

/** Full detail for one HR result — the unified /dashboard only shows a
 *  compact score line per pillar (same as it does for Leader/Org/Pulse), so
 *  this is where "View Result" actually lands: skill-category breakdown
 *  plus strongest/weakest competency, mirroring LeaderDashboardComponent's
 *  result card. */
@Component({
  selector: 'app-hr-result',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './hr-result.component.html',
  styleUrl: './hr-result.component.css'
})
export class HrResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private hrAssessments = inject(HrAssessmentService);

  resultId = this.route.snapshot.paramMap.get('resultId')!;

  loading = signal(true);
  error = signal('');
  result = signal<HrResult | null>(null);

  skillCategoryEntries = computed(() => {
    const r = this.result();
    return r ? Object.entries(r.skillCategoryScores) : [];
  });

  ngOnInit() {
    this.hrAssessments.results().subscribe({
      next: results => {
        const found = results.find(r => r.id === this.resultId) ?? null;
        this.result.set(found);
        if (!found) this.error.set('That result could not be found.');
        this.loading.set(false);
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
