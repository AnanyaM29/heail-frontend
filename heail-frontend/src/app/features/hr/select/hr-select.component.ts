import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HrAssessmentService } from '../../../core/services/hr-assessment.service';
import { HrOrderService } from '../../../core/services/hr-order.service';
import { HrAssessment } from '../../../core/models/hr.models';

/** Step 1 of the HR product flow — pick which of the 7 pillars this order
 *  covers. Every candidate registered on the next step (candidates-entry)
 *  takes every pillar picked here; the buyer never takes these themselves.
 *  A pillar stays selectable no matter how many times it's already been
 *  bought — each purchase is for a fresh batch of candidates, not the buyer.
 *  Lives at /pricing/buy-hr — /for-hr is the marketing/solutions page. */
@Component({
  selector: 'app-hr-select',
  standalone: true,
  imports: [],
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
    // No "already purchased" gate — a buyer routinely buys the same pillar
    // again for a new batch of candidates, so prior purchases never block
    // re-selecting it here (entitlements belong to candidates, not the buyer).
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
      next: order => { this.continuing.set(false); this.router.navigate(['/pricing/buy-hr', order.id, 'candidates']); },
      error: (e: any) => { this.continuing.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
