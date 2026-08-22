import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HrAssessmentService } from '../../../core/services/hr-assessment.service';
import { HrOrderService } from '../../../core/services/hr-order.service';
import { HrAssessment } from '../../../core/models/hr.models';

/** The actual HR product page — pick any of the 7 pillars, pay once, self-serve
 *  (same "anyone can buy it" shape as the Leader flow, not an org-bulk round).
 *  Lives at /for-hr, replacing what used to be a "catalogue coming soon" page. */
@Component({
  selector: 'app-hr-select',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hr-select.component.html',
  styleUrl: './hr-select.component.css'
})
export class HrSelectComponent implements OnInit {
  private hrAssessments = inject(HrAssessmentService);
  private hrOrders = inject(HrOrderService);
  private router = inject(Router);

  loading = signal(true);
  error = signal('');
  assessments = signal<HrAssessment[]>([]);
  selectedIds = signal<Set<number>>(new Set());
  continuing = signal(false);

  selectedCount = computed(() => this.selectedIds().size);

  ngOnInit() {
    this.hrAssessments.assessments().subscribe({
      next: rows => { this.assessments.set(rows); this.loading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  toggle(a: HrAssessment) {
    if (a.entitled) return; // already owned — the card's own "Go take it" link handles this instead
    this.selectedIds.update(current => {
      const next = new Set(current);
      next.has(a.id) ? next.delete(a.id) : next.add(a.id);
      return next;
    });
  }

  continue() {
    if (this.selectedCount() === 0 || this.continuing()) return;
    this.continuing.set(true);
    this.error.set('');
    this.hrOrders.selectAssessments(Array.from(this.selectedIds())).subscribe({
      next: order => { this.continuing.set(false); this.router.navigate(['/pricing/buy-hr', order.id]); },
      error: (e: any) => { this.continuing.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
