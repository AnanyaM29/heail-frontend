import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HrOrderService } from '../../../core/services/hr-order.service';
import { HrCandidateDto, ReallocationRequest } from '../../../core/models/hr-candidate.models';

/** Buyer-facing tracking view — every candidate ever registered across every
 *  paid HR order, their invite status, and results once completed. Reached
 *  from the payment thank-you page and the dashboard.
 *
 *  Reallocation and retake are both self-service paid actions — "Reallocate"/
 *  "Retake" here just spins up a fresh single-candidate order for the same
 *  pillars and routes into the normal payment flow (see
 *  HrOrderService.createReallocationOrder/createRetakeOrder on the backend);
 *  there's no admin approval step anymore. */
@Component({
  selector: 'app-my-candidates',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-candidates.component.html',
  styleUrl: './my-candidates.component.css'
})
export class MyCandidatesComponent implements OnInit {
  private hrOrders = inject(HrOrderService);
  private router = inject(Router);

  loading = signal(true);
  error = signal('');
  candidates = signal<HrCandidateDto[]>([]);

  reallocatingId = signal<string | null>(null);
  reallocateForm = signal<ReallocationRequest>({ newName: '', newDob: '', newEmail: '', newMobile: '' });
  actionBusy = signal<string | null>(null);
  actionMessage = signal('');

  today = new Date().toISOString().slice(0, 10);

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.hrOrders.listMyCandidates().subscribe({
      next: rows => { this.candidates.set(rows); this.loading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Processing';
      case 'SENT': return 'Invited — not started';
      case 'ACCESSED': return 'In progress / started';
      case 'EXPIRED': return 'Link expired';
      case 'REALLOCATED': return 'Reallocated';
      default: return status;
    }
  }

  openReallocate(c: HrCandidateDto) {
    this.reallocatingId.set(c.id);
    this.reallocateForm.set({ newName: '', newDob: '', newEmail: '', newMobile: '' });
  }

  cancelReallocate() {
    this.reallocatingId.set(null);
  }

  updateForm(field: keyof ReallocationRequest, value: string) {
    this.reallocateForm.update(f => ({ ...f, [field]: value }));
  }

  submitReallocation(candidateId: string) {
    const form = this.reallocateForm();
    if (!form.newName.trim() || !form.newEmail.trim() || !form.newDob) {
      this.actionMessage.set('Fill in the replacement candidate\'s name, DOB and email.');
      return;
    }
    this.actionBusy.set(candidateId);
    this.actionMessage.set('');
    this.hrOrders.createReallocationOrder(candidateId, form).subscribe({
      next: order => this.router.navigate(['/pricing/buy-hr', order.id]),
      error: (e: any) => { this.actionBusy.set(null); this.actionMessage.set(this.msg(e)); }
    });
  }

  retake(candidateId: string) {
    this.actionBusy.set(candidateId);
    this.actionMessage.set('');
    this.hrOrders.createRetakeOrder(candidateId).subscribe({
      next: order => this.router.navigate(['/pricing/buy-hr', order.id]),
      error: (e: any) => { this.actionBusy.set(null); this.actionMessage.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
