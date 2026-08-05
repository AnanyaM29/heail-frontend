import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';

/** Single global instance mounted once in AppComponent — every page in the
 *  project shares it via ConfirmService instead of window.confirm(). */
@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.css'
})
export class ConfirmModalComponent {
  private confirm = inject(ConfirmService);
  request = this.confirm.request;

  onConfirm() { this.confirm.resolve(true); }
  onCancel() { this.confirm.resolve(false); }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.request()) this.onCancel();
  }
}
