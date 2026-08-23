import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HrOrderService } from '../../../core/services/hr-order.service';
import { HrCandidateDto, ReallocationRequest } from '../../../core/models/hr-candidate.models';

/** Buyer-facing tracking view — every candidate ever registered across every
 *  paid HR order, their invite status, and results once completed. Reached
 *  from the payment thank-you page and (once added) the dashboard. */
@Component({
  selector: 'app-my-candidates',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-candidates.component.html',
  styleUrl: './my-candidates.component.css'
})
export class MyCandidatesComponent implements OnInit {
  private hrOrders = inject(HrOrderService);

  loading = signal(true);
  error = signal('');
  candidates = signal<HrCandidateDto[]>([]);

  reallocatingId = signal<string | null>(null);
  reallocateForm = signal<ReallocationRequest>({ newName: '', newDob: '', newEmail: '', newMobile: '', newStartDate: '' });
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
    this.reallocateForm.set({ newName: '', newDob: '', newEmail: '', newMobile: '', newStartDate: '' });
  }

  cancelReallocate() {
    this.reallocatingId.set(null);
  }

  updateForm(field: keyof ReallocationRequest, value: string) {
    this.reallocateForm.update(f => ({ ...f, [field]: value }));
  }

  submitReallocation(candidateId: string) {
    const form = this.reallocateForm();
    if (!form.newName.trim() || !form.newEmail.trim() || !form.newDob || !form.newStartDate) {
      this.actionMessage.set('Fill in all fields for the replacement candidate.');
      return;
    }
    this.actionBusy.set(candidateId);
    this.actionMessage.set('');
    this.hrOrders.requestReallocation(candidateId, form).subscribe({
      next: () => {
        this.actionBusy.set(null);
        this.reallocatingId.set(null);
        this.actionMessage.set('Reallocation request submitted — you\'ll be notified once it\'s reviewed.');
        this.load();
      },
      error: (e: any) => { this.actionBusy.set(null); this.actionMessage.set(this.msg(e)); }
    });
  }

  requestRetake(candidateId: string) {
    this.actionBusy.set(candidateId);
    this.actionMessage.set('');
    this.hrOrders.requestRetake(candidateId).subscribe({
      next: () => {
        this.actionBusy.set(null);
        this.actionMessage.set('Retake request submitted — you\'ll be notified once it\'s reviewed.');
      },
      error: (e: any) => { this.actionBusy.set(null); this.actionMessage.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
